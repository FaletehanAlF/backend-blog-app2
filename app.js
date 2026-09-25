const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const categoriesRouter = require("./routes/categories");
const postsRouter = require("./routes/posts");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/categories", categoriesRouter);
app.use("/posts", postsRouter);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NARATA Backend berjalan!"
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});