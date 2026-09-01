package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

// SPA Handler
type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Clean the path to prevent directory traversal
	cleanedPath := filepath.Clean(r.URL.Path)

	// Join the base static directory with the requested file path
	fullPath := filepath.Join(h.staticPath, cleanedPath)

	// Check if the file exists and is not a directory
	info, err := os.Stat(fullPath)
	if os.IsNotExist(err) || (err == nil && info.IsDir()) {
		// If file doesn't exist or is a directory (like "/"), serve the SPA index.html
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Serve the requested static file
	http.ServeFile(w, r, fullPath)
}

func main() {
	initDB()

	_ = godotenv.Load("../.env")
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: GEMINI_API_KEY environment variable not set. Generation will fail.")
	}

	r := mux.NewRouter()

	r.HandleFunc("/api/auth/login", rateLimitMiddleware(handleLogin)).Methods("POST")

	r.HandleFunc("/api/generate", rateLimitMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleGenerate(w, r, apiKey)
	}))).Methods("POST")

	r.HandleFunc("/api/library", authMiddleware(handleGetLibrary)).Methods("GET")
	r.HandleFunc("/api/library/{id}", handleGetQuiz).Methods("GET")
	r.HandleFunc("/api/library/{id}", authMiddleware(handleDeleteQuiz)).Methods("DELETE")
	r.HandleFunc("/api/library/{id}/tags", authMiddleware(handleUpdateTags)).Methods("PUT")

	r.HandleFunc("/api/announcement", handleGetAnnouncement).Methods("GET")
	r.HandleFunc("/api/admin/stats", authMiddleware(handleAdminStats)).Methods("GET")
	r.HandleFunc("/api/admin/announcement", authMiddleware(handleAdminAnnouncement)).Methods("POST")
	r.HandleFunc("/api/admin/system/nuke", authMiddleware(handleAdminNukeDB)).Methods("DELETE")
	r.HandleFunc("/api/admin/system/export", authMiddleware(handleAdminExportDB)).Methods("GET")

	// Multiplayer Endpoints
	r.HandleFunc("/api/rooms", authMiddleware(handleCreateRoom)).Methods("POST")
	r.HandleFunc("/ws/host/{code}", handleHostWS).Methods("GET")
	r.HandleFunc("/ws/join/{code}", handleJoinWS).Methods("GET")

	// Serve React Frontend
	spa := spaHandler{staticPath: "../frontend/dist", indexPath: "index.html"}
	r.PathPrefix("/").Handler(spa)

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	handler := c.Handler(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	fmt.Printf("Backend HTTP and Static SPA starting on port %s...\n", port)

	// Print local IP addresses to make it easier for mobile devices to connect
	fmt.Printf("========================================================\n")
	fmt.Printf("  Access your platform on other devices using:\n")
	if addrs, err := net.InterfaceAddrs(); err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
				fmt.Printf("  ➜ http://%s:%s\n", ipnet.IP.String(), port)
			}
		}
	}
	fmt.Printf("========================================================\n")

	// Run server in a goroutine so that it doesn't block.
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	if db != nil {
		db.Close()
	}

	log.Println("Server exiting gracefully")
}
