/* ============================================================
   Toroidal Knot Animation (Kian Shah style)
   Beautiful 3D twisted knot wireframe that shifts colors as
   you scroll through sections. Cyan and orange aesthetic.
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
  camera.position.set(0, 0, 3.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x0a1f1f, 0);
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

  // Kian's color palette - vibrant cyan and orange
  const CYAN = new THREE.Color(0x20d9d9);
  const ORANGE = new THREE.Color(0xff8c42);
  const TEAL = new THREE.Color(0x008080);

  const SECTION_TINTS = {
    hero: { a: CYAN, b: ORANGE },
    about: { a: ORANGE, b: CYAN },
    ventures: { a: CYAN, b: ORANGE },
    achievements: { a: ORANGE, b: CYAN },
    now: { a: TEAL, b: ORANGE },
    contact: { a: CYAN, b: ORANGE },
  };

  // Create toroidal knot geometry
  function createToroidalKnot() {
    const curve = new THREE.TorusKnotCurve(10, 3);
    const points = curve.getPoints(500);
    
    // Main knot line
    const knotGeo = new THREE.BufferGeometry().setFromPoints(points);
    const knotMat1 = new THREE.LineBasicMaterial({
      color: CYAN,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const knot1 = new THREE.Line(knotGeo, knotMat1);
    group.add(knot1);

    // Secondary knot with offset (creates 3D effect)
    const offsetPoints = points.map(p => {
      const p2 = p.clone();
      p2.x += 0.15;
      p2.z += 0.15;
      return p2;
    });
    const knotGeo2 = new THREE.BufferGeometry().setFromPoints(offsetPoints);
    const knotMat2 = new THREE.LineBasicMaterial({
      color: ORANGE,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
    });
    const knot2 = new THREE.Line(knotGeo2, knotMat2);
    group.add(knot2);

    // Connecting lines for 3D mesh effect
    for (let i = 0; i < points.length - 1; i += 50) {
      const geo = new THREE.BufferGeometry().setFromPoints([points[i], offsetPoints[i]]);
      const mat = new THREE.LineBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.3,
        linewidth: 1,
      });
      group.add(new THREE.Line(geo, mat));
    }
  }

  createToroidalKnot();

  group.rotation.x = 0.3;
  group.rotation.y = 0.6;
  group.rotation.z = 0.2;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;
  let targetRotZ = group.rotation.z;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.6 + nx * 0.5;
    targetRotX = 0.3 + ny * 0.3;
    targetRotZ = 0.2 + nx * 0.2;
  });

  // ---- scroll-driven section tint ----
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

  let raf = null;
  function animate() {
    raf = requestAnimationFrame(animate);
    
    // Smooth rotation
    group.rotation.y += 0.001;
    if (!prefersReducedMotion) {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.02;
      group.rotation.z += (targetRotZ - group.rotation.z) * 0.04;
    }

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
