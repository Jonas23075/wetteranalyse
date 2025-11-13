// frontend/scripts/map.js

document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  const stationToggle = document.getElementById("stationCheckbox");

  if (!mapElement) {
    console.error("Kein Element mit ID 'map' gefunden.");
    return;
  }

  // Karte initialisieren – Mittelpunkt: Deutschland
  const map = L.map("map").setView([51.1657, 10.4515], 6);

  // OpenStreetMap Tiles hinzufügen
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende'
  }).addTo(map);

  // Optional: eigener Klick-Marker
  let clickMarker = null;
  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (clickMarker) {
      clickMarker.setLatLng(e.latlng);
    } else {
      clickMarker = L.marker(e.latlng).addTo(map);
    }

    console.log("Klick auf Karte:", lat, lng);
  });

  // ===== Stations-Marker aus dem Cache =====

  let stationMarkers = [];

  // Marker aus dem Cache bauen (aber noch nicht zwingend anzeigen)
  function buildStationMarkersFromCache() {
    // alte Marker entfernen
    stationMarkers.forEach(m => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    stationMarkers = [];

    if (!Array.isArray(window.stationCache) || window.stationCache.length === 0) {
      console.warn("Noch keine Stationen im Cache.");
      return;
    }

    window.stationCache.forEach((station) => {
      const lat = station.GEOBREITE;
      const lon = station.GEOLAENGE;

      if (typeof lat !== "number" || typeof lon !== "number") {
        return; // überspringen, falls keine Koordinaten
      }

      const marker = L.marker([lat, lon], {
        stationId: station.STATIONS_ID   // ID im Marker speichern
      });

      const name = station.STATIONSNAME || "Unbekannte Station";
      const id = station.STATIONS_ID;

      marker.bindPopup(
        `<strong>${name}</strong><br>` +
        `ID: ${id}<br>` +
        `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      );

      stationMarkers.push(marker);
    });

    console.log("Stationsmarker vorbereitet:", stationMarkers.length);
  }

  function showStationMarkers() {
    stationMarkers.forEach(m => {
      if (!map.hasLayer(m)) {
        m.addTo(map);
      }
    });
  }

  function hideStationMarkers() {
    stationMarkers.forEach(m => {
      if (map.hasLayer(m)) {
        map.removeLayer(m);
      }
    });
  }

  function handleToggleChange() {
    if (!stationToggle) return;

    if (stationToggle.checked) {
      // beim ersten Einschalten bauen wir die Marker aus dem Cache
      if (stationMarkers.length === 0) {
        buildStationMarkersFromCache();
      }
      showStationMarkers();
    } else {
      hideStationMarkers();
    }
  }

  // Toggle-Event
  if (stationToggle) {
    stationToggle.addEventListener("change", handleToggleChange);
  }

  // Wenn der Cache schon da ist (app.js war schneller)
  if (Array.isArray(window.stationCache) && window.stationCache.length > 0) {
    handleToggleChange();
  } else {
    // Warten, bis app.js "stationsLoaded" feuert
    window.addEventListener(
      "stationsLoaded",
      () => {
        handleToggleChange();
      },
      { once: true }
    );
  }
});
