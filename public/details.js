import * as API from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");

    if (!bookId) {
        alert("No book ID provided.");
        window.location.href = "index.html";
        return;
    }

    const book = await API.getBookDetails(bookId);

    if (!book) {
        document.getElementById("loading").innerText = "Book not found.";
        return;
    }

    renderDetails(book);
    setupInteractiveControls(bookId, book);
    setupModalsAndToggles(book);
});

// Helper: Format Number
const formatNum = (num) => {
    if (!num) return "0";
    const clean = String(num).replace(/,/g, "");
    return parseInt(clean).toLocaleString();
};

function renderDetails(book) {
    const g = book.goodreads;
    const s = book.storygraph;

    document.getElementById("loading").classList.add("hidden");
    document.getElementById("details-content").classList.remove("hidden");

    // --- Sidebar ---
    document.getElementById("d-cover").src =
        book.cover || "assets/placeholder.jpg";

    const pageCount = g.pageCount ? formatNum(g.pageCount) : "?";
    document.getElementById("d-format").innerText = `${
        g.style || "Format Unknown"
    }, ${pageCount} pages`;
    document.getElementById("d-published").innerText =
        g.firstPublished || "Unknown";
    document.getElementById("d-isbn").innerText =
        g.isbn || g.isbn10 || g.asin || "N/A";

    const userScore = book.userScore || 0;
    document.getElementById("d-user-score-text").innerText =
        userScore > 0 ? userScore + "/5" : "Not Rated";
    renderInteractiveStars(userScore, document.getElementById("d-user-stars"));

    // Dates
    const dateContainer = document.getElementById("d-user-dates");
    const status = book.userStatus || "Want to Read";
    document.getElementById("d-status-select").value = status;
    const startInput = document.getElementById("d-started-input");
    const finishInput = document.getElementById("d-finished-input");
    if (book.started) startInput.value = book.started;
    if (book.finished) finishInput.value = book.finished;
    const shouldShowDates =
        book.started ||
        book.finished ||
        ["Reading", "Finished", "Dropped"].includes(status);
    if (shouldShowDates) dateContainer.classList.remove("hidden");

    const favBtn = document.getElementById("d-fav-btn");
    if (book.isFavorite) favBtn.classList.add("active");

    // --- Header ---
    document.getElementById("d-title").innerText = g.title;

    // FIX: Render authors as individual clickable spans
    const authorsDiv = document.getElementById("d-authors-list");
    if (g.authors && g.authors.length > 0) {
        authorsDiv.innerHTML = g.authors
            .map((author) => {
                // Display name strips the parenthetical info
                const displayAuthor = author.replace(/\s+\(.*?\)/, "").trim();
                // Full name (with parenthetical) is used for searching
                return `<span class="author-link clickable-link" data-author-name="${author.trim()}">${displayAuthor}</span>`;
            })
            .join(" • "); // Use a separator between authors
    } else {
        authorsDiv.innerText = "Unknown";
    }

    document.getElementById("d-gr-score").innerText = g.score || "-";
    document.getElementById("d-gr-ratings").innerText = formatNum(g.ratings);
    document.getElementById("d-gr-reviews").innerText = formatNum(g.reviews);

    if (g.isSeries && g.seriesName) {
        const badge = document.getElementById("d-series-badge");
        badge.innerText = `${g.seriesName} #${g.seriesNum}`;
        badge.classList.remove("hidden");
    }

    if (g.genres)
        document.getElementById("d-genres").innerHTML = g.genres
            .slice(0, 5)
            .map((gen) => `<span class="genre-tag">${gen}</span>`)
            .join("");

    // --- Synopsis (Render & Check length later in setupModals) ---
    if (g.synopsis)
        document.getElementById("d-synopsis").innerHTML = g.synopsis
            .map((p) => `<p>${p}</p>`)
            .join("");

    if (s.aiSummary && s.aiSummary.length > 0) {
        document.getElementById("sg-ai-block").classList.remove("hidden");
        document.getElementById("d-ai-summary").innerHTML = s.aiSummary
            .map((p) => `<p>${p}</p>`)
            .join("");
    }

    if (g.detailedScore) renderScoreBreakdown(g.detailedScore);

    const moodsDiv = document.getElementById("d-moods");
    if (s.moods && s.moods.length > 0) {
        moodsDiv.innerHTML = s.moods
            .map(
                (m) =>
                    `<span class="mood-tag"><strong>${m.name}</strong>: ${m.percent}%</span>`
            )
            .join("");
    } else {
        moodsDiv.innerHTML = "<span class='text-muted'>No mood data.</span>";
    }

    if (s.scales) renderScales(s.scales);
    renderContentWarnings(s.warnings);

    // Advanced Metadata
    const advDiv = document.getElementById("d-advanced-content");
    let advHtml = "";
    if (g.awards && g.awards.length)
        advHtml += `<p><strong>Awards:</strong> ${g.awards.join(", ")}</p>`;
    if (g.setting && g.setting.length)
        advHtml += `<p><strong>Setting:</strong> ${g.setting.join(", ")}</p>`;
    if (g.characters && g.characters.length)
        advHtml += `<p><strong>Characters:</strong> ${g.characters.join(
            ", "
        )}</p>`;
    if (g.publisher)
        advHtml += `<p><strong>Publisher:</strong> ${g.publisher}</p>`;
    advDiv.innerHTML = advHtml || "No extra metadata.";
}

