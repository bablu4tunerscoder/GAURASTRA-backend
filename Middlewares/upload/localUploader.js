const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileFilter = require("./fileFilter"); 

/**
 * Local file uploader
 * @param {string} folder 
 * @param {"image" | "video" | "pdf" | "image+video" | "all"} type
 */
const localUploader = (folder, type = "all") => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = file.originalname
        .replace(ext, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "");

      cb(null, `${safeName}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    fileFilter: fileFilter(type), 
  });
};

module.exports = localUploader;
