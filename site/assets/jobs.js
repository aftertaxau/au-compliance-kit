// Filters the occupation tables on the pay-by-job index as you type.
const input = document.getElementById("job-filter");
const count = document.getElementById("job-count");
const tables = [...document.querySelectorAll(".job-wrap table")];

function filter() {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  for (const table of tables) {
    let visible = 0;
    for (const row of table.tBodies[0].rows) {
      const match = !q || row.dataset.name.includes(q);
      row.hidden = !match;
      if (match) visible++;
    }
    const wrap = table.closest(".table-scroll");
    wrap.hidden = visible === 0;
    const heading = wrap.previousElementSibling;
    if (heading?.classList.contains("job-group")) heading.hidden = visible === 0;
    shown += visible;
  }
  document.getElementById("job-top").hidden = Boolean(q);
  document.getElementById("job-top-h").hidden = Boolean(q);
  count.textContent = q ? `${shown} matching ${shown === 1 ? "job" : "jobs"}` : "";
}

input.addEventListener("input", filter);
