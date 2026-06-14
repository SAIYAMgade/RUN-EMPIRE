# Run Empire

A real-time multiplayer territory control game mapped over Delhi NCR. Players claim grid cells (tiles) on an interactive map in real-time, view live activity updates, and compete on a global leaderboard.

*   **Frontend:** [https://run-empire.vercel.app](https://run-empire.vercel.app)
*   **Backend:** [https://run-empire-backend.onrender.com](https://run-empire-backend.onrender.com)

---

## Tech Stack

*   **Frontend:** Next.js (App Router), TailwindCSS, Leaflet.js, Zustand (state management), Socket.io-client.
*   **Backend:** Node.js, Express, TypeScript, Socket.io (with Valkey adapter for sync).
*   **Database & Cache:** Neon PostgreSQL (persistent storage), Aiven Valkey / Redis 9 (real-time tile cache, active locks, rate limiting).

---

## Local Development

### 1. Prerequisites

Make sure you have Node.js (v18+) and PostgreSQL/Redis running locally, or use Docker.

### 2. Database Setup

Create a PostgreSQL database and run the schema setup.

### 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` folder:
   ```env
   PORT=3001
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:3000
   ```
4. Run the grid seeder (populates coordinates for Delhi NCR):
   ```bash
   npm run seed
   ```
5. Start in development mode:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` folder:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture Highlights

*   **Real-time sync:** Socket.io adapter handles state sync. If backend instances scale, Valkey handles server-to-server pub/sub.
*   **PBKDF2 Hashing:** Authentication is secured using native Node.js `crypto` module (PBKDF2-SHA512) to avoid Windows binary issues common with bcrypt.
*   **Valkey Cache:** Tile map states are kept in memory for instant delivery to new clients. Claims are rate-limited at 3 claims/sec to prevent spam.
