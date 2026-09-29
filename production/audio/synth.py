"""Synthesized sounds: the little friend's voice and footsteps, the bug's skitter and chitter, and everything
that only exists inside the code world (glitches, the searchlight, the lantern, the gates, the error buzz…)."""
import numpy as np
from scipy import signal

SR = 48000

def rng(seed): return np.random.default_rng(seed)
def tt(dur): return np.arange(int(dur * SR)) / SR

def env(n, a=0.005, d=0.1, sustain=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    return e * (1 - sustain) + sustain

def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)
def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def norm(x, peak=0.89):
    return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)
def fade(x, fi=0.005, fo=0.02):
    x = x.copy(); a, b = int(fi * SR), int(fo * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x
def crush(x, bits=5, hold=6):
    """bit-crush + sample-hold: the 'digital' colour of the code world"""
    y = np.repeat(x[::hold], hold)[:len(x)]
    q = 2 ** bits
    return np.round(y * q) / q

# ------------------------------------------------------------------ the little friend
def tap(seed=0, bright=1.0):
    """tiny footstep of a small creature: a soft click with a woody body"""
    r = rng(seed); n = int(0.06 * SR)
    x = bandpass(r.standard_normal(n), 1800 * bright, 6500 * bright) * env(n, 0.001, 0.008)
    f = 900 * bright * (1 + 0.15 * r.random())
    x += 0.6 * np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.001, 0.012)
    return norm(x)

VOICE = {
    'q':      [(0.16, 560, 820)],
    'ex':     [(0.07, 900, 1500)],
    'yay':    [(0.09, 700, 950), (0.14, 950, 1250)],
    'uh':     [(0.12, 700, 480)],
    'effort': [(0.35, 420, 520)],
    'hup':    [(0.08, 600, 900)],
    'phew':   [(0.3, 800, 420)],
    'hmph':   [(0.08, 520, 420), (0.12, 480, 330)],
    'giggle': [(0.05, 900, 1100), (0.05, 850, 1050), (0.05, 800, 1000)],
    'aww':    [(0.35, 600, 760)],
    'eep':    [(0.1, 1200, 1800)],
    'ow':     [(0.18, 1000, 520)],
    'wow':    [(0.12, 500, 800), (0.3, 800, 620)],
    'mm':     [(0.4, 520, 470)],
    'yawn':   [(0.5, 700, 380)],
}
def voice(kind, seed=0):
    """cute chirps — a small creature, not words"""
    r = rng(seed); parts = []
    for dur, f0, f1 in VOICE[kind]:
        n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
        f = f0 + (f1 - f0) * (k if kind != 'q' else k ** 2)
        vib = 1 + 0.03 * np.sin(2 * np.pi * 11 * t)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
        if kind == 'effort': x = np.tanh(3 * x) + 0.04 * r.standard_normal(n)
        if kind in ('yawn', 'mm'): x = x * (0.6 + 0.4 * np.sin(np.pi * k)) + 0.05 * r.standard_normal(n)
        a = min(0.012, dur * 0.2)
        e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / (dur * 0.35))
        parts.append(bandpass(x * e, 350, 5000)); parts.append(np.zeros(int(0.025 * SR)))
    return norm(np.concatenate(parts), 0.8)

def boop(f=700, dur=0.09):
    """the little friend's typing: tiny rounded key taps"""
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) * env(len(t), 0.002, 0.03) + 0.3 * bandpass(rng(int(f)).standard_normal(len(t)), 2000, 7000) * env(len(t), 0.001, 0.006)
    return norm(x, 0.6)

# ------------------------------------------------------------------ the bug
def skitter(dur, rate=26, seed=3):
    """six tiny legs on hard glyphs"""
    r = rng(seed); n = int(dur * SR); x = np.zeros(n)
    t = 0.0
    while t < dur - 0.02:
        i = int(t * SR); m = int(0.012 * SR)
        click = bandpass(r.standard_normal(m), 3000, 11000) * env(m, 0.0005, 0.002)
        x[i:i + m] += click[:max(0, min(m, n - i))] * (0.5 + 0.5 * r.random())
        t += (1 / rate) * (0.7 + 0.6 * r.random())
    return norm(fade(x, 0.01, 0.05), 0.7)

def chitter(seed=0, n_=5, f0=2200):
    """the bug laughing at you: quick, high, nasal"""
    r = rng(seed); parts = []
    for i in range(n_):
        d = 0.035 + 0.02 * r.random(); t = tt(d)
        f = f0 * (1 + 0.1 * r.standard_normal()) * (1 - 0.3 * t / d)
        ph = 2 * np.pi * np.cumsum(f) / SR
        x = (np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph)) * np.sin(np.pi * t / d)
        parts += [x, np.zeros(int((0.02 + 0.03 * r.random()) * SR))]
    return norm(bandpass(np.concatenate(parts), 900, 9000), 0.6)

