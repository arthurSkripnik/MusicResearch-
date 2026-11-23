---
name: explorer-playlist
description: Use only when Arthur asks to build or review a Curated (conceptual) playlist with a concept, arc and sequencing. Not for "Explorer · …" research playlists or ★ genre playlists.
---

# Curated playlists (Music Explorer)

A playlist is a sequence of musical events that creates a listening experience, not a pile of good tracks.
Order, contrast and transitions matter as much as selection. Build by how the music develops a feeling in time,
not only by genre.

## 1. Pick the level first

| Level | What it is | Arc required? |
|---|---|---|
| Discovery | free gathering of new music | no: not this skill |
| Research | "Explorer · <topic>": a genre, scene, label, sound or crossroads | no: not this skill |
| Curated | finished set with a concept, arc, sequencing, a specific experience | yes, full |

**Scope (Arthur, 2026-11-12): this skill is ONLY for Curated playlists.** "Explorer · <topic>" research playlists and
★ genre/like playlists do not use it: they keep their usual mechanical rules (append batches, 2–4 tracks per album, no arc).
Name curated playlists "Curated · <concept>".

## 2. Algorithm

1. **Concept**: one sentence: what this playlist is and what experience it creates.
2. **Palette**: 3–5 traits of sound, mood or rhythm (dusty, spacious, hypnotic pulse, warm low end...), not necessarily genres.
3. **Pool**: gather candidates without ordering (30–50). Check Arthur's
   taste doc "<genre>: мій смак" and his Liked Songs clusters (sandbox-liked/clusters/) so you don't recommend what he has.
4. **Anchors**: 3–5 key tracks that set character and direction.
5. **Arc**: place anchors, then find the opening, bridges, peak and ending.
6. **Transitions**: check every pair A → B, especially the last and first 30–60 s.
7. **Whole**: read the sequence as one experience.
8. **Edit**: drop tracks that duplicate a function, break the pace, or add no new dimension.

Approaches to combine: mood, texture, rhythm, genre crossroads (trip-hop + jazz, ambient + dub...),
narrative/concept (night, city after midnight, memory), artist/label/scene (Ninja Tune, Warp, Mo' Wax, ECM).

## 3. Sequencing toolkit

- **Opening statement**: the first track frames the listening.
- **Anchor tracks**: the structure is built around them.
- **Bridge tracks**: connect genres, textures or moods.
- **Palette cleanser**: clears the ear after something dense or intense.
- **Peak placement**: the climax where the arc needs it, not by chance.
- **Closing statement**: completion or the right aftertaste.

Principles to check against:
- **Arc**: Opening → Development → Peak → Release → Ending.
- **Energy flow**: Rising, Wave, Plateau, Descent or Contrast. BPM is not energy: bass, density, groove and character can weigh more.
- **Contrast**: dense → spacious, vocal → instrumental, dark → light, intense → static. Contrast can beat obvious similarity.
- **Continuity**: compatible tempo, groove, bass, texture, mood, harmony. Continuity is not monotony.
- **Pacing**: when to move on, when to stay in a state, when to let the listener rest.
- **Tension & release**: rhythm, harmony, dynamics, density, expectation and breaking it.
- **Dynamic range**: quiet/loud, sparse/dense, close/vast.
- **Micro / macro**: development inside a track and across the whole playlist.
- **Motif**: a recurring rhythmic, timbral, melodic or emotional element that ties it together.
- **Harmonic mixing**: key compatibility; optional, useful only for DJ-style seamless flow.

Arthur's standing taste: air, space, measured tempo; dislikes dense "bar" jazz with many layered horns.
At most one "out of comfort zone" pick, and mark it.

## 4. House rules (Music Explorer)

- Curated playlists are made only when Arthur asks; post the link with the concept, palette and arc (track by track roles).
- Mix known (his likes) and new tracks; say which is which. Never change Arthur's own playlists: make a "· re-cut" copy.
- Never add to **★ <genre>** playlists (only the daily intake does that). Never edit map data; never open
  public/covers, dist, music-explorer.html, covers.json.
- A new artist gets a short intro bio (who, background, a couple of facts).
- Removing or moving tracks is fine and is not feedback.
- Reply in Ukrainian; names in English.

## 5. Commands

Run in `/mnt/project-files/music-explorer/spotify` with
`NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node --no-warnings spotify.mjs ...`

1. `playlist "Curated · <concept>" "<description ≤300 chars, Ukrainian: concept + arc, 'слухай підряд, без shuffle'>"`
2. Search each track: `search "<artist> <title>" track` (pick the original album version, not remixes/remasters compilations);
   add in final order: `adduri "<playlist>" <uri>` (1 s apart). No separator, no batch-note.
3. `list "<playlist>"` to verify order and that every track landed.
4. Cover: write `covers/<slug>.json` (center = concept, 3–5 groups with ≤3 artists each, optional `links`, own unused `hue`
   0–360: see existing covers/*.json), `node cover.mjs covers/<slug>.json covers/<slug>.jpg`, `cover "<playlist>" covers/<slug>.jpg`.
5. To review one of Arthur's playlists: read it read-only (playlist items via the API), score against section 3, and offer a
   "<name> · re-cut" copy; never edit the original.

On a 429, read Retry-After and wait; don't retry in a loop.
