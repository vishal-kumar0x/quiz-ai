package main

import (
	"database/sql"
	"log"
	"os"

	_ "modernc.org/sqlite"
)

var db *sql.DB

// Models
type MCQ struct {
	Question      string   `json:"question"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"answer"`
	Explanation   string   `json:"explanation,omitempty"`
}

type Quiz struct {
	ID          int    `json:"id"`
	Topic       string `json:"topic"`
	Tags        string `json:"tags"`
	Level       string `json:"level"`
	Count       int    `json:"count"`
	Description string `json:"description"`
}

type QuizDetail struct {
	Quiz
	Questions []MCQ `json:"questions"`
}

func initDB() {
	var err error
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./quiz.db"
	}
	db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal("Error opening database:", err)
	}

	// Issue #8 Fix: Force SQLite to serialize writes safely
	db.SetMaxOpenConns(1)

	createTables := `
	CREATE TABLE IF NOT EXISTS quizzes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		topic TEXT,
		tags TEXT,
		level TEXT,
		count INTEGER,
		description TEXT
	);

	CREATE TABLE IF NOT EXISTS questions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		quiz_id INTEGER,
		question TEXT,
		options TEXT,
		answer TEXT,
		explanation TEXT,
		FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
	);


	CREATE TABLE IF NOT EXISTS users (
		email TEXT PRIMARY KEY,
		role TEXT DEFAULT 'user',
		joined_at DATETIME,
		last_login DATETIME
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	`
	_, err = db.Exec(createTables)
	if err != nil {
		log.Fatal("Error creating tables:", err)
	}

	// Safety check to migrate existing users table if 'role' column is missing
	_, _ = db.Exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
}
