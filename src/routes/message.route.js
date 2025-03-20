import express from "express";
const router = express.Router();

import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar, getMessages, sendMessage, clearChat} from "../controllers/message.controller.js";


router.get('/users',protectRoute, getUsersForSidebar)
router.get('/:id',protectRoute, getMessages)
router.post('/send/:id',protectRoute, sendMessage)
router.post('/clear', protectRoute, clearChat);




export default router;
