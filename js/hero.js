/* The 3D view: a dim wireframe knot that gold particles draw on load, and a calm
   camera tour around it as you scroll, pausing at one stop per section. The tour
   ends where it began, so scrolling past the end loops back to the start. */

(function () {
  const root = document.documentElement;
  const canvas = document.getElementById("hero-canvas");
  const fly = document.querySelector(".fly");

  let webgl = false;
  try {
    webgl = !!document.createElement("canvas").getContext("webgl");
  } catch (e) {}
  if (!canvas || !fly || typeof THREE === "undefined" || !webgl) {
    root.classList.add("no-3d");
    root.className = root.className.replace("view-3d", "view-simple");
    return;
  }

  const is3D = () => root.classList.contains("view-3d");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const mobile = window.innerWidth < 768;

  /* ---------- scene ---------- */

  const BG = new THREE.Color(0x0a1d22);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 34, 76);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.AmbientLight(0x9fd6cf, 0.55));
  const key = new THREE.DirectionalLight(0xffe2b8, 0.55);
  key.position.set(-20, 30, 25);
  scene.add(key);

  /* ---------- the knot ---------- */

  // (2,3) torus knot, stretched in depth so the flight has real turns
  const R = 8;
  class KnotCurve extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const u = t * Math.PI * 4;
      const qu = 1.5 * u;
      const cs = Math.cos(qu);
      return target.set(
        R * (2 + cs) * 0.5 * Math.cos(u),
        R * (2 + cs) * 0.5 * Math.sin(u),
        R * Math.sin(qu) * 0.9
      );
    }
  }
  const curve = new KnotCurve();

  const TUBE = 2.1;
  const SEGS = mobile ? 320 : 460;
  const RADIAL = mobile ? 16 : 20;
  const geometry = new THREE.TubeGeometry(curve, SEGS, TUBE, RADIAL, true);
  const frames = { T: geometry.tangents, N: geometry.normals, B: geometry.binormals };

  // muted vertical ramp: teal at the bottom, gold through the middle, red at the top
  const stops = [
    { t: 0.0, c: 0x1d5f66 },
    { t: 0.3, c: 0x2c7470 },
    { t: 0.5, c: 0x8f7436 },
    { t: 0.68, c: 0x96562a },
    { t: 1.0, c: 0x7a2a20 }
  ].map((s) => ({ t: s.t, c: new THREE.Color(s.c) }));
  function ramp(t) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t <= b.t) return a.c.clone().lerp(b.c, clamp((t - a.t) / (b.t - a.t), 0, 1));
    }
    return stops[stops.length - 1].c.clone();
  }
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const span = R * 1.5 + TUBE;
  for (let i = 0; i < pos.count; i++) {
    const c = ramp((pos.getY(i) + span) / (2 * span));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const group = new THREE.Group();
  group.rotation.set(-0.35, 0.25, 0.2);
  scene.add(group);

  // strands that come close to the camera dissolve instead of filling the screen
  const nearFade = { uFadeNear: { value: 0 }, uFadeFar: { value: 0.001 } };
  function withNearFade(material, cutout) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, nearFade);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vViewDepth;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvViewDepth = -mvPosition.z;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vViewDepth;\nuniform float uFadeNear;\nuniform float uFadeFar;"
        )
        .replace(
          "#include <fog_fragment>",
          "#include <fog_fragment>\nfloat nearK = smoothstep(uFadeNear, uFadeFar, vViewDepth);\n" +
            (cutout ? "if (nearK < 0.5) discard;\n" : "") +
            "gl_FragColor.a *= nearK;"
        );
    };
    return material;
  }

  // dark solid tube: hides the lines behind it and catches a little light
  const fill = new THREE.Mesh(
    geometry,
    withNearFade(
      new THREE.MeshLambertMaterial({
        color: 0x0a2025,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      true
    )
  );
  const wireMat = withNearFade(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.46
    })
  );
  const wire = new THREE.Mesh(geometry, wireMat);
  group.add(fill, wire);

  const INDEX_COUNT = geometry.index.count;
  geometry.setDrawRange(0, 0);

  /* ---------- intro particles ---------- */

  const P_COUNT = mobile ? 700 : 1600;
  const pStart = new Float32Array(P_COUNT * 3);
  const pEnd = new Float32Array(P_COUNT * 3);
  const pT = new Float32Array(P_COUNT);
  const pPos = new Float32Array(P_COUNT * 3);
  const pCol = new Float32Array(P_COUNT * 3);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < P_COUNT; i++) {
    const t = Math.random();
    const k = Math.min(SEGS, Math.round(t * SEGS));
    const a = Math.random() * Math.PI * 2;
    const r = TUBE * (0.95 + Math.random() * 0.35);
    curve.getPointAt(t, tmp);
    tmp.addScaledVector(frames.N[k], Math.cos(a) * r).addScaledVector(frames.B[k], Math.sin(a) * r);
    pEnd.set([tmp.x, tmp.y, tmp.z], i * 3);
    const d = new THREE.Vector3().randomDirection
      ? new THREE.Vector3().randomDirection()
      : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    tmp.addScaledVector(d, 6 + Math.random() * 18);
    pStart.set([tmp.x, tmp.y, tmp.z], i * 3);
    pT[i] = t;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: mobile ? 0.3 : 0.34,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(particles);

  const GOLD = new THREE.Color(0xf2b640);
  const INTRO_DELAY = 0.7; // seconds before the knot starts drawing
  const DRAW = 2.6; // seconds to draw the whole knot
  const FLIGHT = 0.9; // seconds a particle takes to reach the tube
  let introDone = false;

  function updateIntro(time) {
    const drawn = clamp((time - INTRO_DELAY) / DRAW, 0, 1);
    geometry.setDrawRange(0, Math.floor((INDEX_COUNT / 6) * drawn) * 6);
    let alive = false;
    for (let i = 0; i < P_COUNT; i++) {
      const arrive = INTRO_DELAY + pT[i] * DRAW;
      const k = clamp((time - (arrive - FLIGHT)) / FLIGHT, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      for (let j = 0; j < 3; j++) {
        pPos[i * 3 + j] = pStart[i * 3 + j] + (pEnd[i * 3 + j] - pStart[i * 3 + j]) * e;
      }
      // glow while flying in, then fade once the tube has caught up
      const b = k < 1 ? k * k : Math.max(0, 1 - (time - arrive) / 0.9);
      if (b > 0 || k < 1) alive = true;
      pCol[i * 3] = GOLD.r * b;
      pCol[i * 3 + 1] = GOLD.g * b;
      pCol[i * 3 + 2] = GOLD.b * b;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    if (drawn >= 1 && !alive) {
      introDone = true;
      group.remove(particles);
      geometry.setDrawRange(0, Infinity);
    }
  }


  /* ---------- the tour: a calm camera route with one stop per section ----------

     The knot stays put as the centrepiece. The camera glides around it on a smooth
     closed route through six stops (the opening view plus one per section), easing
     into each stop and holding there while that section's card is on screen. The
     horizon is always level, and the route ends where it began, so the tour loops. */

  // az: degrees around the knot, el: degrees above it, r: distance from it,
  // side: which side of the screen the card takes (the knot takes the other)
  const STOPS = [
    { key: "hero", az: 0, el: 2, r: 46, side: -1 },
    { key: "about", az: 48, el: 16, r: 41, side: -1 },
    { key: "ventures", az: 118, el: -9, r: 40, side: 1 },
    { key: "achievements", az: 184, el: 30, r: 42, side: -1 },
    { key: "now", az: 252, el: -12, r: 40, side: 1 },
    { key: "contact", az: 312, el: 10, r: 41, side: -1 }
  ];
  const N_STOPS = STOPS.length;
  const DEG = Math.PI / 180;
  const SWOOP = 7; // how much closer the camera dips in the middle of each leg

  // uniform Catmull-Rom through the stops; azimuth keeps climbing a full turn so
  // the orbit always goes forward and closes back on the opening view
  const stopVal = (i, field) => {
    const n = ((i % N_STOPS) + N_STOPS) % N_STOPS;
    const lap = Math.floor(i / N_STOPS);
    return STOPS[n][field] + (field === "az" ? lap * 360 : 0);
  };
  const cr = (a, b, c, d, t) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  function orbit(leg, k, out) {
    const v = (f) => cr(stopVal(leg - 1, f), stopVal(leg, f), stopVal(leg + 1, f), stopVal(leg + 2, f), k);
    const az = v("az") * DEG;
    const el = v("el") * DEG;
    // portrait screens are narrow, so the camera stands further back there
    const reach = camera.aspect < 1 ? 1.45 : 1;
    const r = (v("r") - SWOOP * Math.sin(Math.PI * k)) * reach;
    return out.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
  }

  // scroll progress -> route position: glide between stops, settle at each one
  const HOLD = 0.2; // share of each leg spent resting at its two ends
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  function routeT(p) {
    const f = p * N_STOPS;
    const leg = Math.floor(f);
    const k = smoother(clamp((f - leg - HOLD) / (1 - 2 * HOLD), 0, 1));
    return { t: (leg + k) / N_STOPS, leg, k };
  }

  // how present stop i is at progress p (1 while resting there, 0 once you've left)
  function presence(i, p) {
    let d = Math.abs(p - i / N_STOPS);
    d = Math.min(d, 1 - d);
    return 1 - smooth(0.035, 0.085, d);
  }

  /* ---------- scroll: progress, looping ---------- */

  let laps = 0;
  let target = 0;
  let current = 0;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const drawerOpen = () => {
    const d = document.querySelector(".drawer");
    return d && !d.hidden;
  };

  function onScroll() {
    if (!is3D()) return;
    const max = maxScroll();
    const y = window.scrollY;
    // the route ends where it starts, so jumping back to the top is seamless
    if (y >= max - 1) {
      laps += 1;
      window.scrollTo({ top: 1, behavior: "instant" });
      return;
    }
    target = laps + y / max;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(
    "wheel",
    (e) => {
      if (!is3D() || drawerOpen()) return;
      if (e.deltaY < 0 && window.scrollY <= 1) {
        laps -= 1;
        window.scrollTo({ top: maxScroll() - 2, behavior: "instant" });
      }
    },
    { passive: true }
  );

  /* ---------- pointer parallax ---------- */

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });

  /* ---------- DOM overlays ---------- */

  const heroEl = document.querySelector(".fly__hero");
  const scrollCue = document.querySelector(".hero__scroll");
  const nav = document.querySelector(".nav--overlay");
  const cards = STOPS.map((s) => document.querySelector(`.station[data-section="${s.key}"]`));
  const dots = Array.from(document.querySelectorAll(".fly__dots button"));

  function updateOverlays(p) {
    const narrow = window.innerWidth < 768;
    let active = 0;
    let best = 0;
    STOPS.forEach((s, i) => {
      const v = presence(i, p);
      if (v > best) {
        best = v;
        active = i;
      }
      const el = i === 0 ? heroEl : cards[i];
      if (!el) return;
      // cards drift in from their own side and blur as they leave
      const shift = (1 - v) * (narrow ? 0 : s.side * -4);
      const rise = (1 - v) * (narrow ? 3 : 1.5);
      el.style.opacity = String(v);
      el.style.transform = `translate3d(${shift}vw, ${rise}vh, 0)`;
      el.style.filter = v < 0.99 ? `blur(${(1 - v) * 10}px)` : "none";
      el.style.visibility = v < 0.01 ? "hidden" : "visible";
      el.style.pointerEvents = v > 0.6 ? "auto" : "none";
    });
    scrollCue.style.opacity = String(clamp(presence(0, p) * 1.4 - 0.4, 0, 1));
    if (nav) nav.classList.toggle("is-shown", presence(0, p) < 0.5);
    dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
  }

  /* ---------- go to a stop (nav links, dots) ---------- */

  function goTo(key) {
    const i = STOPS.findIndex((s) => s.key === key);
    if (i < 0) return false;
    window.scrollTo({ top: (i / N_STOPS) * maxScroll(), behavior: "smooth" });
    return true;
  }
  dots.forEach((d) => d.addEventListener("click", () => goTo(d.dataset.goto)));

  let snapNext = false;
  window.fly = {
    goTo,
    // skip the easing (handy for screenshots and tests)
    snap: () => {
      current = target;
      snapNext = true;
    }
  };

  /* ---------- framing ---------- */

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // portrait screens need a wider lens to fit the knot
    camera.fov = camera.aspect < 1 ? 62 : 45;
    camera.updateProjectionMatrix();
  }

  // slide the picture sideways (or up on phones) so the knot sits opposite the card
  let frameX = 0;
  let frameY = 0;
  function applyFraming(side) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const narrow = w < 768;
    const x = narrow ? 0 : side * 0.21 * w;
    const y = narrow ? 0.2 * h : 0;
    if (Math.abs(x - frameX) < 0.5 && Math.abs(y - frameY) < 0.5 && camera.view) return;
    frameX = x;
    frameY = y;
    camera.setViewOffset(w, h, x, y, w, h);
  }

  /* ---------- loop ---------- */

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const lookSm = new THREE.Vector3();
  const right = new THREE.Vector3();
  const clock = new THREE.Clock();
  let last = 0;
  let sideSm = STOPS[0].side;

  resize();
  window.addEventListener("resize", () => {
    resize();
    frameX = Infinity;
  });
  onScroll();
  current = target;

  function animate() {
    requestAnimationFrame(animate);
    if (!is3D()) return;
    const time = clock.getElapsedTime();
    const dt = Math.min(0.05, time - last);
    last = time;
    if (!introDone) updateIntro(time);

    // the camera glides toward the scroll position and keeps coasting briefly
    current += (target - current) * (1 - Math.exp(-dt * 3));
    if (snapNext) current = target;
    const p = ((current % 1) + 1) % 1;
    const { leg, k } = routeT(p);

    // the knot breathes on its own, so the scene is never frozen
    group.rotation.y = 0.25 + Math.sin(time * 0.09) * 0.22;
    group.rotation.x = -0.35 + Math.sin(time * 0.07) * 0.08;
    group.rotation.z = 0.2 + Math.sin(time * 0.05) * 0.05;

    orbit(leg, k, camPos);
    camLook.set(0, 0, 0);

    // gentle pointer parallax, sideways and up/down relative to the view
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 2.5));
    mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 2.5));
    right.copy(camLook).sub(camPos).cross(camera.up).normalize();
    camPos.addScaledVector(right, mouse.sx * 2.2);
    camPos.y -= mouse.sy * 1.6;

    lookSm.copy(camLook);
    camera.position.copy(camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookSm);

    // the card's side follows the route too, so the knot slides across smoothly
    const a = STOPS[leg % N_STOPS].side;
    const b = STOPS[(leg + 1) % N_STOPS].side;
    const side = a + (b - a) * k;
    sideSm += (side - sideSm) * (snapNext ? 1 : 1 - Math.exp(-dt * 4));
    applyFraming(sideSm);
    snapNext = false;

    // fog tracks the distance to the knot: near strands crisp, far strands sink away
    const dist = camPos.length();
    scene.fog.near = Math.max(4, dist - 12);
    scene.fog.far = dist + 30;
    nearFade.uFadeNear.value = 3;
    nearFade.uFadeFar.value = 9;

    updateOverlays(p);
    renderer.render(scene, camera);
  }

  animate();
})();
