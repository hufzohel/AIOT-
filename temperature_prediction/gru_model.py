import torch
import torch.nn as nn

class TempPredictorGRU(nn.Module):
    # Notice input_size is a parameter! We set the default to 1 for our baseline.
    def __init__(self, input_size=1, hidden_size=32, num_layers=1, output_size=1):
        super(TempPredictorGRU, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # The GRU automatically scales its internal math based on input_size
        self.gru = nn.GRU(
            input_size=input_size, 
            hidden_size=hidden_size, 
            num_layers=num_layers, 
            batch_first=True
        )
        
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.gru(x, h0)
        
        final_thought = out[:, -1, :]
        prediction = self.fc(final_thought)
        
        return prediction