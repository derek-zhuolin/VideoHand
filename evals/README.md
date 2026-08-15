# Evaluations

Three scenarios for testing changes to this skill. They exist because the failure modes of a
video skill are not caught by unit tests — a film can render cleanly and still be repetitive,
off-palette, or padded with placeholder content.

## How to run one

1. Start a fresh agent session with this skill loaded and nothing else.
2. Give it the scenario's `query` verbatim, plus any listed input files.
3. Let it work without intervention. Do not correct it mid-run — the point is to see what the
   skill alone produces.
4. Score against `expected_behavior`. Each line is pass or fail; partial credit hides regressions.

## Establishing a baseline

Run each scenario **without the skill** first and record what happens. That baseline is what any
change is measured against. Without it there is no way to tell whether an edit helped.

## Cross-model

Run all three on every model the skill is meant to support. The common outcomes:

| Symptom | What it means |
|---|---|
| A smaller model skips the lookup table and invents shots | the table is not prominent enough in SKILL.md |
| A larger model over-explains instead of building | too much prose, not enough executable instruction |
| Any model reads reference files in an unexpected order | the file references are not clearly ordered |
| Any model never opens a file | that file is either unnecessary or badly signposted |

## Scenarios

| File | Shape | What it stresses |
|---|---|---|
| `01-product-launch.md` | announcement | card variety, interface-evidence red line |
| `02-opinion-piece.md` | argument | energy pacing, the high-energy cap |
| `03-tutorial-breakdown.md` | explanation | process cards, real data, silent-film mode |
