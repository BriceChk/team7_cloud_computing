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
};