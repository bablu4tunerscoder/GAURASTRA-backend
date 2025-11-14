const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs-extra");
const path = require("path");

// Ensure folder exists
const createFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const uploadPath = "Uploads";
const paymentPath = path.join(uploadPath, "payment");

createFolder(paymentPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paymentPath); // Save in "Uploads/payment"
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `payment-${Date.now()}-${Math.floor(
      Math.random() * 1000000
    )}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Convert uploaded images to WebP and compress
const processImage = async (filePath) => {
  const webpPath = filePath.replace(path.extname(filePath), ".webp");

  await sharp(filePath)
    .resize(800) // Resize to 800px width
    .toFormat("webp")
    .webp({ quality: 80 }) // Compress with 80% quality
    .toFile(webpPath);

  fs.unlinkSync(filePath); // Remove original file

  // Fix Windows path issue
  const relativePath = path.relative(process.cwd(), webpPath);
  return `/${relativePath.replace(/\\/g, "/")}`; // Ensure forward slashes
};

module.exports = upload;
module.exports.processImage = processImage;
