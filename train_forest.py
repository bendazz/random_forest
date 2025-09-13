import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import _tree

# Load the training data
with open('penguins_train.json', 'r') as f:
    # The file is a Python str(list_of_dicts), not valid JSON
    train = eval(f.read())

# Features to use
features = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']
X = [[float(row[f]) for f in features] for row in train]
y = [row['species'] for row in train]

# Train random forest with shallow trees for more variety
rf = RandomForestClassifier(n_estimators=16, max_depth=2, random_state=42)
rf.fit(X, y)

def tree_to_dict(tree):
    tree_ = tree.tree_
    def recurse(node):
        d = {'id': int(node)}
        if tree_.feature[node] != _tree.TREE_UNDEFINED:
            d['left'] = recurse(int(tree_.children_left[node]))
            d['right'] = recurse(int(tree_.children_right[node]))
        return d
    return recurse(0)


# Export each tree as a dict
forest = [tree_to_dict(est) for est in rf.estimators_]

# scikit-learn does not expose bootstrap indices directly, so we reconstruct them
import numpy as np
np.random.seed(42)
all_indices = [np.random.choice(len(X), len(X), replace=True) for _ in range(16)]

with open('forest.json', 'w') as f:
    json.dump(forest, f)
with open('tree_samples.json', 'w') as f:
    json.dump([list(map(int, idxs)) for idxs in all_indices], f)

import pandas as pd
# Also export per-tree predictions for each test sample
with open('penguins_test.json', 'r') as f:
    test = eval(f.read())
X_test = [[float(row[f]) for f in features] for row in test]
tree_preds = [list(est.predict(X_test)) for est in rf.estimators_]
# Transpose to get predictions for each test sample: preds_per_sample[sample_idx][tree_idx]
preds_per_sample = list(map(list, zip(*tree_preds)))
with open('tree_votes.json', 'w') as f:
    json.dump(preds_per_sample, f)
print('Exported 16 trees to forest.json and tree_samples.json and tree_votes.json')
