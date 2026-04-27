package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// 1. Logging lokasi saat ini untuk membantu debugging
	cwd, _ := os.Getwd()
	log.Printf("Info: Menjalankan backend dari direktori: %s", cwd)

	// Coba muat file .env dari berbagai lokasi umum
	_ = godotenv.Load() // Coba folder saat ini
	_ = godotenv.Load("../../.env") // Coba root backend (jika dijalankan dari cmd/api)
	_ = godotenv.Load("backend/.env") // Coba folder backend (jika dijalankan dari project root)

	// 2. Ambil dan validasi DATABASE_URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ ERROR: DATABASE_URL tidak ditemukan. Pastikan file .env berisi: DATABASE_URL=postgres://...")
	}

	// 3. Koneksi ke PostgreSQL Supabase
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("❌ ERROR: Format connection string salah:", err)
	}
	defer db.Close()

	// Cek koneksi ke database (Ping)
	err = db.Ping()
	if err != nil {
		log.Fatalf("❌ ERROR: Gagal terhubung ke database. \nDetail: %v\nPastikan password dan internet aman.", err)
	}
	fmt.Println("✅ Berhasil tersambung ke Supabase!")

	// 4. Inisialisasi Fiber
	app := fiber.New(fiber.Config{
		AppName: "PMO App Backend v1.0",
	})

	// 5. Middleware
	app.Use(logger.New()) 
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000", 
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE",
	}))

	// 6. Endpoints
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "success",
			"message": "Backend PMO App aktif dan stabil",
		})
	})

	// Endpoint untuk ambil data task
	app.Get("/tasks", func(c *fiber.Ctx) error {
		rows, err := db.Query("SELECT id, title, status FROM tasks LIMIT 10")
		if err != nil {
			log.Println("Query Error:", err)
			return c.Status(500).JSON(fiber.Map{
				"error": "Gagal mengambil data dari tabel tasks. Pastikan tabel sudah dibuat di Supabase.",
			})
		}
		defer rows.Close()

		tasks := []map[string]interface{}{}
		for rows.Next() {
			var id interface{}
			var title string
			var status string
			if err := rows.Scan(&id, &title, &status); err != nil {
				return err
			}
			tasks = append(tasks, map[string]interface{}{
				"id":     id,
				"title":  title,
				"status": status,
			})
		}

		return c.JSON(tasks)
	})

	// 7. Jalankan Server di port 8080
	port := ":8080"
	fmt.Printf("🚀 Server berjalan di http://localhost%s\n", port)
	log.Fatal(app.Listen(port))
}
