let currentStationId = null;
let currentAgg = "daily";
let currentStart = null;
let currentEnd = null;

let historyOffset = 0;
const historyLimit = 20;

async function fetchChartData() {
    if (!currentStationId) {
        console.warn("Keine Station gewählt — Diagramm wird nicht aktualisiert.");
        return null;
    }

    const metric = document.getElementById("chart-metric").value;
    const aggregation = document.getElementById("chart-aggregation").value;
    const start = document.getElementById("chart-start-date").value;
    const end = document.getElementById("chart-end-date").value;

    const url = `/api/chart_data?station_id=${currentStationId}`
              + `&metric=${metric}`
              + `&aggregation=${aggregation}`
              + `&start_date=${start}`
              + `&end_date=${end}`;

    console.log("Lade Chart:", url);

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        console.error("Chart Fehler:", data.message);
        return null;
    }

    return data;
}

function renderChart(data) {
    if (!data || !data.rows) return;

    const x = data.rows.map(r => r.period);
    const y = data.rows.map(r => r.value);

    const trace = {
        x: x,
        y: y,
        type: "scatter",
        mode: "lines+markers",
        marker: { size: 6 },
        line: { width: 2 }
    };

    const layout = {
        title: `${data.metric_label} (${data.aggregation})`,
        paper_bgcolor: "#1a1b1e",
        plot_bgcolor: "#1a1b1e",
        font: { color: "#e5e7eb" },
        margin: { t: 50, r: 20, b: 40, l: 50 },
        xaxis: {
            color: "#9ca3af",
            gridcolor: "#2a2b2f"
        },
        yaxis: {
            color: "#9ca3af",
            gridcolor: "#2a2b2f"
        }
    };

    Plotly.newPlot("chart", [trace], layout, { responsive: true });
}

async function updateChart() {
    const data = await fetchChartData();
    if (data) renderChart(data);
}

async function loadHistory(reset = false) {
    if (!currentStationId) return;

    if (reset) {
        historyOffset = 0;
        document.getElementById("historical-table").innerHTML = "";
    }
    const url = `/api/historical_data?station_id=${currentStationId}`
              + `&start_date=${currentStart}`
              + `&end_date=${currentEnd}`
              + `&aggregation=${currentAgg}`;

    const res = await fetch(url);
    const data = await res.json();

    const table = document.getElementById("historical-table");

    data.rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r["Datum"] ?? r["Monats/Jahreszeitraum"] ?? "--"}</td>
            <td>${r["Durchschnittstemperatur"] ?? "--"}</td>
            <td>${r["Max. Temperatur"] ?? "--"}</td>
            <td>${r["Min. Temperatur"] ?? "--"}</td>
            <td>${r["Niederschlagssumme"] ?? "--"}</td>
            <td>${r["Luftfeuchtigkeit"] ?? "--"}</td>
        `;
        table.appendChild(tr);
    });

    // Pagination anzeigen/verstecken
    const moreBtn = document.getElementById("history-more-btn");
    if (data.count < historyLimit) {
        moreBtn.classList.add("hidden");
    } else {
        moreBtn.classList.remove("hidden");
    }

    historyOffset += historyLimit;
}

function loadHistoryFor(stationId, start, end, agg = "daily") {
    currentStationId = stationId;
    currentStart = start;
    currentEnd = end;
    currentAgg = agg;

    loadHistory(true);
}

async function runAnalysis() {
    // Station & Dates aus UI übernehmen
    currentStationId = window.currentStationId;
    currentStart = document.getElementById("chart-start-date").value;
    currentEnd = document.getElementById("chart-end-date").value;
    currentAgg = document.getElementById("chart-aggregation").value;

    await updateChart();
    await loadHistory(true);
}

document.getElementById("run-analysis").addEventListener("click", runAnalysis);

document.getElementById("history-more-btn").addEventListener("click", () => {
    loadHistory(false);
});

document.addEventListener("stationChanged", () => {
    runAnalysis();
});
