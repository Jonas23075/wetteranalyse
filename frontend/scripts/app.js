window.stationCache = [];
window.stationMapById = new Map(); 

async function loadStations() {
  try {
    const res = await fetch("/api/all_stations");
    if (!res.ok) {
      throw new Error("HTTP-Fehler: " + res.status);
    }

    const data = await res.json();

    if (data.status !== "success" || !Array.isArray(data.stations)) {
      throw new Error("Antwortformat unerwartet");
    }

    window.stationCache = data.stations;

    window.stationMapById.clear();
    for (const s of window.stationCache) {
      window.stationMapById.set(String(s.STATIONS_ID), s);
    }

    console.log("Stationen geladen:", window.stationCache.length);

    // 🔥 HIER: Event feuern, damit map.js loslegen kann
    window.dispatchEvent(new Event("stationsLoaded"));

  } catch (err) {
    console.error("Fehler beim Laden der Stationen:", err);
  }
}

window.showLoader = function () {
  const loader = document.getElementById("app-loader");
  if (!loader) return;

  loader.style.display = "grid";
  requestAnimationFrame(() => {
    loader.classList.remove("hidden");
  });
};

window.hideLoader = function () {
  const loader = document.getElementById("app-loader");
  if (!loader) return;

  loader.classList.add("hidden");
  setTimeout(() => {
    loader.style.display = "none";
  }, 400);
};

window.addEventListener("load", async () => {
  const app = document.querySelector(".app");
  const loader = document.getElementById("app-loader");

  if (loader) {
    loader.classList.remove("hidden");
    loader.style.display = "grid";
  }

  await loadStations();

  if (app) {
    app.classList.add("visible");
  }

  window.hideLoader();
});

