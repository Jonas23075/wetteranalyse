// frontend/scripts/search.js

const input = document.getElementById("address-input");
const btn = document.getElementById("address-go");
const autoBox = document.getElementById("autocomplete-list");

let searchDebounce = null;
let selectedIndex = -1;
let currentResults = [];

// ==========================
//       SUCHEN
// ==========================
function runSearch(query) {
    if (!Array.isArray(window.stationCache) || window.stationCache.length === 0) {
        autoBox.innerHTML = "<div class='autocomplete-item'>Lade Stationen...</div>";
        autoBox.classList.remove("hidden");
        return;
    }

    const q = query.toLowerCase();
    const matches = window.stationCache.filter(st =>
        st.STATIONSNAME.toLowerCase().includes(q) ||
        String(st.STATIONS_ID).includes(q)
    );

    currentResults = matches;
    selectedIndex = -1;
    renderDropdown(matches);
}

// ==========================
//    DROPDOWN RENDERN
// ==========================
function renderDropdown(results) {
    if (!results.length) {
        autoBox.innerHTML = `<div class="autocomplete-item">Keine Treffer</div>`;
        autoBox.classList.remove("hidden");
        return;
    }

    autoBox.innerHTML = results.map((st, idx) => `
        <div class="autocomplete-item" data-index="${idx}">
            <strong>${st.STATIONSNAME}</strong><br>
            <span class="search-id">ID: ${st.STATIONS_ID}</span>
        </div>
    `).join("");

    autoBox.classList.remove("hidden");

    [...autoBox.children].forEach(el =>
        el.addEventListener("click", () => {
            const idx = Number(el.dataset.index);
            selectResult(idx);
        })
    );
}

// ==========================
//     STATION AUSWÄHLEN
// ==========================
function selectResult(index) {
    const st = currentResults[index];
    if (!st) return;

    input.value = `${st.STATIONSNAME} (${st.STATIONS_ID})`;
    autoBox.classList.add("hidden");

    const stationId = st.STATIONS_ID;

    // ⭐ WICHTIG: Karte fokussieren + Wetter laden (egal ob Marker sichtbar)
    if (typeof window.focusStation === "function") {
        window.focusStation(stationId);
    } else {
        console.warn("focusStation() nicht verfügbar!");
    }
}

// ==========================
//      TASTATUR SUPPORT
// ==========================
function moveSelection(dir) {
    if (autoBox.classList.contains("hidden")) return;

    const items = [...autoBox.children];
    if (!items.length) return;

    items.forEach(item => item.classList.remove("active"));

    selectedIndex += dir;

    if (selectedIndex < 0) selectedIndex = items.length - 1;
    if (selectedIndex >= items.length) selectedIndex = 0;

    items[selectedIndex].classList.add("active");
    items[selectedIndex].scrollIntoView({ block: "nearest" });
}

input.addEventListener("keydown", e => {
    switch (e.key) {
        case "ArrowDown": moveSelection(1); e.preventDefault(); break;
        case "ArrowUp": moveSelection(-1); e.preventDefault(); break;
        case "Enter":
            if (selectedIndex >= 0) selectResult(selectedIndex);
            break;
        case "Escape":
            autoBox.classList.add("hidden");
            break;
    }
});

// ==========================
//        INPUT EVENT
// ==========================
input.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) {
        autoBox.classList.add("hidden");
        return;
    }

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runSearch(q), 150);
});

// ==========================
//        BUTTON KLICK
// ==========================
btn.addEventListener("click", () => {
    const q = input.value.trim();
    if (q.length > 0) runSearch(q);
});

// ==========================
//   KLICK AUSSERHALB LISTE
// ==========================
document.addEventListener("click", (e) => {
    if (!autoBox.contains(e.target) && e.target !== input) {
        autoBox.classList.add("hidden");
    }
});
