const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
let userList = [];

app.get('/', (req, res) => {  res.sendFile(__dirname + '/index.html');});

io.on('connection', (socket) => {

    socket.on('user connected', function(msg) {
        var username = msg.user;
        var id = msg.id;

        if(userList.indexOf(username) === -1){
            socket.username = username;
            userList.push(username);
            io.emit('user connected', socket.username + " has joined the chat!");
        } else{
            io.to(id).emit('username taken');
        }
    });

    socket.on('disconnect', () => {
        if(socket.username !== undefined){
            userList = userList.filter(e => e !== socket.username);
            io.emit("user disconnected", socket.username + " has left the chat!");
            io.emit('new username', userList);
        }
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', {msg:msg , user:socket.username});
    });

    socket.on('new username', (msg) => {
        io.emit('new username', userList);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});