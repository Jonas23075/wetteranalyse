from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import os

from .services.database_service import DatabaseService

app = FastAPI()

db_path = os.path.join(os.path.dirname(__file__), "..", "Wetterdaten.db")
db_service = DatabaseService(db_path)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend")
static_path = os.path.join(frontend_path, "static")
script_path = os.path.join(frontend_path, "scripts")

app.mount("/scripts", StaticFiles(directory=script_path), name="scripts")
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(frontend_path, "index.html")
    return FileResponse(index_file)

@app.get("/api/live_weather")
def get_live_weather(lat: float, lon: float):
    """Ruft Live-Wetterdaten von einer externen API ab."""
    pass

@app.get("/api/all_stations")
def get_station_data():
    return db_service.get_all_stations()

@app.get("/api/historical_data")
def get_historical_data(station_id: str, start_date: datetime, end_date: datetime):
    """Ruft historische Wetterdaten für eine Station und einen Zeitraum ab."""
    pass

@app.get("/api/chart_data")
def get_chart_data(station_id: str, type: str, start_date: datetime, end_date: datetime):
    """Bereitet Daten für die Chart-Darstellung vor."""
    pass