"""Sound-effect library for 《凌晨三点的 Bug》.
All recordings are CC0 (freesound.org / kenney.nl) — see CREDITS.md.
Prepared clips ship in production/audio/clips/ (mono FLAC, 48 kHz). Clips reused from "After the Laptop
Closes" (small-claude) are already prepared; new ones are cut from production/sfx_candidates/ on first use
and saved next to them, so the mix never needs the network."""
import os, subprocess
import numpy as np
import soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, 'clips')
CAND = os.path.join(HERE, '..', 'sfx_candidates')

# new clips: id → (source, start, end, fade_in, fade_out)
NEW = {
    'birds':      ('dawn_chorus/611453.mp3', 2.0, 52.0, 1.0, 1.0),
    'rewind':     ('cassette_tape_rewind/372876.mp3', 0.26, 2.85, 0.02, 0.25),
    'jar_close':  ('glass_jar_lid/829781.mp3', 1.82, 2.55, 0.003, 0.15),
    'lid_off':    ('glass_jar_lid/435000.mp3', 0.0, 0.6, 0.002, 0.15),
    'clink1':     ('glass_jar_clink/565725.mp3', 0.60, 1.4, 0.002, 0.2),
    'clink2':     ('glass_jar_clink/565725.mp3', 10.36, 11.1, 0.002, 0.2),
    'clink3':     ('glass_jar_clink/565725.mp3', 24.26, 25.0, 0.002, 0.2),
    'knuckle':    ('knuckle_crack/389178.mp3', 0.29, 0.56, 0.001, 0.08),
    'knuckle2':   ('knuckle_crack/477640.mp3', 0.0, 0.2, 0.001, 0.06),
}
BEDS = {'room', 'room_lit', 'crickets', 'city_night', 'typing', 'clock', 'birds', 'rewind', 'rewind2'}

def _load(src):
    fn = os.path.join(CAND, src)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', fn, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def _prepare(name):
    src, a, b, fi, fo = NEW[name]
    x = _load(src)
    x = x[int(a * SR):int(min(b, len(x) / SR) * SR)]
    x = x - np.mean(x)
    n_in, n_out = int(fi * SR), int(fo * SR)
    if n_in > 0: x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out > 0: x[-n_out:] *= np.linspace(1, 0, n_out)
    if name in BEDS:
        x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.1      # beds: −20 dBFS RMS, gain set in the mix
    else:
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.89            # one-shots: peak −1 dBFS
    return x.astype(np.float32)

_mem = {}
def get(name):
    if name in _mem: return _mem[name]
    fn = os.path.join(CLIPS, name + '.flac')
    if not os.path.exists(fn):
        if name not in NEW: raise FileNotFoundError(name)
        os.makedirs(CLIPS, exist_ok=True)
        sf.write(fn, _prepare(name), SR, subtype='PCM_16')
    x, sr = sf.read(fn, dtype='float32')
    if x.ndim > 1: x = x.mean(axis=1)
    assert sr == SR
    _mem[name] = x
    return x

if __name__ == '__main__':
    for k in NEW: get(k)
    for f in sorted(os.listdir(CLIPS)):
        x = get(f[:-5])
        print(f'{f[:-5]:12s} {len(x)/SR:6.2f}s  peak={20*np.log10(np.max(np.abs(x))+1e-9):6.1f}dB  rms={20*np.log10(np.sqrt(np.mean(x**2))+1e-9):6.1f}dB')
