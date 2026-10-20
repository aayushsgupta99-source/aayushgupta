/* The 3D view: a dim wireframe knot that gold particles draw on load, and a camera
   that flies along it as you scroll. Section titles float beside the path, and the
   flight ends where it began, so scrolling past the end loops back to the start. */

(function () {
  const root = document.documentElement;
  const canvas = document.getElementById("hero-canvas");
  const fly = document.querySelector(".fly");
  const track = document.querySelector(".fly-track");

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
  scene.fog = new THREE.Fog(BG, 30, 90);

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
      opacity: 0.5
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

  /* ---------- flight path ---------- */

  const U0 = 0.62; // where along the knot the flight starts
  const SECTIONS = ["about", "ventures", "achievements", "now", "contact"];
  // scroll progress at which each section title is right ahead of the camera
  const SECTION_P = SECTIONS.map((_, i) => 0.2 + i * 0.15);
  const OFF = TUBE * 5; // camera rides this far off the tube's centre line

  const pathU = (p) => U0 + p;
  const wrap = (u) => ((u % 1) + 1) % 1;

  function frameAt(u) {
    const f = wrap(u) * SEGS;
    const i = Math.floor(f);
    const k = f - i;
    const j = Math.min(SEGS, i + 1);
    return {
      point: curve.getPointAt(wrap(u)),
      N: frames.N[i].clone().lerp(frames.N[j], k).normalize(),
      B: frames.B[i].clone().lerp(frames.B[j], k).normalize()
    };
  }

  function pathCamera(p) {
    const u = pathU(p);
    const here = frameAt(u);
    const ahead = frameAt(u + 0.06);
    return {
      pos: here.point.clone().addScaledVector(here.N, OFF),
      look: ahead.point.clone().addScaledVector(ahead.N, OFF * 0.45),
      up: here.N.clone()
    };
  }

  // each title hangs on the flight path itself, so it grows dead ahead as you
  // approach and slips past just before the camera flies through it
  const labelEls = Array.from(document.querySelectorAll(".fly-label"));
  const labelIdx = labelEls.map((el) => SECTIONS.indexOf(el.dataset.section));
  const labelAnchors = labelIdx.map((i) => {
    const f = frameAt(pathU(SECTION_P[i]));
    const side = i % 2 ? -1 : 1;
    return f.point
      .clone()
      .addScaledVector(f.N, OFF * 0.7)
      .addScaledVector(f.B, side * TUBE * 0.5);
  });

  /* ---------- overview (hero) framing ---------- */

  const overview = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  function frameOverview() {
    const z = 44;
    const halfH = Math.tan((45 * Math.PI) / 360) * z;
    const halfW = halfH * camera.aspect;
    const narrow = window.innerWidth < 768;
    // shift the camera so the knot sits right of the name (above it on phones)
    const ox = narrow ? halfW * 0.25 : halfW * 0.42;
    const oy = narrow ? halfH * 0.55 : 0;
    overview.pos.set(-ox, -oy, z);
    overview.look.set(-ox, -oy, 0);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frameOverview();
  }

  /* ---------- scroll: progress, looping ---------- */

  let laps = 0;
  let target = 0;
  let current = 0;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

  function onScroll() {
    if (!is3D()) return;
    const max = maxScroll();
    const y = window.scrollY;
    // the last frame matches the first, so jumping to the top is seamless
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

  const drawerOpen = () => {
    const d = document.querySelector(".drawer");
    return d && !d.hidden;
  };

  /* ---------- pointer parallax ---------- */

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });

  /* ---------- DOM overlays ---------- */

  const heroEl = document.querySelector(".fly__hero");
  const scrollCue = document.querySelector(".hero__scroll");
  const bar = document.querySelector(".fly__progress span");
  const nav = document.querySelector(".nav--overlay");
  const v = new THREE.Vector3();

  function updateOverlays(p, entering, e) {
    // the name drifts off to the left and grows as the camera dives in
    const q = entering;
    heroEl.style.transform = `translate3d(${-q * 38}vw, 0, 0) scale(${1 + q * 0.9})`;
    heroEl.style.opacity = String(clamp(1 - q * 1.6, 0, 1));
    heroEl.style.filter = q > 0.01 ? `blur(${q * 8}px)` : "none";
    heroEl.style.visibility = q > 0.66 ? "hidden" : "visible";
    scrollCue.style.opacity = String(clamp(1 - q * 5, 0, 1));
    bar.style.transform = `translateY(${p * (window.innerHeight - 90)}px)`;
    if (nav) nav.classList.toggle("is-shown", q > 0.5);

    labelEls.forEach((el, i) => {
      v.copy(labelAnchors[i]);
      group.localToWorld(v);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      // only the title you're approaching shows, and only while flying
      const d = SECTION_P[labelIdx[i]] - p;
      const fade = smooth(0.075, 0.045, d) * smooth(0.0, 0.012, d) * e;
      if (v.z > 1 || fade <= 0.01) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      const s = clamp(9 / dist, 0.2, 1.4);
      // keep the whole title on screen (matters on narrow phones)
      const half = (el.offsetWidth * s) / 2 + 16;
      const W = window.innerWidth;
      const x = clamp((v.x * 0.5 + 0.5) * W, Math.min(half, W / 2), Math.max(W - half, W / 2));
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      el.style.opacity = String(fade);
      el.style.pointerEvents = fade > 0.5 ? "auto" : "none";
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${s})`;
    });
  }

  /* ---------- go to a section (nav links, title clicks) ---------- */

  function goTo(key) {
    const i = SECTIONS.indexOf(key);
    if (i < 0) return false;
    const p = SECTION_P[i] - 0.025;
    window.scrollTo({ top: p * maxScroll(), behavior: "smooth" });
    return true;
  }
  // snap skips the easing (handy for screenshots and tests)
  window.fly = { goTo, snap: () => (current = target) };

  /* ---------- loop ---------- */

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  let spin = 0;

  resize();
  window.addEventListener("resize", resize);
  onScroll();
  current = target;

  function animate() {
    requestAnimationFrame(animate);
    if (!is3D()) return;
    const time = clock.getElapsedTime();
    if (!introDone) updateIntro(time);

    current += (target - current) * 0.075;
    const p = ((current % 1) + 1) % 1;
    // 0 on the overview, 1 while flying; it returns to 0 at the end of the lap
    const e = smooth(0.0, 0.12, p) * (1 - smooth(0.88, 1.0, p));

    // a slow idle spin on the overview that stops while flying
    spin += 0.0009 * (1 - e);
    group.rotation.y = 0.25 + Math.sin(spin) * 0.35;
    group.rotation.x = -0.35 + Math.sin(spin * 0.7) * 0.12;
    group.updateMatrixWorld();

    mouse.sx += (mouse.x - mouse.sx) * 0.04;
    mouse.sy += (mouse.y - mouse.sy) * 0.04;

    const path = pathCamera(p);
    group.localToWorld(path.pos);
    group.localToWorld(path.look);
    path.up.transformDirection(group.matrixWorld);

    camPos.copy(overview.pos).lerp(path.pos, e);
    camPos.x += mouse.sx * 2.5 * (1 - e);
    camPos.y -= mouse.sy * 1.8 * (1 - e);
    camLook.copy(overview.look).lerp(path.look, e);
    camUp.copy(worldUp).lerp(path.up, e * 0.85).normalize();
    camera.position.copy(camPos);
    camera.up.copy(camUp);
    camera.lookAt(camLook);

    // fog tightens up close so far strands sink into the dark
    scene.fog.near = 30 - e * 24;
    scene.fog.far = 90 - e * 45;
    wireMat.opacity = 0.5 + e * 0.12;
    // portrait screens get a wider lens in flight so the tube doesn't crowd them
    const flyFov = camera.aspect < 1 ? 66 : 45;
    const fov = 45 + (flyFov - 45) * e;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    nearFade.uFadeNear.value = e * 5;
    nearFade.uFadeFar.value = 0.001 + e * 13;

    updateOverlays(p, smooth(0.0, 0.1, p) * (1 - smooth(0.955, 1.0, p)), e);
    renderer.render(scene, camera);
  }

  animate();
})();
