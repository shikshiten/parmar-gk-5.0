# 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯

> **The all-in-one high-performance learning ecosystem for SSC CGL, CHSL, CPO, MTS & Competitive Exam aspirants.**  
> High-speed smart proxy video streaming · Direct lossless PDF notes · Cloud community sync · Zero ads — engineered for students.  
> **Course Provided by: Study Mafia**

---

## Features

| Feature | Description |
| :--- | :--- |
| **Study Dashboard** | Dynamic batch progress tracker, percentage completion metrics, and last-watched lecture memory in `localStorage`. |
| **Structured Polity Curriculum** | Centralized 6-module curriculum covering Indian Polity with 22 organized academic assets (Videos, Notes & Quizzes). |
| **Cinema HTML5 Video Engine** | Pure native video player with true 16:9 cinema ratio, zero clipping, custom playback controls, and native fullscreen. |
| **Smart Proxy Streaming Pipeline** | Direct streaming powered by high-speed proxy endpoints with HTTP Range request support (`bytes=0-`). |
| **Granular Speed Regulation** | Instant playback speed regulation from `0.75x` to `2.0x` (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) with single-click buttons. |
| **Direct Lossless PDF Downloader** | One-click direct PDF downloads bypassing stream lag with native `Content-Disposition` attachment headers. |
| **Interactive Practice Quizzes** | Chapter-wise test modules and revision quizzes linked directly to each lecture for active recall. |
| **WhatsApp Community Hub** | Dynamic on-visit invitation modal connecting students to the official Study Mafia WhatsApp Channel. |
| **Progressive Web App (PWA)** | Installable on Android, iOS, Windows and macOS with Service Worker v2 offline app shell caching. |
| **Mobile-First Touch Ergonomics** | Pinned header, edge-to-edge overflow protection, touch-friendly tap targets, and clean SVG iconography. |
| **Cyber Yellow & Black Aesthetic** | High-contrast visual identity (`#FFC800` & `#0A0A0C`) with custom golden "P" monogram branding. |
| **Zero-Egress Cloudflare Pages** | 100% free serverless edge hosting with customized `_headers` cache rules and `_redirects` SPA fallback. |

---

## Academic Curriculum Tree View

𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 organizes Indian Polity curriculum into structured, sequential modules:

```text
𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 (Indian Polity & General Knowledge)
├── Lecture 01: Making of Constitution
│   ├── Video: Making of Constitution (1080p Smart Stream)
│   ├── Notes: Lecture 1 Complete Class Notes (PDF Download)
│   ├── Notes: Making of Constitution Additional Hand-written Notes (PDF Download)
│   ├── Notes: Making of Constitution Vivid Revision Sheet (PDF Download)
│   └── Practice: Chapter 01 MCQ Quiz Test (Interactive / Download)
├── Lecture 02: Salient Features of Constitution
│   ├── Video: Salient Features of Constitution (1080p Smart Stream)
│   ├── Notes: Salient Features Class Notes (PDF Download)
│   ├── Notes: Salient Features Vivid Notes (PDF Download)
│   └── Practice: Chapter 02 MCQ Quiz Test (Interactive / Download)
├── Lecture 03: Preamble of Constitution
│   ├── Video: Preamble of Constitution (1080p Smart Stream)
│   ├── Notes: Preamble Complete Class Notes (PDF Download)
│   └── Practice: Chapter 03 MCQ Quiz Test (Interactive / Download)
├── Lecture 04: Part 1 & 2 of Constitution
│   ├── Video: Part 1 & 2 of Constitution (1080p Smart Stream)
│   ├── Notes: Union & its Territory Class Notes (PDF Download)
│   ├── Notes: Citizenship Part 2 Class Notes (PDF Download)
│   └── Practice: Chapter 04 MCQ Quiz Test (Interactive / Download)
├── Lecture 05: Part 2 Constitution - Citizenship
│   ├── Video: Citizenship In-Depth Analysis (1080p Smart Stream)
│   ├── Notes: Citizenship Detailed Class Notes (PDF Download)
│   ├── Notes: Citizenship Vivid Revision Sheet (PDF Download)
│   └── Practice: Chapter 05 MCQ Quiz Test (Interactive / Download)
└── Lecture 06: Fundamental Rights (Part III)
    ├── Video: Fundamental Rights Comprehensive Lecture (1080p Smart Stream)
    └── Notes: Fundamental Rights Class Notes Vivid Edition (PDF Download)
```

