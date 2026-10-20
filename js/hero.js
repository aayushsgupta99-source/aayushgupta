/* Toroidal Knot Animation - hidden-line wireframe with a diagonal teal → red gradient,
   parked on the right of the hero and bleeding off the edge */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

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

  const group = new THREE.Group();
  scene.add(group);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // half the visible width at the knot's depth
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const halfW = halfH * camera.aspect;
    if (w < 768) {
      group.position.set(halfW * 0.7, halfH * 0.68, -8);
      group.scale.setScalar(0.85);
    } else {
      group.position.set(halfW * 0.68, halfH * 0.04, 0);
      group.scale.setScalar(1.15);
    }
  }

  const mobile = window.innerWidth < 768;
  const geometry = new THREE.TorusKnotGeometry(
    10,
    2.3,
    mobile ? 220 : 420,
    mobile ? 28 : 44,
    2,
    3
  );

  const stops = [
    { t: 0.0, c: 0x2f8f95 },
    { t: 0.22, c: 0x7cc8c4 },
    { t: 0.38, c: 0xc9dccb },
    { t: 0.52, c: 0xe2b443 },
    { t: 0.68, c: 0xe08a2c },
    { t: 0.84, c: 0xc94a1e },
    { t: 1.0, c: 0x9a1f18 }
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

  // gradient runs from top-left (teal) to bottom-right (red)
  const pos = geometry.attributes.position;
  const proj = (i) => pos.getX(i) * 0.55 - pos.getY(i) * 0.85;
  let minP = Infinity;
  let maxP = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const p = proj(i);
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = ramp((proj(i) - minP) / (maxP - minP));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const occluder = new THREE.Mesh(
    geometry,
    // depth-only: hides the back lines but lets the page gradient show through
    new THREE.MeshBasicMaterial({
      colorWrite: false,
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
    opacity: mobile ? 0.6 : 0.85
  });
  group.add(new THREE.Mesh(geometry, wireMaterial));

  group.rotation.x = 0.55;
  group.rotation.y = -0.35;
  group.rotation.z = 0.4;

  let targetRotY = group.rotation.y;
  // the gradient is baked per vertex, so keep the knot's spin gentle
  let targetRotX = group.rotation.x;
  let spin = 0;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = -0.35 + nx * 0.35;
    targetRotX = 0.55 + ny * 0.25;
  });

  const SECTION_TINTS = {
    hero: new THREE.Color(0xffffff),
    about: new THREE.Color(0xd6fff2),
    ventures: new THREE.Color(0xffe6cc),
    achievements: new THREE.Color(0xfff0c8),
    now: new THREE.Color(0xd6fff2),
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

    spin += 0.0012;
    group.rotation.y += (targetRotY + spin - group.rotation.y) * 0.02;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.035;

    wireMaterial.color.lerp(currentTint, 0.02);

    renderer.render(scene, camera);
  }

  animate();
})();
