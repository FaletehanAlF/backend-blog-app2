-- ==========================================
-- DATABASE: narata_blog_2
-- Cara pakai: copy semua isi file ini
-- ke MySQL Workbench lalu tekan Run
-- ==========================================

-- LANGKAH 1: Buat database baru
-- IF NOT EXISTS artinya: kalau sudah ada, tidak error
CREATE DATABASE IF NOT EXISTS narata_blog_2;

-- LANGKAH 2: Masuk / pakai database tersebut
USE narata_blog_2;

-- LANGKAH 3: Buat tabel categories (kategori artikel)
-- Contoh isi: Teknologi, Tutorial, Berita
CREATE TABLE IF NOT EXISTS categories (
  -- id: nomor unik otomatis (1, 2, 3, ...)
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- name: nama kategori, maksimal 60 huruf, tidak boleh sama
  name VARCHAR(60) NOT NULL UNIQUE
);

-- LANGKAH 4: Buat tabel posts (artikel / blog)
CREATE TABLE IF NOT EXISTS posts (
  -- id: nomor unik otomatis
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- title: judul artikel, maksimal 200 huruf, wajib diisi
  title VARCHAR(200) NOT NULL,

  -- content: isi artikel, teks panjang, wajib diisi
  content TEXT NOT NULL,

  -- image: lokasi gambar, contoh: /uploads/foto.jpg
  -- boleh kosong (NULL) kalau artikel tanpa gambar
  image VARCHAR(255) NULL,

  -- category_id: penghubung ke tabel categories
  -- contoh: 1 artinya kategori nomor 1
  category_id INT NOT NULL,

  -- created_at: tanggal dibuat, otomatis terisi sekarang
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Aturan: category_id harus ada di tabel categories
  -- Kalau kategori masih dipakai artikel, tidak boleh dihapus
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
