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

    // Create gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(67, 119, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(67, 119, 255, 0.1)');

    // Determine chart type and appropriate formatting
    const chartType = document.querySelector('.chart-btn.active')?.dataset.chart || 'temperature_trend';
    let yAxisLabel = 'Wert';
    let title = 'Wetterdaten';

    if (chartType.includes('temperature')) {
        yAxisLabel = 'Temperatur (°C)';
        title = 'Temperaturverlauf';
    } else if (chartType.includes('precipitation')) {
        yAxisLabel = 'Niederschlag (mm)';
        title = 'Niederschlagsverlauf';
    } else if (chartType.includes('humidity')) {
        yAxisLabel = 'Luftfeuchtigkeit (%)';
        title = 'Luftfeuchtigkeitsverlauf';
    }

    weatherChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: yAxisLabel,
                data: data.values,
                borderColor: '#4377ff',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4377ff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#2c5fe0',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#4377ff',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            let value = context.parsed.y;
                            if (chartType.includes('temperature')) {
                                return value.toFixed(1) + ' °C';
                            } else if (chartType.includes('precipitation')) {
                                return value.toFixed(1) + ' mm';
                            } else if (chartType.includes('humidity')) {
                                return value.toFixed(0) + ' %';
                            }
                            return value.toString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Datum',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: yAxisLabel,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        callback: function(value) {
                            if (chartType.includes('temperature')) {
                                return value.toFixed(1) + '°';
                            } else if (chartType.includes('precipitation')) {
                                return value.toFixed(1);
                            } else if (chartType.includes('humidity')) {
                                return value + '%';
                            }
                            return value;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });
}

function renderModalChart() {
    if (!weatherChart) return;

    const ctx = document.getElementById("modalWeatherChart").getContext("2d");
    if (window.modalChart) window.modalChart.destroy();

    window.modalChart = new Chart(ctx, weatherChart.config);
}
