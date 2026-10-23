Knightmate 1.0.23

INSTALL OR UPDATE
1. Extract the Knightmate folder.
2. Open chrome://extensions and enable Developer mode.
3. To update, replace the contents of your existing Knightmate extension folder,
   click Reload on its extension card, and reload your chess tabs. Keeping the
   same extension folder preserves your settings and local history.
4. For a new installation, click Load unpacked and select Knightmate.
5. Disable older copies to avoid conflicting overlays or autoplay.

CHANGES IN 1.0.16
One Mistakes section: on/off, frequency, and severity. Removed the old duplicate
weak-move interval feature from the popup, board overlay, and move-selection
logic. Obsolete stored settings are cleared on install/update. Existing
Mistakes frequency/severity settings are preserved.

LOCAL ENGINE AND SETTINGS
Bundled Stockfish runs on your device. No account, subscription, or analysis
server is used. Chess websites still require their own internet access.
Search depth controls effort. Target rating limits playing strength separately.
Optional mistakes select a weaker scored legal move. Frequency is a probability
per analysis; severity is a target loss, not a guaranteed result. Forced moves
or searches without suitable alternatives may produce no mistake.
Autoplay timing includes an initial wait, a source-piece click with a selection
pause, a pickup hold, and a smooth drag. These durations are configurable.
Game history is stored locally and can be exported from the popup.

VERIFICATION
Popup control storage, absence of duplicate settings, local game history,
diagnostics, and mistake selection checks passed. The bundled engine and mouse
event sequence were browser-tested in earlier versions. Live-site behavior
still requires verification. Features do not guarantee undetectability.

THIRD-PARTY ENGINE
Stockfish.js 19.0.1, Stockfish developers / Nathan Rugg.
Exact package: https://registry.npmjs.org/stockfish/-/stockfish-19.0.1.tgz
Engine files are unmodified. GPLv3 license: engine/Copying.txt.
Source/build instructions: https://github.com/nmrugg/stockfish.js
Original ChessHelper files retain their original ownership.

PLAY-STYLE SIMULATION (1.0.17)
Enable Play-style simulation in the popup to use these optional heuristics:
- Preference: positional, attacking, simplifying, or cautious. This biases
  selection among alternatives within 45 centipawns of the top scored move.
- Familiar phase: opening, middlegame, endgame, or all. This is a preset based
  on move number and remaining material, not learned opening knowledge.
- Candidate breadth: consider 2–8 closely scored alternatives for style.
- Simulated fatigue: calculation decreases after move 20 through move 70.
- Simulated time pressure: none, moderate, high. This manually selected state
  lowers calculation effort; it does not read the actual game clock.
- Simulated composure: steady, overconfident, frustrated. These presets alter
  search effort and the effective mistake probability.
Search effort varies with legal-move count, familiarity, fatigue, pressure
and composure. The single Mistakes section still controls intentional larger
errors. When enabled, its base probability is multiplied by context factors,
clamped to 100%. Turning Mistakes off disables these deliberate extra lapses;
lower search effort can still produce weaker moves naturally.
These are transparent approximations, not a validated psychological model.
They do not learn a player's knowledge, confidence, mood or fatigue and do
not provide an undetectability guarantee. Stockfish remains the core engine.

Checks: profile phase/fatigue/pressure/preference/forced-move behavior and
all new settings passed local checks. The integrated profile returned a
legal move in a browser. Live chess-site behavior remains unverified.

UNIFIED BULLET TOGGLE (1.0.20)
Bullet speed is now an optional toggle in the main Knightmate extension.
Default: off. Turn it on for depth-6 analysis with a 150ms search budget,
a 120ms pause before moving, 60ms between clicks, and faster polling.
Bullet speed forces analysis/autoplay on, bypasses strength limiting,
mistakes, play-style simulation, simulated fatigue/pressure, and all timing
controls. Other settings are disabled in the popup and bypassed at runtime.
The header enable/disable switch remains available to stop the extension.

Normal settings are retained in storage, not overwritten by the preset.
Turning Bullet speed off restores them. The board's autoplay button is locked
while Bullet speed is on; turn off Bullet speed to adjust it again.
Disable any separately installed Bullet build to avoid competing extensions.
Keep your main extension folder and replace its files, then click Reload in
chrome://extensions and reload the chess tabs.

Checks passed for locked controls, restoring normal settings, Bullet runtime
overrides, and preserving the master stop switch. The fast click path was
browser-tested in the previous Bullet build. Live-site behavior is unverified.

RELIABILITY AND PACING (1.0.21)
Bullet remains fast but now waits 120ms after analysis and 60ms between source
and destination clicks to allow the board to register selection.
Failed/unchanged moves and transient engine errors can retry twice, with a
450ms cooldown, while the same board position and our turn remain valid.
After two recovery attempts, an explicit Retry message is shown. Disabling
autoplay/the extension or changing the board prevents the retry.
Engine-response timeouts and failures release the position cache, allowing
that position to be analyzed again instead of being skipped forever.
Checks passed for cache recovery, stale-turn recovery, retry limits,
cancellation/disable guards, click timing, and unified Bullet settings.
The reported live-site freeze was not reproduced; live verification remains
necessary. This fixes identified failure paths rather than guaranteeing all
chess.com/Lichess changes or network problems are handled.

BULLET CHECK PREFERENCE (1.0.22)
With Bullet speed on, Stockfish scores up to five candidate moves within
the existing 150ms search budget. When a checking candidate is within 50
centipawns (half a pawn) of the best scored candidate, the best such check
is preferred. Scores at a single search depth are used; shallow evaluations
can be inaccurate. Checks outside the scored candidate set are not considered.
If mate scores appear or no suitable checking alternative is available,
the engine's original choice is retained. Normal mode remains unchanged.
Selection tests checked checking moves, loss limits, forced-move fallback
and mate-score handling. The integrated engine returned a legal move in a
browser test. Live-site verification is still outstanding.

CHECK ESCAPE RELIABILITY (1.0.23)
When a stale UI turn marker says the non-moving king is in check, the
position helper tries the opposite side and accepts the correction only if
that removes the legality error. En-passant metadata is recalculated after
this correction. Invalid positions with both kings attacked remain invalid.
Checked positions bypass stale post-move turn guards and lagging move-list
parity checks. A checked king's legal turn is used to request analysis.
Bullet check preference is disabled while our king is in check; Stockfish
chooses the defensive escape normally. Engine moves are checked for legality
before being returned, including the requirement to get out of check.
Checks passed for white/black checked-turn correction, move-list lag,
post-move guard recovery and browser engine responses with legal escapes.
Live-site reproduction was not available; this fixes identified failure
paths but does not guarantee every website transition is covered.
