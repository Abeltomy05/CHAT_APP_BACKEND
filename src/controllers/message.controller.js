import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js"
import User from "../models/user.model.js";


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
       ]
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
     
    
     await Message.deleteMany({
       $or: [
         { senderId: authUserId, receiverId: userId },
         { senderId: userId, receiverId: authUserId }
       ]
     });
     
     res.status(200).json({ message: "Chat cleared successfully" });
   } catch (error) {
     console.error("Error clearing chat:", error);
     res.status(500).json({ message: "Error clearing chat" });
   }
 }