def squeak(f0=1400, f1=2200, dur=0.12):
    t = tt(dur); f = np.linspace(f0, f1, len(t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur), 0.5)

def shimmer(dur=0.6, up=True, seed=5):
    """a disguise: a quick sparkle of detuned sines"""
    r = rng(seed); t = tt(dur); x = np.zeros(len(t))
    for i in range(7):
        f = (1200 + 300 * i) * (1 if up else 1.6 - 0.1 * i) * (1 + 0.01 * r.standard_normal())
        t0 = i * dur / 12
        m = t >= t0; u = t[m] - t0
        x[m] += np.sin(2 * np.pi * f * u) * np.exp(-u / 0.12) * np.minimum(1, u / 0.003)
    return norm(x, 0.5)

# ------------------------------------------------------------------ the code world
def cw_drone(dur, seed=1):
    """the hum of the code world: soft digital air, a low fifth, a slow shimmer"""
    r = rng(seed); t = tt(dur)
    x = 0.5 * np.sin(2 * np.pi * 55 * t) + 0.35 * np.sin(2 * np.pi * 82.5 * t + 0.3) + 0.12 * np.sin(2 * np.pi * 220.4 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t))
    air = bandpass(r.standard_normal(len(t)), 2000, 9000) * 0.04 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1))
    # sparse data twinkles
    tw = np.zeros(len(t))
    for i in range(int(dur * 1.6)):
        t0 = r.random() * dur; f = r.choice([1760, 2093, 2349, 2637, 3136])
        m = (t >= t0) & (t < t0 + 0.3); u = t[m] - t0
        tw[m] += np.sin(2 * np.pi * f * u) * np.exp(-u / 0.08) * 0.05
    return norm(x * 0.35 + air + tw, 0.5)

def fan_hum(dur):
    """his computer and the monitor: a low whirr"""
    t = tt(dur); r = rng(9)
    x = bandpass(r.standard_normal(len(t)), 120, 900) * 0.4 + 0.15 * np.sin(2 * np.pi * 120 * t) + 0.05 * np.sin(2 * np.pi * 240 * t)
    return norm(x, 0.5)

def glitch(dur=0.25, seed=0):
    """a digital tear: bit-crushed noise and a broken tone"""
    r = rng(seed); t = tt(dur)
    f = r.choice([180, 330, 740, 1200])
    x = np.sign(np.sin(2 * np.pi * f * t * (1 + 3 * t))) * 0.5 + r.standard_normal(len(t)) * 0.6
    x = crush(x, 3, int(4 + 10 * r.random()))
    gate = (np.floor(t * (30 + 40 * r.random())) % 2) > 0
    return norm(fade(x * (0.4 + 0.6 * gate), 0.002, 0.03), 0.7)

def splash(seed=4):
    """the little friend dives into the text: a watery plop, but made of bits"""
    r = rng(seed); t = tt(1.0)
    f = 900 * np.exp(-t * 5) + 220
    blub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    spray = bandpass(r.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 4) * 0.5
    x = crush(blub + spray, 5, 3)
    return norm(fade(x, 0.002, 0.2), 0.8)

def riser(dur=0.8, f0=200, f1=2400, seed=2):
    """falling through the screen: a pixelated sweep"""
    r = rng(seed); t = tt(dur); k = t / dur
    f = f0 * (f1 / f0) ** k
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + bandpass(r.standard_normal(len(t)), 1000, 8000) * 0.4 * k
    x = crush(x, 4, 5) * np.minimum(1, k * 3) * np.minimum(1, (1 - k) * 8 + 0.3)
    return norm(x, 0.7)

def spot_on():
    """a big searchlight switching on: a clunk and a rising electric hum"""
    t = tt(1.2); r = rng(11)
    clunk = lowpass(r.standard_normal(len(t)), 900) * np.exp(-t * 30)
    hum = (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 220 * t) + 0.3 * np.sin(2 * np.pi * 330 * t)) * np.minimum(1, t / 0.4) * np.exp(-np.maximum(0, t - 0.6) * 3) * 0.3
    return norm(clunk + hum, 0.8)

def light_hum(dur):
    t = tt(dur)
    x = (np.sin(2 * np.pi * 110 * t) + 0.4 * np.sin(2 * np.pi * 220.6 * t) + 0.2 * np.sin(2 * np.pi * 330 * t)) * (0.85 + 0.15 * np.sin(2 * np.pi * 3 * t))
    return norm(fade(lowpass(x, 800), 0.3, 0.4), 0.4)

