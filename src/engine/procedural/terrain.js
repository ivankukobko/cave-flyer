import { random } from '../math/random.js';

export class TerrainGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.fillPercent = 0.45; // 45% rock
        this.smoothingIterations = 4;
    }

    generate() {
        // 1. Initialize random noise
        this.grid = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === this.height - 1 || y === 0) {
                    this.grid[y][x] = 1; // Borders are solid
                } else {
                    this.grid[y][x] = random() < this.fillPercent ? 1 : 0;
                }
            }
        }

        // 2. Smooth using Cellular Automata rules
        for (let i = 0; i < this.smoothingIterations; i++) {
            this.smoothGrid();
        }

        // 3. Carve a guaranteed path from bottom to top (Drunkard's Walk with target guidance)
        let currentX = Math.floor(this.width / 2);
        const targetX = Math.floor(this.width / 2);

        for (let y = 1; y < this.height - 1; y++) {
            // Comfortable tunnel width: radius 3 (6-7 cells wide) along the cavern, radius 4 near start & finish
            let radius = 3;
            if (y < 20 || y > this.height - 25) {
                radius = 4;
            }

            this.clearRadius(Math.round(currentX), y, radius);

            const remainingY = (this.height - 1) - y;
            if (remainingY < 35) {
                // Smoothly steer path toward extraction point at the top of the cavern
                if (Math.abs(currentX - targetX) > 0.5) {
                    currentX += (targetX - currentX) * 0.12;
                } else {
                    currentX = targetX;
                }
            } else {
                const drift = random();
                if (drift < 0.35 && currentX > 6) {
                    currentX -= 0.8;
                } else if (drift > 0.65 && currentX < this.width - 7) {
                    currentX += 0.8;
                }
            }
        }

        // 4. Clear starting area (bottom center)
        const startX = Math.floor(this.width / 2);
        this.clearRadius(startX, 1, 4.5);

        // 5. Clear extraction point (top center)
        const endX = Math.floor(this.width / 2);
        const endY = this.height - 3;
        this.clearRadius(endX, endY, 4.5);

        // 6. Filter out tiny isolated noise clusters (floating specks)
        this.filterNoise();
    }

    smoothGrid() {
        const newGrid = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            newGrid[y] = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                const neighborWallCount = this.getSurroundingWallCount(x, y);

                if (neighborWallCount > 4) {
                    newGrid[y][x] = 1;
                } else if (neighborWallCount < 4) {
                    newGrid[y][x] = 0;
                } else {
                    newGrid[y][x] = this.grid[y][x];
                }

                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    newGrid[y][x] = 1;
                }
            }
        }
        this.grid = newGrid;
    }

    getSurroundingWallCount(gridX, gridY) {
        let wallCount = 0;
        for (let neighborY = gridY - 1; neighborY <= gridY + 1; neighborY++) {
            for (let neighborX = gridX - 1; neighborX <= gridX + 1; neighborX++) {
                if (neighborX >= 0 && neighborX < this.width && neighborY >= 0 && neighborY < this.height) {
                    if (neighborX !== gridX || neighborY !== gridY) {
                        wallCount += this.grid[neighborY][neighborX];
                    }
                } else {
                    wallCount++;
                }
            }
        }
        return wallCount;
    }

    clearRadius(centerX, centerY, radius) {
        const minX = Math.max(1, Math.floor(centerX - radius));
        const maxX = Math.min(this.width - 2, Math.ceil(centerX + radius));
        const minY = Math.max(1, Math.floor(centerY - radius));
        const maxY = Math.min(this.height - 2, Math.ceil(centerY + radius));

        const radiusSq = radius * radius;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radiusSq) {
                    if (this.grid[y]) {
                        this.grid[y][x] = 0;
                    }
                }
            }
        }
    }

    isSolid(x, y) {
        const gridX = Math.round(x);
        const gridY = Math.round(y);

        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) return true;
        return this.grid[gridY][gridX] === 1;
    }

    filterNoise() {
        // Remove isolated single/double wall cells floating in mid-air
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === 1) {
                    const neighbors = this.getSurroundingWallCount(x, y);
                    // If a wall cell has fewer than 3 neighboring wall cells, it's an isolated floating speck!
                    if (neighbors < 3) {
                        this.grid[y][x] = 0;
                    }
                }
            }
        }
    }
}
