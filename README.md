# AgenticCodeActivity
Repository for Ai in the age of humanities Agentic Code Activity :)

## Hoodoo Hike 🥾👶

A cozy, mobile-friendly pixel-art game set in **Bryce Canyon National Park**. You play a parent
carrying their baby on a hike from the rim, down Queen's Garden, through the Navajo Loop's Wall
Street slot, past Thor's Hammer, and back up to Sunset Point.

There are no goals and no way to fail — just wander, look after your little one, meet the
animals and other hikers, and watch the light change from morning to golden hour to a starry
night (Bryce is an International Dark Sky Park).

### How to play
| | Phone / tablet (landscape) | Keyboard |
|---|---|---|
| Walk | Tap where you want to go | ← → or A / D |
| Interact | Tap a person, animal, sign, bench, flower… | E / Space |
| Baby | Tap your character or 👶 | B |
| Photo | 📷 (photos are saved in the 🖼️ album) | P |
| Sound | 🔊 | M |

Things to try: tickle, feed, rock, or sing to the baby; move the carrier front ↔ back; sit on a
bench and watch the time pass; ask Ranger Rosa about hoodoos, the rock colors, the Paiute
story of the Legend People, or the night sky; find the owl in the bristlecone pine after dark.

### Run locally
The game is plain HTML + JavaScript modules with no build step:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>. (Opening `index.html` directly from disk won't work because
browsers block ES modules on `file://` URLs.)

Debug URL options: `?play` skips the title screen, `?x=2700` starts at a trail position
(0–4900), `?t=0.75` sets the time of day (0–1, where 0.55 is golden hour and 0.75 is night), and
`?speed=10` speeds up the day.

### Deploying to GitHub Pages
`.github/workflows/pages.yml` publishes the game on every push to `main`. One-time setup: in
the repository go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. The game will be live at `https://<user>.github.io/AgenticCodeActivity/`.

### How it's made
| File | What it does |
|---|---|
| `src/sprites.js` | All pixel art as text grids (`'.'` = transparent, each letter = a palette color), baked into canvases at load. Edit a grid to change a sprite! |
| `src/world.js` | Trail height profile, place names, and procedurally drawn hoodoos, pines, strata and Wall Street, baked into parallax layers |
| `src/timeofday.js` | Sky colors, sun/moon, stars and Milky Way, and the lighting tint and headlamp |
| `src/player.js`, `src/baby.js` | The parent's movement and poses; the baby's gentle mood system |
| `src/entities.js` | Animals, people, signs, benches, flowers and landmarks, plus their facts and dialogue |
| `src/ui.js`, `src/input.js` | Speech bubbles, menus, dialogue, photo album; tap and keyboard input |
| `src/audio.js` | Synthesized music and sound effects (WebAudio, no audio files) |
| `src/main.js` | Boot, title screen and character picker, world population, game loop |

Facts in the game come from general Bryce Canyon National Park interpretive information. The
trail is a stylized side-scrolling take on Queen's Garden and the Navajo Loop, not an exact map.
