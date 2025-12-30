require('dotenv').config();

module.exports = {
    BASE_URL: process.env.PHONEPE_BASE_URL,
    IDENTITY_MANAGER_URL: process.env.PHONEPE_IDENTITY_MANAGER_URL,
    MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
    SALT_KEY: process.env.PHONEPE_SALT_KEY,
    SALT_INDEX: process.env.PHONEPE_SALT_INDEX,
    CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
    CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
    REDIRECT_URL: process.env.PHONEPE_REDIRECT_URL,
    CALLBACK_URL: process.env.PHONEPE_CALLBACK_URL,
    ENV: process.env.NODE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
    FRONTEND_URL: process.env.FRONTEND_URL,
    PRD_BASE_URL: process.env.BASE_URL
  };