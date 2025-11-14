// ------------- INIT -------------
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("load-historical");
    if (btn) {
        btn.addEventListener("click", () => {
            if (!window.currentStationId) {
                alert("Bitte zuerst eine Station auswählen.");
                return;
            }
            loadHistoricalTable();
        });
    }
});

// ------------- LOAD DATA -------------
async function loadHistoricalTable() {
    const stationId = window.currentStationId;
    const startDate = document.getElementById("chart-start-date").value;
    const endDate = document.getElementById("chart-end-date").value;

    // Aggregation kommt vom oberen Dropdown
    const aggregation = document.getElementById("chart-aggregation").value;

    if (!startDate || !endDate) {
        alert("Bitte Start- und Enddatum auswählen.");
        return;
    }

    const url =
        `/api/historical_data?station_id=${stationId}` +
        `&start_date=${startDate}` +
        `&end_date=${endDate}` +
        `&aggregation=${aggregation}`;

    
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Backend liefert rows (nicht data.data)
        const rows = data.rows;

        if (!rows || rows.length === 0) {
            document.getElementById("historical-table").innerHTML =
                "<p>Keine Daten verfügbar.</p>";
            return;
        }

        renderHistoricalTable(rows);
    } catch (err) {
        console.error("Fehler beim Laden der Tabelle:", err);
        document.getElementById("historical-table").innerHTML =
            "<p>Fehler beim Laden der Daten.</p>";
    }
}

// ------------- RENDER TABLE -------------
function renderHistoricalTable(rows) {
    const container = document.getElementById("historical-table");

    if (!rows || rows.length === 0) {
        container.innerHTML = "<p>Keine Daten vorhanden.</p>";
        return;
    }

    let html = "<table><thead><tr>";

    // Tabellen-Header bestimmen
    const keys = Object.keys(rows[0]);
    keys.forEach(k => html += `<th>${k}</th>`);

    html += "</tr></thead><tbody>";

    // Reihen rendern
    rows.forEach(row => {
        html += "<tr>";
        keys.forEach(k => {
            html += `<td>${row[k] ?? "-"}</td>`;
        });
        html += "</tr>";
    });

    html += "</tbody></table>";

    container.innerHTML = html;
}
