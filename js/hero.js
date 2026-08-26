/* Toroidal Knot Animation - wireframe with vertical gradient */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const BG = 0x0d1419;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 34;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const group = new THREE.Group();
  scene.add(group);

  const mobile = window.innerWidth < 768;
  const geometry = new THREE.TorusKnotGeometry(
    9,
    3.1,
    mobile ? 220 : 420,
    mobile ? 28 : 44,
    2,
    3
  );

  const stops = [
    { t: 0.0, c: 0x06333a },
    { t: 0.18, c: 0x11888c },
    { t: 0.34, c: 0x38b3a6 },
    { t: 0.48, c: 0xd8d2b8 },
    { t: 0.62, c: 0xe3a838 },
    { t: 0.8, c: 0xd4611c },
    { t: 1.0, c: 0x9e2115 }
  ].map((s) => ({ t: s.t, c: new THREE.Color(s.c) }));

  function ramp(t) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t <= b.t) {
        const k = (t - a.t) / (b.t - a.t);
        return a.c.clone().lerp(b.c, Math.max(0, Math.min(1, k)));
      }
    }
    return stops[stops.length - 1].c.clone();
  }

  const pos = geometry.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = ramp((pos.getY(i) - minY) / (maxY - minY));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const occluder = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: BG,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    })
  );
  group.add(occluder);

  const wireMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    wireframe: true,
    transparent: true,
    opacity: 0.92
  });
  group.add(new THREE.Mesh(geometry, wireMaterial));

  group.rotation.x = 0.5;
  group.rotation.y = 0.3;
  group.rotation.z = 0.15;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;
  let spin = 0;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.3 + nx * 0.35;
    targetRotX = 0.5 + ny * 0.25;
  });

  const SECTION_TINTS = {
    hero: new THREE.Color(0xffffff),
    about: new THREE.Color(0xffd9c0),
    ventures: new THREE.Color(0xd9fff2),
    achievements: new THREE.Color(0xffe3b0),
    now: new THREE.Color(0xc8fff0),
    contact: new THREE.Color(0xffffff)
  };

  const sectionEls = Array.from(document.querySelectorAll("[data-tint]"));
  let currentTint = SECTION_TINTS.hero;

  function updateActiveSectionTint() {
    if (!sectionEls.length) return;
    const mid = window.innerHeight * 0.5;
    let closest = sectionEls[0];
    let closestDist = Infinity;
    sectionEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closest = el;
      }
    });
    const key = closest.getAttribute("data-tint");
    currentTint = SECTION_TINTS[key] || SECTION_TINTS.hero;
  }

  window.addEventListener("scroll", updateActiveSectionTint, { passive: true });

  resize();
  window.addEventListener("resize", resize);
  updateActiveSectionTint();

  function animate() {
    requestAnimationFrame(animate);

    spin += 0.0022;
    group.rotation.y += (targetRotY + spin - group.rotation.y) * 0.02;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.035;

    wireMaterial.color.lerp(currentTint, 0.02);

    renderer.render(scene, camera);
  }

  animate();
})();
