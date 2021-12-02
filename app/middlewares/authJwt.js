// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

verifyToken = (req, res, next) => {
    let token = req.headers["x-access-token"];

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }

    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized!" });
        }
        req.userId = decoded.id;
        next();
    });
};

getUserIdOfToken = (token) => {
    try {
        let decoded = jwt.verify(token, config.secret);
        return decoded.id;
    } catch (e) {
        return null;
    }
}

const authJwt = {
    verifyToken,
    getUserIdOfToken
};
module.exports = authJwt;