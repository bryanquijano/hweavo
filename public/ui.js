// --- HOME PAGE GRID ---
export function renderBookGrid(books) {
    const grid = document.getElementById("book-grid");

    if (books.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h2>Your collection is empty</h2>
                <p>Click "+ Add Book" to get started.</p>
            </div>`;
        return;
    }

    grid.innerHTML = "";

    const gridContainer = document.createElement("div");
    gridContainer.className = "books-container";

    books.forEach((book) => {
        const card = document.createElement("div");
        card.className = "book-card";
        card.dataset.id = book.id;

        const coverSrc = book.cover ? book.cover : "assets/placeholder.jpg";

        card.innerHTML = `
            <div class="card-cover">
                <img src="${coverSrc}" alt="${
            book.goodreads.title
        }" loading="lazy">
            </div>
            <div class="card-info">
                <h3>${book.goodreads.title}</h3>
                <span class="card-author">${
                    book.goodreads.authors
                        ? book.goodreads.authors[0]
                        : "Unknown"
                }</span>
            </div>
        `;

        card.addEventListener("click", () => {
            window.location.href = `details.html?id=${book.id}`;
        });

        gridContainer.appendChild(card);
    });

    grid.appendChild(gridContainer);
}

// --- FORM HELPERS ---
export function resetForms() {
    document.getElementById("goodreads-form").reset();
    document.getElementById("storygraph-form").reset();

    // Reset hidden/custom elements
    document.getElementById("gr-is-series").checked = false;
    document.getElementById("series-inputs").classList.add("hidden");

    // Detailed Score Reset
    document.getElementById("gr-detailed-score-check").checked = false;
    document.getElementById("detailed-score-input").classList.add("hidden");
    document.getElementById("gr-detailed-score-text").value = "";

    // NEW: Choice Awards Reset
    document.getElementById("gr-choice-awards").value = "";

    // User Data Reset
    document.getElementById("user-status-select").value = "Want to Read";
    document.getElementById("user-started-date").value = "";
    document.getElementById("user-finished-date").value = "";

    const moodsContainer = document.getElementById("moods-container");
    if (moodsContainer) {
        moodsContainer.innerHTML = "";
        addMoodRow(moodsContainer);
    }

    // Reset Cover
    document.getElementById("cover-preview").src = "";
    document.getElementById("cover-preview").classList.add("hidden");
    document.getElementById("final-cover-path").value = "";
    document.getElementById("cover-url").value = "";
    document.getElementById("url-options").classList.add("hidden");
    document.getElementById("save-local-copy").checked = false;
}

export function addMoodRow(container, name = "", percent = "") {
    const row = document.createElement("div");
    row.className = "mood-row";
    row.innerHTML = `
        <input type="text" class="mood-name" placeholder="Mood" value="${name}">
        <input type="number" class="mood-perc" placeholder="%" value="${percent}">
        <button type="button" class="remove-mood">&times;</button>
    `;
    row.querySelector(".remove-mood").addEventListener("click", () =>
        row.remove()
    );
    container.appendChild(row);
}

// --- FORM FILLERS ---
export function fillGrForm(data) {
    if (data.title) document.getElementById("gr-title").value = data.title;
    if (data.authors)
        document.getElementById("gr-authors").value = data.authors.join(", ");
    if (data.score) document.getElementById("gr-score").value = data.score;
    if (data.ratings)
        document.getElementById("gr-ratings").value = data.ratings;
    if (data.reviews)
        document.getElementById("gr-reviews").value = data.reviews;
    if (data.synopsis)
        document.getElementById("gr-synopsis").value =
            data.synopsis.join("\n\n");
    if (data.genres)
        document.getElementById("gr-genres").value = data.genres.join(", ");
    if (data.pages) document.getElementById("gr-pages").value = data.pages;
    if (data.style) document.getElementById("gr-style").value = data.style;
    if (data.firstPublished)
        document.getElementById("gr-published").value = data.firstPublished;
    if (data.language)
        document.getElementById("gr-language").value = data.language;
    if (data.originalTitle)
        document.getElementById("gr-orig-title").value = data.originalTitle;
    if (data.publisher)
        document.getElementById("gr-publisher").value = data.publisher;
    if (data.isbn) document.getElementById("gr-isbn").value = data.isbn;
    if (data.isbn10) document.getElementById("gr-isbn10").value = data.isbn10;
    if (data.asin) document.getElementById("gr-asin").value = data.asin;
    if (data.awards)
        document.getElementById("gr-awards").value = data.awards.join(", ");
    if (data.setting)
        document.getElementById("gr-setting").value = data.setting.join(", ");
    if (data.characters)
        document.getElementById("gr-characters").value =
            data.characters.join(", ");

    // NEW: Populate Choice Awards
    if (data.goodreadsChoiceAward) {
        document.getElementById("gr-choice-awards").value = JSON.stringify(
            data.goodreadsChoiceAward,
            null,
            2
        );
    }
    
    if (data.isSeries) {
        const check = document.getElementById("gr-is-series");
        check.checked = true;
        check.dispatchEvent(new Event("change"));
        if (data.seriesName)
            document.getElementById("gr-series-name").value = data.seriesName;
        if (data.seriesNum)
            document.getElementById("gr-series-num").value = data.seriesNum;
    }
}

export function fillSgForm(data) {
    if (data.aiSummary)
        document.getElementById("sg-ai-summary").value =
            data.aiSummary.join("\n\n");
    if (data.description)
        document.getElementById("sg-description").value =
            data.description.join("\n\n");
    if (data.score) document.getElementById("sg-score").value = data.score;
    if (data.reviews)
        document.getElementById("sg-reviews").value = data.reviews;

    if (data.moods && data.moods.length > 0) {
        const container = document.getElementById("moods-container");
        container.innerHTML = "";
        data.moods.forEach((m) => addMoodRow(container, m.name, m.percent));
    }

    const setScale = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || 0;
    };
    if (data.scales) {
        const mapScale = (cat, prefix) => {
            const s = data.scales[cat] || {};
            const keys = {
                fast: "fast",
                medium: "medium",
                slow: "slow",
                Plot: "plot",
                "A mix": "mix",
                Character: "char",
                Yes: "yes",
                Complicated: "comp",
                No: "no",
                "N/A": "na",
            };
            for (let key in keys) {
                if (s[key] !== undefined)
                    setScale(`${prefix}-${keys[key]}`, s[key]);
            }
            if (s["N/A"]) setScale(`${prefix}-na`, s["N/A"]);
        };

        const p = data.scales["Pace"] || {};
        setScale("sg-pace-fast", p["fast"]);
        setScale("sg-pace-medium", p["medium"]);
        setScale("sg-pace-slow", p["slow"]);
        setScale("sg-pace-na", p["N/A"]);

        const t = data.scales["Plot or character driven?"] || {};
        setScale("sg-type-plot", t["Plot"]);
        setScale("sg-type-mix", t["A mix"]);
        setScale("sg-type-char", t["Character"]);
        setScale("sg-type-na", t["N/A"]);

        const mapYesNo = (cat, id) => {
            const d = data.scales[cat] || {};
            setScale(`sg-${id}-yes`, d["Yes"]);
            setScale(`sg-${id}-comp`, d["Complicated"]);
            setScale(`sg-${id}-no`, d["No"]);
            setScale(`sg-${id}-na`, d["N/A"]);
        };
        mapYesNo("Strong character development?", "dev");
        mapYesNo("Loveable characters?", "love");
        mapYesNo("Diverse cast of characters?", "div");
        mapYesNo("Flaws of characters a main focus?", "flaw");
    }

    if (data.warnings) {
        document.getElementById("sg-warn-graphic").value =
            data.warnings.graphic.join(", ");
        document.getElementById("sg-warn-moderate").value =
            data.warnings.moderate.join(", ");
        document.getElementById("sg-warn-minor").value =
            data.warnings.minor.join(", ");
    }
}
