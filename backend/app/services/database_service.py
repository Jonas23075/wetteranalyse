class DatabaseService:
    def __init__(self, db_path: str):
        import sqlite3
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()

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
