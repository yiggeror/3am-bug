#!/bin/sh
# Encode every deliverable from the rendered frames + the mixed soundtrack.
#   film/3am-bug-1080p-part{1,2}.mp4      the full film at 1080p24 (CRF 20), split on a hard cut (GitHub's 100 MB limit)
#   production/build/deliver/…            a 720p version under 30 MB and 1080p segments under 30 MB (for sending)
set -e
cd "$(dirname "$0")/../.."
F=production/build/frames_index
A=production/build/soundtrack.wav
N=$(ls $F | grep -c jpg)
DUR=$(python3 -c "print($N/24)")
mkdir -p film production/build/deliver
V264="-c:v libx264 -preset slow -tune animation -pix_fmt yuv420p -profile:v high -movflags +faststart"

# ---- repo: full 1080p in two parts (cut at 147.4 s: a hard cut into the code world)
enc_part () { # name f0 f1 crf
  t0=$(python3 -c "print($2/24)"); d=$(python3 -c "print(($3-$2)/24)")
  ffmpeg -v error -y -framerate 24 -start_number $2 -i $F/%06d.jpg -ss $t0 -t $d -i $A -frames:v $(($3-$2)) $V264 -crf $4 -c:a aac -b:a 192k -shortest "$1"
  echo "$1 $(du -m "$1" | cut -f1) MB"
}
CUT=3538
enc_part film/3am-bug-1080p-part1.mp4 0 $CUT 20
enc_part film/3am-bug-1080p-part2.mp4 $CUT $N 20

# ---- to send: 720p in one file under 30 MB (grain lightly smoothed so it compresses cleanly)
ffmpeg -v error -y -framerate 24 -i $F/%06d.jpg -i $A -t $DUR -vf "scale=1280:720:flags=lanczos,hqdn3d=1.5:1.5:5:5" $V264 -b:v 700k -maxrate 1200k -bufsize 1400k -pass 1 -passlogfile production/build/x264d -an -f null -
ffmpeg -v error -y -framerate 24 -i $F/%06d.jpg -i $A -t $DUR -vf "scale=1280:720:flags=lanczos,hqdn3d=1.5:1.5:5:5" $V264 -b:v 700k -maxrate 1200k -bufsize 1400k -pass 2 -passlogfile production/build/x264d -c:a aac -b:a 96k production/build/deliver/3am-bug-720p.mp4
echo "720p $(du -m production/build/deliver/3am-bug-720p.mp4 | cut -f1) MB"

# ---- to send: 1080p in segments under 30 MB, each cut on a hard cut
seg () { # idx f0 f1
  t0=$(python3 -c "print($2/24)"); d=$(python3 -c "print(($3-$2)/24)")
  out=production/build/deliver/3am-bug-1080p-seg$1.mp4
  ffmpeg -v error -y -framerate 24 -start_number $2 -i $F/%06d.jpg -frames:v $(($3-$2)) $V264 -b:v 3900k -maxrate 6000k -bufsize 7800k -pass 1 -passlogfile production/build/x264s -an -f null -
  ffmpeg -v error -y -framerate 24 -start_number $2 -i $F/%06d.jpg -ss $t0 -t $d -i $A -frames:v $(($3-$2)) $V264 -b:v 3900k -maxrate 6000k -bufsize 7800k -pass 2 -passlogfile production/build/x264s -c:a aac -b:a 160k -shortest $out
  echo "$out $(du -m $out | cut -f1) MB"
}
seg 1 0 1080        # 0:00–0:45   title, 02:50 (up to the side shot)
seg 2 1080 2232     # 0:45–1:33   head down, the dive, the code world, the double take
seg 3 2232 3336     # 1:33–2:19   search, lantern, maze, collapse
seg 4 3336 4560     # 2:19–3:10   oops, rewind, near miss, the quiet moment, breakpoints
seg 5 4560 5880     # 3:10–4:05   the trap, the pounce, all green, the jar
seg 6 5880 $N       # 4:05–4:56   dawn, goodnight, credits
