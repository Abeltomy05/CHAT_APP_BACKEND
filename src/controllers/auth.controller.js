import cloudinary from '../lib/cloudinary.js';
import { generateToken } from '../lib/utils.js';
import User from '../models/user.model.js'
import bcrypt from "bcryptjs"


export const signup = async(req,res)=>{
    const {fullName,email,password} = req.body;
    try{
        if(!fullName || !email || !password){
            return res.status(400).json({
                message: "Credentials missing"
            })
        }

     if(password.length < 6){
        return res.status(400).json({
            message: "Password must be atleast 6 characters"
        })
     }

     const user = await User.findOne({email});
     if(user) return res.status(400).json({
        message: "Emaill already exists"
     })

     const salt = await bcrypt.genSalt(10);
     const hashedPassword = await bcrypt.hash(password,salt);

     const newUser = new User({
        fullName,
        email,
        password:hashedPassword
     })

     if(newUser){
          generateToken(newUser._id,res)
          await newUser.save();

          res.status(200).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            profilePic: newUser.profilePic
          })
     }else{
        res.status(400).json({
            message: "Invalid data"
        })
     }

    }catch(error){
         console.log("Error in signup controller",error.message)
         res.status(500).json({
            message: "Internal server Error"
         })
    }
}

export const login = async(req,res)=>{
    const {email,password} = req.body;
    try{
       if(!email || !password){
        return res.status(400).json({
            message: "Credentials missing"
        })
       }

       const user = await User.findOne({email});
       if(!user){
        return res.status(400).json({
            message: "Invalid credentials"
        })
       }

      const isPasswordCorrect =  await bcrypt.compare(password, user.password);

      if(!isPasswordCorrect){
        return res.status(400).json({
            message: "Invalid credentials"
        })
      }

      generateToken(user._id,res);

      res.status(200).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic
      })

    }catch(error){
        console.log("Error in login controller",error.message)
        res.status(500).json({
           message: "Internal server Error"
        })
    }
}

export const logout = async(req,res)=>{
    try{
     res.cookie("jwt","", {maxAge:0});
     res.status(200).json({message: "Logged out successfully"})
    }catch(error){
        console.log("Error in logout controller",error.message)
        res.status(500).json({
           message: "Internal server Error"
        })
    }
}

export const updateProfile = async(req,res)=>{
    try{
      const {profilePic} = req.body;
      const userId = req.user._id;

      if(!profilePic){
        return res.status(400).json({message:"Profile picture is required"});
      }

      const uploadRespose = await cloudinary.uploader.upload(profilePic);
      const updatedUser = await User.findByIdAndUpdate(userId, {profilePic:uploadRespose.secure_url}, {new:true})

      res.status(200).json({updatedUser});
    }catch(error){
        console.log("Error in update user profile controller",error.message)
        res.status(500).json({
           message: "Internal server Error"
        })
    }
}

export const checkAuth = async(req,res)=>{ 
    try{
       res.status(200).json(req.user);
    }catch(error){
        console.log("Error in checkAuth controller",error.message)
        res.status(500).json({
           message: "Internal server Error"
        })
    }
}

export const googleLogin = async(req,res)=>{
    const { email, fullName, picture, googleId } = req.body;

    try {
        console.log("Google login request received:", { email, fullName, googleId });

        if(!email || !fullName || !googleId) {
            return res.status(400).json({
                message: "Required Google auth data missing"
            });
        }
        
        // Check if user already exists with this email
        let user = await User.findOne({ email });
        
        if(user) {
            // User exists - update Google ID if they don't have one
            if(!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user with Google data
            const randomPassword = Math.random().toString(36).slice(-12);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = new User({
                fullName,
                email,
                password: hashedPassword,
                googleId,
                profilePic: picture 
            });
            
            await user.save();
        }
        
        // Generate JWT token
        generateToken(user._id, res);
        
    
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
        });
        
    } catch(error) {
        console.log("Error in Google login controller", error.message);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
}