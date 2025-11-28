const jwt = require('jsonwebtoken');



const offlineAuthMiddleware = async (req, res, next) => {

    try {
        // 1. Token header se read kare
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(403).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(403).json({
                success: false,
                message: "Token missing"
            });
        }

        // 3. Check environment secret
        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET missing in env");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        // 4. JWT verify
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("JWT Verification Error:", err.message);
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token"
                });
            }

            // console.log('decoded', decoded);

          
            req.user = decoded.user;  
            next();
        });

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const offlineAdminMiddleware = (req, res, next) => {
  try {
   
     if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, user missing",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied! Admin only.",
      });
    }

    next();
    
  } catch (err) {
    console.error("Admin Auth Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



module.exports = { 
    offlineAuthMiddleware, offlineAdminMiddleware
};