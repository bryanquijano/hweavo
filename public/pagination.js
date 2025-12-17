import { setPage } from "./state.js";

export function initPagination() {
    const els = {
        first: document.getElementById("p-first"),
        prev: document.getElementById("p-prev"),
        next: document.getElementById("p-next"),
        last: document.getElementById("p-last"),
        input: document.getElementById("p-current"),
        max: document.getElementById("p-max"),
        bar: document.getElementById("pagination-controls"),
    };

    document.addEventListener("pagination-update", (e) => {
        const { currentPage, totalPages, totalItems } = e.detail;

        if (totalItems === 0) {
            els.bar.classList.add("hidden");
            return;
        }
        els.bar.classList.remove("hidden");

        els.input.value = currentPage;
        els.max.innerText = totalPages;

        els.first.disabled = currentPage === 1;
        els.prev.disabled = currentPage === 1;
        els.next.disabled = currentPage === totalPages;
        els.last.disabled = currentPage === totalPages;
    });

    els.first.onclick = () => setPage(1);
    els.prev.onclick = () => changePage(-1);
    els.next.onclick = () => changePage(1);
    els.last.onclick = () => setPage(parseInt(els.max.innerText));

    els.input.addEventListener("click", function () {
        this.select();
    });
    els.input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") validateAndGo();
    });
    els.input.addEventListener("blur", validateAndGo);

    function changePage(delta) {
        const current = parseInt(els.input.value);
        setPage(current + delta);
    }

    function validateAndGo() {
        const val = parseInt(els.input.value);
        const max = parseInt(els.max.innerText);
        if (isNaN(val) || val < 1 || val > max) {
            els.input.classList.add("shake-error");
            setTimeout(() => els.input.classList.remove("shake-error"), 500);
            return;
        }
        setPage(val);
    }
}
