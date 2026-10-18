# Toby's Homepage

**Team:** Toby's Night Shift  
**Track:** 2, Your Own Baby  
**Live site:** https://harshitcv808.github.io/toby-portfolio/  
**Code:** https://github.com/HarshitCV808/toby-portfolio

## Who's Toby?

Toby is a skull baby with two stars where his eyes should be, a couple of tiny fangs and a lavender and mint striped nightcap. He's the Lullaby Tinkerer at the Cloud Cradle Workshop in a sleepy little town called Hushbury, so his job is building music boxes, nightlights and toys that help everyone fall asleep. His sidekick is Snorbit, a pocket-sized purple dragon who has been asleep since the day they met. Toby's motto is "I tuck the whole sky in."

We didn't want a landing page with a cute mascot on top. We wanted it to feel like a place Toby actually lives. So every toy on his shelf really works, and if you press the sparkle button the whole site turns into his 1999 homepage.

## If you only have a minute

- Boop Toby on the home page, then press **View in 3D** and spin him around.
- Press the sparkle button for **chaos mode**, then switch between day and night. Try it on your phone too, it turns into a little Tobygotchi. Chaos mode also has a MIDI jukebox at the top and a button that saves pixel Toby as a phone wallpaper.
- On the Work page, wind up the **Toby Box** and press **Read it to me** in Snorbit's storybook.
- Send Snorbit on a **dream delivery** across Hushbury.
- Pin a wish in the guestbook, then scroll to the end of the Story page. Your wish is one of the stars in **Tonight's sky**.
- Open TobyChat and ask him to "wake up Snorbit". There are more secrets hidden around. Sitting very still is one of them.

## What's in it

There are five pages: Home, Who (Toby's character sheet, done as a page from his baby book), Work (seven toys), Story (his origin in four scenes, acted out in a little picture-book window while you scroll) and the Guestbook. We tried to cover all three tiers: eyes that follow your cursor, the scroll story, day and night, a Web Audio music box with a mute switch, a nightlight cursor, a page-turning storybook, a mini-game, a Three.js model, a live guestbook, a chatbot, and a site that remembers you when you come back. Chaos mode has its own layout for phones, tablets and laptops.

It's plain HTML, CSS and JavaScript with no build step. We checked every page with axe in day, night and chaos mode, and PageSpeed gives it 100 for accessibility, best practices and SEO, with 99 performance on desktop and the mid-80s on mobile.

## What we learned

The big features weren't really the hard part. The small stuff was. Switching the theme made Toby say a shorter sentence, which shrank his speech bubble, which made the whole home page jump by 14 pixels. Snorbit also refused to fly on one of our phones, and it turned out Reduce Motion was switched on, so the site was being polite and skipping the animation. We kept a slower, gentler flight for that case, because on that page the flight is the whole point. Testing on a real phone caught things our laptops never showed us.

## Credits

Toby's paintings were generated with Google Gemini from our descriptions and art direction. The storybook is read by Cori, an AI voice made with Piper and trained on public-domain LibriVox recordings. We built the code with help from Claude by Anthropic, which also drew the small SVG pictures and the pixel-art wallpapers. Also used: Three.js, canvas-confetti, Supabase, and the fonts Fredoka, Nunito, Patrick Hand and VT323. Everything is credited in the site footer and the README too.
