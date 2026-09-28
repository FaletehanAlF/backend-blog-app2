const { z } = require("zod");

const MAX_NAME_LENGTH = 60;

function normalizeName(value) {
    if (typeof value !== "string") {
        return value;
    }
    return value.replace(/\s+/g, " ").trim();
}

const nameField = z.preprocess(
    normalizeName,
    z
        .string({ error: "Nama kategori wajib diisi" })
        .min(1, "Nama kategori wajib diisi")
        .max(MAX_NAME_LENGTH, `Nama kategori maksimal ${MAX_NAME_LENGTH} karakter`)
);

const createCategorySchema = z.object({
    name: nameField
});

// Behavior update kategori sama dengan create.
const updateCategorySchema = createCategorySchema;

module.exports = {
    createCategorySchema,
    updateCategorySchema,
    MAX_NAME_LENGTH
};
