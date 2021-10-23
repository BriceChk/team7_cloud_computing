const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
let userList = [];

app.get('/', (req, res) => {  res.sendFile(__dirname + '/index.html');});

io.on('connection', (socket) => {

    socket.on('user connected', (msg) => {
        var username = msg;
        socket.username = username;
        userList.push(username);
        io.emit('user connected', socket.username + " has joined the chat!");
    });

    socket.on('disconnect', () => {
        userList = userList.filter(e => e !== socket.username);
        io.emit("user disconnected", socket.username + " has left the chat!");
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('new username', (msg) => {
        io.emit('new username', userList);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});