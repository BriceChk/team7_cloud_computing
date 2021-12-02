// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const mongoose = require("mongoose");

const Conversation = mongoose.model(
    "Conversation",
    new mongoose.Schema({
        name: String,
        participants: [
            {
                type: mongoose.Types.ObjectId,
                ref: 'User'
            }
        ],
        messages: [
            {
                sender: {
                    type: mongoose.Types.ObjectId,
                    ref: "User"
                },
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
            }
        ],
        isGlobal: {
            type: Boolean,
            default: false
        }
    })
);

module.exports = Conversation;