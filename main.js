const input = document.querySelector("#searchInput");
const cards = [...document.querySelectorAll(".card")];
const openCurrent = document.querySelector("#openCurrent");

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[target="preview"]');
  if (link) {
    openCurrent.href = link.href;
  }
});

input.addEventListener("input", () => {
  const keyword = input.value.trim().toLowerCase();
  for (const card of cards) {
    const title = card.dataset.title.toLowerCase();
    card.classList.toggle("is-hidden", keyword && !title.includes(keyword));
  }
});
