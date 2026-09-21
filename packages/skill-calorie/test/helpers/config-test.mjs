/**
 * #676 · 技能侧测试的**配置隔离基座**（`packages/skill-calorie/test/` 共用）。
 *
 * 背景：卡路里技能侧的落点从环境变量改成读配置文件（`~/.ilife/calorie.yaml`）。#763 又把**隔离通道**
 * 从「设 `ILIFE_CONFIG_DIR`」换成**改家目录**（Windows `USERPROFILE`／POSIX `HOME`）——家目录是操作系统的
 * 事实，生产代码里不留「配置根可被外部覆盖」的开关。落点关系：传进来的 `dir`＝**家目录**，配置落在
 * `<dir>/.ilife/calorie.yaml`；`db.dir` 仍指 `dir` 本身（产品落点断言一字不动）。
 *
 * 本件收五件小事，逐件测试只写一行：
 *
 *   ① `calorieConfigDir(dir, extra?)` —— 把 `dir` 布成隔离现场：落 `<dir>/.ilife/calorie.yaml`
 *      （`db.dir = dir`，另把 `xunji.stateDir` 指到 `<dir>/xunji-state`：**训记三份状态文件必须一起隔离**
 *      ——不隔离就会读到真实 `~/.mavis` 的限频时刻，测试会真的睡 45 秒）并把当刻进程的家目录接管过去。
 *      `extra` 里的组**按键合并**（如 `{ photos: { dir } }` 指照片目录、`{ db: { dir: 别的目录 } }`
 *      让配置目录与库目录分开）。**缺了 `dir`（空／非字符串）即响亮报错**，建完**当场自证**
 *      当刻家目录不是真实家目录。
 *   ② `calorieEnv(dir, extraEnv?)` —— 子进程那格环境（`{ ...process.env, USERPROFILE: dir, HOME: dir, … }`），
 *      直接摊进 spawn：`env: { ...calorieEnv(dir), ...freezeClock('2026-09-07') }`。
 *   ③ `freezeClock(iso)` / `pinProcessClock(iso)` —— 「今天」的钉子。`CALORIE_TODAY` 已随裁定删除，
 *      替代品是同目录的 `freeze-clock.cjs`：经 `NODE_OPTIONS=--require <绝对路径>` 预载进**子进程**，
 *      把整个 `Date` 一次盖住（不只 `todayISO()`）；`pinProcessClock` 同时钉当刻进程与它 spawn 的子进程。
 *   ④ `saveHome()` / `restoreHome(saved)` —— 两格家目录的存档与还原（「本用例临时接管、用后不留痕」）。
 *   ⑤ `probeGuard(extraEnv?)` —— 隔离护栏的**探针**（只调 `resolveConfigDir()`，不碰盘）：两格家目录指到
 *      真实账号家目录时必须回 `THREW:CONFIG_TEST_ISOLATION_MISSING`，指到临时家目录时必须回 `OK:…`。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`），与同目录 `pin-clock.mjs` 同列。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// 共用基座（跨件）：家目录通道的口径、配置目录算法与自证都住那儿，六家只借不抄。
import { HOME_ENV_KEYS, configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../../test/helpers/home-test-base.mjs';
import { pinClockTo } from '../pin-clock.mjs';

export { configDirOf, homeEnvOf, requireIsolatedHome, useHome };

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
 * 把 `dir` 布成隔离现场（家目录＝`dir`，配置落 `<dir>/.ilife/calorie.yaml`），返回 `dir`。
 *
 * @param {string} dir 家目录（测试一律传 tmp 目录）
 * @param {Record<string, Record<string, string | number | boolean>>} [extra] 额外配置组（**按键合并**，同组同名项以 extra 为准）
 * @returns {string} `dir`
 */
