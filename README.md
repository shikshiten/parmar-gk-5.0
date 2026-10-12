# 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Web Portal

> **Subject:** Indian Polity & General Knowledge  
> **Course Provider:** **Study Mafia**  
> **Target Exams:** SSC CGL / CHSL / CPO / MTS / Railways 2026-2027  
> **Streaming:** High-Speed Smart Proxy Stream Embed  
> **PWA Support:** Full Progressive Web App (Offline Caching + Add to Home Screen)

---

## 🌟 Key Features

1. **Smart Proxy Video Streaming:**
   - Lectures are embedded using smart proxy stream endpoints (`fs1enchanted-flower-68930222-873172716e82.herokuapp.com`).
   - Dual-engine cinema player:
     - **Smart Proxy Stream Embed:** Direct responsive iframe player with instant buffer, resume playback, and orientation management.
     - **Cinema HTML5 Player:** Custom playback speeds (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`), `±10s` seeking, and auto-advance to next lecture.
     - **Mobile App Stream Intents:** One-click links to stream in **VLC Media Player** (`vlc://`) or **MX Player** on Android.
     - Direct high-speed download button.

2. **Full Responsive Design (Mobile & Laptop Friendly):**
   - **Yellow & Black Theme:** Deep cyber black backgrounds with electric amber/yellow accents, glowing borders, and glassmorphic cards.
   - **Mobile UX:** Sticky header, bottom navigation bar (Lectures, Player, Quizzes, Notes), touch-friendly targets, and swipe-ready cards.
   - **Laptop UX:** Wide hero dashboard, lecture progression statistics, split cinema mode, keyboard shortcuts (`ArrowLeft`/`ArrowRight`, `Escape`).

3. **Progressive Web App (PWA):**
   - Installable on Android, iOS, Windows, macOS, and ChromeOS.
   - Offline app shell caching with `sw.js` and `manifest.json`.
   - Dedicated "📲 Install App" prompt button with beforeinstallprompt integration.

4. **Structured Course Content (22 Resources across 6 Modules):**
   - **Lecture 1:** Making of Constitution (Video + 3 PDFs + Quiz)
   - **Lecture 2:** Salient Features of Constitution (Video + 2 PDFs + Quiz)
   - **Lecture 3:** Preamble of Constitution (Video + PDF + Quiz)
   - **Lecture 4:** Part 1 & 2 of Constitution (Video + 2 PDF Notes + Quiz)
   - **Lecture 5:** Part 2 Constitution - Citizenship (Video + 2 PDF Notes + Quiz)
   - **Lecture 6:** Fundamental Rights (Video + Class PDF Vivid)

5. **Student Tools:**
   - **Progress Tracker:** Check off completed lectures and track percentage completion auto-saved to `localStorage`.
   - **Interactive PDF Viewer:** In-app viewer with direct download option.
   - **Chapter Quiz Runner:** In-app quiz test runner with download option.
   - **Study Notepad:** Built-in markdown notepad that auto-saves revision points with a 1-click export button (`.md`).
   - **Real-Time Search & Filters:** Filter by Videos, PDFs, Quizzes, Completed, or search any keyword.

---

## 🚀 How to Run Locally

### Option 1: Double Click (Windows)
Double click `start-server.bat`. It will start the server and open `http://localhost:8080` in your default browser.

### Option 2: Command Line
```powershell
python -m http.server 8080
```
Open `http://localhost:8080` in any browser.

---

## 📁 File Structure

```
├── index.html                   # Main Responsive SPA Application Shell
├── manifest.json                # PWA Web App Manifest
├── sw.js                        # PWA Service Worker for offline caching
├── start-server.bat             # 1-click Windows launcher
├── css/
│   └── style.css                # Yellow & Black responsive stylesheet
├── js/
│   └── app.js                   # Application logic, player engine & PWA events
├── data/
│   ├── course-data.js           # Structured course database for web client
│   └── course-data.json         # Raw JSON course database
└── assets/
    ├── course-thumbnail.jpg     # High-res batch thumbnail (434 KB)
    └── icons/                   # PWA Icons (192x192, 512x512, maskable, apple-touch)
```
