# Toby's Homepage

**Toby is a sleepy skull baby who tucks the whole sky in.** This is his portfolio: a cosy, playful, slightly 1999 website built for **Baby's First Website 2026** (haX.baby), Track 2: Your Own Baby.

**Live site:** _add your GitHub Pages link here_
**Team:** Toby's Night Shift

---

## Meet Toby

| | |
|---|---|
| **Name** | Toby |
| **What he is** | A skull baby with little fangs, soft bones and two stars where his eyes should be |
| **What he does** | Lullaby Tinkerer at the Cloud Cradle Workshop, building music boxes, nightlights and toys that help the creatures of Hushbury fall asleep |
| **His story** | A falling star landed in a warm sock, and by morning the sock had giggled and turned into a baby. He found his dragon, Snorbit, asleep in the laundry basket |
| **Tagline** | I tuck the whole sky in. |

His sidekick **Snorbit** is a pocket-sized purple dragon who has been asleep since they met, and snores in tune.

## What's on the site

The site has five pages (Home, Who, Work, Story, Guestbook). Each opens on its own and has a link you can share, such as `#story` or `#music-box`.

**Home.** Toby's painted portrait. His star eyes follow your cursor (or your last tap on a phone), and you can boop him. **View in 3D** flips the card over to a Three.js Toby you can spin.

**Who.** Toby's character sheet as an open page of his baby book: a taped-in photo of him on day one, an "It's a Toby!" card, stickers for what he loves and doesn't, and "All about me" answers handwritten on ruled lines. Tap Snorbit's photo to hear him snore.

**Work: a toy shelf of seven projects that really work**
- **The Toby Box**: a wind-up music box made with the Web Audio API. Wind it up to five turns and it slows as the spring runs down. It has three tunes (one is generated live and never repeats), a brass cylinder and comb that pluck each note, and a tempo slider.
- **The Moonbell Lantern**: pick a glow colour, turn off the big light so your cursor becomes the lantern, charge glow-in-the-dark stickers, or switch on a star projector that turns slowly behind the whole site.
- **Rattle Blocks**: eleven blocks and four secret words, each with its own surprise. Stuck? Toby gives two hints per word: a riddle, then a letter clue.
- **Star Catcher**: a canvas mini-game. Catch stars in the dream jar and dodge alarm clocks.
- **Dream Delivery Routes**: an SVG map of Hushbury. Snorbit flies the route you choose while the trail draws in behind him.
- **Toby's Growth Chart**: skills measured in pencil on the nursery wall, each with a note.
- **Snorbit's Storybook**: a 3D page-turning flipbook. **Read it to me** has Cori, an AI voice, read each page and turn it, with a quiet lullaby underneath.

**Story.** Toby's origin in four scenes, with a picture-book window that acts out whichever scene you're reading as you scroll: a star falls into a sock on the washing line and becomes Toby, he says hello to Snorbit in the laundry basket, his teacup music box lulls the restless moon and owls to sleep, and a starry quilt tucks in the sky while lanterns light up over Hushbury.

**Guestbook.** Visitors pin dream wishes to a nursery wall, saved in Supabase.

**Everywhere:**
- A day/night switch and a sound switch with mute.
- A sparkle trail of stars and tiny bones.
- A real visitor counter odometer and a 1999 marquee.
- **TobyChat 99**, a chat window where Toby answers in character.
- **Chaos Mode**, a 1999 version of the site that reshapes itself for each screen size: a pink *Tobygotchi* gadget on phones, a *Toby 98* desktop window on tablets, and a *Homepage Deluxe* with webring panels on desktops. In chaos mode the portrait becomes 16-bit pixel art and 3D Toby turns low-poly.

### Brief checklist

- **Core requirements:** who he is, what he does (7 projects), his story (scroll scenes under 150 words each), immersion, mobile layout, and Easter eggs.
- **Tier 1:** cursor-reactive eyes with a touch fallback, the scroll-driven story, a day/night toggle, a responsive layout, and Easter eggs.
- **Tier 2:** the Web Audio music box with mute, the nightlight cursor, the page-turn storybook, and the mini-game.
- **Tier 3:**
  - a Three.js 3D model
  - a live guestbook with a backend
  - returning-visitor memory: Toby greets you with your visit number, when you last came, and something you did
  - a character that chats back (TobyChat)
- **Side quests:** the live guestbook, the sparkle trail, the hit counter odometer, click sounds with mute, and Responsive Chaos Mode.

<details>
<summary><strong>Easter eggs (spoilers!)</strong></summary>

