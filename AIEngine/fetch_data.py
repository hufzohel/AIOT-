import requests
import os
import math
from datetime import datetime

# === Configuration ===
AIO_USERNAME = os.getenv("ADAFRUIT_USERNAME")  
AIO_KEY = os.getenv("ADAFRUIT_IO_KEY")       

# We need BOTH feeds now
FEED_TEMP = "temperature"  
FEED_HUMID = "humidity"    

def get_feed_data(feed_key, hours):
    """Helper function to grab a specific feed from Adafruit."""
    url = f"https://io.adafruit.com/api/v2/{AIO_USERNAME}/feeds/{feed_key}/data/chart"
    headers = {"X-AIO-Key": AIO_KEY}
    params = {"hours": hours, "resolution": 60}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        raw_data = response.json()
        
        # Return a dictionary of { "Time": Value } so we can match temp and humidity up
        if "data" in raw_data:
            return {point[0]: float(point[1]) for point in raw_data["data"]}
        return {}
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch {feed_key} from Adafruit: {e}")
        return {}

def get_hourly_sequence(hours=24):
    """Fetches Cloud data and packages it into the exact 4D Tensor shape the GRU needs."""
    
    print("Fetching Temperature and Humidity from Adafruit...")
    temp_data = get_feed_data(FEED_TEMP, hours)
    humid_data = get_feed_data(FEED_HUMID, hours)
    
    if not temp_data:
        return None

    sequence = []
    
    # Iterate through the timestamps (they are chronological)
    for timestamp, indoor_temp in temp_data.items():
        # 1. Get Humidity (If Adafruit dropped a humidity packet, just default to 50%)
        humidity = humid_data.get(timestamp, 50.0)
        
        # 2. Extract the Hour from Adafruit's ISO timestamp (e.g., "2026-04-13T13:00:00Z")
        # We replace the Z so Python's datetime doesn't complain about timezones
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        hour = dt.hour
        
        # 3. Calculate Time_Sin (Exactly how we trained the AI)
        time_sin = math.sin(hour * (2 * math.pi / 24))
        
        # 4. Synthesize Outdoor Temp (Exactly how we trained the AI)
        outdoor_swing = 5.0 * math.sin((hour - 8) * (2 * math.pi / 24))
        outdoor_temp = indoor_temp + outdoor_swing 
        
        # Format: [Target, Feature 1, Feature 2, Feature 3]
        sequence.append([
            round(indoor_temp, 2), 
            round(outdoor_temp, 2), 
            round(humidity, 2), 
            round(time_sin, 4)
        ])

    # Graceful padding if Adafruit was offline for a few hours
    if len(sequence) < hours:
        missing_count = hours - len(sequence)
        print(f"⚠️ Sensor gap detected. Missing {missing_count} hours. Applying padding.")
        if len(sequence) > 0:
            last_known = sequence[0]
            sequence = [last_known] * missing_count + sequence

    # Ensure we strictly return ONLY the last `hours` amount (prevents tensor overflow)
    return sequence[-hours:]

if __name__ == "__main__":
    # Test it!
    print("Asking Adafruit server for 4D AI Input...")
    recent_sequence = get_hourly_sequence(24)
    
    if recent_sequence:
        print(f"Success! Sequence length: {len(recent_sequence)} hours")
        print(f"Latest Hour Data [In_Temp, Out_Temp, Humid, Time]: {recent_sequence[-1]}")