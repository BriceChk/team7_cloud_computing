const db = require("../models");
const User = db.user;

checkDuplicateUsername = (req, res, next) => {
    if (!req.body.username) {
        res.status(400).send({ message: "Missing username" });
        return;
    }

    if (!req.body.password) {
        res.status(400).send({ message: "Missing password" });
        return;
    }

    const regex = new RegExp("^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$");

    if (!regex.test(req.body.password)) {
        res.status(400).send({ message: 'Password must contain at least 8 characters, upper and lower case letter, a number and a special character' });
        return;
    }

    User.findOne({
        username: req.body.username
    }).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user) {
            res.status(400).send({ message: "Failed! Username is already in use!" });
            return;
        }

        next();
    });
};

const verifySignUp = {
    checkDuplicateUsername
};

module.exports = verifySignUp;