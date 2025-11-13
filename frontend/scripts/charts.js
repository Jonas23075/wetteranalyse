let weatherChart = null;

document.addEventListener("DOMContentLoaded", () => {
    const chartButtons = document.querySelectorAll(".chart-btn[data-chart]");
    const expandBtn = document.getElementById("expand-chart-btn");

    chartButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (!window.currentStationId) {
                alert("Bitte zuerst eine Station auswählen.");
                return;
            }
            loadChart(btn.dataset.chart);
        });
    });

    expandBtn.addEventListener("click", () => {
        document.getElementById("chartModal").style.display = "block";
        renderModalChart();
    });

    document.querySelector(".chart-modal-close").addEventListener("click", () => {
        document.getElementById("chartModal").style.display = "none";
    });
});

async function loadChart(chartType) {
    const stationId = window.currentStationId;
    const startDate = document.getElementById("chart-start-date").value;
    const endDate = document.getElementById("chart-end-date").value;

    if (!startDate || !endDate) {
        alert("Bitte Start- und Enddatum auswählen.");
        return;
    }

    const url = `/api/chart_data?station_id=${stationId}&type=${chartType}&start_date=${startDate}&end_date=${endDate}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.labels) {
        alert("Keine Daten verfügbar.");
        return;
    }

    renderChart(data);
    document.querySelector(".chart-container").style.display = "block";
    document.getElementById("expand-chart-btn").style.display = "block";
}

function renderChart(data) {
    const ctx = document.getElementById("weatherChart").getContext("2d");

    if (weatherChart) weatherChart.destroy();

    weatherChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Wert",
                data: data.values,
                borderColor: "rgba(0, 102, 204, 0.8)",
                borderWidth: 2,
                fill: false,
                tension: 0.25
            }]
        },
        options: { responsive: true }
    });
}

function renderModalChart() {
    if (!weatherChart) return;

    const ctx = document.getElementById("modalWeatherChart").getContext("2d");
    if (window.modalChart) window.modalChart.destroy();

    window.modalChart = new Chart(ctx, weatherChart.config);
}
