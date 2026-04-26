import torch
import torch.nn as nn
import torch.optim as optim
import math
from dataset import TemperatureDataset
from gru_model import TempPredictorGRU

def generate_mock_data(days=30):
    """Generates a perfect sine wave of day/night temperatures for testing."""
    data = []
    for hour in range(days * 24):
        # Base temp 25°C, swings up/down by 4 degrees every 24 hours
        temp = 25.0 + 4.0 * math.sin(hour * (2 * math.pi / 24))
        # Add a tiny bit of random noise so it's not too perfect
        temp += (torch.rand(1).item() - 0.5) * 0.5 
        data.append([round(temp, 2)]) # Notice the brackets for our N-dimensional setup!
    return data

def train_model():
    print("1. Generating 30 days of historical data...")
    raw_data = generate_mock_data(30)
    
    print("2. Formatting sliding windows...")
    dataset = TemperatureDataset(raw_data, seq_length=24)
    # DataLoader feeds the data to the model in batches of 16 sequences at a time
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=16, shuffle=True)

    print("3. Initializing GRU (input_size=1)...")
    model = TempPredictorGRU(input_size=1, hidden_size=32, num_layers=1)
    
    # Loss function: Mean Squared Error (standard for regression tasks)
    criterion = nn.MSELoss()
    # Optimizer: Adam (updates the model weights)
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    epochs = 15
    print(f"4. Starting Training for {epochs} Epochs...\n")
    
    for epoch in range(epochs):
        total_loss = 0
        for batch_X, batch_y in dataloader:
            # Step A: Clear old gradients
            optimizer.zero_grad()
            
            # Step B: Make predictions
            predictions = model(batch_X)
            
            # Step C: Calculate how wrong the predictions were
            loss = criterion(predictions, batch_y)
            
            # Step D: Backpropagation (learn from mistakes)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        avg_loss = total_loss / len(dataloader)
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {avg_loss:.4f}")

    print("\n5. Training Complete! Saving weights...")
    # Save the physical brain to your hard drive
    torch.save(model.state_dict(), "gru_weights.pth")
    print("Saved as 'gru_weights.pth'")

if __name__ == "__main__":
    train_model()