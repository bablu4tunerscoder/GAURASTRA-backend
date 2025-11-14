const fs = require("fs");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "Uploads/landing";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

const convertToWebp = async (req, res, next) => {
  if (!req.files) return next();

  const convertedFiles = [];

  for (let file of req.files) {
    const outputFilePath = file.path.replace(path.extname(file.path), ".webp");

    await sharp(file.path).webp({ quality: 80 }).toFile(outputFilePath);

    fs.unlinkSync(file.path);

    // ✅ Push .webp version
    convertedFiles.push({
      ...file,
      filename: path.basename(outputFilePath),
      path: outputFilePath,
      originalname: file.originalname,
      mimetype: "image/webp",
    });
  }

  req.files = convertedFiles;
  next();
};

module.exports = { upload, convertToWebp };
