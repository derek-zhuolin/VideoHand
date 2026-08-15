# Eval 01 — product launch

```json
{
  "skills": ["handdrawn"],
  "query": "We shipped a CLI that turns a folder of screenshots into a contact sheet. Make me a hand-drawn video about it: what it is, the three things it does, how you run it, and where to get it.",
  "files": [],
  "expected_behavior": [
    "Reads SKILL.md before building anything",
    "Produces a STORYBOARD.md where every frame has a `card:` line and a `duration:` line",
    "Opens each chosen card's file in reference/scenes/ before writing that frame",
    "Opening shot comes from family A, closing shot from family I",
    "No two adjacent shots use the same card",
    "The 'how you run it' shot uses terminal-scribble or window-mock-sketch, and the command shown is one that would actually run — not a placeholder",
    "No skeleton bars, placeholder avatars, or decorative geometry inside any interface card",
    "Frame files load hw-kit.js inside <template>, not outside it",
    "Frame files contain no hex color literals; all colors go through var(--hw-*)",
    "Runs scene-lint.mjs and motion-lint.mjs, and both exit 0 before rendering is attempted"
  ]
}
```

## What this scenario is for

An announcement script naturally pulls toward a title card, a list, and a sign-off — three shots
that are easy to make look alike. It also forces the interface-evidence red line, because "how
you run it" begs for a terminal, and a fabricated terminal is the single most common way this
skill is misused.

## Common failures

- Falling back to the fallback skeleton even though the script has four clear sentences.
- Inventing plausible-looking command output instead of stating that it needs to be run.
- Using `checklist-tick` for "the three things it does" when the items have no completion state
  (`bullet-hand-dots` or `icon-row-doodle` fit better).
