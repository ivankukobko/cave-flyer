import { random } from '../math/random.js';

export const TYPES = {
    SOLID: 0,
    AIR: 1,
    TUNNEL_V: 2,
    TUNNEL_H: 3,
};

export const RULES = {
    [TYPES.SOLID]: {
        UP: [TYPES.SOLID, TYPES.AIR, TYPES.TUNNEL_H],
        RIGHT: [TYPES.SOLID, TYPES.AIR, TYPES.TUNNEL_V],
        DOWN: [TYPES.SOLID, TYPES.AIR, TYPES.TUNNEL_H],
        LEFT: [TYPES.SOLID, TYPES.AIR, TYPES.TUNNEL_V]
    },
    [TYPES.AIR]: {
        UP: [TYPES.AIR, TYPES.SOLID, TYPES.TUNNEL_V],
        RIGHT: [TYPES.AIR, TYPES.SOLID, TYPES.TUNNEL_H],
        DOWN: [TYPES.AIR, TYPES.SOLID, TYPES.TUNNEL_V],
        LEFT: [TYPES.AIR, TYPES.SOLID, TYPES.TUNNEL_H]
    },
    [TYPES.TUNNEL_V]: {
        UP: [TYPES.TUNNEL_V, TYPES.AIR],
        RIGHT: [TYPES.SOLID],
        DOWN: [TYPES.TUNNEL_V, TYPES.AIR],
        LEFT: [TYPES.SOLID]
    },
    [TYPES.TUNNEL_H]: {
        UP: [TYPES.SOLID],
        RIGHT: [TYPES.TUNNEL_H, TYPES.AIR],
        DOWN: [TYPES.SOLID],
        LEFT: [TYPES.TUNNEL_H, TYPES.AIR]
    }
};

export class WFC {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.numTypes = Object.keys(TYPES).length;
        this.reset();
    }

    reset() {
        this.grid = [];
        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                let options = [];
                if (y === 0) {
                    if (x > this.width/2 - 3 && x < this.width/2 + 3) {
                        options = [TYPES.AIR];
                    } else {
                        options = [TYPES.SOLID];
                    }
                } else if (x === 0 || x === this.width - 1 || y === this.height - 1) {
                    options = [TYPES.SOLID];
                } else {
                    for (let i = 0; i < this.numTypes; i++) options.push(i);
                }
                row.push({ x, y, options, collapsed: false });
            }
            this.grid.push(row);
        }
    }

    getNeighbors(x, y) {
        const neighbors = {};
        if (y < this.height - 1) neighbors.UP = this.grid[y + 1][x];
        if (x < this.width - 1) neighbors.RIGHT = this.grid[y][x + 1];
        if (y > 0) neighbors.DOWN = this.grid[y - 1][x];
        if (x > 0) neighbors.LEFT = this.grid[y][x - 1];
        return neighbors;
    }

    step() {
        let minEntropy = Infinity;
        let candidates = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let cell = this.grid[y][x];
                if (!cell.collapsed) {
                    if (cell.options.length < minEntropy) {
                        minEntropy = cell.options.length;
                        candidates = [cell];
                    } else if (cell.options.length === minEntropy) {
                        candidates.push(cell);
                    }
                }
            }
        }

        if (candidates.length === 0) return false;

        let cell = candidates[Math.floor(random() * candidates.length)];
        
        if (cell.options.length === 0) {
            cell.options = [TYPES.SOLID]; 
            cell.collapsed = true;
            return true;
        }

        let chosen = cell.options[Math.floor(random() * cell.options.length)];
        cell.options = [chosen];
        cell.collapsed = true;

        let stack = [cell];
        while (stack.length > 0) {
            let current = stack.pop();
            let currentOptions = current.options;
            let neighbors = this.getNeighbors(current.x, current.y);
            
            for (let dir in neighbors) {
                let neighbor = neighbors[dir];
                if (neighbor.collapsed) continue;
                
                let allowedNeighbors = new Set();
                for (let opt of currentOptions) {
                    for (let valid of RULES[opt][dir]) {
                        allowedNeighbors.add(valid);
                    }
                }
                
                let originalLen = neighbor.options.length;
                neighbor.options = neighbor.options.filter(opt => allowedNeighbors.has(opt));
                
                if (neighbor.options.length === 0) {
                    neighbor.options = [TYPES.SOLID];
                }
                
                if (neighbor.options.length < originalLen) {
                    stack.push(neighbor);
                }
            }
        }
        return true;
    }

    generateAll() {
        let attempts = 0;
        while (this.step() && attempts < 10000) {
            attempts++;
        }
    }
}
