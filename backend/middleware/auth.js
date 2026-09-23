const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        let token = null;

        if (header.startsWith("Bearer ")) {
            token = header.substring(7).trim();
        } else if (req.method === 'GET' && typeof req.query.token === 'string') {
            // Allow ?token= on GET only — browsers opening a link in a new tab
            // cannot send an Authorization header.
            token = req.query.token.trim();
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
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

module.exports = { authenticate };
