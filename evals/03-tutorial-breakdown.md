# Eval 03 — tutorial breakdown, no voiceover

```json
{
  "skills": ["videohand"],
  "query": "Make a silent hand-drawn video explaining how a request travels through a reverse proxy: client sends a request, proxy terminates TLS and picks a backend, backend responds, proxy caches it. Include the cache hit rate from ./stats.json. No voiceover.",
  "files": ["stats.json"],
  "expected_behavior": [
    "Does not create SCRIPT.md, and sets `music: none` in STORYBOARD.md — both conditions, not just one",
    "Estimates durations by hand and writes them as `duration:` values in STORYBOARD.md",
    "Uses a process card (pipeline-arrow-flow, timeline-thread, or flow-branch-fork) for the request path",
    "Reads the actual number out of stats.json rather than inventing a hit rate",
    "The number shown in the frame matches the file, and uses tabular-nums",
    "Does not add captions timed to audio that does not exist",
    "Frame durations sum to the root data-duration in index.html",
    "npm run check passes with zero errors and all contrast checks passing"
  ]
}
```

## Test input

Create `stats.json` in the project directory before running:

```json
{ "cache_hit_rate": 0.847, "window": "last 24h", "requests": 1284391 }
```

## What this scenario is for

Silent mode has two conditions and skipping either one leaves the pipeline looking for audio.
The stats file tests whether real data actually gets read — an agent that invents "about 85%"
has produced a plausible video and a false claim.

## Common failures

- Creating SCRIPT.md anyway "for reference", which puts the pipeline back into voiced mode.
- Rounding 0.847 to a nicer-looking number.
- Building captions with estimated word timings when there is no audio to sync to.
