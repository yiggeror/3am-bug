"""Original score for 《凌晨三点的 Bug》 (The 3 A.M. Bug), second version.

One tune, two timbres. In his room the music is a small acoustic band: nylon guitar, vibraphone, upright bass and
brushes, with a clarinet, a flute and pizzicato for colour. Inside the code the same arrangement is played on a
chiptune set synthesized here: pulse lead, 12.5% pulse arpeggios, triangle bass, noise drums. The mix
(production/audio/mix.py) switches between the two stems on every cut, so the same melody changes clothes when we go
through the screen.

Everything stays in F major and stays light. Failures get a small deflating shrug. The fix and the green get a
cheerful little groove, with no fanfare, strings swell or big hits.

Material
  · Theme — a whistleable tune over Fmaj9 | Dm9 | Gm9 | C13sus (and a bridge over Bbmaj7 | Am7 | Gm9 | C7sus)
  · the little friend — a bouncy arpeggio that jumps up (C–F–A … G–A–C)
  · the bug — a chromatic tiptoe that plops back down
  · the code world — F Lydian: Fmaj9#11 and G/F, slow and sparkly

Outputs (production/build/): music_room.wav, music_chip.wav (the film), title_room.wav, title_chip.wav (the title clip).
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
        self.ev.append(dict(t=float(t), d=max(0.03, float(dur)), p=p(pitch), v=int(max(1, min(127, vel))), i=inst, bus=bus, g=glide))
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
        self.ev.append(dict(t=float(t), d=0.2, p=int(note), v=int(vel), i='dr', bus=bus, g=0))
    def kit(self, t, prog, bus='film'): self.drprog.append((t, prog, bus))

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

# ============================================================================== the film
def night():
    # 02:50 — a cosy, slightly sleepy groove. The picture fades up from black; the band comes in with it.
    beat = 60 / 84
    t0 = 7.0
    pick(t0, 17.45, beat, P1, 42)
    bassline(t0 + 4 * beat, 17.45, beat, P1[1:] + P1[:1], 60)
    brushes(t0 + 4 * beat, 17.3, beat, 0.9)
    A.seq(t0 + 4 * beat, beat, THEME_A, 58, 'vib')
    # red again → a small deflating shrug (vibes step down, the bass slides, nothing scary)
    f = T['fail1']
    A.n(f + 0.02, 0.35, 'G4', 50, 'vib'); A.n(f + 0.38, 1.2, 'E4', 44, 'vib')
    for k, q in enumerate(['C3', 'B2', 'Bb2', 'A2']): A.n(f + 0.05 + k * 0.12, 0.14 if k < 3 else 0.9, q, 58 - k * 4, 'bass')
    # trying again: guitar alone, a questioning bridge line
    pick(18.6, 23.7, beat, ['Bb7', 'Am7'], 36)
    A.seq(19.3, beat, 'D5:1 F5:.5 A5:.5 C6:1 A5:1 | G5:1 E5:.5 C5:.5 D5:2', 42, 'vib')
    # the second failure — on the screen: the same shrug, a little lower, in both timbres
    f = T['fail2']
    for inst, v in (('vib', 50), ('lead', 60)):
        A.n(f + 0.02, 0.3, 'F4', v, inst); A.n(f + 0.33, 0.3, 'E4', v - 4, inst); A.n(f + 0.64, 1.1, 'D4', v - 8, inst)
    for k, q in enumerate(['G2', 'F#2', 'F2', 'E2']): A.n(f + 0.05 + k * 0.12, 0.14 if k < 3 else 1.2, q, 56 - k * 4, 'bass')
    for k, q in enumerate(['G2', 'F#2', 'F2', 'E2']): A.n(f + 0.05 + k * 0.12, 0.14 if k < 3 else 1.2, q, 70, 'tri')
    A.n(f + 1.0, 0.1, 'C5', 44, 'pizz')
    A.ch(24.9, 1.4, 'C4 F4 G4', 30, 'harm'); A.ch(24.9, 1.4, 'C4 F4 G4', 34, 'tpad')
    # reading the error … the frustration builds (comic, not tense): a pizz tick that speeds up, a clarinet trill
    t, dt = 26.3, 0.72
    while t < 28.9: A.n(t, 0.1, 'A3' if int(t * 10) % 2 else 'E4', 40, 'pizz'); t += dt; dt = max(0.18, dt * 0.84)
    t = 28.95
    while t < 30.5: A.n(t, 0.08, 'A4', 44 + (t - 28.95) * 10, 'pizz'); t += 0.11
    t = 29.1
    while t < 30.5: A.n(t, 0.06, 'G5', 40, 'clar'); A.n(t + 0.06, 0.06, 'A5', 40, 'clar'); t += 0.12
    # hands slide down his face: the clarinet slides down with them
    for k, q in enumerate(['A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'Bb4', 'A4']): A.n(30.6 + k * 0.07, 0.09 if k < 7 else 0.9, q, 44 - k * 2, 'clar')
    A.ch(31.3, 1.7, 'D3 A3 C4 F4', 30, 'gtr', roll=0.05)
    # the little friend, worried: its motif, asked as a question (chiptune, from the screen)
    A.seq(33.5, 0.34, CUBE_Q, 52, 'sq'); chippad(33.4, 3.6, 'Dm9', 34)
    A.seq(35.4, 0.4, 'A5:.5 G5:.5 F5:1', 44, 'sq'); A.n(33.8, 0.3, 'C7', 30, 'bell')
    A.ch(33.4, 3.4, 'D3 A3 F4', 22, 'gtr', roll=0.06)
    # rubbing his eyes, the big sigh: warm and kind ("it's ok"), never minor-key sad
    beat = 60 / 72
    pick(37.4, 45.0, beat, ['F9', 'Em7', 'Dm9', 'C13'], 36)
    A.seq(41.5, beat, 'A4:1 G4:1 F4:2', 44, 'vib')
    # his head sinks to the keyboard: the guitar slows down with him
    for k, (tt, c) in enumerate([(45.4, 'F9'), (46.9, 'Dm9'), (48.5, 'Bb7')]):
        b, vo = V[c]
        A.n(tt, 2.0, p(b) + 12, 36, 'gtr')
        for j, q in enumerate(vo[1:]): A.n(tt + 0.25 + j * (0.26 + k * 0.05), 1.6, q, 32 - k * 3, 'gtr')
    A.ch(T['headDown'], 2.5, 'F2 C3 A3', 30, 'harm')
    # the keyboard types garbage by itself: a small chip ostinato — h, j, k (vim keys!) on three notes
    notes = {'h': 'C5', 'j': 'D5', 'k': 'E5'}
    s = 'hhjjjjjjjjkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk'
    for k, ch in enumerate(s):
        tt = T['headDown'] + k * 6 / 44
        if tt < T['garbage'] + 0.2: continue
        A.n(tt, 0.06, notes[ch], 26 + (k % 4 == 0) * 10, 'arp')
    A.seq(53.55, 0.3, 'G5:1 C6:2', 50, 'sq')                                     # ?
    A.ch(56.2, 2.0, 'F4 A4 D5', 30, 'tpad')                                       # it looks up at him

def dive():
    r = T['resolve']
    # a deep breath and a nod: a rising chip build over a triangle pedal
    t = r + 0.4
    while t < 61.2: A.n(t, 0.2, 'F2', 60 + (t - r) * 6, 'tri'); t += 0.3
    for k, c in enumerate(['F9', 'Gm9', 'Am7']):
        vo = V[c][1]
        for j in range(4): A.n(r + 0.6 + k * 0.85 + j * 0.2, 0.18, p(vo[j % len(vo)]) + 12, 40 + k * 8, 'arp')
    A.ch(61.25, 0.5, 'F5 A5 C6', 56, 'bell')
    # the march along the prompt
    beat = 60 / 132
    chipdrums(61.7, 63.4, beat, 0.8)
    chipbass(61.7, 63.4, beat, ['F9'], 76)
    A.seq(61.7, beat, CUBE + ' r:.75 ' + CUBE, 64, 'lead')
    # at the edge: hold … (a snare roll), the leap (up), the dive (down)
    t = 63.4
    while t < 64.0: A.n(t, 0.05, 38, 30 + (t - 63.4) * 80, 'snare'); t += 0.06
    A.n(63.4, 0.6, 'C4', 50, 'sq'); A.n(63.4, 0.6, 'C3', 60, 'tri')
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6', 'F6', 'A6', 'C7']): A.n(64.0 + k * 0.1, 0.12, q, 56, 'arp')
    A.ch(64.9, 0.6, 'F5 A5 C6', 54, 'bell'); A.n(64.9, 0.3, 36, 80, 'kick')
    for k, q in enumerate(['C7', 'A6', 'F6', 'C6', 'A5', 'F5', 'C5']): A.n(65.0 + k * 0.1, 0.12, q, 46 - k * 3, 'arp')
    chippad(65.7, 0.8, 'Fsus', 40)
    # falling into the code world: a sliding whistle
    A.n(66.5, 0.9, 'C6', 48, 'lead', glide=-12)
    A.n(67.4, 0.3, 36, 90, 'kick'); A.n(67.4, 0.5, 'F2', 80, 'tri')
    # the reveal: F Lydian, slow and sparkly — the theme, stretched out
    for k in range(4):
        chippad(67.6 + k * 1.45, 1.6, 'Fly' if k % 2 == 0 else 'G/F', 44)
    chiparp(67.6, 73.3, 0.36, ['Fly', 'G/F'], 34, step=0.5)
    A.seq(68.2, 0.55, 'C5:1 D5:1 F5:2 A5:2 G5:1 F5:1 | E5:4', 50, 'lead')
    # the bug: its tiptoe, a raspberry, the little friend's "!" and "hmph"
    b = T['bugAppear']
    A.n(b, 0.1, 'B6', 50, 'bell')
    A.seq(b + 0.5, 0.3, BUG + ' ' + BUG, 60, 'lead', stacc=0.6)
    A.n(74.75, 0.35, 'G3', 60, 'noise', glide=-5)
    A.n(73.95, 0.2, 'C7', 50, 'bell')
    t = 75.0
    while t < 77.8: A.n(t, 0.12, 'F2' if int((t - 75) / 0.3) % 2 == 0 else 'C3', 60, 'tri'); t += 0.3
    A.n(76.45, 0.2, 38, 80, 'snare')
    t = 77.9
    while t < 78.55: A.n(t, 0.04, 38, 30 + (t - 77.9) * 60, 'snare'); t += 0.05
    # the chase: quick, bright, cartoony
    beat = 60 / 150
    chipdrums(78.6, 82.0, beat, 0.72, busy=True)
    chipbass(78.6, 82.0, beat, ['F9', 'F9', 'Bb7', 'C13'], 80, eighths=True)
    t = A.seq(78.6, beat, CUBE + ' r:1.25 ' + BUG + ' r:.25 ' + CUBE + ' r:1.25', 62, 'lead', stacc=0.8)
    # the glitch: the tune stutters and drops out
    for k in range(6): A.n(82.0 + k * 0.1, 0.08, p('C6') - k, 50 - k * 5, 'lead')

def together():
    # he is still head-down; the screen flickers — short chip stutters leak out of it
    for g in CUES['glitches']:
        q = ['C6', 'A5', 'F5', 'G5', 'D6'][int(g['t'] * 12) % 5]
        A.n(g['t'], 0.08, q, 30 + 30 * g['k'], 'arp'); A.n(g['t'] + 0.04, 0.05, 42, 50, 'hat')
    # he bolts upright: a little "ta?!"
    A.ch(85.21, 0.4, 'F4 A4 C5 D5', 56, 'vib'); A.n(85.21, 0.1, 'C5', 50, 'pizz'); A.n(85.21, 0.2, 'A3', 60, 'wood')
    A.seq(86.2, 0.45, 'C5:1 F5:1 r:.5 D5:1 G5:1.5', 40, 'vib')
    # what are those? the tiny figures — their motifs, softly (guitar in the room, chip on the screen)
    A.ch(88.2, 2.0, 'F3 C4 E4 A4', 30, 'gtr', roll=0.08)
    A.seq(88.8, 0.34, CUBE, 40, 'vib')
    A.seq(90.5, 0.3, CUBE, 44, 'sq'); A.seq(91.6, 0.3, BUG, 40, 'arp', stacc=0.6); chippad(90.4, 2.6, 'F9', 30)
    # the double take (pizz) … a knuckle crack … let's go
    for dt, q in [(0.15, 'F4'), (0.4, 'F4'), (1.25, 'C5'), (2.4, 'A4'), (2.85, 'C5'), (3.3, 'F5')]: A.n(93.0 + dt, 0.12, q, 44, 'pizz')
    A.seq(95.4, 0.35, 'C5:1 E5:1 G5:2', 40, 'clar')
    A.n(97.45, 0.15, 'E5', 60, 'wood'); A.n(97.6, 0.15, 'A4', 56, 'wood')
    # working together: a friendly groove (104 bpm) played by both bands, the theme on top
    beat = 60 / 104
    t0 = 98.0
    strum(t0, 103.0, beat, P1, 44); bassline(t0, 103.0, beat, P1, 62); brushes(t0, 103.0, beat, 1.0)
    chipdrums(t0, 103.0, beat, 0.7); chipbass(t0, 103.0, beat, P1, 70); chiparp(100.3, 103.0, beat, P1, 36)
    for inst, v in (('vib', 56), ('lead', 58)): A.seq(t0 + 4 * beat, beat, THEME_A, v, inst)
    # the light finds the fake "o": stop-time — a ping, a question
    A.n(103.0, 0.6, 'E6', 50, 'bell'); A.ch(103.0, 0.4, 'F4 B4 E5', 40, 'sq'); A.n(103.0, 0.3, 'F2', 70, 'tri')
    # sneaking up: tiptoe
    t, k = 104.0, 0
    while t < 106.6:
        q = ['F3', 'A3', 'C4', 'D4', 'Eb4', 'E4'][k % 6]
        A.n(t, 0.12, q, 44, 'tri'); A.n(t, 0.1, p(q) + 24, 26, 'arp'); A.n(t, 0.1, q, 40, 'pizz')
        t += 0.4; k += 1
    t = 106.6
    while t < 107.1: A.n(t, 0.04, 38, 30 + (t - 106.6) * 100, 'snare'); t += 0.05
    # the lunge (up) … the bug hops away (its tiptoe, fast) … belly flop (a cartoon "bwamp")
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(107.1 + k * 0.06, 0.08, q, 56, 'lead')
    A.seq(107.25, 0.2, BUG, 50, 'arp', stacc=0.6)
    A.n(107.55, 0.7, 'F3', 70, 'tri', glide=-7); A.n(107.55, 0.2, 36, 80, 'kick')
    # dazed: a wobbly little circle
    for k in range(8): A.n(108.3 + k * 0.42, 0.4, ['A5', 'G5', 'F5', 'G5'][k % 4], 30, 'sq')
    chippad(108.2, 3.6, 'Fly', 26)
    # the idea — leave a light: soft, then the groove comes back while he types
    A.seq(112.1, 0.5, 'G4:1 C5:1 E5:2', 40, 'vib'); A.ch(112.1, 2.0, 'C3 G3 Bb3 E4', 32, 'gtr', roll=0.05)
    t0 = 114.2
    strum(t0, 116.85, beat, ['F9', 'Dm9'], 40); bassline(t0, 116.85, beat, ['F9', 'Dm9'], 58); brushes(t0, 116.8, beat, 0.8)
    # the lantern lights up: a warm chord, a sparkle on "here!"
    A.ch(117.0, 2.8, 'F3 C4 E4 A4 D5', 40, 'vib', roll=0.06); chippad(117.0, 3.0, 'F6', 44)
    for k, q in enumerate(['C6', 'F6', 'A6', 'C7']): A.n(117.45 + k * 0.08, 0.3, q, 44, 'bell')
    # following the footprints: a detective walk
    beat = 60 / 104
    t, k = 118.2, 0
    walk = ['F2', 'G2', 'A2', 'C3', 'D3', 'C3', 'A2', 'G2']
    while t < 122.1: A.n(t, beat * 0.7, walk[k % 8], 66, 'tri'); t += beat; k += 1
    for tt in np.arange(118.4, 121.8, beat * 2): A.n(tt, 0.1, 'A6', 30, 'arp')
    A.seq(119.0, beat, 'C5:.5 r:.5 D5:.5 r:.5 F5:1 r:1 | G5:.5 r:.5 A5:.5 r:.5 C6:1', 46, 'lead', stacc=0.5)
    # lost among the braces: a wandering tune, curious rather than worried
    chippad(122.2, 2.9, 'Fly', 34); chippad(125.1, 2.9, 'G/F', 34)
    t = 122.2
    while t < 128.0: A.n(t, 0.2, 'F2' if int((t - 122.2) / 0.7) % 2 == 0 else 'G2', 50, 'tri'); t += 0.7
    A.seq(122.4, 0.42, 'C5:1 D5:1 E5:1 G5:1 B5:2 r:1 | A5:1 G5:1 E5:1 D5:2 r:1 | E5:1 G5:1 B5:1 D6:3', 44, 'sq')
    # eager — he wants to help: the band gathers speed
    beat = 60 / 104
    strum(128.0, 131.4, beat, ['Bb7', 'C13'], 42, rhythm=(0, 1, 1.5, 2, 2.5, 3, 3.5)); bassline(128.0, 131.4, beat, ['Bb7', 'C13'], 58)
    A.seq(129.6, beat, 'C5:.5 D5:.5 E5:.5 G5:.5 A5:1', 46, 'vib')
    # holding backspace — "uh … uh … uh …" (a stepwise clarinet climb, a ticking pizz)
    for k, q in enumerate(['C5', 'D5', 'E5', 'F5']): A.n(131.6 + k * 0.75, 0.7, q, 40 + k * 4, 'clar')
    for k in range(9): A.n(131.5 + k * 0.36, 0.08, 'C4' if k % 2 == 0 else 'G3', 34, 'pizz')
    # the floor gives way: things tumble down (a comic cascade), the errors come raining: plink-plonk
    c = T['collapse']
    A.n(c, 0.4, 36, 80, 'kick'); A.n(c, 0.6, 'F1', 80, 'tri', glide=-5)
    for k, q in enumerate(['C7', 'A6', 'F6', 'C6', 'A5', 'F5', 'C5', 'A4', 'F4', 'C4']): A.n(c + 0.1 + k * 0.1, 0.12, q, 50 - k * 2, 'arp')
    for b in CUES['blocks']:
        tb = b['t'] + 0.45
        A.n(tb, 0.1, 'G5', 44, 'sq'); A.n(tb + 0.1, 0.16, 'D5', 40, 'sq')
    A.n(T['hit'], 0.1, 'C3', 70, 'noise'); A.n(T['hit'], 0.3, 'C2', 80, 'tri', glide=-5)
    # dizzy: little circling birds
    for k in range(10): A.n(136.8 + k * 0.24, 0.2, ['C6', 'E6', 'G6', 'E6'][k % 4], 26, 'arp')
    # oops (sheepish)
    A.n(139.15, 0.25, 'D5', 44, 'clar'); A.n(139.45, 0.7, 'C5', 40, 'clar')
    A.n(139.6, 0.1, 'F4', 36, 'pizz'); A.n(139.85, 0.1, 'E4', 36, 'pizz')
    A.ch(139.2, 2.4, 'C3 G3 Bb3 D4', 28, 'gtr', roll=0.05)
    A.n(140.65, 0.1, 'A5', 40, 'vib')
    # Ctrl+Z, Ctrl+Z … then time runs backwards (the cascade, climbing back up)
    A.n(142.2, 0.08, 'C5', 40, 'wood'); A.n(142.75, 0.08, 'C5', 40, 'wood')
    for k, q in enumerate(['C4', 'F4', 'A4', 'C5', 'F5', 'A5', 'C6', 'F6', 'A6', 'C7']): A.n(T['rewind'] + 0.15 + k * 0.17, 0.14, q, 30 + k * 2, 'arp')
    A.n(T['rewind'] + 0.1, 1.8, 'C4', 40, 'tri', glide=12)
    A.ch(146.3, 0.6, 'F5 A5 C6', 44, 'bell')
    A.n(146.6, 0.5, 'C3', 60, 'tri', glide=7)                                    # shaking it off
    # back on its feet: the groove, in chiptune
    beat = 60 / 104
    chipdrums(147.4, 151.8, beat, 0.6); chipbass(147.4, 151.8, beat, P1, 66); chiparp(147.4, 151.8, beat, P1, 30)
    A.seq(147.4 + 2 * beat, beat, 'C5:.5 D5:.5 F5:1 A5:1 G5:.5 F5:.5 | D5:3', 50, 'lead')
    # near miss #2: the bug taunts, the lunge, the hop, the flop, the escape upward
    A.seq(152.5, 0.25, BUG + ' ' + BUG, 56, 'lead', stacc=0.6)
    A.n(153.1, 0.3, 'G3', 50, 'noise', glide=-5); A.n(154.0, 0.3, 'G3', 50, 'noise', glide=-5)
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(154.9 + k * 0.06, 0.08, q, 56, 'lead')
    for k, q in enumerate(['E5', 'G5', 'C6']): A.n(155.05 + k * 0.08, 0.1, q, 44, 'arp')
    A.n(155.5, 0.7, 'F3', 70, 'tri', glide=-7); A.n(155.5, 0.2, 36, 80, 'kick')
    for j in range(4): A.seq(156.0 + j * 0.62, 0.14, BUG, 40, 'arp', stacc=0.5, shift=j * 2)
    A.n(158.6, 0.4, 'A5', 40, 'sq'); A.n(159.0, 0.9, 'G5', 36, 'sq')           # a little pout

def quiet():
    # the quiet moment: tender and warm, both timbres together, very soft
    beat = 60 / 66
    t0 = 160.4
    pick(t0, 178.0, beat, ['F9', 'Am7', 'Bb7', 'C13', 'F9'], 34)
    bassline(t0, 178.0, beat, ['F9', 'Am7', 'Bb7', 'C13', 'F9'], 44, stacc=1.0)
    for k, c in enumerate(['F9', 'Am7', 'Bb7', 'C13', 'F9']): chippad(t0 + k * 4 * beat, 4 * beat, c, 26)
    mel = 'C5:.5 D5:.5 F5:1 A5:1 G5:.5 F5:.5 | D5:1.5 C5:.5 D5:1 F5:1 | G5:.5 F5:.5 D5:1 Bb4:1 D5:.5 C5:.5 | C5:4'
    A.seq(t0, beat, mel, 46, 'vib'); A.seq(t0, beat, mel, 34, 'sq')
    # the wave: the little friend's motif, slow and small; then his smile — the phrase comes home
    A.seq(172.2, 0.4, CUBE, 40, 'sq')
    A.seq(174.9, beat, 'A5:1 G5:1 F5:2', 44, 'vib'); A.seq(174.9, beat, 'A5:1 G5:1 F5:2', 30, 'sq')
    A.ch(175.9, 2.4, 'F3 C4 E4 A4', 26, 'pad')

def closing():
    # an idea (ding!) and the plan: a sneaky, bouncy groove at 120 bpm; the gates land on downbeats
    A.n(179.0, 1.0, 'C6', 56, 'vib'); A.n(179.0, 0.6, 'C7', 44, 'bell')
    for k, q in enumerate(['F4', 'A4', 'C5', 'E5', 'G5']): A.n(179.9 + k * 0.1, 0.14, q, 40, 'vib')
    beat = 0.5
    t0 = 180.5
    walk = ['F2', 'A2', 'C3', 'Eb3', 'D3', 'C3', 'A2', 'Ab2']
    t, k = t0, 0
    while t < 197.4:
        q = walk[k % 8]
        A.n(t, beat * 0.55, q, 64, 'bass'); A.n(t, beat * 0.55, q, 72, 'tri')
        if k % 2 == 1: A.dr(t, 37, 40); A.n(t, 0.1, 38, 44, 'snare')
        A.n(t + beat / 2, 0.06, 42, 36, 'hat'); A.dr(t + beat / 2, 42, 18)
        if k % 2 == 1: A.ch(t + beat / 2, 0.12, 'F3 A3 Eb4', 34, 'gtr'); A.ch(t + beat / 2, 0.1, 'F4 A4 Eb5', 30, 'arp')
        t += beat; k += 1
    motif = 'F5:.5 r:.5 Ab5:.25 A5:.25 r:.5 C6:.5 r:.5 A5:.5 r:.5 | F5:.5 r:.5 Eb5:.5 D5:.5 C5:1 r:1'
    for s in (182.5, 186.5, 190.5, 194.5):
        A.seq(s, beat, motif, 44, 'xyl', stacc=0.6); A.seq(s, beat, motif, 46, 'lead', stacc=0.6)
    # each click drops a gate: a staccato stop from the band (the gate itself is a sound effect)
    for g in CUES['gates']:
        A.ch(g, 0.25, 'F2 C3', 70, 'bass'); A.n(g, 0.25, 'F1', 90, 'tri'); A.n(g, 0.2, 36, 90, 'kick')
    # the search light floods the trap: a held, bright chord
    chippad(190.0, 3.0, 'Fly', 40); A.ch(190.0, 3.0, 'F3 C4 E4 B4', 34, 'vib')
    # the bug panics: tiptoes in every direction
    for j in range(5): A.seq(192.6 + j * 0.9, 0.12, BUG, 36, 'arp', stacc=0.5, shift=(j % 3) * 2)
    # the disguise: quiet tiptoes, a question, the feet (!), a sly "hmm" … then a held breath
    t = 197.4
    while t < 206.2: A.n(t, 0.3, 'F2', 44, 'tri'); A.n(t + 0.5, 0.05, 42, 26, 'hat'); t += 1.0
    for k, tt in enumerate([200.7, 201.2, 201.7, 202.2]): A.n(tt, 0.12, ['C5', 'D5', 'E5', 'F5'][k], 40, 'sq')
    A.seq(202.8, 0.4, 'G5:1 C6:1', 44, 'sq')
    A.n(204.3, 0.12, 'E6', 56, 'bell'); A.n(204.5, 0.12, 'E6', 56, 'bell')
    A.n(205.5, 0.5, 'C3', 60, 'tri', glide=-3); A.n(205.6, 0.4, 'Bb4', 40, 'sq')
    t = 205.8
    while t < 206.55: A.n(t, 0.04, 38, 26 + (t - 205.8) * 50, 'snare'); t += 0.05
    # the pounce and the catch: quick and small; a little happy tune while it holds the bug up
    for k, q in enumerate(['C5', 'F5', 'A5', 'C6']): A.n(206.6 + k * 0.05, 0.08, q, 56, 'lead')
    A.n(207.25, 0.2, 38, 80, 'snare'); A.n(207.25, 0.3, 36, 80, 'kick')
    for k, q in enumerate(['F6', 'A6', 'C7']): A.n(207.7 + k * 0.08, 0.3, q, 40, 'bell')
    beat = 0.5
    chipbass(208.4, 210.6, beat, ['F9'], 62); chipdrums(208.4, 210.6, beat, 0.5)
    A.seq(208.45, beat, CUBE + ' r:.25 C5:.25 F5:.25 A5:.5', 54, 'lead')
    # yes! (a quick grin from the band) … the forehead slap … relief
    A.seq(210.8, 0.2, 'A4:1 C5:1 D5:1 F5:2', 50, 'vib'); A.ch(210.8, 0.3, 'F3 A3 C4 E4', 46, 'gtr', roll=0.02)
    A.n(212.5, 0.1, 'C5', 60, 'wood')
    for k in range(3): A.n(212.8 + k * 0.2, 0.12, ['C6', 'A5', 'C6'][k], 34, 'vib')
    beat = 60 / 72
    pick(214.0, 217.6, beat, ['Bb7', 'F9'], 36)
    A.seq(214.3, beat, 'E5:.5 D5:.5 C5:1 D5:1 E5:1 | F5:2', 44, 'vib')
    A.ch(217.5, 0.8, 'C3 Bb3 D4 F4', 30, 'gtr', roll=0.04)

def green():
    # the hesitation over Enter: one soft high note, nothing else
    A.n(219.3, 1.4, 'C6', 26, 'vib')
    # all green: a bright little "ding-ding", then the band plays the tune, happily — not a fanfare
    g = T['green']
    A.n(g + 0.05, 0.6, 'C6', 56, 'vib'); A.n(g + 0.3, 0.9, 'F6', 56, 'vib')
    A.n(g + 0.05, 0.4, 'C7', 40, 'bell'); A.n(g + 0.3, 0.6, 'F7', 40, 'bell')
    beat = 60 / 108
    t0 = g + 1.3
    strum(t0, 235.0, beat, P1 + P2, 42); bassline(t0, 235.0, beat, P1 + P2, 58); brushes(t0, 235.0, beat, 0.9)
    chipbass(t0, 235.0, beat, P1 + P2, 56); chipdrums(t0 + 8 * beat, 235.0, beat, 0.5)
    for inst, v in (('vib', 54), ('lead', 44)):
        e = A.seq(t0 + 4 * beat, beat, THEME_A2, v, inst)
        A.seq(e, beat, THEME_B, v - 4, inst)
    # the jar: the bug's tiptoe, made friendly; the clinks are part of the tune
    beat = 60 / 108
    chipbass(235.2, 241.0, beat, ['F9', 'C13'], 50)
    A.seq(235.4, 0.26, BUG.replace('F#5', 'F5') + ' ' + BUG.replace('F#5', 'G5'), 44, 'lead', stacc=0.5)
    A.n(236.8, 0.5, 'C6', 44, 'lead', glide=-5)
    A.n(237.4, 0.3, 'F6', 44, 'bell'); A.n(238.0, 0.1, 'A5', 40, 'arp')
    for k, q in enumerate(['F5', 'G5', 'A5', 'C6', 'D6']): A.n(238.8 + k * 0.2, 0.12, q, 34, 'arp')
    A.n(239.8, 0.5, 'A6', 44, 'bell'); A.n(239.95, 0.5, 'F6', 36, 'bell')
    chippad(240.8, 4.0, 'F9', 34); A.seq(240.9, 0.5, 'A5:1 G5:1 F5:2', 40, 'sq')

def dawn():
    # sunrise: guitar and flute, open and easy
    beat = 60 / 70
    t0 = T['sunrise'] + 0.4
    pick(t0, 251.0, beat, ['F9', 'Bb7'], 36)
    A.seq(t0 + 1.0, beat, 'C5:.5 D5:.5 F5:1 A5:1 G5:.5 F5:.5 | D5:3', 42, 'flute')
    # asleep: guitar harmonics and a whisper of vibes, slower and slower
    beat = 60 / 60
    t1 = T['sleep'] + 0.5
    pick(t1, 262.0, beat, ['F9', 'Dm9', 'Gm9'], 28, inst='gtr')
    A.seq(t1 + 1.0, beat, 'G5:.5 F5:.5 D5:1 Bb4:1 D5:.5 C5:.5 | C5:4', 30, 'vib')
    A.ch(259.0, 3.0, 'F3 C4 G4', 22, 'harm')
    # the little friend types "辛苦了，晚安 :)": one soft note per character (the theme's first phrase)
    msg = CUES['MSG']
    notes = ['C5', 'D5', 'F5', 'A5', 'G5', 'F5', 'D5', 'F5', 'C6']
    for k in range(len(msg['text'])): A.n(msg['t0'] + k / msg['rate'], 0.35, notes[k % len(notes)], 44, 'sq')
    chippad(msg['t0'], 4.2, 'F9', 26)
    A.n(270.6, 0.9, 'A5', 40, 'sq', glide=-7)                                    # a tiny yawn
    chippad(271.3, 3.0, 'F6', 22)
    # the room in the morning: the tune's last phrase, resolving home
    beat = 60 / 60
    f = T['final'] + 0.4
    pick(f, 280.5, beat, ['Bb7', 'F9'], 30)
    A.seq(f + 0.5, beat, 'E5:.5 D5:.5 C5:1 D5:1 E5:1 | F5:4', 38, 'vib')

def credits():
    beat = 60 / 116
    t0 = T['credits'] + 0.5
    end = T['filmEnd'] - 1.6
    strum(t0, end, beat, P1 + P2, 42); bassline(t0, end, beat, P1 + P2, 58); brushes(t0, end, beat, 0.9)
    chipbass(t0, end, beat, P1 + P2, 50); chipdrums(t0, end, beat, 0.45); chiparp(t0 + 8 * beat, end, beat, P1 + P2, 26)
    e = A.seq(t0, beat, THEME_A, 54, 'vib'); A.seq(t0, beat, THEME_A, 40, 'lead')
    A.seq(e, beat, THEME_B, 50, 'vib', stacc=None); A.seq(e, beat, THEME_B, 36, 'lead')
    A.n(end + 0.05, 1.4, 'F5', 50, 'vib'); A.ch(end + 0.05, 1.4, 'F3 C4 E4 A4', 40, 'gtr', roll=0.04)
    A.n(end + 0.05, 1.0, 'F6', 40, 'bell')

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

def build():
    for fn in (night, dive, together, quiet, closing, green, dawn, credits, title): fn()
    render_acoustic('film', os.path.join(BUILD, 'music_room.wav'))
    render_chip('film', os.path.join(BUILD, 'music_chip.wav'), DUR)
    render_acoustic('title', os.path.join(BUILD, 'title_room.wav'))
    render_chip('title', os.path.join(BUILD, 'title_chip.wav'), 7.5)
    # match the two bands' loudness so a cut never jumps in level
    room, _ = sf.read(os.path.join(BUILD, 'music_room.wav'), dtype='float32')
    chip, _ = sf.read(os.path.join(BUILD, 'music_chip.wav'), dtype='float32')
    lr, lc = loud(room), loud(chip)
    k = 10 ** ((lr - lc) / 20)
    sf.write(os.path.join(BUILD, 'music_chip.wav'), chip * k, SR, subtype='PCM_24')
    tc, _ = sf.read(os.path.join(BUILD, 'title_chip.wav'), dtype='float32')
    sf.write(os.path.join(BUILD, 'title_chip.wav'), tc * k, SR, subtype='PCM_24')
    print(f'music: room {lr:.1f} dB, chip {lc:.1f} dB → chip ×{k:.2f}; {len([e for e in A.ev if e["bus"] == "film"])} notes')

if __name__ == '__main__':
    build()
