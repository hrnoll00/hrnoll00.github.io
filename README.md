# Campus Ruckus (Campus Ruckus Game)

This repository holds a simple Quiplash-style web game prototype. It includes a static frontend and a small Node/Express in-memory server used for hosting game rooms, collecting submissions, and tallying votes.

Contents
- `index.html`, `app.js`, `style.css` — frontend UI and client logic
- `server.js` — minimal Node/Express backend (in-memory rooms; not persistent)
- `package.json` — dependencies and start script

Quick local run (requires Node.js and npm)

1. Install dependencies:

	npm install

2. Start the server:

	npm start

3. Open http://localhost:3000 in your browser.

Run for local network play
- To let other devices on the same Wi‑Fi join the game, run the server and share your laptop's local IP address and port (for example: http://192.168.1.42:3000).
- Start the server as above (npm start). The server will now listen on all interfaces and print the LAN addresses it is reachable at.
- On other devices (phones, tablets, other laptops) open Safari/Chrome and visit that URL. They will load the client and can join the demo or real games.

Firewall and network notes
- On Windows/Mac you may need to allow Node (or the terminal app) through your firewall for incoming connections on the chosen port (3000 by default).
- Ensure devices are on the same Wi‑Fi network (guest networks are often isolated).

Browser notes
- Mobile Safari, Chrome on Android, and desktop browsers work fine for the demo. If using real multiplayer backend later, ensure CORS and websocket origins are configured.

Notes about hosting and multiplayer

- GitHub Pages: Serves static files only. Good for single-player or client-only games, but cannot run the Node backend. If you deploy here, disable or remove API calls that expect a server.
- Node server (this repo's `server.js`): Keeps everything simple and works locally or on platforms like Render, Heroku, or a VPS. It's in-memory only — restarting the server clears rooms.
- Production-ready multiplayer: Use a hosted backend (Render, Fly, Heroku) or serverless functions + a database (e.g., Supabase, Firebase). For low-latency real-time play, add WebSockets (socket.io) and persist state in a database.

Next steps you can take
- Deploy the frontend to GitHub Pages for a static demo (remove backend calls), or
- Deploy the server to Render/Heroku and point your repo's GitHub Actions to build and start it, or
- Add socket-based real-time updates (socket.io) and persist rooms in a small DB (SQLite/Postgres)

If you'd like, I can:
- Add a minimal WebSocket lobby so clients get real-time updates instead of polling, or
- Provide a GitHub Actions workflow to deploy to a free tier host.
