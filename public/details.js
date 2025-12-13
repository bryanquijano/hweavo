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
});

function renderDetails(book) {
    const g = book.goodreads;
    const s = book.storygraph;

    document.getElementById("loading").classList.add("hidden");
    document.getElementById("details-content").classList.remove("hidden");

    // --- Sidebar & Header ---
    document.getElementById("d-cover").src =
        book.cover || "assets/placeholder.jpg";
    document.getElementById("d-format").innerText = `${
        g.style || "Format Unknown"
    }, ${g.pageCount || "?"} pages`;
    document.getElementById("d-published").innerText =
        g.firstPublished || "Unknown";
    document.getElementById("d-isbn").innerText =
        g.isbn || g.isbn10 || g.asin || "N/A";

    // Status & Fav (Initial State)
    document.getElementById("d-status-select").value =
        book.userStatus || "Want to Read";
    const favBtn = document.getElementById("d-fav-btn");
    if (book.isFavorite) favBtn.classList.add("active");

    // Rating (Initial Render)
    const userScore = book.userScore || 0;
    document.getElementById("d-user-score-text").innerText =
        userScore > 0 ? userScore + "/5" : "Not Rated";
    renderInteractiveStars(userScore, document.getElementById("d-user-stars"));

    // Header Data
    document.getElementById("d-title").innerText = g.title;
    document.getElementById("d-authors").innerText = g.authors
        ? g.authors.join(", ")
        : "Unknown";
    document.getElementById("d-gr-score").innerText = g.score || "-";
    document.getElementById("d-gr-ratings").innerText = g.ratings || "0";
    document.getElementById("d-gr-reviews").innerText = g.reviews || "0";

    if (g.isSeries && g.seriesName) {
        const badge = document.getElementById("d-series-badge");
        badge.innerText = `${g.seriesName} #${g.seriesNum}`;
        badge.classList.remove("hidden");
    }

    // --- Content (Genres, Synopsis, etc.) ---
    if (g.genres)
        document.getElementById("d-genres").innerHTML = g.genres
            .slice(0, 5)
            .map((gen) => `<span class="genre-tag">${gen}</span>`)
            .join("");
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

    // --- Stats Grid ---
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

    // Advanced
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

// --- CONTROLS LOGIC ---
function setupInteractiveControls(bookId, book) {
    // 1. Status Change
    const statusSelect = document.getElementById("d-status-select");
    statusSelect.addEventListener("change", async (e) => {
        const val = e.target.value;
        if (val === "Delete") {
            if (
                confirm(
                    "Are you sure you want to delete this book? This cannot be undone."
                )
            ) {
                const res = await API.deleteBook(bookId);
                if (res.success) window.location.href = "index.html";
                else alert("Failed to delete book.");
            } else {
                // Revert selection
                e.target.value = book.userStatus || "Want to Read";
            }
        } else {
            // Save Status
            await API.saveUserStatus(bookId, val);
            book.userStatus = val; // Update local state
        }
    });

    // 2. Favorite Toggle
    const favBtn = document.getElementById("d-fav-btn");
    favBtn.addEventListener("click", async () => {
        const res = await API.toggleFavorite(bookId);
        if (res.success) {
            favBtn.classList.toggle("active", res.isFavorite);
        }
    });

    // 3. Interactive Stars
    const starsContainer = document.getElementById("d-user-stars");
    let currentRating = book.userScore || 0;

    starsContainer.addEventListener("mousemove", (e) => {
        const star = e.target;
        if (!star.classList.contains("star")) return;
        const stars = Array.from(starsContainer.querySelectorAll(".star"));
        const index = stars.indexOf(star);
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
        const stars = Array.from(starsContainer.querySelectorAll(".star"));
        const index = stars.indexOf(star);
        const rect = star.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;

        currentRating = isLeft ? index + 0.5 : index + 1;

        // Save Score
        await API.saveUserScore(bookId, currentRating);

        // Auto-update status to "Finished" in UI if previously "Want to Read"
        if (statusSelect.value === "Want to Read") {
            statusSelect.value = "Finished";
            // Backend handles the actual status update logic in save-score too, but UI needs visual update
        }

        renderInteractiveStars(currentRating, starsContainer);
        document.getElementById("d-user-score-text").innerText =
            currentRating + "/5";
    });
}

// --- VISUALIZATION HELPERS ---

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

function renderScales(scales) {
    const container = document.getElementById("d-scales-container");
    container.innerHTML = "";

    if (!scales) return;

    // Helper Configs
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
    container.appendChild(
        createScaleBlock("Loveable Characters?", scales.loveable, binaryConfig)
    );
    container.appendChild(
        createScaleBlock(
            "Diverse Cast of Characters?",
            scales.diversity,
            binaryConfig
        )
    );
    container.appendChild(
        createScaleBlock(
            "Flaws of Characters a Main Focus?",
            scales.flaws,
            binaryConfig
        )
    );
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

    // Min Width Calc
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

    // Modal Logic
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
