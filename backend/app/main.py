from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from datetime import datetime
import os

from .services.weather_service import WeatherService
from .services.database_service import DatabaseService
from .services.chart_service import ChartService
from .services.history_service import HistoryService

app = FastAPI()

# ---------------- DB Pfad ----------------
db_path = os.path.join(os.path.dirname(__file__), "..", "Wetterdaten.db")

db_service = DatabaseService(db_path)
weather_service = WeatherService()
chart_service = ChartService(db_path)
history_service = HistoryService(db_path)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Static ----------------
frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend")
app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "static")), name="static")
app.mount("/scripts", StaticFiles(directory=os.path.join(frontend_path, "scripts")), name="scripts")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

# ---------------- LIVE WEATHER ----------------
@app.get("/api/live_weather")
def get_live_weather(lat: float, lon: float):
    return weather_service.get_current_weather(lat, lon)

# ---------------- STATIONEN ----------------
@app.get("/api/all_stations")
def get_station_data():
    return db_service.get_all_stations()

@app.get("/api/nearest_stations")
def api_nearest(lat: float, lon: float):
    return db_service.get_nearest_stations(lat, lon)

# ---------------- HISTORICAL ----------------
@app.get("/api/historical_data")
def api_historical(station_id: int,
                   start_date: datetime,
                   end_date: datetime,
                   aggregation: str = "daily"):

    s = start_date.strftime("%Y-%m-%d")
    e = end_date.strftime("%Y-%m-%d")

    return history_service.get_history(aggregation, station_id, s, e)

# ---------------- CHART DATA ----------------
@app.get("/api/chart_data")
def api_chart(station_id: int,
              type: str,
              start_date: datetime,
              end_date: datetime):

    s = start_date.strftime("%Y-%m-%d")
    e = end_date.strftime("%Y-%m-%d")

    return chart_service.get_chart(type, station_id, s, e)
