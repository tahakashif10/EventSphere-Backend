
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// VERIFY USER LOGIN
const protect = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user without sensitive information
        const user = await User.findById(decoded.userId).select(
            "-password -resetPasswordToken -resetPasswordExpires"
        );

        if (!user) {
            return res.status(401).json({
                message: "User account not found"
            });
        }

        // Check whether the token has been invalidated
        if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
            return res.status(401).json({
                message: "Session expired. Please login again."
            });
        }

        // Attach user information to request
        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

// CHECK USER ROLE
const authorize = (...allowedRoles) => {
    return (req, res, next) => {

        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. You do not have permission."
            });
        }

        next();
    };
};

module.exports = { protect, authorize };
