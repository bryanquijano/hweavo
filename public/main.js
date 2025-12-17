import * as API from "./api.js";
import * as Parsers from "./parsers.js";
import * as UI from "./ui.js";
import * as State from "./state.js";
import { initSearch } from "./search.js";
import { initFilters } from "./filters.js";
import { initPagination } from "./pagination.js";

document.addEventListener("DOMContentLoaded", async () => {
    // --- 1. INITIALIZATION ---

    // Initialize UI Components
    initSearch();
    initFilters();
    initPagination();

    // Load Data & Initialize State
    const books = await API.getBooks();
    State.init(books);

    // --- 2. GLOBAL VARIABLES ---
    let activeTab = "goodreads";
    let currentSavedBookId = null;
    let currentRating = 0;

    // --- 3. DOM ELEMENTS ---
    const els = {
        // Modals
        modalBackdrop: document.getElementById("modal-backdrop"),
        bulkBackdrop: document.getElementById("bulk-modal-backdrop"),
        ratingBackdrop: document.getElementById("rating-modal-backdrop"),

        // Buttons
        addBookBtn: document.getElementById("add-book-btn"),
        closeModalBtn: document.querySelector(".close-modal"),
        closeBulkBtn: document.querySelector(".close-bulk"),
        closeRatingBtn: document.getElementById("close-rating-modal"),
        openBulkGr: document.getElementById("open-bulk-btn"),
        openBulkSg: document.getElementById("open-bulk-sg-btn"),
        processBulk: document.getElementById("process-bulk-btn"),
        clearGr: document.getElementById("clear-form-btn"),
        clearSg: document.getElementById("clear-sg-btn"),
        addMood: document.getElementById("add-mood-btn"),
        goToDetails: document.getElementById("go-to-details-btn"),

        // Inputs & Forms
        grForm: document.getElementById("goodreads-form"),
        sgForm: document.getElementById("storygraph-form"),
        grIsSeries: document.getElementById("gr-is-series"),
        bulkAwardsWrapper: document.getElementById("bulk-awards-wrapper"),
        bulkIsSeries: document.getElementById("bulk-is-series-check"),
        bulkSeriesWrapper: document.getElementById("bulk-series-wrapper"),
        coverUrl: document.getElementById("cover-url"),
        finalCoverPath: document.getElementById("final-cover-path"),
        saveLocal: document.getElementById("save-local-copy"),
        dropArea: document.getElementById("drop-area"),
        fileElem: document.getElementById("fileElem"),
        urlOptions: document.getElementById("url-options"),

        // NEW Inputs
        grDetailedCheck: document.getElementById("gr-detailed-score-check"),
        grDetailedInput: document.getElementById("detailed-score-input"),
        grDetailedText: document.getElementById("gr-detailed-score-text"),
        grChoiceAwards: document.getElementById("gr-choice-awards"),
        bulkHasAwards: document.getElementById("bulk-has-awards-check"),
        userStatus: document.getElementById("user-status-select"),
        userStarted: document.getElementById("user-started-date"),
        userFinished: document.getElementById("user-finished-date"),

        // Containers
        moodsContainer: document.getElementById("moods-container"),
        starsWrapper: document.getElementById("stars-wrapper"),
        rateModalCover: document.getElementById("rate-modal-cover"),
        rateModalTitle: document.getElementById("rate-modal-title"),
        ratingValueDisplay: document.getElementById("rating-value"),
    };

    // --- 4. EVENT LISTENERS ---

    // Toggle Main Modal
    els.addBookBtn.onclick = () => els.modalBackdrop.classList.remove("hidden");
    els.closeModalBtn.onclick = () => els.modalBackdrop.classList.add("hidden");

    // Toggle Rating Modal
    els.closeRatingBtn.onclick = async () => {
        els.ratingBackdrop.classList.add("hidden");
        // Refresh grid via State after closing rating modal
        const updatedBooks = await API.getBooks();
        State.init(updatedBooks);
    };

    // Tabs
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            activeTab = tab.dataset.target;
            document
                .querySelectorAll(".tab")
                .forEach((t) => t.classList.remove("active"));
            document
                .querySelectorAll(".tab-content")
                .forEach((c) => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(`tab-${activeTab}`).classList.add("active");
        });
    });

    // Bulk Modal Logic
    const openBulk = () => {
        els.bulkBackdrop.classList.remove("hidden");
        if (activeTab === "storygraph") {
            // Hide Goodreads-specific fields
            els.bulkSeriesWrapper.classList.add("hidden");
            if (els.bulkAwardsWrapper)
                els.bulkAwardsWrapper.classList.add("hidden");
        } else {
            // Show Goodreads-specific fields
            els.bulkSeriesWrapper.classList.remove("hidden");
            if (els.bulkAwardsWrapper)
                els.bulkAwardsWrapper.classList.remove("hidden");
        }
    };
    els.openBulkGr.onclick = openBulk;
    els.openBulkSg.onclick = openBulk;
    els.closeBulkBtn.onclick = () => els.bulkBackdrop.classList.add("hidden");

    // Bulk Processing
    els.processBulk.onclick = () => {
        const text = document.getElementById("bulk-text").value;
        if (!text) return alert("Paste text first.");

        try {
            if (activeTab === "goodreads") {
                UI.resetForms();

                // Safe check if element exists
                const hasAwards = els.bulkHasAwards
                    ? els.bulkHasAwards.checked
                    : false;

                const data = Parsers.parseGoodreadsText(
                    text,
                    els.bulkIsSeries.checked,
                    hasAwards
                );
                UI.fillGrForm(data);
            } else {
                document.getElementById("storygraph-form").reset();
                if (els.moodsContainer) els.moodsContainer.innerHTML = "";
                UI.addMoodRow(els.moodsContainer);

                const data = Parsers.parseStoryGraphText(text);
                UI.fillSgForm(data);
            }
            els.bulkBackdrop.classList.add("hidden");
        } catch (e) {
            console.error(e);
            alert("Parsing error. Check console.");
        }
    };

    // Clear Forms
    els.clearGr.onclick = UI.resetForms;
    els.clearSg.onclick = () => {
        document.getElementById("storygraph-form").reset();
        els.moodsContainer.innerHTML = "";
        UI.addMoodRow(els.moodsContainer);
    };

    // Toggle Detailed Score
    if (els.grDetailedCheck) {
        els.grDetailedCheck.onchange = (e) => {
            if (e.target.checked)
                els.grDetailedInput.classList.remove("hidden");
            else els.grDetailedInput.classList.add("hidden");
        };
    }

    // Dynamic Moods
    if (els.moodsContainer) UI.addMoodRow(els.moodsContainer);
    els.addMood.onclick = () => UI.addMoodRow(els.moodsContainer);

    // Form Logic (Series Toggle)
    els.grIsSeries.onchange = (e) => {
        const inputs = document.getElementById("series-inputs");
        if (e.target.checked) inputs.classList.remove("hidden");
        else inputs.classList.add("hidden");
    };

    // Save Book Handlers
    els.grForm.onsubmit = handleSave;
    els.sgForm.onsubmit = handleSave;

    async function handleSave(e) {
        e.preventDefault();

        const grData = scrapeGoodreadsData();
        const sgData = scrapeStoryGraphData();

        const userData = {
            status: els.userStatus.value,
            started: els.userStarted.value,
            finished: els.userFinished.value,
        };

        const payload = {
            cover: els.finalCoverPath.value,
            downloadCover: els.saveLocal.checked,
            goodreads: grData,
            storygraph: sgData,
            user: userData,
        };

        const result = await API.saveBookPayload(payload);
        if (result.success) {
            UI.resetForms();
            els.modalBackdrop.classList.add("hidden");

            currentSavedBookId = result.id;
            els.rateModalCover.src = result.cover || "";
            els.rateModalTitle.innerText = result.title;
            resetStars();
            els.ratingBackdrop.classList.remove("hidden");

            // Refresh Grid Background State
            const updatedBooks = await API.getBooks();
            State.init(updatedBooks);
        } else {
            alert("Save failed.");
        }
    }

    // --- 5. RATING LOGIC ---
    function resetStars() {
        currentRating = 0;
        els.ratingValueDisplay.innerText = "0.0";
        document
            .querySelectorAll(".star")
            .forEach((s) => (s.className = "star"));
    }

    els.starsWrapper.onmousemove = (e) => {
        const star = e.target;
        if (!star.classList.contains("star")) return;
        const index = Array.from(document.querySelectorAll(".star")).indexOf(
            star
        );
        const rect = star.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        const val = isLeft ? index + 0.5 : index + 1;
        updateStars(val);
        els.ratingValueDisplay.innerText = val.toFixed(1);
    };

    els.starsWrapper.onmouseleave = () => {
        updateStars(currentRating);
        els.ratingValueDisplay.innerText = currentRating.toFixed(1);
    };

    els.starsWrapper.onclick = async (e) => {
        const star = e.target;
        if (!star.classList.contains("star")) return;
        const index = Array.from(document.querySelectorAll(".star")).indexOf(
            star
        );
        const rect = star.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        currentRating = isLeft ? index + 0.5 : index + 1;

        await API.saveUserScore(currentSavedBookId, currentRating);
        updateStars(currentRating);

        // Refresh state to update sorts
        const updatedBooks = await API.getBooks();
        State.init(updatedBooks);
    };

    function updateStars(val) {
        document.querySelectorAll(".star").forEach((s, i) => {
            s.className = "star";
            if (val >= i + 1) s.classList.add("filled");
            else if (val >= i + 0.5) s.classList.add("half-filled");
        });
    }

    els.goToDetails.onclick = () => {
        if (currentSavedBookId)
            window.location.href = `details.html?id=${currentSavedBookId}`;
    };

    // --- 6. COVER IMAGE LOGIC ---
    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
        els.dropArea.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    ["dragenter", "dragover"].forEach((evt) =>
        els.dropArea.addEventListener(evt, () =>
            els.dropArea.classList.add("highlight")
        )
    );
    ["dragleave", "drop"].forEach((evt) =>
        els.dropArea.addEventListener(evt, () =>
            els.dropArea.classList.remove("highlight")
        )
    );

    els.dropArea.addEventListener("drop", (e) =>
        handleFiles(e.dataTransfer.files)
    );
    els.fileElem.onchange = (e) => handleFiles(e.target.files);

    async function handleFiles(files) {
        if (files.length) {
            const res = await API.uploadCoverImage(files[0]);
            if (res.success) updateCoverUI(res.filePath);
        }
    }

    els.coverUrl.oninput = (e) => {
        if (e.target.value) {
            updateCoverUI(e.target.value);
            els.urlOptions.classList.remove("hidden");
        } else {
            updateCoverUI("");
            els.urlOptions.classList.add("hidden");
        }
    };

    function updateCoverUI(path) {
        els.finalCoverPath.value = path;
        const prev = document.getElementById("cover-preview");
        if (path) {
            prev.src = path;
            prev.classList.remove("hidden");
        } else {
            prev.classList.add("hidden");
        }
    }

    // --- HELPERS ---

    function scrapeGoodreadsData() {
        const detailedText = els.grDetailedCheck.checked
            ? els.grDetailedText.value
            : "";

        let choiceAwards = [];
        try {
            if (els.grChoiceAwards && els.grChoiceAwards.value) {
                choiceAwards = JSON.parse(els.grChoiceAwards.value);
            }
        } catch (e) {
            console.error("Invalid Choice Awards JSON");
        }

        return {
            title: document.getElementById("gr-title").value,
            isSeries: els.grIsSeries.checked,
            seriesName: document.getElementById("gr-series-name").value,
            seriesNum: document.getElementById("gr-series-num").value,
            authors: document
                .getElementById("gr-authors")
                .value.split(",")
                .map((s) => s.trim()),
            score: document.getElementById("gr-score").value,
            ratings: document.getElementById("gr-ratings").value,
            reviews: document.getElementById("gr-reviews").value,
            detailedScore: Parsers.parseDetailedScore(detailedText),
            goodreadsChoiceAward: choiceAwards,
            synopsis: document
                .getElementById("gr-synopsis")
                .value.split("\n\n"),
            genres: document
                .getElementById("gr-genres")
                .value.split(",")
                .map((s) => s.trim()),
            pageCount: document.getElementById("gr-pages").value,
            style: document.getElementById("gr-style").value,
            firstPublished: document.getElementById("gr-published").value,
            language: document.getElementById("gr-language").value,
            originalTitle: document.getElementById("gr-orig-title").value,
            publisher: document.getElementById("gr-publisher").value,
            isbn: document.getElementById("gr-isbn").value,
            isbn10: document.getElementById("gr-isbn10").value,
            asin: document.getElementById("gr-asin").value,
            awards: document.getElementById("gr-awards").value
                ? document
                      .getElementById("gr-awards")
                      .value.split(",")
                      .map((s) => s.trim())
                : [],
            setting: document.getElementById("gr-setting").value
                ? document
                      .getElementById("gr-setting")
                      .value.split(",")
                      .map((s) => s.trim())
                : [],
            characters: document.getElementById("gr-characters").value
                ? document
                      .getElementById("gr-characters")
                      .value.split(",")
                      .map((s) => s.trim())
                : [],
        };
    }

    function scrapeStoryGraphData() {
        const moods = [];
        document.querySelectorAll(".mood-row").forEach((row) => {
            const name = row.querySelector(".mood-name").value;
            const perc = row.querySelector(".mood-perc").value;
            if (name) moods.push({ name, percent: perc });
        });

        return {
            aiSummary: document
                .getElementById("sg-ai-summary")
                .value.split("\n\n"),
            description: document
                .getElementById("sg-description")
                .value.split("\n\n"),
            score: document.getElementById("sg-score").value,
            reviews: document.getElementById("sg-reviews").value,
            moods: moods,
            scales: {
                pace: {
                    fast: document.getElementById("sg-pace-fast").value,
                    medium: document.getElementById("sg-pace-medium").value,
                    slow: document.getElementById("sg-pace-slow").value,
                    na: document.getElementById("sg-pace-na").value,
                },
                plotType: {
                    plot: document.getElementById("sg-type-plot").value,
                    mix: document.getElementById("sg-type-mix").value,
                    char: document.getElementById("sg-type-char").value,
                    na: document.getElementById("sg-type-na").value,
                },
                characterDev: {
                    yes: document.getElementById("sg-dev-yes").value,
                    complicated: document.getElementById("sg-dev-comp").value,
                    no: document.getElementById("sg-dev-no").value,
                    na: document.getElementById("sg-dev-na").value,
                },
                loveable: {
                    yes: document.getElementById("sg-love-yes").value,
                    complicated: document.getElementById("sg-love-comp").value,
                    no: document.getElementById("sg-love-no").value,
                    na: document.getElementById("sg-love-na").value,
                },
                diversity: {
                    yes: document.getElementById("sg-div-yes").value,
                    complicated: document.getElementById("sg-div-comp").value,
                    no: document.getElementById("sg-div-no").value,
                    na: document.getElementById("sg-div-na").value,
                },
                flaws: {
                    yes: document.getElementById("sg-flaw-yes").value,
                    complicated: document.getElementById("sg-flaw-comp").value,
                    no: document.getElementById("sg-flaw-no").value,
                    na: document.getElementById("sg-flaw-na").value,
                },
            },
            warnings: {
                graphic: document.getElementById("sg-warn-graphic").value
                    ? document
                          .getElementById("sg-warn-graphic")
                          .value.split(",")
                          .map((s) => s.trim())
                    : [],
                moderate: document.getElementById("sg-warn-moderate").value
                    ? document
                          .getElementById("sg-warn-moderate")
                          .value.split(",")
                          .map((s) => s.trim())
                    : [],
                minor: document.getElementById("sg-warn-minor").value
                    ? document
                          .getElementById("sg-warn-minor")
                          .value.split(",")
                          .map((s) => s.trim())
                    : [],
            },
        };
    }
});
