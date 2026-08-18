# Wave Function Collapse (WFC) Implementation Details

This project is a 3D visualization of the Wave Function Collapse algorithm built with Three.js. This document serves as context for how the algorithm was implemented specifically for this codebase.

## 1. The Ruleset (Cityscape & Landscape Hybrid)
In `src/wfc.js`, we define 7 tile types, which map to physical blocks in the Three.js scene:
- `0`: Water (Flat, Blue)
- `1`: Sand (Short, Yellow)
- `2`: Grass (Low, Green)
- `3`: Forest (Tall, Dark Green)
- `4`: Road (Low, Gray)
- `5`: Building (Tall, Concrete)
- `6`: Commercial (Very Tall, Glass Blue)

The `RULES` dictionary explicitly defines what tiles are allowed to be placed next to each other. For example:
- `Water` can only touch `Water` or `Sand` (creating beaches).
- `Sand` acts as a transition between `Water` and `Grass`.
- `Road` can touch `Grass`, `Road`, `Building`, or `Commercial`.
This creates organic clustering without impossible adjacencies.

## 2. Core Algorithm (`src/wfc.js`)
The algorithm is purely logical and ignorant of the 3D representation.
1. **Superposition**: The `Grid` initializes an NxN array. Every cell starts with all 7 options `[0,1,2,3,4,5,6]`.
2. **Entropy Evaluation**: `step()` scans the grid for uncollapsed cells with the lowest number of remaining options (minimum entropy). 
3. **Collapse**: It randomly selects one cell from the lowest entropy candidates and randomly picks ONE valid option for it, permanently collapsing it.
4. **Propagation**: It pushes the collapsed cell to a `stack`. It then iteratively pops from the stack, checks neighbors, and removes any options from neighbors that violate the `RULES` based on the current cell's remaining valid options. If a neighbor's options are reduced, it gets added to the stack to propagate further.

## 3. 3D Visualization (`src/main.js`)
- The Three.js scene builds an NxN grid of semi-transparent boxes.
- As `wfc.step()` runs, `updateVisuals()` reads the `Grid` state.
- **Uncollapsed cells**: Scaled down to height `0.1` and colored white. The fewer options they have remaining, the more opaque they become, visualizing the "pressure" of the constraints.
- **Collapsed cells**: Assigned their final color and final height based on `TILE_PROPS`, turning fully opaque.
- **Contradictions**: If the algorithm paints itself into a corner (0 valid options for a cell), the cell turns bright red.

## 4. UI Overlay
A simple HTML overlay controls the simulation loop. 
- **Step**: Runs one collapse + propagation cycle.
- **Play**: Runs the step function in a fast `setInterval` loop.
- **Pause**: Halts the loop.
- **Reset**: Re-initializes the WFC grid to full superposition and resets the 3D meshes to white/transparent.
