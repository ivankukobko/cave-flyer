import * as THREE from 'three';
import { TerrainGenerator } from './engine/procedural/terrain.js';
import { random } from './engine/math/random.js';

export let instancedRocks, platformMesh, extractionMesh, terrain;

export const BIOMES = {
    classic: {
        key: 'classic',
        name: "Classic Cave",
        icon: "🏔️",
        primaryHue: 0.08, primarySat: 0.65, primaryLight: 0.35,
        secondaryHue: 0.13, secondarySat: 0.75, secondaryLight: 0.45,
        spikey: false,
        fogColor: '#0a1a2a',
        fogDensity: 0.095,
        fillPercent: 0.45
    },
    volcanic: {
        key: 'volcanic',
        name: "Volcanic Trench",
        icon: "🌋",
        primaryHue: 0.00, primarySat: 0.85, primaryLight: 0.35,
        secondaryHue: 0.07, secondarySat: 0.90, secondaryLight: 0.50,
        spikey: false,
        fogColor: '#2a0d0d',
        fogDensity: 0.090,
        fillPercent: 0.50
    },
    ice: {
        key: 'ice',
        name: "Ice Cavern",
        icon: "🧊",
        primaryHue: 0.55, primarySat: 0.25, primaryLight: 0.82,   // Light blue, almost white!
        secondaryHue: 0.61, secondarySat: 0.95, secondaryLight: 0.45,  // Deeper blue, electric glow!
        spikey: true,       // Sharp Crystal Spires!
        fogColor: '#082032',
        fogDensity: 0.095,
        fillPercent: 0.42
    },
    toxic: {
        key: 'toxic',
        name: "Toxic Abyss",
        icon: "☣️",
        primaryHue: 0.33, primarySat: 0.85, primaryLight: 0.40,
        secondaryHue: 0.78, secondarySat: 0.85, secondaryLight: 0.45,
        spikey: true,       // Spikey Toxic Crystals!
        fogColor: '#356360',
        fogDensity: 0.099,
        fillPercent: 0.48
    }
};

export let activeBiome = BIOMES.classic;

export function initLevel(scene) {
    terrain = new TerrainGenerator(0, 0);

    // Shared Rock Geometry and Material (0 subdivisions for sharp, faceted low-poly rocks)
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        flatShading: true
    });
    const MAX_ROCKS = 16000;
    instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, MAX_ROCKS); // Max rocks
    scene.add(instancedRocks);

    // Starting Platform
    const platformGeo = new THREE.BoxGeometry(4, 0.5, 2);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x4444aa, metalness: 0.8, roughness: 0.2 });
    platformMesh = new THREE.Mesh(platformGeo, platformMat);
    scene.add(platformMesh);

    // Extraction Point (Target Ring matching UI primary color #00ffcc)
    const extractionGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 16);
    const extractionMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 2.5,
        roughness: 0.2
    });
    extractionMesh = new THREE.Mesh(extractionGeo, extractionMat);

    // Neon Cyan Glow PointLight
    const extractionLight = new THREE.PointLight(0x00ffcc, 8.0, 15);
    extractionMesh.add(extractionLight);
    scene.add(extractionMesh);
}

