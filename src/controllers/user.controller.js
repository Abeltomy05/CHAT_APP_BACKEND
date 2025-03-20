import User from "../models/user.model.js";
import mongoose from "mongoose";

export const blockUser = async (req, res) => {
    try {
        console.log("userId",req.body)
      const { userId } = req.body;
      const authUserId = req.user._id;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
  
      // Check if user exists
      const userToBlock = await User.findById(userId);
      if (!userToBlock) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Add to blocked users if not already blocked
      const user = await User.findById(authUserId);
      if (user.blockedUsers.includes(userId)) {
        return res.status(400).json({ error: "User is already blocked" });
      }
  
      await User.findByIdAndUpdate(authUserId, {
        $addToSet: { blockedUsers: userId }
      });
  
      res.status(200).json({ message: "User blocked successfully" });
    } catch (error) {
      console.log("Error in blockUser controller:", error.message);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  };
  
  export const unblockUser = async (req, res) => {
    try {
      const { userId } = req.body;
      const authUserId = req.user._id;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
  
      await User.findByIdAndUpdate(authUserId, {
        $pull: { blockedUsers: userId }
      });
  
      res.status(200).json({ message: "User unblocked successfully" });
    } catch (error) {
      console.log("Error in unblockUser controller:", error.message);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  };
 
  export const getBlockedUsers = async (req, res) => {
    try {
      const authUserId = req.user._id;
      
      const user = await User.findById(authUserId).populate("blockedUsers", "fullName email profilePic");
      
      res.status(200).json(user.blockedUsers);
    } catch (error) {
      console.log("Error in getBlockedUsers controller:", error.message);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  };

  