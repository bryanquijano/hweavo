import { setFilter } from "./state.js";

export function initSearch() {
    const input = document.getElementById("search-input");
    if (!input) return;

    let timeout;

    input.addEventListener("input", (e) => {
        const val = e.target.value;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            setFilter("search", val);
        }, 300);
    });
}
