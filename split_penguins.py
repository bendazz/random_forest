import csv
import random

# Read the penguins dataset
with open('penguins.csv', 'r') as f:
    reader = list(csv.DictReader(f))

# Remove rows with missing values
cleaned = [row for row in reader if all(row.values())]

# Shuffle the data
random.shuffle(cleaned)

# 70/30 train/test split
split_idx = int(0.7 * len(cleaned))
train = cleaned[:split_idx]
test = cleaned[split_idx:]

# Write train set
with open('penguins_train.json', 'w') as f:
    f.write(str(train))

# Write test set
with open('penguins_test.json', 'w') as f:
    f.write(str(test))

print(f"Train set: {len(train)} rows, Test set: {len(test)} rows")
