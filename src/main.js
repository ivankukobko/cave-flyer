import * as THREE from 'three';
import { PhysicsWorld } from './engine/physics/physics.js';
import { setSeed, currentSeed } from './engine/math/random.js';
import { input, initInput } from './engine/input/input.js';
import { initEffects, triggerExplosion, resetEffects, updateEffects, spawnSmoke, getActiveParticleCount } from './engine/vfx/effects.js';
import { initShip, updateShipGraphics, resetShip, hideShip } from './ship.js';
import { initLevel, buildLevel, updateLevel, platformMesh, extractionMesh, terrain, BIOMES, activeBiome, instancedRocks } from './level.js';
import { Profiler } from './engine/utils/profiler.js';
import { ensureAudioContext, updateThrusterSound, stopThrusterSound, playExplosionSound, playExplosionTexturedSound, playVictorySound } from './engine/audio/sound.js';

// Setup Three.js Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup Custom Fog Origin (Flyer position instead of camera)
export const fogOriginUniform = { value: new THREE.Vector3(0, 0, 0) };
THREE.UniformsLib.fog.uFogOrigin = fogOriginUniform;

THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
	varying float vFogDepth;
	uniform vec3 uFogOrigin;
#endif
`;

THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
	vec4 fogWorldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		fogWorldPosition = batchingMatrix * fogWorldPosition;
	#endif
	#ifdef USE_INSTANCING
		fogWorldPosition = instanceMatrix * fogWorldPosition;
	#endif
	fogWorldPosition = modelMatrix * fogWorldPosition;
	vFogDepth = distance(fogWorldPosition.xyz, uFogOrigin);
#endif
`;

function patchMaterialFog(mat) {
    if (!mat || mat.__fogPatched) return;
    mat.__fogPatched = true;
    const prevOnBeforeCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
        if (prevOnBeforeCompile) prevOnBeforeCompile(shader, renderer);
        shader.uniforms.uFogOrigin = fogOriginUniform;
    };
    mat.needsUpdate = true;
}

function updateFogOrigin(scene, player) {
    if (!player) return;
    fogOriginUniform.value.set(player.x, player.y, 0);

    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(patchMaterialFog);
            } else {
                patchMaterialFog(child.material);
            }
        }
    });
}

// Fog and Balanced Cavern Lighting
scene.fog = new THREE.FogExp2(0x0a1a2a, 0.04);
scene.background = scene.fog.color;
const ambientLight = new THREE.AmbientLight(0x2d3e50, 0.75); // Balanced ambient fill
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0x778899, 0.6); // Soft directional light
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Level Configuration
const width = 60;
const height = 200;
const physics = new PhysicsWorld();
const profiler = new Profiler();

// Init Modules
initInput();
initEffects(scene);
const shipMesh = initShip(scene);
initLevel(scene);

// Game State
const GAME_STATE = {
    MENU: 0,
    PLAYING: 1,
    GAMEOVER: 2,
    VICTORY: 3,
    PAUSED: 4
};
let currentState = GAME_STATE.MENU;
let isLaunched = false;
let startTime = 0;
let finalTime = 0;
let shakeAmount = 0;

let initialSeed = null;
if (window.location.hash.startsWith('#seed=')) {
    const hashSeed = parseInt(window.location.hash.replace('#seed=', ''), 10);
    if (!isNaN(hashSeed)) {
        initialSeed = hashSeed;
    }
}

// Generate initial background cavern for menu
setSeed(Math.floor(Math.random() * 999999));
buildLevel(width, height);
physics.reset(Math.floor(width / 2), 1.75); // Rest just above the platform

// Game Loop Functions
function startGame(forcedSeed) {
    if (forcedSeed !== undefined && typeof forcedSeed === 'number') {
        setSeed(forcedSeed);
    } else if (initialSeed !== null) {
        setSeed(initialSeed);
        initialSeed = null; // Only use it once
    } else {
        setSeed(Math.floor(Math.random() * 999999));
    }

    // Update URL so it can be easily copied
    window.history.replaceState(null, '', `#seed=${currentSeed}`);

    buildLevel(width, height);
    syncUIWithBiome();
    physics.reset(Math.floor(width / 2), 1.75); // Rest just above the platform
    currentState = GAME_STATE.PLAYING;
    isLaunched = false;
    startTime = 0;

    document.getElementById('ui-menu').style.display = 'none';
    document.getElementById('ui-gameover').style.display = 'none';
    document.getElementById('ui-victory').style.display = 'none';
    document.getElementById('ui-pause').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('ui-time').innerText = "0.00";
    document.getElementById('ui-seed').innerText = `${currentSeed}`;

    resetShip();
    resetEffects();
    shakeAmount = 0;
    ensureAudioContext();
}

