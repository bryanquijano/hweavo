import * as UI from "./ui.js";

const STATE = {
    allBooks: [],
    filteredBooks: [],
    currentPage: 1,
    itemsPerPage: 18,
    filters: {
        search: "",
        favoritesOnly: false,
        sort: "added_new",
    },
};

export function init(books) {
    STATE.allBooks = books;
    applyFilters();
}

export function setFilter(key, value) {
    STATE.filters[key] = value;
    STATE.currentPage = 1;
    applyFilters();
}

export function setPage(pageNum) {
    const max = Math.ceil(STATE.filteredBooks.length / STATE.itemsPerPage) || 1;
    if (pageNum < 1) pageNum = 1;
    if (pageNum > max) pageNum = max;

    STATE.currentPage = pageNum;
    renderCurrentPage();
}

export function getState() {
    return {
        currentPage: STATE.currentPage,
        totalPages:
            Math.ceil(STATE.filteredBooks.length / STATE.itemsPerPage) || 1,
        totalItems: STATE.filteredBooks.length,
    };
}

function applyFilters() {
    let result = [...STATE.allBooks];

    // 1. Favorites
    if (STATE.filters.favoritesOnly) {
        result = result.filter((b) => b.isFavorite);
    }

    // 2. Search (Title, Author, Year)
    const q = STATE.filters.search.toLowerCase();
    if (q) {
        result = result.filter((b) => {
            const title = b.goodreads.title?.toLowerCase() || "";
            const author = b.goodreads.authors?.join(" ").toLowerCase() || "";
            const year = b.goodreads.firstPublished?.toLowerCase() || "";
            return title.includes(q) || author.includes(q) || year.includes(q);
        });
    }

    // 3. Sort
    result.sort((a, b) => {
        const s = STATE.filters.sort;

        const getTitle = (x) => x.goodreads.title?.toLowerCase() || "";
        const getAuthor = (x) => x.goodreads.authors?.[0]?.toLowerCase() || "";
        const getYear = (x) => {
            const match = (x.goodreads.firstPublished || "").match(/\d{4}/);
            return match ? parseInt(match[0]) : 0;
        };
        const getRating = (x) => x.userScore || 0;
        const getDateAdded = (x) => new Date(x.addedAt).getTime();

        switch (s) {
            case "title_az":
                return getTitle(a).localeCompare(getTitle(b));
            case "title_za":
                return getTitle(b).localeCompare(getTitle(a));
            case "author_az":
                return getAuthor(a).localeCompare(getAuthor(b));
            case "year_new":
                return getYear(b) - getYear(a);
            case "year_old":
                return getYear(a) - getYear(b);
            case "rating_high":
                return getRating(b) - getRating(a);
            case "rating_low":
                return getRating(a) - getRating(b);
            case "added_old":
                return getDateAdded(a) - getDateAdded(b);
            case "added_new":
            default:
                return getDateAdded(b) - getDateAdded(a);
        }
    });

    STATE.filteredBooks = result;

    // Update Counter
    const counter = document.getElementById("showing-count");
    if (counter) counter.innerText = `Showing ${result.length} books`;

    renderCurrentPage();
}

function renderCurrentPage() {
    const start = (STATE.currentPage - 1) * STATE.itemsPerPage;
    const end = start + STATE.itemsPerPage;
    const pageSlice = STATE.filteredBooks.slice(start, end);

    UI.renderBookGrid(pageSlice);

    // Dispatch event for Pagination Component
    document.dispatchEvent(
        new CustomEvent("pagination-update", { detail: getState() })
    );
}
