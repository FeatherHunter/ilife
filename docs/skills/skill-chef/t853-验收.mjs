#!/usr/bin/env node
// t853 验收器械（#853 写侧缺值处置：三列必填拦下补齐）。
//
// 判据来源：`#853` 的 `## Testing Decisions`（缝只取一个最高缝＝CLI 唯一出口；
// 三列各一例缺值须非零退出且读回无新增）＋ `## Implementation Decisions`（对外契约：
// 缺用量数字／缺时长数字／缺评分 → 取数失败类错误，命令出口以取数失败档非零退出）。
//
// 本器械只做三件事，全部在**副本库**上：
//   ① 用 `t840-沙箱.mjs` 的同一口径复制真库到 `.scratch/t<票号>/`，并落隔离家目录；
//   ② 逐卡跑反例／正例，记退出码、错误消息、写后行数；判据红即点名该格；
//   ③ 跑前跑后验真库 stat 与 sha256 未变（真库全程只读）。
//
// 用法：
//   node docs/skills/skill-chef/t853-验收.mjs                 # 默认：先复制一份 pristine 副本再跑
//   node docs/skills/skill-chef/t853-验收.mjs --keep          # 复用现成副本（不重复制）
//   node docs/skills/skill-chef/t853-验收.mjs --recipe 辣椒炒肉  # 指定拿来做写探针的菜（须在副本库里）
//
// 退出码：0＝判据全绿；1＝场地问题（副本／真库不可读）；2＝用法错；9＝有判据红。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const TICKET = '853';
const REAL_DB = 'D:\\2Study\\StudyNotes\\.db\\chef_data.db';
const DB_NAME = 'chef_data.db';

function out(s) { process.stdout.write(s + '\n'); }
function fail(code, msg) { process.stderr.write('t853-验收：' + msg + '\n'); process.exit(code); }

function parseArgs(argv) {
  const o = { keep: false, recipe: '辣椒炒肉' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keep') o.keep = true;
    else if (argv[i] === '--recipe' && i + 1 < argv.length) o.recipe = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      out('用法：t853-验收.mjs [--keep] [--recipe <菜名>]');
      process.exit(0);
    } else fail(2, '未知参数：' + argv[i]);
  }
  return o;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const scratch = path.join(root, '.scratch', 't' + TICKET);
const copyDb = path.join(scratch, DB_NAME);
const homeDir = path.join(scratch, 'home');
const cli = path.join(root, 'packages', 'skill-chef', 'dist', 'cli', 'cmd_read.js');

