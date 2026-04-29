import torch
import torch.nn as nn
import torch.optim as optim
from dataset import TemperatureDataset, synthesize_from_csv
from gru_model import TempPredictorGRU

def train_model():
    # Upped to 90 days for better generalization
    print("1. Reading CSV and Synthesizing 90 days of Multivariate data...")
    raw_data = synthesize_from_csv('temp_humid_training_data.csv', target_days=90)
    
    # 75 days of training, 15 days for the blind test
    train_size = 75 * 24  
    train_data = raw_data[:train_size]
    test_data = raw_data[train_size:]
    
    print("2. Formatting sliding windows (24-hour lookback)...")
    train_dataset = TemperatureDataset(train_data, seq_length=24)
    test_dataset = TemperatureDataset(test_data, seq_length=24)
    
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = torch.utils.data.DataLoader(test_dataset, batch_size=32, shuffle=False)

    print("3. Initializing Multivariate GRU (input_size=4)...")
    model = TempPredictorGRU(input_size=4, hidden_size=64, num_layers=2)
    
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005, weight_decay=1e-4)
    # optimizer = optim.Adam(model.parameters(), lr=0.001)

    # --- EARLY STOPPING CONFIG ---
    max_epochs = 100
    patience = 7  # How many epochs to wait for an improvement before giving up
    patience_counter = 0
    best_test_loss = float('inf')

    print(f"4. Starting Training (Max Epochs: {max_epochs}, Patience: {patience})...\n")
    
    for epoch in range(max_epochs):
        # Training Phase
        model.train() 
        total_train_loss = 0
        
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            predictions = model(batch_X)
            loss = criterion(predictions, batch_y)
            loss.backward()
            optimizer.step()
            total_train_loss += loss.item()
            
        avg_train_loss = total_train_loss / len(train_loader)
        
        # Testing Phase
        model.eval() 
        total_test_loss = 0
        
        with torch.no_grad(): 
            for batch_X, batch_y in test_loader:
                predictions = model(batch_X)
                loss = criterion(predictions, batch_y)
                total_test_loss += loss.item()
                
        avg_test_loss = total_test_loss / len(test_loader)
        
        print(f"Epoch [{epoch+1}/{max_epochs}] | Train Loss: {avg_train_loss:.4f} | Test Loss: {avg_test_loss:.4f}")

        # --- EARLY STOPPING LOGIC ---
        if avg_test_loss < best_test_loss:
            # We got a new high score! Save the weights and reset the patience.
            best_test_loss = avg_test_loss
            patience_counter = 0
            torch.save(model.state_dict(), "multivariate_gru.pth")
        else:
            # No improvement. Add to the patience counter.
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\n🛑 Early stopping triggered! Test loss hasn't improved for {patience} epochs.")
                break

    print("\n5. Training Complete! The best weights were securely saved to 'multivariate_gru.pth'")

if __name__ == "__main__":
    train_model()