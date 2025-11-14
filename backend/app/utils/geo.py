import numpy as np
from geopy.geocoders import Nominatim

class GeoUtils:
    def haversine(self, lat1, lon1, lat2, lon2):
        """Entfernung in km zwischen zwei Punkten berechnen."""
        R = 6371.0
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlambda = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        return float(R * c)

    def reverse_geocode(self, lat, lon):
        """Adresse anhand von Koordinaten bestimmen."""
        geolocator = Nominatim(user_agent="myApp", timeout=5)
        location = geolocator.reverse((lat, lon), exactly_one=True, language="de")
        if not location:
            return None

        addr = location.raw.get("address", {})
        street = addr.get("road") or addr.get("pedestrian") or ""
        house_number = addr.get("house_number") or ""
        postcode = addr.get("postcode") or ""
        city = addr.get("city") or addr.get("town") or addr.get("village") or ""

        parts = []
        if street or house_number:
            parts.append(f"{street} {house_number}".strip())
        if postcode:
            parts.append(postcode)
        if city:
            parts.append(city)

        return ", ".join(parts) if parts else location.address