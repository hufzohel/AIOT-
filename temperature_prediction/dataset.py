import torch
from torch.utils.data import Dataset

class TemperatureDataset(Dataset):
    def __init__(self, raw_data, seq_length=24):
        """
        raw_data: A 2D list/array shaped (Total_Hours, Num_Features).
                  For our 1D baseline, it looks like: [[25.1], [25.3], [25.5], ...]
        seq_length: How many hours the model looks back.
        """
        self.seq_length = seq_length
        self.X = []
        self.y = []
        
        for i in range(len(raw_data) - seq_length):
            # The full slice of data for the sequence (all features)
            sequence = raw_data[i : i + seq_length]
            
            # The target is ALWAYS the 1st column (index 0) of the NEXT hour, 
            # because index 0 is our Indoor Temperature.
            target = raw_data[i + seq_length][0] 
            
            self.X.append(sequence)
            self.y.append(target)
            
        # Convert to tensors. We no longer need unsqueeze() because 
        # the raw_data is already structured with a feature dimension.
        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y = torch.tensor(self.y, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]