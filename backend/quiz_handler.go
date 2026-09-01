package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"

	"github.com/google/generative-ai-go/genai"
	"github.com/gorilla/mux"
	"google.golang.org/api/option"
)

// Generate Questions and optionally save to Library
func handleGenerate(w http.ResponseWriter, r *http.Request, apiKey string) {
	var req Quiz
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		http.Error(w, "Failed to create AI client", http.StatusInternalServerError)
		return
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-3-flash-preview")
	model.ResponseMIMEType = "application/json"

	model.SafetySettings = []*genai.SafetySetting{
		{
			Category:  genai.HarmCategoryHarassment,
			Threshold: genai.HarmBlockMediumAndAbove,
		},
		{
			Category:  genai.HarmCategoryHateSpeech,
			Threshold: genai.HarmBlockMediumAndAbove,
		},
		{
			Category:  genai.HarmCategorySexuallyExplicit,
			Threshold: genai.HarmBlockMediumAndAbove,
		},
		{
			Category:  genai.HarmCategoryDangerousContent,
			Threshold: genai.HarmBlockMediumAndAbove,
		},
	}

	prompt := fmt.Sprintf(`
		You are an expert exam setter. Create a practice test based on the following requirements:
		Topic: %s
		Difficulty Level: %s
		Number of Questions: %d
		Additional Context: %s

		Output Requirements:
		1. Return ONLY a JSON array of objects.
		2. Format: [{"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}]
	`, req.Topic, req.Level, req.Count, req.Description)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("Gemini API Error: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to generate content from AI: %v", err), http.StatusInternalServerError)
		return
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		http.Error(w, "No content generated", http.StatusInternalServerError)
		return
	}

	var rawJSON string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			rawJSON += string(txt)
		}
	}

	// Robust JSON Extraction (Issue #5 Fix)
	re := regexp.MustCompile(`(?s)\[.*\]`)
	match := re.FindString(rawJSON)
	if match == "" {
		log.Printf("Failed to extract JSON array from AI response: %s", rawJSON)
		http.Error(w, "AI returned invalid format", http.StatusInternalServerError)
		return
	}

	var mcqs []MCQ
	if err := json.Unmarshal([]byte(match), &mcqs); err != nil {
		log.Printf("Failed to parse AI response: %s\nError: %v", match, err)
		http.Error(w, "Failed to parse AI response", http.StatusInternalServerError)
		return
	}

	// Save to database
	res, err := db.Exec("INSERT INTO quizzes (topic, tags, level, count, description) VALUES (?, ?, ?, ?, ?)", req.Topic, req.Tags, req.Level, len(mcqs), req.Description)
	if err != nil {
		http.Error(w, "Failed to save quiz", http.StatusInternalServerError)
		return
	}
	quizID, _ := res.LastInsertId()

	for _, mcq := range mcqs {
		optionsJSON, _ := json.Marshal(mcq.Options)
		db.Exec("INSERT INTO questions (quiz_id, question, options, answer, explanation) VALUES (?, ?, ?, ?, ?)",
			quizID, mcq.Question, string(optionsJSON), mcq.CorrectAnswer, mcq.Explanation)
	}

	req.ID = int(quizID)
	req.Count = len(mcqs)

	response := map[string]interface{}{
		"status": "success",
		"quiz":   req,
		"data":   mcqs,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleGetLibrary(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	rows, err := db.Query("SELECT id, topic, tags, level, count, description FROM quizzes ORDER BY id DESC LIMIT ?", limit)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var quizzes []Quiz
	for rows.Next() {
		var q Quiz
		var tags sql.NullString
		if err := rows.Scan(&q.ID, &q.Topic, &tags, &q.Level, &q.Count, &q.Description); err == nil {
			if tags.Valid {
				q.Tags = tags.String
			}
			quizzes = append(quizzes, q)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(quizzes)
}

func handleGetQuiz(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	quizID := vars["id"]

	var q QuizDetail
	var tags sql.NullString
	err := db.QueryRow("SELECT id, topic, tags, level, count, description FROM quizzes WHERE id = ?", quizID).
		Scan(&q.ID, &q.Topic, &tags, &q.Level, &q.Count, &q.Description)
	if err != nil {
		http.Error(w, "Quiz not found", http.StatusNotFound)
		return
	}
	if tags.Valid {
		q.Tags = tags.String
	}

	rows, err := db.Query("SELECT question, options, answer, explanation FROM questions WHERE quiz_id = ?", quizID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var mcq MCQ
		var optionsStr string
		err := rows.Scan(&mcq.Question, &optionsStr, &mcq.CorrectAnswer, &mcq.Explanation)
		if err == nil {
			json.Unmarshal([]byte(optionsStr), &mcq.Options)
			q.Questions = append(q.Questions, mcq)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(q)
}

func handleDeleteQuiz(w http.ResponseWriter, r *http.Request) {
	isAdmin, ok := r.Context().Value("isAdmin").(bool)
	if !ok || !isAdmin {
		http.Error(w, "Forbidden: Only authorized Admin accounts can delete quizzes.", http.StatusForbidden)
		return
	}

	vars := mux.Vars(r)
	quizID := vars["id"]

	_, err := db.Exec("DELETE FROM questions WHERE quiz_id = ?", quizID)
	if err != nil {
		http.Error(w, "Failed to delete questions", http.StatusInternalServerError)
		return
	}

	res, err := db.Exec("DELETE FROM quizzes WHERE id = ?", quizID)
	if err != nil {
		http.Error(w, "Failed to delete quiz", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Quiz not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Quiz deleted"})
}

func handleUpdateTags(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	quizID := vars["id"]

	var body struct {
		Tags string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	res, err := db.Exec("UPDATE quizzes SET tags = ? WHERE id = ?", body.Tags, quizID)
	if err != nil {
		http.Error(w, "Failed to update tags", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Quiz not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Tags updated successfully"})
}
