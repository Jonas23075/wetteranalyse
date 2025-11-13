import sqlite3
from fastapi import HTTPException

class HistoryService:
    COLUMN_MAP = {
        "TMK": "Durchschnittstemperatur",
        "TXK": "Max. Temperatur",
        "TNK": "Min. Temperatur",
        "RSK": "Niederschlagssumme",
        "UPM": "Luftfeuchtigkeit",
        "date": "Datum",
        "period": "Monats/Jahreszeitraum"
    }

    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

    def _clean_value(self, v):
        """Werte runden und -999 ersetzen."""
        if v in (-999, -999.0, "-999", None):
            return "--"

        try:
            return round(float(v))
        except:
            return v

    def _rename_columns(self, row: dict):
        new_row = {}
        for k, v in row.items():
            new_key = self.COLUMN_MAP.get(k, k)
            new_row[new_key] = self._clean_value(v)
        return new_row

    def _query(self, sql: str, params: tuple):
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return [self._rename_columns(dict(r)) for r in cur.fetchall()]

    # ---------------- DAILY ----------------
    def daily(self, station_id, start, end):
        sql = """
        SELECT 
            DATE(MESS_DATUM) AS date,
            TMK,
            TXK,
            TNK,
            RSK,
            UPM
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
          AND TMK != -999
          AND TXK != -999
          AND TNK != -999
          AND RSK != -999
          AND UPM != -999
        ORDER BY date ASC;
        """
        return {
            "aggregation": "daily",
            "rows": self._query(sql, (station_id, start, end))
        }

    # ---------------- MONTHLY ----------------
    def monthly(self, station_id, start, end):
        sql = """
        SELECT
            strftime('%Y-%m', MESS_DATUM) AS period,
            AVG(NULLIF(TMK, -999)) AS TMK,
            AVG(NULLIF(TXK, -999)) AS TXK,
            AVG(NULLIF(TNK, -999)) AS TNK,
            SUM(NULLIF(RSK, -999)) AS RSK,
            AVG(NULLIF(UPM, -999)) AS UPM
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        GROUP BY period
        ORDER BY period ASC;
        """
        return {
            "aggregation": "monthly",
            "rows": self._query(sql, (station_id, start, end))
        }

    # ---------------- YEARLY ----------------
    def yearly(self, station_id, start, end):
        sql = """
        SELECT
            strftime('%Y', MESS_DATUM) AS period,
            AVG(NULLIF(TMK, -999)) AS TMK,
            AVG(NULLIF(TXK, -999)) AS TXK,
            AVG(NULLIF(TNK, -999)) AS TNK,
            SUM(NULLIF(RSK, -999)) AS RSK,
            AVG(NULLIF(UPM, -999)) AS UPM
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        GROUP BY period
        ORDER BY period ASC;
        """
        return {
            "aggregation": "yearly",
            "rows": self._query(sql, (station_id, start, end))
        }

    def get_history(self, agg, station_id, start, end):
        mapping = {
            "daily": self.daily,
            "monthly": self.monthly,
            "yearly": self.yearly
        }

        if agg not in mapping:
            raise HTTPException(400, "Ungültige Aggregation")

        return mapping[agg](station_id, start, end)
