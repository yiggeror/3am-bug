"""Original score for 《凌晨三点的 Bug》 (The 3 A.M. Bug).
Every cue is placed in absolute seconds against the story beats (production/build/cues.json → T), written to
MIDI and rendered with FluidSynth and the FluidR3 GM soundfont.

Material
  · the 3 A.M. theme — D minor, tired and tender (music box / piano); it returns in D major at the green.
  · the little friend's theme — F major, bright and bouncy (glockenspiel, pizzicato, clarinet).
  · the bug's motif — a chromatic tiptoe (bassoon, pizzicato), cheeky.
  · the code world — a slow Lydian shimmer (warm pad, choir, celesta arpeggios).
Sections follow the film: late-night lo-fi → the dive → working together → the quiet moment → closing in
→ all green → dawn lullaby → credits."""
import json, os, subprocess
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
CUES = json.load(open(os.path.join(BUILD, 'cues.json')))
T = CUES['T']

NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def p(s):
    s = s.strip(); n = NN[s[0].upper()]; i = 1
    while i < len(s) and s[i] in '#b': n += 1 if s[i] == '#' else -1; i += 1
    return n + 12 * (int(s[i:]) + 1)
def up(note, k=12): return p(note) + k if isinstance(note, str) else note + k

class Score:
    def __init__(self): self.ev = []
    def prog(self, t, ch, program, bank=0):
        self.ev.append((t, 0, 'bank', ch, bank, 0)); self.ev.append((t, 1, 'prog', ch, program, 0))
    def cc(self, t, ch, num, val): self.ev.append((t, 2, 'cc', ch, num, int(max(0, min(127, val)))))
    def note(self, t, dur, ch, pitch, vel=80):
        if isinstance(pitch, str): pitch = p(pitch)
        vel = int(max(1, min(127, vel)))
        self.ev.append((t, 4, 'on', ch, pitch, vel)); self.ev.append((t + max(0.03, dur), 3, 'off', ch, pitch, 0))
    def chord(self, t, dur, ch, notes, vel=70, roll=0.0):
        for i, n in enumerate(notes.split()): self.note(t + i * roll, dur - i * roll, ch, n, vel)
    def mel(self, t, beat, ch, spec, vel=80, leg=0.92, stacc=None, shift=0):
        for tok in spec.replace('|', ' ').split():
            n, d = tok.split(':'); d = float(d) * beat
            if n != 'r': self.note(t, d * (stacc if stacc else leg), ch, p(n) + shift, vel)
            t += d
        return t
    def ramp(self, t0, t1, ch, num, v0, v1, steps=16):
        for i in range(steps + 1): k = i / steps; self.cc(t0 + (t1 - t0) * k, ch, num, v0 + (v1 - v0) * k)
    def gliss(self, t, dur, ch, notes, vel=60):
        ns = notes.split(); step = dur / len(ns)
        for i, n in enumerate(ns): self.note(t + i * step, step * 2.2, ch, n, vel)
    def write(self, path):
        mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))  # 960 ticks / second
        last = 0
        for t, o, kind, ch, a, b in sorted(self.ev, key=lambda e: (e[0], e[1])):
            tick = int(round(max(0, t) * 960)); dt = tick - last; last = tick
            if kind == 'on': m = mido.Message('note_on', channel=ch, note=a, velocity=b, time=dt)
            elif kind == 'off': m = mido.Message('note_off', channel=ch, note=a, velocity=0, time=dt)
            elif kind == 'cc': m = mido.Message('control_change', channel=ch, control=a, value=b, time=dt)
            elif kind == 'prog': m = mido.Message('program_change', channel=ch, program=a, time=dt)
            else: m = mido.Message('control_change', channel=ch, control=0, value=a, time=dt)
            tr.append(m)
        mid.save(path)

# channels
EP, BASS, PAD, STR, PIZZ, CEL, GLOCK, HARP, CLAR, DR, BSN, XYL, MBOX, BRASS, CHOIR, FX = range(16)
S = Score()
def setup():
    progs = {EP: 4, BASS: 32, PAD: 89, STR: 49, PIZZ: 45, CEL: 8, GLOCK: 9, HARP: 46, CLAR: 71, BSN: 70, XYL: 13, MBOX: 10, BRASS: 61, CHOIR: 52, FX: 47}
    for ch, pr in progs.items():
        S.prog(0, ch, pr); S.cc(0, ch, 7, 100); S.cc(0, ch, 91, 55); S.cc(0, ch, 93, 0); S.cc(0, ch, 11, 127)
    S.prog(0, DR, 40); S.cc(0, DR, 7, 92)   # channel 10 uses the drum bank (40 = brush kit)
    pans = {EP: 60, BASS: 64, PAD: 64, STR: 58, PIZZ: 50, CEL: 76, GLOCK: 80, HARP: 44, CLAR: 78, BSN: 52, XYL: 84, MBOX: 70, BRASS: 56, CHOIR: 64, FX: 64}
    for ch, pn in pans.items(): S.cc(0.01, ch, 10, pn)
    for ch in (MBOX, CEL, HARP, CHOIR, PAD): S.cc(0.01, ch, 91, 75)

