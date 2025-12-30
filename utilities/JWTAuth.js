const jwt = require("jsonwebtoken");

// Generate Token
const createToken = (user, expiresIn = "7d") => {
  const payload = {
    phone: user.phone,
    userid: user._id,
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Auth Check Middleware
function authCheck(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; 
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized - invalid token" });
  }
}

function adminCheck() {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔥 Admin = full access (no permission needed)
    if (req.user.role === "Admin") {
      return next();
    }

    // 🔥  no access
    return res.status(403).json({ message: "Permission Denied" });
  };
}

function permissionCheck(permission) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role === "Admin") {
      return next();
    }


    if (
      req.user.role === "Employee" &&
      Array.isArray(req.user.permissions) &&
      req.user.permissions.includes(permission)
    ) {
      return next();
    }

    // 🔥 Customer default: no access
    return res.status(403).json({ message: "Permission Denied" });
  };
}


module.exports = {
  createToken,
  authCheck,
  adminCheck,
  permissionCheck
};