- Tap Snorbit on Toby's hat three times.
- Type `1999` anywhere to toggle Chaos Mode.
- Konami code (↑ ↑ ↓ ↓ ← → ← → B A): Snorbit sleep-flies loop-the-loops.
- Sit still for 45 seconds and Toby dozes off.
- Visit between midnight and 1am, or add `?midnight` to the address, for a night-owl greeting and shooting stars.
- Charge all twelve glow stickers in the dark.
- Find all four secret words in the rattle blocks. SHH makes everything go quiet.
- In TobyChat, ask Toby to "wake up Snorbit", or say "lights off".
- Deliver a dream to all five homes in Hushbury.
- Open your browser's developer console for a note from Toby.

</details>

## How it works

The site is plain **HTML, CSS and JavaScript**, with no framework and no build step.

| File | What's in it |
|---|---|
| `index.html` | All the content. Without JavaScript, every section simply shows one after another. |
| `styles.css` | Day/night colour tokens, the layouts, the chaos-mode styles (everything under `:root[data-chaos="on"]`), and reduced-motion rules. |
| `main.js` | Every interactive feature, in labelled sections (sound, eyes, each project, Easter eggs, chat, pages). |
| `toby3d.js` | The Three.js model. It's built from simple shapes and only downloaded when someone presses "View in 3D". |
| `supabase/` | The SQL that creates the guestbook and counter tables and their security rules, plus setup steps. |

### How the main features work

- **Pages:** a small router reads the address-bar hash (`#who`, `#music-box`…) and shows one section at a time. Links, bookmarks and the back button all work.
- **Sound:** every effect and tune is synthesised with the Web Audio API, so there are no music files. The music box schedules notes slightly ahead on the audio clock to keep timing steady.
- **Storybook narration:** recorded ahead of time, so every visitor hears the same voice and no AI service runs on the live site. `tools/make_story_audio.py` reads the storybook text from `index.html` and has [Piper](https://github.com/OHF-Voice/piper1-gpl), a free open-source AI voice, read it in the Cori voice (`en_GB-cori-high`). The script then saves one small AAC file per page in `assets/story/`. Re-run it if the story text changes.
- **Eyes:** star-shaped overlays sit exactly on the painted eye sockets (positions measured from the artwork) and move towards the pointer.
- **Pixel-art Toby:** generated in the browser from the painting. It's shrunk to 104px wide, each pixel is matched to a 16-colour pastel palette with Bayer dithering, then scaled up with crisp pixels.
- **Guestbook and counter:** read and written through Supabase's REST API with the public "anon" key. Row-level security lets visitors read and add wishes and add one to the counter. Nobody can edit or delete through the site. Wishes are rendered with `textContent`, so no HTML can be injected.
- **Memory:** the theme, glow colour, chaos mode, best score, found words and visit history are saved in `localStorage`, in your browser only.

### Accessibility and speed

- Every page passes the axe-core accessibility checks (the engine Lighthouse uses) in day, night and chaos modes.
- All controls are keyboard-friendly and labelled, and touch targets are at least 44px.
- The site respects reduced motion, and sound only plays after you interact, with a mute switch always visible.
- Fonts load without blocking the first paint, and Three.js and the confetti library load only when needed.

## Run it yourself

No install needed. In this folder, run:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. Use a local server rather than opening the file directly, because the 3D model is a JavaScript module and browsers won't load modules from a plain file.

To use your own guestbook, follow [`supabase/SETUP.md`](supabase/SETUP.md) and put your project URL and anon key at the top of the guestbook section in `main.js`.

## Credits

- **Toby artwork:** the paintings were generated with Google Gemini, art-directed by Toby's Night Shift. The pixel-art version is generated from them in the browser. The small SVG drawings on the Who and Story pages were drawn in code with Claude.
- **Code:** written by Toby's Night Shift with help from Claude by Anthropic.
- **Storybook narration:** an AI voice generated with [Piper](https://github.com/OHF-Voice/piper1-gpl), using the *Cori* voice (trained on public-domain LibriVox recordings).
- **Libraries:** [Three.js](https://threejs.org), [canvas-confetti](https://github.com/catdad/canvas-confetti), [Supabase](https://supabase.com).
- **Fonts:** Fredoka, Nunito, Patrick Hand and VT323 from Google Fonts.
- **Lullabies:** "Twinkle, Twinkle, Little Star" is a traditional tune in the public domain; "Toby's Theme" and the Dream Machine are original.

Made for Baby's First Website 2026 by haX.baby.
