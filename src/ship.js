import * as THREE from 'three';

let shipMesh;
let engineL, engineR;
let engineMatIdle, engineMatActive;
let thrustLightL, thrustLightR;

export function initShip(scene) {
    shipMesh = new THREE.Group();

    // 1. Chubby Rocket Fuselage Body (Pure White)
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.65, 1.25, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0x334455, 
        emissiveIntensity: 0.4, 
        metalness: 0.2, 
        roughness: 0.3 
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.1;
    shipMesh.add(body);

    // 2. Retro Red Candy Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.39, 0.65, 12);
    const noseMat = new THREE.MeshStandardMaterial({ 
        color: 0xff2244, 
        emissive: 0xaa1122, 
        emissiveIntensity: 0.3,
        roughness: 0.2 
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = 1.02;
    shipMesh.add(nose);

    // 3. Glowing Bubble Canopy Cockpit Window (Front belly)
    const cockpitGeo = new THREE.SphereGeometry(0.28, 12, 10);
    const cockpitMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ddff, 
        emissive: 0x00aaff, 
        emissiveIntensity: 1.5,
        roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.35, 0.35);
    cockpit.scale.set(1.0, 0.9, 0.7);
    shipMesh.add(cockpit);

    // 4. Cartoon Fin Stabilizers (Left & Right)
    const finGeo = new THREE.BoxGeometry(0.12, 0.55, 0.45);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xff2244, roughness: 0.3 });

    const finL = new THREE.Mesh(finGeo, finMat);
    finL.position.set(-0.55, -0.25, 0);
    finL.rotation.z = Math.PI / 6;
    shipMesh.add(finL);

    const finR = new THREE.Mesh(finGeo, finMat);
    finR.position.set(0.55, -0.25, 0);
    finR.rotation.z = -Math.PI / 6;
    shipMesh.add(finR);

    // 5. Dual Engine Thruster Nozzles
    const engineGeo = new THREE.CylinderGeometry(0.12, 0.20, 0.3, 10);
    engineMatIdle = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    engineMatActive = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0xffffff, 
        emissiveIntensity: 2.5 
    });

    engineL = new THREE.Mesh(engineGeo, engineMatIdle);
    engineR = new THREE.Mesh(engineGeo, engineMatIdle);
    engineL.position.set(-0.25, -0.68, 0);
    engineR.position.set(0.25, -0.68, 0);
    shipMesh.add(engineL);
    shipMesh.add(engineR);

    // Dedicated Ship Hull Soft Light
    const hullLight = new THREE.PointLight(0xaaddff, 3.5, 8);
    hullLight.position.set(0, 0, 0.5);
    shipMesh.add(hullLight);

    // High-powered Ship Flashlight (Headlight beam pointing UP)
    const flashlight = new THREE.SpotLight(0xaaddff, 70.0, 60, Math.PI / 4, 0.4, 1);
    flashlight.position.set(0, 0.5, 0); 
    flashlight.target.position.set(0, 12, 0);
    shipMesh.add(flashlight);
    shipMesh.add(flashlight.target);

    // Thruster Light Sources
    thrustLightL = new THREE.PointLight(0xffffff, 0, 15);
    thrustLightR = new THREE.PointLight(0xffffff, 0, 15);
    thrustLightL.position.set(-0.25, -0.68, 0);
    thrustLightR.position.set(0.25, -0.68, 0);
    shipMesh.add(thrustLightL);
    shipMesh.add(thrustLightR);

    scene.add(shipMesh);
    return shipMesh;
}

export function resetShip() {
    shipMesh.visible = true;
    thrustLightL.intensity = 0;
    thrustLightR.intensity = 0;
}

export function hideShip() {
    shipMesh.visible = false;
    thrustLightL.intensity = 0;
    thrustLightR.intensity = 0;
}

export function updateShipGraphics(physicsPlayer, input) {
    shipMesh.position.set(physicsPlayer.x, physicsPlayer.y, 0);
    
    // Curved Non-Linear Banking Response:
    // Uses square-root curve so gentle side movements tilt the flyer explicitly right away!
    const vx = physicsPlayer.vx;
    const speedRatio = Math.min(1.0, Math.abs(vx) / 7.0); // 7.0 max side speed
    const curveFactor = Math.sqrt(speedRatio); // Responsive non-linear curve
    const maxBankAngle = 0.45; // Max tilt (~25 degrees)

    let targetRotation = -Math.sign(vx) * curveFactor * maxBankAngle;

    // Responsive thrust bias: lean immediately when pressing left/right thrusters
    if (input.left && !input.right) {
        targetRotation = Math.min(targetRotation + 0.15, maxBankAngle);
    } else if (input.right && !input.left) {
        targetRotation = Math.max(targetRotation - 0.15, -maxBankAngle);
    }

    // Interpolate smoothly towards target rotation
    shipMesh.rotation.z += (targetRotation - shipMesh.rotation.z) * 0.15;

    let fireL = false;
    let fireR = false;

    if (input.left) {
        engineR.material = engineMatActive;
        thrustLightR.intensity = 12.0;
        fireR = true;
    } else {
        engineR.material = engineMatIdle;
        thrustLightR.intensity = 0;
    }

    if (input.right) {
        engineL.material = engineMatActive;
        thrustLightL.intensity = 12.0;
        fireL = true;
    } else {
        engineL.material = engineMatIdle;
        thrustLightL.intensity = 0;
    }

    // Calculate rotated thruster nozzle spawn positions (positioned clearly below ship body at y = -1.10)
    const rot = shipMesh.rotation.z;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const worldLX = physicsPlayer.x + (-0.25 * cosR - (-0.95) * sinR);
    const worldLY = physicsPlayer.y + (-0.25 * sinR + (-0.95) * cosR);

    const worldRX = physicsPlayer.x + (0.25 * cosR - (-0.95) * sinR);
    const worldRY = physicsPlayer.y + (0.25 * sinR + (-0.95) * cosR);

    return { 
        fireL, 
        fireR, 
        xL: worldLX, 
        yL: worldLY, 
        xR: worldRX, 
        yR: worldRY,
        x: physicsPlayer.x, 
        y: physicsPlayer.y 
    };
}
