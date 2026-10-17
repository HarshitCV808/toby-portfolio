# Submission write-up (draft)

_A starting point for the haX.baby submission form. Edit it into your own words before you paste it in; judges read these, and they should sound like your team._

---

**Toby's Homepage** is a portfolio for Toby, a sleepy skull baby with two stars where his eyes should be. He works as the Lullaby Tinkerer at the Cloud Cradle Workshop, and every night he tucks the whole sky in. His sidekick Snorbit is a tiny purple dragon who has been asleep since the day they met. We entered Track 2 with an original character: his own world (Hushbury), his own job, an origin story told in four scroll-driven scenes, and a full character sheet.

We wanted the site to feel like a real cosy place on the early web rather than a modern landing page with a cute skin. His toys really work:
- **Music box:** winds down like a real spring, with notes synthesised live in the browser.
- **Lantern:** turns your cursor into a nightlight.
- **Storybook:** turns its pages in 3D, and a cosy AI voice can read it aloud over a quiet lullaby.
- **Dream Delivery Routes:** sends Snorbit flying over a map of Hushbury.
- **Rattle blocks and growth chart:** a block game with secret words, and a growth chart of Toby's skills.

For full 1999 energy there's a marquee, a real visitor odometer, a live guestbook, and **Chaos Mode**, which reshapes the whole site for each screen size: a pink Tobygotchi gadget on phones, a Toby 98 desktop window on tablets, and a webring homepage on desktops. In chaos mode Toby's painting and drawings turn into pixel art, the buttons and menus switch to a pixel font, and his 3D model goes low-poly.

Toby is also a character you can talk to. TobyChat 99 lets him answer questions in his own voice, he remembers returning visitors, and the site is full of secrets: a Konami code, a midnight visitor surprise, secret words, a nap if you sit still, and a note in the developer console. It's built with plain HTML, CSS and JavaScript with no build step. The 3D model uses Three.js, loaded only when you ask for it. The guestbook and visitor counter run on Supabase with read-and-add-only security rules. Every page passes axe accessibility checks in day, night and chaos modes, works by keyboard, respects reduced motion, and keeps sound behind a visible mute switch.

**Honesty note:** Toby's artwork was generated with Google Gemini under our art direction, the storybook narration is an AI voice made with the open-source Piper, and we built the code with help from Claude by Anthropic. All three are credited in the site footer and the README.
