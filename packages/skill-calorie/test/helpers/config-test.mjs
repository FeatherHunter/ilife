/**
 * #676 · 技能侧测试的**配置隔离基座**（`packages/skill-calorie/test/` 共用）。
 *
 * 背景：卡路里技能侧的落点从环境变量改成读配置文件（`~/.ilife/calorie.yaml`，`ILIFE_CONFIG_DIR`
 * 可整体改基座）。于是测试的隔离口也从「传一个 `SKILLS_DB_PATH`」变成「把配置目录指到临时目录、
 * 在那里落一份 `calorie.yaml`」。两件小事收在这里，逐件测试只写一行：
 *
 *   ① `calorieConfigDir(dir, extra?)` —— 把 `dir` 写进 `process.env.ILIFE_CONFIG_DIR`，并在
 *      `<dir>/calorie.yaml` 落一份默认配置（`db.dir = dir`，另把 `xunji.stateDir` 指到 `<dir>/xunji-state`：
 *      **训记三份状态文件必须一起隔离**——不隔离就会读到真实 `~/.mavis` 的限频时刻，测试会真的睡
 *      45 秒，还会往用户家目录里写文件）。`extra` 里的组**按键合并**（如 `{ photos: { dir } }` 指照片目录、
 *      `{ land: { scheduleCli } }` 指跨技能出口、`{ db: { dir: 别的目录 } }` 让配置目录与库目录分开）。
 *      **缺了 `dir`（空／非字符串）即响亮报错**：隔离口缺位会让配置落到真实家目录，必须当场炸。
 *   ② `freezeClock(iso)` —— 「今天」的钉子。`CALORIE_TODAY` 已随裁定删除，替代品是同目录的
 *      `freeze-clock.cjs`：经 `NODE_OPTIONS=--require <绝对路径>` 预载进**子进程**，把整个
 *      `Date` 一次盖住（不只 `todayISO()`）。返回值直接摊进 spawn 的 env：
 *      `env: { ...process.env, ILIFE_CONFIG_DIR: …, ...freezeClock('2026-09-07') }`。
 *   ③ `pinProcessClock(iso)` —— 同一套钉子，但同时钉**当刻进程**（就地 `Date`）与它 spawn 的
 *      子进程。给「本进程里调 dist 代码、同文件又要 spawn CLI」的那种测试用。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`），与同目录 `pin-clock.mjs` 同列。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinClockTo } from '../pin-clock.mjs';

/** 钉钟预载件的绝对路径（`node --require` 用）。 */
const FREEZE_CJS = fileURLToPath(new URL('../freeze-clock.cjs', import.meta.url));

/** 与 `base-link-core` 的写出口同一条规则：数字／布尔裸写，字符串只在必要时加双引号
 *  （Windows 路径含 `:` 与 `\`，必加引号；解析器认双引号里的 `\\` 转义）。 */
function scalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  const plain = /^[A-Za-z0-9_\u4e00-\u9fff][^#:'"\s]*$/.test(s);
  const numeric = /^-?\d+(?:\.\d+)?$/.test(s);
  if (s === '' || numeric || s === 'true' || s === 'false' || !plain) return JSON.stringify(s);
  return s;
}

/**
 * 把 `dir` 设成配置目录并在那里落一份 `calorie.yaml`，返回 `dir`（便于直接写进 env）。
 *
 * @param {string} dir 配置目录（测试一律传 tmp 目录）
 * @param {Record<string, Record<string, string | number | boolean>>} [extra] 额外配置组（**按键合并**，同组同名项以 extra 为准）
 * @returns {string} `dir`
 */
export function calorieConfigDir(dir, extra = {}) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new Error(
      'calorieConfigDir 需要一个目录：测试隔离一律走 ILIFE_CONFIG_DIR 指向临时目录。' +
        '缺了它配置会落到真实家目录，故这里当场报错（实际收到：' + JSON.stringify(dir) + '）',
    );
  }
  mkdirSync(dir, { recursive: true });
  // 训记三份状态文件一起进临时目录：不隔离会读到真实 `~/.mavis`（限频时刻一命中就得真睡 45 秒）。
  const groups = { db: { dir }, xunji: { stateDir: join(dir, 'xunji-state') } };
  for (const [group, inner] of Object.entries(extra)) groups[group] = { ...(groups[group] ?? {}), ...inner };
  const lines = [];
  for (const [group, inner] of Object.entries(groups)) {
    lines.push(group + ':');
    for (const [key, value] of Object.entries(inner)) lines.push('  ' + key + ': ' + scalar(value));
  }
  writeFileSync(join(dir, 'calorie.yaml'), lines.join('\n') + '\n', 'utf8');
  process.env.ILIFE_CONFIG_DIR = dir;
  return dir;
}

/** 一件测试的**模块级基座**：新建一个临时配置目录并把它设成 `ILIFE_CONFIG_DIR`，返回该目录。
 *
 * 什么时候要它：本件测试**进程内**调 dist 代码（就地 `dispatch`／渲页）时也要有隔离基座——
 * 配置读不到 `ILIFE_CONFIG_DIR` 会当场抛 `CONFIG_TEST_ISOLATION_MISSING`（这是设计行为，不是误报）。
 * 用法：`process.env.ILIFE_CONFIG_DIR = configTestBase();` 写在 import 之后、用例之前。
 * 逐用例再调 `calorieConfigDir(dir)` 会照常覆盖它。 */
export function configTestBase(tag = 'calorie-cfg-base-') {
  return calorieConfigDir(mkdtempSync(join(tmpdir(), tag)));
}

/** 子进程用的钉钟环境（`--require` 预载 ＋ `FAKE_NOW_ISO`）。
 * ⚠️ 路径**不加引号**：`NODE_OPTIONS` 的解析器会把引号与反斜杠一起吃掉
 * （实测 `--require "D:\a\b.cjs"` → `D:ab.cjs`，`Cannot find module`）。本仓路径无空白，
 * 故裸写；真遇上带空白的路径即当场报错，别静默钉不上钟。 */
export function freezeClock(iso) {
  const day = String(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('freezeClock 需要 YYYY-MM-DD 形状的日期（实际收到：' + JSON.stringify(iso) + '）');
  }
  if (/\s/.test(FREEZE_CJS)) {
    throw new Error('钉钟预载件路径含空白（' + FREEZE_CJS + '）：NODE_OPTIONS 传不了，请把仓库放到无空白的路径下');
  }
  return { NODE_OPTIONS: '--require ' + FREEZE_CJS, FAKE_NOW_ISO: day + 'T12:00:00' };
}

/** 当刻进程 ＋ 后续子进程一起钉到 `iso` 那一天（`CALORIE_TODAY` 退役后的就地替代）。 */
export function pinProcessClock(iso) {
  const env = freezeClock(iso);
  const prior = process.env.NODE_OPTIONS ?? '';
  process.env.NODE_OPTIONS = prior === '' || prior.includes('freeze-clock.cjs') ? env.NODE_OPTIONS : prior + ' ' + env.NODE_OPTIONS;
  process.env.FAKE_NOW_ISO = env.FAKE_NOW_ISO;
  pinClockTo(String(iso).slice(0, 10));
}
