const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();
const postsController = require("../controllers/postsController");
const validate = require("../middleware/validate");
const { createPostSchema, updatePostSchema } = require("../schemas/postSchema");
const { fail } = require("../utils/validate");

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const uploadsDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak valid. Hanya jpg, jpeg, png, webp yang diizinkan"));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

function discardUpload(file) {
    if (!file) return;
    fs.unlink(file.path, (err) => {
        if (err && err.code !== "ENOENT") {
            console.warn("Gagal menghapus file upload:", err.message);
        }
    });
}

function uploadSingle(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (!err) {
            return next();
        }

        discardUpload(req.file);

        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return fail(res, 400, "Ukuran file maksimal 2 MB");
        }

        return fail(res, 400, err.message);
    });
}

// Urutan penting untuk multipart/form-data:
// uploadSingle dulu (agar req.body terisi), lalu validasi Zod, lalu controller.
router.get("/", postsController.getPosts);
router.get("/:id", postsController.getPostById);
router.post("/", uploadSingle, validate(createPostSchema), postsController.createPost);
router.put("/:id", uploadSingle, validate(updatePostSchema), postsController.updatePost);
router.delete("/:id", postsController.deletePost);

module.exports = router;
