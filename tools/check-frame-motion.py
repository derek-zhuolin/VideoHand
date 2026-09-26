#!/usr/bin/env python3
"""Report sampled decoded-frame changes, not animation quality.

A still reading hold is not an error. Default: report observations, exit 0.
Only --max-freeze-seconds applies a technical identical-frame duration limit.
Easing, semantic alignment, object continuity and visual quality need review.
Requires ffmpeg/ffprobe; uses the Python standard library.
"""
from __future__ import annotations

import argparse
import bisect
import json
import math
import statistics
import subprocess
import sys
from fractions import Fraction
from pathlib import Path


def probe(path: Path) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames",
         "-show_entries", "stream=width,height,avg_frame_rate:"
         "frame=best_effort_timestamp_time,pkt_duration_time", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    info = json.loads(result.stdout)
    if not info.get("streams"):
        raise ValueError("Input has no video stream")
    video, frames = info["streams"][0], info.get("frames", [])
    if len(frames) < 2:
        raise ValueError("Film has fewer than two decoded video frames")
    try:
        absolute_times = [float(frame["best_effort_timestamp_time"]) for frame in frames]
    except (KeyError, ValueError) as exc:
        raise ValueError("Frame presentation timestamps are required") from exc
    times = [second - absolute_times[0] for second in absolute_times]
    steps = [right - left for left, right in zip(times, times[1:])]
    if any(not math.isfinite(t) for t in times) or any(step <= 0 for step in steps):
        raise ValueError("Frame presentation timestamps must increase strictly")
    last_duration = float(frames[-1].get("pkt_duration_time", 0))
    last_duration_source = "packet-duration"
    if not math.isfinite(last_duration) or last_duration <= 0:
        last_duration = statistics.median(steps)
        last_duration_source = "estimated-median-frame-interval"
    duration = times[-1] + last_duration
    try:
        fps = float(Fraction(video.get("avg_frame_rate", "0/1")))
    except (ValueError, ZeroDivisionError):
        fps = 0
    return {"width": int(video["width"]), "height": int(video["height"]),
            "fps": fps or len(frames) / duration, "times": times,
            "ends": times[1:] + [duration], "duration": duration,
            "last_frame_duration_s": last_duration,
            "last_frame_duration_source": last_duration_source}


def intervals(scores: list[float], times: list[float], ends: list[float],
              threshold: float, minimum_duration: float = 0) -> list[dict]:
    """A run includes both frames in each qualifying adjacent-frame comparison.

    Its interval starts at the first frame PTS and ends at the last frame display
    end. The final frame uses packet duration or the median observed interval.
    """
    found, start = [], None
    for index in range(len(scores) + 1):
        qualifies = index < len(scores) and scores[index] <= threshold
        if qualifies and start is None:
            start = index
        if not qualifies and start is not None:
            end_frame = index  # score[i] compares frame i with frame i + 1
            elapsed = ends[end_frame] - times[start]
            if elapsed + 1e-9 >= minimum_duration:
                found.append({
                    "start_frame": start, "end_frame": end_frame,
                    "frames": end_frame - start + 1,
                    "start_s": round(times[start], 6), "end_s": round(ends[end_frame], 6),
                    "duration_s": round(elapsed, 6),
                    "mean_change": round(statistics.mean(scores[start:index]), 5),
                    "max_change": round(max(scores[start:index]), 5),
                })
            start = None
    return found