export function buildLevel(width, height, forcedBiomeKey) {
    if (forcedBiomeKey && BIOMES[forcedBiomeKey]) {
        activeBiome = BIOMES[forcedBiomeKey];
    } else {
        // Roll biome deterministically per level seed!
        const keys = Object.keys(BIOMES);
        const roll = Math.floor(random() * keys.length);
        activeBiome = BIOMES[keys[roll]];
    }

    terrain.fillPercent = activeBiome.fillPercent;
    terrain.width = width;
    terrain.height = height;
    terrain.generate();

    let instanceIdx = 0;
    const dummy = new THREE.Object3D();

    // Create clear area above platform
    const platformX = Math.floor(width / 2);
    terrain.clearRadius(platformX, 2, 4); // Clear larger area around spawn

    // Position platform
    platformMesh.position.set(platformX, 1, 0);

    // Position extraction point
    extractionMesh.position.set(platformX, height - 3, 0);

    const rockColor = new THREE.Color();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (terrain.grid[y][x] === 1) {
                // Skip rocks that would spawn inside the platform
                if (Math.abs(x - platformX) <= 2 && y <= 1) continue;

                // Determine if this is an inner rock (fully surrounded)
                const neighbors = terrain.getSurroundingWallCount(x, y);

                // Optimization & Aesthetics: Skip every 2nd deep interior rock since adjacent giant boulders cover it
                if (neighbors === 8 && (x + y) % 2 !== 0) continue;

                let sX, sY, sZ, zPos;

                if (neighbors === 8) {
                    // Deep interior core: Huge monolithic boulder mass
                    sX = 2.6 + random() * 0.8;
                    sY = 2.6 + random() * 0.8;
                    sZ = 1.4 + random() * 0.4;
                    zPos = -0.5 + (random() - 0.5) * 0.3;
                } else if (neighbors >= 6) {
                    // Inner wall layer: Large rock blocks
                    sX = 1.6 + random() * 0.5;
                    sY = 1.6 + random() * 0.5;
                    sZ = 1.1 + random() * 0.3;
                    zPos = -0.2 + (random() - 0.5) * 0.3;
                } else if (neighbors >= 4) {
                    // Medium cave wall rocks
                    sX = 1.0 + random() * 0.3;
                    sY = 1.0 + random() * 0.3;
                    sZ = 0.9 + random() * 0.3;
                    zPos = (random() - 0.5) * 0.3;
                } else {
                    // Edge rocks (facing the tunnel): Smaller, detailed rocks along cave borders
                    sX = 0.65 + random() * 0.35;
                    sY = 0.65 + random() * 0.35;
                    sZ = 0.7 + random() * 0.3;
                    zPos = (random() - 0.5) * 0.4;
                }

                // --- 1. Foreground Play Layer Rock (z ~ 0) ---
                let finalSX = sX;
                let finalSY = sY;
                let finalSZ = sZ;

                // Spikey biomes (Ice / Toxic): Elongate vertical & depth axes into sharp crystal spires!
                if (activeBiome.spikey) {
                    finalSY *= (1.35 + random() * 0.5); // Vertical spike elongation
                    finalSX *= (0.7 + random() * 0.3);  // Narrow width
                }

                dummy.position.set(x, y, zPos);
                dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
                dummy.scale.set(finalSX, finalSY, finalSZ);
                dummy.updateMatrix();

                // Dual Color Shading: Pick between primary & secondary biome hues
                const useSecondary = random() > 0.45;
                const targetHue = useSecondary ? activeBiome.secondaryHue : activeBiome.primaryHue;
                const baseSat = useSecondary ? activeBiome.secondarySat : activeBiome.primarySat;
                const baseLight = useSecondary ? activeBiome.secondaryLight : activeBiome.primaryLight;

                const saturation = Math.max(0.0, Math.min(1.0, baseSat + (random() - 0.5) * 0.1));
                const lightness = Math.max(0.1, Math.min(0.94, baseLight + (y / height) * 0.2 - 0.1 + (random() - 0.5) * 0.08));

                rockColor.setHSL(targetHue, saturation, lightness);
                instancedRocks.setColorAt(instanceIdx, rockColor);
                instancedRocks.setMatrixAt(instanceIdx++, dummy.matrix);

                // --- 2. Mid-Depth Backing Layer (Extruded deeply towards background) ---
                // Keep X and Y constrained so rocks don't spill into the open tunnel, but extrude heavily along Z
                if (neighbors < 8) {
                    const backScaleX = Math.min(sX * 1.2, 1.3);
                    const backScaleY = Math.min(sY * 1.2, 1.3);
                    const backScaleZ = 3.0 + random() * 2.0; // Extrude deeply into Z
                    const backZ = -2.5 - backScaleZ * 0.5; // Push center back so front aligns with Z ~ -0.5

                    dummy.position.set(x, y, backZ);
                    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
                    dummy.scale.set(backScaleX, backScaleY, backScaleZ);
                    dummy.updateMatrix();

                    rockColor.setHSL(targetHue, saturation * 0.8, lightness * 0.7);
                    instancedRocks.setColorAt(instanceIdx, rockColor);
                    instancedRocks.setMatrixAt(instanceIdx++, dummy.matrix);
                }

                if (instanceIdx >= 15500) break;
            }
        }
        if (instanceIdx >= 15500) break;
    }

    // --- 3. Structured Deep Cavern Tunnel Wall (z ~ -10 to -25) ---
    // Extrude the level grid into deep background cavern walls fading into mid-fog
    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
            if (terrain.grid[y][x] === 1) {
                const bgZ = -10.0 - random() * 15.0;
                const bgScale = 3.8 + random() * 2.5;

                dummy.position.set(x + (random() - 0.5) * 1.5, y + (random() - 0.5) * 1.5, bgZ);
                dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
                dummy.scale.set(bgScale, bgScale, bgScale * 1.6);
                dummy.updateMatrix();

                const lightness = Math.max(0.08, 0.12 + (y / height) * 0.18);
                const useSecondaryBG = random() > 0.5;
                const bgHue = useSecondaryBG ? activeBiome.secondaryHue : activeBiome.primaryHue;
                rockColor.setHSL(bgHue, 0.45, lightness);
                instancedRocks.setColorAt(instanceIdx, rockColor);
                instancedRocks.setMatrixAt(instanceIdx++, dummy.matrix);

                if (instanceIdx >= 15880) break;
            }
        }
        if (instanceIdx >= 15880) break;
    }

    // --- 4. Ultra-Deep Distant Cavern Chamber (z ~ -25 to -50) ---
    // Giant distant mountain spires submerged deep in atmospheric fog
    for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < width; x += 3) {
            if (terrain.grid[y][x] === 1) {
                const farZ = -25.0 - random() * 25.0;
                const farScale = 6.5 + random() * 4.5;

                dummy.position.set(x + (random() - 0.5) * 2.5, y + (random() - 0.5) * 2.5, farZ);
                dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
                dummy.scale.set(farScale, farScale * 1.3, farScale * 2.0);
                dummy.updateMatrix();

                const lightness = Math.max(0.05, 0.08 + (y / height) * 0.12);
                const bgHue = activeBiome.primaryHue;
                rockColor.setHSL(bgHue, 0.35, lightness);
                instancedRocks.setColorAt(instanceIdx, rockColor);
                instancedRocks.setMatrixAt(instanceIdx++, dummy.matrix);

                if (instanceIdx >= 15980) break;
            }
        }
        if (instanceIdx >= 15980) break;
    }

    instancedRocks.count = instanceIdx;
    instancedRocks.instanceMatrix.needsUpdate = true;
    if (instancedRocks.instanceColor) instancedRocks.instanceColor.needsUpdate = true;
}

export function updateLevel(dt) {
    // Spin extraction point
    extractionMesh.rotation.y += dt;
    extractionMesh.rotation.z += dt * 0.5;
}
