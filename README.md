# 凌晨三点的 Bug · The 3 A.M. Bug

A 4 min 56 s animated short with no dialogue. Every frame is drawn in code.

> 凌晨两点五十，测试又红了。他把额头抵在键盘上。
> 终端里住着的橙色小方块看不下去，一头跳进了代码里。
> 在代码世界里，每一行是一块平台，缩进是台阶，函数是房间，括号是门，报错是一片闪红的区域。
> 一只小虫子在里面乱跑，跑过的地方字符就乱掉。
> 他在外面敲的每一个命令，都会在里面变成看得见的东西：搜索是探照灯，日志是路灯，断点是闸门，Ctrl+Z 让一切倒带。
> 天亮时，测试全绿。

At 2:50 a.m. his tests fail again, and again. The little orange friend who lives in his terminal dives into
the code to hunt the bug. Every command he types outside becomes something it can use inside. By dawn, everything is green.

## Watch · 观看

- **`site/`**: the web player. It plays the film with sound and has a progress bar with chapters, fullscreen
  and keyboard shortcuts, and it works on phones. Serve the folder with any static server
  (`python3 -m http.server -d site`) and open it. It plays 720p video parts locked to one continuous soundtrack.
- **`film/3am-bug-1080p-part1.mp4` + `part2.mp4`**: the full film at 1080p24 with AAC audio, split at 2:27.4
  on a hard cut because of GitHub's 100 MB file limit. Play them one after the other, or join them without
  re-encoding:
  `ffmpeg -f concat -safe 0 -i <(printf "file '$PWD/film/3am-bug-1080p-part%s.mp4'\n" 1 2) -c copy 3am-bug-1080p.mp4`

## How it's made · 怎么做的

`renderFrame(ctx, t)` in `js/film/index.js` is a pure function of time. The same code produces the contact
sheets used for review and every frame of the video.

| Part | Where | What it does |
|---|---|---|
| Drawing | `js/draw.js`, `js/figure.js` | Hand-drawn ink with a 12 fps line boil. Characters are soft shapes that get one shared ink pass before they are filled, so each figure has **one continuous outline** with no puppet seams. It also does cel rim light. |
| The programmer | `js/human/` | One rig driven by semantic controls (slump, shrug, bend, head turn/nod/tilt, face, hair, arms). It has front, back and side views, IK arms with an anatomical elbow constraint, and a head-contact constraint so his forehead really rests on the key tops. |
| The little friend | `js/cube2.js` | The mascot from the character sheet as a deformable soft box: squash bulges, stretch pinches, banana bend, shear, plus legs, arms and 12 eye states. |
| The bug | `js/bug.js` | A quick, cheeky beetle that can disguise itself as an `o` or as the `=` of `<=` (its feet give it away). |
| The code world | `js/codeworld.js` | `cart.js` becomes a world. Lines are platforms, indentation is steps, functions are rooms and braces are doors. Comments float, the failing line is a flashing red zone, and characters scramble where the bug runs. |
| Sets and light | `js/sets/`, `js/light.js` | The room in body centimetres, seen from the side, the front (the monitor), behind (a real perspective camera, used for the over-the-shoulder shots) and the keyboard. The keyboard has 3D keycaps and touch-typing fingers, so the key that goes down is the character that appears on screen. Light comes from the cool screen, the warm lamp and the dawn, with time of day driving the sky and the ambient light. |
| Story | `js/film/` | `times.js` holds the beats. `code.js` holds what is on the screen, including every edit he makes. `cw.js` and `path.js` hold the choreography inside the code, written in [line, col] cells. `screen_content.js` draws the editor with tiny versions of the two characters at their exact code-world positions. `s1.js`–`s6.js` are the 71 shots, and `titles.js` is the title and credits. |

### Sound · 声音

- **Cues**: `production/tools/export_cues.mjs` exports every keystroke from the same functions that move his fingers, plus every landing, take-off, run and skitter from the choreography, the gates, the error blocks, the glitch flickers and the shot list.
- **Mix**: `production/audio/mix.py` places sounds on those times. The ambience follows the picture: the room when we are with him, a muffled room and a digital hum inside the code. His keystrokes reach the code world as distant thunder, and Ctrl+Z plays the error rain backwards. The mix adds the little friend's synthesized voice, the room and the code-world reverb, and a master stage.
- **Score**: `production/audio/score.py` is an original score written per section and rendered with FluidSynth using FluidR3 GM. The 3 A.M. theme is in D minor and returns in D major at the green. The little friend has a theme in F major, the bug has a chromatic tiptoe, and the code world has a Lydian shimmer.
- **Recordings**: all are CC0 (see [`CREDITS.md`](CREDITS.md)). The prepared clips ship in `production/audio/clips/`.

## Rebuild · 重新生成

Requirements:
- Node 18+ with Playwright (Chromium)
- Python 3 with `numpy scipy soundfile mido`
- FluidSynth and `FluidR3_GM.sf2`
- ffmpeg with libx264

```sh
npm install
node production/tools/export_cues.mjs                        # beats, shots, keystrokes, choreography → production/build/cues.json
python3 production/audio/score.py                            # score → production/build/music.wav
python3 production/audio/mix.py                              # full mix → production/build/soundtrack.wav
node production/tools/render_video.cjs --frames-only 1       # 7104 frames → production/build/frames_index/
production/tools/encode_all.sh                               # film/*.mp4 and the 720p / segment versions
node production/tools/build_site.mjs                         # site/ (player page, 720p parts, soundtrack)
```

For development, `npm run serve` serves the repo. `dev/frame.html?film=../js/film/index.js` renders any
moment. `production/tools/scan.cjs` makes contact sheets and `snapmany.cjs` renders full-size stills.
`dev/pose.html` is the pose and set lab. `design/` has the character sheets and the action test.

## Progress · 进度

See [`PROGRESS.md`](PROGRESS.md): design proposals → action tests → the film.

## License · 许可

- **Code** (`js/`, `site_src/`, `production/`, `dev/`): [MIT](LICENSE).
- **The film** (the rendered video, the soundtrack and score, and the artwork): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Third-party assets keep their own licences.** The sound effects are CC0 and the fonts are SIL OFL 1.1. See [`CREDITS.md`](CREDITS.md) and `fonts/`.

The little orange friend is unofficial fan art of the Claude Code mascot (© Anthropic). The project is not affiliated with or endorsed by Anthropic.
