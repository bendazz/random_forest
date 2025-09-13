// Penguin species to color mapping
const speciesColors = {
  Adelie: '#1f77b4',
  Chinstrap: '#ff7f0e',
  Gentoo: '#2ca02c'
};

// Map prediction value to species name (for scikit-learn encoding)
const predToSpecies = {
  0: 'Adelie',
  1: 'Chinstrap',
  2: 'Gentoo'
};

// Utility to load all forest files for a given mode
async function loadForestSet(mode) {
  const prefix = mode === 'shallow' ? 'shallow_' : 'unlimited_';
  const [forest, treeSamples, treeVotes] = await Promise.all([
    fetch(prefix + 'forest.json').then(r => r.json()),
    fetch(prefix + 'tree_samples.json').then(r => r.json()),
    fetch(prefix + 'tree_votes.json').then(r => r.json())
  ]);
  return {forest, treeSamples, treeVotes};
}

function createLegend() {
  const legend = document.getElementById('legend');
  Object.entries(speciesColors).forEach(([species, color]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-circle" style="background:${color}"></span> ${species}`;
    legend.appendChild(item);
  });
}

function renderGrid(data, gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  // highlightIndices is optional, default to []
  let highlightIndices = arguments.length > 2 ? arguments[2] : [];
  // onClick is optional, default to null
  let onClick = arguments.length > 3 ? arguments[3] : null;
  data.forEach((penguin, idx) => {
    const circle = document.createElement('span');
    circle.className = 'circle';
    circle.title = `${penguin.species} (${penguin.island})`;
    circle.style.background = speciesColors[penguin.species] || '#bbb';
    if (highlightIndices.includes(idx)) {
      circle.style.outline = '3px solid #e74c3c';
      circle.style.zIndex = 1;
    }
    if (onClick) {
      circle.style.cursor = 'pointer';
      circle.onclick = () => onClick(idx, circle);
    }
    grid.appendChild(circle);
  });
}

async function loadData() {
  // Load JSON files
  const [train, test] = await Promise.all([
    fetch('penguins_train.json').then(r => r.text()),
    fetch('penguins_test.json').then(r => r.text())
  ]);
  // The files are Python str(list_of_dicts), not valid JSON, so fix them
  const fix = txt => JSON.parse(txt.replace(/'/g, '"'));
  return [fix(train), fix(test)];
}

window.onload = async function() {
  createLegend();
  const [train, test] = await loadData();
  window._trainData = train;
  window._testData = test;
  renderGrid(train, 'trainGrid');

  // Initial mode
  let mode = 'unlimited';
  let forestSet = await loadForestSet(mode);
  window._treeSamples = forestSet.treeSamples;
  window._treeVotes = forestSet.treeVotes;
  renderForest(forestSet.forest, forestSet.treeSamples);
  renderTestGridWithVotes(test, forestSet.treeVotes);

  // Dropdown for switching
  document.getElementById('depthSelect').addEventListener('change', async (e) => {
    mode = e.target.value;
    forestSet = await loadForestSet(mode);
    window._treeSamples = forestSet.treeSamples;
    window._treeVotes = forestSet.treeVotes;
    renderForest(forestSet.forest, forestSet.treeSamples);
    renderGrid(train, 'trainGrid');
    renderTestGridWithVotes(test, forestSet.treeVotes);
  });
};
function renderTestGridWithVotes(test, treeVotes) {
  renderGrid(test, 'testGrid', [], (idx, circle) => {
    // For this test sample, get the votes from each tree
    const votes = treeVotes[idx]; // array of 16 numbers
    // Color each tree's background by its vote
    const forestGrid = document.getElementById('forestGrid');
    Array.from(forestGrid.children).forEach((treeDiv, treeIdx) => {
      const pred = votes[treeIdx];
      const color = speciesColors[predToSpecies[pred]] || '#eee';
      treeDiv.style.background = color + '22'; // light tint
      treeDiv.style.boxShadow = '';
    });
    // Optionally, highlight the selected test sample
    const grid = document.getElementById('testGrid');
    Array.from(grid.children).forEach(c => c.style.outline = '');
    circle.style.outline = '3px solid #e67e22';
  });
}

function renderForest(forest, treeSamples) {
  const grid = document.getElementById('forestGrid');
  grid.innerHTML = '';
  forest.forEach((tree, i) => {
    const div = document.createElement('div');
    div.style.background = '#fff';
    div.style.border = '1px solid #ddd';
    div.style.borderRadius = '8px';
    div.style.padding = '4px';
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    div.style.alignItems = 'center';
    div.style.cursor = 'pointer';
    // SVG for D3
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 120);
    svg.setAttribute('height', 120);
    div.appendChild(svg);
    grid.appendChild(div);
    drawTreeD3(svg, tree);
    div.addEventListener('click', () => {
      // Highlight samples in the training set used for this tree
      renderGrid(window._trainData, 'trainGrid', treeSamples[i]);
      // Optionally, visually indicate selected tree
      Array.from(grid.children).forEach(child => child.style.boxShadow = '');
      div.style.boxShadow = '0 0 0 3px #e67e22';
      // Remove any test sample highlight and tree background tints
      const testGrid = document.getElementById('testGrid');
      Array.from(testGrid.children).forEach(c => c.style.outline = '');
      Array.from(grid.children).forEach(child => child.style.background = '#fff');
    });
  });
}

function drawTreeD3(svgElem, tree) {
  // Convert tree dict to D3 hierarchy
  function toHierarchy(node) {
    const children = [];
    if (node.left) children.push(toHierarchy(node.left));
    if (node.right) children.push(toHierarchy(node.right));
    return {name: node.id, children: children.length ? children : undefined};
  }
  const root = d3.hierarchy(toHierarchy(tree));
  const treeLayout = d3.tree().size([110, 110]);
  treeLayout(root);
  const svg = d3.select(svgElem);
  svg.selectAll('*').remove();
  // Draw links
  svg.append('g')
    .selectAll('line')
    .data(root.links())
    .join('line')
    .attr('x1', d => d.source.x+5)
    .attr('y1', d => d.source.y+5)
    .attr('x2', d => d.target.x+5)
    .attr('y2', d => d.target.y+5)
    .attr('stroke', '#888');
  // Draw nodes
  svg.append('g')
    .selectAll('circle')
    .data(root.descendants())
    .join('circle')
    .attr('cx', d => d.x+5)
    .attr('cy', d => d.y+5)
    .attr('r', 6)
    .attr('fill', '#bbb')
    .attr('stroke', '#333');
}
