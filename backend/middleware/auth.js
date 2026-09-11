const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization || "";

        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = header.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = Number(decoded.userId);
        req.userRole = decoded.role || "customer";

        if (!Number.isInteger(req.userId) || req.userId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
}

module.exports = {
    authenticate
};
