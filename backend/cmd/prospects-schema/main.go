package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Try loading .env
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Note: Could not load .env, using system environment variables.")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("ERROR: DATABASE_URL is not set in .env")
	}

	// Connect to Postgres
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("ERROR opening database connection:", err)
	}
	defer db.Close()

	// Read SQL file - adjust path since we are in cmd/prospects-schema/
	sqlBytes, err := os.ReadFile("../../prospects_schema.sql")
	if err != nil {
		log.Fatal("ERROR reading prospects_schema.sql:", err)
	}

	fmt.Println("Executing SQL script to create tables...")
	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		log.Fatal("ERROR executing SQL:", err)
	}

	fmt.Println("SUCCESS! Database schema updated. The public.prospects table has been created.")
}
