#!/usr/bin/env node
/** #87 返修（第二轮审查 A2/A1 缺陷）证据采集 · 可复跑。
 *
 * 用法：先 `pnpm build`，再 `node docs/research/t87-fix-evidence.mjs`
 *   - 只读 `packages/skill-calorie/dist/**` ＋ 在**系统临时目录**跑 CLI；不改源码、不写仓库工作树；
 *   - 非门禁操作（不 build／不 node --test／不 git），故不持 `gate.lock`；
 *   - Markdown 结果打到 stdout，并另落一份 `.scratch/t87/fix-evidence-*.md`（施工草稿，gitignore）。
 *
 * 覆盖：F1 截断按 UTF-16 码元 → 盘上名 ≠ 回传名；F2 同秒计数大小写敏感 → 覆盖原文件；
 *       F3 动态 command 段／suffix 段未复刻（如实记账用实测）；F4 落点解析失败 exit 4「未知失败」。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DIST = join(ROOT, 'packages', 'skill-calorie', 'dist');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const SCRATCH = join(ROOT, '.scratch', 't87');
const TMP_ROOT = mkdtempSync(join(tmpdir(), 't87-evidence-'));
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 路径守卫（协议 §2.1-3）：递归删除前断言目标在本次独占临时根之下（或即该根）。 */
function guardedRm(p) {
  const abs = resolve(p);
  const root = resolve(TMP_ROOT);
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error('路径守卫失败，拒绝删除：' + abs);
  rmSync(abs, { recursive: true, force: true });
}

const mod = (rel) => import(pathToFileURL(join(DIST, rel)).href);
const { sanitizeFilenamePart, htmlFileName, chineseCommandFor, HTML_DIR_NAME } = await mod('output.js');
const { openDb } = await mod('index.js');

function runCli(dir, args) {
  return spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
}
function okJson(dir, args) {
  const r = runCli(dir, args);
  if (r.status !== 0) throw new Error('CLI 非 0（' + r.status + '）：' + String(r.stderr).slice(-400));
  return JSON.parse(String(r.stdout));
}
function lsHtml(dir) {
  const d = join(dir, HTML_DIR_NAME);
  try { return readdirSync(d).sort(); } catch { return []; }
}
function localIso(msAgo) {
  const d = new Date(Date.now() - msAgo);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
const loneSurrogate = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };

