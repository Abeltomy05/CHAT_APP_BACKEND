import express from "express";
const router = express.Router();

import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar, getMessages, sendMessage, clearChat, createGroup, getGroupMessages, sendGroupMessage, clearGroupChat, getGroups,getGroupById,leaveGroup } from "../controllers/message.controller.js";


router.get('/users',protectRoute, getUsersForSidebar)

router.get('/groups', protectRoute, getGroups);
router.post('/createGroup', protectRoute, createGroup);
router.get('/getSinglegroup/:id', protectRoute, getGroupById );
router.get('/getGroupMessages/:groupId', protectRoute, getGroupMessages);
router.post('/sendGroupMessages/:groupId', protectRoute, sendGroupMessage);
router.post('/clearGroupMessages', protectRoute, clearGroupChat);
router.post('/leaveGroup', protectRoute, leaveGroup);

router.post('/clear', protectRoute, clearChat);
router.post('/send/:id',protectRoute, sendMessage)

router.get('/:id',protectRoute, getMessages)


//group chat





export default router;
