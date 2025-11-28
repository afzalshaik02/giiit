// script.js - robust, defensive version with DOMContentLoaded wrapper

document.addEventListener('DOMContentLoaded', () => {
  try {
    const STORAGE_KEY = "notes_txt_app";
    let notes = [];
    let activeId = null;

    // DOM refs
    const newBtn = document.getElementById("newBtn");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const fileInput = document.getElementById("fileInput");
    const saveBtn = document.getElementById("saveBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const clearAllBtn = document.getElementById("clearAll");

    const titleInput = document.getElementById("title");
    const contentInput = document.getElementById("content");
    const searchInput = document.getElementById("search");
    const noteList = document.getElementById("noteList");

    if (!noteList || !titleInput || !contentInput) {
      console.error("Critical DOM elements missing");
      return;
    }

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function loadNotes() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        notes = raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.error("Failed to load notes:", err);
        notes = [];
      }
    }

    function saveNotes() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }

    function renderList(query = "") {
      noteList.innerHTML = "";
      const q = (query || "").toLowerCase();

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
        const titleText = n.title && n.title.trim() ? n.title : "(Untitled)";
        d.innerHTML = `<strong>${escapeHtml(titleText)}</strong><br><small>${new Date(n.updated).toLocaleString()}</small>`;
        d.addEventListener('click', () => openNote(n.id));
        noteList.appendChild(d);
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
      );
    }

    function openNote(id) {
      const n = notes.find(x => x.id === id);
      if (!n) return;
      activeId = id;
      titleInput.value = n.title || "";
      contentInput.value = n.content || "";
      renderList(searchInput.value);
    }

    function createNewNote() {
      const n = { id: uid(), title: "", content: "", updated: Date.now() };
      notes.push(n);
      saveNotes();
      openNote(n.id);
      renderList(searchInput.value);
    }

    function updateActiveNoteFromInputs() {
      const t = titleInput.value;
      const c = contentInput.value;

      if (!activeId) {
        // create new if inputs non-empty
        if (t.trim() === "" && c.trim() === "") return;
        const n = { id: uid(), title: t, content: c, updated: Date.now() };
        notes.push(n);
        activeId = n.id;
        saveNotes();
        return;
      }
      const n = notes.find(x => x.id === activeId);
      if (!n) return;
      n.title = t;
      n.content = c;
      n.updated = Date.now();
      saveNotes();
    }

    function deleteCurrentNote() {
      if (!activeId) {
        alert("No active note to delete.");
        return;
      }
      if (!confirm("Delete this note?")) return;
      notes = notes.filter(n => n.id !== activeId);
      activeId = null;
      titleInput.value = "";
      contentInput.value = "";
      saveNotes();
      renderList(searchInput.value);
    }

    function clearAllNotes() {
      if (!confirm("Delete all notes?")) return;
      notes = [];
      activeId = null;
      titleInput.value = "";
      contentInput.value = "";
      saveNotes();
      renderList();
    }

    function exportNotes() {
      try {
        // ensure inputs saved
        updateActiveNoteFromInputs();

        if (!notes.length) {
          alert("No notes to export.");
          return;
        }

        let text = "";
        notes.forEach((n, i) => {
          text += `Note ${i + 1}\n`;
          text += `Title: ${n.title || ""}\n`;
          text += `Content:\n${n.content || ""}\n`;
          text += "-------------------------\n\n";
        });

        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "notes.txt";
        // append to DOM to be safe on some browsers
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
      } catch (err) {
        console.error("Export failed:", err);
        alert("Export failed — check console for details.");
      }
    }

    function importTXT(file) {
      try {
        if (!file) {
          alert("No file selected.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result;
            // split by at least 5 dashes OR the separator used earlier; handle trailing whitespace
            const blocks = text.split(/-{5,}\s*\n?/).map(b => b.trim()).filter(Boolean);

            blocks.forEach(block => {
              // remove leading "Note <n>" if present
              block = block.replace(/^Note\s*\d+\s*/i, "").trim();

              const titleMatch = block.match(/Title:\s*(.*)/i);
              const contentMatch = block.match(/Content:\s*([\s\S]*)/i);

              const title = titleMatch ? titleMatch[1].trim() : "";
              const content = contentMatch ? contentMatch[1].trim() : "";

              notes.push({
                id: uid(),
                title,
                content,
                updated: Date.now()
              });
            });

            saveNotes();
            renderList();
            alert("Import complete.");
          } catch (err) {
            console.error("Import parsing error:", err);
            alert("Import failed — file format may be incorrect. See console.");
          }
        };
        reader.onerror = (e) => {
          console.error("FileReader error:", e);
          alert("Failed reading file.");
        };
        reader.readAsText(file, 'UTF-8');
      } catch (err) {
        console.error("Import failed:", err);
        alert("Import failed — check console.");
      }
    }

    // Autosave timer
    let autosaveTimer = null;
    function autosave() {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        updateActiveNoteFromInputs();
        renderList(searchInput.value);
      }, 500);
    }

    // Attach events (defensive: check element existence)
    newBtn && newBtn.addEventListener('click', createNewNote);
    exportBtn && exportBtn.addEventListener('click', exportNotes);
    importBtn && importBtn.addEventListener('click', () => fileInput && fileInput.click());
    fileInput && fileInput.addEventListener('change', (e) => importTXT(e.target.files && e.target.files[0]));
    saveBtn && saveBtn.addEventListener('click', () => { updateActiveNoteFromInputs(); renderList(searchInput.value); alert('Saved'); });
    deleteBtn && deleteBtn.addEventListener('click', deleteCurrentNote);
    clearAllBtn && clearAllBtn.addEventListener('click', clearAllNotes);

    titleInput.addEventListener('input', autosave);
    contentInput.addEventListener('input', autosave);
    searchInput.addEventListener('input', () => renderList(searchInput.value));

    // Init
    loadNotes();
    renderList();

    console.info("Cloud Notes initialized.");
  } catch (err) {
    console.error("Initialization failed:", err);
    alert("Initialization error — see console.");
  }
});