# material
THEME = 'D5:1 E5:.5 F5:.5 E5:1 A4:1 | Bb4:1 A4:.5 G4:.5 A4:2 | G4:1 F4:.5 E4:.5 F4:1 D4:1 | E4:3 r:1'
THEME_END = 'D5:1 E5:.5 F5:.5 E5:1 A4:1 | Bb4:1 A4:.5 G4:.5 A4:1 C#5:1 | D5:4'
THEME_MAJ = 'D5:1 E5:.5 F#5:.5 E5:1 A4:1 | B4:1 A4:.5 G4:.5 A4:2 | G4:1 F#4:.5 E4:.5 F#4:1 D4:1 | E4:2 A4:1 D5:1'
CH_MIN = ['D3 F3 A3 C4', 'Bb2 D3 F3 A3', 'G2 Bb2 D3 F3', 'A2 E3 G3 C#4']
BS_MIN = ['D2', 'Bb1', 'G1', 'A1']
CH_MAJ = ['D3 F#3 A3 C#4', 'G2 B2 D3 F#3', 'E3 G3 B3 D4', 'A2 C#3 E3 G3']
BS_MAJ = ['D2', 'G1', 'E2', 'A1']
CUBE = 'F5:.5 A5:.5 C6:1 A5:.5 G5:.5 | F5:.5 G5:.5 A5:1 C5:1 | D5:.5 F5:.5 A5:1 G5:.5 F5:.5 | E5:.5 G5:.5 F5:2'
CH_CUBE = ['F3 A3 C4 E4', 'D3 F3 A3 C4', 'Bb2 D3 F3 A3', 'C3 E3 G3 Bb3']
BS_CUBE = ['F2', 'D2', 'Bb1', 'C2']
BUG = 'E4:.25 F4:.25 E4:.25 Eb4:.25 D4:.5 r:.5 | Bb3:.25 B3:.25 C4:.25 C#4:.25 D4:.5 r:.5'

