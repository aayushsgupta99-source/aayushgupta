/* ============================================================
   Kian Shah Style 3D Flowing Mesh Animation
   Beautiful ribbon structure with cyan and orange colors
   ============================================================ */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 2.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const group = new THREE.Group();
  scene.add(group);

  // Colors
  const CYAN = new THREE.Color(0x20d9d9);
  const ORANGE = new THREE.Color(0xff8c42);
  const TEAL = new THREE.Color(0x00a8a8);

  const SECTION_TINTS = {
    hero: { a: CYAN, b: ORANGE },
    about: { a: ORANGE, b: TEAL },
    ventures: { a: CYAN, b: ORANGE },
    achievements: { a: ORANGE, b: CYAN },
    now: { a: TEAL, b: ORANGE },
    contact: { a: CYAN, b: ORANGE },
  };

  // Create flowing mesh with visible wireframe
  function createMesh() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    const segments = 40;
    const rings = 8;

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= rings; j++) {
        const u = i / segments;
        const v = (j / rings) * Math.PI * 2;

        const x = Math.cos(u * Math.PI * 4) * 1.2 * Math.cos(v);
        const y = Math.sin(u * Math.PI * 4) * 1.2;
        const z = Math.cos(u * Math.PI * 4) * 1.2 * Math.sin(v);

        vertices.push(x, y, z);
      }
    }

    // Connect vertices
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < rings; j++) {
        const a = i * (rings + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (rings + 1) + j;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

    return geometry;
  }

  const meshGeo = createMesh();

  // Cyan wireframe
  const wireMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    wireframe: true,
    transparent: true,
    opacity: 0.9,
  });
  const mesh1 = new THREE.Mesh(meshGeo, wireMat);
  group.add(mesh1);

  // Orange secondary mesh
  const wireMat2 = new THREE.MeshBasicMaterial({
    color: ORANGE,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const mesh2 = new THREE.Mesh(meshGeo, wireMat2);
  mesh2.scale.set(1.3, 1.3, 1.3);
  group.add(mesh2);

  group.rotation.x = 0.3;
  group.rotation.y = 0.5;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.5 + nx * 0.5;
    targetRotX = 0.3 + ny * 0.3;
  });

  // Scroll-driven color change
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

  const tmpColorA = new THREE.Color();
  const tmpColorB = new THREE.Color();

  let raf = null;
  function animate() {
    raf = requestAnimationFrame(animate);

    // Rotation
    group.rotation.y += 0.0008;
    if (!prefersReducedMotion) {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.02;
    }

    // Color interpolation
    tmpColorA.lerpColors(wireMat.color, currentTint.a, 0.02);
    tmpColorB.lerpColors(wireMat2.color, currentTint.b, 0.02);
    wireMat.color.copy(tmpColorA);
    wireMat2.color.copy(tmpColorB);

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    } else if (!document.hidden && !raf && !prefersReducedMotion) {
      animate();
    }
  });
})();
