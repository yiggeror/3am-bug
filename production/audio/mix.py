"""Sound design + final mix for 《凌晨三点的 Bug》.
Reads production/build/cues.json (exported from the animation: beats, shots, keystrokes, the code world's
choreography) so every sound lands on the frame that causes it. Ambience follows the picture: the room when
we are with him, a muffled room and a digital hum when we are inside the code.
    python3 production/audio/mix.py            → production/build/soundtrack.wav"""
import json, os
import numpy as np
from scipy import signal
import soundfile as sf
import sfxlib, synth as S

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')
DATA = json.load(open(os.path.join(BUILD, 'cues.json')))
T = DATA['T']
DUR = DATA['DURATION'] + 1.0
rng = np.random.default_rng(11)

def db(x): return 10 ** (x / 20)
def resample(x, rate):
    if abs(rate - 1) < 1e-3: return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)
def lp(x, fc):
    b, a = signal.butter(2, fc / (SR / 2), 'low'); return signal.lfilter(b, a, x).astype(np.float32)
def hp(x, fc):
    b, a = signal.butter(2, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x).astype(np.float32)

# ------------------------------------------------------------------ what we are looking at
SHOTS = DATA['shots']
def kind_at(t):
    for s in SHOTS:
        if s['t0'] <= t < s['t1']: return s['kind']
    return 'card'

class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n, np.float32); self.R = np.zeros(self.n, np.float32)
        self.rev = np.zeros(self.n, np.float32)   # small room
        self.big = np.zeros(self.n, np.float32)   # the code world: big, bright, digital space
    def add(self, x, t, g=0.0, pan=0.0, rate=1.0, lpf=None, hpf=None, rev=0.1, big=0.0, maxlen=None, fin=0, fout=0, rev_x=False):
        if isinstance(x, str): x = sfxlib.get(x)
        x = resample(x, rate)
        if maxlen: x = x[:int(maxlen * SR)].copy()
        if fin: m = min(len(x), int(fin * SR)); x = x.copy(); x[:m] *= np.linspace(0, 1, m)
        if fout: m = min(len(x), int(fout * SR)); x = x.copy(); x[-m:] *= np.linspace(1, 0, m)
        if lpf: x = lp(x, lpf)
        if hpf: x = hp(x, hpf)
        if rev_x: x = x[::-1].copy()
        x = x * db(g)
        i = int(t * SR)
        if i >= self.n or i + len(x) <= 0: return
        if i < 0: x = x[-i:]; i = 0
        x = x[:self.n - i]
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        self.L[i:i + len(x)] += x * np.cos(a); self.R[i:i + len(x)] += x * np.sin(a)
        if rev: self.rev[i:i + len(x)] += x * rev
        if big: self.big[i:i + len(x)] += x * big
    def track(self, x, env, pan=0.0, rev=0.0, big=0.0):
        """add a full-length signal with a per-sample gain envelope"""
        n = min(self.n, len(x), len(env)); y = x[:n] * env[:n]
        a = (pan + 1) * np.pi / 4
        self.L[:n] += y * np.cos(a); self.R[:n] += y * np.sin(a)
        if rev: self.rev[:n] += y * rev
        if big: self.big[:n] += y * big

def loop_to(x, n, xf=0.8, offset=0.0):
    out = np.zeros(n, np.float32); k = int(xf * SR)
    pos, src = 0, int(offset * SR) % len(x)
    while pos < n:
        seg = x[src:]; m = min(len(seg), n - pos); s = seg[:m].copy()
        if pos > 0: q = min(k, m); s[:q] *= np.linspace(0, 1, q)
        if pos + m < n: q = min(k, m); s[-q:] *= np.linspace(1, 0, q)
        out[pos:pos + m] += s
        pos += m - (k if pos + m < n else 0); src = 0
    return out

