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
    var t = opts.at != null ? opts.at : ctx.currentTime + (opts.delay || 0);
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

  // White noise, made once and shared by the snore and the page swish.
  var noiseBuffer = null;
  function getNoise(ctx) {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.9), ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // A page turning: a quick sweep of filtered noise.
  function swish() {
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();
    src.buffer = getNoise(ctx);
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(3800, t + 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + 0.5);
  }

  // Snorbit's snore: low filtered noise that swells and fades.
  function snore(at) {
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    var src = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();
    src.buffer = getNoise(ctx);
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 6;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.08, at + 0.35);
    gain.gain.linearRampToValueAtTime(0.0001, at + 0.85);
    src.connect(filter).connect(gain).connect(master);
    src.start(at);
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
     Project 1: the Toby Box, a wind-up music box
     Notes are scheduled a moment ahead on the audio clock, so the timing
     stays steady even when the page is busy. Each wind adds one turn to the
     spring; the tune slows over the last turn, like a real music box.
     ------------------------------------------------------------------------ */

  var notes = document.getElementById('notes');
  var boxMedia = document.getElementById('box-media');
  var windButton = document.getElementById('wind');
  var windKey = windButton.querySelector('.wind-key');
  var stopButton = document.getElementById('box-stop');
  var springDots = Array.prototype.slice.call(document.querySelectorAll('#spring span'));
  var boxStatus = document.getElementById('box-status');
  var tuneChips = Array.prototype.slice.call(document.querySelectorAll('.tune-chip'));
  windButton.setAttribute('data-sound', 'own');
  stopButton.setAttribute('data-sound', 'own');

  var SECONDS_PER_TURN = 7;
  var MAX_TURNS = 5;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // melody: [MIDI note, length in beats]. bass: one note every `bassEvery` beats.
  var TUNES = {
    twinkle: {
      name: 'Twinkle, Twinkle', bpm: 100, bassEvery: 2,
      melody: [
        [72, 1], [72, 1], [79, 1], [79, 1], [81, 1], [81, 1], [79, 2],
        [77, 1], [77, 1], [76, 1], [76, 1], [74, 1], [74, 1], [72, 2],
        [79, 1], [79, 1], [77, 1], [77, 1], [76, 1], [76, 1], [74, 2],
        [79, 1], [79, 1], [77, 1], [77, 1], [76, 1], [76, 1], [74, 2],
        [72, 1], [72, 1], [79, 1], [79, 1], [81, 1], [81, 1], [79, 2],
        [77, 1], [77, 1], [76, 1], [76, 1], [74, 1], [74, 1], [72, 2]
      ],
      bass: [48, 48, 53, 48, 53, 48, 55, 48, 48, 53, 48, 55, 48, 53, 48, 55, 48, 48, 53, 48, 53, 48, 55, 48]
    },
    toby: {
      // an original waltz, in 3/4
      name: "Toby's Theme", bpm: 88, bassEvery: 3,
      melody: [
        [76, 1], [79, 1], [81, 1], [79, 2], [76, 1], [74, 1], [76, 1], [79, 1], [76, 3],
        [76, 1], [79, 1], [81, 1], [84, 2], [81, 1], [79, 1], [81, 1], [76, 1], [74, 3],
        [72, 1], [74, 1], [76, 1], [79, 2], [81, 1], [79, 1], [76, 1], [74, 1], [72, 3]
      ],
      bass: [48, 48, 43, 48, 48, 53, 48, 43, 48, 48, 43, 48]
    }
  };

  // Dream Machine: a fresh four-bar waltz phrase every time round, so it never repeats.
  var SCALE = [72, 74, 76, 79, 81, 84, 86];
  function dreamTune() {
    var melody = [];
    var step = 2;
    var beats = 0;
    while (beats < 12) {
      var len = Math.random() < 0.3 ? 2 : 1;
      if (beats + len > 11) len = 11 - beats;
      if (len <= 0) break;
      step = Math.max(0, Math.min(SCALE.length - 1, step + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      melody.push([SCALE[step], len]);
      beats += len;
    }
    melody.push([72, 12 - beats]); // always come home to C
    return { name: 'Dream Machine', bpm: 80, bassEvery: 3, melody: melody, bass: [48, 53, 45, 43] };
  }

  function buildLoop(name) {
    var tune = name === 'dream' ? dreamTune() : TUNES[name];
    var events = [];
    var beat = 0;
    tune.melody.forEach(function (n) {
      events.push({ beat: beat, freq: midi(n[0]), bass: false });
      beat += n[1];
    });
    tune.bass.forEach(function (m, i) {
      events.push({ beat: i * tune.bassEvery, freq: midi(m), bass: true, snore: i % 2 === 1 });
    });
    events.sort(function (a, b) { return a.beat - b.beat || a.bass - b.bass; });
    return { name: tune.name, bpm: tune.bpm, length: beat, events: events };
  }

  var box = { tune: 'twinkle', spring: 0, playing: false, loop: null, index: 0, beat: 0, time: 0, timer: 0, turnsShown: -1 };

  function turnsLeft() { return Math.ceil(box.spring / SECONDS_PER_TURN - 0.001); }

  // Full speed until the last turn, then slowing to just over half speed.
  function speed() {
    return box.spring >= SECONDS_PER_TURN ? 1 : 0.55 + 0.45 * Math.max(0, box.spring) / SECONDS_PER_TURN;
  }

  function timeAt(beat) { return box.time + (beat - box.beat) * 60 / box.loop.bpm / speed(); }

  function moveTo(beat, time) {
    box.spring -= time - box.time;
    box.beat = beat;
    box.time = time;
  }

  function tick() {
    // Background tabs only run timers about once a second, so look further ahead there.
    var horizon = audio.currentTime + (document.hidden ? 1.5 : 0.2);
    while (box.playing) {
      if (box.index >= box.loop.events.length) {
        var end = timeAt(box.loop.length);
        if (end > horizon) break;
        moveTo(box.loop.length, end);
        box.loop = buildLoop(box.tune);
        box.index = 0;
        box.beat = 0;
        continue;
      }
      var event = box.loop.events[box.index];
      var at = timeAt(event.beat);
      if (at > horizon) break;
      moveTo(event.beat, at);
      if (box.spring <= 0) { stopBox('The spring ran down. Snorbit is fast asleep.'); return; }
      playEvent(event, at);
      box.index++;
    }
    renderBox();
  }

  function playEvent(event, at) {
    var wait = Math.max(0, (at - audio.currentTime) * 1000);
    if (event.bass) {
      ping(event.freq, { at: at, duration: 1.6, volume: 0.09 });
      if (event.snore) {
        snore(at);
        setTimeout(function () { floatUp('z', 'note note-snore'); }, wait);
      }
    } else {
      ping(event.freq, { at: at, duration: 1.3, volume: 0.15 + 0.07 * speed() });
      setTimeout(function () { floatUp(Math.random() < 0.5 ? '♪' : '♫', 'note'); }, wait);
    }
  }

  function floatUp(text, className) {
    if (!box.playing) return;
    var note = document.createElement('span');
    note.className = className;
    note.textContent = text;
    note.style.left = (className === 'note' ? 30 + Math.random() * 40 : 44 + Math.random() * 12) + '%';
    note.style.setProperty('--drift', (Math.random() * 80 - 40).toFixed(0) + 'px');
    note.addEventListener('animationend', function () { note.remove(); });
    notes.appendChild(note);
  }

  function renderBox() {
    var turns = Math.max(0, turnsLeft());
    springDots.forEach(function (dot, i) { dot.classList.toggle('is-wound', i < turns); });
    stopButton.disabled = !box.playing;
    boxMedia.classList.toggle('is-playing', box.playing);
    if (box.playing && turns !== box.turnsShown) {
      box.turnsShown = turns;
      boxStatus.textContent = 'Playing ' + box.loop.name + '. ' + (turns === 1 ? 'Last turn, slowing down…' : turns + ' turns left.');
    }
  }

  function startBox() {
    box.loop = buildLoop(box.tune);
    box.index = 0;
    box.beat = 0;
    box.time = audio.currentTime + 0.12;
    box.playing = true;
    box.turnsShown = -1;
    clearInterval(box.timer);
    box.timer = setInterval(tick, 40);
    tick();
  }

  function stopBox(message) {
    box.playing = false;
    box.spring = 0;
    clearInterval(box.timer);
    boxStatus.textContent = message;
    renderBox();
  }

  windButton.addEventListener('click', function () {
    var ctx = getAudio();
    if (!ctx) { boxStatus.textContent = "This browser can't play music, sorry."; return; }

    if (turnsLeft() >= MAX_TURNS) {
      boxStatus.textContent = 'Fully wound! Any tighter and the spring goes boing.';
      ping(1568, { duration: 0.25, volume: 0.08 });
      return;
    }

    box.spring = Math.min(MAX_TURNS * SECONDS_PER_TURN, Math.max(0, box.spring) + SECONDS_PER_TURN);
    rattle(); // the ratchet click
    var turn = (parseFloat(windKey.style.getPropertyValue('--turn')) || 0) + 90;
    windKey.style.setProperty('--turn', turn + 'deg');

    if (!box.playing) startBox();
    else box.turnsShown = -1;
    renderBox();
  });

  stopButton.addEventListener('click', function () {
    stopBox('Stopped. Wind it up to play again.');
    ping(392, { duration: 0.4, volume: 0.1 });
  });

  tuneChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      box.tune = chip.dataset.tune;
      tuneChips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      if (box.playing) {
        // switch on the next beat
        box.loop = buildLoop(box.tune);
        box.index = 0;
        box.beat = 0;
        box.time = Math.max(box.time, audio.currentTime + 0.08);
        box.turnsShown = -1;
      }
    });
  });

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
     Nightlight mode: the big light goes off and the pointer becomes the
     lantern. Shining it on the glow-in-the-dark stickers charges them.
     ------------------------------------------------------------------------ */

  var darkness = document.getElementById('darkness');
  var lightsOutButton = document.getElementById('lights-out');
  var lightsOnButton = document.getElementById('lights-on');
  var darknessHint = document.getElementById('darkness-hint');
  var stickerLayer = document.getElementById('glow-stickers');
  lightsOutButton.setAttribute('data-sound', 'own');
  lightsOnButton.setAttribute('data-sound', 'own');

  // Sticker positions as percentages of the screen; one is a moon.
  var STICKER_SPOTS = [[9, 22], [24, 72], [36, 34], [50, 84], [63, 18], [76, 62], [89, 28], [93, 80], [14, 50], [56, 52], [82, 44], [30, 92]];
  var stickers = STICKER_SPOTS.map(function (spot, i) {
    var el = document.createElement('span');
    el.className = 'sticker' + (i === 4 ? ' sticker-moon' : '');
    el.style.left = spot[0] + '%';
    el.style.top = spot[1] + '%';
    el.appendChild(document.createElement('i'));
    stickerLayer.appendChild(el);
    return { el: el, charged: false };
  });
  var chargedCount = 0;
  var light = { x: 0, y: 0, frame: 0, radius: 120 };
  var nightlightOn = false;

  function lightRadius() { return Math.min(160, Math.max(90, window.innerWidth * 0.14)); }

  function moveLight(x, y) {
    light.x = x;
    light.y = y;
    if (!light.frame) light.frame = requestAnimationFrame(drawLight);
  }

  function drawLight() {
    light.frame = 0;
    darkness.style.setProperty('--lx', light.x + 'px');
    darkness.style.setProperty('--ly', light.y + 'px');
    chargeStickers();
  }

  function chargeStickers() {
    stickers.forEach(function (sticker) {
      if (sticker.charged) return;
      var box = sticker.el.getBoundingClientRect();
      var distance = Math.hypot(box.left + box.width / 2 - light.x, box.top + box.height / 2 - light.y);
      if (distance > light.radius * 0.8) return;
      sticker.charged = true;
      sticker.el.classList.add('is-charged');
      chargedCount++;
      ping(PENTATONIC[chargedCount % PENTATONIC.length] * 2, { duration: 0.6, volume: 0.1 });
      if (chargedCount === stickers.length) {
        darknessHint.textContent = 'Every sticker is glowing! Snorbit will sleep like a log tonight.';
        celebrate({ x: light.x / window.innerWidth, y: light.y / window.innerHeight });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { ping(f, { delay: 0.2 + i * 0.1, duration: 1.2, volume: 0.14 }); });
      } else {
        darknessHint.textContent = chargedCount + ' of ' + stickers.length + ' glow stickers charged.';
      }
    });
  }

  function onPointer(event) { moveLight(event.clientX, event.clientY); }
  // Keyboard visitors: the light follows whatever has focus.
  function onFocus(event) {
    var box = event.target.getBoundingClientRect();
    moveLight(box.left + box.width / 2, box.top + box.height / 2);
  }
  function onKey(event) { if (event.key === 'Escape') lightsOn(); }

  function lightsOut() {
    nightlightOn = true;
    light.radius = lightRadius();
    darkness.style.setProperty('--r', light.radius + 'px');
    var start = lightsOutButton.getBoundingClientRect();
    darkness.hidden = false;
    moveLight(start.left + start.width / 2, start.top + start.height / 2);
    requestAnimationFrame(function () { darkness.classList.add('is-on'); });
    // Focus the exit first, so the light doesn't jump to it straight away
    lightsOnButton.focus({ preventScroll: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKey);
    ping(196, { duration: 0.5, volume: 0.15, type: 'triangle' }); // the switch going click
  }

  function lightsOn() {
    if (!nightlightOn) return;
    nightlightOn = false;
    darkness.classList.remove('is-on');
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { if (!nightlightOn) darkness.hidden = true; }, 500);
    ping(783.99, { duration: 0.5, volume: 0.15 });
    lightsOutButton.focus({ preventScroll: true });
  }

  lightsOutButton.addEventListener('click', lightsOut);
  lightsOnButton.addEventListener('click', lightsOn);
  window.addEventListener('resize', function () {
    if (!nightlightOn) return;
    light.radius = lightRadius();
    darkness.style.setProperty('--r', light.radius + 'px');
  });

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
     Project 4: Snorbit's storybook, a flipbook
     The readable list of pages in the HTML is rebuilt into leaves: two pages
     per leaf (a spread) on wide screens, one page per leaf on narrow ones.
     ------------------------------------------------------------------------ */

  var bookEl = document.getElementById('book');
  var bookList = document.getElementById('book-pages');
  var bookPrev = document.getElementById('book-prev');
  var bookNext = document.getElementById('book-next');
  var bookCount = document.getElementById('book-count');
  var pageSources = Array.prototype.slice.call(bookList.children);
  var spreadQuery = window.matchMedia('(min-width: 760px)');
  var book = { stage: null, leaves: [], turned: 0, spread: spreadQuery.matches, settle: 0 };

  function makeFace(source, side, number) {
    var face = document.createElement('div');
    face.className = 'face face-' + side;
    if (!source) {
      face.classList.add('face-blank');
      return face;
    }
    if (source === 'back-cover') {
      face.classList.add('page-back-cover');
      face.innerHTML = '<p>Printed at the Cloud Cradle Workshop. Please return to Snorbit’s pillow.</p>';
      return face;
    }
    face.className += ' ' + source.className;
    face.innerHTML = source.innerHTML;
    if (number) {
      var num = document.createElement('p');
      num.className = 'page-number';
      num.textContent = '~ ' + number + ' ~';
      face.appendChild(num);
    }
    return face;
  }

  function buildBook() {
    var keepPage = book.spread ? book.turned * 2 : book.turned; // first page currently on view
    book.spread = spreadQuery.matches;

    var stage = document.createElement('div');
    stage.className = 'book-stage' + (book.spread ? '' : ' is-single');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-roledescription', 'storybook');
    stage.setAttribute('aria-label', "Snorbit's Very Long Nap. Use the left and right arrow keys to turn pages.");

    var pages = pageSources.slice();
    var leaves = [];
    if (book.spread) {
      pages.push('back-cover');
      for (var i = 0; i < pages.length; i += 2) leaves.push([pages[i], pages[i + 1], i, i + 1]);
    } else {
      pages.forEach(function (p, i) { leaves.push([p, null, i, null]); });
    }

    book.leaves = leaves.map(function (pair) {
      var leaf = document.createElement('div');
      leaf.className = 'leaf';
      // page numbers skip the cover and the end
      var frontNum = pair[2] > 0 && pair[2] < pageSources.length - 1 ? pair[2] : 0;
      var backNum = pair[3] && pair[3] < pageSources.length - 1 ? pair[3] : 0;
      leaf.appendChild(makeFace(pair[0], 'front', frontNum));
      leaf.appendChild(makeFace(pair[1], 'back', backNum));
      stage.appendChild(leaf);
      return leaf;
    });

    if (book.stage) book.stage.remove();
    book.stage = stage;
    bookList.hidden = true;
    bookEl.insertBefore(stage, bookList);
    book.turned = Math.min(book.spread ? Math.ceil(keepPage / 2) : keepPage, book.leaves.length);
    stage.addEventListener('keydown', onBookKey);
    stage.addEventListener('pointerdown', onBookDown);
    stage.addEventListener('pointerup', onBookUp);
    renderBook(true);
  }

  function renderBook(instant) {
    var total = book.leaves.length;
    book.leaves.forEach(function (leaf, i) {
      var turned = i < book.turned;
      if (instant) leaf.style.transition = 'none';
      leaf.classList.toggle('is-turned', turned);
      leaf.style.zIndex = turned ? i + 1 : total - i;
      // only the faces on view are readable by screen readers
      leaf.querySelector('.face-front').setAttribute('aria-hidden', String(i !== book.turned));
      leaf.querySelector('.face-back').setAttribute('aria-hidden', String(i !== book.turned - 1));
      if (instant) { void leaf.offsetWidth; leaf.style.transition = ''; }
    });
    book.stage.classList.toggle('is-closed-front', book.turned === 0);
    book.stage.classList.toggle('is-closed-back', book.spread && book.turned === total);
    bookPrev.disabled = book.turned === 0;
    bookNext.disabled = book.turned === total || (!book.spread && book.turned === total - 1);

    var pageCount = pageSources.length;
    if (book.turned === 0) bookCount.textContent = 'Cover';
    else if (book.spread) {
      var left = book.turned * 2 - 1;
      if (left >= pageCount) bookCount.textContent = 'Back cover';
      else if (left + 1 === pageCount - 1) bookCount.textContent = 'Page ' + left + ' and the end';
      else bookCount.textContent = 'Pages ' + left + '–' + (left + 1);
    } else {
      bookCount.textContent = book.turned === pageCount - 1 ? 'The end' : 'Page ' + book.turned + ' of ' + (pageCount - 2);
    }
  }

  function turn(direction) {
    var max = book.spread ? book.leaves.length : book.leaves.length - 1;
    var next = Math.max(0, Math.min(max, book.turned + direction));
    if (next === book.turned) return;
    // lift the moving leaf above the others while it turns
    var moving = book.leaves[direction > 0 ? book.turned : next];
    moving.style.zIndex = book.leaves.length + 1;
    book.turned = next;
    swish();
    clearTimeout(book.settle);
    book.settle = setTimeout(function () { renderBook(false); }, 900);
    moving.classList.toggle('is-turned', direction > 0);
    renderBook(false);
    moving.style.zIndex = book.leaves.length + 1;
  }

  function onBookKey(event) {
    if (event.key === 'ArrowRight') { turn(1); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { turn(-1); event.preventDefault(); }
  }

  // Swipe or click: right side turns forward, left side turns back.
  var bookPointer = null;
  function onBookDown(event) { bookPointer = { x: event.clientX, y: event.clientY }; }
  function onBookUp(event) {
    if (!bookPointer) return;
    var dx = event.clientX - bookPointer.x;
    var dy = event.clientY - bookPointer.y;
    bookPointer = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { turn(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      var box = book.stage.getBoundingClientRect();
      turn(event.clientX > box.left + box.width / 2 ? 1 : -1);
    }
  }

  bookPrev.addEventListener('click', function () { turn(-1); });
  bookNext.addEventListener('click', function () { turn(1); });
  if (spreadQuery.addEventListener) spreadQuery.addEventListener('change', buildBook);
  buildBook();

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
