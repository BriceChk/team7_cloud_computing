// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');

// Database
let data = {
    users: {},
    globalMessages: [],
    conversations: {}
};

// Serve client files
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', (req, res) => {
    res.sendFile(__dirname + '/style.css');
});

app.get('/client.js', (req, res) => {
    res.sendFile(__dirname + '/client.js');
});

// Handle socket connections
io.on('connection', (socket) => {
    // Called when a new user enter the room
    socket.on('connect-username', function (msg) {
        // Get the parameters
        let username = msg.user;
        let id = msg.id;

        if (username in data.users && data.users[username].online) {
            //If the username is taken, tell the client
            io.to(id).emit('username-already-taken');
        } else {
            // If the username is not taken
            // Assign the username to the socket
            socket.username = username;

            // Update or push the username in the users list
            if (username in data.users) {
                data.users[username].online = true;
                data.users[username].socketId = id;
                console.log("User " + username + " has logged back in");
            } else {
                data.users[username] = {
                    conversations: [],
                    online: true,
                    socketId: id
                }
                console.log("New user " + username + " has logged in");
            }

            // Add the socket to the conversation rooms
            Object.keys(data.users[username].conversations).forEach(convId => socket.join(convId));

            let conversations = {};
            data.users[username].conversations.forEach(c => {
                conversations[c] = data.conversations[c];
            })

            // Send the current global room messages & private conversations to the user
            io.to(id).emit('successful-login', {
                globalMessages: data.globalMessages,
                conversations: conversations
            });

            // Tell everyone a new user has connected
            //TODO io.emit('user-connected', socket.username + " has joined the chat!");
            emitUserList();
        }
    });

    // When a user disconnect
    socket.on('disconnect', () => {
        // Verify that he has a username
        if (socket.username !== undefined) {
            data.users[socket.username].online = false;
            console.log('User ' + socket.username + ' has disconnected');
            //TODO io.emit("user disconnected", socket.username + " has left the chat!");
            emitUserList();
        }
    });

    // Function to send a message in the chat with the username
    socket.on('chat-message', (received) => {
        let { content, conversation } = received;
        let timestamp = new Date().getTime();

        //TODO Check if user is part of conversation

        let response = {
            message: {
                sender: socket.username,
                content: content,
                timestamp: timestamp
            },
            conversationId: conversation
        }

        if (conversation === 'global') {
            data.globalMessages.push(response.message);
            io.emit('message', response)
        } else {
            let conv = data.conversations[conversation];
            if (!conv) {

            }
            data.conversations[conversation].messages.push(response.message);
            io.to(conversation).emit('message', response);
        }
    });

    // Function to create a new private conversation
    socket.on('new-direct-message', (received) => {
        let { id, participants, content } = received;
        let timestamp = new Date().getTime();

        // Build the message
        let message = {
            sender: socket.username,
            content: content,
            timestamp: timestamp
        }

        // Add the new conversation to the DB
        data.conversations[id] = {
            participants: participants,
            name: '__private_chat__',
            messages: [ message ]
        }

        // Subscribe the users to the room
        participants.forEach(userId => {
            io.sockets.sockets.get(data.users[userId].socketId).join(id);
            data.users[userId].conversations.push(id);
        });

        // Cast the conversation to the group
        io.to(id).emit('new-conversation', {
            conversation: data.conversations[id],
            conversationId: id
        });
    });

    socket.on('create-group', (received) => {
        console.log("new group!");
        let group = received;
        group.messages = [];
        let id = uuidv4();

        // Should never happen but we never know
        while (id in data.conversations) {
            id = uuidv4();
        }

        // Filter non-existant users & duplicates
        group.participants = group.participants.filter(function (value, index, self) {
            return value in data.users;
        });

        // Add the conversation to the participants & add them to the room
        group.participants.forEach(p => {
            data.users[p].conversations.push(id);
            io.sockets.sockets.get(data.users[p].socketId).join(id);
        });

        // Store the group
        data.conversations[id] = group;

        // Cast the new group to the participants
        io.to(id).emit('new-conversation', {
            conversation: group,
            conversationId: id
        });
    });
});

// Emit the list of online users
function emitUserList() {
    let userlist = Object.keys(data.users).filter(username => data.users[username].online);
    console.log("Broadcast user list: " + userlist.join(', '));
    io.emit('user-list', userlist);
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});