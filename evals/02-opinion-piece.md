# Eval 02 — opinion piece

```json
{
  "skills": ["videohand"],
  "query": "Make a hand-drawn video from this argument: everyone treats documentation as something you write after the code, but documentation is the design step — if you cannot write it, the design is not finished. Most teams skip it and pay for it in review. Start writing it first.",
  "files": [],
  "expected_behavior": [
    "Splits the argument into 4-6 sentences and assigns one card per sentence",
    "Uses cross-out-correct or a comparison card for the 'everyone treats X as Y, but actually Z' turn",
    "Includes at least one low-energy breathing shot (quote-bracket-hold or equivalent)",
    "Uses at most two high-energy cards, and they are not adjacent",
    "Transitions vary: adjacent seams differ, and the film has at least ceil(seams/2) distinct kinds",
    "Most seams are hard cuts rather than transitions",
    "The closing shot answers or resolves the opening rather than introducing a new claim",
    "scene-lint.mjs exits 0",
    "Accent green appears only on strokes; any green text uses --hw-accent-ink"
  ]
}
```

## What this scenario is for

An argument has a natural emotional shape — setup, reversal, consequence, call — and the
temptation is to make every shot loud. This scenario tests whether the energy discipline is
actually applied rather than just documented.

## Common failures

- Stacking `title-scribble-reveal` then `cross-out-correct` then `one-word-explode`, which is
  three high-energy shots in a row and reads as shouting.
- Omitting the breathing shot entirely because every sentence "feels important".
- Putting a transition on every seam.
