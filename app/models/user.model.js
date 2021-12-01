const mongoose = require("mongoose");

const User = mongoose.model(
    "User",
    new mongoose.Schema({
        username: String,
        password: String,
        imageUrl: {
            type: String,
            default: '/placeholder.png'
        }
    })
);

module.exports = User;