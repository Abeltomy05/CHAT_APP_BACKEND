import mongoose from 'mongoose';
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js"
import User from "../models/user.model.js";
import { Group } from "../models/group.model.js";
import { GroupMessage } from "../models/group.model.js";
import {getIO} from '../lib//socket.js' 



export const getUsersForSidebar = async(req,res)=>{
   try{
    let loggedInUserId = req.user._id;
    
    // Get the current user to access their blocked users list
    const currentUser = await User.findById(loggedInUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Filter out users who are blocked by the current user
    const filteredUsers = await User.find({
      $and: [
        { _id: { $ne: loggedInUserId } },
        { _id: { $nin: currentUser.blockedUsers } }
      ]
    }).select("-password");
    
    res.status(200).json(filteredUsers);
   }catch(error){
     console.log("Error in getUsersForSidebar controller:",error.message);
     res.status(500).json({
        error:"Internal server error"
     })
   }
}

export const getMessages = async(req,res)=>{
   try{
     const {id:userToChatId} = req.params;
     const myId = req.user._id;

     if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

     // Check if user is blocked before retrieving messages
     const currentUser = await User.findById(myId);
     if (currentUser.blockedUsers.includes(userToChatId)) {
       return res.status(403).json({
         error: "Cannot retrieve messages from blocked user"
       });
     }

     const messages = await Message.find({
       $or:[
           {senderId:myId, receiverId:userToChatId},
           {senderId:userToChatId, receiverId:myId}
       ],
       deletedFor: { $ne: myId }
     });

     res.status(200).json(messages);
   }catch(error){
       console.log("Error in getMessages controller:",error.message);
    res.status(500).json({
       error:"Internal server error"
    })
   }
}

export const sendMessage = async(req,res)=>{
   try{
      const {text, image} = req.body;
      const {id: receiverId} = req.params;
      const senderId = req.user._id;

      // Check if sender has blocked the receiver or vice versa
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      
      if (!sender || !receiver) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if either user has blocked the other
      if (sender.blockedUsers.includes(receiverId)) {
        return res.status(403).json({
          error: "Cannot send message to blocked user"
        });
      }

      // Check if receiver has blocked the sender
      if (receiver.blockedUsers.includes(senderId)) {
        return res.status(403).json({
          error: "This user has blocked you"
        });
      }

      let imageUrl;
      if(image){
       const uploadResponse = await cloudinary.uploader.upload(image);
       imageUrl = uploadResponse.secure_url;
      }

      const newMessage = new Message({
       senderId,
       receiverId,
       text,
       image: imageUrl,
      });

      await newMessage.save();

     const receiverSocketId = getReceiverSocketId(receiverId);
     if(receiverSocketId){
        io.to(receiverSocketId).emit('newMessage',newMessage)
     }

      res.status(200).json(newMessage);
   }catch(error){
       console.log("Error in sendMessage controller:",error.message);
    res.status(500).json({
       error:"Internal server error"
    })
   }
}

export const clearChat = async (req, res) => {
   try {
      console.log(req.body);
     const { userId } = req.body; 
     const authUserId = req.user._id; 
     
    
     await Message.updateMany(
      {
        $or: [
          { senderId: authUserId, receiverId: userId },
          { senderId: userId, receiverId: authUserId }
        ],
        deletedFor: { $ne: authUserId } 
      },
      {
        $push: { deletedFor: authUserId }
      }
    );
     
     res.status(200).json({ message: "Chat cleared successfully" });
   } catch (error) {
     console.error("Error clearing chat:", error);
     res.status(500).json({ message: "Error clearing chat" });
   }
 }

 //group chat
export const getGroups = async(req,res)=>{
  try {
    const userId = req.user._id;

    const groups = await Group.find({
      $or: [
        { admin: userId },
        { members: userId }
      ]
    })
    .populate('admin', 'fullName email profilePic') 
    .populate('members', 'fullName email profilePic')
    .sort({ updatedAt: -1 }); 

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
}

export const getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    
    const group = await Group.findById(groupId)
      .populate('admin', 'fullName email profilePic')
      .populate('members', 'fullName email profilePic');
      
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    return res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return res.status(500).json({ message: "Failed to fetch group details" });
  }
};

 export const createGroup = async (req, res) => {
  try {
      const { name, members, groupImage } = req.body;
      
      // Add current user as admin and member
      const admin = req.user._id;
      const allMembers = [...members, admin];
      
      const newGroup = new Group({
          name,
          admin,
          members: allMembers,
          groupImage
      });
      
      await newGroup.save();
      
      res.status(201).json(newGroup);
  } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
      const { groupId } = req.params;
      
      // Check if user is group member
      const group = await Group.findById(groupId);
      if (!group) {
          return res.status(404).json({ message: "Group not found" });
      }
      
      if (!group.members.includes(req.user._id)) {
          return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const messages = await GroupMessage.find({ groupId })
          .sort({ createdAt: 1 })
          .populate("senderId", "fullName profilePic");
          
      res.status(200).json(messages);
  } catch (error) {
      console.error("Error fetching group messages:", error);
      res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
      const { groupId } = req.params;
      const { text, image } = req.body;
      const senderId = req.user._id;
      
      // Check if user is group member
      const group = await Group.findById(groupId);
      if (!group) {
          return res.status(404).json({ message: "Group not found" });
      }
      
      const memberIds = group.members.map(id => id.toString());
      if (!memberIds.includes(senderId.toString())) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }
      
      // At least one of text or image is required
      if (!text && !image) {
          return res.status(400).json({ message: "Message cannot be empty" });
      }
      
      const newMessage = new GroupMessage({
          groupId,
          senderId,
          text,
          image
      });
      
      await newMessage.save();
      
      // Populate sender details for frontend
      const populatedMessage = await GroupMessage.findById(newMessage._id)
          .populate("senderId", "fullName profilePic");
          
      // Emit socket event for real-time updates
      const io = getIO();
      io.to(groupId.toString()).emit("newMessage", {
          ...populatedMessage.toObject(),
          createdAt: new Date(),
          groupId
      });
      
      res.status(201).json(populatedMessage);
  } catch (error) {
      console.error("Error sending group message:", error);
      res.status(500).json({ message: "Failed to send message" });
  }
};

export const clearGroupChat = async (req, res) => {
  try {
      const { groupId } = req.body;
      const userId = req.user._id;
      
      // Check if user is group admin
      const group = await Group.findById(groupId);
      if (!group) {
          return res.status(404).json({ message: "Group not found" });
      }
      
      if (group.admin.toString() !== userId.toString()) {
          return res.status(403).json({ message: "Only group admin can clear messages" });
      }
      
      await GroupMessage.deleteMany({ groupId });
      
      res.status(200).json({ message: "Group chat cleared successfully" });
  } catch (error) {
      console.error("Error clearing group chat:", error);
      res.status(500).json({ message: "Failed to clear group chat" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user._id;

    if (!groupId) {
      return res.status(400).json({ message: "Group ID is required" });
    }

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    // If user is the admin, prevent leaving unless they're the only member
    // if (group.admin.toString() === userId.toString() && group.members.length > 1) {
    //   return res.status(400).json({ 
    //     message: "As the admin, you must transfer admin rights before leaving the group" 
    //   });
    // }

    group.members = group.members.filter(
      member => member.toString() !== userId.toString()
    );

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return res.status(200).json({ message: "Group deleted as it no longer has any members" });
    }

    // If the admin is leaving and there are other members, transfer admin rights to the first member
    if (group.admin.toString() === userId.toString()) {
      group.admin = group.members[0];
    }

    await group.save();

    res.status(200).json({ message: "Successfully left the group" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
