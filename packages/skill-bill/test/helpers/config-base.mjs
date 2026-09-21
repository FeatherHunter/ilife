/**
 * #726 · 技能侧测试的**隔离基座**（`packages/skill-bill/test/` 共用）。
 *
 * #763 换通道：从「设环境变量 `ILIFE_CONFIG_DIR`」换成**改家目录**（Windows `USERPROFILE`／POSIX `HOME`）。
 * 理由（票 #763 的裁决，出处 #756）：家目录是**操作系统的事实**，生产代码里不留「配置根可被外部覆盖」
 * 的开关；测试改的是 `os.homedir()` 的输入，与生产算配置目录的**同一条路**。
 *
 * 落点关系（本件是唯一说明处）：调用方传进来的 `dir`＝**家目录**，配置落在 `<dir>/.life/bill.yaml`；
 * `db.dir` 仍指 `dir` 本身——与改造前逐字相同，**产品落点断言一个都不用改**。
 *
 * 三件小事收在这里，逐件测试只写一行：
 *
 *   ① `billConfigDir(dir, extra?)` —— 把 `dir` 布成隔离现场：落 `<dir>/.life/bill.yaml`（`db.dir = dir`）
 *      并把**当刻进程**的家目录接管过去。`extra` 里的组**按键合并**（如 `{ html: { dir } }` 改产物目录名、
 *      `{ db: { dir: 别的目录 } }` 让配置目录与库目录分开）。
 *      **缺了 `dir`（空／非字符串）即响亮报错**，建完**当场自证**当刻家目录不是真实家目录。
 *   ② `billEnv(dir, extraEnv?)` —— 给**子进程**用的那格：先按①把现场建好（含**当刻进程**的家目录接管），
 *      再回 `{ ...process.env, USERPROFILE: dir, HOME: dir, ...extraEnv }`。用法：
 *      `spawnSync(NODE, [bin, ...args], { env: billEnv(DB) })`。**调用点写法一字不改**。
 *      为什么当刻进程也要接管：本包里 `before()` 常是「先 spawn 几条写命令把库种出来，再在当刻进程里
 *      调 dist 读回来」——当刻进程的家目录没跟着走时，它读到的是**真实那份**配置（`db.dir` 为空即
 *      落到真实 `~/.ilife/data`），于是「库在临时目录里」与「配置指真实落点」两半对不上。
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
// 共用基座（跨件）：家目录通道的口径、配置目录算法与自证都住那儿，六家只借不抄。
import { configDirOf, HOME_ENV_KEYS, homeEnvOf, requireIsolatedHome, useHome } from '../../../../test/helpers/home-test-base.mjs';

export { configDirOf, HOME_ENV_KEYS, homeEnvOf, requireIsolatedHome, useHome };

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
 * 把 `dir` 布成隔离现场（家目录＝`dir`，配置落 `<dir>/.life/bill.yaml`），返回 `dir`。
 *
 * @param {string} dir 家目录（测试一律传 tmp 目录）
 * @param {Record<string, Record<string, string | number | boolean>>} [extra] 额外配置组（**按键合并**，同组同名项以 extra 为准）
 * @returns {string} `dir`
 */
export function billConfigDir(dir, extra = {}) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new Error(
      'billConfigDir 需要一个目录：测试隔离一律把家目录指到临时目录。' +
        '缺了它配置会落到真实家目录，故这里当场报错（实际收到：' + JSON.stringify(dir) + '）',
    );
  }
  const cfgDir = configDirOf(dir);
  mkdirSync(cfgDir, { recursive: true });
  // 库目录＝传进来的这个目录本身：与改造前 `SKILLS_DB_PATH=dir` 的落点逐字相同（老断言不动）。
  const groups = { db: { dir } };
  for (const [group, inner] of Object.entries(extra)) groups[group] = { ...(groups[group] ?? {}), ...inner };
  const lines = [];
  for (const [group, inner] of Object.entries(groups)) {
    lines.push(group + ':');
    for (const [key, value] of Object.entries(inner)) lines.push('  ' + key + ': ' + scalar(value));
  }
  writeFileSync(join(cfgDir, 'bill.yaml'), lines.join('\n') + '\n', 'utf8');
  useHome(dir);
  requireIsolatedHome(); // 设完当场自证：当刻家目录还不是临时那份就是基座自己坏了
  return dir;
}

/** 子进程那格环境：建好现场（见 `billConfigDir`，含当刻进程接管）再回 `env`，`extraEnv` 覆盖在最后。 */
export function billEnv(dir, extraEnv = undefined) {
  billConfigDir(dir);
  useHome(dir); // 当刻进程也接管：子进程与当刻进程读的必须是同一份配置（见件头 ②）
  return homeEnvOf(dir, extraEnv);
}

/** 一件测试的**模块级基座**：新建一个临时目录当**家目录**、布好现场并接管当刻进程的家目录。
 *
 * 什么时候要它：本件测试**进程内**调 dist 代码（就地调 `resolveDbPath()`／`dispatch`／渲页）时也要有
 * 隔离基座——家目录还是真实那份就会当场抛（见 `requireIsolatedHome()` 与生产侧同一判据的守卫）。
 * 用法：`configTestBase();` 写在 import 之后、用例之前（返回值即那个家目录，多数件用不上）。 */
export function configTestBase(tag = 'bill-cfg-base-') {
  return billConfigDir(mkdtempSync(join(tmpdir(), tag)));
}

/**
 * 当刻进程家目录两格的**存档**：逐用例换现场时，`billConfigDir`／`billEnv` 会把两格改掉，
 * 用例收尾要把它们一起还原（原本 `undefined` 的那格要 `delete`，不是设成空串）。
 *
 * 用法：`const restore = saveHomeEnv(); try { … } finally { restore(); }`
 *
 * @returns {() => void} 还原函数（可重复调用）
 */
export function saveHomeEnv() {
  const saved = HOME_ENV_KEYS.map((key) => [key, process.env[key]]);
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
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
