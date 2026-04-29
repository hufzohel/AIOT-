import torch
from torch.utils.data import Dataset
import csv
from datetime import datetime, timedelta
import math
import random

def synthesize_from_csv(csv_path, target_days=60):
    """
    1. Reads 5-min data and averages to 1-hour blocks.
    2. Uses that real data as a base pattern to synthesize X days of training data.
    3. Generates missing Outdoor Temp based on realistic thermal dynamics.
    """
    hourly_buckets = {}
    
    # --- STEP 1: PARSE & AVERAGE THE 5-MIN CSV ---
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Example: 2026/04/13 13:15:37
                dt = datetime.strptime(row['timestamp'], "%Y/%m/%d %H:%M:%S")
                # Round down to the nearest hour
                hour_key = dt.replace(minute=0, second=0, microsecond=0)
                
                temp = float(row['temperature'])
                hum = float(row['humidity'])
                
                if hour_key not in hourly_buckets:
                    hourly_buckets[hour_key] = {'temp_sum': 0, 'hum_sum': 0, 'count': 0}
                
                hourly_buckets[hour_key]['temp_sum'] += temp
                hourly_buckets[hour_key]['hum_sum'] += hum
                hourly_buckets[hour_key]['count'] += 1
            except Exception:
                continue # Skip bad rows
                
    sorted_hours = sorted(hourly_buckets.keys())
    if not sorted_hours:
        raise ValueError("CSV contained no valid data!")

    # --- STEP 2: FILL GAPS IN THE BASE DATA ---
    base_temps, base_hums, base_hours = [], [], []
    current_time = sorted_hours[0]
    end_time = sorted_hours[-1]
    
    # Starting values
    last_temp = hourly_buckets[sorted_hours[0]]['temp_sum'] / hourly_buckets[sorted_hours[0]]['count']
    last_hum = hourly_buckets[sorted_hours[0]]['hum_sum'] / hourly_buckets[sorted_hours[0]]['count']
    
    while current_time <= end_time:
        if current_time in hourly_buckets:
            b = hourly_buckets[current_time]
            last_temp = b['temp_sum'] / b['count']
            last_hum = b['hum_sum'] / b['count']
            
        base_temps.append(last_temp)
        base_hums.append(last_hum)
        base_hours.append(current_time.hour)
        current_time += timedelta(hours=1)
        
    # --- STEP 3: EXTRAPOLATE INTO 60 DAYS OF MULTIVARIATE DATA ---
    seq_len = len(base_temps) 
    num_repeats = math.ceil((target_days * 24) / seq_len)
    
    generated_data = []
    weather_drift = 0.0  # Start neutral
    
    for i in range(num_repeats):
        for j in range(seq_len):
            hour = base_hours[j]
            
            # THE FIX: Probabilistic Random Walk. 
            # The drift is no longer a sine wave. It randomly wanders up or down.
            weather_drift += random.gauss(0, 0.05) 
            
            # Keep the drift from going to completely insane extremes (+/- 5 degrees max)
            weather_drift = max(-5.0, min(5.0, weather_drift))
            
            # Apply the unpredictable drift + local noise
            indoor_temp = base_temps[j] + weather_drift + random.gauss(0, 0.3)
            humidity = base_hums[j] - (weather_drift * 1.5) + random.gauss(0, 2.0)
            
            outdoor_swing = 5.0 * math.sin((hour - 8) * (2 * math.pi / 24))
            outdoor_temp = indoor_temp + outdoor_swing + (weather_drift * 1.2) + random.gauss(0, 0.5)
            time_sin = math.sin(hour * (2 * math.pi / 24))
            
            generated_data.append([
                round(indoor_temp, 2),
                round(outdoor_temp, 2),
                round(humidity, 2),
                round(time_sin, 4)
            ])
            
    # Return exactly target_days * 24 hours
    return generated_data[:target_days * 24]


class TemperatureDataset(Dataset):
    def __init__(self, raw_data, seq_length=24):
        self.seq_length = seq_length
        self.X = []
        self.y = []
        
        for i in range(len(raw_data) - seq_length):
            sequence = raw_data[i : i + seq_length]
            target = raw_data[i + seq_length][0] 
            
            self.X.append(sequence)
            self.y.append(target)
            
        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y = torch.tensor(self.y, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]