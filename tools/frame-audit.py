#!/usr/bin/env python3
"""
frame-audit.py — 对闸抓下来的每一张帧做像素级判定。

为什么要判像素：skill 自带的 scene-lint 查的是 STORYBOARD 里的**选卡**
（相邻不重样、高能卡配额…），它看不见画面。而真正让人一眼说「这不对」的三件事
全都只在像素里：

  · 坠底 —— 主体重心掉到画面下部。实测：落版格「有观点，就够了」重心在 70%，
            上方 53% 全空，读起来像掉下去了。SAFE 允许这么放，所以只能靠量。
  · 空帧 —— 转场缝里出现纯白或纯黑。实测：4.50s 硬切全白、4.30s 整幅涂黑，
            观感就是「卡了一下」。
  · 缺字幕 —— 底部字幕带一直空着。kit 预留了这条带子却从没有人去画。

输出 JSON 到 stdout：{"frames":[{...}], "fails":[...]}
退出码 0 = 全过，1 = 有硬伤。
"""
import sys, json, os

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"error": "缺 PIL —— pip3 install pillow"})); sys.exit(2)

# 判据阈值。跟 hw-kit.js 里的 HERO.lo / HERO.hi 和 CAPTION 带对齐，改一处要两处一起改。
HERO_LO, HERO_HI = 0.30, 0.58        # 重心允许的区间
CAPTION_TOP, CAPTION_BOT = 0.75, 0.86  # 字幕带
BLANK_MAX = 0.005                     # 墨覆盖低于这个 = 空帧
# 60% 而不是 85%：实测纸面手绘片正常帧的墨覆盖只有 1%–3%，
# 转场涂鸦盖到 76% 时肉眼已经是一记闷棍，85% 的线根本拦不住。
# 留在 60%，离正常帧还有 20 倍余量，不会误伤。
SMOTHER_MIN = 0.60                    # 墨覆盖高于这个 = 糊死（闷棍）
CAPTION_MIN = 0.003                   # 字幕带里至少要有这么多墨才算「有字幕」

# SAFE 内部允许的最大**连续空带**。
# 这条不是嫌画面疏 —— 手绘片本来就该疏，墨覆盖 1%–3% 是正常的。
# 它抓的是另一种病：主体挤在上半部（HERO 30%–58%）、字幕在 75%–86%，
# 中间 58%–75% 那一段系统性地空着，于是画面从中间断成两截，读起来就是「留白太多」。
# 实测：镜 03 中间有 33% 的连续空带、镜 01 有 29%，而铺了支撑层的镜 02/05/06 只有 7%–20%。
# 解法不是把主体放大，是补一层支撑信息把那段填住。
SAFE_TOP, SAFE_BOT = 0.042, 0.74      # 跟 hw-kit.js 的 SAFE 对齐
MAX_GAP = 0.25                        # 超过这个比例的连续空带 = 画面断成两截

def stats(path):
    im = Image.open(path).convert("L")
    W, H = im.size
    px = im.load()
    step = 3                           # 每 3 px 采一次，够用且快
    rows = {}
    total = 0
    cap_ink = 0
    cap_px = 0
    for y in range(0, H, step):
        c = 0
        for x in range(0, W, step):
            if px[x, y] < 200:         # 纸底约 247，低于 200 算墨
                c += 1
        if c:
            rows[y] = c
            total += c
        if CAPTION_TOP * H <= y <= CAPTION_BOT * H:
            cap_ink += c
            cap_px += W // step
    n = (W // step) * (H // step)
    cover = total / n if n else 0
    cy = (sum(y * c for y, c in rows.items()) / total / H) if total else 0

    # SAFE 内部最大的连续空带。一行墨点 ≤2 才算空，滤掉抗锯齿噪点。
    gap = cur = 0.0
    for y in range(0, H, step):
        if not (SAFE_TOP * H <= y <= SAFE_BOT * H):
            continue
        if rows.get(y, 0) <= 2:
            cur += step / H
        else:
            gap = max(gap, cur)
            cur = 0.0
    gap = max(gap, cur)

    return {
        "w": W, "h": H,
        "coverage": round(cover, 4),
        "centroid": round(cy, 3),
        "caption_ink": round(cap_ink / cap_px, 4) if cap_px else 0,
        "max_gap": round(gap, 3),
    }

def main():
    files = sys.argv[1:]
    want_caption = os.environ.get("AUDIT_CAPTIONS", "") == "1"
    # 重心只在「落定的那一帧」上判 —— 构图是静态属性，动画进行到一半时重心本来就是偏的。
    # 不限定的话，每格 30% 采样点（主体才画了一半）会被误报成「顶头」。实测踩过一次。
    only = set(x for x in os.environ.get("AUDIT_CENTROID_ONLY", "").split(",") if x)
    out, fails = [], []
    for f in files:
        if not os.path.exists(f):
            continue
        s = stats(f)
        s["file"] = os.path.basename(f)
        judge_centroid = (not only) or (s["file"] in only)
        bad = []
        if s["coverage"] < BLANK_MAX:
            bad.append("空帧：画面几乎什么都没有（墨覆盖 %.2f%%）" % (s["coverage"] * 100))
        elif s["coverage"] > SMOTHER_MIN:
            bad.append("糊死：墨覆盖 %.0f%%，整幅被盖住" % (s["coverage"] * 100))
        elif judge_centroid:
            # 空帧/糊死的时候重心没有意义，所以只在正常帧上判坠底
            if s["centroid"] > HERO_HI:
                bad.append("坠底：视觉重心在 %.0f%%，超过 %.0f%% 上限" % (s["centroid"] * 100, HERO_HI * 100))
            elif s["centroid"] and s["centroid"] < HERO_LO:
                bad.append("顶头：视觉重心在 %.0f%%，高过 %.0f%% 下限" % (s["centroid"] * 100, HERO_LO * 100))
        if want_caption and s["caption_ink"] < CAPTION_MIN:
            bad.append("字幕带是空的（该有字幕的片子）")
        # 空带跟重心一样是构图属性，只在落定的那一帧判 —— 动画演到一半时下半截本来就还没长出来
        if judge_centroid and BLANK_MAX <= s["coverage"] <= SMOTHER_MIN and s["max_gap"] > MAX_GAP:
            bad.append("留白断层：SAFE 里有 %.0f%% 的连续空带，画面从中间断成两截（补一层支撑信息，别放大主体）"
                       % (s["max_gap"] * 100))
        s["fails"] = bad
        if bad:
            fails.append({"file": s["file"], "why": bad})
        out.append(s)
    print(json.dumps({"frames": out, "fails": fails}, ensure_ascii=False, indent=2))
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
