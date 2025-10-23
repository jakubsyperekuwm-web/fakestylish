function includeHTML(id, file) {
  fetch(file)
    .then(res => {
      if (!res.ok) throw new Error(`Błąd ładowania ${file}`);
      return res.text();
    })
    .then(data => {
      document.getElementById(id).innerHTML = data;
    })
    .catch(err => console.error(err));
}

window.addEventListener("DOMContentLoaded", () => {
  includeHTML("navbar", "navbar.html");
  includeHTML("footer", "footer.html");
});
