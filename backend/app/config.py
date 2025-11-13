import os

class Config:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    DB_PATH = os.path.join(BASE_DIR, "Wetterdaten.db")
    DATA_FOLDER = os.path.join(BASE_DIR, "dwd_import")