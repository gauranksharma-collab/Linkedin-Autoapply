const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { UPLOADS_DIR } = require("../config/paths");

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx"]);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume-${Date.now()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error("Only .pdf and .docx résumé files are supported"));
  }
  cb(null, true);
}

const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadResume };
