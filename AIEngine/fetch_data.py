import requests
import time

ADAFRUIT_URL = "YOUR_ADAFRUIT_FEED_URL"
ADAFRUIT_KEY = "YOUR_ADAFRUIT_IO_KEY"

def fetch_adafruit_temperature(max_retries=3, timeout=5):
    headers = {'X-AIO-Key': ADAFRUIT_KEY}
    
    for attempt in range(max_retries):
        try:
            # We enforce a 5-second timeout so the backend doesn't freeze forever
            response = requests.get(ADAFRUIT_URL, headers=headers, timeout=timeout)
            response.raise_for_status()
            
            data = response.json()
            return float(data['last_value']) # Adjust based on Adafruit's exact JSON format
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Adafruit fetch failed (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2) # Wait 2 seconds before trying again
            else:
                print("❌ Adafruit API is completely down.")
                # Fallback to a safe default temperature so your app doesn't die during the demo
                return 25.0