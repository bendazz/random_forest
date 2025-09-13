import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import _tree
import numpy as np

# Load the training data
with open('penguins_train.json', 'r') as f:
    train = eval(f.read())
features = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']
X = [[float(row[f]) for f in features] for row in train]
y = [row['species'] for row in train]

# Load the test data
with open('penguins_test.json', 'r') as f:
    test = eval(f.read())
X_test = [[float(row[f]) for f in features] for row in test]

# Helper to export forest, samples, and votes
def export_forest(depth, prefix):
    rf = RandomForestClassifier(n_estimators=16, max_depth=depth, random_state=42)
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
    forest = [tree_to_dict(est) for est in rf.estimators_]
    np.random.seed(42)
    all_indices = [np.random.choice(len(X), len(X), replace=True) for _ in range(16)]
    tree_preds = [list(est.predict(X_test)) for est in rf.estimators_]
    preds_per_sample = list(map(list, zip(*tree_preds)))
    with open(f'{prefix}forest.json', 'w') as f:
        json.dump(forest, f)
    with open(f'{prefix}tree_samples.json', 'w') as f:
        json.dump([list(map(int, idxs)) for idxs in all_indices], f)
    with open(f'{prefix}tree_votes.json', 'w') as f:
        json.dump(preds_per_sample, f)
    print(f'Exported {prefix}forest.json, {prefix}tree_samples.json, {prefix}tree_votes.json')

# Export both versions
export_forest(None, 'unlimited_')
export_forest(2, 'shallow_')
