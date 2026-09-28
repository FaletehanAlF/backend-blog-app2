const { z } = require("zod");

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 20000;

function normalizeTitle(value) {
    if (typeof value !== "string") {
        return value;
    }
    return value.replace(/\s+/g, " ").trim();
}

// Samakan dengan behavior content saat ini: hanya trim.
function trimContent(value) {
    if (typeof value !== "string") {
        return value;
    }
    return value.trim();
}

const titleField = z.preprocess(
    normalizeTitle,
    z
        .string({ error: "Judul artikel wajib diisi" })
        .min(1, "Judul artikel wajib diisi")
        .max(MAX_TITLE_LENGTH, `Judul artikel maksimal ${MAX_TITLE_LENGTH} karakter`)
);

const contentField = z.preprocess(
    trimContent,
    z
        .string({ error: "Isi artikel wajib diisi" })
        .min(1, "Isi artikel wajib diisi")
        .max(MAX_CONTENT_LENGTH, `Isi artikel maksimal ${MAX_CONTENT_LENGTH} karakter`)
);

const categoryIdField = z
    .coerce.number({ error: "category_id wajib diisi dan berupa angka" })
    .int("category_id wajib diisi dan berupa angka")
    .positive("category_id wajib diisi dan berupa angka");

// Image bersifat opsional. Body tidak divalidasi ketat agar
// multipart/form-data tidak rusak. Controller yang menentukan
// nilai akhir (file upload / string / null / gambar lama).
const imageField = z.preprocess(
    (value) => {
        if (value === undefined || value === null) {
            return value;
        }
        if (typeof value === "string") {
            return value;
        }
        return null;
    },
    z.string().nullable().optional()
);

// Link gambar opsional (fitur "tempel link"). String kosong = tidak ada.
// Validasi URL penuh dilakukan Zod; pengamanan download ada di controller.
const imageUrlField = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    },
    z.string({ error: "Link gambar tidak valid" }).url("Link gambar tidak valid").nullable().optional()
);

const createPostSchema = z.object({
    title: titleField,
    content: contentField,
    category_id: categoryIdField,
    image: imageField,
    image_url: imageUrlField
});

// Behavior update saat ini sama dengan create: semua field wajib.
// Gunakan schema yang sama agar request update yang sudah PASS tidak rusak.
const updatePostSchema = createPostSchema;

module.exports = {
    createPostSchema,
    updatePostSchema,
    MAX_TITLE_LENGTH,
    MAX_CONTENT_LENGTH
};
