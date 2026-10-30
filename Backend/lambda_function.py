import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

# AWS Lambda Environment Variable mein apna MongoDB Atlas URL set karein:
# MONGODB_URI = mongodb+srv://devsrishti008_db_user:<PASSWORD>@aqicluster.ups2ept.mongodb.net/air_quality_db
MONGODB_URI = os.environ.get("MONGODB_URI", "")
cached_db = None


def get_database():
    global cached_db
    if cached_db is not None:
        return cached_db
    if not MONGODB_URI or MongoClient is None:
        return None
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    cached_db = client["air_quality_db"]
    return cached_db


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "AirQualityChecker/1.0"})
    with urllib.request.urlopen(req, timeout=8) as response:
        return json.loads(response.read().decode("utf-8"))


def lambda_handler(event, context):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    query_params = event.get("queryStringParameters") or {}
    city_query = (query_params.get("city") or "Bengaluru").strip()

    try:
        # 1. City coordinates nikalna
        encoded = urllib.parse.quote(city_query)
        geo_data = fetch_json(
            f"https://geocoding-api.open-meteo.com/v1/search?name={encoded}&count=1&language=en&format=json"
        )
        results = geo_data.get("results") or []
        if not results:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "City not found"})}

        loc = results[0]
        # 2. Live AQI + Yesterday AQI fetch karna
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality"
            f"?latitude={loc['latitude']}&longitude={loc['longitude']}"
            f"&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone"
            f"&hourly=us_aqi&past_days=1&forecast_days=1"
        )
        aq_data = fetch_json(aq_url)
        cur = aq_data.get("current") or {}

        today_aqi = int(round(cur.get("us_aqi") or 42))
        pm25 = int(round(cur.get("pm2_5") or 18))
        pm10 = int(round(cur.get("pm10") or 48))
        no2 = int(round(cur.get("nitrogen_dioxide") or 35))
        o3 = int(round(cur.get("ozone") or 55))

        yesterday_aqi = today_aqi + 6
        hourly = (aq_data.get("hourly") or {}).get("us_aqi") or []
        if len(hourly) >= 24:
            valid = [v for v in hourly[:24] if isinstance(v, (int, float))]
            if valid:
                yesterday_aqi = int(round(sum(valid) / len(valid)))

        payload = {
            "city": loc["name"],
            "aqi": today_aqi,
            "yesterdayAqi": yesterday_aqi,
            "differenceFromYesterday": today_aqi - yesterday_aqi,
            "pollutantPercentages": {
                "pm25_pct": min(100, max(10, int(round((pm25 / 25.0) * 50)))),
                "pm10_pct": min(100, max(10, int(round((pm10 / 50.0) * 50)))),
                "no2_pct": min(100, max(10, int(round((no2 / 40.0) * 50)))),
                "o3_pct": min(100, max(10, int(round((o3 / 50.0) * 50))))
            },
            "checkedAt": datetime.now(timezone.utc).isoformat()
        }

        # 3. MongoDB Atlas (aqicluster) mein search history save karna
        db = get_database()
        if db is not None:
            db["search_history"].insert_one({**payload, "searchedCity": city_query})

        return {"statusCode": 200, "headers": headers, "body": json.dumps(payload)}

    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}