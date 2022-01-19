// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const mongoose = require("mongoose");

const Message = mongoose.model(
    "Message",
    new mongoose.Schema({
        sender: {
            type: mongoose.Types.ObjectId,
            ref: "User"
        },
        conversation: {
            type: mongoose.Types.ObjectId,
            ref: "Conversation"
        },
        readBy: [
            {
                type: mongoose.Types.ObjectId,
                ref: 'User'
            }
        ],
        senderName: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
        isSpecial: {
            type: Boolean,
            default: false
        },
        isUpload: {
            type: Boolean,
            default: false
        }
    })
);

module.exports = Message;