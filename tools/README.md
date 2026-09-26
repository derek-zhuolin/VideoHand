# Tools

`doctor.mjs` performs read-only offline dependency and asset checks. `install.sh` is a compatibility wrapper around the explicit-target CLI installer.

`gate.mjs`, `ci-check.mjs`, `frame-audit.py` remain legacy HW-card tooling; they do not define Doodle acceptance. `update-check.mjs` is retained for old integrations but no v3 command calls it. New default workflow: references/quality.md.

`check-frame-motion.py` diagnoses sampled decoded-frame changes using Python 3, ffmpeg and ffprobe. It reports identical and low-change intervals plus statistics around supplied timestamps. Normal reading holds are not failures. An explicit `--max-freeze-seconds` is the only optional technical freeze gate; neither passing that gate nor zero identical frames proves natural easing, object continuity or semantic alignment.

```sh
python3 tools/check-frame-motion.py film.mp4 --boundaries 6.8,14.2 --out frame-report.json
```

Review the normal-speed render against its narration and semantic plan. See [object-motion guidance](../references/continuous-noface.md) and the [silent study](../examples/motion-study/README.md).
