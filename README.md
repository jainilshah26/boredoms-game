# Boredoms Fun

Multiplayer party games with live rooms and cute avatars. Live at https://boredoms-game.vercel.app

**Games:** Ludo, Snake & Ladder, Business Tycoon (40-square world tour of 30 UNESCO World Heritage Sites, up to 10 players), Card Clash, Tic-Tac-Toe, Sudoku, Teen Patti (play chips only, 2–10 players), Snake (Nokia style) and Red Ball (platformer). Snake and Red Ball have a global high-score board.

**Friends:** search a Player ID, send and accept requests, see who is online, and invite friends to a live room with one tap (an invite banner appears on their screen). Tap **+ Friend** next to anyone in a room or on a leaderboard. Stored in Supabase (`bf_friends`, `bf_invites`, RPC-only).

**Stable rooms:** moves are acknowledged and retried, the screen stays awake in a live room, a dropped connection gets 12 seconds to recover, and returning to the app re-syncs the table.

- **Front end:** plain HTML/CSS/ES modules, no build step (`index.html`, `css/`, `js/`). Installable on phones (web app manifest and icons).
- **Accounts and scores:** Supabase Postgres functions (`bf_signup`, `bf_login`, `bf_submit_score`, ...). Passwords are bcrypt-hashed; the tables are not readable with the public key.
- **Live rooms:** Supabase Realtime broadcast. The host's phone runs the game, every phone renders it. Arcade games run on each phone with a shared seed; only final scores travel through the room.
- **Test mode:** open `/?offline` for device-only accounts and tab-to-tab rooms without a server. `?debug` adds a test hook for the arcade games.

## Run and test
```
python3 -m http.server 8000     # then open http://localhost:8000
npm test                        # logic tests for every game (no dependencies)
```

## Deploying
Pushing to `main` deploys to production on Vercel (no build step).
