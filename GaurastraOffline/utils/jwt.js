const jwt = require('jsonwebtoken');

const generateToken = (payload, expiresIn = '1h') => {
    
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            process.env.JWT_SECRET, 
            { expiresIn: expiresIn }, 
            (err, token) => {
                if (err) {
                    console.error("JWT Sign Error:", err);
                    return reject(err);
                }
                resolve(token);
            }
        );
    });
};

// Export using CommonJS syntax
module.exports = { 
    generateToken 
};