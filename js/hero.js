/* ============================================================
   Hero signature visual: a rotating wireframe globe with a
   handful of great-circle "connection" arcs — a nod to global
   strategy, diplomacy (MUN) and building something that scales
   across a community/network. Ambient, not interactive-heavy.
   ============================================================ */

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 7.2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const group = new THREE.Group();
  scene.add(group);

  const BRASS = 0xc6a15b;
  const SLATE = 0x7c93a8;

  // Base wireframe sphere (latitude/longitude look)
  const sphereGeo = new THREE.SphereGeometry(2.4, 28, 20);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: SLATE,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Slightly larger, sparser brass shell for depth
  const sphereGeo2 = new THREE.SphereGeometry(2.42, 14, 10);
  const sphereMat2 = new THREE.MeshBasicMaterial({
    color: BRASS,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const sphere2 = new THREE.Mesh(sphereGeo2, sphereMat2);
  group.add(sphere2);

  // Great-circle "connection" arcs
  function makeArc(latA, lonA, latB, lonB, color, segments) {
    const r = 2.46;
    const toVec = (lat, lon) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    };
    const a = toVec(latA, lonA);
    const b = toVec(latB, lonB);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.setLength(r * 1.35);

    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const points = curve.getPoints(segments || 48);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
    });
    return new THREE.Line(geo, mat);
  }

  const arcs = [
    makeArc(28, -80, 51, 0, BRASS), // NY - London
    makeArc(51, 0, 35, 139, BRASS), // London - Tokyo
    makeArc(19, 72, 51, 0, SLATE), // Mumbai - London
    makeArc(19, 72, 1, 103, SLATE), // Mumbai - Singapore
    makeArc(35, 139, -33, 151, SLATE), // Tokyo - Sydney
  ];
  arcs.forEach((arc) => group.add(arc));

  // Node points at arc endpoints
  const nodeGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xede8dc });
  const nodeCoords = [
    [28, -80],
    [51, 0],
    [35, 139],
    [19, 72],
    [1, 103],
    [-33, 151],
  ];
  nodeCoords.forEach(([lat, lon]) => {
    const r = 2.46;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.set(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
    group.add(node);
  });

  group.rotation.x = 0.32;
  group.rotation.y = -0.4;

  // subtle mouse parallax
  let targetRotY = group.rotation.y;
  let targetRotX = group.rotation.x;
  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    targetRotY = -0.4 + nx * 0.35;
    targetRotX = 0.32 + ny * 0.2;
  });

  resize();
  window.addEventListener("resize", resize);

  let raf = null;
  function animate() {
    raf = requestAnimationFrame(animate);
    group.rotation.y += 0.0016;
    if (!prefersReducedMotion) {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.02;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.0006;
    }
    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }

  // pause when off-screen to save battery
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!raf && !prefersReducedMotion) animate();
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    },
    { threshold: 0.05 }
  );
  io.observe(canvas);
})();
