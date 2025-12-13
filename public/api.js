export async function getBooks() {
    try {
        const res = await fetch("/books");
        return await res.json();
    } catch (err) {
        console.error("Error fetching books:", err);
        return [];
    }
}

export async function saveBookPayload(payload) {
    const res = await fetch("/save-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return await res.json();
}

export async function saveUserScore(bookId, score) {
    await fetch("/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, score }),
    });
}

export async function triggerUrlDownload(url) {
    const res = await fetch("/download-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
    });
    return await res.json();
}

export async function getBookDetails(id) {
    try {
        const res = await fetch(`/book/${id}`);
        if (!res.ok) throw new Error("Book not found");
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

export async function uploadCoverImage(file) {
    const formData = new FormData();
    formData.append("coverImage", file);
    const res = await fetch("/upload-cover", {
        method: "POST",
        body: formData,
    });
    return await res.json();
}

export async function saveUserStatus(bookId, status) {
    await fetch("/save-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, status }),
    });
}

export async function toggleFavorite(bookId) {
    const res = await fetch("/toggle-favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
    });
    return await res.json();
}

export async function deleteBook(bookId) {
    const res = await fetch("/delete-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
    });
    return await res.json();
}