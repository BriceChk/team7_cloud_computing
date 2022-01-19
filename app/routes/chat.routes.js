// AUTHORS: GROUP 7 - Mickaël BENASSE (805211), Brice CHKIR (805212), Joffrey COLLET (805213)

const authJwt = require("../middlewares/authJwt");
const controller = require("../controllers/chat.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/user/findById", [authJwt.verifyToken], controller.findUserById);
    app.get("/api/user/findByUsername", [authJwt.verifyToken], controller.findUserByUsername);
    app.get("/api/conversation/getConvMessages", [authJwt.verifyToken], controller.getConvMessages);
};