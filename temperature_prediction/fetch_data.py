import requests
import os

# === Configuration ===
AIO_USERNAME = os.getenv("ADAFRUIT_USERNAME")  # Exactly what you use to log in
AIO_KEY = os.getenv("ADAFRUIT_IO_KEY")       # The yellow "My Key" button on your dashboard
FEED_KEY = "temperature"  # The lowercase key from the Feed Info page

def get_hourly_sequence(hours=24):
    """
    Asks Adafruit to automatically aggregate minute-level data 
    into hourly averages and return the exact sequence for our GRU.
    """
    # Notice we are hitting /data/chart, not just /data
    url = f"https://io.adafruit.com/api/v2/{AIO_USERNAME}/feeds/{FEED_KEY}/data/chart"
    headers = {"X-AIO-Key": AIO_KEY}
    
    # We ask the API to do the heavy lifting:
    # 1. Look back exactly 24 hours.
    # 2. Group the data into 60-minute blocks.
    # 3. Average those blocks together.
    params = {
        "hours": hours,
        "resolution": 60
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        
        raw_data = response.json()
        
        sequence = []
        # The /chart endpoint formats data as: [ ["Timestamp", "Value"], ["Timestamp", "Value"] ]
        # It also naturally returns them in chronological order (oldest -> newest), 
        # which is exactly what a Time-Series Neural Network needs!
        if "data" in raw_data:
            for point in raw_data["data"]:
                # point[1] is the averaged temperature value
                sequence.append([float(point[1])])
                
        # Graceful failure check
        if len(sequence) < hours:
            missing_count = hours - len(sequence)
            print(f"⚠️ Sensor gap detected. Missing {missing_count} hours. Applying Forward Fill.")
            
            if len(sequence) > 0:
                # Grab the oldest known temperature we have in the array
                last_known_temp = sequence[0]
                
                # Duplicate that temperature to pad the front of the timeline
                sequence = [[last_known_temp]] * missing_count + sequence
            
        return sequence

    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch from Adafruit: {e}")
        return None

# Quick test block
if __name__ == "__main__":
    print("Asking Adafruit server to calculate 24-hour averages...")
    recent_temps = get_hourly_sequence(24)
    
    if recent_temps:
        print(f"Success! Sequence length: {len(recent_temps)}")
        print(f"Data: {recent_temps}")