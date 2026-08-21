/* Toroidal Knot - Visible 3D animation */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    precision: 'highp'
  });
  
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const group = new THREE.Group();
  scene.add(group);

  // Colors
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

  // Create toroidal knot
  const curve = new THREE.TorusKnotCurve(10, 3);
  const tubeGeometry = new THREE.TubeGeometry(curve, 120, 14, 10, false);

  // Material 1 - Cyan
  const material1 = new THREE.MeshPhongMaterial({
    color: CYAN,
    emissive: new THREE.Color(0x0fa3a3),
    emissiveIntensity: 0.25,
    shininess: 40,
    wireframe: false,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  const mesh1 = new THREE.Mesh(tubeGeometry, material1);
  group.add(mesh1);

  // Material 2 - Orange (larger scale for depth)
  const material2 = new THREE.MeshPhongMaterial({
    color: ORANGE,
    emissive: new THREE.Color(0xb8532d),
    emissiveIntensity: 0.15,
    shininess: 30,
    wireframe: false,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });

  const mesh2 = new THREE.Mesh(tubeGeometry, material2);
  mesh2.scale.set(1.25, 1.25, 1.25);
  group.add(mesh2);

  // Lighting
  const light1 = new THREE.PointLight(0xffffff, 0.8);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xffffff, 0.4);
  light2.position.set(-5, -5, 5);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Initial rotation
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

  // Scroll detection
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

  const tmpColor1 = new THREE.Color();
  const tmpColor2 = new THREE.Color();

  function animate() {
    requestAnimationFrame(animate);

    // Rotation
    group.rotation.y += 0.0006;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.02;

    // Color transitions
    tmpColor1.lerpColors(material1.color, currentTint.a, 0.015);
    tmpColor2.lerpColors(material2.color, currentTint.b, 0.015);
    
    material1.color.copy(tmpColor1);
    material1.emissive.copy(tmpColor1);
    material2.color.copy(tmpColor2);
    material2.emissive.copy(tmpColor2);

    renderer.render(scene, camera);
  }

  animate();
})();
