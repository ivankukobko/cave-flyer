export class Profiler {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.frameTime = 0;
    }

    update(renderer, scene, rockCount = 0, activeParticleCount = 0) {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.frameCount++;

        if (delta >= 500) { // Refresh twice per second
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameTime = (delta / this.frameCount).toFixed(1);
            this.frameCount = 0;
            this.lastTime = now;

            this.updateDOM(renderer, scene, rockCount, activeParticleCount);
        }
    }

    updateDOM(renderer, scene, rockCount, activeParticleCount) {
        const elFps = document.getElementById('stat-fps');
        const elMs = document.getElementById('stat-ms');
        const elObjects = document.getElementById('stat-objects');
        const elRocks = document.getElementById('stat-rocks');
        const elCalls = document.getElementById('stat-calls');
        const elTris = document.getElementById('stat-tris');
        const elParticles = document.getElementById('stat-particles');
        const elGeom = document.getElementById('stat-geometries');

        if (elFps) elFps.innerText = this.fps;
        if (elMs) elMs.innerText = `${this.frameTime}ms`;
        if (elObjects && scene) elObjects.innerText = scene.children.length;
        if (elRocks) elRocks.innerText = rockCount.toLocaleString();

        if (renderer && renderer.info) {
            if (elCalls) elCalls.innerText = renderer.info.render.calls;
            if (elTris) elTris.innerText = renderer.info.render.triangles.toLocaleString();
            if (elGeom) elGeom.innerText = renderer.info.memory.geometries;
        }

        if (elParticles) elParticles.innerText = activeParticleCount;
    }
}