---

## Core Engineering Breakdown

### 1. High-Speed Smart Proxy Video Streaming Pipeline
- **Direct Edge Proxy Stream:** Lectures stream through high-speed edge proxies (`https://fs1enchanted-flower-68930222-873172716e82.herokuapp.com/dl/{fileId}`) supporting chunked HTTP range headers (`bytes=0-`).
- **Cinema HTML5 Engine:** Eliminates laggy third-party iframe players in favor of a native, lightweight HTML5 video element with custom hardware-accelerated playback.
- **Speed Bridge:** Instant playback adjustment between `0.75x`, `1.0x`, `1.25x`, `1.5x`, and `2.0x` without audio pitch distortion.
- **Seeking Controls:** Quick forward (`+10s`) and rewind (`-10s`) buttons for efficient lecture note-taking.

### 2. Direct Lossless PDF Notes Engine
- **Direct Attachment Downloads:** PDF notes trigger instant direct file downloads (`Content-Disposition: attachment`), completely removing in-browser PDF rendering freezes and memory leaks.
- **Resource Categorization:** Material is clearly labeled as Class Notes, Vivid Revision Sheets, or Hand-written Notes for quick access.

### 3. Layered Mobile & Touch Ergonomics
- **No Edge Clipping:** Built with strict CSS box-sizing constraints, responsive fluid typography (`clamp()`), and safe viewport padding to prevent horizontal scrolling on small screens.
- **16:9 Cinema Container:** Aspect-ratio locked video viewport maintains proper dimensions across phones, tablets, and 4K displays.
- **Clean Vector Iconography:** Professional SVG vector icons replace emojis across all interface buttons for an uncluttered look.

### 4. Progressive Web App (PWA) & Offline Sync
- **Service Worker (`sw.js` v2):** Implements a stale-while-revalidate strategy for the app shell (`index.html`, `css/style.css`, `js/app.js`, `course-data.js`, icons, and fonts).
- **Web App Manifest (`manifest.json`):** Full standalone display support, custom theme color (`#FFC800`), and quick-launch shortcuts.
- **Install Prompt Integration:** Intercepts browser installation events to provide an accessible "Install App" button in the navigation header.

### 5. Cloudflare Pages & Zero-Egress Architecture
- **Global Edge Delivery:** Hosted directly on Cloudflare Pages edge network with 0 egress bandwidth fees.
- **Engineered Headers (`_headers`):**
  - Instant revalidation (`max-age=0, must-revalidate`) for `sw.js` and `manifest.json`.
  - Immutable 7-day browser caching for images, logos, and fonts.
  - Strict security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **SPA Fallback Routing (`_redirects`):** Maps `/*` to `/index.html` with HTTP 200 for clean client-side routing.

### 6. WhatsApp Community Integration
- **First-Visit Modal:** Clean pop-up invites students to join the official **Study Mafia WhatsApp Channel** (`https://whatsapp.com/channel/0029VbCVJm130LKUjYzt3k22`).
- **Two-Row Action Buttons:**
  - Row 1: **Join Channel** (Opens channel in new tab and stores dismissal)
  - Row 2: **Already Joined** (Dismisses popup for the session)

---

