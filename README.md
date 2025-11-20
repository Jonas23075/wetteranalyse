# Wetteranalyse

Eine Wetterdaten-Analyse-Anwendung mit FastAPI-Backend und statischem Frontend.

## Projektinitialisierung

### 1. Virtuelle Umgebung einrichten
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# oder
source .venv/bin/activate  # Linux/Mac
```

### 2. Abhängigkeiten installieren
```bash
pip install -r requirements.txt
```

### 3. Datenbank initialisieren
```bash
cd backend
python -m database.database_setup
```

## Anwendung starten

### Backend-Server starten
```bash
cd backend
uvicorn app.main:app --reload
```

Die Anwendung ist dann verfügbar unter: http://localhost:8000

## Projektstruktur

- `backend/` - FastAPI-Backend mit API-Endpunkten
- `frontend/` - Statische HTML/CSS/JavaScript-Dateien
- `requirements.txt` - Python-Abhängigkeiten