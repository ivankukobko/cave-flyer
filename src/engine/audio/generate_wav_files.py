import math
import random
import struct
import wave
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '../../../assets/sounds')
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLE_RATE = 44100

def write_wav(filename, samples):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with wave.open(filepath, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2) # 16-bit PCM
        f.setframerate(SAMPLE_RATE)
        for s in samples:
            val = max(-32767, min(32767, int(s * 32767)))
            f.writeframes(struct.pack('<h', val))

# 1. Smooth 3.8s Long Tail Explosion WAV (explosion.wav)
exp_samples = []
duration = 3.8
num_samples = int(SAMPLE_RATE * duration)
sample_hold = 0
for i in range(num_samples):
    t = i / SAMPLE_RATE
    thud_env = math.exp(-t * 6.0)
    thud = math.sin(2 * math.pi * (90 * math.exp(-t * 4.5)) * t) * thud_env * 0.9
    
    if i % 6 == 0:
        sample_hold = (random.random() * 2 - 1)
    noise_env = math.exp(-t * 1.25)
    noise = sample_hold * noise_env * 0.45

    exp_samples.append(thud + noise)

write_wav('explosion.wav', exp_samples)

# 2. Granular Textured 3.8s Explosion WAV (explosion_textured.wav)
exp_tex_samples = []
sample_hold = 0
for i in range(num_samples):
    t = i / SAMPLE_RATE
    thud_env = math.exp(-t * 6.0)
    thud = math.sin(2 * math.pi * (90 * math.exp(-t * 4.5)) * t) * thud_env * 0.9
    
    if i % 6 == 0:
        sample_hold = (random.random() * 2 - 1)
    crackle = (random.random() * 2 - 1) * 1.5 if random.random() > 0.95 else 0
    noise_env = math.exp(-t * 1.25)
    noise = (sample_hold * 0.7 + crackle * 0.3) * noise_env * 0.45

    exp_tex_samples.append(thud + noise)

write_wav('explosion_textured.wav', exp_tex_samples)

# 3. Generate Warm Jet Engine Hum WAV (1.0 second)
thrust_samples = []
duration = 1.0
num_samples = int(SAMPLE_RATE * duration)
for i in range(num_samples):
    t = i / SAMPLE_RATE
    hum = math.sin(2 * math.pi * 110 * t) * 0.3
    noise = (random.random() * 2 - 1) * 0.35
    thrust_samples.append(hum + noise)

write_wav('thrust.wav', thrust_samples)

# 4. Generate Triumphant Victory Fanfare WAV (5 notes)
victory_samples = []
freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]
for idx, f in enumerate(freqs):
    note_dur = 0.25 if idx == len(freqs)-1 else 0.12
    note_len = int(SAMPLE_RATE * note_dur)
    for i in range(note_len):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 5.0)
        s = math.sin(2 * math.pi * f * t) * env * 0.45
        victory_samples.append(s)

write_wav('victory.wav', victory_samples)

# 5. Generate Crisp UI Click WAV (30ms click)
click_samples = []
num_samples = int(SAMPLE_RATE * 0.03)
for i in range(num_samples):
    t = i / SAMPLE_RATE
    env = math.exp(-t * 120.0)
    freq = 1400 + (2200 - 1400) * (i / num_samples)
    s = math.sin(2 * math.pi * freq * t) * env * 0.4
    click_samples.append(s)

write_wav('click.wav', click_samples)

print(f"Successfully generated explosion.wav and explosion_textured.wav in {OUTPUT_DIR}")
