const bwipjs = require("bwip-js");

const generateBarcode = async (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",   // Barcode type
        text: text,        // Data
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
};


module.exports = {
  generateBarcode,
};