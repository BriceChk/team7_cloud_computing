// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const RefreshToken = db.refreshToken;
const Conversation = db.conversation;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SALT_WORK_FACTOR = 10;

exports.signup = (req, res) => {
    const salt = bcrypt.genSaltSync(SALT_WORK_FACTOR);

    const user = new User({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, salt)
    });

    if (req.file) {
        user.imageUrl = '/uploads/profile-pics/' + req.file.filename;
    }

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
        .exec(async (err, user) => {
            if (err) {
                res.status(500).send({message: err});
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

            let token = jwt.sign({id: user.id}, config.secret, {
                expiresIn: config.jwtExpiration
            });

            let refreshToken = await RefreshToken.createToken(user);

            res.status(200).send({
                _id: user._id,
                username: user.username,
                accessToken: token,
                refreshToken: refreshToken,
            });
        });
};

exports.refreshToken = async (req, res) => {
    const requestToken = req.body.refreshToken;

    if (requestToken == null) {
        return res.status(403).json({ message: "Refresh Token is required!" });
    }

    try {
        let refreshToken = await RefreshToken.findOne({ token: requestToken });

        if (!refreshToken) {
            res.status(403).json({ message: "Refresh token expired or invalid. Please make a new signin request." });
            return;
        }

        if (RefreshToken.verifyExpiration(refreshToken)) {
            RefreshToken.findByIdAndRemove(refreshToken._id, { useFindAndModify: false }).exec();

            res.status(403).json({
                message: "Refresh token expired or invalid. Please make a new signin request.",
            });
            return;
        }

        RefreshToken.findByIdAndRemove(refreshToken._id, { useFindAndModify: false }).exec();
        let newRefreshToken = await RefreshToken.createToken(refreshToken.user);

        let newAccessToken = jwt.sign({ id: refreshToken.user._id }, config.secret, {
            expiresIn: config.jwtExpiration,
        });

        return res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        return res.status(500).send({ message: err });
    }
};