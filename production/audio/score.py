"""Original score for 《凌晨三点的 Bug》 (The 3 A.M. Bug), third version.

Written like a film score: eight continuous cues, each with one tempo, one groove and one band, beginning and ending on
story turns rather than on cuts. Inside a cue the accompaniment never stops; it changes only on 4-bar phrase
boundaries, and the story's big moments (the gates, the pounce, the collapse) are placed on downbeats and marked with
a single accent over the groove. Between cues there is silence, and every cue is clamped so it never rings on under
the next one.

The band: a small acoustic group (nylon guitar, vibraphone, upright bass, brushes, with a clarinet and a flute) rendered
with FluidSynth, and a chiptune set synthesized here (pulse lead, 12.5% pulse arpeggios, triangle bass, noise drums)
for the little friend and the code world. Both are summed at fixed weight: no switching per shot.

Everything stays in F major and stays light. Failures get a small shrug. The fix and the green get a cheerful groove,
with no fanfare, strings swell or big hits.

  A  02:50            7.0 – 53    84 bpm   acoustic trio; thins out as he gives up
  B  into the code   58.0 – 82   120 bpm   chiptune: the decision and leap · the code world · the bug and the chase
  C  working together 88.9 – 135.9 105 bpm both bands: search · lunge and log · lantern and maze · eager → collapse
  D1 try again      147.4 – 159  120 bpm   chiptune, lighter
  D2 quiet          160.4 – 178.6 66 bpm   guitar and vibes
  E  closing in     179.0 – 218.6 120 bpm  one sneaky groove; gates and the pounce on downbeats; relief
  F  all green      221.0 – 245   108 bpm  the tune, happily; the jar
  G  dawn · goodnight 245.4 – 281 70 bpm   guitar and flute; the goodnight message typed in chip notes
  I  credits        281.4 – 296  116 bpm   the whole band

Material
  · Theme — a whistleable tune over Fmaj9 | Dm9 | Gm9 | C13sus (and a bridge over Bbmaj7 | Am7 | Gm9 | C7sus)
  · the little friend — a bouncy arpeggio that jumps up (C–F–A … G–A–C)
  · the bug — a chromatic tiptoe that plops back down
  · the code world — F Lydian: Fmaj9#11 and G/F

Outputs (production/build/): music_room.wav and music_chip.wav (the film, level-matched), title_room.wav and
title_chip.wav (the separate title clip).
"""
import json, os, subprocess
import numpy as np
import mido
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 48000
CUES = json.load(open(os.path.join(BUILD, 'cues.json')))
T = CUES['T']
DUR = CUES['DURATION'] + 1.0

NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def p(s):
    if not isinstance(s, str): return int(s)
    s = s.strip(); n = NN[s[0].upper()]; i = 1
    while i < len(s) and s[i] in '#b': n += 1 if s[i] == '#' else -1; i += 1
    return n + 12 * (int(s[i:]) + 1)

# ============================================================================== arrangement container
ACOU = {  # name: (channel, GM program)
    'gtr': (0, 24), 'vib': (1, 11), 'bass': (2, 32), 'pizz': (3, 45), 'clar': (4, 71), 'flute': (5, 73),
    'harm': (6, 31), 'pad': (7, 89), 'xyl': (8, 13), 'mar': (10, 12), 'wood': (11, 115), 'strum': (12, 25),
}
DRUM_CH = 9
CHIP = ('lead', 'sq', 'arp', 'tri', 'tpad', 'bell', 'kick', 'snare', 'hat', 'noise')
rnd = np.random.default_rng(3)

class Arr:
    def __init__(self): self.ev = []; self.drprog = []
    def n(self, t, dur, pitch, vel, inst, bus='film', glide=0):
        self.ev.append(dict(t=float(t), d=max(0.03, float(dur)), p=p(pitch), v=int(max(1, min(127, vel))), i=inst, bus=bus, g=glide, cue=getattr(self, 'cue', None)))
    def ch(self, t, dur, notes, vel, inst, bus='film', roll=0.0):
        for k, q in enumerate(notes.split() if isinstance(notes, str) else notes):
            self.n(t + k * roll, dur - k * roll, q, vel, inst, bus)
    def seq(self, t, beat, spec, vel, inst, bus='film', stacc=None, shift=0, leg=0.95):
        for tok in spec.replace('|', ' ').split():
            q, d = tok.split(':'); d = float(d) * beat
            if q != 'r': self.n(t, d * (stacc or leg), p(q) + shift, vel, inst, bus)
            t += d
        return t
    def dr(self, t, note, vel, bus='film'):
        self.ev.append(dict(t=float(t), d=0.2, p=int(note), v=int(vel), i='dr', bus=bus, g=0, cue=getattr(self, 'cue', None)))
    def kit(self, t, prog, bus='film'): self.drprog.append((t, prog, bus))
    def clamp(self, t_end):
        """end every note of the current cue by t_end, so a cue never rings on under the next one"""
        keep = []
        for e in self.ev:
            if e['cue'] == self.cue and e['bus'] == 'film':
                if e['t'] >= t_end - 0.02: continue
                e['d'] = min(e['d'], t_end - e['t'])
            keep.append(e)
        self.ev = keep
    def scale(self, f):
        """scale the velocity of every note of the current cue (to sit it at the same level as its neighbours)"""
        for e in self.ev:
            if e['cue'] == self.cue: e['v'] = int(max(1, min(127, e['v'] * f)))

A = Arr()

