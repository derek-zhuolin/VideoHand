/* update-check.mjs — 告诉用户"你手上这份旧了"，但绝不因此拖慢或拖垮任何事。
 *
 * 为什么需要它：这个 skill 是 clone / npm 装到别人机器上的，装完就跟上游断了联系。
 * 上游修了一个"要渲一支片才看得见"的 bug，用户那份不会自己知道。
 *
 * 为什么要写得这么小心：一个版本检查值不了几个钱，但它有三种把工具搞坏的方式，
 * 每一种都比"没有更新提示"严重得多 ——
 *
 *   ① 阻塞。 同步等网络 = 用户断网时每次调用都卡在那里。
 *      → 只用异步 + 1.5s 超时 + AbortController，超时就当没这回事。
 *
 *   ② 报错。 registry 不通（公司内网、镜像源、飞机上）不是用户的错，
 *      更不该让主流程失败。
 *      → 全链路 catch 到底，任何异常都静默返回 null。**永不 throw。**
 *
 *   ③ 打扰。 每次调用都打一次 registry，既慢又是对 npm 的骚扰。
 *      → 结果落盘缓存 24h。第二次调用连请求都不发。
 *
 * 一句话：**它可以完全不工作，但不许妨碍别人工作。**
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PKG = "videohand";
const REGISTRY = process.env.VIDEOHAND_REGISTRY || "https://registry.npmjs.org";
const CACHE = join(tmpdir(), "videohand-update-check.json");
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const TIMEOUT_MS = 1500;

/** 语义化版本比较：a 比 b 新则返回 true。非法输入一律返回 false（宁可不提醒）。 */
export function isNewer(a, b) {
  const parse = (v) =>
    String(v || "")
      .trim()
      .replace(/^v/, "")
      .split("-")[0] // 预发布后缀不参与比较
      .split(".")
      .map((n) => parseInt(n, 10));
  const [x, y] = [parse(a), parse(b)];
  if (x.length !== 3 || y.length !== 3) return false;
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return false;
  for (let i = 0; i < 3; i++) {
    if (x[i] > y[i]) return true;
    if (x[i] < y[i]) return false;
  }
  return false;
}

function readCache() {
  try {
    const c = JSON.parse(readFileSync(CACHE, "utf8"));
    if (typeof c.at !== "number" || Date.now() - c.at > TTL_MS) return null;
    return c;
  } catch {
    return null;
  }
}

function writeCache(latest) {
  try {
    writeFileSync(CACHE, JSON.stringify({ at: Date.now(), latest }), "utf8");
  } catch {
    /* 缓存写不进去（只读 /tmp？）也不算事，下次重查而已 */
  }
}

/**
 * 查上游最新版。
 * @returns {Promise<{latest: string, outdated: boolean, cached: boolean} | null>}
 *          null = 查不到 / 被跳过。调用方必须把 null 当成"正常情况"处理。
 */
export async function checkForUpdate(current) {
  // 逃生开关：CI、离线环境、或者单纯不想被打扰
  if (process.env.VIDEOHAND_NO_UPDATE_CHECK) return null;

  const cached = readCache();
  if (cached) {
    return {
      latest: cached.latest,
      outdated: isNewer(cached.latest, current),
      cached: true,
    };
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const res = await fetch(`${REGISTRY}/${PKG}/latest`, {
      signal: ac.signal,
      headers: { accept: "application/vnd.npm.install-v1+json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { version } = await res.json();
    if (!version) return null;
    writeCache(version);
    return { latest: version, outdated: isNewer(version, current), cached: false };
  } catch {
    // 网络不通、超时、DNS 挂了、JSON 坏了 —— 一律当作"这次不提醒"
    return null;
  }
}

/** 把提示打到 stderr（不污染 stdout，管道里用得上）。查不到就什么都不打。 */
export async function printUpdateNotice(current) {
  const r = await checkForUpdate(current);
  if (!r || !r.outdated) return;
  console.error(
    `\n◇ 有新版 ${r.latest}（你在用 ${current}）\n` +
      `  升级：npx videohand@latest install\n`
  );
}
