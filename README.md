# Boredoms Fun

Multiplayer party games with live rooms: Ludo, Snake & Ladder, Business Tycoon, Card Clash, Tic-Tac-Toe and Sudoku.

- **Front end:** plain HTML/CSS/ES modules, no build step (`index.html`, `css/`, `js/`).
- **Accounts:** Supabase Postgres functions (`bf_signup`, `bf_login`, ...). Passwords are bcrypt-hashed; the tables are not readable by the public key.
- **Live rooms:** Supabase Realtime broadcast. The host's phone runs the game, every phone renders it.
- **Test mode:** open `/?offline` to use device-only accounts and tab-to-tab rooms without a server.

Run locally: `python3 -m http.server 8000` then open http://localhost:8000
