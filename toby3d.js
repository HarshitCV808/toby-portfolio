/* 3D Toby, built from simple shapes with Three.js.
   Loaded only when someone presses "View in 3D" (see main.js), so visitors
   who never open it never download Three.js.
   Two looks: a soft clay toy, and chunky low-poly for chaos mode. */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const COLORS = {
  bone: 0xfbf3e6,
  socket: 0x2c1a17,
  lavender: 0xb9a3e3,
  mint: 0xa8e2cf,
  cream: 0xf6efe6,
  blush: 0xf5b5c6,
  pajama: 0xcfc6f2,
  feet: 0xb6a6e6,
  cloudPink: 0xf6d3e6,
  cloudLilac: 0xe4d8f8,
  butter: 0xffd36e
};

export function createToby3D(container, options) {
  const opts = Object.assign({ retro: false, reduceMotion: false, glow: '#ffcf66', onBoop() {} }, options);

  // Throws when the browser has no WebGL; main.js catches that and shows the painting instead.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.1, 9.6);
  camera.lookAt(0, -0.3, 0);

  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xcbb8f2, 1.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xd9c8ff, 1.3);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  let retro = opts.retro;
  let model = null;
  let disposables = [];

  /* ---------- Building blocks ---------- */

  function track(thing) {
    disposables.push(thing);
    return thing;
  }

  function material(color, extra) {
    return track(retro
      ? new THREE.MeshPhongMaterial(Object.assign({ color, flatShading: true, shininess: 0 }, extra))
      : new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, extra)));
  }

  // Low-poly mode simply uses far fewer segments, so every surface turns faceted.
  function sphere(radius) {
    return track(new THREE.SphereGeometry(radius, retro ? 7 : 40, retro ? 5 : 28));
  }

  function mesh(geometry, mat, position, scale, rotation) {
    const m = new THREE.Mesh(geometry, mat);
    if (position) m.position.set(position[0], position[1], position[2]);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    if (rotation) m.rotation.set(rotation[0], rotation[1], rotation[2]);
    return m;
  }

  function starGeometry(outer, inner, depth) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? inner : outer;
      if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: !retro,
      bevelThickness: depth * 0.4,
      bevelSize: outer * 0.12,
      bevelSegments: 2
    });
    geometry.center();
    return track(geometry);
  }

  // Lavender and mint stripes, wrapped round the cap
  function stripeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 8;
    const pen = canvas.getContext('2d');
    for (let i = 0; i < 8; i++) {
      pen.fillStyle = i % 2 ? '#a8e2cf' : '#b9a3e3';
      pen.fillRect(i * 32, 0, 32, 8);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    if (retro) texture.magFilter = texture.minFilter = THREE.NearestFilter;
    return track(texture);
  }

  /* ---------- Toby ---------- */

  // Snorbit, curled up asleep: tail wrapped round his body, head resting on it
  function buildSnorbit() {
    const snorbit = new THREE.Group();
    const purple = material(COLORS.lavender);
    const mint = material(COLORS.mint);
    const dark = material(COLORS.socket);

    const body = mesh(sphere(0.28), purple, [0, 0, 0], [1.25, 0.65, 1]);
    snorbit.add(body);
    // the tail curls round the front, ending in a spade tip
    const tail = mesh(track(new THREE.TorusGeometry(0.32, 0.075, retro ? 5 : 12, retro ? 10 : 32, Math.PI * 1.15)), purple, [0, -0.06, 0], null, [Math.PI / 2, 0, -0.3]);
    snorbit.add(tail);
    snorbit.add(mesh(track(new THREE.ConeGeometry(0.08, 0.14, 3)), mint, [-0.34, -0.06, 0.18], [1, 1, 0.35], [Math.PI / 2, 0, 0.9]));
    // head resting on the tail
    snorbit.add(mesh(sphere(0.17), purple, [0.3, 0.06, 0.2]));
    snorbit.add(mesh(sphere(0.09), purple, [0.43, 0.02, 0.27], [1.15, 0.85, 1]));
    const horn = track(new THREE.ConeGeometry(0.035, 0.13, retro ? 4 : 10));
    snorbit.add(mesh(horn, mint, [0.24, 0.22, 0.13], null, [-0.3, 0, 0.45]));
    snorbit.add(mesh(horn, mint, [0.33, 0.22, 0.24], null, [0, 0, -0.1]));
    const lid = track(new THREE.TorusGeometry(0.035, 0.011, 6, 12, Math.PI));
    snorbit.add(mesh(lid, dark, [0.32, 0.09, 0.36], null, [0, 0.25, Math.PI]));
    snorbit.add(mesh(lid, dark, [0.42, 0.1, 0.33], null, [0, 0.6, Math.PI]));
    snorbit.add(mesh(sphere(0.035), material(COLORS.blush), [0.3, 0.02, 0.36], [1, 0.6, 0.4]));
    // wings folded along his back, and little spikes
    const wing = track(new THREE.ConeGeometry(0.16, 0.36, 3));
    snorbit.add(mesh(wing, mint, [-0.05, 0.16, -0.08], [1, 1, 0.28], [0.25, 0, -1.25]));
    snorbit.add(mesh(wing, mint, [0.02, 0.15, 0.1], [1, 1, 0.28], [-0.25, 0, -1.15]));
    const spike = track(new THREE.ConeGeometry(0.04, 0.09, retro ? 3 : 8));
    [[-0.26, 0.13], [-0.13, 0.17], [0.0, 0.18]].forEach((p) => snorbit.add(mesh(spike, mint, [p[0], p[1], -0.02], null, [0, 0, 0.3])));

    snorbit.userData.body = body;
    return snorbit;
  }

  function buildCap() {
    const cap = new THREE.Group();
    cap.position.set(0, 0.38, 0);
    cap.rotation.z = 0.12; // slouched a little to one side

    const striped = material(0xffffff, { map: stripeTexture() });
    cap.add(mesh(
      track(new THREE.SphereGeometry(1.04, retro ? 8 : 48, retro ? 4 : 24, 0, Math.PI * 2, 0, Math.PI * 0.44)),
      striped, [0, 0, 0], [1.06, 1.05, 1.02]
    ));
    cap.add(mesh(track(new THREE.TorusGeometry(1.07, 0.15, retro ? 4 : 16, retro ? 10 : 56)), material(COLORS.mint), [0, 0.22, 0], null, [Math.PI / 2, 0, 0]));

    // The floppy tail: tapering cylinders along a curve, alternating colours like stripes
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.95, 0),
      new THREE.Vector3(-0.55, 1.3, -0.05),
      new THREE.Vector3(-1.2, 1.05, -0.1),
      new THREE.Vector3(-1.5, 0.35, -0.05),
      new THREE.Vector3(-1.45, -0.25, 0.05)
    ]);
    const stripes = [material(COLORS.lavender), material(COLORS.mint)];
    const steps = retro ? 7 : 12;
    const up = new THREE.Vector3(0, 1, 0);
    const radiusAt = (t) => 0.5 - 0.37 * t;
    for (let i = 0; i < steps; i++) {
      const a = curve.getPoint(i / steps);
      const b = curve.getPoint((i + 1) / steps);
      const dir = b.clone().sub(a);
      const segment = mesh(
        track(new THREE.CylinderGeometry(radiusAt((i + 1) / steps), radiusAt(i / steps), dir.length(), retro ? 6 : 24)),
        stripes[i % 2]
      );
      segment.position.copy(a).add(b).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(up, dir.normalize());
      cap.add(segment);
      // a ball at each joint hides the seams
      const joint = mesh(sphere(radiusAt((i + 1) / steps)), stripes[i % 2]);
      joint.position.copy(b);
      cap.add(joint);
    }
    const end = curve.getPoint(1);
    cap.add(mesh(track(new THREE.IcosahedronGeometry(0.28, retro ? 0 : 3)), material(COLORS.cream), [end.x, end.y - 0.22, end.z]));

    const snorbit = buildSnorbit();
    snorbit.position.set(0.12, 1.1, 0.22);
    snorbit.rotation.set(-0.28, -0.35, 0.05);
    snorbit.scale.setScalar(1.3);
    cap.add(snorbit);

    return { cap, snorbit };
  }

  function build() {
    const group = new THREE.Group();
    group.position.x = 0.25;
    const bone = material(COLORS.bone);
    const dark = material(COLORS.socket);
    // eye sockets get a glossy finish, like the painting's shiny eyes
    const glossy = retro ? dark : track(new THREE.MeshStandardMaterial({ color: COLORS.socket, roughness: 0.25, metalness: 0.1 }));

    // Skull head and little jaw
    group.add(mesh(sphere(1), bone, [0, 0.35, 0], [1.1, 1, 1.02]));
    group.add(mesh(sphere(0.66), bone, [0, -0.12, 0.06], [1.05, 0.8, 0.92]));

    // Eye sockets with glowing star pupils (they follow the pointer) and catch-lights
    const pupilMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.glow) }));
    const shine = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const pupils = [];
    [-1, 1].forEach((side) => {
      group.add(mesh(sphere(0.3), glossy, [side * 0.37, 0.31, 0.86], [1, 1.08, 0.45], [0, side * 0.34, 0]));
      const pupil = mesh(starGeometry(0.125, 0.055, 0.03), pupilMat, [side * 0.37, 0.31, 1.01], null, [0, side * 0.34, 0]);
      pupil.userData.home = pupil.position.clone();
      pupils.push(pupil);
      group.add(pupil);
      group.add(mesh(sphere(0.04), shine, [side * 0.37 - 0.1, 0.44, 1.0]));
      group.add(mesh(sphere(0.02), shine, [side * 0.37 + 0.09, 0.2, 1.0]));
    });

    // Nose, crooked smile, little fangs, blush
    group.add(mesh(track(new THREE.ConeGeometry(0.07, 0.11, 3)), dark, [0, 0.06, 0.97], null, [Math.PI, 0, 0]));
    group.add(mesh(track(new THREE.TorusGeometry(0.17, 0.025, 8, 24, Math.PI)), dark, [0.03, -0.1, 0.9], null, [0, 0, Math.PI + 0.1]));
    const fang = track(new THREE.ConeGeometry(0.042, 0.1, retro ? 4 : 12));
    const white = material(0xffffff);
    group.add(mesh(fang, white, [-0.07, -0.3, 0.9], null, [Math.PI + 0.2, 0, 0]));
    group.add(mesh(fang, white, [0.13, -0.28, 0.9], null, [Math.PI + 0.2, 0, 0]));
    const blush = material(COLORS.blush, { transparent: true, opacity: 0.75 });
    group.add(mesh(sphere(0.15), blush, [-0.6, 0.02, 0.76], [1, 0.62, 0.35]));
    group.add(mesh(sphere(0.15), blush, [0.6, 0.02, 0.76], [1, 0.62, 0.35]));

    // Nightcap and Snorbit
    const { cap, snorbit } = buildCap();
    group.add(cap);

    // Pyjama body, feet and star buttons
    group.add(mesh(sphere(0.72), material(COLORS.pajama), [0, -1.15, 0], [1, 0.9, 0.85]));
    group.add(mesh(track(new THREE.TorusGeometry(0.36, 0.08, retro ? 4 : 12, retro ? 8 : 32)), material(COLORS.mint), [0, -0.56, 0.08], null, [Math.PI / 2 + 0.25, 0, 0]));
    const feet = material(COLORS.feet);
    group.add(mesh(sphere(0.24), feet, [-0.34, -1.74, 0.45], [1, 0.8, 1.3]));
    group.add(mesh(sphere(0.24), feet, [0.34, -1.74, 0.45], [1, 0.8, 1.3]));
    const button = starGeometry(0.075, 0.032, 0.02);
    const butter = material(COLORS.butter);
    group.add(mesh(button, butter, [0.24, -0.98, 0.66], null, [0, 0.3, 0.2]));
    group.add(mesh(button, butter, [-0.18, -1.3, 0.66], null, [0, -0.2, -0.3]));

    // Little arms: the lantern in one hand, the music box in the other
    const sleeve = material(COLORS.pajama);
    const cuff = material(COLORS.mint);
    function arm(from, to) {
      const a = new THREE.Vector3(from[0], from[1], from[2]);
      const b = new THREE.Vector3(to[0], to[1], to[2]);
      const dir = b.clone().sub(a);
      const limb = mesh(track(new THREE.CapsuleGeometry(0.13, dir.length(), retro ? 3 : 8, retro ? 6 : 16)), sleeve);
      limb.position.copy(a).add(b).multiplyScalar(0.5);
      limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      group.add(limb);
      const ring = mesh(track(new THREE.TorusGeometry(0.13, 0.05, retro ? 4 : 10, retro ? 8 : 24)), cuff);
      ring.position.copy(b);
      ring.quaternion.copy(limb.quaternion);
      ring.rotateX(Math.PI / 2);
      group.add(ring);
      group.add(mesh(sphere(0.11), bone, [to[0], to[1] - 0.04, to[2] + 0.02]));
    }
    arm([-0.55, -0.82, 0.18], [-0.82, -1.08, 0.55]);
    arm([0.55, -0.82, 0.18], [0.74, -1.1, 0.58]);

    // A mini Moonbell Lantern that really glows in the chosen colour
    const lantern = new THREE.Group();
    lantern.position.set(-0.86, -1.62, 0.6);
    const glassMat = track(new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: new THREE.Color(opts.glow), emissiveIntensity: 0.9, roughness: 0.4 }));
    lantern.add(mesh(track(new THREE.CylinderGeometry(0.21, 0.24, 0.1, retro ? 6 : 24)), material(COLORS.cream), [0, -0.18, 0]));
    lantern.add(mesh(track(new THREE.CylinderGeometry(0.17, 0.2, 0.32, retro ? 6 : 24)), glassMat, [0, 0, 0]));
    lantern.add(mesh(track(new THREE.ConeGeometry(0.2, 0.16, retro ? 6 : 24)), material(COLORS.lavender), [0, 0.24, 0]));
    lantern.add(mesh(track(new THREE.TorusGeometry(0.06, 0.018, 6, 16)), material(COLORS.butter), [0, 0.38, 0]));
    const lanternLight = new THREE.PointLight(new THREE.Color(opts.glow), 2.2, 3.2, 1.6);
    lanternLight.position.set(0, 0.02, 0.1);
    lantern.add(lanternLight);
    group.add(lantern);

    // The music box, with its gold wind-up key
    const musicBox = new THREE.Group();
    musicBox.position.set(0.86, -1.42, 0.58);
    musicBox.rotation.y = -0.45;
    musicBox.add(mesh(track(new THREE.BoxGeometry(0.46, 0.28, 0.34)), material(COLORS.cream), [0, 0, 0]));
    musicBox.add(mesh(track(new THREE.BoxGeometry(0.5, 0.07, 0.38)), material(COLORS.lavender), [0, 0.17, 0]));
    musicBox.add(mesh(track(new THREE.BoxGeometry(0.5, 0.06, 0.38)), material(COLORS.lavender), [0, -0.16, 0]));
    musicBox.add(mesh(sphere(0.07), material(COLORS.lavender), [0, 0.25, 0], [1.3, 0.7, 1]));
    const gold = material(COLORS.butter);
    musicBox.add(mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8)), gold, [0.29, 0, 0], null, [0, 0, Math.PI / 2]));
    musicBox.add(mesh(track(new THREE.TorusGeometry(0.06, 0.02, 6, 16)), gold, [0.37, 0, 0], null, [0, Math.PI / 2, 0]));
    group.add(musicBox);

    // The cloud Toby sits on
    [[-0.9, -2.0, 0.2, 0.55], [0, -2.1, 0.4, 0.62], [0.9, -2.0, 0.2, 0.55], [-0.45, -1.85, -0.3, 0.5], [0.5, -1.85, -0.3, 0.5], [0, -2.0, -0.1, 0.6]]
      .forEach((c, i) => group.add(mesh(sphere(c[3]), material(i % 2 ? COLORS.cloudLilac : COLORS.cloudPink), [c[0], c[1], c[2]], [1, 0.65, 1])));

    // A soft shadow under the cloud
    const shade = document.createElement('canvas');
    shade.width = shade.height = 64;
    const shadePen = shade.getContext('2d');
    const fade = shadePen.createRadialGradient(32, 32, 0, 32, 32, 32);
    fade.addColorStop(0, 'rgba(60, 40, 90, 0.45)');
    fade.addColorStop(1, 'rgba(60, 40, 90, 0)');
    shadePen.fillStyle = fade;
    shadePen.fillRect(0, 0, 64, 64);
    const shadowMat = track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(shade)), transparent: true, depthWrite: false }));
    group.add(mesh(track(new THREE.PlaneGeometry(3.4, 1.6)), shadowMat, [0, -2.42, 0.1], null, [-Math.PI / 2, 0, 0]));

    // Stars drifting round him
    const orbit = new THREE.Group();
    const glowStar = track(new THREE.MeshBasicMaterial({ color: COLORS.butter }));
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const star = mesh(starGeometry(0.12, 0.05, 0.04), glowStar, [Math.cos(angle) * 1.65, 1.2 - i * 0.55, Math.sin(angle) * 1.65]);
      orbit.add(star);
    }
    group.add(orbit);

    return { group, pupils, pupilMat, glassMat, lanternLight, snorbitBody: snorbit.userData.body, orbit };
  }

  function rebuild() {
    if (model) scene.remove(model.group);
    disposables.forEach((thing) => thing.dispose());
    disposables = [];
    model = build();
    scene.add(model.group);
    container.classList.toggle('is-retro', retro);
    resize();
  }

  /* ---------- Size ---------- */

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    // Low-poly mode renders at a fraction of the resolution for chunky 1999 pixels
    renderer.setPixelRatio(retro ? 0.4 : Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }
  const sizeWatcher = new ResizeObserver(resize);
  sizeWatcher.observe(container);

  /* ---------- Interaction ---------- */

  const pointer = { x: 0, y: 0 };
  let spin = 0;
  let spinVelocity = 0;
  let dragging = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let bounce = 0;

  function onWindowPointer(event) {
    const box = container.getBoundingClientRect();
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    pointer.x = clamp((event.clientX - (box.left + box.width / 2)) / box.width);
    pointer.y = clamp(-(event.clientY - (box.top + box.height * 0.35)) / box.height);
  }
  window.addEventListener('pointermove', onWindowPointer, { passive: true });

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = downX = event.clientX;
    downY = event.clientY;
    container.classList.add('is-dragging');
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    spin += dx * 0.012;
    spinVelocity = dx * 0.012;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('is-dragging');
    // A tap without dragging is a boop
    if (Math.abs(event.clientX - downX) < 6 && Math.abs(event.clientY - downY) < 6) boop();
  });
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
    container.classList.remove('is-dragging');
  });

  function boop() {
    bounce = 1;
    opts.onBoop();
  }

  /* ---------- Animation ---------- */

  const clock = new THREE.Clock();
  let running = false;
  let frame = 0;

  function render() {
    frame = 0;
    if (!running) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const still = opts.reduceMotion;

    if (!dragging) {
      spin += spinVelocity;
      spinVelocity *= 0.94;
    }
    let turn = spin + (still ? 0 : Math.sin(t * 0.6) * 0.22);
    if (retro) turn = Math.round(turn / 0.09) * 0.09; // choppy, like a 1999 game
    model.group.rotation.y = turn;
    model.group.position.y = still ? 0 : Math.sin(t * 1.3) * 0.05;

    if (bounce > 0) {
      bounce = Math.max(0, bounce - dt * 2.2);
      const squash = Math.sin(bounce * Math.PI * 3) * bounce * 0.12;
      model.group.scale.set(1 + squash, 1 - squash, 1 + squash);
    }

    // Eyes follow the pointer, and shrink away while Toby naps (the idle Easter egg)
    const asleep = document.documentElement.classList.contains('toby-asleep');
    model.pupils.forEach((pupil) => {
      pupil.position.x = pupil.userData.home.x + pointer.x * 0.07;
      pupil.position.y = pupil.userData.home.y + pointer.y * 0.06;
      pupil.scale.setScalar(THREE.MathUtils.lerp(pupil.scale.x, asleep ? 0.15 : 1, 0.1));
    });

    if (!still) {
      model.snorbitBody.scale.y = 0.7 * (1 + Math.sin(t * 1.8) * 0.06); // breathing
      model.orbit.rotation.y = t * 0.35;
      model.orbit.children.forEach((star, i) => { star.rotation.z = t * (0.8 + i * 0.1); });
    }

    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }

  rebuild();

  return {
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      frame = requestAnimationFrame(render);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
    spinBy(amount) { spinVelocity += amount; },
    boop,
    setRetro(on) {
      if (on === retro) return;
      retro = on;
      rebuild();
    },
    setGlow(color) {
      opts.glow = color;
      model.pupilMat.color.set(color);
      model.glassMat.emissive.set(color);
      model.lanternLight.color.set(color);
    }
  };
}
