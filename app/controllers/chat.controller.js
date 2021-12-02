// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const db = require("../models");
const User = db.user;

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