const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const imageToWebp = async (filePath) => {
  const webpPath = filePath.replace(path.extname(filePath), ".webp");
  await sharp(filePath).webp({ quality: 80 }).toFile(webpPath);
  fs.unlinkSync(filePath);
  return webpPath;
};

module.exports = { imageToWebp };