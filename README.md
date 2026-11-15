# AgenticCodeActivity
Repository for Ai in the age of humanities Agentic Code Activity :)

## Hoodoo Hike 🥾👶

A cozy, mobile-friendly pixel-art game set in **Bryce Canyon National Park**. You play a parent
carrying their baby on a hike from the rim, down Queen's Garden, through the Navajo Loop's Wall
Street slot, past Thor's Hammer, and back up to Sunset Point.

There are no goals and no way to fail. Wander, look after your little one, make friends, fill
your journal, and watch the light change from morning to golden hour to a starry night (Bryce is
an International Dark Sky Park). The look takes after cozy farm-sim games: outlined pixel art,
wooden and parchment UI, portraits, a clock and a hotbar.

### How to play
| | Phone / tablet (landscape) | Keyboard |
|---|---|---|
| Walk | Tap where you want to go | ← → or A / D |
| Interact / pick up | Tap a person, animal, sign, item… | E / Space |
| Baby | Tap your character, the baby panel, or the thought bubble | B |
| Bag | 🎒 (the hotbar shows your first slots; tap one to use it) | I |
| Journal | 📔 | J |
| Photo / album | 📷 / 🖼️ | P |
| Sound | 🔊 | M |

### What's in the game
- **Baby needs.** Thought bubbles show what your baby wants: 🍼 hungry, 🧷 diaper, 🥵 too hot,
  🥶 chilly, 😴 sleepy, 🧸 bored, 🤗 cuddles, 🦷 teething, 🥺 "I threw my pacifier!". Needs get
  louder the longer you wait (fussing, then crying). Answer them with bag items or with play
  (peekaboo, tickle, raspberries, bounce, sing, rock). Caring for your baby builds your bond
  hearts.
- **The bag.** It starts with bottles, diapers, a sun hat, a blanket, a rattle, a teether,
  snacks and water. Refill bottles at water fountains and diapers at the trailhead restrooms.
  You can pick up:
  - **litter** to pack out to a trash can;
  - **things your baby throws**;
  - **lost items** to return to their owners;
  - **nature finds** (pinecones, feathers, pebbles) to show your baby, then *leave be*, since
    parks ask visitors not to take natural objects.
- **Friends and hearts.** Chat with people and give them gifts (everyone has favorites), return
  what they've lost, and take their photo when they ask. Hearts unlock new lines and thank-you
  gifts. Ranger Rosa runs a pop quiz about the park.
- **Random happenings.** Something different happens on every hike:
  - hikers with their own personalities wander the trail;
  - gusts blow the baby's hat away and the baby flings their pacifier;
  - a raven tries to steal your snack, and a squirrel begs (don't feed it!);
  - butterflies follow you, and lizards sun themselves on the rocks;
  - litter blows onto the trail and people lose things.
- **Journal.** It has pages for wildlife, friends, finds, badges and baby firsts, plus 10
  Junior-Ranger-style badges (Leave No Trace, Good Samaritan, Night Owl, Golden Hour…).
  Progress saves in your browser.

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
| `src/player.js`, `src/baby.js` | The parent's movement and poses; the baby's needs, play and moods |
| `src/entities.js` | Animals, people (hearts, gifts, lost items), pickups, facilities, signs and landmarks |
| `src/items.js` | Item definitions and the bag |
| `src/journal.js` | Journal pages, badges, friendship hearts, save/load |
| `src/events.js` | The random-event director (wandering hikers, gusts, thrown toys, ravens…) |
| `src/fx.js` | Floating hearts, sparkles, music notes and emote bubbles |
| `src/ui.js`, `src/input.js` | Bubbles, menus, dialogue with portraits and choices, bag, journal, album; input |
| `src/audio.js` | Synthesized music and sound effects (WebAudio, no audio files) |
| `src/main.js` | Boot, title screen and character picker, world population, game loop |

Facts in the game come from general Bryce Canyon National Park interpretive information. The
trail is a stylized side-scrolling take on Queen's Garden and the Navajo Loop, not an exact map.