# ------------------------------------------------------------------ harmony
V = {  # name: (bass, voicing)
    'F9':    ('F2', ['F3', 'C4', 'E4', 'G4', 'A4']),
    'Dm9':   ('D2', ['D3', 'A3', 'C4', 'E4', 'F4']),
    'Gm9':   ('G2', ['G3', 'D4', 'F4', 'A4', 'Bb4']),
    'C13':   ('C2', ['C3', 'Bb3', 'D4', 'F4', 'A4']),
    'C7':    ('C2', ['C3', 'G3', 'Bb3', 'E4']),
    'Bb7':   ('Bb1', ['Bb2', 'F3', 'A3', 'D4', 'F4']),
    'Am7':   ('A1', ['A2', 'E3', 'G3', 'C4', 'E4']),
    'Em7':   ('E2', ['E3', 'B3', 'D4', 'G4']),
    'F6':    ('F2', ['F3', 'A3', 'C4', 'D4', 'F4']),
    'Fly':   ('F2', ['F3', 'C4', 'E4', 'G4', 'B4']),       # Fmaj9#11: the code world's wonder
    'G/F':   ('F2', ['G3', 'B3', 'D4', 'G4']),
    'Bb/C':  ('C2', ['Bb2', 'D3', 'F3', 'A3']),
    'Fsus':  ('F2', ['F3', 'Bb3', 'C4', 'G4']),
}
P1 = ['F9', 'Dm9', 'Gm9', 'C13']
P2 = ['Bb7', 'Am7', 'Gm9', 'C13']
THEME_A = 'C5:.5 D5:.5 F5:1 A5:1 G5:.5 F5:.5 | D5:1.5 C5:.5 D5:1 F5:1 | G5:.5 F5:.5 D5:1 Bb4:1 D5:.5 C5:.5 | C5:3 r:1'
THEME_A2 = 'C5:.5 D5:.5 F5:1 A5:1 C6:.5 A5:.5 | G5:1.5 F5:.5 D5:1 F5:1 | E5:.5 D5:.5 C5:1 D5:1 E5:1 | F5:4'
THEME_B = 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 E5:2 | F5:.5 G5:.5 A5:1 Bb5:1 A5:.5 G5:.5 | A5:2 G5:2'
CUBE = 'C5:.25 F5:.25 A5:.5 r:.25 G5:.25 A5:.25 C6:.75'        # 2 beats + a bit
CUBE_Q = 'C5:.25 F5:.25 A5:.5 r:.25 G5:.25 A5:.25 Bb5:.75'     # …ending on a question
BUG = 'E5:.25 F5:.25 F#5:.25 G5:.25 r:.25 C5:.25 r:.5'

def hum(x=0.012): return float(rnd.uniform(-x, x))

def pick(t0, t1, beat, chords, vel=46, inst='gtr', bus='film', pattern=(0, 2, 1, 3, 2, 4, 3, 2)):
    """fingerpicked guitar: thumb on the bass, eighth-note chord tones"""
    t, bar = t0, 0
    while t < t1 - 0.05:
        b, vo = V[chords[bar % len(chords)]]
        A.n(t + hum(), beat * 2.2, p(b) + 12, vel + 4, inst, bus)
        for k in range(1, 8):
            tt = t + k * beat / 2
            if tt >= t1 - 0.02: break
            A.n(tt + hum(), beat * 1.3, vo[pattern[k] % len(vo)], vel - (k % 2) * 7, inst, bus)
        t += beat * 4; bar += 1
    return t

def strum(t0, t1, beat, chords, vel=50, inst='gtr', bus='film', rhythm=(0, 1.5, 2.5, 3.5)):
    t, bar = t0, 0
    while t < t1 - 0.05:
        b, vo = V[chords[bar % len(chords)]]
        for k, off in enumerate(rhythm):
            tt = t + off * beat
            if tt >= t1 - 0.02: break
            A.ch(tt + hum(0.006), beat * (1.4 if k == 0 else 0.9), [p(b) + 12] + [p(q) for q in vo], vel - (0 if k == 0 else 8), inst, bus, roll=0.012)
        t += beat * 4; bar += 1
    return t

def bassline(t0, t1, beat, chords, vel=66, inst='bass', bus='film', walk=False, stacc=0.9):
    t, bar = t0, 0
    while t < t1 - 0.05:
        root = p(V[chords[bar % len(chords)]][0])
        nxt = p(V[chords[(bar + 1) % len(chords)]][0])
        if walk:
            for k, q in enumerate([root, root + 4 if (root % 12) in (5, 10, 0) else root + 3, root + 7, nxt - 1 if nxt > root else nxt + 1]):
                if t + k * beat < t1 - 0.02: A.n(t + k * beat, beat * stacc, q, vel - (k % 2) * 6, inst, bus)
        else:
            A.n(t, beat * 1.8 * stacc, root, vel, inst, bus)
            if t + 2 * beat < t1: A.n(t + 2 * beat, beat * 1.1 * stacc, root + 7, vel - 8, inst, bus)
            if t + 3.5 * beat < t1: A.n(t + 3.5 * beat, beat * 0.4, nxt - 1 if nxt > root else nxt + 1, vel - 14, inst, bus)
        t += beat * 4; bar += 1
    return t

def brushes(t0, t1, beat, vel=1.0, bus='film', fill_last=False):
    t = t0
    while t < t1 - 0.05:
        for b in range(4):
            tb = t + b * beat
            if tb >= t1 - 0.02: break
            if b in (0, 2): A.dr(tb, 36, 34 * vel, bus)
            if b in (1, 3): A.dr(tb, 38, 30 * vel, bus)
            A.dr(tb, 42, 20 * vel, bus); A.dr(tb + beat * 0.55, 42, 13 * vel, bus)
        t += beat * 4
    return t

def chipdrums(t0, t1, beat, vel=1.0, bus='film', busy=False):
    t = t0
    while t < t1 - 0.05:
        for b in range(4):
            tb = t + b * beat
            if tb >= t1 - 0.02: break
            if b in (0, 2) or (busy and b == 3): A.n(tb, 0.2, 36, 90 * vel, 'kick', bus)
            if b in (1, 3): A.n(tb, 0.2, 38, 70 * vel, 'snare', bus)
            A.n(tb, 0.1, 42, 60 * vel, 'hat', bus); A.n(tb + beat / 2, 0.1, 42, 40 * vel, 'hat', bus)
        t += beat * 4
    return t

def chipbass(t0, t1, beat, chords, vel=80, bus='film', eighths=False):
    t, bar = t0, 0
    while t < t1 - 0.05:
        root = p(V[chords[bar % len(chords)]][0])
        seq = [root, root, root + 12, root, root + 7, root, root + 12, root + 7] if eighths else [root, None, root + 7, root + 12]
        step = beat / 2 if eighths else beat
        for k, q in enumerate(seq):
            if q is None: continue
            tt = t + k * step
            if tt < t1 - 0.02: A.n(tt, step * 0.85, q, vel - (k % 2) * 8, 'tri', bus)
        t += beat * 4; bar += 1
    return t

