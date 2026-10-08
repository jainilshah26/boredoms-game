# Boredoms Fun

Multiplayer party games with live rooms and cute avatars. Live at https://boredoms-game.vercel.app

**Games:** Ludo, Snake & Ladder, Business Tycoon (40-square world tour of 30 UNESCO World Heritage Sites, up to 10 players), Card Clash, Tic-Tac-Toe, Sudoku, Teen Patti (play chips only, 2–10 players), Snake (Nokia style), Red Ball (platformer) and Cricket (the old phone batting game, 12 balls and 3 wickets). Snake, Red Ball and Cricket have a global high-score board.

**Friends:** search a Player ID, send and accept requests, see who is online, and invite friends to a live room with one tap (an invite banner appears on their screen). Tap **+ Friend** next to anyone in a room or on a leaderboard. Stored in Supabase (`bf_friends`, `bf_invites`, RPC-only).

**Forgot password:** every account gets a one-time recovery code (shown at sign-up, stored only as a bcrypt hash). "Forgot password?" on the login screen takes the Player ID, the code and a new password, then issues a fresh code and signs out other devices. Wrong guesses lock the account's reset for 15 minutes after 5 tries. Older accounts see a "Protect your account" prompt to make a code, and the Me tab has New recovery code and Change password.

**Visitor analytics:** each browser sends one anonymous visit per session (random device id, mobile or desktop, referring site). No IP, no personal data, skipped when Do Not Track is on. Stored in `bf_visits`; read the numbers with the `bf_stats()` function (not callable from the app).

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
