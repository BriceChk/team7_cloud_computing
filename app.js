// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const express = require('express');
const http = require('http');
const {Server} = require("socket.io");
const SocketIOFileUpload = require("socketio-file-upload");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./app/models");
const dbConfig = require("./app/config/db.config");
const authJwt = require('./app/middlewares/authJwt');
const utils = require("./app/middlewares/utils");

const app = express().use(SocketIOFileUpload.router);
const server = http.createServer(app);
const io = new Server(server);

const User = db.user;
const Conversation = db.conversation;

let corsOptions = {
    origin: "http://localhost:3001"
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let hostname = '';
let globalConvId = '';

db.mongoose
    .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`)
    .then(() => {
        console.log("Successfully connect to MongoDB.");

        // Create default Global conversation if it doesn't exist
        Conversation.findOne({ isGlobal: true }, (err, conv) => {
            if (!conv) {
                new Conversation({
                    name: 'Global room',
                    isGlobal: true
                }).save((error, result) => {
                    globalConvId = result._id;
                });
                console.log("Created Global conversation.");
            } else {
                globalConvId = conv._id;
            }
        });
    })
    .catch(err => {
        console.error("Connection error", err);
        process.exit();
    });

// Init API routes
require('./app/routes/auth.routes')(app);
require('./app/routes/chat.routes')(app);

// List connected users
let onlineUsers = {};

// Serve client files
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
    hostname = req.header('host');
});

app.use(express.static('public'));

// Handle socket connections
io.on('connection', (socket) => {
    const uploader = new SocketIOFileUpload();
    uploader.dir = __dirname + "/public/uploads";
    uploader.listen(socket);

    uploader.on('saved', function (event) {
        if (event.file.success) {
            let parts = event.file.pathName.replace(/\\/g, '/').split('/');
            let fileLink = '/uploads/' + parts[parts.length - 1];
            console.log('finish upload');
            Object.keys(data.conversations).forEach(convId => {
                let conv = data.conversations[convId];
                if (conv.uploads && conv.uploads.includes(event.file.name)) {
                    sendMessage(convId, 'I attached a file: http://' + hostname + fileLink, socket);
                    conv.uploads.splice(conv.uploads.indexOf(event.file.name), 1);
                }
            });
            if (data.globalUploads.includes(event.file.name)) {
                sendMessage('global', 'I attached a file: http://' + hostname + fileLink, socket);
                data.globalUploads.splice(data.globalUploads.indexOf(event.file.name), 1);
            }
        }
    });

    // Called when a new user enter the room
    socket.on('connect-jwt', async function (msg) {
        console.log("connect-jwt event");
        // Get the parameters
        let jwt = msg.jwt;

        let userId = authJwt.getUserIdOfToken(jwt);

        // JWT is invalid
        if (userId == null) {
            socket.emit('error', {
                message: 'Invalid JWT!'
            });
            return;
        }

        let user = await User.findById(userId);

        // User doesn't exist
        if (!user) {
            socket.emit('error', {
                message: 'User not found!'
            });
            return;
        }

        // User has no current connection
        if (!(userId in onlineUsers)) {
            onlineUsers[userId] = {
                sockets: [],
                username: user.username
            }
        }

        // Add new socket ID
        socket.userId = userId;
        socket.username = user.username;
        onlineUsers[userId].sockets.push(socket.id);

        // Get all conversations where the user is a participant
        let convos = await Conversation.find({ participants: user });

        // Join socket.io rooms (not the global one)
        for (let i = 0; i < convos.length; i++) {
            if (convos[i].isGlobal) continue;
            socket.join(convos[i]._id);
        }

        emitUserList();

        // Send conversations to the user
        socket.emit('successful-login', {
            conversations: convos,
            user: {
                _id: userId,
                username: user.username
            }
        });

        // If it's the only open socket for this user, broadcast the join message
        if (onlineUsers[userId].sockets.length === 1) {
            await sendMessage(globalConvId, 'joined', socket, true);
        }
    });

    // When a user disconnects
    socket.on('disconnect', async () => {
        // Verify that he has a user id
        if (socket.userId !== undefined) {
            utils.removeItemOnce(onlineUsers[socket.userId].sockets, socket.id);

            // If it's his last open socket, broadcast left message
            if (onlineUsers[socket.userId].sockets.length === 0) {
                delete onlineUsers[socket.userId];
                await sendMessage(globalConvId, 'left', socket, true);
                console.log('User ' + socket.username + ' has disconnected');
                emitUserList();
            }
        }
    });

    // Function to send a message in the chat with the username
    socket.on('chat-message', (received) => {
        let {content, conversation} = received;
        sendMessage(conversation, content, socket);
    });

    // Function to create a new private conversation
    socket.on('new-direct-message', async (received) => {
        let {participants, content} = received;

        // Build the message
        let message = {
            sender: socket.userId,
            content: content,
        }

        //TODO Check if a private convo already exists?

        // Add the new conversation to the DB
        let conv = new Conversation({
            participants: participants,
            name: '__private_chat__',
            message: [message]
        });

        conv.save((error, result) => {
            if (error) return console.log(error);
            //TODO Emit general error msg?

            // Subscribe the users to the room
            participants.forEach(userId => {
                if (userId in onlineUsers) {
                    let socketIds = onlineUsers[userId].sockets;
                    socketIds.forEach(socketId => {
                        io.sockets.sockets.get(socketId).join(result._id);
                    });
                }
            });

            // Cast the conversation to the group
            io.to(result._id).emit('new-conversation', {
                conversation: result
            });
        });
    });

    socket.on('create-group', async (received) => {
        console.log("new group!");

        // Keep only existing users
        let participants = received.participants.filter(async function (value, index, self) {
            return await User.exists({_id: value});
        })

        // Save convo in db
        let conv = new Conversation({
            participants: received.participants,
            name: received.name
        });
        let dbConv = await conv.save();

        // Add online participants to the room
        participants.forEach(userId => {
            if (userId in onlineUsers) {
                let socketIds = onlineUsers[userId].sockets;
                socketIds.forEach(socketId => {
                    io.sockets.sockets.get(socketId).join(dbConv._id);
                });
            }
        });

        // Cast the new group to the participants
        io.to(id).emit('new-conversation', {
            conversation: dbConv
        });
    });

    //TODO Manage uploads with database
    socket.on('start-upload', (received) => {
        let { conversationId, fileName } = received;
        console.log('start upload ' + fileName);
        if (conversationId === 'global') {
            data.globalUploads.push(fileName);
        } else {
            let conv = data.conversations[conversationId];
            if (conv.uploads) {
                conv.uploads.push(fileName);
            } else {
                conv.uploads = [ fileName ];
            }
        }
    });
});

async function sendMessage(convId, content, socket, specialMessage) {
    let conv = await Conversation.findById(convId);

    if (!conv) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
    }

    // If it's not the global convo && the user is not a participant of the convo
    if (convId !== globalConvId && conv.participants.filter(value => value.toString() === socket.userId).length === 0) {
        socket.emit('error', { message: "You can't message this conversation" });
        return;
    }

    let message = {
        sender: socket.userId,
        senderName: socket.username,
        content: content,
        timestamp: Date.now(),
        isSpecial: specialMessage
    };

    conv.messages.push(message);
    await conv.save();

    // Get the message inserted in the db because it is sanitized
    let dbMsg = await Conversation.findById(convId).select('messages').slice('messages', -1);

    let response = {
        message: dbMsg.messages[0],
        conversationId: convId
    }

    if (convId.toString() === globalConvId.toString()) {
        io.emit('message', response)
    } else {
        io.to(convId).emit('message', response);
    }
}

// Emit the list of online users
async function emitUserList() {
    let users = await User.find({
        '_id': {
            $in: Object.keys(onlineUsers)
        }
    }).select('_id username');

    io.emit('user-list', users);
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});