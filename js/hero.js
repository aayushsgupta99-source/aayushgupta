/* Toroidal Knot - Matching Kian Shah's design exactly */

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
  camera.position.z = 4;

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

  // Colors - more muted like Kian's
  const CYAN = new THREE.Color(0x0fa3a3);
  const ORANGE = new THREE.Color(0xb8532d);
  const TEAL = new THREE.Color(0x006666);

  const SECTION_TINTS = {
    hero: { a: CYAN, b: ORANGE },
    about: { a: ORANGE, b: TEAL },
    ventures: { a: CYAN, b: ORANGE },
    achievements: { a: ORANGE, b: CYAN },
    now: { a: TEAL, b: ORANGE },
    contact: { a: CYAN, b: ORANGE },
  };

  // Toroidal knot curve (p=2, q=3)
  function createTorusKnot() {
    const curve = new THREE.TorusKnotCurve(10, 3);
    const points = curve.getPoints(1000);

    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 12, 8, false);

    const wireMat1 = new THREE.MeshPhongMaterial({
      color: CYAN,
      emissive: new THREE.Color(0x0fa3a3),
      emissiveIntensity: 0.3,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
      shininess: 30,
    });

    const mesh1 = new THREE.Mesh(tubeGeometry, wireMat1);
    group.add(mesh1);

    // Secondary mesh for layering
    const wireMat2 = new THREE.MeshPhongMaterial({
      color: ORANGE,
      emissive: new THREE.Color(0xb8532d),
      emissiveIntensity: 0.2,
      wireframe: false,
      transparent: true,
      opacity: 0.4,
      shininess: 20,
    });

    const mesh2 = new THREE.Mesh(tubeGeometry, wireMat2);
    mesh2.scale.set(1.15, 1.15, 1.15);
    group.add(mesh2);

    return { mesh1, mesh2, wireMat1, wireMat2 };
  }

  const { mesh1, mesh2, wireMat1, wireMat2 } = createTorusKnot();

  // Lighting
  const light1 = new THREE.PointLight(0xffffff, 1, 100);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xffffff, 0.5, 100);
  light2.position.set(-5, -5, 5);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  group.rotation.x = 0.2;
  group.rotation.y = 0.4;
  group.rotation.z = 0.1;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.4 + nx * 0.4;
    targetRotX = 0.2 + ny * 0.3;
  });

  // Scroll-driven color
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

  function animate() {
    requestAnimationFrame(animate);

    group.rotation.y += 0.0006;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.02;

    tmpColorA.lerpColors(wireMat1.color, currentTint.a, 0.015);
    tmpColorB.lerpColors(wireMat2.color, currentTint.b, 0.015);
    wireMat1.color.copy(tmpColorA);
    wireMat1.emissive.copy(tmpColorA);
    wireMat2.color.copy(tmpColorB);
    wireMat2.emissive.copy(tmpColorB);

    renderer.render(scene, camera);
  }

  animate();
})();