try {
  // ============================================================ F1
  say('### F1 截断按 UTF-16 码元 → 盘上名 ≠ 回传名（`sanitizeFilenamePart`）');
  say('');
  const raw = 'a' + '😀'.repeat(20);
  const oldName = raw.slice(0, 32);                 // 旧实现（码元切）
  const newName = sanitizeFilenamePart(raw);        // 现实现（码点切，旧 Python s[:32]）
  const f1 = mkdtempSync(join(TMP_ROOT, 'f1-'));
  writeFileSync(join(f1, oldName + '.html'), 'x');
  const diskOld = readdirSync(f1)[0];
  say('| 量 | 旧实现 `s.slice(0,32)` | 现实现 `[...s].slice(0,32).join("")` |');
  say('| --- | --- | --- |');
  say('| 码点数 | ' + Array.from(oldName).length + ' | ' + Array.from(newName).length + ' |');
  say('| 含孤立代理项 | ' + loneSurrogate(oldName) + ' | ' + loneSurrogate(newName) + ' |');
  say('| 回传名 === 盘上名 | ' + (diskOld === oldName + '.html') + '（盘上：`' + diskOld + '`） | ' +
    (() => { const g = mkdtempSync(join(TMP_ROOT, 'f1b-')); writeFileSync(join(g, newName + '.html'), 'x'); const d = readdirSync(g)[0]; guardedRm(g); return d === newName + '.html'; })() + ' |');
  say('');
  say('> 旧 Python `_sanitize_filename_part` 用 `s[:32]`（按码点）→ 21 码点串**不截断**；按码元切只剩 17 码点且末位孤立代理项，NTFS 落盘后 `readdirSync` 回来的是 U+FFFD（实测 `equalString=false`），故 `data.output` ≠ 盘上文件名。');
  say('');

  // ============================================================ F2
  say('### F2 同秒计数大小写敏感 → Windows 覆盖原文件（`countSameSecond`）');
  say('');
  const f2 = mkdtempSync(join(TMP_ROOT, 'f2-'));
  const now = new Date(2026, 6, 26, 12, 30, 0);
  const base = '今日总览_20260726_123000';
  writeFileSync(join(f2, base + '.HTML'), 'ORIGINAL');
  const oldCount = readdirSync(f2).filter((n) => n.startsWith(base) && n.endsWith('.html')).length;
  const chosen = htmlFileName('今日总览', { dir: f2, now });
  say('- 目录内已有：`' + base + '.HTML`（内容 `ORIGINAL`）');
  say('- 旧实现（`endsWith(".html")`，大小写敏感）计数 = ' + oldCount + ' → 会选 `' + base + '.html`（Windows 上**覆盖** `ORIGINAL`）');
  say('- 现实现（两侧 `toLowerCase()`）计数 = ' + readdirSync(f2).filter((n) => n.toLowerCase().startsWith(base) && n.toLowerCase().endsWith('.html')).length + ' → 选中 `' + chosen + '`');
  say('- 原文件内容未变：`' + readFileSync(join(f2, base + '.HTML'), 'utf8') + '`');
  const f2cli = mkdtempSync(join(TMP_ROOT, 'f2cli-'));
  mkdirSync(join(f2cli, HTML_DIR_NAME), { recursive: true });
  for (let i = 0; i < 3; i++) {
    const st = (() => { const d = new Date(Date.now() + i * 1000); const p = (n) => String(n).padStart(2, '0'); return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); })();
    writeFileSync(join(f2cli, HTML_DIR_NAME, '唤醒词HELP_' + st + '.HTML'), 'SEED' + i);
  }
  const env2 = okJson(f2cli, ['calorie.help.lookup', '--params', '{"q":"看今日主页"}']);
  const got = basename(env2.data.output);
  say('- CLI 端到端（预置 3 个大写扩展名种子）：`data.output` = `' + got + '`；目录 = `' + lsHtml(f2cli).join('`, `') + '`');
  say('- 种子内容仍为 `' + readFileSync(join(f2cli, HTML_DIR_NAME, got.replace(/_2\.html$/, '.HTML')), 'utf8') + '`（未被覆盖）');
  say('');
  say('> 旧 `glob.glob()` 在 Windows 走 `fnmatch.filter` → `os.path.normcase`（大小写不敏感），故 `.HTML` 计入冲突。');
  say('');

  // ============================================================ F3
  say('### F3 动态 command 段 / suffix 段未复刻（本票只记账，未实现）');
  say('');
  const f3 = mkdtempSync(join(TMP_ROOT, 'f3-'));
  const db = openDb(join(f3, 'calorie_data.db'));
  const today = localIso(0);
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0)').run();
  for (const [name, cal, pro, carb, fat] of [['香蕉', 93, 1.1, 22, 0.3], ['燕麦', 389, 13, 66, 7], ['鸡胸肉', 165, 31, 0, 3.6]]) {
    db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, '08:00:00', ?, 100, ?, ?, ?, ?)").run(today, name, cal, pro, carb, fat);
  }
  db.close();
  const OLD_RANK = { high_calorie: '食物排行_高热量', low_calorie: '食物排行_低热量', frequent: '食物排行_常吃', high_carb: '食物排行_高碳水', high_protein: '食物排行_高蛋白' };
  say('| 键 | 旧真值（`render_food_ranking.py` ＋ `_cmd_maps.py`） | 现实现实测落点 |');
  say('| --- | --- | --- |');
  for (const c of Object.keys(OLD_RANK)) {
    const env = okJson(f3, ['calorie.view.ranking', '--params', JSON.stringify({ category: c })]);
    say('| `calorie.view.ranking` · category=`' + c + '` | `' + OLD_RANK[c] + '_<TS>.html` | `' + basename(env.data.output) + '` |');
  }
  const envAll = okJson(f3, ['calorie.view.ranking', '--params', '{}']);
  say('| `calorie.view.ranking` · 无 category（全榜） | `食物排行_全部_<TS>.html` | `' + basename(envAll.data.output) + '` |');
  say('| `calorie.weight.log` | `记体重_回执_68kg_<TS>.html`（`html_scene_path(..., "receipt", suffix="68kg")`） | 见下 |');
  say('');
  const envW = okJson(f3, ['calorie.weight.log', '--params', JSON.stringify({ kg: 68 })]);
  say('- `calorie.weight.log` 实测 `data.output` = `' + basename(envW.data.output) + '`（缺 `_回执` 段与 `_68kg` suffix 段）');
  say('- `calorie.view.ranking` 的 `<中文command>` = `' + chineseCommandFor('calorie.view.ranking') + '`（**与 category 无关**，5 榜＋全榜同名 → 同秒互撞 `_2.._N`）');
  say('- 影响面：`shape === "receipt"` 的写键 **35/77**（`keys.ts` 35 条 receipt）缺 `_回执` 段；动态 command 键（ranking 5 榜／contraindication 部位／weight-history mode 等）缺动态段；旧 `html_name(suffix=)` 的内容标识段（如 `香蕉`）在新实现中**无参数可传**。');
  say('- 目录实测（同一 DB、5 次调用后）：`' + lsHtml(f3).join('`, `') + '`');
  say('');
  say('> 结论：issue #87 票面只写基础规则，本票按票面实现；动态段／suffix 段**未复刻**（此处如实记账）。可执行补丁见 `docs/research/t87-output-naming.md` §5.1。');
  say('');

  // ============================================================ F4
  say('### F4 落点解析失败 → exit 5「渲染失败」（`cmd_read.ts` 落点解析段）');
  say('');
  const f4 = mkdtempSync(join(TMP_ROOT, 'f4-'));
  writeFileSync(join(f4, HTML_DIR_NAME), 'not a dir');
  const r4 = runCli(f4, ['calorie.help.lookup', '--params', '{"q":"看今日主页"}']);
  say('- 前置：`<SKILLS_DB_PATH>/calorie_html` 被同名**文件**占位 → `mkdirSync(recursive)` 抛 `EEXIST`');
  say('- 现实现：exit = **' + r4.status + '**；stderr = `' + String(r4.stderr).trim() + '`');
  say('- stdout 长度 = ' + String(r4.stdout).length + '（保持纯净）');
  say('- 占位文件未被改写：`' + readFileSync(join(f4, HTML_DIR_NAME), 'utf8') + '`');
  say('');
  say('> 修复前实测（旧代码同场景）：exit 4 ＋ `ERR 4: 未知失败：EEXIST: file already exists, mkdir ...`（4＝取数/超时，文案「未知失败」）。');
  say('');
} finally {
  guardedRm(TMP_ROOT);
}

const md = ['# #87 返修证据（脚本实跑输出）', '', '复跑：`pnpm build` 后 `node docs/research/t87-fix-evidence.mjs`', '', ...L, ''].join('\n');
mkdirSync(SCRATCH, { recursive: true });
const out = join(SCRATCH, 'fix-evidence-' + Date.now() + '.md');
writeFileSync(out, md, 'utf8');
console.log('\nwrote ' + out);
