const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
let userList = [];
let conversationList = [];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', (req, res) => {
    res.sendFile(__dirname + '/style.css');
});

app.get('/client.js', (req, res) => {
    res.sendFile(__dirname + '/client.js');
});

io.on('connection', (socket) => {
    //Call when a new user enter the room
    socket.on('user connected', function (msg) {
        //Get the parameters
        let username = msg.user;
        let id = msg.id;
        //Verify that the username is not already taken
        if (userList.indexOf(username) === -1) {
            //If the username is not taken
            //Assign the username to the socket
            socket.username = username;
            //Push the username in the Userlist
            userList.push(username);
            //Send a message in the chat with the username
            io.emit('user connected', socket.username + " has joined the chat!");
        } else {
            //If the username is taken we call the client function 'username taken' of the correct socket
            io.to(id).emit('username taken');
        }
    });

    //When a user disconnect
    socket.on('disconnect', () => {
        //Verify that he has a username
        if (socket.username !== undefined) {
            //Delete the username from the list
            userList = userList.filter(e => e !== socket.username);
            //Send the message in the chat
            io.emit("user disconnected", socket.username + " has left the chat!");
            //Call the function 'new username' of each clients to update the user list
            io.emit('new username', userList);
        }
    });

    //Function to send a message in the chat with the username
    socket.on('chat message', (msg) => {
        io.emit('chat message', {msg: msg, user: socket.username});
    });

    //Function to update the user list that are connected
    socket.on('new username', () => {
        io.emit('new username', userList);
    });

    //Function to update the user list that are connected
    socket.on('new conversation', function (msg) {
        let clients = io.sockets.sockets;
        let conversation = {
            name: msg.name,
            users: msg.users
        };
        conversationList.push(conversation);
        clients.forEach((element) => {
            (msg.users).forEach((convUser) => {
                if (element["username"] === convUser) {
                    io.to(element.id).emit('new conversation', conversation);
                }
            });
        });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});