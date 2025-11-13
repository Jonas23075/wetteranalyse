import openmeteo_requests
import requests
import requests_cache
from retry_requests import retry
from datetime import datetime
from ..utils.geo import GeoUtils



class WeatherService:
    def __init__(self):
        cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
        retry_session = retry(cache_session, retries=3, backoff_factor=0.2)
        self.openmeteo = openmeteo_requests.Client(session=retry_session)
        self.geo_utils = GeoUtils()


    def get_current_weather(self, lat: float, lon: float):
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "rain"],
            "timezone": "Europe/Berlin",
            "models": "icon_seamless",
        }

        try:
            response = self.openmeteo.weather_api(url, params=params)[0]

            data = {
                "error": False,
                "latitude": response.Latitude(),
                "longitude": response.Longitude(),
                "model": response.Model(),
            }

            location_name = self.geo_utils.reverse_geocode(lat, lon)
            if location_name:
                data["station_name"] = location_name

            current_data = response.Current()
            data.update({
                "temperature": current_data.Variables(0).Value(),
                "relative_humidity": current_data.Variables(1).Value(),
                "wind_speed_10m": current_data.Variables(2).Value(),
                "rain": current_data.Variables(3).Value(),
                "timestamp": datetime.utcfromtimestamp(current_data.Time()).isoformat(),
                "source": "current"
            })

            return data

        except Exception as e:
            return {"error": True, "message": f"OpenMeteo Fehler: {str(e)}"}
