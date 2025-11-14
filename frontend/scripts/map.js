// frontend/scripts/map.js

document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  const stationToggle = document.getElementById("stationCheckbox");

  if (!mapElement) {
    console.error("Kein Element mit ID 'map' gefunden.");
    return;
  }

  // === Karte ===============================================================
  const map = L.map("map").setView([51.1657, 10.4515], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende'
  }).addTo(map);

  window.map = map;

  // ===================== HELFER ============================================
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const fetchJSON = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  };

  // Datum 19370101 → 1937-01-01
  const toISO = (num) => {
    const s = String(num);
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
  };

  // Datum 19370101 → 01.01.1937
  const toDisplay = (num) => {
    const s = String(num);
    return `${s.substring(6, 8)}.${s.substring(4, 6)}.${s.substring(0, 4)}`;
  };

  // ===================== LIVE WEATHER ======================================
  async function loadLiveWeather(lat, lon, stationId = null) {
    try {
      const url = `http://127.0.0.1:8000/api/live_weather?lat=${lat}&lon=${lon}`;
      const data = await fetchJSON(url);

      if (data.error) {
        setText("station-name", "Fehler: " + (data.message || "Unbekannt"));
        setText("temp", "-- °C");
        setText("wind", "-- km/h");
        setText("humidity", "-- %");
        setText("date", "--");
        return;
      }

      setText("temp", data.temperature ? `${data.temperature.toFixed(1)} °C` : "-- °C");
      setText("wind", data.wind_speed_10m ? `${data.wind_speed_10m.toFixed(1)} km/h` : "-- km/h");
      setText("humidity", data.relative_humidity ? `${data.relative_humidity.toFixed(0)} %` : "-- %");

      if (data.timestamp) {
        const dt = new Date(data.timestamp);
        setText("date",
          `${dt.toLocaleDateString("de-DE")} ${dt.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit"
          })}`
        );
      } else {
        setText("date", "--");
      }

      if (stationId && window.stationMapById.has(String(stationId))) {
        setText("station-name", window.stationMapById.get(String(stationId)).STATIONSNAME);
      } else if (data.station_name) {
        setText("station-name", data.station_name);
      }

    } catch (err) {
      console.error("Live Weather Fehler:", err);
      setText("temp", "-- °C");
      setText("wind", "-- km/h");
      setText("humidity", "-- %");
      setText("date", "--");
    }
  }

  // ===================== NEAREST STATIONS ==================================
  async function loadNearestStations(lat, lon) {
    const list = document.getElementById("nearest-list");
    if (!list) return;

    list.innerHTML = `<li>Lade…</li>`;

    try {
      const url = `http://127.0.0.1:8000/api/nearest_stations?lat=${lat}&lon=${lon}`;
      const data = await fetchJSON(url);

      if (!data.stations || data.stations.length === 0) {
        list.innerHTML = "<li>Keine Stationen gefunden</li>";
        return;
      }

      list.innerHTML = "";
      data.stations.forEach(st => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${st.STATIONSNAME}</strong><br>
          <span class="meta">ID: ${st.STATIONS_ID} – ${st.distance_km.toFixed(1)} km</span>
        `;
        li.addEventListener("click", () => window.focusStation(st.STATIONS_ID));
        list.appendChild(li);
      });

    } catch (err) {
      console.error("Nearest Stations Fehler:", err);
      list.innerHTML = "<li>Fehler beim Laden</li>";
    }
  }

  // ===================== DATUMBEREICH ======================================
  function updateAvailableDateRange(stationId) {
    const info = document.getElementById("available-dates-info");
    const minShow = document.getElementById("min-date-display");
    const maxShow = document.getElementById("max-date-display");
    const startInput = document.getElementById("chart-start-date");
    const endInput = document.getElementById("chart-end-date");

    const st = window.stationMapById.get(String(stationId));
    if (!st) return;

    const von = st.VON_DATUM;
    const bis = st.BIS_DATUM;

    if (!von || !bis) {
      info.style.display = "none";
      return;
    }

    info.style.display = "block";

    const isoVon = toISO(von);
    const isoBis = toISO(bis);

    minShow.textContent = toDisplay(von);
    maxShow.textContent = toDisplay(bis);

    startInput.min = isoVon;
    startInput.max = isoBis;
    endInput.min = isoVon;
    endInput.max = isoBis;

    if (!startInput.value || startInput.value < isoVon || startInput.value > isoBis)
      startInput.value = isoVon;

    if (!endInput.value || endInput.value < isoVon || endInput.value > isoBis)
      endInput.value = isoBis;
  }

  //B: Diagramme automatisch aktualisieren
  function triggerChartUpdate() {
    document.dispatchEvent(new CustomEvent("stationChanged"));
  }

  // ===================== MAP CLICK ==========================================
  let clickMarker = null;

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (stationToggle.checked) {
      setText("station-name", "Marker klicken, um Station zu wählen.");
      return;
    }

    if (!clickMarker) clickMarker = L.marker(e.latlng).addTo(map);
    else clickMarker.setLatLng(e.latlng);

    setText("station-name", `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);

    loadLiveWeather(lat, lng, null);
    loadNearestStations(lat, lng);

    // keine Diagrammaktualisierung, da keine Station gewählt!
  });

  // ===================== STATIONSMARKER ======================================
  let stationMarkers = [];

  function buildStationMarkersFromCache() {
    stationMarkers.forEach(m => map.removeLayer(m));
    stationMarkers = [];

    if (!Array.isArray(window.stationCache)) return;

    window.stationCache.forEach(st => {
      const lat = st.GEOBREITE;
      const lon = st.GEOLAENGE;
      if (typeof lat !== "number" || typeof lon !== "number") return;

      const marker = L.marker([lat, lon], { stationId: st.STATIONS_ID });

      marker.bindPopup(`<strong>${st.STATIONSNAME}</strong><br>ID: ${st.STATIONS_ID}`);

      marker.on("click", () => {
        setText("station-name", st.STATIONSNAME);

        loadLiveWeather(lat, lon, st.STATIONS_ID);
        loadNearestStations(lat, lon);
        updateAvailableDateRange(st.STATIONS_ID);
        triggerChartUpdate();

        window.currentStationId = st.STATIONS_ID;
      });

      stationMarkers.push(marker);
    });
  }

  function showStationMarkers() {
    stationMarkers.forEach(m => m.addTo(map));
  }

  function hideStationMarkers() {
    stationMarkers.forEach(m => map.removeLayer(m));
  }

  function handleToggleChange() {
    if (stationToggle.checked) {
      if (stationMarkers.length === 0) buildStationMarkersFromCache();
      showStationMarkers();
    } else {
      hideStationMarkers();
    }
  }

  stationToggle.addEventListener("change", handleToggleChange);

  if (Array.isArray(window.stationCache) && window.stationCache.length > 0)
    handleToggleChange();
  else
    window.addEventListener("stationsLoaded", handleToggleChange, { once: true });

  // ===================== STATION FOKUSSIEREN =================================
  window.focusStation = function (stationId) {
    let marker = stationMarkers.find(m => m.options.stationId == stationId);
    let tempMarker = null;

    if (!marker) {
      const st = window.stationMapById.get(String(stationId));
      if (!st) return;

      tempMarker = L.marker([st.GEOBREITE, st.GEOLAENGE], { stationId }).addTo(map);
      tempMarker.bindPopup(`<strong>${st.STATIONSNAME}</strong><br>ID: ${stationId}`);
      marker = tempMarker;
    }

    const ll = marker.getLatLng();
    map.setView(ll, 12, { animate: true });
    marker.openPopup();

    loadLiveWeather(ll.lat, ll.lng, stationId);
    loadNearestStations(ll.lat, ll.lng);
    updateAvailableDateRange(stationId);
    triggerChartUpdate();

    const st = window.stationMapById.get(String(stationId));
    setText("station-name", st.STATIONSNAME);

    window.currentLat = ll.lat;
    window.currentLon = ll.lng;
    window.currentStationId = stationId;

    if (tempMarker && !stationToggle.checked)
      setTimeout(() => map.removeLayer(tempMarker), 2000);
  };
});
