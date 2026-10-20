// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
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

  // home page: nav slides in once you leave the hero (or when the top tab is clicked)
  const overlayNav = document.querySelector(".nav--overlay");
  const hero = document.getElementById("hero");
  const navTab = document.querySelector(".nav-tab");
  if (overlayNav && hero) {
    const syncNav = () => {
      overlayNav.classList.toggle("is-shown", hero.getBoundingClientRect().bottom < 120);
    };
    window.addEventListener("scroll", syncNav, { passive: true });
    syncNav();
    if (navTab) navTab.addEventListener("click", () => overlayNav.classList.add("is-shown"));
  }

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
