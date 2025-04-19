import mongoose from "mongoose";

// Group model
const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        groupImage: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

// Group message model
const groupMessageSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String
        },
        image: {
            type: String
        }
    },
    { timestamps: true }
);

const Group = mongoose.model('Group', groupSchema);
const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

export { Group, GroupMessage };