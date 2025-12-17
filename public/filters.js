import { setFilter } from "./state.js";

export function initFilters() {
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            setFilter("sort", e.target.value);
        });
    }

    const favBtn = document.getElementById("fav-filter-btn");
    let isFavActive = false;

    if (favBtn) {
        favBtn.addEventListener("click", () => {
            isFavActive = !isFavActive;
            if (isFavActive) {
                favBtn.classList.add("active");
                favBtn.style.color = "#cf6679";
                favBtn.style.borderColor = "#cf6679";
            } else {
                favBtn.classList.remove("active");
                favBtn.style.color = "";
                favBtn.style.borderColor = "";
            }
            setFilter("favoritesOnly", isFavActive);
        });
    }
}