def audit(path: Path, boundaries: list[float], sample_width: int,
          max_freeze_seconds: float | None = None, low_motion_threshold: float = 0.5,
          min_low_motion_seconds: float = 0.25, boundary_window_seconds: float = 0.2) -> dict:
    info = probe(path)
    width, height = info["width"], info["height"]
    times, ends, duration = info["times"], info["ends"], info["duration"]
    for second in boundaries:
        if not 0 < second < duration:
            raise ValueError(f"Boundary {second} must be inside the video timeline")
    sample_height = max(2, round(sample_width * height / width / 2) * 2)
    frame_size = sample_width * sample_height
    proc = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-map", "0:v:0", "-vf", f"scale={sample_width}:{sample_height}:flags=bilinear,format=gray",
         "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    scores, identical = [], []
    previous, frame_index = None, 0
    try:
        while True:
            frame = proc.stdout.read(frame_size)
            if not frame:
                break
            if len(frame) != frame_size:
                raise RuntimeError("Incomplete raw frame from ffmpeg")
            if previous is not None:
                if frame == previous:
                    identical.append(frame_index)
                    scores.append(0.0)
                else:
                    scores.append(sum(abs(a - b) for a, b in zip(frame, previous)) / frame_size)
            previous = frame
            frame_index += 1
    finally:
        proc.stdout.close()
    stderr = proc.stderr.read().decode(errors="replace")
    if proc.wait() != 0:
        raise RuntimeError(stderr.strip() or "ffmpeg failed")
    if frame_index != len(times):
        raise RuntimeError("Decoded-frame and timestamp counts differ; cannot report reliable intervals")
    frozen = intervals(scores, times, ends, 0)
    low_motion = intervals(scores, times, ends, low_motion_threshold, min_low_motion_seconds)
    longest = max(frozen, key=lambda run: run["duration_s"], default=None)
    longest_seconds = longest["duration_s"] if longest else 0
    within_limit = max_freeze_seconds is None or longest_seconds <= max_freeze_seconds + 1e-6
    sorted_scores, boundary_reports = sorted(scores), []
    comparison_times = times[1:]
    for second in boundaries:
        left = bisect.bisect_left(comparison_times, second - boundary_window_seconds)
        right = bisect.bisect_right(comparison_times, second + boundary_window_seconds)
        nearest = min(range(len(comparison_times)), key=lambda i: abs(comparison_times[i] - second))
        if left == right:
            left, right = nearest, nearest + 1
        sample = scores[left:right]
        boundary_reports.append({
            "second": second, "window_s": boundary_window_seconds,
            "nearest_comparison_s": round(comparison_times[nearest], 6),
            "comparison_count": len(sample),
            "min_change": round(min(sample), 5), "max_change": round(max(sample), 5),
            "median_change": round(statistics.median(sample), 5),
            "identical_frames": [i for i in identical if left + 1 <= i <= right],
        })
    return {
        "diagnostic": "sampled-decoded-frame-change", "report_version": 2,
        "ok": within_limit,
        "status": "reported" if max_freeze_seconds is None else (
            "within-freeze-limit" if within_limit else "exceeds-freeze-limit"),
        "ok_means": "No explicit freeze-duration limit exceeded; not an animation-quality judgment.",
        "video": path.name, "duration_s": round(duration, 6),
        "resolution": [width, height], "fps": round(info["fps"], 3),
        "sample_resolution": [sample_width, sample_height],
        "time_basis": "Per-frame presentation timestamps relative to the first video frame; no FPS-based indexing.",
        "last_frame_duration_s": round(info["last_frame_duration_s"], 6),
        "last_frame_duration_source": info["last_frame_duration_source"],
        "decoded_frames": frame_index,
        "identical_consecutive_frames": len(identical), "identical_frame_indices": identical[:30],
        "identical_frame_indices_truncated": len(identical) > 30,
        "longest_identical_run": longest, "longest_identical_run_s": longest_seconds,
        "identical_runs": frozen,
        "low_motion_threshold": low_motion_threshold, "min_low_motion_seconds": min_low_motion_seconds,
        "low_motion_intervals": low_motion,
        "mean_pixel_change_min": round(sorted_scores[0], 5),
        "mean_pixel_change_p05": round(sorted_scores[int(.05 * (len(sorted_scores) - 1))], 5),
        "mean_pixel_change_median": round(statistics.median(sorted_scores), 5),
        "max_freeze_seconds": max_freeze_seconds, "boundaries": boundary_reports,
        "measurement": "Mean absolute 8-bit grayscale difference (0-255) after bilinear downsampling. "
                       "Identical runs include both endpoint frames and their display time; indices are zero-based.",
        "limitations": [
            "Sampling can hide small movements; encoding noise or background drift can hide a visually static subject.",
            "Low-change intervals and boundary statistics are review hints, not automatic aesthetic failures.",
            "No assessment of easing, meaningful motion, object continuity, caption alignment or semantic alignment.",
            "Still reading holds may be intentional. Zero identical frames does not prove smooth or natural animation.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--boundaries", default="", help="Comma-separated video-relative beat times in seconds")
    parser.add_argument("--sample-width", type=int, default=120)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--max-freeze-seconds", type=float, default=None,
                        help="Optional limit; exit 1 only if an identical sampled-frame run exceeds it")
    parser.add_argument("--low-motion-threshold", type=float, default=0.5,
                        help="Mean grayscale change at/below which to flag a review interval (default: 0.5)")
    parser.add_argument("--min-low-motion-seconds", type=float, default=0.25)
    parser.add_argument("--boundary-window-seconds", type=float, default=0.2,
                        help="Seconds either side of each boundary to summarize (default: 0.2)")
    args = parser.parse_args()
    if args.sample_width < 32:
        parser.error("--sample-width must be at least 32")
    for field in ("max_freeze_seconds", "low_motion_threshold", "min_low_motion_seconds", "boundary_window_seconds"):
        value = getattr(args, field)
        if value is not None and (not math.isfinite(value) or value < 0):
            parser.error(f"--{field.replace('_', '-')} must be finite and non-negative")
    boundaries = [float(value) for value in args.boundaries.split(",") if value.strip()]
    report = audit(args.video, boundaries, args.sample_width, args.max_freeze_seconds,
                   args.low_motion_threshold, args.min_low_motion_seconds, args.boundary_window_seconds)
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"frame diagnostic failed: {exc}", file=sys.stderr)
        sys.exit(2)