def envelope(fn, ramp=0.06):
    """per-sample gain (linear) from a function of time evaluated per 10 ms, smoothed"""
    ts = np.arange(0, DUR, 0.01)
    g = np.array([fn(t) for t in ts], np.float32)
    k = max(1, int(ramp / 0.01))
    g = np.convolve(np.pad(g, (k, k), mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]
    return np.interp(np.arange(int(DUR * SR)) / SR, ts, g).astype(np.float32)

def room_ir(rt=0.45, n_s=1.2, dark=4500, seed=1):
    n = int(n_s * SR); t = np.arange(n) / SR
    r = np.random.default_rng(seed); decay = np.exp(-6.9 * t / rt)
    L = lp(r.standard_normal(n).astype(np.float32), dark) * decay
    R = lp(r.standard_normal(n).astype(np.float32), dark) * decay
    L[:int(0.004 * SR)] = 0; R[:int(0.006 * SR)] = 0
    s = np.sqrt(np.sum(L ** 2)) + 1e-9
    return L / s, R / s

M = Mix(DUR)

# how loud the room / the code world is in each kind of shot (dB); None = silent
ROOM_G = {'room': 0, 'keys': -2, 'screen': -5, 'cw': -16, 'card': None}
def room_gain(off=0.0):
    def f(t):
        k = kind_at(t)
        if k == 'card': return 0.0 if t < T['titleEnd'] else 0.0
        return db(ROOM_G[k] + off)
    return f

# ============================================================================ ambience
def ambience():
    n = M.n
    tod = lambda t: np.interp(t, [0, 160, 218, 245, 296], [0, 0.35, 0.68, 0.86, 1.0])
    # room tone with the lamp on, all night
    room = loop_to(sfxlib.get('room_lit'), n, offset=3)
    M.track(room, envelope(room_gain()) * db(-40))
    # the computer: a low fan whirr (closer in the close-ups)
    fan = S.fan_hum(40.0); fan = loop_to(fan, n)
    M.track(fan, envelope(lambda t: db({'room': -46, 'keys': -40, 'screen': -42, 'cw': -60}.get(kind_at(t), -80)) if kind_at(t) != 'card' else 0), pan=0.15)
    # outside: crickets and a distant city at night, birds at dawn (through the window, muffled)
    crick = loop_to(lp(sfxlib.get('crickets'), 3200), n, offset=12)
    M.track(crick, envelope(lambda t: room_gain()(t) * db(-47) * np.clip(1 - (tod(t) - 0.45) / 0.3, 0, 1)), pan=-0.4)
    city = loop_to(lp(sfxlib.get('city_night'), 2500), n, offset=5)
    M.track(city, envelope(lambda t: room_gain()(t) * db(-48) * np.clip(1 - (tod(t) - 0.6) / 0.3, 0, 1)), pan=-0.5)
    birds = loop_to(lp(sfxlib.get('birds'), 5200), n, offset=0)
    M.track(birds, envelope(lambda t: room_gain()(t) * db(-36) * np.clip((tod(t) - 0.62) / 0.3, 0, 1) ** 1.2 * (1.6 if t > T['final'] else 1.0)), pan=-0.45)
    # the clock: only where it is quiet enough to hear it
    clock = sfxlib.get('clock')
    ck = loop_to(clock, n, xf=0.02)
    def clock_g(t):
        k = kind_at(t)
        if k != 'room': return 0.0
        g = -48
        if 160 < t < 178: g = -42                  # the quiet moment
        if 168.3 < t < 169.7: g = -34              # he glances at the clock
        if t > T['sleep']: g = -40
        return db(g)
    M.track(ck, envelope(clock_g), pan=0.3, rev=0.05)
    # inside the code: the hum of the world
    drone = S.cw_drone(30.0); drone = loop_to(drone, n, xf=2.0)
    M.track(drone, envelope(lambda t: db(-30) if kind_at(t) == 'cw' else (db(-50) if kind_at(t) == 'screen' and 66.5 < t < 262 else 0.0), ramp=0.1), big=0.15)

# ============================================================================ keys
KEYS6 = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6']
def key_gain(t, close):
    k = kind_at(t)
    if k == 'keys': return -12 if close else -16
    if k == 'room': return -22
    if k == 'screen': return -26
    if k == 'cw': return None     # handled as distant thunder
    return -30
def keys():
    for e in DATA['keys']:
        t = e['t']; k = kind_at(t)
        clip = {'enter': 'key_hard', 'mod': 'key_tac', 'space': 'key5', 'bs': 'key_tac'}.get(e['kind'], KEYS6[int(rng.integers(6))])
        g = key_gain(t, e['src'] == 'close')
        if g is None:   # inside the code world his keystrokes arrive like distant thunder
            M.add(clip, t, -20, rate=0.45, lpf=500, big=0.5, rev=0); continue
        if e['kind'] == 'enter': g += 4
        M.add(clip, t, g + rng.normal(0, 1.2), pan=0.1 if e['ch'] in 'uiojklnm\n' else -0.1, rate=1 + rng.normal(0, 0.03), rev=0.08)
        if e['kind'] == 'bs' and e.get('hold'):
            M.add('key_tac', t + e['hold'], g - 6, rate=1.15, rev=0.05)   # release
    for s in DATA['strokes']:
        t = s['t']; g = key_gain(t, False)
        if g is None: continue
        M.add(KEYS6[int(rng.integers(6))], t, g - 3 + 20 * np.log10(max(0.1, s['gain'])) + rng.normal(0, 1.5), pan=rng.uniform(-0.2, 0.2), rate=1 + rng.normal(0, 0.04), rev=0.08)

# ============================================================================ the code world's own sounds
def pan_cw(t): return 0.0
def code_world():
    cw_g = lambda t: 0 if kind_at(t) == 'cw' else (-14 if kind_at(t) == 'screen' else None)
    for c in DATA['cw']:
        t = c['t']; g0 = cw_g(t)
        if g0 is None: continue
        ty = c['type']
        if ty == 'cube_land':
            M.add('soft_land1' if c['v'] < 1 else 'soft_heavy', t, g0 - 20 + 6 * min(1.5, c['v']), rate=1.35, big=0.25)
        elif ty == 'cube_jump':
            M.add('whoosh2', t, g0 - 26, rate=1.4, big=0.2); M.add(S.voice('hup', int(t * 10)), t, g0 - 32, big=0.2)
        elif ty == 'bug_land':
            M.add(S.tap(int(t * 7), 1.6), t, g0 - 30, big=0.2)
        elif ty == 'bug_jump':
            M.add(S.squeak(1800, 2600, 0.08), t, g0 - 30, big=0.2)
        elif ty == 'bug_skitter':
            M.add(S.skitter(c['dur'], 28, int(t * 3)), t, g0 - 26, big=0.25, pan=0.1)
    for i, t in enumerate(DATA['cubeSteps'][::2]):
        g0 = cw_g(t)
        if g0 is None: continue
        sneak = 104 < t < 106.6 or 200.6 < t < 202.6
        M.add(S.tap(i, 1.1 + 0.1 * (i % 3)), t, g0 + (-40 if sneak else -31), big=0.15)

# ============================================================================ scene by scene
def ev(t, x, g, **k):
    M.add(x, t, g, **k)

def title():
    for i in range(1, 10): ev(0.8 + i * 1.5 / 9, KEYS6[i % 6], -24, rate=1.05, rev=0.2)
    ev(3.0, 'whoosh2', -28, rate=1.3); ev(3.55, 'soft_land1', -24, rate=1.5); ev(3.56, S.voice('hup', 1), -30)
    ev(4.3, S.voice('giggle', 2), -30)

def s1_night():
    # the scratch
    scr = lambda d, seed: S.bandpass(np.random.default_rng(seed).standard_normal(int(d * SR)), 1500, 6000) * np.abs(np.sin(2 * np.pi * 2.07 * np.arange(int(d * SR)) / SR))
    ev(9.9, 'cloth_k', -34); ev(10.0, S.norm(scr(1.6, 1), 0.5), -34, rev=0.05)
    ev(17.4, S.soft_error(520, 1), -34, pan=0.2)                               # red again (a soft blip, not an alarm)
    ev(17.45, S.voice('eep', 3), -38, lpf=3000, pan=0.3)                         # the little friend flinches (on screen)
    ev(18.45, 'sigh', -30, rate=0.95)
    ev(23.72, S.soft_error(480, 2), -30)
    ev(23.75, S.voice('eep', 4), -32)
    # hands into his hair
    ev(28.4, 'cloth', -32, maxlen=0.6, fout=0.2); ev(28.95, 'cloth_k', -28); ev(28.95, S.norm(scr(1.6, 2), 0.5), -32)
    ev(30.9, 'cloth', -34, maxlen=0.5, fout=0.2); ev(31.3, S.breath(1.1, False, 3), -30)
    ev(32.7, 'cloth_k', -34, rate=0.9)
    # the little friend, worried
    ev(33.55, S.voice('uh', 5), -26); ev(33.8, S.bell(2637, 0.6, 0.3), -38)
    # rubbing his eyes, the big sigh
    ev(37.3, 'cloth', -34, maxlen=0.6, fout=0.2); ev(37.8, S.norm(S.lowpass(scr(1.4, 3), 2500), 0.4), -36)
    ev(40.4, S.breath(0.9, True, 4), -28); ev(41.45, 'sigh', -22, rate=0.9); ev(41.6, 'chair', -32, rate=0.85)
    # the slow fall onto the keyboard
    ev(47.2, 'chair', -34, rate=0.8); ev(49.65, 'cloth_k', -32, rate=0.85)
    ev(T['headDown'], 'soft_land2', -22, rate=0.6, lpf=1200)
    for i, dt in enumerate([0.0, 0.02, 0.05, 0.07]): ev(T['headDown'] + dt, KEYS6[i], -22, rate=0.9)
    ev(53.5, S.voice('q', 6), -24)

def s2_dive():
    ev(59.8, S.voice('mm', 7), -30); ev(60.8, S.voice('phew', 8), -32)
    ev(61.3, S.voice('hup', 9), -24)
    # march along the prompt line
    x0, x1, a, b = 1800, 1236, 61.7, 63.4
    prev = 0
    for i in range(400):
        t = a + (b - a) * i / 399; u = (t - a) / (b - a); e = 2 * u * u if u < 0.5 else 1 - 2 * (1 - u) ** 2
        ph = int(((x0 - (x0 + (x1 - x0) * e)) / (74 * 0.34)))
        if ph != prev: ev(t, S.tap(i, 1.3), -30); prev = ph
    ev(63.6, S.voice('mm', 10), -32)
    ev(64.0, S.voice('yay', 11), -22); ev(64.02, 'whoosh', -24, rate=0.9)
    ev(64.9, S.splash(), -16); ev(64.92, 'whoosh2', -26, rate=0.7)
    ev(65.75, S.riser(0.7), -18)
    ev(66.55, 'slide_b', -24, maxlen=0.85, fout=0.2, big=0.3)
    ev(67.4, 'boing', -30, rate=1.3, big=0.2)
    ev(68.3, S.voice('wow', 12), -22, big=0.35)
    ev(73.4, 'pop', -24, rate=1.5, big=0.2); ev(73.45, S.shimmer(0.5, True, 1), -30, big=0.3)
    ev(73.95, S.voice('ex', 13), -22, big=0.3)
    ev(74.75, S.chitter(1, 6), -24, big=0.3); ev(75.5, S.chitter(2, 5, 2400), -26, big=0.3)
    ev(76.45, S.voice('hmph', 14), -24, big=0.3)
    ev(78.6, S.voice('hup', 15), -24, big=0.3); ev(78.6, 'whoosh', -26, rate=1.2)

def s3_together():
    for g in DATA['glitches']:
        ev(g['t'], S.glitch(0.12 + 0.1 * g['k'], int(g['t'] * 10)), -34 + 6 * g['k'], pan=0.35, lpf=5000)
    ev(85.21, 'creak', -20, rate=0.9); ev(85.2, 'cloth_k', -24); ev(85.18, S.breath(0.35, True, 5), -24)
    ev(89.5, S.skitter(0.8, 30, 4), -44, pan=-0.2); ev(91.0, S.skitter(1.6, 30, 5), -38)
    ev(91.2, S.chitter(3, 3, 2600), -40); ev(92.0, S.voice('hmph', 16), -40)
    ev(94.15, 'cloth', -34, maxlen=0.5, fout=0.2); ev(95.4, 'chair', -36, rate=1.1)
    ev(97.45, 'knuckle', -22); ev(97.6, 'knuckle2', -24)
    ev(100.02, S.spot_on(), -18, big=0.3)
    M.track(np.concatenate([np.zeros(int(100.3 * SR), np.float32), S.light_hum(7.3)]), envelope(lambda t: db(-30) if kind_at(t) == 'cw' else db(-44)), big=0.2)
    ev(103.0, S.bell(3136, 0.8, 0.5), -28, big=0.3); ev(103.2, S.voice('ex', 17), -24, big=0.3)
    ev(106.2, S.skitter(0.7, 50, 6), -40, big=0.2)
    ev(107.1, S.voice('effort', 18), -22, big=0.3); ev(107.12, 'whoosh', -22)
    ev(107.2, S.squeak(1500, 2800, 0.1), -24, big=0.3); ev(107.5, S.chitter(4, 4), -28, big=0.3)
    ev(107.55, 'punch', -20, rate=1.2, big=0.3); ev(107.9, S.voice('ow', 19), -28, big=0.3)
    ev(109.75, S.voice('q', 20), -28, big=0.3)
    for k in range(4): ev(112.35 + k * 0.175, S.tap(k, 0.8), -42)
    ev(117.0, S.bell(1318.5, 2.4), -20, big=0.4); ev(117.5, 'pop', -28, rate=1.6, big=0.2)
    ev(117.4, S.sparkle(2.4, 3, 18, 3000, 6000), -34, big=0.3)
    ev(123.6, S.voice('q', 21), -30, big=0.3); ev(126.8, S.voice('q', 22), -30, big=0.3)
    # backspace held: characters disappear one by one
    for k in range(1, 4): ev(131.4 + k * 3.2 / 3, S.ui_tick(1800), -30)
    ev(134.6, S.rumble(1.8), -17, big=0.3); ev(134.65, 'creak', -20, rate=0.5, big=0.4); ev(135.0, 'soft_heavy', -18, rate=0.8, big=0.4)
    rain = Mix(8.0)                         # the error rain, kept apart so Ctrl+Z can play it backwards
    for b in DATA['blocks']:
        dt = b['t'] - 134.6 + 0.45
        rain.add('soft_heavy' if not b['hitsCube'] else 'punch', dt, -18 if b['hitsCube'] else -22, rate=1.0 + 0.1 * (len(b['txt']) % 3))
        rain.add(S.soft_error(440 + 40 * (len(b['txt']) % 5), 3), dt, -32)
    x = rain.L + rain.R
    ev(134.6, x, 0, big=0.3)
    ev(T['hit'] + 0.05, S.voice('ow', 23), -26, big=0.3)
    ev(T['hit'] + 0.2, S.sparkle(6.0, 9, 30, 2500, 4200), -40, big=0.3)   # the stars
    ev(139.1, S.breath(0.3, True, 6), -24); ev(139.2, 'cloth', -32, maxlen=0.4, fout=0.2)
    # rewind
    ev(143.95, S.tape_stop(0.35), -26)
    ev(T['rewind'], 'rewind', -20, big=0.2, fout=0.3)
    ev(T['rewind'] + 0.05, x[: int(3.9 * SR)], -3, rev_x=True, rate=2.0, big=0.3)
    ev(146.6, 'cloth_k', -28, rate=1.8, big=0.2); ev(147.4, S.voice('hmph', 24), -26, big=0.3)
    # near miss #2
    ev(151.8, S.squeak(1400, 2600, 0.12), -26, big=0.3)
    ev(152.8, S.chitter(5, 6), -22, big=0.3); ev(153.9, S.chitter(6, 5, 2500), -24, big=0.3)
    ev(153.6, S.voice('hmph', 25), -24, big=0.3); ev(154.9, S.voice('effort', 26), -22, big=0.3)
    ev(155.05, S.chitter(7, 3, 2800), -26, big=0.3); ev(155.5, 'punch', -20, rate=1.2, big=0.3); ev(155.8, S.voice('ow', 27), -28, big=0.3)
    ev(157.9, S.voice('aww', 28), -30, big=0.3)
    # the quiet moment
    ev(162.6, 'soft_land1', -36, rate=1.5); ev(163.3, S.voice('mm', 29), -36, big=0.3)
    ev(166.45, 'yawn', -24)
    ev(172.35, S.voice('giggle', 30), -34, big=0.3)
    ev(175.3, S.breath(0.5, True, 7), -34); ev(176.1, 'cloth', -38, maxlen=0.5, fout=0.2)

def s4_closing():
    ev(179.0, S.bell(2093, 1.6), -22)
    ev(180.0, 'wood_tap', -34, rate=0.7); ev(180.2, 'cloth', -38, maxlen=0.4, fout=0.2)
    for tb, f0 in ((182.0, 220), (186.0, 196)):
        ev(tb + 0.4, 'mouse_click', -22)
        ev(tb + 0.5, S.clang(int(tb), f0), -23, big=0.4); ev(tb + 0.5, 'soft_heavy', -27, rate=0.7, big=0.3)
    ev(190.0, S.spot_on(), -25, big=0.3)
    M.track(np.concatenate([np.zeros(int(190.2 * SR), np.float32), S.light_hum(17.6)]), envelope(lambda t: db(-32) if kind_at(t) == 'cw' else db(-46)), big=0.2)
    ev(190.1, 'boing', -24, rate=1.6, big=0.3); ev(190.15, S.voice('eep', 31), -30, big=0.3)
    for t in (191.2, 192.5, 193.9, 195.3): ev(t, S.squeak(1600, 2400, 0.07), -34, big=0.3)
    ev(197.4, S.shimmer(0.8, False, 2), -26, big=0.4)
    ev(202.75, S.voice('q', 32), -28, big=0.3)
    for k in range(3): ev(204.25 + k * 0.12, S.tap(40 + k, 1.8), -34, big=0.2)
    ev(204.45, 'plate_tap2', -34, rate=2.0, big=0.2)
    ev(205.55, S.voice('mm', 33), -32, big=0.3)
    ev(206.55, S.voice('effort', 34), -20, big=0.3); ev(206.6, 'whoosh', -24, rate=0.9, big=0.25)
    ev(207.0, S.shimmer(0.4, False, 3), -28, big=0.3); ev(207.1, S.squeak(1800, 3000, 0.1), -24, big=0.3)
    ev(207.25, 'punch', -25, big=0.3); ev(207.3, 'soft_heavy', -28, rate=1.2, big=0.25); ev(207.4, 'cloth_k', -30, rate=1.5)
    ev(207.7, S.sparkle(1.0, 12, 8, 2500, 6000), -32, big=0.3)
    ev(208.6, S.voice('yay', 35), -25, big=0.3)
    ev(210.95, 'cloth_k', -30); ev(211.0, S.breath(0.4, False, 8), -30)
    ev(212.5, 'soft_land1', -30, rate=1.4)
    for k in range(3): ev(212.7 + k * 0.22, S.breath(0.18, False, 9 + k), -34)
    ev(214.2, 'cloth', -28); ev(214.6, 'creak', -28, rate=0.9); ev(215.4, 'sigh', -28, rate=1.05)

def s5_green():
    ev(219.25, S.heartbeat(4, 84), -30)                  # the hesitation over Enter
    # lines of passing tests appear
    for k in range(10): ev(T['green'] + 0.1 + k * 0.45, S.ui_tick(2200 + 80 * k), -34)
    ev(T['green'] + 0.3, S.sparkle(1.2, 21, 8, 2500, 6000), -34)
    for k, t in enumerate([221.6, 222.3, 223.0, 223.7]): ev(t, S.voice('yay', 40 + k), -36)
    ch = 227.0
    ev(ch + 1.75, S.breath(0.45, True, 11), -26)
    ev(ch + 2.28, 'chair', -18); ev(ch + 2.3, 'creak', -24, rate=1.1); ev(ch + 2.25, 'cloth', -26)
    for k in range(5): ev(ch + 2.6 + k * 0.36, 'chair', -34, rate=1.2 + 0.05 * k, maxlen=0.25, fout=0.1)
    ev(ch + 4.85, 'cloth', -30); ev(ch + 5.4, 'sigh', -28)
    # the jar
    ev(235.2, 'soft_land1', -26, rate=1.3)
    ev(235.6, 'lid_off', -26, big=0.3)
    ev(236.2, S.squeak(1600, 2200, 0.15), -28, big=0.3); ev(236.8, 'clink1', -22, big=0.3)
    ev(237.4, 'jar_close', -20, big=0.2); ev(238.0, 'paper1', -24)
    ev(238.8, 'pen_roll', -30, rate=0.6, lpf=1800, big=0.2); ev(239.8, 'clink2', -24, big=0.3); ev(239.95, 'clink3', -32, big=0.3)
    ev(240.9, S.voice('mm', 44), -30, big=0.3); ev(241.5, S.chitter(8, 3, 1800), -34, lpf=1200, big=0.2)

def s6_dawn():
    ev(245.4, 'cloth', -32); ev(245.8, S.norm(S.lowpass(np.random.default_rng(3).standard_normal(int(2.4 * SR)), 1800), 0.3), -40, fin=0.3, fout=0.4)
    ev(249.1, S.breath(0.8, True, 12), -30); ev(250.0, S.breath(1.1, False, 13), -30); ev(249.9, 'chair', -30, rate=0.9)
    ev(252.45, 'cloth_k', -32); ev(252.5, S.breath(0.25, True, 14), -32)
    ev(255.4, 'cloth', -30); ev(256.9, 'soft_land2', -34, rate=0.8, lpf=1400)
    t = 257.5; i = 0
    while t < 281:                                   # asleep: slow breathing (heard only in his shots)
        g = -36 if kind_at(t) == 'room' else -52
        ev(t, S.breath(2.0, True, 20 + i), g); ev(t + 2.3, S.breath(2.8, False, 40 + i), g + 1)
        t += 5.9; i += 1
    # home again: little steps, then one hop per character
    for k in range(7): ev(262.25 + k * 0.22, S.tap(60 + k, 1.3), -30)
    ev(263.9, S.voice('mm', 50), -30)
    msg = DATA['MSG']
    for k in range(len(msg['text'])): ev(msg['t0'] + k / msg['rate'], S.boop(760 + 60 * ((k * 5) % 7)), -26)
    ev(270.6, S.voice('yawn', 51), -28)

def music():
    """the score: its two stems (acoustic and chiptune, already level-matched) at fixed weight, one steady level. Nothing
    here follows the cuts: the music is a set of continuous cues and the mix leaves them alone."""
    room, sr = sf.read(os.path.join(BUILD, 'music_room.wav'), dtype='float32'); assert sr == SR
    chip, _ = sf.read(os.path.join(BUILD, 'music_chip.wav'), dtype='float32')
    g = db(MUSIC_G)
    for x, big in ((room, 0.0), (chip, 0.12)):
        n = min(len(x), M.n)
        M.L[:n] += x[:n, 0] * g; M.R[:n] += x[:n, 1] * g
        if big: M.big[:n] += (x[:n, 0] + x[:n, 1]) * 0.5 * g * big

MUSIC_G = 5.0

def master(out, fade_in=None, target=-18.0, gain_db=None):
    irL, irR = room_ir(0.4, 1.0, 4500, 1)
    bL, bR = room_ir(1.6, 3.0, 7000, 2)
    for send, (a, b), gain in ((M.rev, (irL, irR), 0.6), (M.big, (bL, bR), 0.9)):
        if np.any(send):
            M.L += signal.fftconvolve(send, a)[:M.n].astype(np.float32) * gain
            M.R += signal.fftconvolve(send, b)[:M.n].astype(np.float32) * gain
    st = np.stack([M.L, M.R], 1)
    if fade_in:
        a0, a1 = int(fade_in[0] * SR), int(fade_in[1] * SR)
        st[:a0] = 0; st[a0:a1] *= np.linspace(0, 1, a1 - a0)[:, None] ** 1.5
    b, a = signal.butter(2, 28 / (SR / 2), 'high'); st = signal.lfilter(b, a, st, axis=0).astype(np.float32)
    blk = int(0.4 * SR)
    rms = np.sqrt(np.array([np.mean(st[i:i + blk] ** 2) for i in range(0, len(st) - blk, blk)]) + 1e-12)
    loud = rms[rms > db(-50)]
    integ = 20 * np.log10(np.sqrt(np.mean(loud ** 2)))
    applied = gain_db if gain_db is not None else target - integ
    st *= db(applied)
    thr = db(-1.5)
    st = np.where(np.abs(st) > thr * 0.7, np.sign(st) * (thr * 0.7 + (thr * 0.3) * np.tanh((np.abs(st) - thr * 0.7) / (thr * 0.3))), st)
    # fade the very end
    f = int(1.0 * SR); st[-f:] *= np.linspace(1, 0, f)[:, None]
    sf.write(out, st, SR, subtype='PCM_24')
    print('master →', out, f'integrated≈{integ:.1f} dB, gain {applied:+.1f} dB, peak {20 * np.log10(np.abs(st).max()):.1f} dBFS')
    return applied

def title_clip(with_music):
    """the title card on its own: typing, the little friend hopping on — with its own little cue, or effects only"""
    global M
    M = Mix(7.0)
    M.bed_room = None
    room = loop_to(sfxlib.get('room_lit'), M.n, offset=3)
    M.track(room, np.full(M.n, db(-46), np.float32))
    title()
    if with_music:
        for fn, big in (('title_room.wav', 0.0), ('title_chip.wav', 0.12)):
            x, _ = sf.read(os.path.join(BUILD, fn), dtype='float32'); n = min(len(x), M.n)
            M.L[:n] += x[:n, 0] * db(MUSIC_G); M.R[:n] += x[:n, 1] * db(MUSIC_G)
            if big: M.big[:n] += (x[:n, 0] + x[:n, 1]) * 0.5 * db(MUSIC_G) * big
    # fade out with the picture (5.7 → 6.6 s)
    a, b = int(5.7 * SR), int(6.6 * SR)
    for ch in (M.L, M.R, M.rev, M.big): ch[a:b] *= np.linspace(1, 0, b - a); ch[b:] = 0
    master(os.path.join(BUILD, 'title_music.wav' if with_music else 'title_sfx.wav'), gain_db=FILM_GAIN)

if __name__ == '__main__':
    import sys
    ambience(); keys(); code_world()
    s1_night(); s2_dive(); s3_together(); s4_closing(); s5_green(); s6_dawn()
    if '--no-music' not in sys.argv: music()
    FILM_GAIN = master(os.path.join(BUILD, 'soundtrack.wav'), fade_in=(T['wide1'] + 0.05, T['wide1'] + 2.6))
    title_clip(True); title_clip(False)
