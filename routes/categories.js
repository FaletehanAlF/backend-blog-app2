const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController");
const validate = require("../middleware/validate");
const { createCategorySchema, updateCategorySchema } = require("../schemas/categorySchema");

router.get("/", categoriesController.getCategories);
router.post("/", validate(createCategorySchema), categoriesController.createCategory);
router.put("/:id", validate(updateCategorySchema), categoriesController.updateCategory);
router.delete("/:id", categoriesController.deleteCategory);

module.exports = router;
