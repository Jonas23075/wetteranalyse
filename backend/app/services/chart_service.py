# app/services/chart_service.py

import sqlite3
from ..config import Config

AGGREGATION_MAP = {
    "yearly": "%Y",
    "monthly": "%Y-%m",
    "daily": "%Y-%m-%d"
}

# Metric → (DB-Spalte, Label)
METRICS = {
    "TMK": ("TMK", "Durchschnittstemperatur"),
    "TXK": ("TXK", "Max Temperatur"),
    "TNK": ("TNK", "Min Temperatur"),
    "RSK": ("RSK", "Niederschlagssumme"),
    "UPM": ("UPM", "Luftfeuchtigkeit"),
}

class ChartService:
    def __init__(self, db_path=Config.DB_PATH):
        self.db_path = db_path

    def _connect(self):
        return sqlite3.connect(self.db_path)

    def _clean_value(self, v):
        """-999 → 0, sonst runden."""
        if v is None:
            return None
        try:
            f = float(v)
            if f <= -500:
                return 0
            return round(f, 2)
        except:
            return None

    def get_chart_data(self, station_id, start_date, end_date, metric, aggregation):

        if metric not in METRICS:
            return {"error": True, "message": f"Unbekannte Metrik: {metric}"}

        if aggregation not in AGGREGATION_MAP:
            return {"error": True, "message": f"Unbekannte Aggregation: {aggregation}"}

        col, label = METRICS[metric]
        aggr_format = AGGREGATION_MAP[aggregation]

        conn = self._connect()
        cur = conn.cursor()

        # ---------------------------------------
        # DAILY
        # ---------------------------------------
        if aggregation == "daily":
            sql = f"""
                SELECT 
                    MESS_DATUM AS period,
                    {col} AS value
                FROM produkt_klima_tag
                WHERE STATIONS_ID = ?
                  AND MESS_DATUM >= ?
                  AND MESS_DATUM <= ?
                  AND {col} IS NOT NULL
                ORDER BY MESS_DATUM ASC;
            """

            try:
                rows = cur.execute(sql, (station_id, start_date, end_date)).fetchall()
            finally:
                conn.close()

            row_list = [
                {"period": r[0], "value": self._clean_value(r[1])}
                for r in rows
            ]

            return {
                "error": False,
                "metric": metric,
                "metric_label": label,
                "station_id": station_id,
                "aggregation": aggregation,
                "start_date": start_date,
                "end_date": end_date,
                "rows": row_list
            }

        # ---------------------------------------
        # AGGREGATED (MONTHLY/YEARLY)
        # ---------------------------------------
        sql = f"""
            SELECT 
                strftime('{aggr_format}', MESS_DATUM) AS period,
                AVG({col}) AS value
            FROM produkt_klima_tag
            WHERE STATIONS_ID = ?
              AND MESS_DATUM >= ?
              AND MESS_DATUM <= ?
              AND {col} IS NOT NULL
            GROUP BY period
            ORDER BY period ASC;
        """

        try:
            rows = cur.execute(sql, (station_id, start_date, end_date)).fetchall()
        finally:
            conn.close()

        row_list = [
            {"period": r[0], "value": self._clean_value(r[1])}
            for r in rows
        ]

        return {
            "error": False,
            "metric": metric,
            "metric_label": label,
            "station_id": station_id,
            "aggregation": aggregation,
            "start_date": start_date,
            "end_date": end_date,
            "rows": row_list
        }
