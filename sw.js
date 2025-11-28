const STORAGE_KEY = "notes_txt_app";
let notes = [];
let activeId = null;

const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const searchInput = document.getElementById("search");
const noteList = document.getElementById("noteList");

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Load from localStorage
function loadNotes() {
    const raw = localStorage.getItem(STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : [];
}

// Save to localStorage
function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Render notes list
function renderList(query = "") {
    const q = query.toLowerCase();
    noteList.innerHTML = "";

    const filtered = notes.filter(n =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        noteList.innerHTML = "<div>No notes</div>";
        return;
    }

    filtered.forEach(n => {
        const d = document.createElement("div");
        d.className = "note-item" + (n.id === activeId ? " active" : "");
        d.innerHTML = `
            <strong>${n.title || "(Untitled)"}</strong><br>
            <small>${new Date(n.updated).toLocaleString()}</small>
        `;
        d.onclick = () => openNote(n.id);
        noteList.appendChild(d);
    });
}

// Open a note
function openNote(id) {
    activeId = id;
    const n = notes.find(x => x.id === id);
    if (!n) return;

    titleInput.value = n.title;
    contentInput.value = n.content;

    renderList(searchInput.value);
}

// Auto-save current note
function updateActiveNote() {
    if (!activeId) return;

    const n = notes.find(x => x.id === activeId);
    if (!n) return;

    n.title = titleInput.value;
    n.content = contentInput.value;
    n.updated = Date.now();
    saveNotes();
}

// New note
function newNote() {
    const n = {
        id: uid(),
        title: "",
        content: "",
        updated: Date.now()
    };
    notes.push(n);
    saveNotes();
    openNote(n.id);
    renderList();
}

// Delete note
function deleteNote() {
    if (!activeId) return;
    notes = notes.filter(n => n.id !== activeId);
    saveNotes();

    activeId = null;
    titleInput.value = "";
    contentInput.value = "";

    renderList();
}

// Clear all notes
function clearAll() {
    if (!confirm("Delete all notes?")) return;
    notes = [];
    saveNotes();
    activeId = null;

    titleInput.value = "";
    contentInput.value = "";

    renderList();
}

// ========== EXPORT FIXED ==========
function exportNotes() {

    // ensure current note content is saved
    updateActiveNote();

    let output = "";
    notes.forEach((n, i) => {
        output += `Note ${i + 1}\n`;
        output += `Title: ${n.title}\n`;
        output += `Content:\n${n.content}\n`;
        output += "-------------------------\n\n";
    });

    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "notes.txt";
    a.click();
}

// Import TXT
function importTXT(file) {
    const reader = new FileReader();
    reader.onload = () => {

        const blocks = reader.result.split(/-{5,}\s*\n/);

        blocks.forEach(b => {
            b = b.trim();
            if (!b) return;

            const titleMatch = b.match(/Title:\s*(.*)/);
            const contentMatch = b.match(/Content:\s*([\s\S]*)/);

            notes.push({
                id: uid(),
                title: titleMatch ? titleMatch[1].trim() : "",
                content: contentMatch ? contentMatch[1].trim() : "",
                updated: Date.now()
            });
        });

        saveNotes();
        renderList();
        alert("Import complete!");
    };

    reader.readAsText(file);
}

// Autosave
let timer = null;
function autosave() {
    clearTimeout(timer);
    timer = setTimeout(updateActiveNote, 500);
}

// Event listeners
document.getElementById("newBtn").onclick = newNote;
document.getElementById("deleteBtn").onclick = deleteNote;
document.getElementById("clearAll").onclick = clearAll;
document.getElementById("exportBtn").onclick = exportNotes;

document.getElementById("importBtn").onclick = () =>
    document.getElementById("fileInput").click();

document.getElementById("fileInput").onchange = e =>
    importTXT(e.target.files[0]);

titleInput.addEventListener("input", autosave);
contentInput.addEventListener("input", autosave);
searchInput.addEventListener("input", () =>
    renderList(searchInput.value)
);

// Init
loadNotes();
renderList();
