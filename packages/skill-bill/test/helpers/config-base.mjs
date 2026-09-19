/**
 * #726 · 技能侧测试的**配置隔离基座**（`packages/skill-bill/test/` 共用）。
 *
 * 背景：记账技能侧的落点从环境变量改成读配置文件（`~/.ilife/bill.yaml`，`ILIFE_CONFIG_DIR`
 * 可整体改基座）。于是测试的隔离口也从「传一个 `SKILLS_DB_PATH`」变成「把配置目录指到临时目录、
 * 在那里落一份 `bill.yaml`」。三件小事收在这里，逐件测试只写一行：
 *
 *   ① `billConfigDir(dir, extra?)` —— 把 `dir` 写进 `process.env.ILIFE_CONFIG_DIR`，并在
 *      `<dir>/bill.yaml` 落一份配置（`db.dir = dir`，即库就落在 `dir` 里，与改造前
 *      `SKILLS_DB_PATH=dir` 的落点逐字相同——老断言一个都不用改）。`extra` 里的组**按键合并**
 *      （如 `{ html: { dir } }` 改产物目录名、`{ db: { dir: 别的目录 } }` 让配置目录与库目录分开）。
 *      **缺了 `dir`（空／非字符串）即响亮报错**：隔离口缺位会让配置落到真实家目录，必须当场炸。
 *   ② `billEnv(dir, extraEnv?)` —— 给**子进程**用的那格：先按①把基座建好，再回
 *      `env: { ...process.env, ILIFE_CONFIG_DIR: dir, ...extraEnv }`。用法：
 *      `spawnSync(NODE, [bin, ...args], { env: billEnv(DB) })`。
 *   ③ `freezeClock(iso)` —— 「今天」的钉子。`BILL_TODAY` 已随 #675 删除，替代品是同目录的
 *      `freeze-clock.cjs`：经 `NODE_OPTIONS=--require <绝对路径>` 预载进**子进程**，把整个
 *      `Date` 一次盖住（不只 `rangeAnchor`）。返回值直接摊进 spawn 的 env：
 *      `env: billEnv(DB, freezeClock('2026-09-07'))`。
 *      另给 `pinProcessClock(iso)`：同一套钉子，但同时钉**当刻进程**（就地 `Date`）与它 spawn 的子进程。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`），与同目录 `freeze-clock.cjs` 同列。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 钉钟预载件的绝对路径（`node --require` 用）。 */
const FREEZE_CJS = fileURLToPath(new URL('./freeze-clock.cjs', import.meta.url));

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
 * 把 `dir` 设成配置目录并在那里落一份 `bill.yaml`，返回 `dir`（便于直接写进 env）。
 *
 * @param {string} dir 配置目录（测试一律传 tmp 目录）
 * @param {Record<string, Record<string, string | number | boolean>>} [extra] 额外配置组（**按键合并**，同组同名项以 extra 为准）
 * @returns {string} `dir`
 */
export function billConfigDir(dir, extra = {}) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new Error(
      'billConfigDir 需要一个目录：测试隔离一律走 ILIFE_CONFIG_DIR 指向临时目录。' +
        '缺了它配置会落到真实家目录，故这里当场报错（实际收到：' + JSON.stringify(dir) + '）',
    );
  }
  mkdirSync(dir, { recursive: true });
  // 库目录＝这个临时目录本身：与改造前 `SKILLS_DB_PATH=dir` 的落点逐字相同（老断言不动）。
  const groups = { db: { dir } };
  for (const [group, inner] of Object.entries(extra)) groups[group] = { ...(groups[group] ?? {}), ...inner };
  const lines = [];
  for (const [group, inner] of Object.entries(groups)) {
    lines.push(group + ':');
    for (const [key, value] of Object.entries(inner)) lines.push('  ' + key + ': ' + scalar(value));
  }
  writeFileSync(join(dir, 'bill.yaml'), lines.join('\n') + '\n', 'utf8');
  process.env.ILIFE_CONFIG_DIR = dir;
  return dir;
}

/** 子进程那格环境：建好基座（见 `billConfigDir`）再回 `env`，`extraEnv` 覆盖在最后。 */
export function billEnv(dir, extraEnv = undefined) {
  billConfigDir(dir);
  return { ...process.env, ILIFE_CONFIG_DIR: dir, ...(extraEnv ?? {}) };
}

/** 一件测试的**模块级基座**：新建一个临时配置目录、落好 `bill.yaml` 并把它设成 `ILIFE_CONFIG_DIR`。
 *
 * 什么时候要它：本件测试**进程内**调 dist 代码（就地调 `resolveDbPath()`／`dispatch`／渲页）时也要有
 * 隔离基座——配置读不到 `ILIFE_CONFIG_DIR` 会当场抛 `CONFIG_TEST_ISOLATION_MISSING`（设计行为，不是误报）。
 * 用法：`process.env.ILIFE_CONFIG_DIR = configTestBase();` 写在 import 之后、用例之前。 */
export function configTestBase(tag = 'bill-cfg-base-') {
  return billConfigDir(mkdtempSync(join(tmpdir(), tag)));
}

/** 子进程用的钉钟环境（`--require` 预载 ＋ `FAKE_NOW_ISO`）。
 *  ⚠️ 路径**不加引号**：`NODE_OPTIONS` 的解析器会把引号与反斜杠一起吃掉（实测 `--require "D:\a\b.cjs"`
 *  → `D:ab.cjs`，`Cannot find module`）。本仓路径无空白，故裸写；真遇上带空白的路径即当场报错。 */
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

/** 当刻进程 ＋ 后续子进程一起钉到 `iso` 那一天（`BILL_TODAY` 退役后的就地替代）。 */
export function pinProcessClock(iso) {
  const env = freezeClock(iso);
  const prior = process.env.NODE_OPTIONS ?? '';
  process.env.NODE_OPTIONS = prior === '' || prior.includes('freeze-clock.cjs') ? env.NODE_OPTIONS : prior + ' ' + env.NODE_OPTIONS;
  process.env.FAKE_NOW_ISO = env.FAKE_NOW_ISO;
  const raw = String(iso).slice(0, 10) + 'T12:00:00';
  const RealDate = Date;
  const fixed = RealDate.parse(raw + 'Z');
  class FakeDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(fixed);
      else super(...a);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FakeDate;
}
