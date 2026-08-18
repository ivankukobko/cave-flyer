export class PhysicsWorld {
    constructor() {
        this.gravity = -5.0; // Units per second squared
        this.thrustForce = 15.0;
        this.torqueForce = 3.0;
        this.drag = 0.5; // Linear drag
        this.angularDrag = 2.0;

        this.player = {
            x: 0,
            y: 5,
            vx: 0,
            vy: 0,
            angle: 0, // 0 is pointing straight UP
            angularVelocity: 0,
            radius: 0.4
        };
    }

    reset(x, y) {
        this.player.x = x;
        this.player.y = y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.angle = 0;
        this.player.angularVelocity = 0;
    }

    update(dt, input) {
        let thrustX = 0;
        let thrustY = 0;
        
        const forceY = this.thrustForce * 0.8;
        const forceX = this.thrustForce * 0.6;

        if (input.left && input.right) {
            // Both thrusters - straight up
            thrustY = this.thrustForce * 1.2;
            thrustX = 0;
        } else if (input.left) {
            thrustY = forceY;
            thrustX = -forceX;
        } else if (input.right) {
            thrustY = forceY;
            thrustX = forceX;
        }

        this.player.angle = 0;
        this.player.angularVelocity = 0;

        // Apply thrust directly to velocity
        this.player.vx += thrustX * dt;
        this.player.vy += thrustY * dt;

        // Apply gravity & drag
        this.player.vy += this.gravity * dt;
        this.player.vx -= this.player.vx * this.drag * dt;
        this.player.vy -= this.player.vy * this.drag * dt;

        // Move
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;
    }

    checkTerrainCollision(terrain) {
        const r = this.player.radius;
        const d = r * 0.707;
        const points = [
            [r, 0], [-r, 0], [0, r], [0, -r],
            [d, d], [-d, d], [d, -d], [-d, -d]
        ];

        for (let pt of points) {
            if (terrain.isSolid(this.player.x + pt[0], this.player.y + pt[1])) {
                return true;
            }
        }
        return false;
    }
}
