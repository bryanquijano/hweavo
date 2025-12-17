const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const https = require("https");
const crypto = require("crypto");
const readability = require("./readability");

const PORT = 3000;

// Ensure folders exist
if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync("public/assets/covers"))
    fs.mkdirSync("public/assets/covers", { recursive: true });

// Initialize user.json
const userJsonPath = path.join(__dirname, "data", "user.json");
if (!fs.existsSync(userJsonPath)) {
    fs.writeFileSync(userJsonPath, JSON.stringify({ library: [] }, null, 2));
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/assets/covers/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});
const upload = multer({ storage: storage });

// Configure Multer for EPUBs (Temp storage)
const epubStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/assets/covers/'); }, // Using covers dir as temp is fine, or create 'temp/'
    filename: (req, file, cb) => { cb(null, `temp-${Date.now()}.epub`); }
});
const uploadEpub = multer({ storage: epubStorage });

app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));

// --- HELPER: Read/Write User Data ---
function getUserData() {
    return JSON.parse(fs.readFileSync(userJsonPath, "utf-8"));
}
function saveUserData(data) {
    fs.writeFileSync(userJsonPath, JSON.stringify(data, null, 2));
}

// --- ROUTES ---

// 1. GET ALL BOOKS (Fixed: Merges User Data for Favorites/Sorts)
app.get("/books", (req, res) => {
    const booksPath = path.join(__dirname, "data", "books.jsonl");
    if (!fs.existsSync(booksPath)) return res.json([]);

    const books = [];
    const fileStream = fs.readFileSync(booksPath, "utf-8");
    const lines = fileStream.split("\n");

    // Get User Data to merge
    const userData = getUserData();
    const library = userData.library || userData.scores || [];

    lines.forEach((line) => {
        if (line.trim()) {
            try {
                const book = JSON.parse(line);
                // Find matching user entry
                const userEntry = library.find(
                    (entry) => entry.bookId === book.id
                );

                // Merge user-specific fields
                if (userEntry) {
                    book.isFavorite = userEntry.isFavorite || false;
                    book.userScore = userEntry.score || 0;
                    book.userStatus = userEntry.status || "Want to Read";
                    book.started = userEntry.started || "";
                    book.finished = userEntry.finished || "";
                } else {
                    book.isFavorite = false;
                    book.userScore = 0;
                    book.userStatus = "Want to Read";
                }

                books.push(book);
            } catch (err) {
                console.error(err);
            }
        }
    });
    res.json(books);
});

// 2. GET SINGLE BOOK + USER DATA (Fixed: Returns Dates)
app.get("/book/:id", (req, res) => {
    const bookId = req.params.id;
    const booksPath = path.join(__dirname, "data", "books.jsonl");

    // Find Book
    let foundBook = null;
    if (fs.existsSync(booksPath)) {
        const lines = fs.readFileSync(booksPath, "utf-8").split("\n");
        for (const line of lines) {
            if (!line.trim()) continue;
            const book = JSON.parse(line);
            if (book.id === bookId) {
                foundBook = book;
                break;
            }
        }
    }
    if (!foundBook) return res.status(404).json({ error: "Book not found" });

    // Merge User Data
    const userData = getUserData();
    const library = userData.library || userData.scores || [];
    const entry = library.find((s) => s.bookId === bookId) || {};

    res.json({
        ...foundBook,
        userScore: entry.score || 0,
        userStatus: entry.status || "Want to Read",
        isFavorite: entry.isFavorite || false,
        // Explicitly return dates
        started: entry.started || "",
        finished: entry.finished || "",
    });
});

// 3. UPLOAD & DOWNLOAD COVERS
const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https
            .get(url, (res) => {
                res.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            })
            .on("error", (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
    });
};

app.post("/upload-cover", upload.single("coverImage"), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    res.json({
        success: true,
        filePath: `/assets/covers/${req.file.filename}`,
    });
});

app.post("/download-cover", (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false });
    const filename = `cover-${Date.now()}.jpg`;
    const filepath = path.join(
        __dirname,
        "public",
        "assets",
        "covers",
        filename
    );
    const file = fs.createWriteStream(filepath);
    https.get(imageUrl, (response) => {
        response.pipe(file);
        file.on("finish", () => {
            file.close();
            res.json({ success: true, filePath: `/assets/covers/${filename}` });
        });
    });
});

