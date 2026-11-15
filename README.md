# AgenticCodeActivity
Repository for Ai in the age of humanities Agentic Code Activity :)

## Blue Spring Stroll 🌿👶

A gentle, mobile-friendly game set at **Blue Spring State Park** in Orange City, Florida. You
carry your baby along the boardwalk beside the clear spring run, the winter home of hundreds of
West Indian manatees. Start at the dock on the dark St. Johns River, pass the 1872 Thursby House
on its ancient shell mound, and follow the boardwalk up to the spring boil, where the water wells
up from the Floridan Aquifer.

The scenery is painted procedurally in a naturalistic, nature-guide style:
- live oaks draped in Spanish moss, sabal palms, bald cypress and saw palmetto;
- turquoise spring water with shifting light on a sandy bottom, and eelgrass;
- morning mist over the water, golden-hour light, and starry nights.

There's no way to fail. Stroll, care for your baby, and enjoy the wildlife and the people you meet.

### Features
- **A full character customizer**, with 🎲 *Surprise me* to randomize everything:
  - **parent:** height, build, skin, eyes, facial hair, glasses, freckles, 10 hairstyles, hats,
    and top, bottoms, shoes and backpack (with colors);
  - **baby:** skin, eyes, hair, onesie color and pattern, hat, and pacifier color;
  - **carrier:** structured, wrap or back frame, in 5 patterns.
- **A random baby name** on every visit. Keep it, type your own, or roll the 🎲 again.
- **Baby care.** Thought bubbles show what your baby needs: hungry, diaper, too hot, chilly,
  sleepy, bored, cuddles, or a pacifier flung onto the boardwalk. Answer with a bottle, a diaper
  change, a sun hat, a blanket, rocking, songs and play.
- **Florida wildlife:** manatees (including mothers with calves surfacing to breathe), an
  alligator, basking turtles, a great blue heron, a great egret, white ibises, an anhinga drying
  its wings, an osprey, a river otter, an armadillo, gar, leaping mullet, and a barred owl at night.
- **People:** Ranger Dee (manatees, the spring, local history), a family, a birder, a photographer,
  Ruth on her bench, and wandering visitors.
- **Signs** about the St. Johns River, the Thursby House and shell midden, the manatee refuge, and
  the spring itself.
- A camera and photo album, a day/night cycle, and gentle synthesized sound.

### How to play
| | Phone / tablet (landscape) | Keyboard |
|---|---|---|
| Walk | Tap the boardwalk | ← → or A / D |
| Interact | Tap an animal, person or sign | E / Space |
| Baby | Tap your character, the baby panel, or the thought bubble | B |
| Photo / album | 📷 / 🖼️ | P |
| Change your look | 👕 | |

### Run locally
Plain HTML + JavaScript modules, no build step:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>. Debug URL options: `?play` skips the title screen, `?x=2000`
starts at a spot along the trail (0–3600), `?t=0.55` sets the time of day (0–1), and `?speed=10`
speeds up the day.

### Deploying
GitHub Pages publishes the site from `main`. Every asset URL carries a version tag (`?v=…` on
`style.css`, `src/main.js` and every module import), so browsers never mix old cached files with new
ones. When you change any CSS or JS file, bump that tag everywhere, e.g.:

```bash
sed -i -E "s/v=[0-9a-z]+/v=NEWVERSION/g" index.html src/*.js
```

### How it's made
| File | What it does |
|---|---|
| `src/figures.js` | Naturalistic people (all the customization options), the baby, carriers, and Florida animals, drawn with layered, softly shaded shapes |
| `src/world.js` | The painted park: trees, moss, the house, boardwalk, river and spring, baked into cached tiles; water, mist and the front railing are drawn every frame |
| `src/custom.js` | The customizer and baby names |
| `src/entities.js` | Wildlife, visitors, signs and benches, with their facts and dialogue |
| `src/baby.js`, `src/player.js` | The baby's needs and care; walking |
| `src/timeofday.js` | Sky, sun, moon, stars, clouds and lighting |
| `src/ui.js`, `src/input.js`, `src/fx.js`, `src/audio.js`, `src/main.js` | UI, input, effects, sound, and the game loop |

Facts in the game come from general Blue Spring State Park and Florida wildlife interpretive
information. The park layout is simplified into a single side-scrolling stroll.
