import os
import glob
import zipfile
import sqlite3

import requests
import pandas as pd
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, text

from app.config import Config

# Datenbank setup und befüllung 
class DatabaseSetup:

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path

    def create_tables(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")

        # Station-Tabelle
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Station (
            STATIONS_ID   INTEGER PRIMARY KEY,
            VON_DATUM     DATE,
            BIS_DATUM     DATE,
            STATIONSHOEHE REAL,
            GEOBREITE     REAL,
            GEOLAENGE     REAL,
            STATIONSNAME  TEXT,
            BUNDESLAND    TEXT,
            ABGABE        TEXT
        );
        """)

        # Wetterdaten-Tabelle
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS produkt_klima_tag (
            MESS_ID        INTEGER PRIMARY KEY AUTOINCREMENT,
            STATIONS_ID    INTEGER,
            FX             REAL,
            FM             REAL,
            QN_4           INTEGER,
            RSK            REAL,
            RSKF           INTEGER,
            SDK            REAL,
            SHK_TAG        REAL,
            NM             REAL,
            VPM            REAL,
            MESS_DATUM     DATE,
            TMK            REAL,
            PM             REAL,
            UPM            REAL,
            TXK            REAL,
            TNK            REAL,
            TGK            REAL,
            QN_3           REAL,
            FOREIGN KEY (STATIONS_ID) REFERENCES Station(STATIONS_ID)
        );
        """)

        conn.commit()
        conn.close()


