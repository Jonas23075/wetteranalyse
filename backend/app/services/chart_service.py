import sqlite3
from fastapi import HTTPException
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


class ChartService:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

    # ---------------------------------------
    # Cleaning + rounding
    # ---------------------------------------
    def _clean_value(self, v):
        if v in (-999, -999.0, "-999", None):
            return "--"
        try:
            return round(float(v))
        except:
            return v

    def _query(self, sql: str, params: tuple):
        cur = self.conn.cursor()
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

        # Clean values
        for r in rows:
            r["value"] = self._clean_value(r.get("value"))
        return rows

    # ============================================================================
    # HELPER: GENERATE COMPLETE DATE / PERIOD LISTS (IMPORTANT!)
    # ============================================================================

    def _generate_daily_range(self, start, end):
        out = []
        cur = start
        while cur <= end:
            out.append(cur.strftime("%Y-%m-%d"))
            cur += timedelta(days=1)
        return out

    def _generate_monthly_range(self, start, end):
        out = []
        cur = start.replace(day=1)
        while cur <= end:
            out.append(cur.strftime("%Y-%m"))
            cur += relativedelta(months=1)
        return out

    def _generate_yearly_range(self, start, end):
        out = []
        cur = start.replace(month=1, day=1)
        while cur.year <= end.year:
            out.append(str(cur.year))
            cur += relativedelta(years=1)
        return out

    # ============================================================================
    # CHART TYPES
    # ============================================================================

    # DAILY TEMPERATURE TREND
    def temperature_trend(self, station_id, start, end):
        sql = """
        SELECT DATE(MESS_DATUM) AS label, TMK AS value
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        ORDER BY MESS_DATUM ASC
        """
        db_rows = self._query(sql, (station_id, start, end))

        # Build complete timeline
        start_d = datetime.strptime(start, "%Y-%m-%d")
        end_d = datetime.strptime(end, "%Y-%m-%d")

        full_labels = self._generate_daily_range(start_d, end_d)

        # Map values into full list
        value_map = {row["label"]: row["value"] for row in db_rows}

        values = [value_map.get(label, "--") for label in full_labels]

        return {
            "labels": full_labels,
            "values": values
        }

    # MONTHLY PRECIPITATION
    def precipitation_monthly(self, station_id, start, end):
        sql = """
        SELECT strftime('%Y-%m', MESS_DATUM) AS label, SUM(RSK) AS value
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        GROUP BY 1
        ORDER BY label ASC
        """

        db_rows = self._query(sql, (station_id, start, end))

        start_d = datetime.strptime(start, "%Y-%m-%d")
        end_d = datetime.strptime(end, "%Y-%m-%d")

        full_labels = self._generate_monthly_range(start_d, end_d)
        value_map = {row["label"]: row["value"] for row in db_rows}

        values = [value_map.get(label, "--") for label in full_labels]

        return {"labels": full_labels, "values": values}

    # MONTHLY TEMPERATURE AVERAGE
    def temperature_monthly(self, station_id, start, end):
        sql = """
        SELECT strftime('%Y-%m', MESS_DATUM) AS label, AVG(TMK) AS value
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        GROUP BY 1
        ORDER BY label ASC
        """

        db_rows = self._query(sql, (station_id, start, end))

        start_d = datetime.strptime(start, "%Y-%m-%d")
        end_d = datetime.strptime(end, "%Y-%m-%d")

        full_labels = self._generate_monthly_range(start_d, end_d)
        value_map = {row["label"]: row["value"] for row in db_rows}

        values = [value_map.get(label, "--") for label in full_labels]

        return {"labels": full_labels, "values": values}

    # DAILY HUMIDITY TREND
    def humidity_trend(self, station_id, start, end):
        sql = """
        SELECT DATE(MESS_DATUM) AS label, UPM AS value
        FROM produkt_klima_tag
        WHERE STATIONS_ID = ?
          AND DATE(MESS_DATUM) BETWEEN DATE(?) AND DATE(?)
        ORDER BY MESS_DATUM ASC
        """

        db_rows = self._query(sql, (station_id, start, end))

        start_d = datetime.strptime(start, "%Y-%m-%d")
        end_d = datetime.strptime(end, "%Y-%m-%d")

        full_labels = self._generate_daily_range(start_d, end_d)
        value_map = {row["label"]: row["value"] for row in db_rows}

        values = [value_map.get(label, "--") for label in full_labels]

        return {"labels": full_labels, "values": values}

    # ROUTER
    def get_chart(self, chart_type, station_id, start, end):
        mapping = {
            "temperature_trend": self.temperature_trend,
            "precipitation_monthly": self.precipitation_monthly,
            "temperature_monthly": self.temperature_monthly,
            "humidity_trend": self.humidity_trend,
        }

        if chart_type not in mapping:
            raise HTTPException(400, "Ungültiger Charttyp")

        return mapping[chart_type](station_id, start, end)
