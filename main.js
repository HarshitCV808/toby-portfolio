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
  document.addEventListener('toby:page', updateSky);

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
  loadWishes();

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
    '\u2022 Open 3D Toby, then switch on chaos mode'
  ].join('\n'));

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

  function projectName(project) { return project.querySelector('h3').textContent; }

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
      var heading = project ? project.querySelector('h3') : page.querySelector('h1, h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  window.addEventListener('hashchange', function () { showPage(true); });
  showPage(false);
})();
