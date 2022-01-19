// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const keyPath = './app/certificates/privkey.pem';
const certPath = './app/certificates/cert.pem';

const fs = require('fs');
let http, httpsOptions = {};

try {
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('Using TLS');
        http = require('https');
        httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        }
    } else {
        http = require('http');
        console.log('Using HTTP');
    }
} catch (e) {
    console.error(e);
    http = require('http');
}

const express = require('express');
const {Server} = require("socket.io");
const SocketIOFileUpload = require("socketio-file-upload");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./app/models");
const dbConfig = require("./app/config/db.config");
const authJwt = require('./app/middlewares/authJwt');
const utils = require("./app/middlewares/utils");
const multer = require("multer");
const upload = multer({ dest: 'public/uploads/profile-pics/' });

const app = express().use(SocketIOFileUpload.router);
let server;
if (httpsOptions === {}) {
    server = http.createServer(app);
} else {
    server = http.createServer(httpsOptions, app);
}
const io = new Server(server);

const User = db.user;
const Conversation = db.conversation;
const Message = db.message;

let corsOptions = {
    origin: "http://localhost:3001"
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.single('profilePic'));

let hostname = '';
let globalConvId = '';

db.mongoose
    .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`)
    .then(() => {
        console.log("Successfully connected to MongoDB.");

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

    let pendingUploads = [];

    uploader.on('saved', function (event) {
        if (event.file.success) {
            let parts = event.file.pathName.replace(/\\/g, '/').split('/');
            let fileLink = '/uploads/' + parts[parts.length - 1];
            console.log('finish upload');

            for (let i = 0; i < pendingUploads.length; i++) {
                let pUp = pendingUploads[i];
                if (pUp.fileName === event.file.name) {
                    sendMessage(pUp.convId, fileLink, socket, false, true);
                    pendingUploads.splice(pendingUploads.indexOf(pUp), 1);
                    break;
                }
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

        // Get the last message for each conversation
        // Join socket.io rooms (not the global one)
        let lastMessages = {};

        for (let i = 0; i < convos.length; i++) {
            let conv = convos[i];
            let last = await Message.find({ conversation: conv._id }).sort({ timestamp: -1 }).limit(1);
            if (last.length !== 0) {
                lastMessages[conv._id] = last[0];
            }

            if (conv.isGlobal) continue;
            socket.join(conv._id.toString());
        }

        emitUserList();

        // Send conversations to the user
        socket.emit('successful-login', {
            conversations: convos,
            lastMessages: lastMessages,
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

        content = utils.sanitize(content);
        content = utils.replaceWikiWords(content);

        sendMessage(conversation, content, socket);
    });

    // Function to mark message as read
    socket.on('read-message', async (received) => {
        let { convId } = received;

        let msgQuery = await Message.find({ conversation: convId }).sort({ timestamp: -1 }).limit(1);

        if (msgQuery.length !== 0) {
            let msg = msgQuery[0];
            let readBy = msg.readBy;
            readBy.push(socket.userId);
            Message.findByIdAndUpdate(msg._id, {
                readBy: readBy,
            });
        }
    });

    // Function to create a new private conversation
    socket.on('new-direct-message', async (received) => {
        let {participants} = received;

        //TODO Check if a private convo already exists? Already done client-side but to make sure?

        // Add the new conversation to the DB
        let conv = new Conversation({
            participants: participants,
            name: '__private_chat__',
        });

        conv.save(async (error, result) => {
            if (error) {
                socket.emit('error', {message: 'Could not create private conversation'});
                return;
            }

            // Build the message
            let message = new Message({
                sender: socket.userId,
                senderName: socket.username,
                readBy: [socket.userId],
                content: 'created',
                isSpecial: true,
                conversation: result._id,
            });

            // Save message & add to convo
            result.lastMessage = await message.save();

            // Subscribe the users to the room
            participants.forEach(userId => {
                if (userId in onlineUsers) {
                    let socketIds = onlineUsers[userId].sockets;
                    socketIds.forEach(socketId => {
                        io.sockets.sockets.get(socketId).join(result._id.toString());
                    });
                }
            });

            // Cast the conversation to the group
            io.to(result._id.toString()).emit('new-conversation', {
                conversation: result
            });
        });
    });

    socket.on('create-group', async (received) => {
        // Keep only existing users
        let participants = received.participants.filter(async function (value) {
            return await User.exists({_id: value});
        })

        // Save convo in db
        let conv = new Conversation({
            participants: received.participants,
            name: received.name,
        });
        let dbConv = await conv.save();

        // Build the message
        let message = new Message({
            sender: socket.userId,
            readBy: [socket.userId],
            senderName: socket.username,
            content: 'created',
            isSpecial: true,
            conversation: dbConv._id,
        });
        await message.save();

        // Add online participants to the room
        participants.forEach(userId => {
            if (userId in onlineUsers) {
                let socketIds = onlineUsers[userId].sockets;
                socketIds.forEach(socketId => {
                    io.sockets.sockets.get(socketId).join(dbConv._id.toString());
                });
            }
        });

        // Cast the new group to the participants
        io.to(dbConv._id.toString()).emit('new-conversation', {
            conversation: dbConv
        });
    });

    socket.on('start-upload', async (received) => {
        let {conversationId, fileName} = received;
        console.log('start upload ' + fileName);

        let conv = await Conversation.findById(conversationId);

        if (!conv) {
            socket.emit('error', {message: 'Invalid conversation'});
            return;
        }

        pendingUploads.push({
            convId: conv._id.toString(),
            fileName: fileName
        });
    });
});

async function sendMessage(convId, content, socket, specialMessage, isUpload) {
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

    let message = new Message({
        sender: socket.userId,
        senderName: socket.username,
        readBy: [ socket.userId ],
        conversation: convId,
        content: content,
        timestamp: Date.now(),
        isSpecial: specialMessage,
        isUpload: isUpload
    });

    let msgDb = await message.save();

    let response = {
        message: msgDb,
        conversationId: convId
    }

    if (convId.toString() === globalConvId.toString()) {
        io.emit('message', response)
    } else {
        io.to(convId.toString()).emit('message', response);
    }
}

// Emit the list of online users
async function emitUserList() {
    let users = await User.find({
        '_id': {
            $in: Object.keys(onlineUsers)
        }
    }).select('_id username imageUrl');

    io.emit('user-list', users);
}

server.listen(4000, () => {
    if (httpsOptions === {}) {
        console.log('listening on http://localhost:4000');
    } else {
        console.log('listening on https://yourdomain:4000');
    }
});