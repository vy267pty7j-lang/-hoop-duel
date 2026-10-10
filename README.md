# Hoop Duel

A keyboard-only, real-time 1v1 browser basketball game.

## Controls
- A / D: move
- W: jump
- X: shoot when holding the ball; steal on defense
- Z: dunk near the rim; use a full power meter for a power shot; block on defense

## Run locally
1. Install Node.js 18+.
2. Open this folder in Terminal.
3. Run:
   npm install
   npm start
4. Open http://localhost:3000

For two devices on the same Wi-Fi, the second player can open:
http://YOUR-COMPUTER-LAN-IP:3000

## Play over the internet
Deploy this project to any Node.js host that supports WebSockets (for example Render, Railway, Fly.io, or a VPS). Set the start command to:
npm start

Then both players open the deployed URL. Player 1 selects CREATE GAME and sends the 5-character room code to Player 2.

## Notes
This is an original implementation inspired by arcade 1v1 basketball games. It does not contain copied Basketball Stars art/assets.