def chiparp(t0, t1, beat, chords, vel=55, bus='film', step=0.5, up=12):
    t, bar, k = t0, 0, 0
    while t < t1 - 0.02:
        vo = V[chords[int((t - t0) // (beat * 4)) % len(chords)]][1]
        seq = [p(q) + up for q in vo]
        A.n(t, beat * step * 0.8, seq[[0, 1, 2, 3, 2, 1][k % 6] % len(seq)], vel, 'arp', bus)
        t += beat * step; k += 1

def chippad(t, dur, chord, vel=50, bus='film'):
    b, vo = V[chord]
    A.n(t, dur, p(b) + 12, vel, 'tpad', bus)
    for q in vo[1:]: A.n(t, dur, q, vel - 6, 'tpad', bus)

# ============================================================================== the film: nine continuous cues
# Each cue is one piece of music with one ensemble and one tempo grid. Cues begin and end on story turns (not on
# cuts), bar lines are placed so the big moments land on downbeats, and between cues there is silence.
class Grid:
    """bar/beat → seconds. Bars count from 1 at t0 (0 and negatives are pickup bars)."""
    def __init__(self, t0, bpm, beats=4): self.t0, self.b, self.n = t0, 60.0 / bpm, beats
    def __call__(self, bar, beat=0.0): return self.t0 + (bar - 1) * self.n * self.b + beat * self.b
    @property
    def bar(self): return self.n * self.b

def pick_half(t0, t1, beat, chords, vel=36, inst='gtr', bus='film'):
    """a sparser guitar: bass + three chord tones per bar"""
    t, bar = t0, 0
    while t < t1 - 0.05:
        b, vo = V[chords[bar % len(chords)]]
        A.n(t + hum(), beat * 3.5, p(b) + 12, vel + 2, inst, bus)
        for k, j in enumerate((1, 3, 2)):
            tt = t + (k + 1) * beat
            if tt < t1 - 0.02: A.n(tt + hum(), beat * 2.2, vo[j % len(vo)], vel - 6, inst, bus)
        t += beat * 4; bar += 1

def cue_a():
    """02:50 — the acoustic trio, from the fade-up to his forehead on the keyboard. Nothing stops for the failures:
    the drums drop out after the first red, the bass after the second, and the guitar carries on alone."""
    A.cue = 'A 02:50'
    g = Grid(7.0, 84); b = g.b
    pick(g(1), g(7), b, ['F9', 'Dm9', 'Gm9', 'C13', 'F9', 'Dm9'], 42)
    bassline(g(2), g(7), b, ['Dm9', 'Gm9', 'C13', 'F9', 'Dm9'], 58)
    brushes(g(2), g(5), b, 0.85)
    A.seq(g(2), b, THEME_A, 56, 'vib')                                       # bars 2–5, landing on the held C
    # bars 7–10: thinner; the bridge, quietly, on clarinet
    pick_half(g(7), g(11), b, ['Bb7', 'Am7', 'Gm9', 'C13'], 36)
    A.seq(g(7), b, THEME_B, 38, 'clar')
    # bars 11–14: the little friend's motif as a question (it is worried about him), then the phrase comes home
    pick(g(11), g(15), b, ['F9', 'Bb7', 'Gm9', 'C13'], 34)
    bassline(g(11), g(15), b, ['F9', 'Bb7', 'Gm9', 'C13'], 44, stacc=1.0)
    A.seq(g(11, 0.5), b, CUBE_Q, 44, 'vib')
    A.seq(g(13), b, 'E5:.5 D5:.5 C5:1 D5:1 E5:1 | G5:2 F5:1 E5:1', 46, 'vib')
    # bars 15–16: slowing down with him … the last chord rings out as his head reaches the keys
    b0, vo = V['F9']
    A.n(g(15), 3.2, p(b0) + 12, 34, 'gtr')
    for k, q in enumerate(vo): A.n(g(15) + 0.5 + k * (0.45 + k * 0.08), 3.0, q, 32 - k * 2, 'gtr')
    A.n(g(15), 3.0, 'F5', 40, 'vib')
    A.ch(49.9, 3.2, 'F2 C3 A3', 26, 'harm')

def chipgroove(t0, t1, b, chords, vel=62, hats=0.6, kick=0, eighths=True):
    """the code world's one groove: triangle bass in eighths, hats on the eighths, and (kick=1) kick on 1 and 3 or
    (kick=2) the full kit. Every chiptune passage in the film sits on this same groove."""
    chipbass(t0, t1, b, chords, vel, eighths=eighths)
    t = t0
    while t < t1 - 0.02:
        for j in range(8):
            tj = t + j * b / 2
            if tj >= t1 - 0.02: break
            A.n(tj, 0.1, 42, (60 if j % 2 == 0 else 40) * hats, 'hat')
            if kick >= 1 and j in (0, 4): A.n(tj, 0.2, 36, 80, 'kick')
            if kick >= 2 and j in (2, 6): A.n(tj, 0.2, 38, 62, 'snare')
        t += 4 * b

def cue_b():
    """into the code — one chiptune piece at 120 bpm in three 4-bar phrases, on one groove that never stops until the
    glitch: the decision and the leap (bars 1–4), the wonder of the code world (5–8), the bug and the chase (9–12).
    The glitch lands on the downbeat of bar 13."""
    A.cue = 'B into the code'
    g = Grid(58.0, 120); b = g.b
    # the groove: quarter-note bass for two bars (a deep breath), then eighths all the way; hats throughout
    chipgroove(g(1), g(3), b, ['F9', 'Gm9'], 50, hats=0.35, eighths=False)
    chipgroove(g(3), g(5), b, ['F9', 'C13'], 58, hats=0.45)
    chipgroove(g(5), g(9), b, ['Fly', 'G/F', 'Fly', 'G/F'], 56, hats=0.4)
    chipgroove(g(9), g(11), b, ['F9', 'Bb7'], 62, hats=0.55, kick=1)
    chipgroove(g(11), g(13), b, ['F9', 'C13'], 66, hats=0.65, kick=2)
    chiparp(g(1), g(13), b, ['F9', 'Gm9', 'F9', 'C13', 'Fly', 'G/F', 'Fly', 'G/F', 'F9', 'Bb7', 'F9', 'C13'], 24)
    # bars 1–4: the little friend's motif (its decision), twice; a climb; the leap (a run up) and the dive (a run
    # down, then a slide as it falls into the code)
    A.seq(g(1), b, CUBE + ' r:1.5 | ' + CUBE + ' r:1.5 | F5:1 G5:1 A5:1 C6:1', 54, 'lead')
    for k, q in enumerate(['C6', 'F6', 'A6', 'C7']): A.n(g(4) + k * b / 4, 0.1, q, 46, 'arp')
    A.ch(g(4, 1), 0.5, 'F5 A5 C6', 44, 'bell')
    A.n(g(4, 2.8), 0.85, 'C6', 42, 'lead', glide=-12)
    # bars 5–8: F Lydian, a soft pad, the tune stretched out
    for k in range(4): chippad(g(5 + k), g.bar, 'Fly' if k % 2 == 0 else 'G/F', 36)
    A.seq(g(5), b, 'C5:1 D5:1 F5:2 | A5:2 B5:1 A5:1 | G5:3 E5:1 | D5:4', 48, 'lead')
    # bars 9–10: the bug's tiptoe; bars 11–12: the chase, call and answer
    A.seq(g(9), b, BUG + ' r:2 | ' + BUG + ' ' + BUG, 52, 'lead', stacc=0.6)
    A.seq(g(11), b, CUBE + ' r:1.5 | ' + BUG + ' C5:.25 F5:.25 A5:.5 C6:1', 56, 'lead', stacc=0.85)
    # the glitch (bar 13, one): the tune stutters, sinks and is gone
    for k in range(6): A.n(g(13) + k * 0.07, 0.06, p('C6') - 2 * k, 46 - k * 6, 'lead')
    A.clamp(g(13) + 0.45)
    A.scale(0.8)

def cue_c():
    """working together — one piece at 105 bpm. Four bars of wonder while he sees them and takes the keyboard, then
    sixteen bars of one groove (his guitar, bass and brushes, with the little friend's chiptune lead doubling the
    vibes) in four 4-bar phrases: search, lunge-and-log, lantern-and-maze, eager. The collapse lands on bar 17, one,
    and is the only place the band stops."""
    A.cue = 'C working together'
    g = Grid(98.0, 105); b = g.b
    # bars −3…0: what are those? (a soft pad, the vibes and the little friend's motif; no drums)
    intro = ['F9', 'Bb7', 'Gm9', 'C13']
    for k, c in enumerate(intro): chippad(g(-3 + k), g.bar, c, 22)
    chiparp(g(-2), g(0), b, intro[1:3], 20)
    A.seq(g(-3, 0.5), b, CUBE, 40, 'vib')
    A.seq(g(-2, 0.5), b, CUBE_Q, 34, 'sq')
    A.seq(g(-1), b, 'A4:1 C5:1 D5:1 F5:1', 38, 'vib')
    for k in range(4): A.ch(g(0, k), b * 0.9, [p(V['C13'][0]) + 12] + [p(q) for q in V['C13'][1]], 28 + k * 5, 'gtr', roll=0.012)
    A.n(g(0, 3.5), b / 2, 'E2', 48, 'bass')
    # the groove, bars 1–16
    prog = P1 + P2 + ['F9', 'Dm9', 'Fly', 'G/F'] + ['Bb7', 'C13', 'Bb7', 'C13']
    vel = [44] * 4 + [40] * 4 + [40] * 4 + [44] * 4
    for k, c in enumerate(prog):
        rh = (0, 1, 1.5, 2, 2.5, 3, 3.5) if k >= 13 else (0, 1.5, 2.5, 3.5)
        strum(g(1 + k), g(2 + k), b, [c], vel[k], rhythm=rh)
        bassline(g(1 + k), g(2 + k), b, [c, prog[(k + 1) % 16]], 58 if k < 12 else 60)
        brushes(g(1 + k), g(2 + k), b, [0.9, 0.9, 0.75, 0.75, 0.8, 0.7, 0.8, 0.8, 0.8, 0.8, 0.65, 0.65, 0.9, 0.95, 1.0, 1.0][k])
    def both(t, spec, v):   # vibes and the chip lead in unison: the two of them working together
        A.seq(t, b, spec, v, 'vib'); A.seq(t, b, spec, v - 14, 'lead')
    # phrase 1 (bars 1–4): the search — the tune; the fake "o" is answered by the bug's tiptoe in the arps
    both(g(1), THEME_A, 54)
    A.seq(g(4), b, BUG + ' ' + BUG, 30, 'arp', stacc=0.5)
    # phrase 2 (bars 5–8): the lunge (a cymbal on one, the bass slides down), dazed (a woozy line), the log (the bridge)
    A.dr(g(5), 49, 34)
    for k, q in enumerate(['C3', 'B2', 'Bb2', 'A2', 'Ab2']): A.n(g(5, 0.5) + k * 0.07, 0.08, q, 52 - k * 3, 'bass')
    both(g(5, 1), 'A5:1 G5:1 F5:1 | G5:1 E5:2 D5:1', 44)
    both(g(7), 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 E5:2', 50)
    # phrase 3 (bars 9–12): the lantern (a bell), following the footprints, then lost among the braces (Lydian)
    A.ch(g(9, 0.5), 0.6, 'C6 F6', 36, 'bell')
    both(g(9), 'C5:.5 D5:.5 F5:1 A5:1 C6:.5 A5:.5 | G5:1.5 F5:.5 D5:1 F5:1', 50)
    both(g(11), 'E5:1 G5:1 B5:2 | A5:1 G5:1 E5:2', 44)
    chiparp(g(11), g(13), b, ['Fly', 'G/F'], 22)
    # phrase 4 (bars 13–16): eager — the tune climbs, and on bar 16 a line climbs note by note (holding backspace)
    both(g(13), 'C5:.5 D5:.5 E5:.5 G5:.5 A5:2 | Bb5:1 A5:.5 G5:.5 A5:2 | C5:.5 D5:.5 E5:.5 G5:.5 A5:2', 50)
    both(g(16), 'C5:1 D5:1 E5:1 F5:1', 46)
    # bar 17, one: the collapse — everything falls down an arpeggio onto a low F
    c = g(17)
    for k, q in enumerate(['F6', 'C6', 'A5', 'F5', 'C5', 'A4', 'F4', 'C4']): A.n(c + 0.05 + k * 0.09, 0.14, q, 44 - k * 2, 'arp')
    A.n(c + 0.1, 1.2, 'F1', 60, 'bass')

def cue_d1():
    """try again — the code world's groove comes back, lighter: the little friend's motif, the bug's taunt, a lunge
    and a flop, the bug gets away, a small pout. Six bars at 120 bpm."""
    A.cue = 'D1 try again'
    g = Grid(147.4, 120); b = g.b
    chipgroove(g(1), g(6), b, ['F9', 'Gm9', 'F9', 'C13', 'F9'], 54, hats=0.45, eighths=False)
    A.seq(g(1), b, CUBE + ' r:1.5 | ' + CUBE_Q + ' r:1.5', 50, 'lead', stacc=0.85)
    A.seq(g(3), b, BUG + ' ' + BUG, 48, 'lead', stacc=0.6)                            # the near miss
    A.seq(g(4), b, 'C5:.5 F5:.5 A5:.5 r:1', 46, 'lead')
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(g(4, 3) + k * 0.05, 0.08, q, 48, 'lead')   # the lunge …
    A.n(g(5), 0.6, 'F3', 58, 'tri', glide=-7)                                                        # … the flop
    for j in range(4): A.seq(g(5, j), b, BUG, 32, 'arp', stacc=0.5, shift=j * 2)                   # it bounces away
    A.n(g(6), b, 'A5', 38, 'sq'); A.n(g(6, 1), b * 2, 'G5', 34, 'sq'); A.n(g(6), g.bar * 0.75, 'F2', 42, 'tri')
    A.clamp(g(6) + g.bar * 0.8)

def cue_d2():
    """the quiet moment — guitar and vibes, very soft; the little friend's motif answers once, when it waves."""
    A.cue = 'D2 quiet'
    g = Grid(160.4, 66); b = g.b
    ch = ['F9', 'Am7', 'Bb7', 'C13', 'F9']
    pick(g(1), g(6), b, ch, 32)
    bassline(g(1), g(6), b, ch, 40, stacc=1.0)
    for k, c in enumerate(ch): chippad(g(1 + k), g.bar, c, 20)
    A.seq(g(1), b, THEME_A, 44, 'vib')
    A.seq(172.2, 0.4, CUBE, 34, 'sq')
    A.seq(g(5), b, 'A5:1 G5:1 F5:2', 42, 'vib')
    A.clamp(g(6))

def cue_e():
    """closing in — one sneaky groove at 120 bpm (walking bass, side stick, guitar chops, the chiptune lead) from the
    idea to the catch. The two gates land on downbeats. While the bug hides, the same groove goes on tiptoe; the pounce
    is bar 14, one, and the band comes back in full for the catch. It ends by slowing into relief on a waiting chord."""
    A.cue = 'E closing in'
    g = Grid(180.5, 120); b = g.b
    # the idea: a bright note and a run up into the groove
    A.n(179.0, 1.0, 'C6', 52, 'vib')
    for k, q in enumerate(['F4', 'A4', 'C5', 'E5', 'G5']): A.n(g(0, 2) + k * b / 2, 0.2, q, 38, 'vib')
    # the groove, bars 1–17 (tiptoe in bars 9–13: quarter notes, softer, no chops)
    walk = ['F2', 'A2', 'C3', 'Eb3', 'D3', 'C3', 'A2', 'Ab2']
    for k in range(17 * 8):
        t = g(1) + k * b / 2; bar = 1 + k // 8
        hide = 9 <= bar <= 13
        if hide and k % 2: continue
        A.n(t, b * (0.5 if hide else 0.28), walk[k % 8], (44 if hide else 60 if k % 2 == 0 else 50), 'bass')
        if k % 4 == 2 and not hide: A.dr(t, 37, 38)
        if hide: A.dr(t + b / 2, 42, 12)
        elif k % 2 == 1: A.dr(t, 42, 16); A.ch(t, 0.12, 'F3 A3 Eb4', 30, 'gtr')
    motif = 'F5:.5 r:.5 Ab5:.25 A5:.25 r:.5 C6:.5 r:.5 A5:.5 r:.5 | F5:.5 r:.5 Eb5:.5 D5:.5 C5:1 r:1'
    for bar in (2, 4, 6):
        A.seq(g(bar), b, motif, 46, 'lead', stacc=0.6); A.seq(g(bar), b, motif, 36, 'xyl', stacc=0.6)
    for gt in CUES['gates']:   # each gate: a hit on the downbeat, over the groove
        A.ch(gt, 0.3, 'F2 C3', 62, 'bass'); A.dr(gt, 36, 56); A.ch(gt, 0.3, 'F3 A3 Eb4 G4', 44, 'gtr')
    # bars 6–8: the light floods in (a held chord), the bug panics (its tiptoe, everywhere)
    chippad(g(6), g.bar * 3, 'Fly', 26)
    for j in range(6): A.seq(g(7, j * 1.33), b, BUG, 30, 'arp', stacc=0.5, shift=(j % 3) * 2)
    # bars 9–13: hiding — the little friend's steps, a question, sly, a snare wind-up into the pounce
    for k, q in enumerate(['C5', 'D5', 'E5', 'F5']): A.n(g(11, k), b * 0.4, q, 38, 'sq')
    A.seq(g(12, 0.2), b, 'G5:1 C6:1', 40, 'sq')
    t = g(13, 2.6)
    while t < g(14): A.dr(t, 38, 14 + (t - g(13, 2.6)) * 40); t += b / 4
    # bars 14–17: the pounce (a cymbal on one), the catch — the full groove with brushes, the little friend's tune
    A.dr(g(14), 36, 56); A.dr(g(14), 49, 30)
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(g(14) + k * 0.05, 0.08, q, 46, 'lead')
    brushes(g(14), g(18), b, 0.7)
    A.seq(g(15), b, CUBE + ' r:.25 C5:.25 F5:.25 A5:.5 | ' + CUBE + ' r:1.5', 46, 'lead')
    A.seq(g(17), b, 'A4:.5 C5:.5 D5:.5 F5:1 r:1.5', 44, 'vib')
    # bars 18–19 (at half speed): relief — the phrase comes home and waits on a suspended chord
    g2 = Grid(g(18), 60); b2 = g2.b
    pick(g2(1), g2(2), b2, ['Bb7'], 32)
    A.seq(g2(1), b2, 'E5:.5 D5:.5 C5:1 D5:1 E5:1', 42, 'vib')
    A.ch(217.4, 1.2, [p('C2') + 12] + [p(q) for q in V['C13'][1]], 30, 'gtr', roll=0.04)

def cue_f():
    """all green — a bright "ding-ding" and the band plays the tune, happily (no fanfare), on through his cheer and
    the jar (the same groove; the bug's tiptoe turns friendly), ending on a plain F chord."""
    A.cue = 'F all green'
    A.n(T['green'] + 0.05, 0.5, 'C6', 50, 'vib'); A.n(T['green'] + 0.3, 1.0, 'F6', 50, 'vib')
    g = Grid(221.5, 108); b = g.b
    prog = P1 + P2 + ['F9', 'C13', 'Gm9', 'C13']
    strum(g(1), g(11), b, prog, 42); bassline(g(1), g(11), b, prog, 56)
    brushes(g(1), g(7), b, 0.85); brushes(g(7), g(11), b, 0.65)
    A.seq(g(1), b, THEME_A2, 52, 'vib'); A.seq(g(1), b, THEME_A2, 38, 'lead')
    A.seq(g(5), b, 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 E5:2', 50, 'vib'); A.seq(g(5), b, 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 E5:2', 36, 'lead')
    # bars 7–8: the jar — the bug's tiptoe, made friendly, over the same groove
    A.seq(g(7), b, BUG.replace('F#5', 'G5') + ' r:2 | ' + BUG.replace('F#5', 'G5') + ' r:2', 42, 'lead', stacc=0.5)
    A.seq(g(7), b, 'r:2 A5:.5 G5:.5 F5:1 | r:2 C6:.5 A5:.5 G5:1', 40, 'vib')
    # bars 9–10: the phrase comes home; bar 11: a plain F chord
    A.seq(g(9), b, 'E5:.5 D5:.5 C5:1 D5:1 E5:1 | G5:2 E5:2', 46, 'vib')
    A.ch(g(11), 1.2, 'F2 C3 A3 F4', 40, 'gtr', roll=0.04); A.n(g(11), 1.2, 'F5', 42, 'vib'); A.n(g(11), 1.1, 'F2', 44, 'bass')
    A.clamp(g(11) + 1.2)

def cue_g():
    """dawn to goodnight — one slow piece at 70 bpm on guitar: the flute at sunrise, a few bars of near-silence while
    he sleeps, the little friend typing its message one soft chip note per character, and the tune's last phrase."""
    A.cue = 'G dawn · goodnight'
    g = Grid(245.4, 70); b = g.b
    # bars 1–4: sunrise
    pick(g(1), g(4), b, ['F9', 'Bb7', 'Am7'], 34)
    A.seq(g(1, 1), b, 'C5:.5 D5:.5 F5:1 A5:1 G5:.5 F5:.5 | D5:3 r:1', 40, 'flute')
    A.seq(g(3, 2), b, 'G5:.5 F5:.5 D5:1 | Bb4:1 D5:.5 C5:.5 C5:2', 30, 'vib')
    pick_half(g(4), g(5), b, ['Gm9'], 28)
    # bars 5–8: asleep; the little friend goes home and types (the guitar keeps the time underneath)
    pick_half(g(5), g(9), b, ['F9', 'Bb7', 'F9', 'Dm9'], 24)
    A.ch(g(5), g.bar * 0.9, 'F3 C4 G4', 18, 'harm')
    msg = CUES['MSG']
    notes = ['C5', 'D5', 'F5', 'A5', 'G5', 'F5', 'D5', 'F5', 'C6']
    for k in range(len(msg['text'])): A.n(msg['t0'] + k / msg['rate'], 0.35, notes[k % len(notes)], 36, 'sq')
    # bars 9–10: the tune's last phrase; it ends on F as the credits come up
    pick(g(9), g(10), b, ['Gm9'], 30)
    A.seq(g(9), b, 'E5:.5 D5:.5 C5:1 D5:1 E5:1', 38, 'vib')
    A.ch(g(10), 3.0, 'F2 C3 A3 E4', 30, 'gtr', roll=0.06); A.n(g(10), 3.0, 'F5', 36, 'vib')
    A.clamp(281.2)

def cue_i():
    """credits — the whole band, the tune from the top."""
    A.cue = 'I credits'
    g = Grid(281.4, 116); b = g.b
    prog = P1 + P2[:2]
    strum(g(1), g(7), b, prog, 40); bassline(g(1), g(7), b, prog, 54); brushes(g(1), g(7), b, 0.85)
    chiparp(g(3), g(7), b, prog[2:], 22)
    A.seq(g(1), b, THEME_A2, 50, 'vib'); A.seq(g(1), b, THEME_A2, 34, 'lead')
    A.seq(g(5), b, 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 E5:2', 46, 'vib')
    A.ch(g(7), 1.8, 'F2 C3 A3 F4', 40, 'gtr', roll=0.04); A.n(g(7), 1.8, 'F5', 44, 'vib'); A.n(g(7), 1.2, 'F6', 30, 'bell')

CUE_FNS = (cue_a, cue_b, cue_c, cue_d1, cue_d2, cue_e, cue_f, cue_g, cue_i)

def title():
    # the title card (a separate clip): the letters type in, the little friend hops on and waves
    B = 'title'
    A.ch(0.5, 5.0, 'F3 C4 E4 G4', 26, 'harm', bus=B); chippad(0.5, 5.0, 'F9', 24, bus=B)
    notes = ['C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6']
    for i in range(1, 10): A.n(0.8 + i * 1.5 / 9, 0.3, notes[i - 1], 40, 'sq', bus=B)
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(3.0 + k * 0.1, 0.12, q, 44, 'arp', bus=B)
    A.n(3.56, 0.3, 'F2', 70, 'tri', bus=B); A.ch(3.56, 1.5, 'F3 A3 C4 E4', 40, 'vib', bus=B)
    A.seq(4.25, 0.3, CUBE, 44, 'lead', bus=B); A.seq(4.3, 0.3, CUBE, 36, 'vib', bus=B)

# ============================================================================== rendering: the acoustic band (FluidSynth)
def render_acoustic(bus, out_wav):
    mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))            # 960 ticks per second
    ev = []
    pans = {'gtr': 54, 'vib': 72, 'bass': 64, 'pizz': 48, 'clar': 80, 'flute': 76, 'harm': 58, 'pad': 64, 'xyl': 86, 'mar': 70, 'wood': 60, 'strum': 54}
    for name, (ch, prog) in ACOU.items():
        ev += [(0, 0, 'prog', ch, prog, 0), (0, 1, 'cc', ch, 7, 100), (0, 1, 'cc', ch, 10, pans[name]), (0, 1, 'cc', ch, 91, 62), (0, 1, 'cc', ch, 93, 10)]
    ev += [(0, 0, 'prog', DRUM_CH, 40, 0), (0, 1, 'cc', DRUM_CH, 7, 96), (0, 1, 'cc', DRUM_CH, 91, 40)]
    for t, prog, b in A.drprog:
        if b == bus: ev.append((t, 0, 'prog', DRUM_CH, prog, 0))
    for e in A.ev:
        if e['bus'] != bus: continue
        if e['i'] == 'dr': ch = DRUM_CH
        elif e['i'] in ACOU: ch = ACOU[e['i']][0]
        else: continue
        ev.append((e['t'], 4, 'on', ch, e['p'], e['v'])); ev.append((e['t'] + e['d'], 3, 'off', ch, e['p'], 0))
    last = 0
    for t, o, kind, ch, a, b in sorted(ev, key=lambda x: (x[0], x[1])):
        tick = int(round(max(0, t) * 960)); dt = tick - last; last = tick
        if kind == 'on': m = mido.Message('note_on', channel=ch, note=a, velocity=b, time=dt)
        elif kind == 'off': m = mido.Message('note_off', channel=ch, note=a, velocity=0, time=dt)
        elif kind == 'prog': m = mido.Message('program_change', channel=ch, program=a, time=dt)
        else: m = mido.Message('control_change', channel=ch, control=a, value=b, time=dt)
        tr.append(m)
    midf = out_wav.replace('.wav', '.mid')
    mid.save(midf)
    subprocess.run(['fluidsynth', '-ni', '-g', '0.7', '-r', str(SR), '-F', out_wav,
                    '-o', 'synth.reverb.room-size=0.45', '-o', 'synth.reverb.damp=0.4', '-o', 'synth.reverb.width=0.8', '-o', 'synth.reverb.level=0.5',
                    '-o', 'synth.chorus.active=0', SF2, midf], check=True, capture_output=True)

# ============================================================================== rendering: the chiptune set (synthesized)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def polyblep(ph, dt):
    y = np.zeros_like(ph)
    a = ph < dt; x = ph[a] / dt[a]; y[a] = x + x - x * x - 1
    b = ph > 1 - dt; x = (ph[b] - 1) / dt[b]; y[b] = x * x + x + x + 1
    return y
def pulse(f, duty):
    dt = np.maximum(f / SR, 1e-6)
    ph = np.cumsum(dt) % 1.0
    y = np.where(ph < duty, 1.0, -1.0)
    return y + polyblep(ph, dt) - polyblep((ph + 1 - duty) % 1.0, dt)
def tri(f):
    ph = np.cumsum(f / SR) % 1.0
    return 4 * np.abs(ph - 0.5) - 1
def adsr(n, a, d, s, r, sr=SR):
    na, nd, nr = int(a * sr), int(d * sr), int(r * sr)
    ns = max(0, n - na - nd)
    e = np.concatenate([np.linspace(0, 1, max(1, na), endpoint=False), np.linspace(1, s, max(1, nd), endpoint=False), np.full(ns, s)])[:n]
    return np.concatenate([e, np.linspace(e[-1] if len(e) else s, 0, max(1, nr))])
noise_rng = np.random.default_rng(12)

def chip_note(e):
    kind, d, m, v = e['i'], e['d'], e['p'], (e['v'] / 100) ** 1.4
    n = int(d * SR)
    t = np.arange(n) / SR
    if kind in ('kick', 'snare', 'hat', 'noise'):
        if kind == 'kick':
            L = int(0.18 * SR); tt = np.arange(L) / SR
            f = 45 + 115 * np.exp(-tt * 40)
            return 0.9 * v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18)
        if kind == 'snare':
            L = int(0.14 * SR); tt = np.arange(L) / SR
            nz = signal.lfilter(*signal.butter(2, [1200 / (SR / 2), 7000 / (SR / 2)], 'band'), noise_rng.standard_normal(L))
            return 0.55 * v * (nz * np.exp(-tt * 26) + 0.4 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 40))
        if kind == 'hat':
            L = int(0.05 * SR); tt = np.arange(L) / SR
            nz = signal.lfilter(*signal.butter(2, 7000 / (SR / 2), 'high'), noise_rng.standard_normal(L))
            return 0.22 * v * nz * np.exp(-tt * 90)
        # a raspberry / bonk: buzzy low noise with a pitch drop
        L = max(n, int(0.2 * SR)); tt = np.arange(L) / SR
        f = hz(m) * 2 ** ((e['g'] or 0) * np.minimum(1, tt / max(0.05, d)) / 12)
        buzz = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + noise_rng.standard_normal(L) * 0.3
        buzz = signal.lfilter(*signal.butter(2, 2200 / (SR / 2), 'low'), buzz)
        return 0.5 * v * buzz * np.minimum(1, tt / 0.005) * np.exp(-tt * 6)
    # pitched voices: the oscillator runs through the release tail; a glide reaches its target at the note's end
    f0 = hz(m)
    rel = {'lead': 0.06, 'sq': 0.12, 'arp': 0.05, 'tri': 0.04, 'tpad': 0.5}.get(kind, 0.05)
    Ltot = n + int(rel * SR)
    tt = np.arange(Ltot) / SR
    f = f0 * 2 ** ((e['g'] or 0) * np.minimum(1, tt / max(1e-3, d)) / 12)
    if kind == 'lead':
        f = f * (1 + (0.005 * np.sin(2 * np.pi * 5.6 * tt)) * np.clip((tt - 0.16) / 0.15, 0, 1))
        y = pulse(f, 0.25); env = adsr(n, 0.004, 0.09, 0.7, rel); g = 0.2
    elif kind == 'sq':
        f = f * (1 + (0.004 * np.sin(2 * np.pi * 5.2 * tt)) * np.clip((tt - 0.2) / 0.2, 0, 1))
        y = pulse(f, 0.5); env = adsr(n, 0.008, 0.12, 0.55, rel); g = 0.13
    elif kind == 'arp':
        y = pulse(f, 0.125); env = adsr(n, 0.002, 0.06, 0.35, rel); g = 0.12
    elif kind == 'tri':
        y = tri(f); env = adsr(n, 0.003, 0.05, 0.85, rel); g = 0.42
    elif kind == 'tpad':
        y = 0.5 * tri(f * 1.0035) + 0.5 * tri(f / 1.0035); env = adsr(n, 0.25, 0.3, 0.8, rel); g = 0.11
    elif kind == 'bell':
        L = max(n, int(0.9 * SR)); tb = np.arange(L) / SR
        y = (pulse(np.full(L, f0), 0.5) * 0.5 + np.sin(2 * np.pi * 2 * f0 * tb) * 0.5) * np.exp(-tb * 5.5)
        return 0.15 * v * y * np.minimum(1, tb / 0.002)
    else:
        return np.zeros(1)
    k = min(len(y), len(env))
    return g * v * y[:k] * env[:k]

PAN = {'lead': 0.0, 'sq': 0.15, 'arp': 0.3, 'tri': 0.0, 'tpad': 0.0, 'bell': -0.2, 'kick': 0.0, 'snare': 0.05, 'hat': -0.25, 'noise': 0.0}
def render_chip(bus, out_wav, dur):
    N = int(dur * SR) + SR
    L = np.zeros(N, np.float32); R = np.zeros(N, np.float32); echo = np.zeros(N, np.float32)
    for e in A.ev:
        if e['bus'] != bus or e['i'] not in CHIP: continue
        y = chip_note(e).astype(np.float32)
        i = int(e['t'] * SR)
        if i >= N: continue
        y = y[:N - i]
        a = (PAN[e['i']] + 1) * np.pi / 4
        if e['i'] == 'tpad':   # a little width
            L[i:i + len(y)] += y * 0.9; R[i:i + len(y)] += y * 0.9
        else:
            L[i:i + len(y)] += y * np.cos(a); R[i:i + len(y)] += y * np.sin(a)
        if e['i'] in ('arp', 'lead', 'bell', 'sq'): echo[i:i + len(y)] += y
    # a dotted-eighth echo, panned wide, and a gentle top-end smoothing
    dl = int(0.27 * SR)
    ech = np.zeros(N, np.float32); ech[dl:] = echo[:-dl] * 0.22
    ech2 = np.zeros(N, np.float32); ech2[2 * dl:] = echo[:-2 * dl] * 0.1
    L += ech2; R += ech
    b, a2 = signal.butter(2, 9000 / (SR / 2), 'low')
    st = np.stack([signal.lfilter(b, a2, L), signal.lfilter(b, a2, R)], 1).astype(np.float32)
    sf.write(out_wav, st, SR, subtype='PCM_24')

def loud(x):
    blk = int(0.4 * SR); m = x.mean(1) if x.ndim > 1 else x
    rms = np.sqrt(np.array([np.mean(m[i:i + blk] ** 2) for i in range(0, len(m) - blk, blk)]) + 1e-12)
    act = rms[rms > 10 ** (-45 / 20)]
    return 20 * np.log10(np.sqrt(np.mean(act ** 2))) if len(act) else -99

def cue_report():
    """print each cue's span and check that no two cues overlap (beyond a short ringing tail)"""
    spans = {}
    for e in A.ev:
        if e['bus'] != 'film': continue
        a, b = spans.get(e['cue'], (1e9, -1e9)); spans[e['cue']] = (min(a, e['t']), max(b, e['t'] + e['d']))
    order = sorted(spans.items(), key=lambda kv: kv[1][0])
    for (c, (a, b)) in order: print(f'  {c:22s} {a:7.2f} → {b:7.2f}  ({b - a:5.1f} s)')
    for (c1, (a1, b1)), (c2, (a2, b2)) in zip(order, order[1:]):
        if b1 - a2 > 1.5: print(f'  !! {c1} overlaps {c2} by {b1 - a2:.1f} s')

CHIP_K = 0.43

def build():
    for fn in CUE_FNS: fn()
    A.cue = 'title'; title()
    cue_report()
    render_acoustic('film', os.path.join(BUILD, 'music_room.wav'))
    render_chip('film', os.path.join(BUILD, 'music_chip.wav'), DUR)
    render_acoustic('title', os.path.join(BUILD, 'title_room.wav'))
    render_chip('title', os.path.join(BUILD, 'title_chip.wav'), 7.5)
    # the chiptune voices are much hotter than the soundfont's: a fixed trim brings them to about the same loudness. The mix then sums the
    # two stems at fixed, equal weight everywhere (they are one band, not two to switch between)
    room, _ = sf.read(os.path.join(BUILD, 'music_room.wav'), dtype='float32')
    chip, _ = sf.read(os.path.join(BUILD, 'music_chip.wav'), dtype='float32')
    k = CHIP_K
    print(f'chip/room balance: {loud(chip) + 20 * np.log10(k) - loud(room):+.1f} dB')
    sf.write(os.path.join(BUILD, 'music_chip.wav'), chip * k, SR, subtype='PCM_24')
    tc, _ = sf.read(os.path.join(BUILD, 'title_chip.wav'), dtype='float32')
    sf.write(os.path.join(BUILD, 'title_chip.wav'), tc * k, SR, subtype='PCM_24')
    print(f'music: chip ×{k:.2f}; {len([e for e in A.ev if e["bus"] == "film"])} notes')

if __name__ == '__main__':
    build()
