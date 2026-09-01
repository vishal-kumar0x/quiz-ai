package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtKey = []byte(getJWTSecret())

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "fallback_secret_for_dev_only"
	}
	return secret
}

type Claims struct {
	Email   string `json:"email"`
	IsAdmin bool   `json:"isAdmin"`
	jwt.RegisteredClaims
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized session.", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "email", claims.Email)
		ctx = context.WithValue(ctx, "isAdmin", claims.IsAdmin)
		next(w, r.WithContext(ctx))
	}
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Payload", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(req.Email)

	isAdmin := strings.EqualFold(email, strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	role := "user"
	if isAdmin {
		role = "admin"
	}

	now := time.Now()
	_, err := db.Exec(`
		INSERT INTO users (email, role, joined_at, last_login) VALUES (?, ?, ?, ?)
		ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login`,
		email, role, now, now)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	expirationTime := time.Now().Add(24 * 7 * time.Hour)
	claims := &Claims{
		Email:   email,
		IsAdmin: isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	userMap := map[string]interface{}{
		"email":   email,
		"isAdmin": isAdmin,
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"token":  tokenString,
		"user":   userMap,
	})
}
