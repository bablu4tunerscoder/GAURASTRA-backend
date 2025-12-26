// utils/helpers.js
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function cleanString(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()                
    .trim()                        
    .replace(/-/g, " ")            
    .replace(/_/g, " ")            
    .replace(/[^a-z0-9 ]/g, "")    
    .replace(/\s+/g, " ");         
};

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}


  module.exports = {
    sleep,
    cleanString,
    generateOTP
  };