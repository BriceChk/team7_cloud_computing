const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Conversation = db.conversation;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
    const user = new User({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, 8)
    });

    user.save(async (err, user) => {
        if (err) {
            res.status(500).send({message: err});
            return;
        }

        let globalConv = await Conversation.findOne({isGlobal: true});
        globalConv.participants.push(user._id);
        globalConv.save();

        res.send({
            message: "You successfully registered as " + user.username + ". You can now login.",
            username: user.username
        });
        console.log("New user signed up: " + req.body.username);
    });
};

exports.signin = (req, res) => {
    User.findOne({
        username: req.body.username
    })
        .exec((err, user) => {
            if (err) {
                res.status(500).send({ message: err });
                return;
            }

            if (!user) {
                return res.status(401).send({
                    accessToken: null,
                    message: "Invalid credentials!"
                });
            }

            let passwordIsValid = bcrypt.compareSync(
                req.body.password,
                user.password
            );

            if (!passwordIsValid) {
                return res.status(401).send({
                    accessToken: null,
                    message: "Invalid credentials!"
                });
            }

            let token = jwt.sign({ id: user.id }, config.secret, {
                expiresIn: 86400 // 24 hours
            });

            res.status(200).send({
                _id: user._id,
                username: user.username,
                accessToken: token
            });
        });
};