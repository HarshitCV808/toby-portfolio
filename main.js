/* Toby's homepage. Plain JavaScript, no build step. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // localStorage can throw in private windows, so every read and write is guarded.
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* not saved, fine */ } }
  // True when a key press is going into a text box, so shortcuts stay out of the way
  function isTyping(event) {
    return !!(event.target && event.target.closest && event.target.closest('input, textarea'));
  }

  // Snorbit in profile, facing right: bat wing, back spikes, snout, spade-tipped tail
  var LINE = ' stroke="#4a3530" stroke-width="2" stroke-linejoin="round"';
  var SNORBIT_SVG =
    '<svg viewBox="0 0 130 90" aria-hidden="true">' +
    '<path class="wing" d="M52 42C46 18 64 6 82 8c-4 5-2 9-6 13-4 0-4 6-8 8-4 0-4 6-8 9z" fill="#a8e2cf"' + LINE + '/>' +
    '<path d="M30 58C18 60 10 54 9 45" fill="none" stroke="#4a3530" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M30 58C18 60 10 54 9 45" fill="none" stroke="#b9a3e3" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M9 46l-7-6 10-4 3 9z" fill="#a8e2cf"' + LINE + '/>' +
    '<ellipse cx="47" cy="73" rx="5.5" ry="4" fill="#b9a3e3"' + LINE + '/>' +
    '<ellipse cx="64" cy="73" rx="5.5" ry="4" fill="#b9a3e3"' + LINE + '/>' +
    '<path d="M38 43l4-9 5 8zM50 40l4-9 5 8zM62 41l4-8 4 8z" fill="#a8e2cf"' + LINE + '/>' +
    '<ellipse cx="56" cy="57" rx="29" ry="17" fill="#b9a3e3"' + LINE + '/>' +
    '<ellipse cx="59" cy="63" rx="17" ry="8" fill="#d9f3ea"/>' +
    '<path d="M80 33l-8-9 11 2zM89 30l-3-11 8 8z" fill="#a8e2cf"' + LINE + '/>' +
    '<circle cx="89" cy="45" r="15" fill="#b9a3e3"' + LINE + '/>' +
    '<ellipse cx="104" cy="50" rx="9" ry="7" fill="#b9a3e3"' + LINE + '/>' +
    '<circle cx="108" cy="48" r="1.3" fill="#4a3530"/>' +
    '<path d="M86 44q4 4 8 0" fill="none" stroke="#4a3530" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="95" cy="52" r="3" fill="#f5b5c6"/>' +
    '</svg>';

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
      osc.connect(gain).connect(opts.dest || master);
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

  // A pencil scribble: two quick scratches of high, filtered noise.
  function scribble() {
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    [0, 0.12].forEach(function (offset) {
      var t = ctx.currentTime + offset;
      var src = ctx.createBufferSource();
      var filter = ctx.createBiquadFilter();
      var gain = ctx.createGain();
      src.buffer = getNoise(ctx);
      filter.type = 'bandpass';
      filter.frequency.value = 3800;
      filter.Q.value = 1.5;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      src.connect(filter).connect(gain).connect(master);
      src.start(t);
      src.stop(t + 0.12);
    });
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
    document.dispatchEvent(new CustomEvent('toby:sound', { detail: { muted: muted } }));
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
     Responsive Chaos Mode: the 1999 version of the site. The CSS does the
     reshaping per screen size; this wires up the switch, the secret "1999"
     shortcut, the Start menu, the taskbar clock and the Tobygotchi buttons.
     ------------------------------------------------------------------------ */

  var chaosSwitch = document.getElementById('chaos-switch');
  var chaosStart = document.getElementById('chaos-start');
  var chaosMenu = document.getElementById('chaos-menu');
  var chaosClock = document.getElementById('chaos-clock');
  var clockTimer = 0;

  // A few square-wave chirps, like a dial-up modem saying hello.
  function modem() {
    [1200, 2100, 900, 2400, 1650, 2900].forEach(function (f, i) {
      ping(f, { delay: i * 0.07, duration: 0.09, volume: 0.05, type: 'square' });
    });
  }

  function tickClock() {
    chaosClock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function setChaos(on, quiet) {
    if (on) root.dataset.chaos = 'on';
    else delete root.dataset.chaos;
    chaosSwitch.setAttribute('aria-pressed', String(on));
    save('toby-chaos', on ? '1' : '0');
    document.dispatchEvent(new CustomEvent('toby:chaos', { detail: { on: on } }));
    clearInterval(clockTimer);
    if (on) { tickClock(); clockTimer = setInterval(tickClock, 20000); }
    closeStartMenu();
    if (quiet) return;
    if (on) { modem(); say('WELCOME 2 MY HOMEPAGE!!! Sign my guestbook!!!'); }
    else { ping(659.25, { duration: 0.5, volume: 0.14 }); say('Phew. Back to bedtime.'); }
  }

  function closeStartMenu() {
    chaosMenu.hidden = true;
    chaosStart.setAttribute('aria-expanded', 'false');
  }

  chaosSwitch.addEventListener('click', function () { setChaos(root.dataset.chaos !== 'on'); });
  setChaos(load('toby-chaos') === '1', true);

  chaosStart.addEventListener('click', function () {
    var open = chaosMenu.hidden;
    chaosMenu.hidden = !open;
    chaosStart.setAttribute('aria-expanded', String(open));
    if (open) chaosMenu.querySelector('a').focus();
  });
  chaosMenu.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeStartMenu();
  });
  document.getElementById('chaos-shutdown').addEventListener('click', function () {
    setChaos(false);
    chaosSwitch.focus();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !chaosMenu.hidden) { closeStartMenu(); chaosStart.focus(); }
  });
  document.addEventListener('click', function (event) {
    if (!chaosMenu.hidden && !event.target.closest('.chaos-taskbar')) closeStartMenu();
  });

  // Webring: Prev and Next go round the pages in a ring; Random picks another page
  var ringPages = Array.prototype.slice.call(document.querySelectorAll('[data-page]')).map(function (p) { return p.id; });
  var ringLinks = document.querySelectorAll('.chaos-ring a');
  document.addEventListener('toby:page', function (event) {
    var i = ringPages.indexOf(event.detail.id);
    ringLinks[0].href = '#' + ringPages[(i - 1 + ringPages.length) % ringPages.length];
    ringLinks[2].href = '#' + ringPages[(i + 1) % ringPages.length];
  });
  document.getElementById('chaos-random').addEventListener('click', function (event) {
    event.preventDefault();
    var others = ringPages.filter(function (id) { return '#' + id !== location.hash && !(id === 'top' && !location.hash); });
    location.hash = '#' + others[Math.floor(Math.random() * others.length)];
  });

  // Tobygotchi buttons
  document.getElementById('gotchi-a').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
  document.getElementById('gotchi-b').addEventListener('click', function () {
    if (location.hash && location.hash !== '#top') location.hash = '#top';
    window.scrollTo(0, 0);
    document.getElementById('boop').click();
  });
  document.getElementById('gotchi-c').addEventListener('click', function () { themeSwitch.click(); });

  // Secret: type 1999 anywhere (outside a text box) to toggle chaos mode
  var typed = '';
  document.addEventListener('keydown', function (event) {
    if (isTyping(event)) return;
    typed = (typed + event.key).slice(-4);
    if (typed === '1999') { typed = ''; setChaos(root.dataset.chaos !== 'on'); }
  });

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
     Chaos mode's 16-bit Toby: the painting is shrunk to ~104 pixels wide,
     then every pixel is matched to a 16-colour pastel palette with ordered
     (Bayer) dithering, like a 1995 console sprite. Made once, on demand.
     ------------------------------------------------------------------------ */

  var pixelCanvas = document.getElementById('pixel-toby');
  var PIXEL_PALETTE = [
    '#fbf3e6', '#f3e6cf', '#ffffff', '#ddd0f5', '#b9a3e3', '#8a6cc9', '#5b4596', '#cdeee2',
    '#a8e2cf', '#6fbfa3', '#f9d6e0', '#f5b5c6', '#ffd36e', '#d9a531', '#4a3530', '#2c1a17'
  ].map(function (hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; });
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var pixelMade = false;

  function makePixelToby() {
    if (pixelMade) return;
    var painting = portrait.querySelector('img');
    var draw = function () {
      var width = 104;
      var height = Math.round(width * painting.naturalHeight / painting.naturalWidth);
      pixelCanvas.width = width;
      pixelCanvas.height = height;
      var pen = pixelCanvas.getContext('2d');
      pen.imageSmoothingQuality = 'high';
      pen.drawImage(painting, 0, 0, width, height);
      var image = pen.getImageData(0, 0, width, height);
      var px = image.data;
      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var i = (y * width + x) * 4;
          var nudge = (BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 30;
          var r = px[i] + nudge;
          var g = px[i + 1] + nudge;
          var b = px[i + 2] + nudge;
          var best = PIXEL_PALETTE[0];
          var bestDistance = Infinity;
          for (var c = 0; c < PIXEL_PALETTE.length; c++) {
            var colour = PIXEL_PALETTE[c];
            var distance = (r - colour[0]) * (r - colour[0]) * 3 + (g - colour[1]) * (g - colour[1]) * 4 + (b - colour[2]) * (b - colour[2]) * 2;
            if (distance < bestDistance) { bestDistance = distance; best = colour; }
          }
          px[i] = best[0];
          px[i + 1] = best[1];
          px[i + 2] = best[2];
        }
      }
      pen.putImageData(image, 0, 0);
      pixelCanvas.classList.add('is-ready');
      pixelMade = true;
    };
    if (painting.complete && painting.naturalWidth) draw();
    else painting.addEventListener('load', draw, { once: true });
  }

  document.addEventListener('toby:chaos', function (event) { if (event.detail.on) makePixelToby(); });
  if (root.dataset.chaos === 'on') makePixelToby();

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

  // The confetti library only downloads the first time something is celebrated
  var confettiLoading = null;
  function loadConfetti() {
    if (window.confetti) return Promise.resolve(window.confetti);
    if (!confettiLoading) {
      confettiLoading = new Promise(function (resolve) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
        script.onload = function () { resolve(window.confetti || null); };
        script.onerror = function () { confettiLoading = null; resolve(null); }; // offline: no confetti, everything else still works
        document.head.appendChild(script);
      });
    }
    return confettiLoading;
  }

  function celebrate(origin) {
    loadConfetti().then(function (confetti) {
      if (!confetti) return;
      confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 38,
        origin: origin || { x: 0.3, y: 0.35 },
        shapes: ['star', 'circle'],
        colors: ['#ffd36e', '#b9a3e3', '#a8e2cf', '#f5b5c6', '#fff8f1'],
        scalar: 1.1,
        disableForReducedMotion: true
      });
    });
  }

  /* ------------------------------------------------------------------------
     Who page: tap Snorbit's photo in the baby book and he snores
     ------------------------------------------------------------------------ */

  var snorbitPhoto = document.getElementById('snorbit-photo');
  var snoreTimer = null;
  snorbitPhoto.addEventListener('click', function () {
    var ctx = getAudio();
    if (ctx) snore(ctx.currentTime);
    // Restart the animation even on quick repeat taps
    snorbitPhoto.classList.remove('is-snoring');
    void snorbitPhoto.offsetWidth;
    snorbitPhoto.classList.add('is-snoring');
    clearTimeout(snoreTimer);
    snoreTimer = setTimeout(function () { snorbitPhoto.classList.remove('is-snoring'); }, 1900);
  });

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

  var box = { tune: 'twinkle', tempo: 1, spring: 0, playing: false, loop: null, index: 0, beat: 0, time: 0, timer: 0, turnsShown: -1 };
  var combTeeth = Array.prototype.slice.call(document.querySelectorAll('#comb span'));
  var tempoInput = document.getElementById('tempo');
  var tempoName = document.getElementById('tempo-name');

  function turnsLeft() { return Math.ceil(box.spring / SECONDS_PER_TURN - 0.001); }

  // Full speed until the last turn, then slowing to just over half speed.
  function speed() {
    return box.spring >= SECONDS_PER_TURN ? 1 : 0.55 + 0.45 * Math.max(0, box.spring) / SECONDS_PER_TURN;
  }

  function timeAt(beat) { return box.time + (beat - box.beat) * 60 / (box.loop.bpm * box.tempo) / speed(); }

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
      setTimeout(function () {
        floatUp(Math.random() < 0.5 ? '♪' : '♫', 'note');
        pluck(event.freq);
      }, wait);
    }
  }

  // Light up the comb tooth for this pitch (higher notes, shorter teeth further right)
  function pluck(freq) {
    var note = 69 + 12 * Math.log2(freq / 440);
    var tooth = combTeeth[Math.max(0, Math.min(combTeeth.length - 1, Math.round((note - 72) / 2)))];
    tooth.classList.remove('is-plucked');
    void tooth.offsetWidth;
    tooth.classList.add('is-plucked');
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
    boxMedia.style.setProperty('--turn-time', (1.2 / (speed() * box.tempo)).toFixed(2) + 's');
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

  tempoInput.addEventListener('input', function () {
    box.tempo = parseFloat(tempoInput.value) || 1;
    tempoName.textContent = box.tempo < 0.85 ? 'Sleepy' : box.tempo > 1.15 ? 'Bouncy' : 'Cosy';
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
    document.dispatchEvent(new CustomEvent('toby:glow', { detail: { color: GLOWS[name] } }));
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

  // Star projector: stars and moons in the glow colour, turning slowly behind the whole site
  var projectorButton = document.getElementById('projector');
  var projectorLayer = document.getElementById('projector-layer');
  var lanternMedia = document.querySelector('.lantern-media');
  projectorButton.setAttribute('data-sound', 'own');

  for (var shape = 0; shape < 34; shape++) {
    var bit = document.createElement('span');
    bit.className = shape % 5 === 0 ? 'p-moon' : 'p-star';
    bit.style.left = (Math.random() * 96) + '%';
    bit.style.top = (Math.random() * 96) + '%';
    bit.style.setProperty('--size', (shape % 5 === 0 ? 34 + Math.random() * 30 : 14 + Math.random() * 26).toFixed(0) + 'px');
    projectorLayer.appendChild(bit);
  }

  projectorButton.addEventListener('click', function () {
    var on = projectorLayer.hidden;
    projectorLayer.hidden = !on;
    projectorButton.setAttribute('aria-pressed', String(on));
    projectorButton.textContent = 'Star projector: ' + (on ? 'on' : 'off');
    lanternMedia.classList.toggle('is-projecting', on);
    if (on) [523.25, 783.99, 1046.5, 1567.98].forEach(function (f, i) { ping(f, { delay: i * 0.12, duration: 1.2, volume: 0.1 }); });
    else ping(392, { duration: 0.4, volume: 0.1 });
  });
  window.addEventListener('resize', function () {
    if (!nightlightOn) return;
    light.radius = lightRadius();
    darkness.style.setProperty('--r', light.radius + 'px');
  });

  /* ------------------------------------------------------------------------
     Project 3: Rattle Blocks. Tap blocks to spell; four secret words each
     do something different. A block can be used once per word.
     ------------------------------------------------------------------------ */

  var blockRow = document.querySelector('.blocks');
  var blocks = Array.prototype.slice.call(blockRow.querySelectorAll('.block'));
  var blocksStatus = document.getElementById('blocks-status');
  var wordTray = document.getElementById('word-tray');
  var wordItems = Array.prototype.slice.call(document.querySelectorAll('.word'));
  var LETTER_NOTES = { T: 523.25, O: 587.33, B: 659.25, Y: 783.99, S: 880, N: 1046.5, R: 1174.66, I: 1318.5, H: 392, U: 440 };
  var spelled = '';
  var blocksBusy = false;
  var wordsFound = {};

  // Each secret word has its own tune and its own little surprise
  var WORDS = {
    TOBY: function () {
      [659.25, 783.99, 880, 783.99, 659.25].forEach(function (f, i) { ping(f, { delay: i * 0.18, duration: 0.9, volume: 0.15 }); });
      return 'T-O-B-Y! That spells me! (I knew that.)';
    },
    HUSH: function () {
      [783.99, 659.25, 523.25, 392].forEach(function (f, i) { ping(f, { delay: i * 0.3, duration: 1.4, volume: 0.09 }); });
      if (audio) snore(audio.currentTime + 1.3);
      return 'Hush\u2026 now you can hear Snorbit snoring.';
    },
    SHH: function () {
      // Everything goes properly quiet for a moment
      if (master && !muted) {
        master.gain.setTargetAtTime(0, audio.currentTime, 0.05);
        setTimeout(function () { if (!muted) master.gain.setTargetAtTime(0.6, audio.currentTime, 0.2); }, 2500);
      }
      return 'SHHH. \u2026 \u2026 Okay. You can make noise again.';
    },
    SNORBIT: function () {
      if (audio) snore(audio.currentTime);
      [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { ping(f, { delay: 0.8 + i * 0.08, duration: 0.8, volume: 0.13 }); });
      return 'Snorbit rolled over, said \u201cmrrf\u201d, and went straight back to sleep.';
    }
  };
  var WORD_LIST = Object.keys(WORDS);

  // Shuffle the blocks so nothing is spelled out already
  blocks.sort(function () { return Math.random() - 0.5; });
  blocks.forEach(function (b) { b.setAttribute('data-sound', 'own'); blockRow.appendChild(b); });

  function tipOut(message) {
    spelled = '';
    wordTray.textContent = '';
    wordTray.classList.remove('is-wrong', 'is-right');
    blocks.forEach(function (b) { b.classList.remove('is-used'); b.removeAttribute('aria-disabled'); });
    if (message) blocksStatus.textContent = message;
    blocksBusy = false;
  }

  blocks.forEach(function (block) {
    block.addEventListener('click', function () {
      rattle();
      block.classList.remove('is-rattling');
      void block.offsetWidth;
      block.classList.add('is-rattling');
      if (blocksBusy || block.classList.contains('is-used')) return;

      var letter = block.dataset.letter;
      ping(LETTER_NOTES[letter], { delay: 0.05, duration: 0.6, volume: 0.15 });
      spelled += letter;
      block.classList.add('is-used');
      block.setAttribute('aria-disabled', 'true');
      wordTray.textContent = spelled;

      var possible = WORD_LIST.filter(function (word) { return word.indexOf(spelled) === 0; });
      if (!possible.length) {
        blocksBusy = true;
        wordTray.classList.add('is-wrong');
        blocksStatus.textContent = 'Hmm, Toby doesn\u2019t know a word that starts with \u201c' + spelled + '\u201d.';
        setTimeout(function () { tipOut(); }, 1100);
        return;
      }
      if (possible.indexOf(spelled) === -1) {
        blocksStatus.textContent = spelled + '\u2026 keep going!';
        return;
      }

      // A whole secret word
      blocksBusy = true;
      wordTray.classList.add('is-right');
      blocksStatus.textContent = WORDS[spelled]();
      if (!wordsFound[spelled]) {
        markWordFound(spelled);
        blocksHint.textContent = '';
        save('toby-words', Object.keys(wordsFound).join(','));
        var box = wordTray.getBoundingClientRect();
        celebrate({ x: (box.left + box.width / 2) / window.innerWidth, y: box.top / window.innerHeight });
        if (Object.keys(wordsFound).length === WORD_LIST.length) {
          blocksStatus.textContent += ' That\u2019s every secret word!';
        }
      }
      setTimeout(function () { tipOut(); }, 1800);
    });
  });

  function markWordFound(word) {
    wordsFound[word] = true;
    wordItems.forEach(function (item) {
      if (item.dataset.word !== word) return;
      item.classList.add('is-found');
      item.textContent = word;
    });
  }
  // Hints: two per word (a riddle, then a letter clue) for the first word not found yet
  var HINTS = {
    TOBY: ['A 4-letter word: the name of a certain skull baby.', 'It starts with T and ends with Y.'],
    HUSH: ['A 4-letter word you whisper to help a baby fall asleep.', 'It starts and ends with H.'],
    SHH: ['The quietest word there is. Only 3 letters!', 'An S, then the same letter twice.'],
    SNORBIT: ['A 7-letter word: who is asleep on Toby\u2019s hat?', 'It starts with S-N-O.']
  };
  var hintsShown = {};
  var blocksHint = document.getElementById('blocks-hint');
  var hintButton = document.getElementById('blocks-hint-button');
  hintButton.setAttribute('data-sound', 'own');

  hintButton.addEventListener('click', function () {
    var waiting = WORD_LIST.filter(function (word) { return !wordsFound[word]; });
    if (!waiting.length) {
      blocksHint.textContent = 'You\u2019ve found every secret word! There are no more hiding in these blocks.';
      return;
    }
    // stay on a word until both its hints are used, then move to the next one
    var word = waiting.find(function (w) { return (hintsShown[w] || 0) < HINTS[w].length; }) || waiting[0];
    var shown = hintsShown[word] || 0;
    var level = Math.min(shown, HINTS[word].length - 1);
    hintsShown[word] = shown + 1;
    blocksHint.textContent = 'Hint ' + (level + 1) + ' of ' + HINTS[word].length + ': ' + HINTS[word][level];
    ping(783.99, { duration: 0.5, volume: 0.1 });
    ping(1046.5, { delay: 0.1, duration: 0.6, volume: 0.1 });
  });

  // Words found on earlier visits stay found
  (load('toby-words') || '').split(',').forEach(function (word) { if (WORDS[word]) markWordFound(word); });

  document.getElementById('blocks-clear').addEventListener('click', function () {
    tipOut('All tipped out. Start a new word.');
  });

  /* ------------------------------------------------------------------------
     Project 4: Star Catcher, a canvas mini-game
     Catch stars in the dream jar; three alarm clocks wake Snorbit and end
     the round. Movement is scaled by frame time, so speed is the same on
     every screen refresh rate.
     ------------------------------------------------------------------------ */

  var canvas = document.getElementById('game');
  var pen = canvas.getContext('2d');
  // Older Safari and Firefox lack roundRect; square corners are fine there.
  if (!pen.roundRect) pen.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  var gameOverlay = document.getElementById('game-overlay');
  var gameText = document.getElementById('game-text');
  var gameStart = document.getElementById('game-start');
  var gameScore = document.getElementById('game-score');
  var gameBest = document.getElementById('game-best');
  var gameWake = document.getElementById('game-wake');
  var WAKE_WORDS = ['Asleep', 'Stirring…', 'Grumpy!', 'AWAKE'];

  var game = {
    state: 'idle', // idle | playing | paused | over
    w: 0, h: 0,
    jarX: 0, jarW: 0, target: null,
    left: false, right: false,
    items: [], score: 0, noise: 0, elapsed: 0, untilSpawn: 0, last: 0, frame: 0, shake: 0,
    best: parseInt(load('toby-best-stars'), 10) || 0,
    sky: []
  };
  gameBest.textContent = game.best;

  function sizeGame() {
    var width = canvas.parentElement.clientWidth;
    if (!width) return; // its page is hidden; sized again when the page shows
    var height = Math.round(width * (width < 520 ? 1.1 : 0.75));
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = height + 'px';
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    game.jarX = game.w ? game.jarX * width / game.w : width / 2;
    game.w = width;
    game.h = height;
    game.jarW = Math.max(64, width * 0.17);
    game.sky = [];
    for (var i = 0; i < 40; i++) game.sky.push([Math.random() * width, Math.random() * height, Math.random() * 1.4 + 0.4]);
    drawGame();
  }

  function starPath(x, y, r, spin) {
    pen.beginPath();
    for (var i = 0; i < 10; i++) {
      var angle = spin + i * Math.PI / 5 - Math.PI / 2;
      var radius = i % 2 ? r * 0.45 : r;
      pen.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    pen.closePath();
  }

  function drawClock(item) {
    pen.save();
    pen.translate(item.x, item.y);
    pen.rotate(Math.sin(item.spin * 6) * 0.25); // ringing wobble
    pen.fillStyle = '#4a3530';
    pen.beginPath(); pen.arc(-item.r * 0.6, -item.r * 0.85, item.r * 0.38, 0, Math.PI * 2); pen.fill();
    pen.beginPath(); pen.arc(item.r * 0.6, -item.r * 0.85, item.r * 0.38, 0, Math.PI * 2); pen.fill();
    pen.fillStyle = '#f5b5c6';
    pen.strokeStyle = '#4a3530';
    pen.lineWidth = 3;
    pen.beginPath(); pen.arc(0, 0, item.r, 0, Math.PI * 2); pen.fill(); pen.stroke();
    pen.fillStyle = '#fffaf0';
    pen.beginPath(); pen.arc(0, 0, item.r * 0.72, 0, Math.PI * 2); pen.fill();
    pen.lineCap = 'round';
    pen.beginPath(); pen.moveTo(0, 0); pen.lineTo(0, -item.r * 0.5); pen.moveTo(0, 0); pen.lineTo(item.r * 0.35, item.r * 0.1); pen.stroke();
    pen.restore();
  }

  function drawJar() {
    var w = game.jarW;
    var h = w * 0.9;
    var x = game.jarX - w / 2 + (game.shake ? Math.sin(game.shake * 60) * 4 : 0);
    var y = game.h - h - 12;
    var fill = Math.min(0.75, 0.12 + game.score * 0.025);
    // glow from the stars inside
    pen.fillStyle = 'rgba(255, 211, 110, ' + fill + ')';
    pen.shadowColor = '#ffd36e';
    pen.shadowBlur = 10 + game.score;
    pen.beginPath(); pen.roundRect(x + 6, y + h * 0.35, w - 12, h * 0.6, 10); pen.fill();
    pen.shadowBlur = 0;
    // glass
    pen.strokeStyle = '#fff8f1';
    pen.lineWidth = 3;
    pen.fillStyle = 'rgba(255, 255, 255, 0.12)';
    pen.beginPath(); pen.roundRect(x, y + 10, w, h - 10, 14); pen.fill(); pen.stroke();
    // lid
    pen.fillStyle = '#8a6cc9';
    pen.beginPath(); pen.roundRect(x - 4, y, w + 8, 14, 6); pen.fill();
  }

  function drawGame() {
    var sky = pen.createLinearGradient(0, 0, 0, game.h);
    sky.addColorStop(0, '#171233');
    sky.addColorStop(1, '#3a2f6e');
    pen.fillStyle = sky;
    pen.fillRect(0, 0, game.w, game.h);
    pen.fillStyle = 'rgba(255, 255, 255, 0.55)';
    game.sky.forEach(function (s) { pen.fillRect(s[0], s[1], s[2], s[2]); });

    game.items.forEach(function (item) {
      if (item.kind === 'star') {
        pen.fillStyle = '#ffd36e';
        pen.shadowColor = '#ffd36e';
        pen.shadowBlur = 12;
        starPath(item.x, item.y, item.r, item.spin);
        pen.fill();
        pen.shadowBlur = 0;
      } else {
        drawClock(item);
      }
    });
    drawJar();
  }

  function spawnItem() {
    var clockChance = Math.min(0.38, 0.2 + game.elapsed * 0.004);
    var r = Math.max(12, game.w * 0.028);
    game.items.push({
      kind: Math.random() < clockChance ? 'clock' : 'star',
      x: r + Math.random() * (game.w - r * 2),
      y: -r,
      r: r,
      vy: game.h * (0.3 + Math.random() * 0.12 + Math.min(0.45, game.elapsed * 0.008)),
      spin: Math.random() * Math.PI
    });
  }

  function stepGame(now) {
    game.frame = 0;
    if (game.state !== 'playing') return;
    var dt = game.last ? Math.min(0.05, (now - game.last) / 1000) : 0;
    game.last = now;
    game.elapsed += dt;
    game.shake = Math.max(0, game.shake - dt);

    // move the jar: keys first, then glide towards the pointer
    var dir = (game.right ? 1 : 0) - (game.left ? 1 : 0);
    if (dir) { game.jarX += dir * game.w * 0.95 * dt; game.target = null; }
    else if (game.target !== null) game.jarX += (game.target - game.jarX) * Math.min(1, dt * 14);
    game.jarX = Math.max(game.jarW / 2, Math.min(game.w - game.jarW / 2, game.jarX));

    game.untilSpawn -= dt;
    if (game.untilSpawn <= 0) {
      spawnItem();
      game.untilSpawn = Math.max(0.32, 0.85 - game.elapsed * 0.012);
    }

    var jarTop = game.h - game.jarW * 0.9 - 12;
    game.items = game.items.filter(function (item) {
      item.y += item.vy * dt;
      item.spin += dt * 2;
      var inJar = item.y + item.r * 0.5 >= jarTop && item.y - item.r <= jarTop + 20 && Math.abs(item.x - game.jarX) < game.jarW / 2;
      if (inJar) { catchItem(item); return false; }
      return item.y - item.r < game.h;
    });

    drawGame();
    if (game.state === 'playing') game.frame = requestAnimationFrame(stepGame);
  }

  function catchItem(item) {
    if (item.kind === 'star') {
      game.score++;
      gameScore.textContent = game.score;
      ping(PENTATONIC[game.score % PENTATONIC.length] * 2, { duration: 0.5, volume: 0.12 });
      return;
    }
    game.noise++;
    game.shake = 0.35;
    gameWake.textContent = WAKE_WORDS[game.noise];
    ping(110, { duration: 0.35, volume: 0.2, type: 'square' });
    if (game.noise >= 3) endGame();
  }

  function showOverlay(text, buttonLabel) {
    gameText.textContent = text;
    gameStart.textContent = buttonLabel;
    gameOverlay.hidden = false;
  }

  function startGame() {
    getAudio();
    if (game.state !== 'paused') {
      game.items = [];
      game.score = 0;
      game.noise = 0;
      game.elapsed = 0;
      game.untilSpawn = 0.4;
      game.jarX = game.w / 2;
      gameScore.textContent = '0';
      gameWake.textContent = WAKE_WORDS[0];
    }
    game.state = 'playing';
    game.last = 0;
    gameOverlay.hidden = true;
    canvas.classList.add('is-playing');
    canvas.focus({ preventScroll: true });
    game.frame = requestAnimationFrame(stepGame);
  }

  function pauseGame() {
    if (game.state !== 'playing') return;
    game.state = 'paused';
    cancelAnimationFrame(game.frame);
    game.frame = 0;
    canvas.classList.remove('is-playing');
    showOverlay('Paused. Snorbit is still asleep.', 'Keep catching');
  }

  function endGame() {
    game.state = 'over';
    cancelAnimationFrame(game.frame);
    game.frame = 0;
    canvas.classList.remove('is-playing');
    [523.25, 392, 329.63, 261.63].forEach(function (f, i) { ping(f, { delay: i * 0.12, duration: 0.6, volume: 0.14 }); });
    var message = 'Snorbit woke up! You caught ' + game.score + (game.score === 1 ? ' star.' : ' stars.');
    if (game.score > game.best) {
      game.best = game.score;
      gameBest.textContent = game.best;
      save('toby-best-stars', String(game.best));
      message += ' That’s a new best!';
      var box = canvas.getBoundingClientRect();
      celebrate({ x: (box.left + box.width / 2) / window.innerWidth, y: (box.top + box.height / 2) / window.innerHeight });
    }
    showOverlay(message, 'Play again');
    gameStart.focus({ preventScroll: true });
  }

  gameStart.addEventListener('click', startGame);

  canvas.addEventListener('pointermove', function (event) {
    if (game.state !== 'playing') return;
    game.target = event.clientX - canvas.getBoundingClientRect().left;
  });
  canvas.addEventListener('pointerdown', function (event) {
    if (game.state !== 'playing') return;
    game.target = event.clientX - canvas.getBoundingClientRect().left;
  });
  canvas.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') { game.left = true; event.preventDefault(); }
    if (event.key === 'ArrowRight') { game.right = true; event.preventDefault(); }
  });
  canvas.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft') game.left = false;
    if (event.key === 'ArrowRight') game.right = false;
  });
  canvas.addEventListener('blur', function () { game.left = game.right = false; });

  // Pause when the game scrolls out of view or the tab is hidden.
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseGame(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) pauseGame();
    }, { threshold: 0.3 }).observe(canvas);
  }
  window.addEventListener('resize', function () {
    if (canvas.parentElement.clientWidth !== game.w) sizeGame();
  });
  sizeGame();
  function resizeGameIfShown() {
    var width = canvas.parentElement.clientWidth;
    if (width && width !== game.w) sizeGame();
  }
  document.addEventListener('toby:page', resizeGameIfShown);
  document.addEventListener('toby:project', resizeGameIfShown);

  /* ------------------------------------------------------------------------
     Project: Dream Delivery Routes
     Snorbit flies along the chosen SVG route (getPointAtLength), while the
     route's mask draws the dotted trail in behind him.
     ------------------------------------------------------------------------ */

  var routesMap = document.getElementById('routes-map');
  var flyer = document.getElementById('routes-flyer');
  var routesDream = document.getElementById('routes-dream');
  var routesCount = document.getElementById('routes-count');
  var routeChips = Array.prototype.slice.call(document.querySelectorAll('.route-chip'));
  var HOMES = {
    owl: { place: "the owl's tree", who: 'Professor Hoot', dream: 'a library where every book is a pillow' },
    mouse: { place: 'the mouse house', who: 'The Nibble family', dream: 'a cheese moon, close enough to nibble' },
    bunny: { place: 'the bunny burrow', who: 'Clover the bunny', dream: 'a carrot rocket with extra-soft landings' },
    frog: { place: 'the frog pond', who: 'Lily the frog', dream: 'singing lead in the firefly choir' },
    moon: { place: 'the moon', who: 'The Moon herself', dream: 'a full night’s sleep, for once' }
  };
  var dreaming = {};
  var dreamingCount = 0;
  var routeFlying = false;
  flyer.innerHTML = SNORBIT_SVG;

  function setRouteChipsBusy(busy) {
    routeChips.forEach(function (chip) { chip.setAttribute('aria-disabled', String(busy)); });
  }

  function deliverDream(home) {
    if (routeFlying || !HOMES[home]) return;
    var route = routesMap.querySelector('.route[data-route="' + home + '"]');
    var reveal = routesMap.querySelector('.route-reveal[data-route="' + home + '"]');
    var length = route.getTotalLength();
    var duration = reduceMotion.matches ? 0 : 2400;
    var started = performance.now();
    var lastSparkle = 0;

    routeFlying = true;
    setRouteChipsBusy(true);
    routesDream.textContent = 'Snorbit is flying to ' + HOMES[home].place + '…';
    swish();

    function step(now) {
      var t = duration ? Math.min(1, (now - started) / duration) : 1;
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var point = route.getPointAtLength(length * eased);
      var ahead = route.getPointAtLength(Math.min(length, length * eased + 3));
      flyer.style.left = (point.x / 800 * 100) + '%';
      flyer.style.top = (point.y / 480 * 100) + '%';
      flyer.style.transform = 'translate(-50%, -62%) scaleX(' + (ahead.x < point.x - 0.1 ? -1 : 1) + ')';
      reveal.style.strokeDashoffset = String(1 - eased);
      if (now - lastSparkle > 90 && t < 1) {
        lastSparkle = now;
        var box = flyer.getBoundingClientRect();
        sparkleAt(box.left + box.width / 2, box.top + box.height / 2);
      }
      if (t < 1) requestAnimationFrame(step);
      else arriveWithDream(home);
    }
    requestAnimationFrame(step);
  }

  function arriveWithDream(home) {
    var info = HOMES[home];
    routeFlying = false;
    setRouteChipsBusy(false);
    routesMap.querySelector('.home[data-home="' + home + '"]').classList.add('is-dreaming');
    routeChips.forEach(function (chip) { if (chip.dataset.home === home) chip.classList.add('is-done'); });
    [783.99, 1046.5, 1318.5].forEach(function (f, i) { ping(f, { delay: i * 0.1, duration: 0.8, volume: 0.13 }); });

    var message = info.who + ' is dreaming of ' + info.dream + '.';
    if (!dreaming[home]) {
      dreaming[home] = true;
      dreamingCount++;
      if (dreamingCount === 5) {
        message += ' That’s every home in Hushbury. Night shift complete!';
        var box = routesMap.getBoundingClientRect();
        celebrate({ x: (box.left + box.width / 2) / window.innerWidth, y: (box.top + box.height / 3) / window.innerHeight });
      }
    }
    routesDream.textContent = message;
    routesCount.textContent = dreamingCount + ' of 5 homes dreaming';
  }

  routeChips.forEach(function (chip) {
    chip.addEventListener('click', function () { deliverDream(chip.dataset.home); });
  });
  // Pointer users can also click the homes on the map (the buttons cover keyboard users)
  routesMap.addEventListener('click', function (event) {
    var home = event.target.closest && event.target.closest('.home');
    if (home) deliverDream(home.dataset.home);
  });

  /* ------------------------------------------------------------------------
     Project: Toby's Growth Chart. Marks rise to their heights each time the
     project opens; tapping one opens Toby's note about it.
     ------------------------------------------------------------------------ */

  var growthWall = document.getElementById('growth-wall');
  var markButtons = Array.prototype.slice.call(document.querySelectorAll('.mark-button'));
  var notebookTitle = document.getElementById('notebook-title');
  var notebookHeight = document.getElementById('notebook-height');
  var notebookNote = document.getElementById('notebook-note');

  markButtons.forEach(function (button, i) {
    button.closest('.mark').style.setProperty('--i', i);
    button.setAttribute('data-sound', 'own');
    button.addEventListener('click', function () {
      markButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      notebookTitle.textContent = button.textContent.trim();
      notebookHeight.textContent = 'Height: ' + button.dataset.size;
      notebookNote.textContent = button.dataset.note;
      scribble();
    });
  });

  document.addEventListener('toby:project', function (event) {
    if (event.detail.id !== 'growth-chart') return;
    growthWall.classList.remove('is-measured');
    void growthWall.offsetWidth;
    setTimeout(function () { growthWall.classList.add('is-measured'); }, 60);
  });

  /* ------------------------------------------------------------------------
     Project 5: Snorbit's storybook, a flipbook
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
    face.dataset.page = pageSources.indexOf(source); // which recording reads this page
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
    if (event.key === 'ArrowRight') { manualTurn(1); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { manualTurn(-1); event.preventDefault(); }
  }

  // Swipe or click: right side turns forward, left side turns back.
  var bookPointer = null;
  function onBookDown(event) { bookPointer = { x: event.clientX, y: event.clientY }; }
  function onBookUp(event) {
    if (!bookPointer) return;
    var dx = event.clientX - bookPointer.x;
    var dy = event.clientY - bookPointer.y;
    bookPointer = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { manualTurn(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      var box = book.stage.getBoundingClientRect();
      manualTurn(event.clientX > box.left + box.width / 2 ? 1 : -1);
    }
  }

  bookPrev.addEventListener('click', function () { manualTurn(-1); });
  bookNext.addEventListener('click', function () { manualTurn(1); });
  if (spreadQuery.addEventListener) spreadQuery.addEventListener('change', buildBook);
  buildBook();

  // "Read it to me": Cori, an AI voice made with Piper, reads each open page
  // from a recording (assets/story/page-N.m4a, made by tools/make_story_audio.py),
  // then turns the page. Every visitor hears the same cosy voice.
  var readButton = document.getElementById('book-read');
  var bookStatus = document.getElementById('book-status');
  var narration = new Audio(); // one element, reused, so browsers allow each page to play
  narration.preload = 'none';
  var reading = false;
  var readTimer = 0;
  readButton.setAttribute('data-sound', 'own');

  // The last open page is one leaf before the end (the back cover, or The End on phones)
  function atLastPage() { return book.turned >= book.leaves.length - 1; }

  // Page numbers (0 = cover) of the pages open right now, left page first
  function openPageNumbers() {
    var faces = book.stage.querySelectorAll('.face[aria-hidden="false"][data-page]');
    return Array.prototype.map.call(faces, function (face) { return Number(face.dataset.page); })
      .sort(function (x, y) { return x - y; });
  }

  // A very quiet, slow Toby's Theme on the music box underneath the reading
  var storyBed = { timer: 0, gain: null, loop: null, index: 0, time: 0, beat: 0 };

  function startStoryBed() {
    var ctx = getAudio();
    if (!ctx || box.playing) return; // don't clash with the real music box
    storyBed.gain = ctx.createGain();
    storyBed.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    storyBed.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
    storyBed.gain.connect(master);
    storyBed.loop = buildLoop('toby');
    storyBed.index = 0;
    storyBed.beat = 0;
    storyBed.time = ctx.currentTime + 0.3;
    clearInterval(storyBed.timer);
    storyBed.timer = setInterval(function () {
      var secondsPerBeat = 60 / 58; // slower than the music box's 88
      var horizon = ctx.currentTime + (document.hidden ? 1.5 : 0.3);
      while (true) {
        if (storyBed.index >= storyBed.loop.events.length) {
          storyBed.time += (storyBed.loop.length - storyBed.beat) * secondsPerBeat;
          storyBed.index = 0;
          storyBed.beat = 0;
        }
        var event = storyBed.loop.events[storyBed.index];
        var at = storyBed.time + (event.beat - storyBed.beat) * secondsPerBeat;
        if (at > horizon) break;
        storyBed.time = at;
        storyBed.beat = event.beat;
        ping(event.freq, { at: at, duration: event.bass ? 2.2 : 1.8, volume: event.bass ? 0.025 : 0.045, dest: storyBed.gain });
        storyBed.index++;
      }
    }, 60);
  }

  function stopStoryBed() {
    clearInterval(storyBed.timer);
    var fading = storyBed.gain;
    storyBed.gain = null;
    if (!fading || !audio) return;
    fading.gain.cancelScheduledValues(audio.currentTime);
    fading.gain.setValueAtTime(fading.gain.value, audio.currentTime);
    fading.gain.linearRampToValueAtTime(0.0001, audio.currentTime + 1.2);
    setTimeout(function () { fading.disconnect(); }, 1400);
  }

  // Play the recording for each open page, then turn the page and carry on
  function readOpenPages() {
    if (!reading) return;
    var queue = openPageNumbers();

    function playNext() {
      if (!reading) return;
      var page = queue.shift();
      if (page === undefined) { finishedPages(); return; }
      narration.src = 'assets/story/page-' + page + '.m4a';
      narration.onended = function () { readTimer = setTimeout(playNext, 500); };
      narration.onerror = function () { stopReading('The story recording didn\u2019t load. Check your connection and try again.'); };
      var playing = narration.play();
      if (playing && playing.catch) {
        playing.catch(function (error) {
          if (reading && error.name !== 'AbortError') stopReading('Your browser paused the story. Press Read it to me again.');
        });
      }
    }

    function finishedPages() {
      if (atLastPage()) { stopReading('The end. Shh, Snorbit is asleep.'); return; }
      readTimer = setTimeout(function () {
        if (!reading) return;
        turn(1);
        readTimer = setTimeout(readOpenPages, 1100); // let the page land, then take a breath
      }, 800);
    }

    playNext();
  }

  function stopReading(message) {
    reading = false;
    clearTimeout(readTimer);
    narration.pause();
    stopStoryBed();
    readButton.setAttribute('aria-pressed', 'false');
    readButton.textContent = 'Read it to me';
    bookStatus.textContent = message || '';
  }

  function manualTurn(direction) {
    if (reading) stopReading('Stopped reading. Turn the pages yourself, or press Read it to me again.');
    turn(direction);
  }

  readButton.addEventListener('click', function () {
    if (reading) { stopReading(); return; }
    if (muted) { bookStatus.textContent = 'Turn the sound on to hear the story.'; return; }
    reading = true;
    readButton.setAttribute('aria-pressed', 'true');
    readButton.textContent = 'Stop reading';
    bookStatus.textContent = 'Snuggle in\u2026 reading quietly.';
    if (atLastPage()) {
      book.turned = 0; // start again from the cover
      renderBook(true);
    }
    startStoryBed();
    readOpenPages();
  });

  // Stop when the sound is muted or the storybook is closed
  document.addEventListener('toby:sound', function (event) { if (event.detail.muted && reading) stopReading('Muted, so I stopped reading.'); });
  document.addEventListener('toby:project', function (event) { if (event.detail.id !== 'storybook' && reading) stopReading(); });
  document.addEventListener('toby:page', function (event) { if (event.detail.id !== 'work' && reading) stopReading(); });

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
  document.addEventListener('toby:page', updateSky);

  // The picture-book stage acts out whichever scene is being read
  var storyStage = document.getElementById('story-stage');

  function playScene(number) {
    if (storyStage.dataset.scene === String(number)) return;
    storyStage.dataset.scene = String(number); // the CSS animations for that scene start now
    // Small sounds, only once the visitor has turned sound on by clicking something
    if (!audio || muted) return;
    if (number === 1) ping(1567.98, { delay: 1.35, duration: 1.4, volume: 0.1 }); // the star lands
    if (number === 3) {
      [659.25, 783.99, 880, 783.99, 659.25, 587.33].forEach(function (f, i) {
        ping(f, { delay: 1.6 + i * 0.42, duration: 1.2, volume: 0.09 }); // the teacup lullaby
      });
    }
  }

  if ('IntersectionObserver' in window) {
    // The reading band sits in the lower half of the screen, below the pinned stage on phones
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
        if (entry.isIntersecting) playScene(scenes.indexOf(entry.target) + 1);
      });
    }, { rootMargin: '-50% 0px -20% 0px' });
    scenes.forEach(function (scene) { sceneObserver.observe(scene); });
  } else {
    scenes.forEach(function (scene) { scene.classList.add('is-active'); });
    playScene(4);
  }
  // Coming back to the story starts it from the beginning
  document.addEventListener('toby:page', function (event) {
    if (event.detail.id === 'story') storyStage.dataset.scene = '0';
  });

  /* ------------------------------------------------------------------------
     Sparkle trail: stars and tiny bones behind a mouse pointer
     ------------------------------------------------------------------------ */

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var TRAIL_COLOURS = ['#ffd36e', '#b9a3e3', '#a8e2cf', '#f5b5c6'];
  var BONE = '<svg viewBox="0 0 36 20"><path d="M7 3a4 4 0 0 1 4 4h14a4 4 0 1 1 4 6 4 4 0 1 1-4 6H11a4 4 0 1 1-4-6 4 4 0 1 1 0-10z" transform="translate(0 -3)"/></svg>';
  var lastSparkle = 0;
  var liveSparkles = 0;

  // One sparkle (a star, sometimes a tiny bone) at a screen position
  function sparkleAt(x, y) {
    if (reduceMotion.matches || liveSparkles > 40) return;
    var bit = document.createElement('span');
    var isBone = Math.random() < 0.18;
    bit.className = 'trail ' + (isBone ? 'trail-bone' : 'trail-star');
    bit.setAttribute('aria-hidden', 'true');
    if (isBone) bit.innerHTML = BONE;
    else bit.style.setProperty('--c', root.dataset.chaos === 'on'
      ? 'hsl(' + Math.floor(Math.random() * 360) + ' 100% 62%)'
      : TRAIL_COLOURS[Math.floor(Math.random() * TRAIL_COLOURS.length)]);
    bit.style.left = x + 'px';
    bit.style.top = y + 'px';
    liveSparkles++;
    bit.addEventListener('animationend', function () { bit.remove(); liveSparkles--; });
    document.body.appendChild(bit);
  }

  window.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse' || !finePointer.matches) return;
    var now = performance.now();
    if (now - lastSparkle < 45 || liveSparkles > 28) return;
    lastSparkle = now;
    sparkleAt(event.clientX, event.clientY);
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

  // Until the real visitor count arrives (or if it can't), tick "dreams delivered".
  var dreamTicker = setInterval(function () {
    if (document.hidden) return;
    dreams += 1 + Math.floor(Math.random() * 3);
    renderDreams();
  }, 4000);

  function showVisitorNumber(visits) {
    clearInterval(dreamTicker);
    document.getElementById('counter-label').textContent = 'You are visitor number';
    dreams = visits;
    renderDreams();
  }

  /* ------------------------------------------------------------------------
     Live guestbook and visitor counter, stored in Supabase.
     The anon key is meant to be public: the database rules in
     supabase/setup.sql only let visitors read wishes, add wishes, and add
     one to the counter.
     ------------------------------------------------------------------------ */

  var SUPABASE_URL = 'https://agnjfijwdyiujviraosh.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbmpmaWp3ZHlpdWp2aXJhb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzkyNTQsImV4cCI6MjEwNzgxNTI1NH0.fRisguhKbORO63VmfT0C_29yzaSgYgR8s7EBS8wy9Y0';

  function supabase(path, options) {
    options = options || {};
    var headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (options.prefer) headers.Prefer = options.prefer;
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error('Supabase ' + response.status);
      return response.status === 204 ? null : response.json();
    });
  }

  // Count each browser once per session, so reloading doesn't inflate the number.
  (function countVisit() {
    var counted = null;
    try { counted = sessionStorage.getItem('toby-visitor-number'); } catch (e) {}
    if (counted) { showVisitorNumber(parseInt(counted, 10)); return; }
    supabase('rpc/count_visit', { method: 'POST', body: {} })
      .then(function (visits) {
        if (typeof visits !== 'number') return;
        try { sessionStorage.setItem('toby-visitor-number', String(visits)); } catch (e) {}
        showVisitorNumber(visits);
      })
      .catch(function () { /* offline: the dreams ticker keeps going */ });
  })();

  var wishForm = document.getElementById('wish-form');
  var wishName = document.getElementById('wish-name');
  var wishMessage = document.getElementById('wish-message');
  var wishCount = document.getElementById('wish-count');
  var wishStatus = document.getElementById('wish-status');
  var wishSubmit = document.getElementById('wish-submit');
  var wishWall = document.getElementById('wish-wall');
  wishSubmit.setAttribute('data-sound', 'own');

  var timeAgo = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
  function whenText(iso) {
    var seconds = (new Date(iso).getTime() - Date.now()) / 1000;
    if (!timeAgo) return new Date(iso).toLocaleDateString();
    var units = [['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      if (Math.abs(seconds) >= units[i][1]) return timeAgo.format(Math.round(seconds / units[i][1]), units[i][0]);
    }
    return 'just now';
  }

  // Built with textContent only, so nobody can inject HTML into the wall.
  function wishNote(wish, isNew) {
    var li = document.createElement('li');
    li.className = 'wish' + (isNew ? ' is-new' : '');
    var message = document.createElement('p');
    message.className = 'wish-message';
    message.textContent = wish.message;
    var meta = document.createElement('p');
    meta.className = 'wish-meta';
    meta.textContent = wish.name + ' ';
    var time = document.createElement('time');
    time.dateTime = wish.created_at;
    time.textContent = whenText(wish.created_at);
    meta.appendChild(time);
    li.appendChild(message);
    li.appendChild(meta);
    return li;
  }

  function wallMessage(text) {
    wishWall.textContent = '';
    var li = document.createElement('li');
    li.className = 'wish-empty';
    li.textContent = text;
    wishWall.appendChild(li);
  }

  function loadWishes() {
    supabase('guestbook?select=name,message,created_at&order=created_at.desc&limit=30')
      .then(function (wishes) {
        wishWall.setAttribute('aria-busy', 'false');
        if (!wishes.length) { wallMessage('No wishes yet. Pin the very first one!'); return; }
        wishWall.textContent = '';
        wishes.forEach(function (wish) { wishWall.appendChild(wishNote(wish, false)); });
      })
      .catch(function () {
        wishWall.setAttribute('aria-busy', 'false');
        wallMessage("The wall didn't load. Check your connection and refresh the page.");
      });
  }
  // Fetch the wall the first time the guestbook page opens, not on every visit
  var wishesLoaded = false;
  document.addEventListener('toby:page', function (event) {
    if (event.detail.id !== 'guestbook' || wishesLoaded) return;
    wishesLoaded = true;
    loadWishes();
  });

  function updateWishCount() {
    var left = 140 - wishMessage.value.length;
    wishCount.textContent = left + (left === 1 ? ' character left' : ' characters left');
  }
  wishMessage.addEventListener('input', updateWishCount);

  wishForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = wishName.value.trim();
    var message = wishMessage.value.trim();

    if (!name) { wishStatus.textContent = 'Add your name so Toby knows who wished.'; wishName.focus(); return; }
    if (!message) { wishStatus.textContent = 'Write a wish first. Even a tiny one counts.'; wishMessage.focus(); return; }
    if (wishForm.elements.website.value) { wishForm.reset(); return; } // a bot filled the hidden field

    var lastWish = parseInt(load('toby-last-wish'), 10) || 0;
    var wait = Math.ceil((lastWish + 30000 - Date.now()) / 1000);
    if (wait > 0) { wishStatus.textContent = 'Toby is still pinning your last wish. Try again in ' + wait + ' seconds.'; return; }

    wishSubmit.disabled = true;
    wishStatus.textContent = 'Pinning your wish…';
    supabase('guestbook', { method: 'POST', body: { name: name, message: message }, prefer: 'return=representation' })
      .then(function (rows) {
        save('toby-last-wish', String(Date.now()));
        var empty = wishWall.querySelector('.wish-empty');
        if (empty) empty.remove();
        wishWall.insertBefore(wishNote(rows[0], true), wishWall.firstChild);
        wishForm.reset();
        updateWishCount();
        wishStatus.textContent = 'Pinned! Toby will try to dream it tonight.';
        [659.25, 783.99, 1046.5].forEach(function (f, i) { ping(f, { delay: i * 0.08, duration: 0.6, volume: 0.13 }); });
      })
      .catch(function () {
        wishStatus.textContent = "Your wish didn't stick. Check your connection and try again.";
      })
      .then(function () { wishSubmit.disabled = false; });
  });

  /* ------------------------------------------------------------------------
     3D Toby: the home card flips over to a Three.js model (toby3d.js).
     Three.js only downloads the first time someone asks for it. If the
     browser can't do 3D, the card flips back to the painting.
     ------------------------------------------------------------------------ */

  var flipCard = document.getElementById('flip-card');
  var view3d = document.getElementById('view-3d');
  var stage3d = document.getElementById('toby-3d');
  var status3d = document.getElementById('toby-3d-status');
  var toby3d = null;
  var loading3d = null;
  var showing3d = false;

  stage3d.setAttribute('role', 'img');
  stage3d.setAttribute('aria-label', '3D Toby sitting on a cloud. Use the left and right arrow keys to spin him, and Enter to boop him.');

  function load3d() {
    if (toby3d) return Promise.resolve(toby3d);
    if (loading3d) return loading3d;
    status3d.textContent = 'Building Toby in 3D\u2026';
    loading3d = import('./toby3d.js')
      .then(function (module) {
        toby3d = module.createToby3D(stage3d, {
          retro: root.dataset.chaos === 'on',
          reduceMotion: reduceMotion.matches,
          glow: getComputedStyle(root).getPropertyValue('--glow').trim() || '#ffcf66',
          onBoop: function () { giggle(); say(boopLines[boopIndex++ % boopLines.length]); }
        });
        status3d.textContent = 'Drag to spin me. Tap to boop.';
        return toby3d;
      })
      .catch(function () {
        status3d.textContent = 'This browser can\u2019t show 3D, so here\u2019s my painting.';
        loading3d = null;
        setTimeout(function () { set3d(false); }, 2200);
        return null;
      });
    return loading3d;
  }

  function set3d(on) {
    showing3d = on;
    flipCard.classList.toggle('is-flipped', on);
    view3d.textContent = on ? 'Back to the painting' : 'View in 3D';
    view3d.setAttribute('aria-pressed', String(on));
    portrait.inert = on;
    stage3d.inert = !on;
    if (on) {
      stage3d.tabIndex = 0;
      load3d().then(function (model) { if (model && showing3d) model.start(); });
    } else if (toby3d) {
      toby3d.stop();
    }
  }

  view3d.addEventListener('click', function () { set3d(!showing3d); });

  stage3d.addEventListener('keydown', function (event) {
    if (!toby3d) return;
    if (event.key === 'ArrowLeft') { toby3d.spinBy(-0.12); event.preventDefault(); }
    if (event.key === 'ArrowRight') { toby3d.spinBy(0.12); event.preventDefault(); }
    if (event.key === 'Enter' || event.key === ' ') { toby3d.boop(); event.preventDefault(); }
  });

  document.addEventListener('toby:chaos', function (event) { if (toby3d) toby3d.setRetro(event.detail.on); });
  document.addEventListener('toby:glow', function (event) { if (toby3d) toby3d.setGlow(event.detail.color); });
  // Only animate while the home page is showing
  document.addEventListener('toby:page', function (event) {
    if (!toby3d || !showing3d) return;
    if (event.detail.id === 'top') toby3d.start();
    else toby3d.stop();
  });

  /* ------------------------------------------------------------------------
     Easter eggs
     ------------------------------------------------------------------------ */

  // 1. Leave the page alone for 45 seconds and Toby dozes off.
  var IDLE_MS = 45000;
  var idleTimer = 0;
  var zTimer = 0;
  var asleep = false;
  var brandText = document.getElementById('brand-text');
  var BRAND = brandText.textContent;

  function yawn() {
    if (muted || !audio) return;
    var t = audio.currentTime;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.9);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 1.05);
  }

  function floatZ() {
    var z = document.createElement('span');
    z.className = 'sleep-z';
    z.setAttribute('aria-hidden', 'true');
    z.textContent = 'z';
    z.style.right = (8 + Math.random() * 14) + '%';
    z.addEventListener('animationend', function () { z.remove(); });
    portrait.appendChild(z);
  }

  function fallAsleep() {
    if (document.hidden) { resetIdle(); return; }
    asleep = true;
    root.classList.add('toby-asleep');
    brandText.textContent = 'toby is napping\u2026';
    say('zzz\u2026 (Toby dozed off. Wiggle the mouse to wake him.)');
    floatZ();
    zTimer = setInterval(floatZ, 1400);
  }

  function wakeUp() {
    asleep = false;
    root.classList.remove('toby-asleep');
    brandText.textContent = BRAND;
    clearInterval(zTimer);
    say('*yawn* I wasn\u2019t asleep. I was testing my eyelids.');
    yawn();
  }

  function resetIdle() {
    if (asleep) wakeUp();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(fallAsleep, IDLE_MS);
  }
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(function (type) {
    window.addEventListener(type, resetIdle, { passive: true });
  });
  resetIdle();

  // 2. Konami code: Snorbit sleep-flies loop-the-loops across the screen.
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var konamiStep = 0;

  function flySnorbit() {
    var dragon = document.createElement('div');
    dragon.className = 'flying-snorbit';
    dragon.innerHTML = SNORBIT_SVG;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var canFly = window.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0L1 1")');

    if (reduceMotion.matches) {
      dragon.classList.add('is-still');
      setTimeout(function () { dragon.remove(); }, 3000);
    } else if (canFly) {
      // in from the left, a loop-the-loop in the middle, out to the right
      dragon.style.offsetPath = 'path("M -150 ' + h * 0.7 +
        ' C ' + w * 0.2 + ' ' + h * 0.75 + ', ' + w * 0.35 + ' ' + h * 0.2 + ', ' + w * 0.5 + ' ' + h * 0.25 +
        ' C ' + w * 0.66 + ' ' + h * 0.3 + ', ' + w * 0.63 + ' ' + h * 0.66 + ', ' + w * 0.5 + ' ' + h * 0.62 +
        ' C ' + w * 0.37 + ' ' + h * 0.58 + ', ' + w * 0.38 + ' ' + h * 0.3 + ', ' + w * 0.56 + ' ' + h * 0.3 +
        ' C ' + w * 0.76 + ' ' + h * 0.3 + ', ' + w * 0.86 + ' ' + h * 0.5 + ', ' + (w + 160) + ' ' + h * 0.45 + '")';
    } else {
      dragon.classList.add('is-simple');
    }
    document.body.appendChild(dragon);

    var trail = setInterval(function () {
      var box = dragon.getBoundingClientRect();
      sparkleAt(box.left + box.width / 2, box.top + box.height / 2);
    }, 70);
    dragon.addEventListener('animationend', function (event) {
      if (event.target !== dragon) return; // ignore the wing flaps
      clearInterval(trail);
      dragon.remove();
    });
    if (reduceMotion.matches) clearInterval(trail);

    say('SNORBIT?! He\u2019s flying\u2026 and still fast asleep. Sleep-flying!');
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { ping(f, { delay: i * 0.11, duration: 1, volume: 0.13 }); });
    swish();
  }

  document.addEventListener('keydown', function (event) {
    if (isTyping(event)) return;
    var key = event.key.toLowerCase();
    if (key === KONAMI[konamiStep]) {
      konamiStep++;
      if (konamiStep === KONAMI.length) { konamiStep = 0; flySnorbit(); }
    } else {
      konamiStep = key === KONAMI[0] ? 1 : 0;
    }
  });

  // 3. Midnight visitor: between 12 and 1am (or with ?midnight in the address)
  if (new Date().getHours() === 0 || new URLSearchParams(location.search).has('midnight')) {
    root.classList.add('is-midnight');
    if (root.dataset.theme !== 'night') { root.dataset.theme = 'night'; renderTheme(); }
    say('A fellow night owl! It\u2019s past midnight, so these are my office hours. Help me tuck in the sky?');
    var shooting = document.createElement('div');
    shooting.className = 'shooting-stars';
    shooting.setAttribute('aria-hidden', 'true');
    for (var s = 0; s < 5; s++) {
      var streak = document.createElement('span');
      streak.className = 'shooting-star';
      streak.style.left = (45 + Math.random() * 55) + '%';
      streak.style.top = (Math.random() * 40) + '%';
      streak.style.animationDelay = (s * 1.4 + Math.random()).toFixed(2) + 's';
      shooting.appendChild(streak);
    }
    document.body.appendChild(shooting);
  }

  // 4. A note for anyone who opens the developer tools
  console.log('%c' + [
    '        _.--~~--._        ',
    '      .\' *  .  * \'.  o   ',
    '     /  .  *   .   \\__/   ',
    '    |==============|      ',
    '    |   .-.   .-.  |      ',
    '    |  ( * ) ( * ) |      ',
    '    |   \'-\' ^ \'-\'  |      ',
    '     \\   \\_v__v_/  /       ',
    '      \'-.______.-\'        '
  ].join('\n'), 'font-family: monospace; font-size: 12px; line-height: 1.25; color: #8a6cc9');
  console.log('%cPsst, curious grown-up! Toby hid some secrets on this site:', 'font: bold 14px sans-serif; color: #d9a531');
  console.log([
    '\u2022 Tap Snorbit (the dragon on Toby\u2019s hat) three times',
    '\u2022 Type 1999 anywhere',
    '\u2022 Up Up Down Down Left Right Left Right B A',
    '\u2022 Sit very still for 45 seconds',
    '\u2022 Visit between midnight and 1am (or add ?midnight to the address)',
    '\u2022 Turn off the big light and charge every glow sticker',
    '\u2022 Spell T-O-B-Y with the rattle blocks',
    '\u2022 Open 3D Toby, then switch on chaos mode',
    '\u2022 In TobyChat, ask Toby to wake up Snorbit'
  ].join('\n'));

  /* ------------------------------------------------------------------------
     TobyChat 99: a scripted chat. Each reply rule matches keywords in what
     you type (most specific first); some replies link to a page, and a few
     secret commands do things. No AI service: it's all written by hand.
     ------------------------------------------------------------------------ */

  var chatLauncher = document.getElementById('chat-launcher');
  var chatPanel = document.getElementById('chat');
  var chatLog = document.getElementById('chat-log');
  var chatForm = document.getElementById('chat-form');
  var chatInput = document.getElementById('chat-input');
  var chatTyping = document.getElementById('chat-typing');
  var chatGreeted = false;
  var chatBusy = false;
  var replyTurns = {};

  var SECRET_HINTS = [
    'Psst. Tap Snorbit on my hat three times. Quickly.',
    'Try typing 1999 anywhere on the page. Not in here, though!',
    'Up, up, down, down, left, right, left, right, B, A. Snorbit loves that one.',
    'If you sit very still for 45 seconds, I might doze off.',
    'Come back between midnight and 1am. I’m always up then.',
    'There are four secret words hidden in my rattle blocks. One of them makes everything go quiet.',
    'Turn off the big light on my lantern page and look for glow stickers.'
  ];

  // [pattern, reply or list of replies, optional { href, label } link, optional action]
  var CHAT_RULES = [
    [/wake (up )?snorbit|snorbit,? wake/, ['Shh! Oh no… he’s sleep-flying again.'], null, function () { flySnorbit(); }],
    [/lights? (off|out)|turn off the light/, ['Click! Ooh, cosy.'], null, function () { if (root.dataset.theme !== 'night') themeSwitch.click(); }],
    [/lights? on|turn on the light/, ['Too bright! But okay.'], null, function () { if (root.dataset.theme === 'night') themeSwitch.click(); }],
    [/are you (real|an? ai|a bot|a robot|human)|chat ?gpt|\bbot\b|robot/, ['I’m a skull baby, not a robot. I’m made of soft bones and a bit of code, like a music box made of words.']],
    [/how are (you|u)|how’?s it going|you ok/, ['Sleepy, cosy and slightly sticky from warm milk. Thanks for asking!']],
    [/joke|funny|make me laugh/, ['Why didn’t the skeleton go to the party? He had no BODY to go with. (I do, though. It’s in pyjamas.)', 'What does a baby skeleton drink before bed? Warm MILK. Calcium! Get it?', 'Why are skeletons so calm? Nothing gets under their skin.']],
    [/secret|easter|\begg|hint|cheat|hidden|surprise/, SECRET_HINTS],
    [/snorbit|dragon|sidekick|\bpet\b/, ['Snorbit is my pocket-sized dragon. He has been asleep since we met, and he snores in tune. He keeps my head warm.', 'Snorbit sleeps on my hat, my music box and my lantern. Not at the same time. Probably.']],
    [/skull|skeleton|bones?|scary|spooky|creepy|ghost|halloween/, ['I’m a skull baby, but not a scary one! My bones are soft and my fangs are only for biting cookies.']],
    [/who are you|your name|what are you|about you|yourself/, ['I’m Toby: a skull baby with two stars where my eyes should be. I’m the Lullaby Tinkerer at the Cloud Cradle Workshop.'], { href: '#who', label: 'Read my character sheet' }],
    [/how old|\bage\b|birthday/, ['Nearly one! I was born on the softest night of the year.']],
    [/music ?box|lullab|song|sing|\bhum|tune|melody/, ['My music box plays three lullabies. Wind it up and it slows down as the spring runs out, just like a real one.'], { href: '#music-box', label: 'Wind up the Toby Box' }],
    [/lantern|night ?light|glow|projector/, ['The Moonbell Lantern glows in any colour you like. It can even project stars all over the website.'], { href: '#lantern', label: 'Visit the lantern' }],
    [/block|spell|\bword|rattle/, ['My rattle blocks hide four secret words. Each one does something different. One of them is my name!'], { href: '#rattle-blocks', label: 'Play with the blocks' }],
    [/game|star catcher|catch|\bplay\b/, ['Star Catcher! Catch falling stars in my dream jar, but dodge the alarm clocks or Snorbit wakes up.'], { href: '#star-catcher', label: 'Play Star Catcher' }],
    [/deliver|route|\bmap\b|\bowl\b|mouse|bunny|frog|hushbury|neighbou?r/, ['Every night Snorbit and I fly dreams to every home in Hushbury. The Moon herself gets one too.'], { href: '#dream-routes', label: 'Send Snorbit flying' }],
    [/grow|chart|skill|\btall|height|measure|good at/, ['I measure my skills on the nursery wall. Humming: very tall. Staying awake: tiny.'], { href: '#growth-chart', label: 'See my growth chart' }],
    [/storybook|bedtime story|\bbook\b|\bread\b/, ['I wrote Snorbit a bedtime story. He has never heard the ending. It can even read itself to you.'], { href: '#storybook', label: 'Open the storybook' }],
    [/story|born|origin|where.*from|\bsock|how did you/, ['I started as a falling star that landed in a warm sock. By morning the sock had giggled and turned into me!'], { href: '#story', label: 'Read my whole story' }],
    [/\b3d\b|three|model|spin/, ['Press View in 3D under my picture on the home page. You can spin me round! Gently, please.'], { href: '#top', label: 'Go to the home page' }],
    [/1999|chaos|retro|90s|nineties|geocities|pixel/, ['Ooh, you like the old internet? Press the sparkle button at the top for chaos mode. I turn into pixels!']],
    [/guestbook|wish|\bsign\b/, ['Leave me a dream wish on my nursery wall! I read every single one.'], { href: '#guestbook', label: 'Sign the guestbook' }],
    [/job|work|what do you do|tinker|workshop|cloud cradle|make/, ['I build music boxes, nightlights and toys that help the little creatures of Hushbury fall asleep. Everything on my shelf really works.'], { href: '#work', label: 'See my toy shelf' }],
    [/sleep|tired|\bnap|bed ?time|yawn|night night/, ['*yawns* Don’t say sleep, it’s contagious… zzz… wait, I’m awake!']],
    [/\blike|love|favou?rite|milk|food|\beat\b/, ['I love warm milk, humming and glow-in-the-dark stickers. I don’t love cold socks or too much quiet.']],
    [/sound|mute|quiet|noise/, ['There’s a speaker button at the top if you need quiet. I’ll hum very softly instead.']],
    // greetings only win when nothing more specific matched
    [/\b(hi|hello|hey|hiya|howdy|yo|good (morning|evening|afternoon))\b/, ['Hi! *yawn* I’m Toby. Ask me about my toys, Snorbit, or my story.', 'Hello hello! You found my chat window. Very few people do.']],
    [/thank|thx|\bty\b|cheers/, ['You’re welcome! *happy bone rattle*']],
    [/bye|goodnight|good night|see (you|ya)|later|gotta go/, ['Goodnight! Sleep tight, and don’t let the alarm clocks bite.']]
  ];
  var FALLBACKS = [
    'Hmm, I’m a baby, so I only know some words. Try asking about Snorbit, my toys, or a secret!',
    'I didn’t quite get that. I was probably half asleep. Ask me about my music box?',
    '*tilts head* Could you say that in baby? Try “tell me a joke”.'
  ];

  function pickReply(text) {
    var said = text.toLowerCase();
    for (var i = 0; i < CHAT_RULES.length; i++) {
      var rule = CHAT_RULES[i];
      if (!rule[0].test(said)) continue;
      var turn = replyTurns[i] || 0; // take the replies in turn, so they don't repeat back to back
      replyTurns[i] = turn + 1;
      return { text: rule[1][turn % rule[1].length], link: rule[2] || null, action: rule[3] || null };
    }
    var t = replyTurns.fallback || 0;
    replyTurns.fallback = t + 1;
    return { text: FALLBACKS[t % FALLBACKS.length] };
  }

  function addMessage(from, text, link) {
    var item = document.createElement('div');
    item.className = 'chat-msg' + (from === 'you' ? ' from-you' : '');
    var who = document.createElement('span');
    who.className = 'chat-who';
    who.textContent = from === 'you' ? 'You' : 'Toby';
    item.appendChild(who);
    item.appendChild(document.createTextNode(text));
    if (link) {
      item.appendChild(document.createElement('br'));
      var go = document.createElement('a');
      go.className = 'chat-go';
      go.href = link.href;
      go.textContent = link.label;
      // on phones the chat covers the page, so close it to show where we went
      go.addEventListener('click', function () { if (window.innerWidth <= 640) closeChat(false); });
      item.appendChild(go);
    }
    chatLog.appendChild(item);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function tobySays(reply) {
    chatBusy = true;
    chatTyping.hidden = false;
    var delay = Math.min(1600, 450 + reply.text.length * 12);
    setTimeout(function () {
      chatTyping.hidden = true;
      addMessage('toby', reply.text, reply.link);
      ping(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], { duration: 0.4, volume: 0.1 });
      if (reply.action) reply.action();
      chatBusy = false;
    }, delay);
  }

  function sendToToby(text) {
    text = text.trim();
    if (!text || chatBusy) return;
    addMessage('you', text);
    tobySays(pickReply(text));
  }

  function openChat() {
    chatPanel.hidden = false;
    chatLauncher.setAttribute('aria-expanded', 'true');
    if (!chatGreeted) {
      chatGreeted = true;
      var back = (parseInt(load('toby-visits'), 10) || 0) > 1;
      tobySays({ text: (back ? 'Welcome back! ' : 'Hi! I’m Toby. ') + 'Ask me anything about my toys, Snorbit, my story… or my secrets.' });
    }
    chatInput.focus();
  }

  function closeChat(returnFocus) {
    chatPanel.hidden = true;
    chatLauncher.setAttribute('aria-expanded', 'false');
    if (returnFocus !== false) chatLauncher.focus();
  }

  chatLauncher.setAttribute('data-sound', 'own');
  chatLauncher.addEventListener('click', function () { openChat(); ping(1046.5, { duration: 0.3, volume: 0.1 }); });
  document.getElementById('chat-close').addEventListener('click', function () { closeChat(); });
  chatPanel.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeChat(); });
  chatForm.addEventListener('submit', function (event) {
    event.preventDefault();
    sendToToby(chatInput.value);
    chatInput.value = '';
  });
  Array.prototype.forEach.call(document.querySelectorAll('.chat-chip'), function (chip) {
    chip.setAttribute('data-sound', 'own');
    chip.addEventListener('click', function () { sendToToby(chip.textContent); });
  });

  /* ------------------------------------------------------------------------
     Returning visitors: Toby remembers how many times you've visited, when
     you were last here, and something you did (stored in this browser only).
     ------------------------------------------------------------------------ */

  (function rememberVisitor() {
    var visits = parseInt(load('toby-visits'), 10) || 0;
    var lastVisit = load('toby-last-visit');
    var newSession = true;
    try {
      newSession = !sessionStorage.getItem('toby-here');
      sessionStorage.setItem('toby-here', '1');
    } catch (e) { /* no session storage: treat every load as a visit */ }
    if (!newSession) return;

    visits++;
    save('toby-visits', String(visits));
    save('toby-last-visit', new Date().toISOString());
    if (visits < 2 || root.classList.contains('is-midnight')) return; // the midnight greeting wins

    var memories = [];
    var foundWords = (load('toby-words') || '').split(',').filter(Boolean).length;
    if (foundWords) memories.push('You\u2019ve found ' + foundWords + ' of my 4 secret words.');
    var best = parseInt(load('toby-best-stars'), 10);
    if (best) memories.push('Your best Star Catcher score is ' + best + '.');
    if (load('toby-found-snorbit')) memories.push('You woke Snorbit once. He\u2019s still talking about it.');

    var line = 'Welcome back! This is visit number ' + visits + '.';
    if (lastVisit) line += ' Last time was ' + whenText(lastVisit) + '.';
    if (memories.length) line += ' ' + memories[Math.floor(Math.random() * memories.length)];
    say(line);
  })();

  /* ------------------------------------------------------------------------
     Pages: each section is its own page, picked by the address-bar hash
     (#who, #work...), so links, bookmarks and the back button all work.
     Without JavaScript every section simply shows, one after another.
     Runs last, so every feature above is ready before the first page shows.
     ------------------------------------------------------------------------ */

  var pages = Array.prototype.slice.call(document.querySelectorAll('[data-page]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var currentPage = null;
  var BASE_TITLE = document.title;

  function turnLink(page, prefix, classes) {
    var link = document.createElement('a');
    link.className = 'button ' + classes;
    link.href = '#' + page.id;
    link.textContent = prefix + page.dataset.page;
    return link;
  }

  // Previous and next page buttons at the bottom of every page
  pages.forEach(function (page, i) {
    var turner = document.createElement('nav');
    turner.className = 'page-turner';
    turner.setAttribute('aria-label', 'More pages');
    if (i > 0) turner.appendChild(turnLink(pages[i - 1], 'Previous: ', 'button-quiet'));
    if (i < pages.length - 1) turner.appendChild(turnLink(pages[i + 1], 'Next: ', 'button-primary turn-next'));
    (page.querySelector('.story-inner') || page).appendChild(turner);
  });

  // Which page holds this id? (The id may be the page itself or something inside it.)
  function findPage(id) {
    if (!id) return { page: pages[0], target: null };
    var target = document.getElementById(id);
    if (!target) return { page: pages[0], target: null };
    var page = target.closest('[data-page]');
    if (!page) return null; // e.g. the skip link's #main: leave the current page alone
    return { page: page, target: target === page ? null : target };
  }

  /* The Work page has two modes: the toy shelf (#work) or one project (#music-box...) */
  var workPage = document.getElementById('work');
  var shelf = document.getElementById('shelf');
  var projectEls = Array.prototype.slice.call(workPage.querySelectorAll('.project'));
  var currentProject = null;

  function projectName(project) { return project.querySelector('.project-title').textContent; }

  projectEls.forEach(function (project, i) {
    var back = document.createElement('a');
    back.className = 'button button-quiet project-back';
    back.href = '#work';
    back.textContent = 'Back to the toy shelf';
    project.insertBefore(back, project.firstChild);

    var turner = document.createElement('nav');
    turner.className = 'project-turner';
    turner.setAttribute('aria-label', 'More projects');
    var prev = projectEls[(i - 1 + projectEls.length) % projectEls.length];
    var next = projectEls[(i + 1) % projectEls.length];
    var prevLink = document.createElement('a');
    prevLink.className = 'button button-quiet';
    prevLink.href = '#' + prev.id;
    prevLink.textContent = 'Previous: ' + projectName(prev);
    var nextLink = document.createElement('a');
    nextLink.className = 'button button-primary turn-next';
    nextLink.href = '#' + next.id;
    nextLink.textContent = 'Next: ' + projectName(next);
    turner.appendChild(prevLink);
    turner.appendChild(nextLink);
    project.appendChild(turner);
  });

  function showProject(project) {
    workPage.classList.toggle('is-shelf', !project);
    shelf.hidden = !!project;
    projectEls.forEach(function (p) { p.hidden = p !== project; });
    if (project !== currentProject) {
      currentProject = project;
      document.dispatchEvent(new CustomEvent('toby:project', { detail: { id: project ? project.id : null } }));
    }
  }

  function showPage(fromClick) {
    var found = findPage(decodeURIComponent(location.hash.slice(1)));
    if (!found) return;
    var page = found.page;
    var project = page === workPage && found.target ? found.target.closest('.project') : null;

    if (page !== currentPage) {
      pages.forEach(function (p) { p.hidden = p !== page; });
      currentPage = page;
      navLinks.forEach(function (link) {
        if (link.getAttribute('href') === '#' + page.id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      document.dispatchEvent(new CustomEvent('toby:page', { detail: { id: page.id } }));
    }
    if (page === workPage) showProject(project);

    document.title = project ? projectName(project) + ' | ' + BASE_TITLE
      : page === pages[0] ? BASE_TITLE
      : page.dataset.page + ' | ' + BASE_TITLE;

    var arriving = project || page;
    if (fromClick) {
      arriving.classList.remove('is-entering');
      void arriving.offsetWidth; // restart the page-turn animation
      arriving.classList.add('is-entering');
    }

    // Instant, not smooth: a new page should simply start in the right place
    if (found.target && !project) found.target.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'instant' });

    // Move screen readers to the new page's (or project's) heading
    if (fromClick) {
      var heading = project ? project.querySelector('.project-title') : page.querySelector('h1');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  window.addEventListener('hashchange', function () { showPage(true); });
  showPage(false);
})();
