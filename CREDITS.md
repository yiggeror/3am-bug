# Credits · 致谢

**凌晨三点的 Bug · The 3 A.M. Bug**: a short film that is drawn, animated, scored and mixed in code.

## Picture · 画面
- All drawing, animation, lighting and camera work are original and generated frame by frame by the code in `js/` (Canvas 2D).
- The little orange friend (小橙块) is fan art of the Claude Code mascot (© Anthropic), drawn after the character sheet supplied for this project. It is unofficial and not affiliated with or endorsed by Anthropic.
- The programmer, the room and the bug are original.

## Music · 配乐
- Original score, composed in code (`production/audio/score.py`). The acoustic band is rendered with **FluidSynth** using the **FluidR3 GM** soundfont by Frank Wen (MIT licence). The chiptune band is synthesized by the same script.

## Fonts · 字体 (SIL Open Font License 1.1)
- **Patrick Hand** by Patrick Wagesreiter (`fonts/OFL-PatrickHand.txt`)
- **ZCOOL KuaiLe** by ZCOOL (`fonts/OFL-ZCOOLKuaiLe.txt`)
- **JetBrains Mono NL** by JetBrains, the no-ligature build, so `<=` stays two characters on screen (`fonts/OFL-JetBrainsMono.txt`)

## Sound effects · 音效
All recordings are **CC0 / public domain**. `production/audio/sfxlib.py` trims and normalises them, and `production/audio/mix.py` places, re-pitches and filters them. The prepared clips ship in `production/audio/clips/`.

These are synthesized in code (`production/audio/synth.py`):
- the little friend's voice, footsteps and typing
- the bug's skitter and chitter
- everything that only exists inside the code world: the digital hum, the glitches, the splash into the text, the searchlight, the lantern bell, the error buzz, the gate clang, the success chime and the tape stop
- his breathing, the heartbeat and the computer's fan

| Clip(s) | Source | Licence | Link |
|---|---|---|---|
| key1–key6 | "Keyboard single key presses.wav" by 5ro4 | CC0 | https://freesound.org/people/5ro4/sounds/609534/ |
| key_hard | "mechanical key hard.wav" by bigmonmulgrew | CC0 | https://freesound.org/people/bigmonmulgrew/sounds/378085/ |
| key_tac | "Keyboard - Press down" by Foxfire- | CC0 | https://freesound.org/people/Foxfire-/sounds/570754/ |
| mouse_click | "Mouse Click Sound.mp3" by Pixeliota | CC0 | https://freesound.org/people/Pixeliota/sounds/678248/ |
| chair | "Office chair creaking" by ThabzMalik | CC0 | https://freesound.org/people/ThabzMalik/sounds/767051/ |
| cloth | "Clothes Rustling 1" by WasabiWielder | CC0 | https://freesound.org/people/WasabiWielder/sounds/334219/ |
| sigh | "sighing_01.mp3" by k.adkins | CC0 | https://freesound.org/people/k.adkins/sounds/449478/ |
| yawn | "Yawn 2" by OwlStorm | CC0 | https://freesound.org/people/OwlStorm/sounds/151239/ |
| room_lit | "Bedroom Room Tone Electric Lamp Hum" by jamesdrake89 | CC0 | https://freesound.org/people/jamesdrake89/sounds/671455/ |
| crickets | "Japan_Ina_Night_Fields_Farm_Crickets_Bugs_TAKE2_24bit_96KHz.wav" by RutgerMuller | CC0 | https://freesound.org/people/RutgerMuller/sounds/361875/ |
| city_night | "Light City Sounds at Night" by Liljendal | CC0 | https://freesound.org/people/Liljendal/sounds/442640/ |
| clock | "Clock_Tick_Tock_Loop.wav" by michael_grinnell | CC0 | https://freesound.org/people/michael_grinnell/sounds/464402/ |
| boing | "boing1.wav" by TinTinOko | CC0 | https://freesound.org/people/TinTinOko/sounds/277291/ |
| pop | "S24-24 Comedy cartoon cork pop.wav" by craigsmith | CC0 | https://freesound.org/people/craigsmith/sounds/676000/ |
| whoosh, whoosh2 | "Cartoony whooshes" by BranRainey | CC0 | https://freesound.org/people/BranRainey/sounds/142348/ |
| slide_b | "SLIDE WHISTLE - 1" by SamuelGremaud | CC0 | https://freesound.org/people/SamuelGremaud/sounds/517633/ |
| paper1 | "13_Sticky notes.wav" by 15GPanskaZacekSamuel | CC0 | https://freesound.org/people/15GPanskaZacekSamuel/sounds/461803/ |
| pen_roll | "Pencil rolling of Desk and landing" by balloonhead | CC0 | https://freesound.org/people/balloonhead/sounds/443445/ |
| soft_land1, soft_land2, soft_heavy, punch, plate_tap2, wood_tap | Kenney, *impact-sounds* pack | CC0 | https://kenney.nl/assets/impact-sounds |
| cloth_k, creak | Kenney, *rpg-audio* pack | CC0 | https://kenney.nl/assets/rpg-audio |
| birds (dawn) | "Dawn chorus.wav" by Synge101 | CC0 | https://freesound.org/people/Synge101/sounds/611453/ |
| rewind (Ctrl+Z) | "Tape recorder rewind (Fanmade)" by simplewave | CC0 | https://freesound.org/people/simplewave/sounds/372876/ |
| jar_close | "Opening & closing the lid on a glass jar 3" by randbsoundbites | CC0 | https://freesound.org/people/randbsoundbites/sounds/829781/ |
| lid_off | "Glass lid off.wav" by BillyPalmer | CC0 | https://freesound.org/people/BillyPalmer/sounds/435000/ |
| clink1, clink2, clink3 | "Glass Clink Pack.wav" by ralph.whitehead | CC0 | https://freesound.org/people/ralph.whitehead/sounds/565725/ |
| knuckle | "Knuckle Pop.wav" by akennedybrewer | CC0 | https://freesound.org/people/akennedybrewer/sounds/389178/ |
| knuckle2 | "Knuckles Bone Crack 1_2" by Joao_Janz | CC0 | https://freesound.org/people/Joao_Janz/sounds/477640/ |

## Tools · 工具
Headless Chromium through Playwright (frame capture), FFmpeg with libx264 (encoding), FluidSynth (score), and NumPy, SciPy, SoundFile and Mido (sound).
