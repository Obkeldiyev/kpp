import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const NEWS_DIR = path.join(UPLOAD_ROOT, "news");

ensureDir(NEWS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, NEWS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .slice(0, 60);

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase || "file"}-${unique}${ext}`);
  },
});

// allow only images + videos (you can expand)
function fileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
  if (!ok) return cb(new Error("Only image/* and video/* files are allowed"));
  cb(null, true);
}

export const uploadNewsMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 10, // max 10 files
  },
});

export const uploadBridgeFace = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