// --- NEW FUNCTIONALITY ---
function setupModalsAndToggles(book) {
    const g = book.goodreads;

    // 1. SYNOPSIS TOGGLE
    const synText = document.getElementById("d-synopsis");
    const synBtn = document.getElementById("toggle-synopsis-btn");

    const textLen = g.synopsis ? g.synopsis.join(" ").length : 0;

    if (textLen > 400) {
        synBtn.classList.remove("hidden");
        synBtn.onclick = () => {
            if (synText.classList.contains("synopsis-clamp")) {
                synText.classList.remove("synopsis-clamp");
                synBtn.innerText = "Show less";
            } else {
                synText.classList.add("synopsis-clamp");
                synBtn.innerText = "Show more";
            }
        };
    }

    // 2. SERIES MODAL
    const seriesBadge = document.getElementById("d-series-badge");
    const seriesModal = document.getElementById("series-modal-backdrop");
    const closeSeries = document.getElementById("close-series-modal");

    if (g.isSeries && g.seriesName) {
        seriesBadge.onclick = async () => {
            const allBooks = await API.getBooks();
            // Filter: Matches series name
            const seriesBooks = allBooks
                .filter(
                    (b) =>
                        b.goodreads.isSeries &&
                        b.goodreads.seriesName === g.seriesName
                )
                .sort((a, b) => {
                    // Sort by series number
                    return (
                        parseFloat(a.goodreads.seriesNum) -
                        parseFloat(b.goodreads.seriesNum)
                    );
                });

            renderBookList(document.getElementById("series-list"), seriesBooks);
            document.getElementById(
                "series-modal-title"
            ).innerText = `Series: ${g.seriesName}`;
            seriesModal.classList.remove("hidden");
        };
    }
    closeSeries.onclick = () => seriesModal.classList.add("hidden");

    // 3. AUTHOR MODAL (FIXED & PAGINATED)
    const authorModal = document.getElementById("author-modal-backdrop");
    const closeAuthor = document.getElementById("close-author-modal");

    document
        .getElementById("d-authors-list")
        .addEventListener("click", async (e) => {
            const authorLink = e.target.closest(".author-link");
            if (!authorLink) return;

            // Get the full author name from the data attribute
            const clickedAuthor = authorLink.dataset.authorName;
            // Clean name for display title
            const displayTitle = clickedAuthor.replace(/\s+\(.*?\)/, "").trim();

            const allBooks = await API.getBooks();

            // Filter books
            let authorBooks = allBooks.filter(
                (b) =>
                    b.goodreads.authors &&
                    b.goodreads.authors.includes(clickedAuthor)
            );

            // 1. Sort by Highest Rated (Desc)
            authorBooks.sort(
                (a, b) =>
                    parseFloat(b.goodreads.score) -
                    parseFloat(a.goodreads.score)
            );

            // 2. Slice Top 5
            const topBooks = authorBooks.slice(0, 5);

            // 3. Render List
            const listContainer = document.getElementById("author-list");
            renderBookList(listContainer, topBooks);

            document.getElementById(
                "author-modal-title"
            ).innerText = `Top Rated by ${displayTitle}`;

            // 4. Add "View All" Button logic
            // Remove existing button if any to avoid duplicates
            const existingBtn = document.getElementById("author-view-all-btn");
            if (existingBtn) existingBtn.remove();

            if (authorBooks.length > 5) {
                const viewAllBtn = document.createElement("button");
                viewAllBtn.id = "author-view-all-btn";
                viewAllBtn.className = "btn primary full-width";
                viewAllBtn.style.marginTop = "1rem";
                viewAllBtn.innerText = `View All ${authorBooks.length} Books`;
                viewAllBtn.onclick = () => {
                    // Pass raw string for filter
                    window.location.href = `author.html?name=${encodeURIComponent(
                        clickedAuthor
                    )}`;
                };
                // Append after the list inside modal-body
                listContainer.parentNode.appendChild(viewAllBtn);
            }

            authorModal.classList.remove("hidden");
        });

    closeAuthor.onclick = () => authorModal.classList.add("hidden");

    // Close on backdrop click
    window.onclick = (e) => {
        if (e.target === seriesModal) seriesModal.classList.add("hidden");
        if (e.target === authorModal) authorModal.classList.add("hidden");
    };
}

