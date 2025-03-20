import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import userRoutes from "./routes/user.route.js"
import { connectDB } from "./lib/db.js";
import { app,server } from "./lib/socket.js";


dotenv.config()
const PORT = process.env.PORT

app.use(cors({
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/message', messageRoutes)
app.use('/api/user', userRoutes)


server.listen(PORT, ()=>{
    console.log(`Server is running on port: ${PORT}`);
    connectDB()
})