// 4. SAVE NEW BOOK
app.post("/save-book", async (req, res) => {
    const { goodreads, storygraph, user, cover, downloadCover } = req.body;
    const bookId = crypto.randomUUID();
    let finalCoverPath = cover;

    // Handle "Download Local" Logic
    if (downloadCover && cover && cover.startsWith("http")) {
        try {
            const filename = `cover-${Date.now()}-${crypto
                .randomBytes(4)
                .toString("hex")}.jpg`;
            const localPath = path.join(
                __dirname,
                "public",
                "assets",
                "covers",
                filename
            );
            await downloadImage(cover, localPath);
            finalCoverPath = `/assets/covers/${filename}`;
        } catch (err) {
            console.error("Cover download failed", err);
        }
    }

    // Create entry for books.jsonl (Shared Data)
    const newEntry = {
        id: bookId,
        addedAt: new Date().toISOString(),
        cover: finalCoverPath,
        goodreads: goodreads || {},
        storygraph: storygraph || {},
    };

    // Save to books.jsonl
    fs.appendFile(
        path.join(__dirname, "data", "books.jsonl"),
        JSON.stringify(newEntry) + "\n",
        (err) => {
            if (err) return res.status(500).json({ success: false });

            // NEW: Save Initial User Data (Status & Dates) to user.json
            if (user) {
                updateUserEntry(bookId, (entry) => {
                    entry.status = user.status || "Want to Read";
                    if (user.started) entry.started = user.started;
                    if (user.finished) entry.finished = user.finished;
                });
            }

            res.json({
                success: true,
                id: bookId,
                cover: finalCoverPath,
                title: newEntry.goodreads.title,
            });
        }
    );
});

// NEW: Calculate Readability
app.post('/calculate-readability', uploadEpub.single('epubFile'), async (req, res) => {
    const { bookId } = req.body;
    if (!req.file || !bookId) return res.status(400).json({ success: false, message: "Missing file or ID" });

    const filePath = req.file.path;

    try {
        // 1. Analyze
        const scores = await readability.analyzeEpub(filePath);

        // 2. Update books.jsonl
        const booksPath = path.join(__dirname, 'data', 'books.jsonl');
        if (fs.existsSync(booksPath)) {
            const lines = fs.readFileSync(booksPath, 'utf-8').split('\n');
            const newContent = lines.map(line => {
                if (!line.trim()) return line;
                const book = JSON.parse(line);
                if (book.id === bookId) {
                    book.readability = scores; // Add scores to book
                }
                return JSON.stringify(book);
            }).join('\n');
            fs.writeFileSync(booksPath, newContent);
        }

        // 3. Clean up
        fs.unlink(filePath, () => {});

        res.json({ success: true, readability: scores });

    } catch (err) {
        console.error("Readability Error:", err);
        fs.unlink(filePath, () => {});
        res.status(500).json({ success: false, message: "Analysis failed" });
    }
});

// 5. USER ACTIONS (Score, Status, Favorite, Delete)
function updateUserEntry(bookId, callback) {
    const data = JSON.parse(fs.readFileSync(userJsonPath, "utf-8"));
    if (!data.library) {
        data.library = data.scores || [];
        delete data.scores;
    }

    let entryIndex = data.library.findIndex((s) => s.bookId === bookId);
    let entry = entryIndex > -1 ? data.library[entryIndex] : { bookId };

    callback(entry);

    if (entryIndex > -1) data.library[entryIndex] = entry;
    else data.library.push(entry);

    fs.writeFileSync(userJsonPath, JSON.stringify(data, null, 2));
}

app.post("/save-dates", (req, res) => {
    const { bookId, started, finished } = req.body;
    updateUserEntry(bookId, (entry) => {
        // Allow saving empty string to clear date
        if (started !== undefined) entry.started = started;
        if (finished !== undefined) entry.finished = finished;
    });
    res.json({ success: true });
});

app.post("/save-score", (req, res) => {
    const { bookId, score } = req.body;
    updateUserEntry(bookId, (entry) => {
        entry.score = score;
        if (score > 0 && (!entry.status || entry.status === "Want to Read")) {
            entry.status = "Finished";
        }
    });
    res.json({ success: true });
});

app.post("/save-status", (req, res) => {
    const { bookId, status } = req.body;
    updateUserEntry(bookId, (entry) => {
        entry.status = status;
    });
    res.json({ success: true });
});

app.post("/toggle-favorite", (req, res) => {
    const { bookId } = req.body;
    let isFav = false;
    updateUserEntry(bookId, (entry) => {
        entry.isFavorite = !entry.isFavorite;
        isFav = entry.isFavorite;
    });
    res.json({ success: true, isFavorite: isFav });
});

app.post("/delete-book", (req, res) => {
    const { bookId } = req.body;
    const booksPath = path.join(__dirname, "data", "books.jsonl");

    // 1. Remove from JSONL
    if (fs.existsSync(booksPath)) {
        const lines = fs.readFileSync(booksPath, "utf-8").split("\n");
        const newContent = lines
            .filter((line) => {
                if (!line.trim()) return false;
                const book = JSON.parse(line);
                return book.id !== bookId;
            })
            .join("\n");
        fs.writeFileSync(booksPath, newContent + (newContent ? "\n" : ""));
    }

    // 2. Remove from User Data
    const data = getUserData();
    if (data.library) {
        data.library = data.library.filter((s) => s.bookId !== bookId);
        saveUserData(data);
    }

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