export function calorieConfigDir(dir, extra = {}) {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new Error(
      'calorieConfigDir 需要一个目录：测试隔离一律把家目录指到临时目录。' +
        '缺了它配置会落到真实家目录，故这里当场报错（实际收到：' + JSON.stringify(dir) + '）',
    );
  }
  const cfgDir = configDirOf(dir);
  mkdirSync(cfgDir, { recursive: true });
  // 训记三份状态文件一起进临时目录：不隔离会读到真实 `~/.mavis`（限频时刻一命中就得真睡 45 秒）。
  const groups = { db: { dir }, xunji: { stateDir: join(dir, 'xunji-state') } };
  for (const [group, inner] of Object.entries(extra)) groups[group] = { ...(groups[group] ?? {}), ...inner };
  const lines = [];
  for (const [group, inner] of Object.entries(groups)) {
    lines.push(group + ':');
    for (const [key, value] of Object.entries(inner)) lines.push('  ' + key + ': ' + scalar(value));
  }
  writeFileSync(join(cfgDir, 'calorie.yaml'), lines.join('\n') + '\n', 'utf8');
  useHome(dir);
  requireIsolatedHome(); // 设完当场自证：当刻家目录还不是临时那份就是基座自己坏了
  return dir;
}

/** 子进程那格环境：建好现场（见 `calorieConfigDir`）再回 `env`，`extraEnv` 覆盖在最后。 */
export function calorieEnv(dir, extraEnv = undefined) {
  calorieConfigDir(dir);
  return homeEnvOf(dir, extraEnv);
}

/** 护栏正本的落点（`base-link-core` 的编译产物；探针只 import 它，不为测试另开第二条路）。 */
const DIRS_JS = fileURLToPath(new URL('../../../../packages/base-link-core/dist/config/dirs.js', import.meta.url));

/** 当刻进程**两格家目录**的存档（给「本用例临时接管、用后原样还原」的测试用）。
 *
 * #763 起隔离状态是**两格**（`USERPROFILE`／`HOME`），不再是单个环境变量：还原必须两格一起，
 * 且原本是 `undefined` 的要 `delete`（把「本来没设」还原成「没设」，不是还原成空串）。 */
export function saveHome() {
  const saved = {};
  for (const key of HOME_ENV_KEYS) saved[key] = process.env[key];
  return saved;
}

/** 把两格家目录还原到 `saveHome()` 存档那一份（原本没设即删掉，不留痕）。 */
export function restoreHome(saved) {
  for (const key of HOME_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
}

/** 隔离护栏的探针（#763 ②）：起一个**只调 `resolveConfigDir()`** 的子进程，读它抛不抛
 *  `CONFIG_TEST_ISOLATION_MISSING`；返回 `OK:<配置目录>` 或 `THREW:<错误码>`。
 *
 * 为什么是探针而不是拿技能命令做「缺隔离」实验：`resolveConfigDir()` **不碰盘**（`mkdir` 在它之后），
 * 所以哪怕护栏哪天 fail-open，这条用例也写不出真实数据；拿真命令做实验则一旦失守就真写。
 *
 * **「缺隔离」怎么表达**：Windows 上「两格都不给」造不出缺隔离现场——子进程的环境块里少了
 * `USERPROFILE`，操作系统会**补回来**（实测：补的是调用方进程环境块里那一份），于是家目录又指回了
 * 临时目录。故缺隔离一律**显式**表达：两格指到**真实账号家目录**（`realHomeDir()`，家目录注入改不动它）
 * ⇒ 配置目录正好是真实 `~/.ilife`，护栏必须拦下。反向对照＝两格指一个临时家目录 ⇒ 不许抛。
 *
 * 探针环境＝当刻进程环境先摘掉两格家目录，再摊 `extraEnv`；
 * `NODE_TEST_CONTEXT` 明写：护栏的判据是「跑在 node 测试运行器里却要落到真实家目录」。
 *
 * @param {Record<string, string>} [extraEnv] 探针子进程的额外环境（通常给 `homeEnvOf(<某个家目录>)`）
 * @returns {string} `OK:<配置目录>` 或 `THREW:<错误码>`
 */
export function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(pathToFileURL(DIRS_JS).href) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const env = { ...process.env };
  delete env.USERPROFILE; delete env.HOME;
  Object.assign(env, extraEnv);
  env.NODE_TEST_CONTEXT = 'child-v8';
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

/** 一件测试的**模块级基座**：新建一个临时目录当**家目录**、布好现场并接管当刻进程的家目录，返回该家目录。
 *
 * 什么时候要它：本件测试**进程内**调 dist 代码（就地 `dispatch`／渲页）时也要有隔离基座——
 * 家目录还是真实那份就会当场抛（`requireIsolatedHome()` 与生产侧守卫同一条判据）。
 * 用法：`configTestBase();` 写在 import 之后、用例之前。逐用例再调 `calorieConfigDir(dir)` 会照常接管。 */
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
