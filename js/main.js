document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const is3D = () => root.classList.contains("view-3d");

  // Mobile nav toggle
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // home page: the nav hides on the hero; the top tab or the pointer near the top reveals it
  const overlayNav = document.querySelector(".nav--overlay");
  const navTab = document.querySelector(".nav-tab");
  if (overlayNav) {
    const peek = (on) => overlayNav.classList.toggle("is-peek", on);
    if (navTab) navTab.addEventListener("click", () => peek(true));
    window.addEventListener("mousemove", (e) => {
      if (e.clientY < 24) peek(true);
      else if (e.clientY > 110 && !overlayNav.matches(":focus-within")) peek(false);
    });
  }

  // 3D ⇄ simple view
  const viewToggle = document.querySelector(".view-toggle");
  if (viewToggle) {
    viewToggle.addEventListener("click", () => {
      const next = is3D() ? "simple" : "3d";
      root.classList.remove("view-3d", "view-simple");
      root.classList.add("view-" + next);
      try { localStorage.setItem("view", next); } catch (e) {}
      closeDrawer();
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    });
  }

  // section reader for the 3D view: shows a copy of the simple-view section
  const drawer = document.querySelector(".drawer");
  const drawerBody = drawer && drawer.querySelector(".drawer__body");
  let lastFocus = null;

  function openDrawer(key) {
    const src = document.getElementById(key);
    if (!drawer || !src) return;
    const wrap = src.querySelector(".wrap");
    drawerBody.innerHTML = wrap ? wrap.innerHTML : src.innerHTML;
    drawerBody.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    drawer.querySelector(".drawer__close").focus();
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; }, 350);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeDrawer();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  document.querySelectorAll("[data-open]").forEach((btn) =>
    btn.addEventListener("click", () => openDrawer(btn.dataset.open))
  );

  // in the 3D view, section links fly to that title instead of jumping
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-section], a[href^='#']");
    if (!a || !is3D()) return;
    const key = a.dataset.section || a.getAttribute("href").slice(1);
    if (key === "hero") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!window.fly) return;
    closeDrawer();
    if (window.fly.goTo(key)) e.preventDefault();
  });

  // simple scroll-reveal for cards/sections
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => obs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }
});
