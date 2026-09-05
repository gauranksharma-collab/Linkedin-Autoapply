const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace(/^Bearer /, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