/** 真库指纹：字节数 ＋ mtime ＋ sha256（跑前跑后比这三样）。 */
function realFingerprint() {
  const st = fs.statSync(REAL_DB);
  const buf = fs.readFileSync(REAL_DB);
  return { size: st.size, mtimeMs: st.mtimeMs, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

/** 副本库的行数读数（只读打开，不建库、不写盘）。 */
const COUNTED_TABLES = ['recipes', 'ingredients', 'cooking_steps', 'recipe_history', 'recipe_relations'];
function countsOf(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const o = {};
    for (const t of COUNTED_TABLES) {
      try {
        o[t] = Number(db.prepare('SELECT COUNT(*) AS c FROM ' + t).get().c);
      } catch (e) {
        o[t] = 'N/A(' + String(e && e.message || e).slice(0, 40) + ')';
      }
    }
    return o;
  } finally { db.close(); }
}

/** 跑一次 CLI 唯一出口：argv ＋ JSON 参数 ＋ 退出码（缝只取这一个）。 */
function runCli(key, params) {
  const r = spawnSync(process.execPath, [cli, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: homeDir, HOME: homeDir },
    cwd: root,
  });
  if (r.error) fail(1, '跑不动 CLI：' + String(r.error.message || r.error));
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** 一条判据的读数：退出码 ＋ 「哪一格亮了」（错误消息）＋ 写后行数增量。 */
function needle(r, words) {
  const hay = r.stdout + '\n' + r.stderr;
  const hit = words.filter((w) => hay.includes(w));
  return hit.length ? hit.join('＋') : '(消息里没点名：' + hay.replace(/\s+/g, ' ').trim().slice(0, 90) + ')';
}

function main() {
  const { keep, recipe } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(cli)) fail(1, '没有 dist 入口：' + cli + '（先 `node node_modules/typescript/bin/tsc -b packages/skill-chef`）');
  const fpBefore = realFingerprint();

  if (!keep || !fs.existsSync(copyDb)) {
    const s = spawnSync(process.execPath, [path.join(here, 't840-沙箱.mjs'), '--ticket', TICKET], { encoding: 'utf8', cwd: root });
    if (s.status !== 0) fail(1, '沙箱复制失败：' + (s.stderr || s.stdout || '').trim());
    out('沙箱：' + (s.stdout || '').trim().split('\n')[0]);
  }

  const ok = [];
  const red = [];
  const rows = [];

  /** 跑一条判据。want＝期望退出码；hit＝期望在消息里点到的词。 */
  function check(id, card, column, key, params, want, hit, expectBump) {
    const before = countsOf(copyDb);
    const r = runCli(key, params);
    const after = countsOf(copyDb);
    const bumped = COUNTED_TABLES.filter((t) => typeof before[t] === 'number' && before[t] !== after[t]);
    const codeOk = r.code === want;
    const hitOk = hit.every((w) => (r.stdout + r.stderr).includes(w));
    const bumpOk = expectBump ? bumped.length > 0 : bumped.length === 0;
    const pass = codeOk && hitOk && bumpOk;
    (pass ? ok : red).push(id);
    rows.push({
      id, card, column, key, want, got: r.code, pass,
      lit: needle(r, ['quantity', 'duration_minutes', 'rating', '用量', '时长', '评分']),
      bumped: bumped.length ? bumped.join('＋') : '无',
    });
    return pass;
  }

  // ── 反例：三列各一例缺值 ＋ 单行路径同口径（#853 验收命令逐字要求的三条在其中）────
  check('R1', 'add_from_image/markdown/conversation/template', 'quantity', 'chef.recipe.write',
    { op: 'add', name: 't853反例缺量', ingredients: [{ name: '盐', category: '调料', quantity_text: '适量' }], steps: [{ action: '炒', duration_minutes: 3 }] },
    4, ['quantity'], false);
  check('R2', 'import_from_json', 'quantity', 'chef.recipe.write',
    { op: 'add', name: 't853反例导入缺量', ingredients: [{ name: '盐', quantity: '' }], steps: [{ action: '炒', duration_minutes: 3 }] },
    4, ['quantity'], false);
  check('R3', 'add_from_image/markdown/conversation/template', 'duration_minutes', 'chef.recipe.write',
    { op: 'add', name: 't853反例缺时长', ingredients: [{ name: '盐', quantity: 5, unit: '克' }], steps: [{ action: '装盘' }] },
    4, ['duration_minutes'], false);
  check('R4', 'import_validation_failed', 'duration_minutes', 'chef.recipe.write',
    { op: 'add', name: 't853反例导入缺时长', ingredients: [{ name: '盐', quantity: 5, unit: '克' }], steps: [{ action: '装盘', duration_minutes: null }] },
    4, ['duration_minutes'], false);
  check('R5', 'record_cook', 'rating', 'chef.history.record',
    { name: recipe, feedback: '味道正好' },
    4, ['rating'], false);
  // 空串＝「用户啥也没填」：必须与「键不传」同档同文（818 定案甲：缺评分 → 取数失败档 exit 4，点名 rating）。
  check('R6', 'record_cook', 'rating（空串）', 'chef.history.record',
    { name: recipe, rating: '', feedback: '味道正好' },
    4, ['rating'], false);
  // 改用量：食材名取副本库里真实存在的（辣椒炒肉 11 味里的生抽），量给非数字的「适量」。
  check('R7', 'update_ingredient', 'quantity', 'chef.recipe.write',
    { op: 'update', target: 'ingredient', name: recipe, ingredient: '生抽', quantity: '适量' },
    4, ['quantity'], false);
  // 派生卡写侧不接内嵌行（母本整份复制）。母本完整性检查（`relation/run-write.ts:87-99`）在真数据上
  // **不可达**：NOT NULL ＋ 写入前拦截 ⇒ 库里不可能有缺值母本。故这里验的是它**不误伤**完整母本。
  check('R8', 'derive_from_existing', 'quantity＋duration_minutes', 'chef.relation.write',
    { op: 'derive', source: recipe, target: 't853正例派生', differences: 't853 验收：母本完整，派生应当放行' },
    0, [], true);
  // 评分越界：口径错档 exit 2（0-5 是评分语义，非缺值）。
  check('R12', 'record_cook', 'rating 越界', 'chef.history.record',
    { name: recipe, rating: 6, feedback: 't853 反例：越界评分' },
    2, ['0-5'], false);
  check('R9', 'add_from_image（单味追加）', 'quantity', 'chef.recipe.write',
    { op: 'add-ingredient', recipe_name: recipe, name: 't853反例追加缺量', quantity_text: '适量' },
    4, ['quantity'], false);
  check('R10', 'add_from_image（单步追加）', 'duration_minutes', 'chef.recipe.write',
    { op: 'add-step', recipe_name: recipe, action: 't853反例追加缺时长' },
    4, ['duration_minutes'], false);

  // ── 正例：补齐即入库，写后读回关键字段 ─────────────────────────────────
  const posName = 't853正例补齐';
  check('P1', 'add_from_template（补齐）', 'quantity＋duration_minutes', 'chef.recipe.write',
    { op: 'add', name: posName, ingredients: [{ name: '盐', category: '调料', quantity: 5, unit: '克', quantity_text: '少许约5g' }], steps: [{ action: '炒', duration_minutes: 3, heat_level: '大火' }] },
    0, ['已新增菜谱'], true);
  check('P2', 'record_cook（补齐）', 'rating', 'chef.history.record',
    { name: recipe, rating: 4, feedback: 't853 正例：味道正好' },
    0, [], true);
  check('P3', 'update_ingredient（补齐）', 'quantity', 'chef.recipe.write',
    { op: 'update', target: 'ingredient', name: posName, ingredient: '盐', quantity: 6, quantity_text: '少许约6g' },
    0, [], false);
  check('P4', 'record_cook（0 分是合法评分）', 'rating=0', 'chef.history.record',
    { name: recipe, rating: 0, feedback: 't853 正例：这次翻了车' },
    0, [], true);

  // ── 读回：正例写进去的字段真的是那些值（不只看退出码）─────────────────
  const db = new DatabaseSync(copyDb, { readOnly: true });
  let readback = [];
  try {
    const g = db.prepare('SELECT quantity, quantity_text, unit FROM ingredients WHERE recipe_id = (SELECT id FROM recipes WHERE name = ?) AND name = ?').get(posName, '盐');
    readback.push(['正例菜「' + posName + '」盐', 'quantity=' + String(g && g.quantity) + ' unit=' + String(g && g.unit) + ' quantity_text=' + String(g && g.quantity_text)]);
    const h = db.prepare('SELECT rating, feedback FROM recipe_history WHERE recipe_id = (SELECT id FROM recipes WHERE name = ?) ORDER BY cook_sequence').all(recipe);
    readback.push(['正例「' + recipe + '」历史', h.map((r) => r.rating + '分／' + String(r.feedback).slice(0, 12)).join(' ｜ ')]);
  } finally { db.close(); }

  // ── 真库只读断言 ────────────────────────────────────────────────────────
  const fpAfter = realFingerprint();
  const realOk = fpBefore.size === fpAfter.size && fpBefore.mtimeMs === fpAfter.mtimeMs && fpBefore.sha256 === fpAfter.sha256;

  out('');
  out('| 判据 | 卡 | 列 | 命令 | 期望 | 实得 | 结果 | 消息点名 | 行数变化 |');
  out('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) out('| ' + r.id + ' | ' + r.card + ' | ' + r.column + ' | `' + r.key + '` | ' + r.want + ' | ' + r.got + ' | ' + (r.pass ? '绿' : '红') + ' | ' + r.lit + ' | ' + r.bumped + ' |');
  out('');
  for (const [k, v] of readback) out('读回 ' + k + '：' + v);
  out('');
  out('真库：' + REAL_DB);
  out('  sha256 前 ' + fpBefore.sha256.slice(0, 16) + '… 后 ' + fpAfter.sha256.slice(0, 16) + '… 字节 ' + fpBefore.size + '／' + fpAfter.size + ' mtime ' + fpBefore.mtimeMs + '／' + fpAfter.mtimeMs + ' ⇒ ' + (realOk ? '全程只读（未变）' : '⚠ 变了'));
  out('');
  out('判据汇总：绿 ' + ok.length + ' ／ 红 ' + red.length + (red.length ? '（红：' + red.join('、') + '）' : ''));
  if (!realOk) process.exit(9);
  process.exit(red.length ? 9 : 0);
}

main();
