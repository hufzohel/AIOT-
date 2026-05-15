# # Add this back so the temperature router doesn't crash!
# def get_hourly_sequence():
#     """
#     Temporary fallback to keep the Temperature AI happy if Adafruit disconnects.
#     Returns a dummy sequence of recent temperatures.
#     """
#     print("Fetching hourly sequence for temperature prediction...")
#     # Returning a standard 24-hour dummy sequence to prevent shape errors in your PyTorch model
#     return [25.0, 25.2, 25.5, 26.0, 26.5, 27.0, 27.5, 28.0, 28.2, 28.0, 27.5, 27.0, 
#             26.5, 26.0, 25.5, 25.2, 25.0, 24.8, 24.5, 24.5, 24.8, 25.0, 25.2, 25.5]

import requests
import time
import json
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
import os

load_dotenv()

AIO_USERNAME = os.getenv("ADAFRUIT_USERNAME")  
ADAFRUIT_KEY = os.getenv("ADAFRUIT_IO_KEY")         # Your secret password
ADAFRUIT_FEED_KEY = os.getenv("ADAFRUIT_FEED_KEY")  # The name of the data stream (e.g., 'environment-data')

def get_hourly_sequence(max_retries=3, timeout=5):
    headers = {'X-AIO-Key': ADAFRUIT_KEY}
    
    # Standard endpoint for fetching raw data from a specific feed
    ADAFRUIT_URL = f"https://io.adafruit.com/api/v2/{AIO_USERNAME}/feeds/{ADAFRUIT_FEED_KEY}/data"
    
    # 12 readings/hr * 24 hrs = 288. We ask for a little extra buffer (300) just in case.
    params = {'limit': 300} 
    
    for attempt in range(max_retries):
        try:
            print("Fetching 5-minute intervals from Adafruit IO...")
            response = requests.get(ADAFRUIT_URL, headers=headers, params=params, timeout=timeout)
            response.raise_for_status()
            
            raw_data = response.json()
            
            if not raw_data:
                return _get_fallback_sequence()

            # We use a dictionary to group the 5-minute intervals into Hourly Buckets
            hourly_buckets = defaultdict(list)
            
            for entry in raw_data:
                # 1. Get the Exact Hour (e.g., "2026-05-15 14:00")
                created_at = entry.get('created_at', '')
                try:
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    # We use the date and hour as the unique bucket key
                    bucket_key = dt.strftime('%Y-%m-%d %H:00')
                    hour_of_day = float(dt.hour)
                except ValueError:
                    continue 

                # 2. Parse the JSON payload
                try:
                    payload = json.loads(entry.get('value', '{}'))
                    t1 = float(payload.get('temp1', 25.0))
                    h1 = float(payload.get('humid1', 60.0))
                    t2 = float(payload.get('temp2', 25.0))
                except (json.JSONDecodeError, ValueError):
                    continue

                # 3. Drop the data into the correct Hour Bucket
                hourly_buckets[bucket_key].append((hour_of_day, t1, h1, t2))

            # Now, we calculate the average for each batch of 12
            sequence = []
            
            # Sort the buckets chronologically (oldest first)
            for bucket_key in sorted(hourly_buckets.keys()):
                batch = hourly_buckets[bucket_key]
                
                # Average the batch
                avg_hour = batch[0][0] # Time remains the hour marker
                avg_t1 = sum(item[1] for item in batch) / len(batch)
                avg_h1 = sum(item[2] for item in batch) / len(batch)
                avg_t2 = sum(item[3] for item in batch) / len(batch)
                
                sequence.append([avg_hour, avg_t1, avg_h1, avg_t2])

            # Ensure we send exactly the last 24 hours to the GRU
            if len(sequence) < 24:
                # Pad with the oldest value if we don't have enough history yet
                while len(sequence) < 24:
                    sequence.insert(0, sequence[0] if sequence else [0.0, 25.0, 60.0, 25.0])

            return sequence[-24:]
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Adafruit fetch failed (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return _get_fallback_sequence()

def _get_fallback_sequence():
    """Returns a dummy 24x4 sequence to prevent crashes if offline."""
    print("Injecting fallback sequence into GRU...")
    return [
        [float(h), 25.0 + (h % 5)*0.2, 60.0 + (h % 3), 25.5 + (h % 5)*0.1] 
        for h in range(24)
    ]