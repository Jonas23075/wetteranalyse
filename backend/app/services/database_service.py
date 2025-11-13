from ..utils.geo import GeoUtils

class DatabaseService:
    def __init__(self, db_path: str):
        import sqlite3
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.geo = GeoUtils()

    def get_all_stations(self):
        self.cursor.execute("""
            SELECT
                STATIONS_ID,
                VON_DATUM,
                BIS_DATUM,
                GEOBREITE,
                GEOLAENGE,
                STATIONSNAME
            FROM Station
        """)

        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        stations = [dict(zip(columns, row)) for row in rows]

        return {"status": "success", "stations": stations}

    def get_nearest_stations(self, lat: float, lon: float, limit: int = 5):
            """Nächste Stationen anhand der Haversine-Distanz bestimmen."""
            self.cursor.execute("""
                SELECT
                    STATIONS_ID,
                    STATIONSNAME,
                    GEOBREITE,
                    GEOLAENGE
                FROM Station
            """)
            rows = self.cursor.fetchall()
            columns = [col[0] for col in self.cursor.description]

            # Alle Stationen als Dictionaries
            stations = [dict(zip(columns, row)) for row in rows]

            # Distanz zu jeder Station berechnen
            for station in stations:
                station["distance_km"] = self.geo.haversine(lat, lon, station["GEOBREITE"], station["GEOLAENGE"])

            # Nach Distanz sortieren
            stations.sort(key=lambda x: x["distance_km"])

            # Limit anwenden
            nearest_stations = stations[:limit]

            return {"status": "success", "stations": nearest_stations}