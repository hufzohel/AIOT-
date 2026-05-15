import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

# The ESP32's Local IP address (must be accessible from the machine running FastAPI)
# Tip: Use a static IP for your ESP32 or update this when it changes
ESP32_IP = os.getenv("ESP32_IP", "192.168.1.7") 
ESP32_CONTROL_URL = f"http://{ESP32_IP}/control"

async def push_command_to_esp32(device_type: str, power: bool, value: int = 0):
    """
    Sends a "Push-Interrupt" command directly to the ESP32 hardware.
    """
    if device_type.lower() != "fan":
        return # Currently only implementing for Fan as requested

    payload = {
        "device": device_type,
        "power": power,
        "value": value
    }

    print(f"🚀 PUSHING to ESP32 ({ESP32_IP}): {payload}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ESP32_CONTROL_URL, 
                json=payload, 
                timeout=2.0
            )
            if response.status_code == 200:
                print("✅ ESP32 Received Command Successfully")
            else:
                print(f"⚠️ ESP32 returned error: {response.status_code}")
    except Exception as e:
        print(f"❌ Failed to reach ESP32 at {ESP32_IP}: {e}")
