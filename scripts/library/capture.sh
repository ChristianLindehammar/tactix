#!/bin/zsh
# capture.sh <exercise-id> <out.png> : opens the exercise on the emulator, screenshots every step, joins them
# Needs the CoachMate dev build running on the emulator (DEV, default emulator-5554) and ImageMagick (magick).
# OTHER = any other exercise id; it is opened first because a link to the screen already showing does not reload it.
A="$HOME/Library/Android/sdk/platform-tools/adb"
DEV=${DEV:-emulator-5554}
ID=$1; OUT=$2
TMP=$(mktemp -d)
# Close a full-screen diagram left open by an earlier run
$A -s $DEV shell input keyevent 4 >/dev/null 2>&1; sleep 1
# Open another exercise first: a link to the screen already showing does not reload it
$A -s $DEV shell am start -a android.intent.action.VIEW -d "coachmate://exercises/${OTHER:-bd79155b-36e1-581a-aa5f-bec0f17ad5d6}" >/dev/null 2>&1; sleep 2
$A -s $DEV shell am start -a android.intent.action.VIEW -d "coachmate://exercises/$ID" >/dev/null 2>&1
sleep 3
$A -s $DEV shell uiautomator dump /sdcard/ui.xml >/dev/null
$A -s $DEV pull /sdcard/ui.xml $TMP/ui.xml >/dev/null
# Step buttons: single-digit text nodes; take their centre
python3 -I - $TMP/ui.xml > $TMP/steps <<'EOF'
import re, sys
xml = open(sys.argv[1]).read()
seen = {}
for m in re.finditer(r'text="(\d)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xml):
    n, x1, y1, x2, y2 = m.group(1), *map(int, m.groups()[1:])
    if y1 < 1400 and n not in seen:
        seen[n] = ((x1 + x2) // 2, (y1 + y2) // 2)
# Step buttons sit in one row: keep the digits on the same line as "1" (other single digits on screen are not steps)
row = seen.get('1', (0, 0))[1]
for n in sorted(seen):
    if abs(seen[n][1] - row) < 20:
        print(*seen[n])
EOF
i=0
if [ ! -s $TMP/steps ]; then echo "0 0" > $TMP/steps; fi
while read x y; do
  i=$((i+1))
  [ "$x" != 0 ] && $A -s $DEV shell input tap $x $y < /dev/null && sleep 1
  $A -s $DEV exec-out screencap -p < /dev/null > $TMP/s$i.png
  y0=$((y + 60)); [ "$x" = 0 ] && y0=500
  magick $TMP/s$i.png -crop 1080x1350+0+$y0 $TMP/c$i.png
done < $TMP/steps
magick $TMP/c*.png +append -resize 45% $OUT
echo "$i steps -> $OUT"