class DataImporter:
    """
    Kümmert sich um:
    - Stationsdaten von DWD holen und in Station schreiben
    - Wetterdaten von DWD holen und in produkt_klima_tag schreiben
    - prüft vorher, ob Daten schon vorhanden sind
    """

    def __init__(self, db_path: str = Config.DB_PATH):
        self.db_path = db_path

        # SQLite-Connection für Einzel-INSERTs (Stationen)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("PRAGMA foreign_keys = ON;")
        self.cursor = self.conn.cursor()

        # Engine für pandas.to_sql (Wetterdaten usw.)
        self.engine = create_engine(f"sqlite:///{self.db_path}")

        # DWD-URLs und Ordner
        self.STATION_URL = (
            "https://opendata.dwd.de/climate_environment/CDC/"
            "observations_germany/climate/daily/kl/historical/"
            "KL_Tageswerte_Beschreibung_Stationen.txt"
        )
        self.DWD_URL = (
            "https://opendata.dwd.de/climate_environment/CDC/"
            "observations_germany/climate/daily/kl/historical/"
        )
        self.DATA_FOLDER = "dwd_import"
        os.makedirs(self.DATA_FOLDER, exist_ok=True)

    # -------- SQLite-Helfer für Stationen -------- #

    def _insert_station(
        self,
        STATIONS_ID,
        VON_DATUM,
        BIS_DATUM,
        STATIONSHOEHE,
        GEOBREITE,
        GEOLAENGE,
        STATIONSNAME,
        BUNDESLAND,
        ABGABE,
    ):
        """Entspricht deinem alten SQLiteImporter.import_station (mit INSERT OR IGNORE)."""
        try:
            self.cursor.execute(
                """
                INSERT OR IGNORE INTO Station (
                    STATIONS_ID,
                    VON_DATUM,
                    BIS_DATUM,
                    STATIONSHOEHE,
                    GEOBREITE,
                    GEOLAENGE,
                    STATIONSNAME,
                    BUNDESLAND,
                    ABGABE
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    STATIONS_ID,
                    VON_DATUM,
                    BIS_DATUM,
                    STATIONSHOEHE,
                    GEOBREITE,
                    GEOLAENGE,
                    STATIONSNAME,
                    BUNDESLAND,
                    ABGABE,
                ),
            )
            self.conn.commit()
        except Exception as e:
            print(f"Fehler beim Station import von {STATIONS_ID}: {e}")

    # -------- Stationsdaten über Textdatei (wie dein alter DataImporter) -------- #

    def _get_station_lines(self):
        response = requests.get(self.STATION_URL, timeout=(5, 30))
        response.raise_for_status()
        # alte Logik: Headerzeilen weg
        return response.text.splitlines()[2:]

    def _import_station_line(self, line: str):
        parts = line.strip().split()
        if not parts:
            return

        try:
            self._insert_station(
                STATIONS_ID=int(parts[0]),
                VON_DATUM=parts[1],
                BIS_DATUM=parts[2],
                STATIONSHOEHE=float(parts[3]),
                GEOBREITE=float(parts[4]),
                GEOLAENGE=float(parts[5]),
                STATIONSNAME=" ".join(parts[6:-2]),
                BUNDESLAND=parts[-2],
                ABGABE=parts[-1],
            )
        except Exception as e:
            print(f"Fehler beim Importieren der Zeile: {line}, {e}")

    def import_stations_if_needed(self):
        """Prüft, ob Stationen existieren – wenn nein, importiert per Textfile (alte, funktionierende Logik)."""
        with self.engine.connect() as conn:
            try:
                existing_stations = conn.execute(
                    text("SELECT COUNT(*) FROM Station")
                ).scalar()
            except Exception:
                existing_stations = 0

        if existing_stations:
            print("Stationsdaten vorhanden – überspringe Stationsimport.")
            return

        print("→ Lade Stationsdatei und importiere Stationen ...")
        lines = self._get_station_lines()
        if not lines:
            print("Keine Stationsdaten gefunden.")
            return

        for line in lines:
            self._import_station_line(line)

        print("✓ Stationsdaten importiert.")

    # -------- Wetterdaten (dein alter WeatherDataImporter._fetch_and_store_weather_data) -------- #

    def _fetch_and_store_weather_data(self):
        print("→ Lade ZIP-Dateien von DWD ...")
        html = requests.get(self.DWD_URL).text
        soup = BeautifulSoup(html, "html.parser")
        zip_links = [
            a["href"]
            for a in soup.find_all("a", href=True)
            if a["href"].endswith(".zip")
        ]

        # ZIP-Dateien holen
        for link in zip_links:
            local_path = os.path.join(self.DATA_FOLDER, link)
            if not os.path.exists(local_path):
                print(f"Lade {link} herunter...")
                r = requests.get(self.DWD_URL + link)
                with open(local_path, "wb") as f:
                    f.write(r.content)

        # Produktdateien extrahieren
        for zip_path in glob.glob(os.path.join(self.DATA_FOLDER, "*.zip")):
            with zipfile.ZipFile(zip_path, "r") as zf:
                for name in zf.namelist():
                    if name.startswith("produkt_klima_tag") and name.endswith(".txt"):
                        zf.extract(name, self.DATA_FOLDER)

        # TXT-Dateien einlesen und in DB schreiben
        for txt_path in glob.glob(
            os.path.join(self.DATA_FOLDER, "produkt_klima_tag*.txt")
        ):
            print(f"→ Importiere {os.path.basename(txt_path)} ...")
            df = pd.read_csv(
                txt_path,
                sep=";",
                dtype=str,
                encoding="ISO-8859-1",
            )
            df.columns = df.columns.str.strip()

            df["MESS_DATUM"] = pd.to_datetime(
                df["MESS_DATUM"], format="%Y%m%d", errors="coerce"
            )

            cols_to_keep = [
                "STATIONS_ID",
                "MESS_DATUM",
                "QN_3",
                "FX",
                "FM",
                "QN_4",
                "RSK",
                "RSKF",
                "SDK",
                "SHK_TAG",
                "NM",
                "VPM",
                "PM",
                "TMK",
                "UPM",
                "TXK",
                "TNK",
                "TGK",
            ]
            df = df[cols_to_keep]

            df.to_sql(
                "produkt_klima_tag", self.engine, if_exists="append", index=False
            )

        print("✓ Wetterdaten importiert.")

    def import_weather_if_needed(self):
        with self.engine.connect() as conn:
            try:
                existing_weather = conn.execute(
                    text("SELECT COUNT(*) FROM produkt_klima_tag")
                ).scalar()
            except Exception:
                existing_weather = 0

        if existing_weather:
            print("Wetterdaten vorhanden – überspringe Wetterimport.")
            return

        self._fetch_and_store_weather_data()

    # -------- Orchestrierung & Cleanup -------- #

    def import_all(self):
        self.import_stations_if_needed()
        self.import_weather_if_needed()

    def close(self):
        self.conn.close()


def main():
    # 1. DB und Tabellen erstellen
    db_setup = DatabaseSetup()
    db_setup.create_tables()

    # 2. Daten importieren
    importer = DataImporter(db_path=Config.DB_PATH)
    importer.import_all()
    importer.close()

    print("Datenbank erstellt und mit DWD-Daten befüllt (falls noch nicht vorhanden).")


if __name__ == "__main__":
    main()