def bell(f=1318.5, dur=2.0, bright=1.0):
    """a small warm bell (the lantern, the idea, the green)"""
    t = tt(dur); x = np.zeros(len(t))
    for mult, amp, dec in [(1, 1, 0.9), (2.76, 0.4 * bright, 0.35), (5.4, 0.2 * bright, 0.15), (0.5, 0.3, 1.2)]:
        x += amp * np.sin(2 * np.pi * f * mult * t) * np.exp(-t / dec)
    return norm(x * np.minimum(1, t / 0.002), 0.6)

def error_buzz(dur=0.3, f=110, seed=0):
    """an angry error: two detuned square buzzes"""
    t = tt(dur)
    x = np.sign(np.sin(2 * np.pi * f * t)) + np.sign(np.sin(2 * np.pi * f * 1.06 * t))
    x = lowpass(x, 2500) * np.minimum(1, t / 0.005) * np.minimum(1, (dur - t) / 0.04)
    return norm(x, 0.5)

def clang(seed=0, f0=220):
    """a gate slamming shut: inharmonic metal + a thud"""
    r = rng(seed); t = tt(2.2); x = np.zeros(len(t))
    for mult, amp, dec in [(1, 1, 0.9), (1.52, 0.7, 0.6), (2.43, 0.5, 0.4), (3.87, 0.35, 0.25), (5.1, 0.25, 0.15)]:
        x += amp * np.sin(2 * np.pi * f0 * mult * (1 + 0.003 * r.standard_normal()) * t) * np.exp(-t / dec)
    thud = lowpass(r.standard_normal(len(t)), 300) * np.exp(-t * 18) * 2
    return norm((x + thud) * np.minimum(1, t / 0.001), 0.85)

def rumble(dur=1.6, seed=3):
    r = rng(seed); t = tt(dur)
    x = lowpass(r.standard_normal(len(t)), 160, 4) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.5)
    return norm(x, 0.9)

# F major pentatonic (F G A C D), in semitones from A4, over a wide range
PENTA_F = [o * 12 + d for o in range(-2, 5) for d in (-4, -2, 0, 3, 5)]

def sparkle(dur=1.0, seed=8, n=9, f_lo=2000, f_hi=5000):
    r = rng(seed); t = tt(dur); x = np.zeros(len(t))
    for i in range(n):
        t0 = r.random() * dur * 0.7; f = f_lo + r.random() * (f_hi - f_lo)
        f = 440 * 2 ** (min(PENTA_F, key=lambda q: abs(q - 12 * np.log2(f / 440))) / 12)   # in key with the score
        m = t >= t0; u = t[m] - t0
        x[m] += np.sin(2 * np.pi * f * u) * np.exp(-u / 0.06) * (0.5 + 0.5 * r.random())
    return norm(x, 0.5)

def success(seed=0):
    """all green: a rising arpeggio of bells"""
    t = tt(2.6); x = np.zeros(len(t))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5]):
        t0 = i * 0.09; m = t >= t0; u = t[m] - t0
        x[m] += (np.sin(2 * np.pi * f * u) + 0.3 * np.sin(2 * np.pi * 2 * f * u)) * np.exp(-u / 0.9) * np.minimum(1, u / 0.003)
    return norm(x, 0.7)

def tape_stop(dur=0.5):
    """time grinding to a halt before it runs backwards"""
    t = tt(dur); f = 300 * (1 - t / dur) ** 2 + 20
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (1 - t / dur)
    return norm(lowpass(x, 1800), 0.6)

def ui_tick(f=2400):
    t = tt(0.03)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 200), 0.4)

def breath(dur=1.2, inhale=True, seed=0):
    """a soft human breath (filtered noise), no voice"""
    r = rng(seed); t = tt(dur); k = t / dur
    e = np.sin(np.pi * k) ** (0.8 if inhale else 1.4)
    x = bandpass(r.standard_normal(len(t)), 500 if inhale else 350, 3500 if inhale else 2200) * e
    return norm(x, 0.5)

def heartbeat(n=6, bpm=80):
    beat = 60 / bpm; t = tt(n * beat + 0.4); x = np.zeros(len(t))
    for i in range(n):
        for off, a in ((0, 1), (0.16, 0.6)):
            t0 = i * beat + off; m = t >= t0; u = t[m] - t0
            x[m] += a * np.sin(2 * np.pi * 55 * u) * np.exp(-u * 22)
    return norm(lowpass(x, 200), 0.8)

def soft_error(f0=520, seed=0):
    """a failed test, said gently: two soft round blips stepping down (no buzz, no alarm)"""
    out = []
    for k, f in enumerate((f0, f0 * 0.75)):
        t = tt(0.14)
        x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
        out += [x * np.minimum(1, t / 0.006) * np.exp(-t * 18), np.zeros(int(0.03 * SR))]
    return norm(lowpass(np.concatenate(out), 2500), 0.6)
