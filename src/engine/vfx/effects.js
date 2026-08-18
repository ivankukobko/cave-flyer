import * as THREE from 'three';

let explosionInstanced, smokeInstanced;
let explosionLight;
const expCount = 150;
const explosionParticles = [];
let explosionLife = 0;

const maxSmoke = 150;
const smokeParticles = [];
let smokeIdx = 0;

export function initEffects(scene) {
    // Explosion Particles (Blinding Glowing Low Poly)
    const expGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const expMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffaa, 
        emissive: 0xff8800,
        emissiveIntensity: 12.0,
        flatShading: true,
        roughness: 0.1
    });
    explosionInstanced = new THREE.InstancedMesh(expGeo, expMat, expCount);
    explosionInstanced.frustumCulled = false;
    explosionInstanced.count = 0;
    scene.add(explosionInstanced);

    // Blinding Explosion Flash Light
    explosionLight = new THREE.PointLight(0xfffaaa, 0, 70);
    scene.add(explosionLight);

    for (let i = 0; i < expCount; i++) {
        explosionParticles.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, scale: 1 });
    }

    // Exhaust Particles (Smoke System)
    const smokeGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const smokeMat = new THREE.MeshStandardMaterial({ 
        color: 0xdddddd, 
        flatShading: true,
        roughness: 1.0,
        metalness: 0.0
    });
    smokeInstanced = new THREE.InstancedMesh(smokeGeo, smokeMat, maxSmoke);
    smokeInstanced.frustumCulled = false;
    scene.add(smokeInstanced);

    for (let i = 0; i < maxSmoke; i++) {
        smokeParticles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, scale: 1, rot: 0 });
    }
}

export function spawnSmoke(x, y) {
    const p = smokeParticles[smokeIdx];
    p.active = true;
    p.x = x + (Math.random() - 0.5) * 0.2;
    p.y = y + (Math.random() - 0.5) * 0.2;
    p.vx = (Math.random() - 0.5) * 2.0;
    p.vy = -2.0 - Math.random() * 2.0;
    p.life = 0.3 + Math.random() * 0.3;
    p.maxLife = p.life;
    p.scale = 1.0 + Math.random();
    p.rot = Math.random() * Math.PI * 2;
    
    smokeIdx = (smokeIdx + 1) % maxSmoke;
}

export function triggerExplosion(x, y) {
    explosionInstanced.count = expCount;
    explosionLife = 1.5;
    
    if (explosionLight) {
        explosionLight.position.set(x, y, 2);
        explosionLight.color.setHex(0xfffaaa); // Blinding white-yellow initial flash
        explosionLight.intensity = 250.0;
    }

    for (let i = 0; i < expCount; i++) {
        const p = explosionParticles[i];
        p.x = x;
        p.y = y;
        p.z = 0;
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 15 + 5;
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        p.vz = (Math.random() - 0.5) * s * 0.5;
        p.rot = Math.random() * Math.PI;
        p.scale = Math.random() * 0.5 + 0.5;
    }
}

export function resetEffects() {
    explosionInstanced.count = 0;
    explosionInstanced.instanceMatrix.needsUpdate = true;
    explosionLife = 0;
    if (explosionLight) explosionLight.intensity = 0;

    for (let p of smokeParticles) p.active = false;
    smokeInstanced.count = 0;
    smokeInstanced.instanceMatrix.needsUpdate = true;
}

export function getActiveParticleCount() {
    let count = 0;
    if (explosionLife > 0) count += expCount;
    for (let i = 0; i < maxSmoke; i++) {
        if (smokeParticles[i].active) count++;
    }
    return count;
}

export function updateEffects(dt) {
    let activeSmokeCount = 0;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < maxSmoke; i++) {
        const p = smokeParticles[i];
        if (p.active) {
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += dt * 2.0;
                
                const progress = p.life / p.maxLife;
                const currentScale = p.scale * progress;
                
                dummy.position.set(p.x, p.y, 0.5);
                dummy.rotation.set(p.rot, p.rot, p.rot);
                dummy.scale.set(currentScale, currentScale, currentScale);
                dummy.updateMatrix();
                
                smokeInstanced.setMatrixAt(activeSmokeCount++, dummy.matrix);
            }
        }
    }
    smokeInstanced.count = activeSmokeCount;
    if (activeSmokeCount > 0 || smokeInstanced.instanceMatrix.needsUpdate) {
        smokeInstanced.instanceMatrix.needsUpdate = true;
    }

    if (explosionLife > 0) {
        explosionLife -= dt;
        const progress = Math.max(0, explosionLife / 1.5);
        if (explosionLight) {
            explosionLight.intensity = 250.0 * (progress ** 2.5); // Fast flash decay
        }

        const dummyExp = new THREE.Object3D();
        for (let i = 0; i < expCount; i++) {
            const p = explosionParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rot += dt * 3.0;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.vz *= 0.95;
            
            const currentScale = p.scale * progress;
            
            dummyExp.position.set(p.x, p.y, p.z);
            dummyExp.rotation.set(p.rot, p.rot, p.rot);
            dummyExp.scale.set(currentScale, currentScale, currentScale);
            dummyExp.updateMatrix();
            explosionInstanced.setMatrixAt(i, dummyExp.matrix);
        }
        explosionInstanced.instanceMatrix.needsUpdate = true;
    } else {
        if (explosionLight) explosionLight.intensity = 0;
        if (explosionInstanced.count > 0) {
            explosionInstanced.count = 0;
            if (explosionInstanced.instanceMatrix) explosionInstanced.instanceMatrix.needsUpdate = true;
        }
    }
}
