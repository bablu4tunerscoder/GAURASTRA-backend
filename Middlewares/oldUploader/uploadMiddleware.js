const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs-extra");
const path = require("path");

// Ensure folders exist
const createFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const uploadPath = "Uploads";
const imagePath = path.join(uploadPath, "images");
const videoPath = path.join(uploadPath, "videos");
const pdfPath = path.join(uploadPath, "pdfs");

createFolder(imagePath);
createFolder(videoPath);
createFolder(pdfPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = imagePath; // Default to images
    if (file.mimetype.startsWith("video/")) folder = videoPath;
    else if (file.mimetype === "application/pdf") folder = pdfPath;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `user-${Date.now()}-${Math.floor(
      Math.random() * 1000000
    )}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images, videos, and PDFs are allowed"), false);
  }
};

const uploader = multer({ storage, fileFilter });

// Convert uploaded images to WebP
const image_processor = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  // If already webp, no need to convert — just return fixed path
  if (ext === ".webp") {
    const relativePath = path.relative(process.cwd(), filePath);
    return `/${relativePath.replace(/\\/g, "/")}`;
  }

  const webpPath = filePath.replace(ext, ".webp");

  await sharp(filePath)
    .toFormat("webp")
    .toFile(webpPath);

  fs.unlinkSync(filePath); 

  const relativePath = path.relative(process.cwd(), webpPath);
  return `/${relativePath.replace(/\\/g, "/")}`;
};

module.exports = {
  uploader,
  image_processor,
};
