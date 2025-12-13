import * as API from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const authorName = params.get("name");

    if (!authorName) {
        alert("No author specified.");
        window.location.href = "index.html";
        return;
    }

    const allBooks = await API.getBooks();

    // Filter books by exact author string match (includes "George Orwell" if data is "George Orwell")
    const authorBooks = allBooks.filter(
        (b) =>
            b.goodreads.authors &&
            b.goodreads.authors.some((a) => a.includes(authorName))
    );

    if (authorBooks.length === 0) {
        document.getElementById("loading").innerText =
            "No books found for this author.";
        return;
    }

    renderAuthorPage(authorName, authorBooks);
});

function renderAuthorPage(name, books) {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("author-content").classList.remove("hidden");

    // Clean name for display (remove parentheticals like " (Foreword)")
    const displayName = name.replace(/\s+\(.*?\)/, "").trim();
    document.getElementById("a-name").innerText = displayName;
    document.getElementById(
        "a-total-books"
    ).innerText = `${books.length} Books`;

    // Calculate Avg Score
    const totalScore = books.reduce(
        (acc, b) => acc + parseFloat(b.goodreads.score || 0),
        0
    );
    const avgScore = (totalScore / books.length).toFixed(2);
    document.getElementById("a-avg-score").innerText = `${avgScore} Avg Rating`;

    const catalogDiv = document.getElementById("author-catalog");
    catalogDiv.innerHTML = "";

    // 1. Group by Series
    const seriesGroups = {};
    const standalones = [];

    books.forEach((book) => {
        if (book.goodreads.isSeries && book.goodreads.seriesName) {
            const sName = book.goodreads.seriesName;
            if (!seriesGroups[sName]) seriesGroups[sName] = [];
            seriesGroups[sName].push(book);
        } else {
            standalones.push(book);
        }
    });

    // 2. Render Series Sections
    // Sort series names alphabetically
    const sortedSeriesNames = Object.keys(seriesGroups).sort();

    sortedSeriesNames.forEach((seriesName) => {
        const seriesBooks = seriesGroups[seriesName];
        // Sort books by series number
        seriesBooks.sort((a, b) => {
            const numA = parseFloat(a.goodreads.seriesNum) || 0;
            const numB = parseFloat(b.goodreads.seriesNum) || 0;
            return numA - numB;
        });

        const section = createCatalogSection(
            `${seriesName} Series`,
            seriesBooks
        );
        catalogDiv.appendChild(section);
    });

    // 3. Render Standalones
    if (standalones.length > 0) {
        // Sort by Score for quality
        standalones.sort((a, b) => {
            return (
                parseFloat(b.goodreads.score) - parseFloat(a.goodreads.score)
            );
        });
        const section = createCatalogSection("Standalones", standalones);
        catalogDiv.appendChild(section);
    }
}

function createCatalogSection(title, books) {
    const section = document.createElement("section");
    section.className = "catalog-section";

    const header = document.createElement("h2");
    header.className = "catalog-header";
    header.innerText = title;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "books-container"; // Reuse existing grid style

    books.forEach((book) => {
        const card = document.createElement("div");
        card.className = "book-card";

        const coverSrc = book.cover ? book.cover : "assets/placeholder.jpg";

        card.innerHTML = `
            <div class="card-cover">
                <img src="${coverSrc}" alt="${
            book.goodreads.title
        }" loading="lazy">
            </div>
            <div class="card-info">
                <h3>${book.goodreads.title}</h3>
                <div class="card-meta">
                    <span>★ ${book.goodreads.score}</span>
                    ${
                        book.goodreads.isSeries
                            ? `<span class="series-tag">#${book.goodreads.seriesNum}</span>`
                            : ""
                    }
                </div>
            </div>
        `;

        card.onclick = () =>
            (window.location.href = `details.html?id=${book.id}`);
        grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
}
