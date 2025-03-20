import {Server} from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin:['http://localhost:5173']
    }
});

export function getReceiverSocketId(userId){
   return userSocketMap[userId];
}
//used to store online users
const userSocketMap = {}

io.on("connection",(socket)=>{
    console.log("A user connected",socket.id);

    const userId = socket.handshake.query.userId;
    if(userId) userSocketMap[userId] = socket.id;


    io.emit('getOnlineUsers',Object.keys(userSocketMap))

    socket.on("typing", ({ recipientId }) => {
        const recipientSocketId = userSocketMap[recipientId];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("userTyping", { senderId: userId });
        }
    });

    socket.on("stopTyping", ({ recipientId }) => {
        const recipientSocketId = userSocketMap[recipientId];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("userStopTyping", { senderId: userId });
        }
    });

    socket.on("chatCleared", (data) => {
        const { receiverId } = data;
        const receiverSocket = userSocketMap[receiverId]; 
        
        if (receiverSocket) {
            io.to(receiverSocket).emit("chatCleared", data);
        }
    });

    
    socket.on("disconnect",()=>{
        console.log("A user disconnected",socket.id);
        delete userSocketMap[userId];
        io.emit('getOnlineUsers',Object.keys(userSocketMap))
    })

     // Video call handlers
     socket.on("callUser", ({ userToCall, signalData, from, name, avatar }) => {
        const receiverSocketId = userSocketMap[userToCall];
        
        if (receiverSocketId) {
            console.log(`User ${from} calling user ${userToCall} at socket ${receiverSocketId}`);
          io.to(receiverSocketId).emit("incomingCall", {
            signal: signalData,
            from,
            name,
            avatar
          });
        } else {
            console.log(`User ${userToCall} is not online, cannot deliver call from ${from}`);
          io.to(from).emit("callDeclined"); // Let caller know the user is unavailable
        }
      });

    socket.on("answerCall", ({ signal, to }) => {
        io.to(to).emit("callAccepted", { signal });
      });
    
      socket.on("callDeclined", ({ to }) => {
        io.to(to).emit("callDeclined");
      });
    
      socket.on("endCall", ({ to }) => {
        io.to(to).emit("callEnded");
      });
})

export {io,app,server}