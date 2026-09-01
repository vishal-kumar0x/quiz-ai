package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// Setup an in-memory SQLite database for testing
	os.Setenv("DB_PATH", ":memory:")
	initDB()

	code := m.Run()

	if db != nil {
		db.Close()
	}
	os.Exit(code)
}

func TestGetLibrary(t *testing.T) {
	req, err := http.NewRequest("GET", "/api/library", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(handleGetLibrary)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
}
