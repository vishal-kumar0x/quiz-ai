# 🚀 AI Multiplayer Quiz Platform

Welcome to the **AI Multiplayer Quiz Platform**, a full-stack production-ready application that leverages Google's Gemini AI to instantly generate high-quality quizzes on any topic. Not only can you test your own knowledge, but you can also host **real-time multiplayer quiz rooms** where your friends or students can join on their own devices and compete on a live glowing Leaderboard!

---

## ✨ Features
1. **AI Quiz Generation**: Type any topic (e.g., "Quantum Physics" or "Taylor Swift") and the powerful Gemini AI model will instantly craft a comprehensive multiple-choice test.
2. **Persistent Library**: All your generated quizzes are saved to a durable SQLite database so you can revisit, edit, or delete them anytime.
3. **Real-Time Multiplayer API**: Host live rooms! Participants can join using a 6-character room code.
4. **Live Leaderboard**: The Host's lobby transforms into an animated glowing podium (🥇🥈🥉) as participants submit their final answers.
5. **Security First**: The platform features a customized Token-Bucket Rate Limiter to prevent AI quota spam, dynamic WebSocket Origin checking against Cross-Site hijacking, and single-port deployment configurations.

---

## 🛠 Prerequisites
Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Go](https://golang.org/) (v1.22+ recommended)
- A **Google Gemini API Key**. You can get one for free from Google AI Studio.

---

## 👑 Administrator God-Mode

To oversee the platform, evaluate active multiplayer rooms, and manage users, you can access the Super-Admin Dashboard:
1. Open the `.env` file in the root directory.
2. Set your email in `ADMIN_EMAIL` (e.g., `ADMIN_EMAIL=teacher@school.edu`).
3. Log in to the platform with that exact email address. A golden `👑 Admin` button will automatically appear in your navigation bar!

---
## 💻 Local Setup & Testing

### 1. Configure the Environment
1. In the root directory of the project, rename the `.env.example` file to `.env`.
2. Open the `.env` file and paste your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 2. The 1-Click Runner (Windows)
To quickly test the production-ready build of the platform on your local machine, simply double-click the included batch file:
* **`start_prod.bat`**: This file automatically compiles the React code natively via Vite, kicks off the Go background server, links your database, and pops open your web browser to `http://localhost:8081`.

*(Note: If you are editing the React layout and want Hot Module Replacement, use `start.bat` instead, which runs the backend alongside a Vite auto-reload dev server).*

---

## 🎮 How to Play

### 1. Generate a Quiz
1. From the Homepage, click **Create Quiz**.
2. Enter your desired **Topic** and **Difficulty**.
3. Once generated, your quiz will automatically save to your personalized Library.

### 2. Host a Multiplayer Match
1. Open up your **Library**.
2. Click the gear (`Settings`) icon on any quiz card.
3. Choose the **Host Multiplayer** mode and click **Create Room**.
4. The screen will give you a giant **6-character Room Code**. Tell your friends this code!

### 3. Join on Candidate Devices
1. On your phone (or a friend's browser), navigate to the `/join` page (ensure everyone is on the same local network by putting your computer's IP address into their browser URL, e.g., `http://192.168.1.15:8081/join`).
2. Have them enter their Name and the Room Code.
3. As the Host, once you see their names pop into the Lobby, click **Start Game**!

### 4. The Live Leaderboard
As your friends finish the exam and lock in their answers, look at the Host screen. Instead of generic text, their cards will immediately snap to the Leaderboard accompanied by glowing Golden, Silver, or Bronze medals depending on their overall score!

## 🔒 Important Security Notice (API Keys)

If you intend to upload this project to a public GitHub repository, **NEVER** commit your `GEMINI_API_KEY`. 
The repository is already configured with a `.gitignore` file that prevents `.env` and SQLite databases from being uploaded. 
When another user clones this repository, they should:
1. Copy `.env.example` to `.env`.
2. Generate their own free Gemini API Key from Google AI Studio.
3. Paste their key into the `.env` file.
This ensures the system remains fully functional for anyone who downloads it, while completely protecting your personal API quotas from being exposed or abused!
