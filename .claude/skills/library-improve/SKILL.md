---
name: library-improve
description: Turn a coach's own exercise in CoachMate into a polished, translated library drill (Swedish and English), uploaded as the CoachMate account. Use when asked to improve, clarify, rewrite, translate or "make a library drill of" an exercise someone made in the app, found by title or id.
---

# Improve a coach's exercise into a library drill

The result is a **new** public drill owned by the CoachMate account. The coach's own exercise is never changed:
the app treats the phone as the source of truth and only uploads, so an edit made on the server would never reach
the coach's phone and would be overwritten by their next save. Read `docs/LIBRARY-IMPORT.md` first; every rule
there applies.

## Before starting

- **Whose exercise is it?** The terms say what coaches create stays theirs. Making it public only lets others view,
  use and copy it. Use your own exercises (Christian's accounts) freely; for anyone else's, ask Christian to
  confirm the coach agreed. Never use another coach's private exercise without that.
- Production is live. Everything here reads the database in a read-only transaction; nothing writes to it except
  the uploader, which goes through the API as the CoachMate account.

## Steps

1. **Find it.** Use a scratch folder outside the repo:
   `python3 -I scripts/library/fetch_exercise.py --title "<part of title>" <scratch>/<slug>`
   Several matches are listed with their ids; run again with `--id <first characters>`. One match writes
   `<slug>.source.json` (the exercise as stored) and `gen_<slug>.py` (a drills.py generator with the sketch
   converted, the original text, and TODOs for what is missing).
2. **Understand it.** Read the source text and look at the sketch. Render it first if it helps (fill the TODOs with
   placeholders in a copy and run `preview.py`). Coaches often leave out the goal, the restart, how roles rotate,
   the size of the groups. **Ask the coach (Christian) what is unclear** before writing; don't invent the rules.
3. **Write the drill** in the generator:
   - Redraw the sketch as 2–4 clear steps by the drawing conventions (half court in the top half, goalkeeper as an
     unlabelled `O` in the goal, letters as labels, J for jokers, the leader `L()` without label). Every step needs
     a ball, and arrows start just off their marker and don't cross others.
   - Rewrite the text: title, 1–3 short paragraphs (set-up, how it runs, rotation, variants), 3–4 coaching points,
     one note per step, "Bilden är inte skalenlig." Keep the coach's idea and rules; no names of people or clubs.
   - Translate into the other language (sv ↔ en), same diagram. Swedish must read like a Swedish coach wrote it.
   - Fill the metadata: phase, difficulty, focus, durationMinutes, minPlayers, maxPlayers.
   - The slug comes from the original title; change it to the new title's slug (`write('<slug>', ...)`), unique
     among `content/library-exercises/*.json`.
4. **Generate and check**, from the repo root:
   - `python3 -I <scratch>/gen_<slug>.py content/library-exercises`
   - `python3 -I scripts/library/preview.py content/library-exercises/<slug>.en.json <scratch>/<slug>.png`, then
     look at the PNG and fix every WARN line and anything that reads badly; regenerate until clean.
   - `npx jest --no-watchman __tests__/libraryExercises.test.ts`
5. **Show Christian** the preview and the Swedish text, with a short list of what was added beyond the original
   (rules interpreted, steps drawn, variants, coaching points, metadata). Upload only after a yes.
6. **Upload** with `backend/.venv/bin/python3 -I backend/scripts/upload_library.py --dry-run <both files>`, then
   without `--dry-run`. The token is in `~/.config/coachmate/library-token`; never print it.
7. **Add the SOURCES row** in `content/library-exercises/SOURCES.md` after the last row of the same sport:
   `| <slug> | <sport> | <whose exercise and its title, and that they agreed>. Own title; <what was added> | <date> |`
8. **Ask Christian to check it in the app** (Övningar), since the app draws markers bigger than the preview.
   Commit and push the two JSON files and SOURCES.md only when asked.
