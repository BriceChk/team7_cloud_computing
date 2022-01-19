// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const db = require("../models");
const User = db.user;
const Message = db.message;

// Query: { id: "userId" }
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

// Query: { username: "username" }
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

// Return the 20 last messages of convId before 'olderThan' (or now if omited)
// Query: { id: "convId", olderThan: timestamp }
exports.getConvMessages = (req, res) => {
    let timestamp = (typeof req.query.olderThan !== 'undefined') ? req.query.olderThan : Date.now();

    Message.find({
        conversation: req.query.id,
        timestamp: { $lt: timestamp }
    }, null, { sort: { timestamp: -1 }, limit: 21 },
        function (err, messages) {
        if (err) {
            return res.status(404).send({message: 'Error while getting messages'});
        }

        // We get 21 last messages but only send 20 to know if there is more to load

        res.send({
            messages: messages.slice(0, 20),
            hasOlderMessages: messages.length === 21,
        });
    })
};