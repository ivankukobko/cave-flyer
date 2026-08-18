// Web Audio API Sound Synthesizer & Audio Engine
let audioCtx = null;
let thrustGain = null;
let thrustFilter = null;

export function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    audioCtx = new AudioContext();

    // Pure Filtered Noise for Jet Engine
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    thrustFilter = audioCtx.createBiquadFilter();
    thrustFilter.type = 'lowpass';
    thrustFilter.frequency.value = 220; // Warm idle hum

    thrustGain = audioCtx.createGain();
    thrustGain.gain.value = 0;

    whiteNoise.connect(thrustFilter);
    thrustFilter.connect(thrustGain);
    thrustGain.connect(audioCtx.destination);

    whiteNoise.start();

    attachUIClickListeners();
}

export function ensureAudioContext() {
    if (!audioCtx) {
        initAudio();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function updateThrusterSound(isThrusting) {
    if (!audioCtx || !thrustGain) return;
    const now = audioCtx.currentTime;
    if (isThrusting) {
        thrustGain.gain.setTargetAtTime(0.24, now, 0.04);
        thrustFilter.frequency.setTargetAtTime(420, now, 0.04);
    } else {
        thrustGain.gain.setTargetAtTime(0.0, now, 0.08);
    }
}

export function stopThrusterSound() {
    if (!audioCtx || !thrustGain) return;
    const now = audioCtx.currentTime;
    thrustGain.gain.cancelScheduledValues(now);
    thrustGain.gain.setValueAtTime(0, now);
}

// Smooth Long-Tail Explosion
export function playExplosionSound() {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    // 1. "TD-" Ultra Deep Sub-Bass Thud Impact (90Hz -> 10Hz)
    const thudOsc = audioCtx.createOscillator();
    const thudGain = audioCtx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(90, now);
    thudOsc.frequency.exponentialRampToValueAtTime(10, now + 0.6);

    thudGain.gain.setValueAtTime(1.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    thudOsc.connect(thudGain);
    thudGain.connect(audioCtx.destination);

    thudOsc.start(now);
    thudOsc.stop(now + 0.65);

    // 2. Smooth "-SH-HHHH..." Long Cavern Tail (3.8s)
    const tailDuration = 3.8;
    const bufferSize = Math.floor(audioCtx.sampleRate * tailDuration);
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let sampleHold = 0;
    for (let i = 0; i < bufferSize; i++) {
        if (i % 6 === 0) {
            sampleHold = (Math.random() * 2 - 1);
        }
        const env = Math.exp(-i / (audioCtx.sampleRate * 0.95));
        output[i] = sampleHold * env;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, now);
    filter.frequency.exponentialRampToValueAtTime(30, now + tailDuration);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.95, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + tailDuration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start(now);
}

// Textured "SH-H-H" Granular Crackle Explosion
export function playExplosionTexturedSound() {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    // 1. "TD-" Sub-Bass Thud Impact
    const thudOsc = audioCtx.createOscillator();
    const thudGain = audioCtx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(90, now);
    thudOsc.frequency.exponentialRampToValueAtTime(10, now + 0.6);

    thudGain.gain.setValueAtTime(1.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    thudOsc.connect(thudGain);
    thudGain.connect(audioCtx.destination);

    thudOsc.start(now);
    thudOsc.stop(now + 0.65);

    // 2. Granular Textured Crackle Tail (3.8s)
    const tailDuration = 3.8;
    const bufferSize = Math.floor(audioCtx.sampleRate * tailDuration);
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let sampleHold = 0;
    for (let i = 0; i < bufferSize; i++) {
        if (i % 6 === 0) {
            sampleHold = (Math.random() * 2 - 1);
        }
        // Granular crackle texture pops
        const crackle = Math.random() > 0.95 ? (Math.random() * 2 - 1) * 1.6 : 0;
        const env = Math.exp(-i / (audioCtx.sampleRate * 0.95));
        output[i] = (sampleHold * 0.7 + crackle * 0.3) * env;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(35, now + tailDuration);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.95, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + tailDuration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start(now);
}

export function playVictorySound() {
    ensureAudioContext();
    if (!audioCtx) return;

    // Triumphant 5-note ascension: C5, E5, G5, C6, E6
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
        const now = audioCtx.currentTime + idx * 0.10;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const duration = idx === notes.length - 1 ? 0.6 : 0.25;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
    });
}

export function playClickSound() {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
}

export function attachUIClickListeners() {
    document.querySelectorAll('button, select').forEach((btn) => {
        if (!btn.dataset.hasAudioClick) {
            btn.dataset.hasAudioClick = 'true';
            btn.addEventListener('click', () => {
                playClickSound();
            });
        }
    });
}
