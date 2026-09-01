package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowed := os.Getenv("ALLOWED_ORIGIN")
		
		if allowed != "" && origin == allowed {
			return true
		}
		
		if origin != "" && r.Host != "" {
			// e.g. origin="http://localhost:5173", host="localhost:8081" => strings.Contains allows same hostname pattern
			// Better is to allow origin containing the exact same hostname
			originHost := strings.TrimPrefix(origin, "http://")
			originHost = strings.TrimPrefix(originHost, "https://")
			originHost = strings.Split(originHost, ":")[0]
			
			serverHost := strings.Split(r.Host, ":")[0]
			if originHost == serverHost {
				return true
			}
		}
		// Fallback for isolated connections without origins
		return origin == ""
	},
}

type Player struct {
	Name   string          `json:"name"`
	Conn   *websocket.Conn `json:"-"`
	Score  int             `json:"score"`
	Status string          `json:"status"` // "waiting", "finished"
}

type Room struct {
	Code    string
	QuizID  int
	Time    int // in minutes
	Host    *websocket.Conn
	Players map[string]*Player
	Mutex   sync.Mutex
}

type RoomManager struct {
	rooms map[string]*Room
	mutex sync.Mutex
}

var rm = &RoomManager{
	rooms: make(map[string]*Room),
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

func generateCode() string {
	var letters = []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, 6)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func getActiveRoomCount() int {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	return len(rm.rooms)
}

// POST /api/rooms
func handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	var req struct {
		QuizID int `json:"quiz_id"`
		Time   int `json:"time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	code := generateCode()

	rm.mutex.Lock()
	rm.rooms[code] = &Room{
		Code:    code,
		QuizID:  req.QuizID,
		Time:    req.Time,
		Players: make(map[string]*Player),
	}
	rm.mutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"code": code})
}

// WS /ws/host/{code}
func handleHostWS(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]

	rm.mutex.Lock()
	room, exists := rm.rooms[code]
	rm.mutex.Unlock()

	if !exists {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS Upgrade Error:", err)
		return
	}
	defer conn.Close()

	room.Mutex.Lock()
	room.Host = conn
	room.Mutex.Unlock()

	conn.WriteJSON(map[string]interface{}{
		"type":    "ROOM_META",
		"quiz_id": room.QuizID,
		"time":    room.Time,
	})

	fmt.Println("Host connected to room:", code)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()

	// Send initial players list just in case
	room.Mutex.Lock()
	var initialPlayers []Player
	for _, p := range room.Players {
		initialPlayers = append(initialPlayers, *p)
	}
	room.Mutex.Unlock()

	if len(initialPlayers) > 0 {
		conn.WriteJSON(map[string]interface{}{
			"type":    "PLAYERS_UPDATE",
			"players": initialPlayers,
		})
	}

	// Read loop for host commands
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			break // connection lost
		}

		if action, ok := msg["action"].(string); ok {
			room.Mutex.Lock()
			if action == "START" {
				// Broadcast start to all players
				for _, p := range room.Players {
					if p.Conn != nil {
						p.Conn.WriteJSON(map[string]interface{}{
							"type":    "START",
							"quiz_id": room.QuizID,
							"time":    room.Time,
						})
					}
				}
			}
			if action == "KICK_ALL" {
				for _, p := range room.Players {
					if p.Conn != nil {
						p.Conn.Close()
					}
				}
			}
			if action == "KICK" {
				if targetName, ok := msg["name"].(string); ok {
					if p, exists := room.Players[targetName]; exists {
						if p.Conn != nil {
							p.Conn.Close()
						}
						delete(room.Players, targetName)
						
						var updatePlayers []Player
						for _, pl := range room.Players {
							updatePlayers = append(updatePlayers, *pl)
						}
						updateMsg := map[string]interface{}{
							"type":    "PLAYERS_UPDATE",
							"players": updatePlayers,
						}
						if room.Host != nil {
							room.Host.WriteJSON(updateMsg)
						}
						for _, pl := range room.Players {
							if pl.Conn != nil {
								pl.Conn.WriteJSON(updateMsg)
							}
						}
					}
				}
			}
			room.Mutex.Unlock()
		}
	}

	// Host disconnected
	room.Mutex.Lock()
	room.Host = nil
	room.Mutex.Unlock()
}

// WS /ws/join/{code}?name=XYZ
func handleJoinWS(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]
	name := r.URL.Query().Get("name")

	if name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	rm.mutex.Lock()
	room, exists := rm.rooms[code]
	rm.mutex.Unlock()

	if !exists {
		http.Error(w, "Room not found or host disconnected", http.StatusNotFound)
		return
	}

	room.Mutex.Lock()
	if existingPlayer, exists := room.Players[name]; exists && existingPlayer.Conn != nil && existingPlayer.Status != "finished" {
		room.Mutex.Unlock()
		http.Error(w, "Name already taken in this room", http.StatusConflict)
		return
	}
	room.Mutex.Unlock()

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS Upgrade Error:", err)
		return
	}
	defer conn.Close()

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()

	room.Mutex.Lock()
	
	if existingPlayer, exists := room.Players[name]; exists {
		if existingPlayer.Status == "finished" {
			existingPlayer.Conn = conn
			conn.WriteJSON(map[string]interface{}{
				"type": "ALREADY_FINISHED",
				"score": existingPlayer.Score,
			})
		} else {
			// Legitimate reconnection of an unfinished player
			existingPlayer.Conn = conn
		}
	} else {
		// Register fresh session
		player := &Player{
			Name:   name,
			Conn:   conn,
			Score:  0,
			Status: "playing",
		}
		room.Players[name] = player
	}
	// Notify host and all players
	var allPlayers []Player
	for _, p := range room.Players {
		allPlayers = append(allPlayers, *p)
	}
	updateMsg := map[string]interface{}{
		"type":    "PLAYERS_UPDATE",
		"players": allPlayers,
	}
	if room.Host != nil {
		room.Host.WriteJSON(updateMsg)
	}
	for _, p := range room.Players {
		if p.Conn != nil {
			p.Conn.WriteJSON(updateMsg)
		}
	}
	room.Mutex.Unlock()

	// Wait for commands from player (like SCORE update)
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		if action, ok := msg["action"].(string); ok {
			if action == "FINISH" {
				score := int(msg["score"].(float64))
				room.Mutex.Lock()
				if p, ok := room.Players[name]; ok {
					p.Score = score
					p.Status = "finished"
				}

				// Broadcast to host and all players
				var updatePlayers []Player
				for _, p := range room.Players {
					updatePlayers = append(updatePlayers, *p)
				}
				updateMsg := map[string]interface{}{
					"type":    "PLAYERS_UPDATE",
					"players": updatePlayers,
				}
				if room.Host != nil {
					room.Host.WriteJSON(updateMsg)
				}
				for _, p := range room.Players {
					if p.Conn != nil {
						p.Conn.WriteJSON(updateMsg)
					}
				}
				room.Mutex.Unlock()
			}
		}
	}

	// Cleanup on leave
	room.Mutex.Lock()
	if room.Players[name] != nil && room.Players[name].Conn == conn {
		if room.Players[name].Status == "finished" {
			room.Players[name].Conn = nil
		} else {
			delete(room.Players, name)
		}
	}
	var finalPlayers []Player
	for _, p := range room.Players {
		finalPlayers = append(finalPlayers, *p)
	}
	finalMsg := map[string]interface{}{
		"type":    "PLAYERS_UPDATE",
		"players": finalPlayers,
	}
	if room.Host != nil {
		room.Host.WriteJSON(finalMsg)
	}
	for _, p := range room.Players {
		if p.Conn != nil {
			p.Conn.WriteJSON(finalMsg)
		}
	}
	room.Mutex.Unlock()
}
