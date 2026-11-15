# AgenticCodeActivity
Repository for Ai in the age of humanities Agentic Code Activity :)

## Hoodoo Hike 🥾👶

A cozy, mobile-friendly pixel-art game set in **Bryce Canyon National Park**. You play a parent
carrying their baby on a hike from the rim, down Queen's Garden, through the Navajo Loop's Wall
Street slot, past Thor's Hammer, and back up to Sunset Point.

There's no way to fail. Wander, look after your little one, explore hidden corners, make
friends, play mini-games, and watch the light change from morning to golden hour to a starry
night (Bryce is an International Dark Sky Park). Everything is painted in code at high resolution:
shaded hoodoos with real strata, ponderosa pines, haze, sun rays, clouds, rain and rainbows.

### How to play
| | Phone / tablet (landscape) | Keyboard |
|---|---|---|
| Walk | Tap where you want to go | ← → or A / D |
| Jump | ⤴ button | Space / W / ↑ |
| Run | Hold 🏃 (uses energy) | Shift |
| Interact | Tap a person, animal, sign… (walk into items to pick them up) | E |
| Baby | Tap your character, the baby panel, or the thought bubble | B |
| Bag / Journal / Map | 🎒 / 📔 / 🗺️ | I / J / N |
| Photo | 📷 (or 📸 an animal for the photo mini-game) | P |

### What's in the game
- **Platforming-lite.** Hop logs, jump onto boulders, and climb ledges. Tap-to-walk auto-hops small
  obstacles. Running and climbing use energy; rest on benches or eat and drink to recover.
- **Exploration and secrets.** Three hidden side areas branch off the trail: the *Hidden Seep* (a
  dripping spring with ferns and a canyon wren), *Two Bridges* (natural rock windows and a climb to a
  lookout), and the *Moonlit Overlook* (the best stargazing). A trail map tracks what you've found.
- **A story to uncover.** A gust scattered six pages of an old 1957 hiking diary (fictional) across
  the canyon, some high on ledges. Find them all and return them to Walt at Sunset Point.
- **Mini-games**, each rated 1–3 stars:
  - 📸 wildlife photography (time the focus, frame the shot, catch the animal looking at you);
  - ✨ stargazing (trace real constellations);
  - 🎵 lullaby rhythm (sing your baby to sleep);
  - 📣 canyon-echo memory (in Wall Street);
  - 🙈 peekaboo timing.
- **Baby needs.** Thought bubbles show hunger, diaper, heat, cold, sleepiness, boredom, cuddles,
  teething, "I threw my pacifier!", and fear of thunder. They get louder if ignored, and are
  answered with bag items, play, or mini-games.
- **Light stakes.** An afternoon thunderstorm can roll in. Get to shelter (Wall Street, the seep, a
  cabin) to keep the baby calm, and watch for the rainbow afterward. Energy limits running and
  jumping.
- **The bag, friends and the journal.** Pack out litter, return lost items, give gifts, and raise
  friendship hearts. Ranger Rosa has a pop quiz. The journal tracks 13 animals, 16 badges, the
  diary story and your mini-game records, and it saves in your browser.

### Run locally
The game is plain HTML + JavaScript modules with no build step:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>. (Opening `index.html` directly from disk won't work because
browsers block ES modules on `file://` URLs.)

Debug URL options: `?play` skips the title screen, `?x=2700` starts at a trail position
(0–4900), `?t=0.75` sets the time of day (0–1, where 0.55 is golden hour and 0.75 is night), and
`?speed=10` speeds up the day, and `?area=seep|bridges|overlook` starts in a side area.

### Deploying to GitHub Pages
`.github/workflows/pages.yml` publishes the game on every push to `main`. One-time setup: in
the repository go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. The game will be live at `https://<user>.github.io/AgenticCodeActivity/`.

### How it's made
| File | What it does |
|---|---|
| `src/figures.js` | Illustrated characters, the baby's expressions, 13 animals and all item icons, drawn with shaded vector shapes |
| `src/world.js`, `src/areas.js` | Painted terrain, hoodoos, trees, walls and arches baked into cached high-res tiles; the main trail plus three side areas, with obstacles and ledges |
| `src/timeofday.js` | Sky, sun, moon, stars, Milky Way, clouds, sun rays, rainbow and lighting |
| `src/player.js`, `src/baby.js` | Movement physics (jump, run, energy); the baby's needs, play and moods |
| `src/entities.js` | Animals, people (hearts, gifts, lost items), pickups, facilities, portals, signs and landmarks |
| `src/minigames.js` | The five mini-games |
| `src/events.js` | The random-event director and the thunderstorm |
| `src/story.js` | The diary pages |
| `src/items.js`, `src/journal.js` | The bag, journal, badges and save data |
| `src/ui.js`, `src/input.js`, `src/fx.js` | Menus, dialogue, bag, journal, map and album; input; hearts and sparkles, rain and dust |
| `src/audio.js` | Synthesized music and sound effects (WebAudio, no audio files) |
| `src/main.js` | Boot, title screen, area population, travel, render loop |

Facts in the game come from general Bryce Canyon National Park interpretive information. The
trail is a stylized side-scrolling take on Queen's Garden and the Navajo Loop, not an exact map.
