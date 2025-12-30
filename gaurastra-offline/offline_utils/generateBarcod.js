const bwipjs = require("bwip-js");

const generateQRCode = async (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "qrcode",
        text: text,
        paddingbottom:5,
        paddingleft:5,
        paddingright:5,
        paddingtop:5,
        scale: 3,        
        includetext: false,
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
};


module.exports = {
  generateQRCode,
};