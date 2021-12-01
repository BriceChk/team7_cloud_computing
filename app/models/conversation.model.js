const mongoose = require("mongoose");
const utils = require("../../app/middlewares/utils");

const Conversation = mongoose.model(
    "Conversation",
    new mongoose.Schema({
        name: {
            type: String,
            set: v => utils.sanitize(v)
        },
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
                content: {
                    type: String,
                    set: v => utils.sanitize(v)
                },
                timestamp: { type: Date, default: Date.now },
                isSpecial: {
                    type: Boolean,
                    default: false
                }
            }
        ],
        files: [
            {
                name: String,
                url: String
            }
        ],
        isGlobal: {
            type: Boolean,
            default: false
        }
    })
);

module.exports = Conversation;