function gameOver() {
    currentState = GAME_STATE.GAMEOVER;
    stopThrusterSound();

    // Trigger explosion
    shakeAmount = 4.5;
    hideShip();
    triggerExplosion(physics.player.x, physics.player.y);
    playExplosionTexturedSound();

    // Delay modal so player can see the explosion
    setTimeout(() => {
        if (currentState === GAME_STATE.GAMEOVER) {
            document.getElementById('ui-gameover').style.display = 'flex';
        }
    }, 1200);
}

function victory(time) {
    currentState = GAME_STATE.VICTORY;
    stopThrusterSound();
    finalTime = time;
    document.getElementById('ui-victory').style.display = 'flex';
    document.getElementById('final-time').innerText = finalTime.toFixed(2);

    hideShip();
    playVictorySound();
}

// UI Listeners
document.getElementById('btn-start').addEventListener('click', () => startGame());
document.getElementById('btn-restart').addEventListener('click', () => startGame());
document.getElementById('btn-retry-same').addEventListener('click', () => startGame(currentSeed));
document.getElementById('btn-retry-victory').addEventListener('click', () => startGame(currentSeed));
document.getElementById('btn-next').addEventListener('click', () => startGame());
document.getElementById('btn-resume').addEventListener('click', () => togglePause());
document.getElementById('btn-share').addEventListener('click', (e) => {
    navigator.clipboard.writeText(window.location.href);
    const btn = e.currentTarget;
    const origText = btn.innerText;
    btn.innerText = 'Copied! ✓';
    btn.style.background = '#22aa55';
    setTimeout(() => {
        btn.innerText = origText;
        btn.style.background = '#444455';
    }, 2000);
});

function togglePause() {
    if (currentState === GAME_STATE.PLAYING) {
        currentState = GAME_STATE.PAUSED;
        stopThrusterSound();
        document.getElementById('ui-pause').style.display = 'flex';
    } else if (currentState === GAME_STATE.PAUSED) {
        currentState = GAME_STATE.PLAYING;
        document.getElementById('ui-pause').style.display = 'none';
        lastTime = performance.now(); // Prevent large delta time jump
    }
}

// Dynamic Camera Distance based on aspect ratio
let customBaseDistance = 15;

function updateCameraDistance() {
    const aspect = window.innerWidth / window.innerHeight;
    return aspect < 1.0 ? customBaseDistance / aspect : customBaseDistance;
}

// Editor Mode Controls
const uiEditor = document.getElementById('ui-editor');
function toggleEditor() {
    const isHidden = uiEditor.style.display === 'none';
    uiEditor.style.display = isHidden ? 'block' : 'none';
}

document.getElementById('btn-toggle-editor').addEventListener('click', toggleEditor);

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
    } else if (e.code === 'KeyE') {
        toggleEditor();
    }
});

// Editor Sliders & Event Handlers
document.getElementById('slider-zoom').addEventListener('input', (e) => {
    customBaseDistance = parseFloat(e.target.value);
    document.getElementById('val-zoom').innerText = customBaseDistance;
});

document.getElementById('slider-fog-density').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    scene.fog.density = val;
    document.getElementById('val-fog-density').innerText = val.toFixed(3);
});

document.getElementById('picker-fog-color').addEventListener('input', (e) => {
    const hexColor = parseInt(e.target.value.replace('#', '0x'), 16);
    scene.fog.color.setHex(hexColor);
    scene.background.setHex(hexColor);
});

document.getElementById('slider-fill-percent').addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    terrain.fillPercent = val / 100.0;
    document.getElementById('val-fill-percent').innerText = `${val}%`;
});

document.getElementById('btn-rebuild-level').addEventListener('click', () => {
    buildLevel(width, height);
});

function syncUIWithBiome() {
    if (!activeBiome) return;
    const hexColor = parseInt(activeBiome.fogColor.replace('#', '0x'), 16);
    scene.fog.color.setHex(hexColor);
    scene.fog.density = activeBiome.fogDensity;
    scene.background = scene.fog.color;

    // Update Top Center Biome Title Banner (Hidden for mobile HUD space)
    const biomeBanner = document.getElementById('ui-biome');
    if (biomeBanner) {
        document.getElementById('biome-icon').innerText = activeBiome.icon || '🏔️';
        document.getElementById('biome-name').innerText = activeBiome.name.toUpperCase();
        biomeBanner.style.display = 'none';
    }

    const presetSelect = document.getElementById('select-preset');
    if (presetSelect) presetSelect.value = activeBiome.key;

    document.getElementById('picker-fog-color').value = activeBiome.fogColor;
    document.getElementById('slider-fog-density').value = activeBiome.fogDensity;
    document.getElementById('val-fog-density').innerText = activeBiome.fogDensity.toFixed(3);
    document.getElementById('slider-fill-percent').value = Math.round(activeBiome.fillPercent * 100);
    document.getElementById('val-fill-percent').innerText = `${Math.round(activeBiome.fillPercent * 100)}%`;
}