## System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Student Browser / Mobile PWA             │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (HTTP/2, HTTP/3)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Cloudflare Pages Edge Network             │
│   - _headers: Security, CORS & Static Cache Rules      │
│   - _redirects: Single-Page Application (SPA) Fallback │
│   - Zero Egress Bandwidth & 100% Free Edge Hosting     │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│     Client App Shell      │ │    Static Course Data    │
│  - Cinema HTML5 Player    │ │  - data/course-data.js   │
│  - Service Worker (sw.js) │ │  - data/course-data.json │
│  - localStorage Progress  │ │  - 22 Academic Resources │
│  - Responsive Yellow/Dark │ │  - 6 Indian Polity Modules│
└─────────────┬─────────────┘ └────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌────────────────────────────────────────────────────────┐
│               External Streaming & Media CDNs          │
│   - Heroku Smart Proxy (fs1enchanted-flower)           │
│   - Imgtree HD Batch Thumbnail Host                    │
│   - Study Mafia Official WhatsApp Channel Hub          │
└────────────────────────────────────────────────────────┘
```

---

## Video Player Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause video | Cinema Player |
| <kbd>→</kbd> / <kbd>L</kbd> | Seek Forward 10 seconds | Cinema Player |
| <kbd>←</kbd> / <kbd>J</kbd> | Seek Backward 10 seconds | Cinema Player |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Increase / Decrease volume | Cinema Player |
| <kbd>F</kbd> | Toggle Fullscreen mode | Cinema Player |
| <kbd>M</kbd> | Mute / Unmute audio | Cinema Player |
| <kbd>0</kbd> – <kbd>9</kbd> | Jump to 0% – 90% timeline | Cinema Player |
| <kbd>Esc</kbd> | Close active modal / Exit fullscreen | Global |

---

## Tech Stack Spec

- **Frontend Core:** Pure Vanilla JavaScript (ES2022+), HTML5, CSS3 Custom Properties
- **Application Model:** Single-Page Architecture (SPA) with zero external build dependencies
- **Video Pipeline:** Native HTML5 `<video>` engine with smart proxy stream resolution
- **Offline / PWA:** Service Worker API (`CacheStorage`), Web App Manifest
- **State & Sync:** `localStorage` API for lecture progress and session states
- **Styling & Design:** Custom CSS3 Tokens, CSS Grid, Flexbox, Glassmorphism
- **Typography:** Google Fonts Outfit (`wght@400..900`)
- **Branding Assets:** Bespoke Golden "P" Monogram Logo (`assets/logo.png`, `favicon.png`)
- **Hosting & CI/CD:** Cloudflare Pages + GitHub (`shikshiten/parmar-gk-5.0`)

---

## Project Structure

```text
parmar-5.0/
├── .assetsignore                # Asset exclusions (ignores node_modules, git, configs)
├── package.json                 # Worker deployment scripts & dependencies
├── push-to-github.bat           # 1-click Windows Git push script with MinGit
├── README.md                    # System architecture documentation
├── start-server.bat             # 1-click local development HTTP server launcher
├── wrangler.toml                # Cloudflare Workers Static Assets & SPA configuration
└── public/                      # Static asset directory served by Cloudflare
    ├── _headers                 # Cloudflare edge cache & security headers
    ├── favicon.png              # Browser tab favicon (Golden "P" monogram)
    ├── index.html               # Main dashboard, cinema stage & modal orchestration
    ├── manifest.json            # PWA manifest specification & install shortcuts
    ├── sw.js                    # Service Worker v2 for offline app shell caching
    ├── assets/
    │   ├── course-thumbnail.jpg # Fallback offline course thumbnail
    │   ├── logo.png             # 512x512 HD golden "P" monogram logo
    │   └── icons/               # PWA icons (192, 512, maskable, apple-touch)
    ├── css/
    │   └── style.css            # Design tokens, cyber yellow palette & responsive rules
    ├── data/
    │   ├── course-data.js       # ES module dataset (6 lectures, 22 resources)
    │   └── course-data.json     # Raw JSON course catalog data
    └── js/
        └── app.js               # Player controllers, progress tracking & modals
```

---

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/shikshiten/parmar-gk-5.0.git
cd parmar-gk-5.0
```

### 2. Run Locally
Because this project is a pure, high-performance static web application, no compilation or `npm install` is required:

**Using Python:**
```bash
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

**Using Windows 1-Click Launcher:**
Double-click `start-server.bat` in the project root folder.

---

## Deploy to Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the repository: `shikshiten/parmar-gk-5.0`.
4. Configure build settings:
   - **Framework preset:** `None`
   - **Build command:** *(Leave empty)*
   - **Build output directory:** `.` *(or root directory)*
5. Click **Save and Deploy**.
6. Cloudflare Pages automatically detects `_headers` and `_redirects` to configure edge caching and SPA routing.

---

## 1-Click Push to GitHub

For Windows users using MinGit:
Double-click **`push-to-github.bat`** in the project folder to push commits directly to the remote repository on GitHub:
```cmd
git push -u origin main
```

---

## Community & Attribution

- **Batch:** 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯
- **Course Provider:** **Study Mafia**
- **Official WhatsApp Channel:** [Join Channel](https://whatsapp.com/channel/0029VbCVJm130LKUjYzt3k22)
- Built with precision for competitive examination aspirants.
