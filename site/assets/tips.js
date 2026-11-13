// "?" help buttons: hover or keyboard focus shows the explanation (CSS); a tap or click pins it open
// for touch screens. Escape or a tap elsewhere closes it.
const tips = [...document.querySelectorAll(".tip")];

function closeAll(except) {
  tips.forEach((t) => {
    if (t !== except) {
      t.classList.remove("open");
      t.querySelector(".tip-btn")?.setAttribute("aria-expanded", "false");
    }
  });
}

tips.forEach((t) => {
  const btn = t.querySelector(".tip-btn");
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // don't toggle the field this label belongs to
    const open = !t.classList.contains("open");
    closeAll(t);
    t.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".tip")) closeAll();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAll();
});
