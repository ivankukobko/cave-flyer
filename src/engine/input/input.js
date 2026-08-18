import { ensureAudioContext } from '../audio/sound.js';

export const input = { left: false, right: false };

export function initInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
    });

    // Active Pointer Tracking (Handles Pointer Events + Touch Events for iOS/Safari/Android/Desktop)
    const activePointers = new Map();

    const processActiveInputs = () => {
        input.left = false;
        input.right = false;
        for (const clientX of activePointers.values()) {
            if (clientX < window.innerWidth / 2) input.left = true;
            else input.right = true;
        }
    };

    const handlePointer = (e) => {
        ensureAudioContext(); // Unlock Web Audio API on iOS Safari gesture

        // Ignore touches on UI buttons / overlays
        if (e.target.closest('.overlay') || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            activePointers.clear();
            input.left = false;
            input.right = false;
            return;
        }

        if (e.type === 'pointerdown' || e.type === 'pointermove') {
            activePointers.set(e.pointerId, e.clientX);
        } else if (e.type === 'pointerup' || e.type === 'pointercancel' || e.type === 'pointerleave') {
            activePointers.delete(e.pointerId);
        }
        processActiveInputs();
    };

    // Fallback for Touch Events on iOS Safari
    const handleTouch = (e) => {
        ensureAudioContext(); // Unlock Web Audio API on iOS gesture

        if (e.target.closest('.overlay') || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            input.left = false;
            input.right = false;
            return;
        }

        if (e.cancelable) e.preventDefault();

        input.left = false;
        input.right = false;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].clientX < window.innerWidth / 2) input.left = true;
            else input.right = true;
        }
    };

    // Attach to window and document.body for iOS iframe coverage
    const targets = [window, document.body];
    targets.forEach((target) => {
        if (!target) return;
        if (window.PointerEvent) {
            target.addEventListener('pointerdown', handlePointer);
            target.addEventListener('pointermove', handlePointer);
            target.addEventListener('pointerup', handlePointer);
            target.addEventListener('pointercancel', handlePointer);
        }
        target.addEventListener('touchstart', handleTouch, { passive: false });
        target.addEventListener('touchmove', handleTouch, { passive: false });
        target.addEventListener('touchend', handleTouch, { passive: false });
        target.addEventListener('touchcancel', handleTouch, { passive: false });
    });
}
