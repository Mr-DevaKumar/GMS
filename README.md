# 🏆 Contest Hub

A high-performance, offline-ready, mobile-first web application designed to manage multi-game tournaments, track winners in real-time, and handle prize redemptions with zero friction. Built with a custom "Nothing OS" inspired user interface.

## 📖 Overview

Contest Hub solves the logistical nightmare of running a live event with multiple game stations. It provides coordinators with a lightning-fast mobile interface to record winners (even without internet), while giving admins a powerful command center to monitor the event live and manage prize distribution.

### The Problems it Solves

| Challenge | Solution |
|-----------|----------|
| **Identical Tokens** | Contest Hub acts as the digital ledger of truth, tying every token to a specific game and player. |
| **Group Collusion** | By binding wins to a player's identity (Name + Age + Anbiyam) and allowing admins to see distinct game counts, players cannot easily pool tokens to cheat the grand prize. |
| **Internet Drops** | Coordinators can continue recording wins offline. Data is cached in IndexedDB and synced seamlessly when the connection returns. |
| **Timer Disputes** | Server-anchored timers ensure every device shows the exact same countdown, preventing cheating and arguments. |

## ✨ Key Features

### 🛡️ Admin Command Center

- **Live Dashboard**: Real-time stats on total wins, unique players, and players close to the Grand Prize.
- **Game Management**: Create games, assign coordinators, and add/edit/remove countdown timers.
- **Prize Desk**: Instantly search players to verify eligibility. The system automatically deducts "spent" wins once a prize is claimed (General: 3 wins, Grand: 10 distinct games).
- **Winners Log**: Filter by game, name, or time. Void suspicious wins with a logged reason.
- **Anbiyam & Staff Management**: Full control over the player dropdown options and coordinator accounts.

### 📱 Coordinator App (Mobile-First)

- **PIN Authentication**: Fast, 6-10 digit PIN login (no email/password typing on mobile).
- **Offline Mode**: Record wins in airplane mode. The app queues the data and syncs perfectly when back online.
- **Smart Search**: Autocomplete player names, preventing duplicate profiles.
- **Interactive Timers**: Start, pause, and reset timers. When time is up, the app plays a pleasant audio chime and vibrates (on Android). Coordinators can also edit the timer length on the fly.
- **Undo/Correction**: Easily request corrections if a mistake is made.

### 📺 Live Display Mode

- **Projector Ready**: A beautiful, full-screen, dark-mode leaderboard to display on a projector at the venue.
- **Live Updates**: Automatically refreshes as wins are recorded.
- **Visual Progress**: Shows top players and wins per game with smooth progress bars.

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Icons & UI** | Lucide React, Custom "Nothing OS" Design System |
| **Backend / Database** | Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security) |
| **Serverless APIs** | Vercel Serverless Functions (Node.js) |
| **Offline Support** | IndexedDB (via idb) |
| **Hosting** | Vercel |

## 🚀 Getting Started

### 1. Prerequisites

- Node.js (v18 or higher)
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account

### 2. Environment Variables

Create a `.env` file in the root directory and add the following keys from your Supabase project settings (Project Settings → API):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

### 3. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Mr-DevaKumar/GMS.git
cd contest-hub
npm install
```

### 4. Database Setup (Supabase)

You must run the SQL scripts in the Supabase SQL Editor to create the necessary tables, views, and functions.

> **Note**: Refer to the `database.sql` file in the repo, or run the schema provided in the project's setup guide. This includes the `record_win`, `claim_prize`, and `timer_action` RPCs, as well as the `v_player_stats` views.

### 5. Running Locally

**To run the full stack** (Frontend + Vercel Serverless APIs for coordinator creation):

```bash
npx vercel dev
```

**To run only the frontend** (faster, but API routes won't work):

```bash
npm run dev
```

## 📂 Project Structure

```
contest-hub/
├── api/                  # Vercel Serverless Functions
│   ├── create-coordinator.ts
│   └── login-coordinator.ts
├── src/
│   ├── components/       # Reusable UI elements (Shared, AdminLayout, Timer, etc.)
│   ├── context/          # React Context (AuthProvider)
│   ├── lib/              # Supabase client, IndexedDB setup, CSV export, Sync Runner
│   ├── pages/            # Main routes
│   │   ├── admin/        # Admin Dashboard, Games, Winners, Prizes, etc.
│   │   ├── coordinator/  # Game Entry, Home
│   │   ├── Display.tsx   # Projector View
│   │   ├── Login.tsx     # Coordinator PIN login
│   │   └── AdminLogin.tsx# Admin Email/Password login
│   ├── styles/           # Tailwind and Nothing OS design tokens
│   └── types/            # TypeScript interfaces
├── .env                  # Environment variables (ignored by git)
├── vercel.json           # Vercel routing configuration
└── package.json
```

## 🎨 Design Language ("Nothing OS" Inspired)

The UI is inspired by the Nothing Phone ecosystem:

- **Monochrome**: Heavy use of black, white, and off-white (`#EEEEEB`).
- **Typography**: Dot-matrix (Doto) for numbers, Space Mono for labels, Space Grotesk for body.
- **Accents**: A single vibrant red (`#D71921`) for actions/errors, amber for warnings, and green for success.
- **Flat & Clean**: No drop shadows, ultra-rounded corners (28px+), pill-shaped buttons.

## 🚢 Deployment (Vercel)

1. Push your code to a GitHub repository.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Add the 4 Environment Variables (`VITE_SUPABASE_URL`, etc.) exactly as they appear in your `.env` file.
5. Click **Deploy**.

### ⚠️ Important Post-Deployment Step

Once your app is live, you must update your Supabase Auth settings:

1. Go to **Supabase → Authentication → URL Configuration**.
2. Change the **Site URL** to your new Vercel URL (e.g., `https://contest-hub-xyz.vercel.app`).
3. Add the Vercel URL to the **Redirect URLs** list.

## 📝 License

This project is licensed under the MIT License.

---

**Built for Mission Sunday.**
