package main

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// Rate Limiter
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var visitors = make(map[string]*visitor)
var mu sync.Mutex

func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists {
		// 10 requests per hour burstable to 10
		limiter := rate.NewLimiter(rate.Every(time.Hour/10), 10)
		visitors[ip] = &visitor{limiter, time.Now()}
		return limiter
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := strings.Split(r.RemoteAddr, ":")[0]
		limiter := getVisitor(ip)
		if !limiter.Allow() {
			http.Error(w, "Rate limit exceeded (Max 10 per hour). Please wait.", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}
