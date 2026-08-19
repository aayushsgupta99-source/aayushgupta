/* ============================================================
   Kian Shah Style 3D Mesh Animation
   Beautiful flowing 3D ribbon structure that morphs and changes
   colors as you scroll. Text layered on top with z-index control.
   ============================================================ */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 3);

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

  // Colors matching Kian's palette
  const CYAN = new THREE.Color(0x20d9d9);
  const ORANGE = new THREE.Color(0xff8c42);
  const TEAL = new THREE.Color(0x00a8a8);
  const BRASS = new THREE.Color(0xc6a15b);

  const SECTION_TINTS = {
    hero: { a: CYAN, b: ORANGE },
    about: { a: ORANGE, b: TEAL },
    ventures: { a: CYAN, b: BRASS },
    achievements: { a: ORANGE, b: CYAN },
    now: { a: TEAL, b: ORANGE },
    contact: { a: BRASS, b: CYAN },
  };

  // Create flowing ribbon mesh structure (like Kian's)
  function createFlowingMesh() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Create a flowing, organic mesh
    const segments = 80;
    const loops = 6;
    const amplitude = 0.8;

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= loops; j++) {
        const u = i / segments;
        const v = j / loops;
        
        // Create flowing wave pattern
        const x = (u - 0.5) * 3;
        const y = Math.sin(u * Math.PI * 3) * amplitude * Math.cos(v * Math.PI * 2);
        const z = Math.cos(u * Math.PI * 3) * amplitude * Math.sin(v * Math.PI * 2) + u * 0.5;

        vertices.push(x, y, z);
      }
    }

    // Create indices for the mesh
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < loops; j++) {
        const a = i * (loops + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (loops + 1) + j;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    // Wireframe material - cyan and orange lines
    const material = new THREE.MeshBasicMaterial({
      color: CYAN,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      linewidth: 1.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return { mesh, material };
  }

  const { mesh: flowMesh, material: flowMat } = createFlowingMesh();
  group.add(flowMesh);

  // Add secondary mesh with offset (creates depth)
  const { mesh: flowMesh2, material: flowMat2 } = createFlowingMesh();
  flowMesh2.scale.set(1.2, 1.2, 1.2);
  flowMat2.color.copy(ORANGE);
  flowMat2.opacity = 0.4;
  group.add(flowMesh2);

  // Initial rotation
  group.rotation.x = 0.2;
  group.rotation.y = 0.3;
  group.rotation.z = 0.1;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.3 + nx * 0.4;
    targetRotX = 0.2 + ny * 0.3;
  });

  // ---- scroll-driven section tint ----
  const sectionEls = Array.from(document.querySelectorAll("[data-tint]"));
  let currentTint = SECTION_TINTS.hero;
  const tmpColorA = new THREE.Color();
  const tmpColorB = new THREE.Color();

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

  let raf = null;
  function animate() {
    raf = requestAnimationFrame(animate);
    
    // Continuous slow rotation
    group.rotation.y += 0.0006;
    
    // Smooth mouse interaction
    if (!prefersReducedMotion) {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.02;
    }

    // Color transitions based on scroll position
    tmpColorA.lerpColors(flowMat.color, currentTint.a, 0.02);
    tmpColorB.lerpColors(flowMat2.color, currentTint.b, 0.02);
    flowMat.color.copy(tmpColorA);
    flowMat2.color.copy(tmpColorB);

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