document.getElementById('select-preset').addEventListener('change', (e) => {
    const pKey = e.target.value;
    if (BIOMES[pKey]) {
        buildLevel(width, height, pKey);
        syncUIWithBiome();
    }
});

// JSON Export & Import
document.getElementById('btn-export-config').addEventListener('click', () => {
    const config = {
        zoom: customBaseDistance,
        fogDensity: scene.fog.density,
        fogColor: '#' + scene.fog.color.getHexString(),
        fillPercent: Math.round(terrain.fillPercent * 100),
        biomeKey: activeBiome.key,
        seed: currentSeed
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cave-flyer-config-${currentSeed}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

const fileImport = document.getElementById('file-import-config');
document.getElementById('btn-import-config').addEventListener('click', () => fileImport.click());

fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const config = JSON.parse(event.target.result);
            if (config.seed) setSeed(config.seed);
            buildLevel(width, height, config.biomeKey);
            syncUIWithBiome();
        } catch (err) {
            alert('Failed to parse config JSON file');
        }
    };
    reader.readAsText(file);
});

// Main Animation Loop
let lastTime = 0;
function animate(time) {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (currentState === GAME_STATE.PAUSED) {
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        return;
    }

    if (currentState === GAME_STATE.PLAYING) {
        if (input.left || input.right) {
            isLaunched = true; // Launch off platform
        }

        if (isLaunched) {
            physics.update(dt, input);
            startTime += dt;
            document.getElementById('ui-time').innerText = startTime.toFixed(2);
            document.getElementById('ui-dist').innerText = Math.max(0, Math.floor(physics.player.y));
        }

        const shipState = updateShipGraphics(physics.player, input);

        // Spawn smoke if thrusting
        if (isLaunched) {
            if (shipState.fireL) spawnSmoke(shipState.xL, shipState.yL);
            if (shipState.fireR) spawnSmoke(shipState.xR, shipState.yR);
        }

        updateThrusterSound(isLaunched && (input.left || input.right));

        updateLevel(dt);

        // Collision Check
        if (isLaunched) {
            let crashed = physics.checkTerrainCollision(terrain);

            const px = platformMesh.position.x;
            const py = platformMesh.position.y;
            const r = physics.player.radius;
            
            // Only crash on platform if falling at high speed
            if (physics.player.y - r < py + 0.25 && Math.abs(physics.player.x - px) < 2) {
                if (physics.player.vy < -6.0) {
                    crashed = true;
                } else {
                    // Soft landing back on platform
                    physics.player.y = py + 0.25 + r;
                    physics.player.vy = 0;
                    physics.player.vx *= 0.8;
                }
            }

            if (crashed) {
                gameOver();
            }

            const ex = extractionMesh.position.x;
            const ey = extractionMesh.position.y;
            const distSq = (physics.player.x - ex) ** 2 + (physics.player.y - ey) ** 2;
            if (distSq < 2.25) { // radius 1.5 ^ 2
                victory(startTime);
            }
        }
    }

    updateEffects(dt);

    // Camera follow and shake
    if (shakeAmount > 0) {
        shakeAmount -= dt * 5.0; // Decay shake
        if (shakeAmount < 0) shakeAmount = 0;
    }

    if (currentState === GAME_STATE.PLAYING || currentState === GAME_STATE.GAMEOVER) {
        let thrustShake = 0;
        if (currentState === GAME_STATE.PLAYING && (input.left || input.right)) {
            thrustShake = 0.1;
        }

        const totalShake = shakeAmount + thrustShake;
        const sx = (Math.random() - 0.5) * totalShake;
        const sy = (Math.random() - 0.5) * totalShake;

        camera.position.x = physics.player.x + sx;
        camera.position.y = physics.player.y + sy;
        camera.position.z = updateCameraDistance();
        camera.lookAt(physics.player.x, physics.player.y, 0); // Focus on player location
    } else { // MENU, VICTORY, GAMEOVER
        stopThrusterSound();
        const t = Date.now() * 0.001;
        camera.position.x = physics.player.x + Math.sin(t * 0.5) * 5;
        camera.position.y = physics.player.y + 5;
        camera.position.z = updateCameraDistance();
        camera.lookAt(physics.player.x, physics.player.y + 10, 0);
        
        if (currentState === GAME_STATE.MENU) {
            updateShipGraphics(physics.player, {left: false, right: false}, false);
        }
    }

    // Update fog origin to follow flyer (player) position every frame across all materials
    if (physics && physics.player) {
        updateFogOrigin(scene, physics.player);
    }

    renderer.render(scene, camera);
    profiler.update(renderer, scene, instancedRocks ? instancedRocks.count : 0, getActiveParticleCount());
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