function renderBookList(container, books) {
    container.innerHTML = "";
    if (books.length === 0) {
        container.innerHTML = "<p class='text-muted'>No books found.</p>";
        return;
    }

    books.forEach((b) => {
        const div = document.createElement("div");
        div.className = "modal-book-item";
        div.innerHTML = `
            <img src="${b.cover || "assets/placeholder.jpg"}">
            <div class="modal-book-info">
                <h4>${b.goodreads.title}</h4>
                <p>${
                    b.goodreads.isSeries
                        ? `#${b.goodreads.seriesNum} in ${b.goodreads.seriesName}`
                        : b.goodreads.firstPublished
                }</p>
            </div>
        `;
        div.onclick = () => (window.location.href = `details.html?id=${b.id}`);
        container.appendChild(div);
    });
}

// --- SCALES RENDERER UPDATED (Split logic) ---
function renderScales(scales) {
    const container = document.getElementById("d-scales-container");
    const extraContainer = document.getElementById("d-scales-extra");
    const toggleBtn = document.getElementById("toggle-scales-btn");

    container.innerHTML = "";
    extraContainer.innerHTML = "";

    if (!scales) return;

    // Helper Configs (omitted for brevity, assume they are defined)
    const paceConfig = [
        { key: "fast", color: "bg-orange", label: "Fast" },
        { key: "medium", color: "bg-pink", label: "Medium" },
        { key: "slow", color: "bg-purple", label: "Slow" },
        { key: "na", color: "bg-na", label: "N/A", textDark: true },
    ];
    const plotConfig = [
        { key: "plot", color: "bg-orange", label: "Plot" },
        { key: "mix", color: "bg-pink", label: "A mix" },
        { key: "char", color: "bg-purple", label: "Character" },
        { key: "na", color: "bg-na", label: "N/A", textDark: true },
    ];
    const binaryConfig = [
        { key: "yes", color: "bg-darkblue", label: "Yes" },
        {
            key: "complicated",
            color: "bg-teal",
            label: "Complicated",
            textDark: true,
        },
        { key: "no", color: "bg-lightblue", label: "No", textDark: true },
        { key: "na", color: "bg-na", label: "N/A", textDark: true },
    ];

    // Main Scales (Visible)
    container.appendChild(createScaleBlock("Pace", scales.pace, paceConfig));
    container.appendChild(
        createScaleBlock(
            "Plot or Character Driven?",
            scales.plotType,
            plotConfig
        )
    );
    container.appendChild(
        createScaleBlock(
            "Strong Character Development?",
            scales.characterDev,
            binaryConfig
        )
    );

    // Extra Scales (Hidden)
    extraContainer.appendChild(
        createScaleBlock("Loveable Characters?", scales.loveable, binaryConfig)
    );
    extraContainer.appendChild(
        createScaleBlock(
            "Diverse Cast of Characters?",
            scales.diversity,
            binaryConfig
        )
    );
    extraContainer.appendChild(
        createScaleBlock(
            "Flaws of Characters a Main Focus?",
            scales.flaws,
            binaryConfig
        )
    );

    // Toggle Button Logic
    toggleBtn.classList.remove("hidden");
    toggleBtn.innerText = "Show All Scales";
    toggleBtn.onclick = () => {
        if (extraContainer.classList.contains("hidden")) {
            extraContainer.classList.remove("hidden");
            toggleBtn.innerText = "Hide Extra Scales";
        } else {
            extraContainer.classList.add("hidden");
            toggleBtn.innerText = "Show All Scales";
        }
    };
}

function setupInteractiveControls(bookId, book) {
    const statusSelect = document.getElementById("d-status-select");
    const dateContainer = document.getElementById("d-user-dates");
    const startInput = document.getElementById("d-started-input");
    const finishInput = document.getElementById("d-finished-input");

    statusSelect.addEventListener("change", async (e) => {
        const val = e.target.value;
        if (val === "Delete") {
            if (confirm("Are you sure?")) {
                const res = await API.deleteBook(bookId);
                if (res.success) window.location.href = "index.html";
            } else {
                e.target.value = book.userStatus || "Want to Read";
            }
        } else {
            await API.saveUserStatus(bookId, val);
            book.userStatus = val;
            if (["Reading", "Finished", "Dropped"].includes(val))
                dateContainer.classList.remove("hidden");
            else if (!startInput.value && !finishInput.value)
                dateContainer.classList.add("hidden");
        }
    });

    const favBtn = document.getElementById("d-fav-btn");
    favBtn.addEventListener("click", async () => {
        const res = await API.toggleFavorite(bookId);
        if (res.success) favBtn.classList.toggle("active", res.isFavorite);
    });

    const saveDates = async () => {
        await API.saveUserDates(bookId, startInput.value, finishInput.value);
    };
    [startInput, finishInput].forEach((input) => {
        input.addEventListener("blur", saveDates);
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") input.blur();
        });
    });

    const starsContainer = document.getElementById("d-user-stars");
    let currentRating = book.userScore || 0;

    starsContainer.addEventListener("mousemove", (e) => {
        const star = e.target;
        if (!star.classList.contains("star")) return;
        const index = Array.from(
            starsContainer.querySelectorAll(".star")
        ).indexOf(star);
        const rect = star.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        const hoverVal = isLeft ? index + 0.5 : index + 1;
        renderInteractiveStars(hoverVal, starsContainer);
        document.getElementById("d-user-score-text").innerText =
            hoverVal.toFixed(1);
    });

    starsContainer.addEventListener("mouseleave", () => {
        renderInteractiveStars(currentRating, starsContainer);
        document.getElementById("d-user-score-text").innerText =
            currentRating > 0 ? currentRating.toFixed(1) + "/5" : "Not Rated";
    });

    starsContainer.addEventListener("click", async (e) => {
        const star = e.target;
        if (!star.classList.contains("star")) return;
        const index = Array.from(
            starsContainer.querySelectorAll(".star")
        ).indexOf(star);
        const rect = star.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        currentRating = isLeft ? index + 0.5 : index + 1;
        await API.saveUserScore(bookId, currentRating);
        if (statusSelect.value === "Want to Read")
            statusSelect.value = "Finished";
        renderInteractiveStars(currentRating, starsContainer);
        document.getElementById("d-user-score-text").innerText =
            currentRating + "/5";
    });
}

function renderInteractiveStars(score, container) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (score >= i) html += '<span class="star filled">★</span>';
        else if (score >= i - 0.5)
            html += '<span class="star half-filled">★</span>';
        else html += '<span class="star">★</span>';
    }
    container.innerHTML = html;
}

function createScaleBlock(title, dataObj, config) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<div class="scale-category-title">${title}</div>`;
    if (!dataObj) return wrapper;

    const chartDiv = document.createElement("div");
    chartDiv.className = "scale-chart";

    let activeSegments = [];
    config.forEach((c) => {
        const rawVal = dataObj[c.key] || dataObj[c.label] || 0;
        const val = parseInt(rawVal);
        if (val > 0) activeSegments.push({ ...c, val: val });
    });

    if (activeSegments.length === 0) {
        wrapper.innerHTML +=
            "<small style='text-align:center; display:block; color:#777;'>No data</small>";
        return wrapper;
    }

    const MIN_WIDTH = 7;
    let smallSegs = activeSegments.filter((s) => s.val < MIN_WIDTH);
    let largeSegs = activeSegments.filter((s) => s.val >= MIN_WIDTH);
    let availableSpace = 100 - smallSegs.length * MIN_WIDTH;
    let totalLargeVal = largeSegs.reduce((sum, s) => sum + s.val, 0);

    activeSegments.forEach((s) => {
        if (s.val < MIN_WIDTH) s.width = MIN_WIDTH;
        else
            s.width =
                totalLargeVal > 0
                    ? (s.val / totalLargeVal) * availableSpace
                    : MIN_WIDTH;
    });

    let barHTML = `<div class="chart-bar-row">`;
    let legendHTML = `<div class="chart-legend">`;

    activeSegments.forEach((s) => {
        const textColor = s.textDark ? "text-dark" : "";
        barHTML += `<div class="chart-segment ${s.color} ${textColor}" style="width: ${s.width}%">${s.val}%</div>`;
        legendHTML += `<div class="legend-item"><div class="legend-dot ${s.color}"></div> ${s.label}</div>`;
    });

    barHTML += `</div>`;
    legendHTML += `</div>`;

    chartDiv.innerHTML = barHTML + legendHTML;
    wrapper.appendChild(chartDiv);
    return wrapper;
}

function renderContentWarnings(warnings) {
    const previewDiv = document.getElementById("d-warnings-preview");
    const fullListDiv = document.getElementById("full-warnings-list");
    const btn = document.getElementById("view-all-warnings-btn");

    const modal = document.getElementById("warnings-modal-backdrop");
    document.getElementById("close-warnings-modal").onclick = () =>
        modal.classList.add("hidden");
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    };

    if (
        !warnings ||
        (!warnings.graphic.length &&
            !warnings.moderate.length &&
            !warnings.minor.length)
    ) {
        previewDiv.innerHTML =
            "<span class='text-muted'>No content warnings logged.</span>";
        return;
    }

    const generateHTML = (cat, items, isPreview) => {
        if (!items || items.length === 0) return "";
        const displayItems = isPreview ? items.slice(0, 3) : items;
        const listStr = displayItems.join(", ");
        let extraText =
            isPreview && items.length > 3
                ? `<span class="blur-more">... +${items.length - 3} more</span>`
                : "";
        return `<h5 class="${cat}">${
            cat.charAt(0).toUpperCase() + cat.slice(1)
        }</h5><div class="warning-text">${listStr} ${extraText}</div>`;
    };

    let previewHTML = "";
    previewHTML += generateHTML("graphic", warnings.graphic, true);
    previewHTML += generateHTML("moderate", warnings.moderate, true);
    previewHTML += generateHTML("minor", warnings.minor, true);
    previewDiv.innerHTML = previewHTML;

    let fullHTML = "";
    fullHTML += generateHTML("graphic", warnings.graphic, false);
    fullHTML += generateHTML("moderate", warnings.moderate, false);
    fullHTML += generateHTML("minor", warnings.minor, false);
    fullListDiv.innerHTML = fullHTML;

    const hasOverflow =
        warnings.graphic.length > 3 ||
        warnings.moderate.length > 3 ||
        warnings.minor.length > 3;
    if (hasOverflow) {
        btn.classList.remove("hidden");
        btn.onclick = () => modal.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
    }
}

function renderScoreBreakdown(data) {
    const container = document.getElementById("d-breakdown-container");
    const chart = document.getElementById("d-breakdown-chart");

    container.classList.remove("hidden");
    chart.innerHTML = "";
    const stars = ["1", "2", "3", "4", "5"];
    stars.forEach((starKey) => {
        const info = data[starKey] || { count: 0, percent: 0 };
        const percent = parseInt(info.percent);
        const isMax = percent > 0 && percent >= 50;
        const barClass = isMax ? "bd-bar highlight" : "bd-bar";
        const html = `
            <div class="breakdown-bar-group" data-tooltip="${formatNum(
                info.count
            )} ratings (${percent}%)">
                <div class="${barClass}" style="height: ${percent}%"></div>
                <div class="bd-label">${starKey}★</div>
            </div>
        `;
        chart.innerHTML += html;
    });
}
