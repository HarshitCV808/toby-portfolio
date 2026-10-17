/* Toby's homepage. Plain JavaScript, no build step. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // localStorage can throw in private windows, so every read and write is guarded.
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* not saved, fine */ } }

  /* ------------------------------------------------------------------------
     Sound: Web Audio, no files. Nothing plays until the visitor clicks,
     and the mute switch silences everything.
     ------------------------------------------------------------------------ */

  var audio = null;
  var master = null;
  var muted = load('toby-muted') === '1';

  function getAudio() {
    if (!audio) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio = new Ctx();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  // One music-box "ping": a sine with a quiet overtone and a fast, soft decay.
  function ping(freq, opts) {
    opts = opts || {};
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    var t = ctx.currentTime + (opts.delay || 0);
    var dur = opts.duration || 0.9;
    var volume = opts.volume || 0.22;

    [[1, 1], [2.01, 0.25], [3.98, 0.08]].forEach(function (partial) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.value = freq * partial[0];
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume * partial[1], t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  // A short burst of filtered noise: peas rattling in a block.
  function rattle() {
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    var length = Math.floor(ctx.sampleRate * 0.18);
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      // bursts of clicks rather than a hiss
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.1) * (1 - i / length);
    }
    var src = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    gain.gain.value = 0.5;
    src.connect(filter).connect(gain).connect(master);
    src.start();
  }

  var PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  function softClick() {
    ping(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], { duration: 0.5, volume: 0.12 });
  }
  function giggle() {
    [659.25, 783.99, 880, 1046.5].forEach(function (f, i) { ping(f, { delay: i * 0.07, duration: 0.4, volume: 0.14 }); });
  }

  var soundSwitch = document.getElementById('sound-switch');
  var soundLabel = soundSwitch.querySelector('.sound-label');

  function renderSound() {
    soundSwitch.setAttribute('aria-pressed', String(!muted));
    soundLabel.textContent = muted ? 'Sound off' : 'Sound on';
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, audio.currentTime, 0.02);
  }

  soundSwitch.addEventListener('click', function () {
    muted = !muted;
    save('toby-muted', muted ? '1' : '0');
    renderSound();
    if (!muted) ping(880, { duration: 0.5, volume: 0.15 });
  });
  renderSound();

  // Every button and link gets a soft chime, unless it has its own sound.
  document.addEventListener('click', function (event) {
    var target = event.target.closest('button, a');
    if (!target || target.hasAttribute('data-sound')) return;
    softClick();
  });

  /* ------------------------------------------------------------------------
     Day / night
     ------------------------------------------------------------------------ */

  var themeSwitch = document.getElementById('theme-switch');
  var themeLabel = themeSwitch.querySelector('.theme-label');

  function renderTheme() {
    var night = root.dataset.theme === 'night';
    themeSwitch.setAttribute('aria-pressed', String(night));
    themeLabel.textContent = night ? 'Lights on' : 'Lights off';
  }

  themeSwitch.addEventListener('click', function () {
    var night = root.dataset.theme !== 'night';
    root.dataset.theme = night ? 'night' : 'day';
    save('toby-theme', root.dataset.theme);
    renderTheme();
    // a falling pair of notes for lights off, a rising pair for lights on
    ping(night ? 783.99 : 523.25, { duration: 0.7, volume: 0.16 });
    ping(night ? 523.25 : 783.99, { delay: 0.12, duration: 0.9, volume: 0.16 });
    say(night ? 'Ooh, cosy. My eyes work better in the dark.' : 'Too bright! I was nearly asleep.');
  });
  renderTheme();

  /* ------------------------------------------------------------------------
     Speech bubble
     ------------------------------------------------------------------------ */

  var bubble = document.getElementById('bubble');
  function say(text) {
    bubble.textContent = text;
    bubble.classList.remove('is-new');
    void bubble.offsetWidth; // restart the pop animation
    bubble.classList.add('is-new');
  }

  /* ------------------------------------------------------------------------
     Eyes follow the pointer (and the last tap on touch screens)
     ------------------------------------------------------------------------ */

  var portrait = document.getElementById('portrait');
  var eyes = Array.prototype.slice.call(document.querySelectorAll('.eye'));
  var pointer = null;
  var eyeFrame = 0;

  function aimEyes() {
    eyeFrame = 0;
    if (!pointer) return;
    eyes.forEach(function (eye) {
      var box = eye.getBoundingClientRect();
      var cx = box.left + box.width / 2;
      var cy = box.top + box.height / 2;
      var dx = pointer.x - cx;
      var dy = pointer.y - cy;
      var distance = Math.hypot(dx, dy) || 1;
      var reach = box.width * 0.24 * Math.min(1, distance / 220);
      var pupil = eye.firstElementChild;
      pupil.style.transform = 'translate(' + (dx / distance * reach).toFixed(1) + 'px,' + (dy / distance * reach).toFixed(1) + 'px)';
    });
  }

  function trackPointer(event) {
    pointer = { x: event.clientX, y: event.clientY };
    if (!eyeFrame) eyeFrame = requestAnimationFrame(aimEyes);
  }
  window.addEventListener('pointermove', trackPointer, { passive: true });
  window.addEventListener('pointerdown', trackPointer, { passive: true });
  window.addEventListener('scroll', function () { if (!eyeFrame) eyeFrame = requestAnimationFrame(aimEyes); }, { passive: true });

  /* ------------------------------------------------------------------------
     Boop Toby
     ------------------------------------------------------------------------ */

  var boopLines = [
    'Hee! That tickles my cheekbones.',
    'Boop received. Booping you back.',
    'I was only resting my eyes. Honest.',
    "Shh, you'll wake Snorbit.",
    'Do you hear that? Too quiet. Somebody hum.',
    'My fangs are for biting cookies, not people.'
  ];
  var boopIndex = 0;

  document.getElementById('boop').addEventListener('click', function () {
    say(boopLines[boopIndex++ % boopLines.length]);
    giggle();
    portrait.classList.remove('is-booped');
    void portrait.offsetWidth;
    portrait.classList.add('is-booped');
  });
  document.getElementById('boop').setAttribute('data-sound', 'own');

  /* ------------------------------------------------------------------------
     Easter egg: tap Snorbit (the dragon on Toby's hat) three times
     ------------------------------------------------------------------------ */

  var snorbit = document.getElementById('snorbit');
  snorbit.setAttribute('data-sound', 'own');
  var snorbitTaps = 0;
  var snorbitTimer = 0;

  snorbit.addEventListener('click', function () {
    snorbitTaps++;
    clearTimeout(snorbitTimer);
    snorbitTimer = setTimeout(function () { snorbitTaps = 0; }, 1600);

    if (snorbitTaps === 1) { say('Zzz… (Snorbit is snoring.)'); ping(196, { duration: 0.8, volume: 0.18, type: 'triangle' }); return; }
    if (snorbitTaps === 2) { say('Zzz… zz… (one ear twitched!)'); ping(220, { duration: 0.8, volume: 0.18, type: 'triangle' }); return; }

    snorbitTaps = 0;
    say('Snorbit opened ONE eye! That has never happened before. Every star tonight is yours.');
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { ping(f, { delay: i * 0.09, duration: 1.2, volume: 0.16 }); });
    celebrate();
    save('toby-found-snorbit', '1');
  });

  function celebrate(origin) {
    if (typeof window.confetti !== 'function') return; // CDN blocked: the egg still talks and chimes
    window.confetti({
      particleCount: 90,
      spread: 80,
      startVelocity: 38,
      origin: origin || { x: 0.3, y: 0.35 },
      shapes: ['star', 'circle'],
      colors: ['#ffd36e', '#b9a3e3', '#a8e2cf', '#f5b5c6', '#fff8f1'],
      scalar: 1.1,
      disableForReducedMotion: true
    });
  }

  /* ------------------------------------------------------------------------
     Project 1: wind up the Toby Box (Tier 1: a short tune and floating notes)
     ------------------------------------------------------------------------ */

  var notes = document.getElementById('notes');
  var windButton = document.getElementById('wind');
  windButton.setAttribute('data-sound', 'own');

  windButton.addEventListener('click', function () {
    // "Twinkle, twinkle" opening, music-box style
    var tune = [523.25, 523.25, 783.99, 783.99, 880, 880, 783.99];
    tune.forEach(function (f, i) { ping(f, { delay: i * 0.38, duration: 1.1 }); });
    for (var i = 0; i < 6; i++) {
      setTimeout(spawnNote, i * 320);
    }
  });

  function spawnNote() {
    var note = document.createElement('span');
    note.className = 'note';
    note.textContent = Math.random() < 0.5 ? '♪' : '♫';
    note.style.left = (35 + Math.random() * 30) + '%';
    note.style.setProperty('--drift', (Math.random() * 80 - 40).toFixed(0) + 'px');
    note.addEventListener('animationend', function () { note.remove(); });
    notes.appendChild(note);
  }

  /* ------------------------------------------------------------------------
     Project 2: Moonbell Lantern glow picker (also tints Toby's eyes)
     ------------------------------------------------------------------------ */

  var GLOWS = { honey: '#ffcf66', bubblegum: '#ff9ec4', mint: '#8ff0cf' };
  var chips = Array.prototype.slice.call(document.querySelectorAll('.glow-chip'));

  function setGlow(name) {
    if (!GLOWS[name]) name = 'honey';
    root.style.setProperty('--glow', GLOWS[name]);
    chips.forEach(function (chip) { chip.setAttribute('aria-pressed', String(chip.dataset.glow === name)); });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      setGlow(chip.dataset.glow);
      save('toby-glow', chip.dataset.glow);
    });
  });
  setGlow(load('toby-glow') || 'honey');

  /* ------------------------------------------------------------------------
     Project 3: Rattle Blocks. Shuffled on load; tap T-O-B-Y in order.
     ------------------------------------------------------------------------ */

  var blockRow = document.querySelector('.blocks');
  var blocks = Array.prototype.slice.call(blockRow.querySelectorAll('.block'));
  var blocksStatus = document.getElementById('blocks-status');
  var WORD = 'TOBY';
  var BLOCK_NOTES = { T: 523.25, O: 659.25, B: 783.99, Y: 1046.5 };
  var progress = 0;

  // Shuffle until the blocks are not already in order
  do {
    blocks.sort(function () { return Math.random() - 0.5; });
  } while (blocks.map(function (b) { return b.dataset.letter; }).join('') === WORD);
  blocks.forEach(function (b) { b.setAttribute('data-sound', 'own'); blockRow.appendChild(b); });

  blocks.forEach(function (block) {
    block.addEventListener('click', function () {
      var letter = block.dataset.letter;
      rattle();
      ping(BLOCK_NOTES[letter], { delay: 0.05, duration: 0.6, volume: 0.15 });
      block.classList.remove('is-rattling');
      void block.offsetWidth;
      block.classList.add('is-rattling');

      if (letter === WORD[progress]) {
        progress++;
        block.classList.add('is-right');
        blocksStatus.textContent = WORD.slice(0, progress).split('').join('-') + (progress < WORD.length ? '…' : '');
        if (progress === WORD.length) {
          blocksStatus.textContent = 'T-O-B-Y! That spells me!';
          var box = block.getBoundingClientRect();
          celebrate({ x: (box.left + box.width / 2) / window.innerWidth, y: box.top / window.innerHeight });
          setTimeout(resetBlocks, 2200);
        }
      } else {
        blocksStatus.textContent = progress ? 'Oops, wobbly. Start again from T.' : 'Rattle rattle. Try starting with T.';
        resetBlocks(true);
      }
    });
  });

  function resetBlocks(keepMessage) {
    progress = 0;
    blocks.forEach(function (b) { b.classList.remove('is-right'); });
    if (keepMessage !== true) blocksStatus.textContent = '';
  }

  /* ------------------------------------------------------------------------
     Story: scroll position drives the sky (--p) and highlights each scene
     ------------------------------------------------------------------------ */

  var story = document.getElementById('story');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var storyFrame = 0;

  function updateSky() {
    storyFrame = 0;
    var box = story.getBoundingClientRect();
    var travel = box.height - window.innerHeight;
    var p = travel > 0 ? Math.min(1, Math.max(0, -box.top / travel)) : 1;
    story.style.setProperty('--p', p.toFixed(3));
  }
  window.addEventListener('scroll', function () { if (!storyFrame) storyFrame = requestAnimationFrame(updateSky); }, { passive: true });
  window.addEventListener('resize', updateSky);
  updateSky();

  if ('IntersectionObserver' in window) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle('is-active', entry.isIntersecting); });
    }, { rootMargin: '-30% 0px -30% 0px' });
    scenes.forEach(function (scene) { sceneObserver.observe(scene); });
  } else {
    scenes.forEach(function (scene) { scene.classList.add('is-active'); });
  }

  /* ------------------------------------------------------------------------
     Sparkle trail: stars and tiny bones behind a mouse pointer
     ------------------------------------------------------------------------ */

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var TRAIL_COLOURS = ['#ffd36e', '#b9a3e3', '#a8e2cf', '#f5b5c6'];
  var BONE = '<svg viewBox="0 0 36 20"><path d="M7 3a4 4 0 0 1 4 4h14a4 4 0 1 1 4 6 4 4 0 1 1-4 6H11a4 4 0 1 1-4-6 4 4 0 1 1 0-10z" transform="translate(0 -3)"/></svg>';
  var lastSparkle = 0;
  var liveSparkles = 0;

  window.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reduceMotion.matches) return;
    var now = performance.now();
    if (now - lastSparkle < 45 || liveSparkles > 28) return;
    lastSparkle = now;

    var bit = document.createElement('span');
    var isBone = Math.random() < 0.18;
    bit.className = 'trail ' + (isBone ? 'trail-bone' : 'trail-star');
    bit.setAttribute('aria-hidden', 'true');
    if (isBone) bit.innerHTML = BONE;
    else bit.style.setProperty('--c', TRAIL_COLOURS[Math.floor(Math.random() * TRAIL_COLOURS.length)]);
    bit.style.left = event.clientX + 'px';
    bit.style.top = event.clientY + 'px';
    liveSparkles++;
    bit.addEventListener('animationend', function () { bit.remove(); liveSparkles--; });
    document.body.appendChild(bit);
  }, { passive: true });

  /* ------------------------------------------------------------------------
     Odometer: "dreams delivered tonight" ticks up while you visit
     ------------------------------------------------------------------------ */

  var odometer = document.getElementById('odometer');
  var DIGITS = 6;
  var dreams = parseInt(odometer.textContent, 10) || 0;
  var reels = [];

  odometer.textContent = '';
  for (var d = 0; d < DIGITS; d++) {
    var slot = document.createElement('span');
    slot.className = 'odo-digit';
    slot.setAttribute('aria-hidden', 'true');
    var reel = document.createElement('span');
    reel.className = 'odo-reel';
    for (var n = 0; n <= 9; n++) {
      var digit = document.createElement('span');
      digit.textContent = n;
      reel.appendChild(digit);
    }
    slot.appendChild(reel);
    odometer.appendChild(slot);
    reels.push(reel);
  }
  var odometerText = document.createElement('span');
  odometerText.className = 'visually-hidden';
  odometer.appendChild(odometerText);

  function renderDreams() {
    var padded = String(dreams).padStart(DIGITS, '0').slice(-DIGITS);
    reels.forEach(function (reelEl, i) {
      reelEl.style.transform = 'translateY(' + (-Number(padded[i])) + 'em)';
    });
    odometerText.textContent = dreams.toLocaleString();
  }
  renderDreams();

  setInterval(function () {
    if (document.hidden) return;
    dreams += 1 + Math.floor(Math.random() * 3);
    renderDreams();
  }, 4000);
})();
