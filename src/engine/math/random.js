// Mulberry32 Seeded Pseudo-Random Number Generator
let randFunc = Math.random;
export let currentSeed = 0;

export function setSeed(seed) {
    currentSeed = seed;
    randFunc = mulberry32(seed);
}

export function random() {
    return randFunc();
}

function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