def arp(t0, t1, ch, chords, beat, vel=40, pattern=(0, 1, 2, 3, 2, 1), octave=12):
    """broken-chord figure across a list of chords, one chord per 4 beats"""
    t, i = t0, 0
    while t < t1 - 0.02:
        ns = [p(n) + octave for n in chords[(i // len(pattern) // 2) % len(chords)].split()]
        S.note(t, beat * 0.9, ch, ns[pattern[i % len(pattern)] % len(ns)], vel)
        t += beat / 2 * (4 / len(pattern)) * (len(pattern) / 4); i += 1
    return t

def groove(t0, t1, beat, chords, basses, vel=1.0, drums=True, ep=True, swing=0.0, busy=False):
    """late-night lo-fi: lazy EP comping, upright bass, brushes"""
    t, bar = t0, 0
    while t < t1 - 0.05:
        c, r = chords[bar % len(chords)], basses[bar % len(basses)]
        if ep:
            S.chord(t + 0.02, beat * 1.7, EP, c, 50 * vel, roll=0.012)
            if t + beat * 2.5 < t1: S.chord(t + beat * 2.5 + 0.03, beat * 1.2, EP, c, 38 * vel, roll=0.01)
        S.note(t, beat * 1.8, BASS, r, 72 * vel)
        if t + beat * 2 < t1: S.note(t + beat * 2, beat * 1.3, BASS, p(r) + 7, 60 * vel)
        if busy and t + beat * 3.5 < t1: S.note(t + beat * 3.5, beat * 0.4, BASS, p(r) + 12, 52 * vel)
        if drums:
            for b in range(4):
                tb = t + b * beat
                if tb >= t1: break
                if b % 2 == 1: S.note(tb, 0.2, DR, 38, 34 * vel)
                if b == 0: S.note(tb, 0.2, DR, 36, 40 * vel)
                S.note(tb, 0.1, DR, 42, 24 * vel); S.note(tb + beat * (0.5 + swing), 0.1, DR, 42, 16 * vel)
        t += beat * 4; bar += 1
    return t

def sting(t, low=True):
    """red again: a low piano cluster + a string minor second"""
    S.prog(t - 0.1, FX, 0)
    S.chord(t, 2.2, FX, 'D2 Eb2 A2' if low else 'D3 Eb3', 70)
    S.chord(t + 0.02, 1.8, STR, 'A4 Bb4', 44)

# ============================================================================== 0 · title
def title():
    beat = 60 / 76
    S.chord(0.4, 5.6, PAD, 'D3 A3 F4', 34); S.ramp(0.4, 1.8, PAD, 11, 40, 110)
    S.mel(0.9, beat, MBOX, 'D5:1 E5:.5 F5:.5 E5:1 A4:1 | Bb4:1 A4:.5 G4:.5 A4:2', 62)
    S.chord(0.9, 3.0, HARP, 'D3 A3 D4', 34, roll=0.08)
    S.chord(0.9 + 4 * beat, 3.0, HARP, 'Bb2 F3 D4', 32, roll=0.08)
    # the little friend hops on: pizz scamper, glock on landing, harp on the wave
    for i, n in enumerate(['F5', 'A5', 'C6']): S.note(3.0 + i * 0.12, 0.1, PIZZ, n, 60)
    S.note(3.56, 0.8, GLOCK, 'F6', 50)
    S.gliss(4.25, 0.5, HARP, 'F4 A4 C5 F5 A5', 40)

# ============================================================================== 1 · 02:50 — red again
def night():
    beat = 60 / 72
    # lo-fi from the wide shot to the first failure
    S.ramp(6.6, 8.2, EP, 11, 50, 115)
    groove(6.6, 17.4, beat, CH_MIN, BS_MIN, 0.9)
    S.mel(6.6 + 4 * beat, beat, CEL, 'r:1 A5:.5 F5:.5 E5:1 D5:1', 30)
    sting(T['fail1'])
    # sparser after the first red
    groove(18.2, 23.7, beat, CH_MIN[1:] + CH_MIN[:1], BS_MIN[1:] + BS_MIN[:1], 0.7, drums=False)
    sting(T['fail2'], low=True)
    # drums gone; EP + bass only, slower and heavier
    groove(24.6, 28.8, beat * 1.15, ['D3 F3 A3', 'Bb2 D3 F3'], ['D2', 'Bb1'], 0.6, drums=False)
    # hands in his hair: tremolo strings swell (dissonant)
    S.prog(28.6, STR, 44)
    for i, n in enumerate(['D3', 'Eb3', 'A3']): S.note(28.9, 1.7, STR, n, 44)
    S.ramp(28.9, 30.5, STR, 11, 60, 125); S.ramp(30.5, 31.3, STR, 11, 125, 40)
    S.prog(31.2, STR, 49)
    S.chord(31.2, 1.8, EP, 'Bb2 D3 F3 A3', 34, roll=0.05)
    # the little friend's worry: a lonely celesta version of its theme, in minor
    S.mel(33.3, 0.5, CEL, 'D5:.5 F5:.5 A5:1 F5:.5 E5:.5 | D5:.5 E5:.5 F5:1 A4:1', 38)
    S.chord(33.3, 3.8, PAD, 'D3 A3 F4', 26)
    # rubbing his eyes, the sigh: a slow descending EP line
    S.chord(37.4, 3.0, EP, 'G2 Bb2 D3 F3', 36, roll=0.06)
    S.chord(40.4, 1.1, STR, 'D4 A4', 30); S.ramp(40.4, 41.3, STR, 11, 40, 100)
    S.chord(41.45, 3.2, EP, 'A2 E3 G3 C#4', 34, roll=0.08)
    S.mel(43.5, beat, EP, 'F4:1 E4:1 D4:1 C#4:1 | D4:2', 34)
    # the slow fall: piano descending to the low D as his head touches the keys
    S.prog(45.0, FX, 0)
    S.mel(45.5, 0.95, FX, 'A4:1 G4:1 F4:1 E4:1 D4:1 C#4:.5', 38)
    S.note(T['headDown'], 4.0, FX, 'D2', 50); S.note(T['headDown'], 4.0, FX, 'A2', 34)
    # the keyboard types garbage: curious pizz question marks
    for i, (dt, n) in enumerate([(0.3, 'A4'), (0.8, 'D5'), (1.9, 'A4'), (2.3, 'E5')]):
        S.note(T['garbage'] + dt, 0.12, PIZZ, n, 44)
    S.mel(T['garbage'] + 3.0, 0.4, BSN, 'D3:1 E3:1 F3:2', 44, stacc=0.8)

# ============================================================================== 2 · the dive
def dive():
    r = T['resolve']
    # resolve: a pad swell, the little friend's theme rising on clarinet
    S.chord(r, 3.3, PAD, 'F3 C4 A4', 30); S.ramp(r, r + 3.0, PAD, 11, 40, 120)
    S.mel(r + 0.8, 0.42, CLAR, 'C5:1 F5:1 A5:2 G5:1 A5:1', 48)
    # march: pizzicato steps and a snare
    beat = 60 / 132
    t = 61.7; i = 0
    while t < 63.4:
        S.note(t, 0.15, PIZZ, ['F3', 'C4', 'A3', 'C4'][i % 4], 60); S.note(t, 0.1, DR, 38 if i % 2 else 42, 30)
        if i % 2 == 0: S.note(t, 0.2, BSN, ['F2', 'C3'][(i // 2) % 2], 50)
        t += beat; i += 1
    # at the edge: strings tremolo crescendo
    S.prog(63.2, STR, 44)
    S.chord(63.4, 0.65, STR, 'C4 F4 A4', 40); S.ramp(63.4, 64.0, STR, 11, 50, 127)
    # the leap: harp glissando up; the dive: glock down
    S.gliss(64.0, 0.8, HARP, 'F3 A3 C4 F4 A4 C5 F5 A5 C6', 60)
    S.gliss(64.9, 0.5, GLOCK, 'C7 A6 F6 C6 A5', 48)
    S.prog(64.8, STR, 49)
    # the code world: a slow Lydian shimmer
    cw = 67.4
    S.prog(66.0, PAD, 95)
    S.chord(cw, 6.2, PAD, 'F3 C4 G4 B4', 44); S.ramp(cw, cw + 2.0, PAD, 11, 50, 115)
    S.chord(cw + 0.4, 5.8, CHOIR, 'F4 A4 E5', 30)
    t = cw + 0.2; i = 0
    notes = ['F5', 'A5', 'B5', 'E6', 'C6', 'G5', 'B5', 'A5']
    while t < 73.3: S.note(t, 0.6, CEL, notes[i % 8], 30 + (i % 3) * 4); t += 0.3; i += 1
    S.gliss(67.4, 0.4, HARP, 'F2 C3 G3 B3', 50)
    # the bug: its chromatic tiptoe
    b = T['bugAppear']
    S.note(b, 0.1, XYL, 'B5', 50)
    S.mel(b + 0.5, 0.36, BSN, BUG, 58, stacc=0.6)
    S.mel(b + 0.5, 0.36, PIZZ, BUG, 40, stacc=0.4, shift=12)
    S.chord(b + 1.3, 0.2, PIZZ, 'E5 Bb5', 50)                          # tongue
    # the chase: a quick galop (xylophone + pizz + brushes)
    beat = 60 / 152
    t = 76.2; i = 0
    ch = ['F3 A3 C4', 'C3 E3 G3', 'D3 F3 A3', 'C3 E3 Bb3']
    mel = 'C6:.5 A5:.5 F5:.5 A5:.5 G5:.5 E5:.5 C5:1 | D5:.5 F5:.5 A5:.5 F5:.5 G5:1 C5:1'
    S.mel(78.6, beat, XYL, mel + ' | ' + mel, 50, stacc=0.5)
    while t < 82.0:
        S.note(t, beat * 0.5, PIZZ, ch[(i // 4) % 4].split()[0], 56); S.chord(t + beat, beat * 0.4, PIZZ, ch[(i // 4) % 4], 40)
        S.note(t, 0.1, DR, 42, 26); S.note(t + beat, 0.15, DR, 38, 30)
        t += beat * 2; i += 2

# ============================================================================== 3 · working together
def together():
    # the glitch: music drops to a low, unsettled drone
    S.prog(81.8, FX, 88)
    S.note(82.0, 3.3, FX, 'D2', 40); S.note(82.0, 3.3, FX, 'Eb3', 24)
    # he bolts upright: an orchestra-hit hiccup
    S.prog(84.9, FX, 55); S.chord(85.21, 0.4, FX, 'D4 A4', 60)
    # discovery: what are those? (celesta, rising fourths)
    S.mel(86.4, 0.5, CEL, 'A5:1 D6:1 r:1 A5:1 E6:2', 36)
    S.chord(86.4, 6.4, PAD, 'D3 A3 E4', 26)
    S.mel(90.4, 0.3, GLOCK, 'F6:.5 A6:.5 C7:1 A6:.5 G6:.5 F6:1', 30)     # tiny theme for the tiny figures
    # the double take: comic pizz
    for dt, n in [(0.2, 'D4'), (0.5, 'D4'), (1.3, 'A4'), (2.4, 'F4'), (2.9, 'A4'), (3.35, 'D5')]: S.note(93.0 + dt, 0.12, PIZZ, n, 50)
    S.gliss(96.4, 0.3, CEL, 'D6 A5 F5', 30)
    S.note(97.45, 0.08, XYL, 'D6', 60); S.note(97.6, 0.08, XYL, 'A5', 56)   # knuckles
    # working together: a groove in F (EP, bass, brushes, a celesta arp: the code world)
    beat = 60 / 96
    S.prog(97.8, PAD, 89)
    t = groove(98.0, 103.0, beat, CH_CUBE, BS_CUBE, 0.85, busy=True)
    arp(100.0, 103.0, CEL, CH_CUBE, beat, 28)
    # the hit: stop time, a question
    S.note(103.0, 0.8, GLOCK, 'E6', 50); S.chord(103.0, 1.0, PAD, 'F3 C4 B4', 30)
    # sneaking: tiptoe pizz
    t = 104.0; i = 0
    while t < 106.6: S.note(t, 0.1, PIZZ, ['C4', 'E4', 'G4', 'Bb4'][i % 4], 40 + i); t += 0.32; i += 1
    S.chord(106.6, 0.5, STR, 'C4 F4', 40); S.ramp(106.6, 107.1, STR, 11, 50, 127)
    # the lunge: a flop (trombone slide down)
    S.prog(106.9, BRASS, 57)
    S.note(107.55, 0.9, BRASS, 'F3', 60); S.note(107.9, 0.7, BRASS, 'E3', 50)
    S.prog(108.8, BRASS, 61)
    # dazed: a wobbly vibraphone
    S.prog(107.9, FX, 11)
    for i in range(5): S.note(108.2 + i * 0.5, 0.45, FX, ['F4', 'E4', 'F4', 'E4', 'Eb4'][i], 34)
    # the idea — leave a light: groove returns, lighter
    t = groove(112.0, 117.0, beat, CH_CUBE[:2], BS_CUBE[:2], 0.7, busy=False)
    # the lantern: a warm chord and a harp roll
    S.chord(117.0, 3.0, HARP, 'F3 C4 E4 G4 A4', 44, roll=0.08); S.chord(117.0, 4.5, PAD, 'F3 C4 E4 A4', 34)
    S.note(117.5, 1.2, GLOCK, 'C7', 40)
    # following the footprints
    t = 117.6; i = 0
    while t < 122.0: S.note(t, 0.12, PIZZ, ['F4', 'A4', 'C5', 'A4', 'G4', 'Bb4', 'C5', 'E5'][i % 8], 44); t += 0.3; i += 1
    # lost among the braces: a clarinet wandering in whole tones
    S.mel(122.2, 0.5, CLAR, 'C5:1 D5:1 E5:1 F#5:1 G#5:2 | F#5:1 E5:1 D5:2 r:1 C5:1 D5:1 Bb4:2', 40)
    S.chord(122.2, 5.8, PAD, 'C3 G3 D4', 24)
    # eager: a string ostinato builds
    S.prog(127.8, STR, 48)
    t = 128.0; i = 0
    while t < 131.4: S.note(t, 0.2, STR, ['F3', 'C4', 'A3', 'C4'][i % 4], 36 + i * 1.5); t += 0.21; i += 1
    # holding backspace: a slow chromatic creep upward, too long
    S.prog(131.2, STR, 44)
    for i, n in enumerate(['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4']): S.note(131.4 + i * 0.4, 0.42, STR, n, 40 + i * 5)
    S.note(131.4, 3.2, STR, 'C6', 36)
    # collapse: a low hit, then brass stabs with the falling errors
    S.prog(134.3, FX, 47)
    S.note(T['collapse'], 1.4, FX, 'D2', 92); S.note(T['collapse'] + 0.05, 1.4, BRASS, 'D2', 74)
    for b in CUES['blocks']: S.chord(b['t'] + 0.45, 0.3, BRASS, 'D3 Ab3', 58)
    S.note(T['hit'], 0.2, DR, 76, 90)                                  # bonk (woodblock)
    # dizzy
    S.prog(136.3, CEL, 11)
    for i in range(10): S.note(136.8 + i * 0.25, 0.3, CEL, ['A5', 'C#6', 'E6', 'C#6'][i % 4], 30)
    S.prog(139.0, CEL, 8)
    # oops: the sad trombone
    S.prog(138.8, BRASS, 57)
    for i, n in enumerate(['G3', 'F#3', 'F3']): S.note(139.1 + i * 0.4, 0.38, BRASS, n, 58)
    S.note(140.3, 1.2, BRASS, 'E3', 58); S.ramp(140.3, 141.5, BRASS, 11, 110, 20)
    S.prog(141.8, BRASS, 61)
    # Ctrl+Z: a held breath, then the tape rewinds (a harp swept upward)
    S.chord(142.2, 2.0, STR, 'D4 G4', 30)
    S.prog(141.8, STR, 49)
    S.gliss(144.3, 1.8, HARP, 'D3 F3 A3 D4 F4 A4 D5 F5 A5 D6', 44)
    # back on its feet: the groove, briefly
    t = groove(147.4, 151.8, 60 / 104, CH_CUBE, BS_CUBE, 0.7, busy=True)
    # near miss #2: the bug's motif, then the galop
    S.mel(152.5, 0.3, BSN, BUG, 56, stacc=0.6)
    beat = 60 / 152
    S.mel(154.9, beat, XYL, 'C6:.5 A5:.5 F5:.5 C5:.5', 50, stacc=0.5)
    S.prog(155.3, BRASS, 57); S.note(155.5, 0.9, BRASS, 'F3', 54); S.note(155.9, 0.9, BRASS, 'E3', 44); S.prog(157.0, BRASS, 61)
    t = 156.0; i = 0
    while t < 160.0: S.note(t, 0.1, PIZZ, p('D4') + (i * 2) % 24, 40); t += 0.14; i += 1

# ============================================================================== the quiet moment
def quiet():
    beat = 60 / 60
    t0 = 160.8
    S.prog(160.0, EP, 0)                                       # solo piano
    S.mel(t0, beat, EP, THEME, 44)
    for i, (c, b) in enumerate(zip(CH_MIN, BS_MIN)):
        S.chord(t0 + i * 4 * beat, 3.8 * beat, EP, c, 28, roll=0.04)
        S.note(t0 + i * 4 * beat, 3.8 * beat, BASS, b, 34)
    # the wave: the theme turns toward F major, strings enter softly at his smile
    t1 = t0 + 16 * beat
    S.mel(t1, beat, EP, 'A4:1 C5:.5 D5:.5 C5:1 F4:1', 42)
    S.chord(t1, 4 * beat, EP, 'F3 A3 C4 E4', 28, roll=0.05)
    S.mel(172.3, 0.5, MBOX, 'C6:1 A5:1 F5:2', 36)
    S.chord(175.9, 2.2, STR, 'F3 A3 C4 E4', 28); S.ramp(175.9, 177.2, STR, 11, 30, 100)
    S.note(175.9, 2.2, BASS, 'F2', 30)

# ============================================================================== 4 · closing in
def closing():
    S.prog(177.8, EP, 4)
    S.note(179.0, 1.4, GLOCK, 'A6', 60); S.gliss(179.02, 0.35, HARP, 'D5 F5 A5 D6', 44)
    # the plan: a heist groove — pizz ostinato, low string pulse, timpani on each gate
    beat = 60 / 100
    t = 180.8; i = 0
    osti = ['D3', 'A3', 'F3', 'A3', 'D3', 'A3', 'G3', 'A3']
    while t < 197.4:
        S.note(t, beat * 0.4, PIZZ, osti[i % 8], 52 if i % 2 == 0 else 40)
        if i % 4 == 0: S.note(t, beat * 1.8, STR, 'D2', 36); S.note(t, beat * 1.9, BASS, 'D2', 50)
        if t > 190.0 and i % 2 == 1: S.note(t, 0.1, DR, 42, 30)
        t += beat / 2; i += 1
    for g in CUES['gates']:
        S.note(g, 1.2, FX, 'D2', 88); S.note(g + 0.01, 1.0, BRASS, 'D3', 64)
    # the light floods in: brass swell
    S.chord(190.0, 3.0, BRASS, 'D3 A3 D4 F4', 50); S.ramp(190.0, 191.5, BRASS, 11, 40, 110); S.ramp(191.5, 193.0, BRASS, 11, 110, 50)
    # panic: xylophone runs
    for k in range(6): S.gliss(193.4 + k * 0.6, 0.3, XYL, 'D5 E5 F5 G5 A5' if k % 2 == 0 else 'A5 G5 F5 E5 D5', 40)
    # the disguise: suspense (low pedal, sparse tiptoes)
    S.chord(197.4, 9.0, STR, 'D2 A2', 34); S.ramp(197.4, 206.4, STR, 11, 40, 110)
    S.gliss(197.4, 0.6, CEL, 'A6 F6 D6 A5', 30)
    for k, tt in enumerate([200.7, 201.2, 201.7, 202.2]): S.note(tt, 0.1, PIZZ, ['D4', 'E4', 'F4', 'E4'][k], 40)
    S.mel(202.8, 0.4, CEL, 'A5:1 D6:1', 34)                           # ?
    S.note(204.3, 0.15, XYL, 'E6', 60); S.note(204.5, 0.15, XYL, 'E6', 60)   # feet!
    S.mel(205.5, 0.35, BSN, 'D3:1 C#3:1 D3:2', 50, stacc=0.7)          # sly
    # THE POUNCE
    S.prog(206.3, FX, 55); S.chord(206.6, 0.5, FX, 'D4 F#4 A4', 74)
    S.note(207.25, 1.5, DR, 49, 80); S.note(207.25, 0.3, DR, 36, 90)
    S.gliss(207.7, 0.5, GLOCK, 'D6 F#6 A6 D7', 50)
    # triumph: a brass fanfare on the little friend's theme (in D)
    S.prog(207.9, BRASS, 61)
    beat = 60 / 120
    S.mel(208.4, beat, BRASS, 'D5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 | D5:.5 E5:.5 F#5:1 A4:1', 70, shift=-12)
    S.mel(208.4, beat, GLOCK, 'D5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 | D5:.5 E5:.5 F#5:1 A4:1', 44, shift=12)
    S.chord(208.4, 2.0, STR, 'D3 A3 D4 F#4', 50); S.chord(210.4, 2.0, STR, 'G2 D3 B3 G4', 46)
    S.note(212.5, 0.1, DR, 77, 70)                                     # forehead slap (woodblock)
    # relief: warm strings and EP
    S.chord(212.4, 3.0, STR, 'E3 B3 D4 G4', 42); S.chord(214.0, 4.0, STR, 'A2 E3 A3 C#4', 38)
    S.chord(214.0, 3.4, EP, 'A2 E3 G3 C#4 E4', 36, roll=0.06)
    S.note(217.4, 0.6, EP, 'A4', 30)

# ============================================================================== 5 · all green
def green():
    # the hesitation over Enter: one high note held, nothing else
    S.note(219.2, 1.5, STR, 'A5', 26); S.ramp(219.2, 220.6, STR, 11, 30, 100)
    # GREEN: the 3 A.M. theme, in D major, for everyone
    beat = 60 / 84
    g = T['green']
    S.prog(220.5, EP, 0); S.prog(220.5, CHOIR, 52)
    S.chord(g, 2.4, BRASS, 'D3 A3 D4 F#4', 62); S.note(g, 2.0, FX, 'D2', 72)
    S.note(g, 1.6, DR, 49, 70)
    S.mel(g + 0.3, beat, STR, THEME_MAJ, 56, shift=12)
    S.mel(g + 0.3, beat, GLOCK, THEME_MAJ, 36, shift=12)
    for i, (c, b) in enumerate(zip(CH_MAJ, BS_MAJ)):
        tb = g + 0.3 + i * 4 * beat
        if tb > T['cheer'] + 0.5: break
        S.chord(tb, 4 * beat, CHOIR, c, 34); S.note(tb, 4 * beat, BASS, b, 56)
        S.chord(tb, 3.6 * beat, EP, c, 40, roll=0.04)
    # the cheer: an upbeat groove in D (brushes, bass, EP, glock melody)
    S.prog(227.6, EP, 4)
    beat = 60 / 116
    groove(228.2, 235.0, beat, CH_MAJ, BS_MAJ, 0.9, busy=True)
    S.mel(229.3, beat, GLOCK, 'A5:.5 D6:.5 F#6:1 E6:.5 D6:.5 | E6:.5 F#6:.5 A6:2 r:1 | D6:.5 E6:.5 F#6:1 E6:.5 D6:.5 | C#6:.5 E6:.5 D6:2', 44, stacc=0.7)
    S.note(229.28, 1.0, DR, 49, 60)
    # the jar: playful pizz + music box; the bug's motif, made cute
    S.mel(235.4, 0.3, PIZZ, 'D5:.5 F#5:.5 A5:1 r:1 | ' + 'A5:.5 G5:.5 F#5:.5 E5:.5 D5:1', 44, stacc=0.5)
    S.mel(236.8, 0.3, BSN, BUG, 46, stacc=0.6)
    S.note(237.4, 0.4, GLOCK, 'D7', 40)                                 # lid on
    S.note(239.8, 0.6, GLOCK, 'A6', 44); S.note(239.95, 0.6, GLOCK, 'F#6', 36)
    S.mel(240.2, 0.45, MBOX, 'F#5:1 A5:1 D6:2 C#6:1 D6:1 E6:2', 44)
    S.chord(240.2, 4.4, PAD, 'D3 A3 F#4', 26)
    S.gliss(241.0, 0.5, HARP, 'D5 F#5 A5 D6', 36)

# ============================================================================== 6 · dawn
def dawn():
    beat = 60 / 66
    t0 = T['sunrise'] + 0.2
    S.prog(t0 - 0.4, CLAR, 73)                                  # flute
    S.chord(t0, 6.0, PAD, 'D3 A3 F#4', 30); S.ramp(t0, t0 + 2, PAD, 11, 30, 100)
    S.mel(t0 + 0.4, beat, CLAR, 'A5:1 F#5:.5 E5:.5 D5:1 E5:1 | F#5:2', 40)
    S.chord(t0, 3.0, HARP, 'D3 A3 D4 F#4', 34, roll=0.08)
    # asleep: a lullaby (music box + harp), slower and slower
    t1 = T['sleep'] + 0.8
    beat = 60 / 58
    S.mel(t1, beat, MBOX, THEME_MAJ.replace('E4:2 A4:1 D5:1', 'E4:2 r:2'), 44)
    for i, (c, b) in enumerate(zip(CH_MAJ, BS_MAJ)):
        tb = t1 + i * 4 * beat
        if tb > T['goodnight']: break
        S.chord(tb, 3.8 * beat, HARP, c, 28, roll=0.06)
        S.chord(tb, 4 * beat, PAD, c, 22)
    # the message: a celesta note for each character it types
    msg = CUES['MSG']
    notes = ['D6', 'E6', 'F#6', 'A6', 'F#6', 'E6', 'D6', 'A5', 'D6']
    for k in range(len(msg['text'])): S.note(msg['t0'] + k / msg['rate'], 0.5, CEL, notes[k % len(notes)], 34)
    S.chord(msg['t0'], 4.4, STR, 'D3 A3 F#4', 24)
    S.chord(270.6, 3.4, PAD, 'G3 B3 D4', 24); S.note(271.2, 2.0, MBOX, 'B5', 30)
    # the room in the morning: the theme's last phrase, a final D major chord
    f = T['final'] + 0.4
    beat = 60 / 60
    S.prog(f - 0.3, EP, 0)
    S.mel(f, beat, EP, 'D5:1 E5:.5 F#5:.5 E5:1 A4:1 | B4:1 A4:.5 G4:.5 A4:2', 38)
    S.chord(f, 4 * beat, EP, 'D3 A3 F#4', 26); S.chord(f + 4 * beat, 3 * beat, EP, 'G2 D3 B3', 26)
    S.chord(f + 4 * beat, 3.2, STR, 'G2 D3 B3', 22)

# ============================================================================== credits
def credits():
    t0 = T['credits'] + 0.6
    beat = 60 / 120
    S.prog(t0 - 0.4, EP, 4)
    spec = THEME_MAJ + ' | ' + THEME_MAJ.replace('E4:2 A4:1 D5:1', 'D4:4')
    S.mel(t0, beat, GLOCK, spec, 44, stacc=0.6, shift=12)
    S.mel(t0, beat, XYL, spec, 28, stacc=0.5)
    t = t0; bar = 0
    while t < T['filmEnd'] - 1.6:
        c, r = CH_MAJ[bar % 4], BS_MAJ[bar % 4]
        for b in range(4):
            tt = t + b * beat
            if b % 2 == 0: S.note(tt, beat * 0.8, BASS, r, 60)
            else: S.chord(tt, beat * 0.5, PIZZ, c, 36)
            S.note(tt, 0.1, DR, 42, 22)
            if b % 2 == 1: S.note(tt, 0.2, DR, 38, 30)
        S.chord(t, beat * 3.6, EP, c, 32)
        t += 4 * beat; bar += 1
    end = T['filmEnd'] - 1.4
    S.chord(end, 1.3, HARP, 'D3 A3 D4 F#4 A4', 44, roll=0.05); S.note(end, 1.3, GLOCK, 'D7', 40)

def build(out_wav):
    setup()
    for fn in (title, night, dive, together, quiet, closing, green, dawn, credits): fn()
    mid = os.path.join(BUILD, 'score.mid')
    S.write(mid)
    subprocess.run(['fluidsynth', '-ni', '-g', '0.6', '-r', '48000', '-F', out_wav,
                    '-o', 'synth.reverb.room-size=0.55', '-o', 'synth.reverb.damp=0.35', '-o', 'synth.reverb.width=0.9', '-o', 'synth.reverb.level=0.55',
                    '-o', 'synth.chorus.active=0', SF2, mid], check=True, capture_output=True)
    print('music →', out_wav)

if __name__ == '__main__':
    build(os.path.join(BUILD, 'music.wav'))
