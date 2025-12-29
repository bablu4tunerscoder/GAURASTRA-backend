/**
 * Reusable file filter for multer
 * @param {"image" | "video" | "pdf" | "image+video" | "all"} type
 */
const fileFilter = (type = "all") => {
  return (req, file, cb) => {
    const mime = file.mimetype;

    // ✅ Image only
    if (type === "image" && mime.startsWith("image/")) {
      return cb(null, true);
    }

    // ✅ Video only
    if (type === "video" && mime.startsWith("video/")) {
      return cb(null, true);
    }

    // ✅ PDF only
    if (type === "pdf" && mime === "application/pdf") {
      return cb(null, true);
    }

    // ✅ Image + Video
    if (
      type === "image+video" &&
      (mime.startsWith("image/") || mime.startsWith("video/"))
    ) {
      return cb(null, true);
    }

    // ✅ Allow all
    if (type === "all") {
      return cb(null, true);
    }

    // ❌ Invalid file
    cb(
      new Error(
        `Invalid file type. Allowed: ${type.replace("+", " & ")}`
      ),
      false
    );
  };
};

module.exports = fileFilter;
