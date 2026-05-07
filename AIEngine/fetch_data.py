# Add this back so the temperature router doesn't crash!
def get_hourly_sequence():
    """
    Temporary fallback to keep the Temperature AI happy if Adafruit disconnects.
    Returns a dummy sequence of recent temperatures.
    """
    print("Fetching hourly sequence for temperature prediction...")
    # Returning a standard 24-hour dummy sequence to prevent shape errors in your PyTorch model
    return [25.0, 25.2, 25.5, 26.0, 26.5, 27.0, 27.5, 28.0, 28.2, 28.0, 27.5, 27.0, 
            26.5, 26.0, 25.5, 25.2, 25.0, 24.8, 24.5, 24.5, 24.8, 25.0, 25.2, 25.5]