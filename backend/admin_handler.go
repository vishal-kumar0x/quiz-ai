package main

import (
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"time"
)

// ----------------------------------------------------
// ADMINISTRATOR GOD-MODE HANDLERS
// ----------------------------------------------------

func handleAdminStats(w http.ResponseWriter, r *http.Request) {
	isAdmin, ok := r.Context().Value("isAdmin").(bool)
	if !ok || !isAdmin {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	stats := map[string]interface{}{
		"memoryMB":    m.Alloc / 1024 / 1024,
		"activeRooms": getActiveRoomCount(), // defined in websocket.go
	}

	var qzCount, qstCount, usrCount int
	db.QueryRow("SELECT COUNT(*) FROM quizzes").Scan(&qzCount)
	db.QueryRow("SELECT COUNT(*) FROM questions").Scan(&qstCount)
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&usrCount)
	stats["totalQuizzes"]   = qzCount
	stats["totalQuestions"] = qstCount
	stats["totalUsers"]     = usrCount

	var announcement string
	db.QueryRow("SELECT value FROM settings WHERE key = 'announcement'").Scan(&announcement)
	stats["announcement"] = announcement

	rows, _ := db.Query("SELECT email, joined_at, last_login FROM users ORDER BY last_login DESC")
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var email string
		var joined, last time.Time
		rows.Scan(&email, &joined, &last)
		users = append(users, map[string]interface{}{
			"email":     email,
			"joined_at": joined,
			"last_login": last,
		})
	}
	stats["usersDirectory"] = users

	json.NewEncoder(w).Encode(stats)
}

func handleGetAnnouncement(w http.ResponseWriter, r *http.Request) {
	var announcement string
	db.QueryRow("SELECT value FROM settings WHERE key = 'announcement'").Scan(&announcement)
	json.NewEncoder(w).Encode(map[string]string{"announcement": announcement})
}

func handleAdminAnnouncement(w http.ResponseWriter, r *http.Request) {
	isAdmin, ok := r.Context().Value("isAdmin").(bool)
	if !ok || !isAdmin {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	var req struct{ Message string `json:"message"` }
	json.NewDecoder(r.Body).Decode(&req)

	db.Exec(`INSERT INTO settings (key, value) VALUES ('announcement', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, req.Message)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleAdminExportDB(w http.ResponseWriter, r *http.Request) {
	isAdmin, ok := r.Context().Value("isAdmin").(bool)
	if !ok || !isAdmin {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./quiz.db"
	}
	
	w.Header().Set("Content-Disposition", "attachment; filename=quiz_backup.sqlite")
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(w, r, dbPath)
}

func handleAdminNukeDB(w http.ResponseWriter, r *http.Request) {
	isAdmin, ok := r.Context().Value("isAdmin").(bool)
	if !ok || !isAdmin {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	db.Exec("DELETE FROM questions")
	db.Exec("DELETE FROM quizzes")
	
	json.NewEncoder(w).Encode(map[string]string{"status": "annihilated"})
}
