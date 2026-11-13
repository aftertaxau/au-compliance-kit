// Phone menu: the "Menu" button opens the site links; a link tap, a tap outside, Escape or
// widening the screen closes it.
const header = document.querySelector(".site-header");
const button = header?.querySelector(".menu-btn");
const nav = header?.querySelector(".nav");

if (header && button && nav) {
  const setOpen = (open) => {
    header.classList.toggle("nav-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.querySelector(".menu-text").textContent = open ? "Close" : "Menu";
  };
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!header.classList.contains("nav-open"));
  });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("click", (e) => { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("nav-open")) { setOpen(false); button.focus(); }
  });
  window.matchMedia("(min-width: 721px)").addEventListener?.("change", (m) => { if (m.matches) setOpen(false); });
}
