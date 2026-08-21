/* Toroidal Knot Animation - Visible 3D */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 3.2;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
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

  // Colors - muted palette
  const MINT = new THREE.Color(0x4a9d7f);
  const TEAL = new THREE.Color(0x2d7a6f);
  const DUSTY_ORANGE = new THREE.Color(0x8b5a3c);

  const SECTION_TINTS = {
    hero: { a: MINT, b: TEAL },
    about: { a: DUSTY_ORANGE, b: MINT },
    ventures: { a: MINT, b: TEAL },
    achievements: { a: DUSTY_ORANGE, b: MINT },
    now: { a: TEAL, b: DUSTY_ORANGE },
    contact: { a: MINT, b: TEAL },
  };

  // Create toroidal knot
  const curve = new THREE.TorusKnotCurve(10, 3);
  const tubeGeometry = new THREE.TubeGeometry(curve, 150, 16, 12, false);

  // Primary mesh - Mint
  const material1 = new THREE.MeshPhongMaterial({
    color: MINT,
    emissive: new THREE.Color(0x4a9d7f),
    emissiveIntensity: 0.2,
    shininess: 50,
    wireframe: false,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });

  const mesh1 = new THREE.Mesh(tubeGeometry, material1);
  group.add(mesh1);

  // Secondary mesh - Teal (larger)
  const material2 = new THREE.MeshPhongMaterial({
    color: TEAL,
    emissive: new THREE.Color(0x2d7a6f),
    emissiveIntensity: 0.15,
    shininess: 40,
    wireframe: false,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  const mesh2 = new THREE.Mesh(tubeGeometry, material2);
  mesh2.scale.set(1.3, 1.3, 1.3);
  group.add(mesh2);

  // Lighting
  const light1 = new THREE.PointLight(0xffffff, 0.7);
  light1.position.set(4, 4, 4);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xffffff, 0.35);
  light2.position.set(-4, -4, 3);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  // Initial rotation
  group.rotation.x = 0.25;
  group.rotation.y = 0.35;
  group.rotation.z = 0.1;

  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = 0.35 + nx * 0.35;
    targetRotX = 0.25 + ny * 0.25;
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

    group.rotation.y += 0.0005;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.035;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.015;

    tmpColor1.lerpColors(material1.color, currentTint.a, 0.01);
    tmpColor2.lerpColors(material2.color, currentTint.b, 0.01);
    
    material1.color.copy(tmpColor1);
    material1.emissive.copy(tmpColor1);
    material2.color.copy(tmpColor2);
    material2.emissive.copy(tmpColor2);

    renderer.render(scene, camera);
  }

  animate();
})();
