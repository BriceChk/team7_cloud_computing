const db = require("../models");
const User = db.user;

exports.test = (req, res) => {
    res.status(200).send("Test ok.");
};

exports.testPublic = (req, res) => {
    res.status(200).send("Test ok.");
};

exports.findUserById = (req, res) => {
    User.findOne({
        _id: req.query.id
    }, function (err, user) {
        if (err || !user) {
            return res.status(404).send({message: 'User not found'});
        }

        res.send({
            username: user.username,
            id: user._id,
            imageUrl: user.imageUrl
        });
    })
};

exports.findUserByUsername = (req, res) => {
    User.findOne({
        username: req.query.username
    }, function (err, user) {
        if (err || !user) {
            return res.status(404).send({message: 'User not found'});
        }

        res.send({
            username: user.username,
            id: user._id,
            imageUrl: user.imageUrl
        });
    })
};