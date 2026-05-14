const express = require('express')
const http = require('http')
const socketio = require('socket.io')

const {generateMessage, generateLocationMessage} = require("./utils/messages")
const {addUser, removeUser, getUser, getUserByName, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(__dirname + '/../public'));

io.on('connection', (socket) => {

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Welcome, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        if (!user) return callback('User not found!');

        // Check for private message format `@username: text`
        const privateMatch = message.match(/^@([^:]+):\s*(.*)$/);
        
        if (privateMatch) {
            const targetUsername = privateMatch[1].trim();
            const realMessage = privateMatch[2].trim();
            
            const targetUser = getUserByName(targetUsername, user.room);
            
            if (targetUser) {
                // Send privately to the sender and the target
                socket.emit('message', generateMessage(`(Private to ${targetUser.username}) ${user.username}`, realMessage));
                
                // Do not send to self twice if user targets themselves
                if (targetUser.id !== user.id) {
                    io.to(targetUser.id).emit('message', generateMessage(`(Private from ${user.username})`, realMessage));
                }
                return callback();
            } else {
                return callback(`User ${targetUsername} not found in this room.`);
            }
        }

        // Standard public message to the room
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('userIsTyping', () => {
        const user = getUser(socket.id)
        if (user) {
            // Emits to everyone else in the room except the typing user
            socket.broadcast.to(user.room).emit('userIsTyping', user.username)
        }
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
});

const port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log(`listening on *:${port}`);
});