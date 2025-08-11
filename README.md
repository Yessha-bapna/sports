# Real-Time Sports Scoring (Cricket & Badminton)

Full-stack real-time scoring module.

- Frontend: React + Vite + TypeScript + socket.io-client
- Backend: Node.js + Express + MongoDB + Socket.IO + Mongoose

## Features
- Umpire selection and management
- Create matches for Cricket or Badminton
- Dynamic scoring UI per sport
- Real-time live score updates via Socket.IO
- MongoDB persistence for umpires, matches, and scores

## Directory Structure
- `backend/` API server and Socket.IO
- `frontend/` React app

## Prerequisites
- Node.js 18+
- MongoDB Atlas connection string

This project is already configured to use:
```
MONGODB_URI=mongodb+srv://siddharamsutar23:QtnY0MLBA2jiCyYg@cluster0.raeqng9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```
Edit `backend/.env` if needed.

## Setup

### 1) Install dependencies
In two terminals:

Terminal A (backend):
```
cd backend
npm install
```

Terminal B (frontend):
```
cd frontend
npm install
```

### 2) Start servers
Terminal A (backend):
```
npm run start
```
This starts Express + Socket.IO on http://localhost:5000

Terminal B (frontend):
```
npm run dev
```
This starts Vite on http://localhost:5173

The frontend is configured to proxy `/api` to the backend during development.

## API Overview

Base URL: `http://localhost:5000/api`

- Umpires
  - `GET /umpires` — list
  - `POST /umpires` — create `{ name, email, experience, specialization: ['cricket'|'badminton'] }`
  - `GET /umpires/:id` — details
  - `PUT /umpires/:id` — update
  - `DELETE /umpires/:id` — soft delete (deactivate)

- Matches
  - `GET /matches` — list
  - `POST /matches` — create
    - Cricket: `{ matchName, sportType:'cricket', umpireId, team1, team2, totalOvers }`
    - Badminton: `{ matchName, sportType:'badminton', umpireId, player1, player2, maxSets }`
  - `GET /matches/:id` — details + score
  - `PUT /matches/:id/status` — set `upcoming|live|completed`
  - `DELETE /matches/:id` — delete (also removes score)

- Scores
  - `GET /scores/match/:matchId`
  - `PUT /scores/cricket/:matchId` — replace cricket score block
  - `PUT /scores/badminton/:matchId` — replace badminton score block
  - `POST /scores/cricket/:matchId/add-runs` — `{ runs, isWicket, isExtra, team:1|2 }`
  - `POST /scores/badminton/:matchId/add-point` — `{ player:'player1'|'player2' }`

## Real-time Events (Socket.IO)
- Client emits `joinMatch` with `matchId` to join room
- Client emits `updateScore` with `{ matchId, scoreData }` after a REST update
- Server emits `scoreUpdated` to room with latest score document

## Notes
- If you want hot-reload for backend, install nodemon and use `npm run dev`:
```
npm install -D nodemon
```
- Tailwind CSS v4 is imported in `frontend/src/index.css` with `@import "tailwindcss";`
- If you see type errors for `socket.io-client`, run `npm install` in `frontend/`.

## Troubleshooting
- CORS: Backend allows `http://localhost:5173` during development
- MongoDB: Ensure your IP is whitelisted in Atlas
- Ports: Backend 5000, Frontend 5173
