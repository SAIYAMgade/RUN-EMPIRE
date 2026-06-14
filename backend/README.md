# Run Empire - Backend

This is the Express + Socket.io backend server for the Run Empire territory control game.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure local environment variables in `.env`:
   ```env
   PORT=3001
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:3000
   ```
3. Seed the Delhi NCR map grid:
   ```bash
   npm run seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

For full environment configuration and architecture highlights, refer to the root [README.md](../README.md).
