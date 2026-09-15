/** #561 · 目标域（HELP 场景 06「目标管理」）页面屏上来源脚注删除的验收用例。
 *
 * 用户裁决原文（`gh issue view 561` 票面，逐条引用同一句）：
 * 「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉'
 * （用户直接看得见按钮与内容，不需要脚注复读来路）。」
 * #560 只管场景 01 的 9 页（跨场景不动）；本件判**场景 06 目标管理这一族自己的页面**。
 *
 * 本票范围（只落 `src/goal/` 内的两件，实跑逐件点名见 `docs/skills/skill-calorie/t561-goal-no-source.md` §四）：
 *  - `src/goal/resultDocs.ts`：`tailOf()` 的**来源脚注**那条尾巴整条撤（3 键 4 件：`view.goal` 两窗 ＋
 *    `view.goal-vs-actual` ＋ `view.goal-expiring`）；
 *  - `src/goal/receipt.ts`：写后回执整页最后一行 `renderCaliberLine('数据来源：本机目标库 ｜ …')` 整行撤
 *    （5 键 10 件写词：`goal.set`／`goal.water`／`goal.weight`／`goal.pause`／`goal.resume`）；
 *  - 复制载荷（复制菜单 `data-t` 里的技术原件：复制日志第 3 段「数据结构」的来源名）一律**保留**——
 *    那是给 AI 照抄重跑的原件，不是屏上脚注；
 *  - 公共 helper（`shared/sourceLine.ts` 的 `sourceLine`／base-paint 的 `renderCaliberLine`）本身保留，
 *    别家页仍在用（本件只读源码注记，不判它们的行为）。
 * 本件不碰也不判：场景 01 的 `calorie.view.goal-progress`（`src/home/goalProgressDocs.ts`，归 #467／#560）、
 * 别家能力目录的页（`src/render/`／`src/diet/`／`src/weight/`…）。
 *
 * 判据（四条，与票面验收一一对应）：
 *  ① 场景 06 的 25 条唤醒词真跑（临时种子库 ＋ 真 CLI ＋ 写类命令写临时库），逐条 exit 0，
 *     产物的**屏上可见文本**（剥 `<style>`／`<script>`／标签，并剥复制载荷）里 `数据来源` 零命中；
 *  ② **复制载荷里的来源仍在**（正证没删错地方）：10 件回执页载荷含 `daily_goal`，4 件结果页载荷含它的来源名，
 *     且同一串在屏上可见文本里已消失；
 *  ③ 产物仍是**完整文档**且复制区／页内导航还在（只删一句脚注，不删区块）；
 *  ④ 变异自证（字串级）：塞回任一处来源脚注 ⇒ 判据必红；还原 ⇒ 必绿（真身变异的两行机器读数另记在证据件 §七）。
 *
 * 跑法：先编译再跑 `node --test packages/skill-calorie/test/t561-goal-no-source.test.mjs`
 * （编译入口 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 * 会改工作区的动作一律走 `node tooling/run-locked.mjs --ticket 561 -- <命令>`；
 * 复跑配方＝临时库 `mkdtemp` ＋ `SKILLS_DB_PATH` 指向它 ＋ `docs/research/t81-seed.mjs` 的 `seedFull()`
 * ＋ `CALORIE_TODAY=SEED_TODAY`（种子数据日 `2026-09-07`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY, PLACEHOLDER_SUBSTITUTIONS } = await import(
  pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 场景 06 的 25 条唤醒词：唯一事实源 `src/triggers/scene-06-goal.ts`（逐行一个 JSON 对象）。 */
function sceneWakeWords() {
  const src = readFileSync(join(PKG, 'src', 'triggers', 'scene-06-goal.ts'), 'utf8');
  const out = [];
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{"category"')) continue;
    out.push(JSON.parse(t.replace(/,\s*$/, '')));
  }
  return out;
}

/** 词表里的日期占位符（`<日期>` 等）按 `t81-seed.mjs` 的替换表落成真实日期（与实跑探针同法）。 */
function substitute(cli) {
  let s = String(cli);
  for (const [ph, real] of PLACEHOLDER_SUBSTITUTIONS) {
    if (real === null || real === undefined) continue;
    s = s.split(ph).join(real);
  }
  return s;
}

/** 单条词的命令串 → argv（字面量与示例同形：`calorie-cmd-read <key> [--params '{…}']`）。 */
function tokenize(cli) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur !== '') { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** 一条命令一份临时种子库（写类命令写的就是这一份，不碰真库）。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't561-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 复制载荷：复制菜单按钮的 `data-t` 属性值（可照抄的技术原件，含日志第 3 段来源名）。 */
function payloadOf(html) {
  return [...String(html).matchAll(/data-t="([^"]*)"/g)].map((m) => m[1]).join('\n');
}

/** 真跑一条唤醒词（产物落该条自己的临时目录）。 */
function runWake(w) {
  const dir = freshDb();
  const out = join(dir, 'out.html');
  const toks = tokenize(substitute(w.main_prompt.cli));
  const key = toks[1];
  const at = toks.indexOf('--params');
  const args = [CLI, key];
  if (at >= 0) args.push('--params', toks[at + 1]);
  args.push('--html', out);
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  const html = existsSync(out) ? readFileSync(out, 'utf8') : null;
  return {
    wake: w.wake_word, key, type: w.output_type, exit: r.status,
    stderr: String(r.stderr || '').trim().slice(-300), html,
    vis: html === null ? '' : visibleText(stripCopyPayload(html)),
    payload: html === null ? '' : payloadOf(html),
  };
}

/** 25 件实跑产物（模块级跑一次，四条判据共用同一批产物）。 */
const RUNS = sceneWakeWords().map(runWake);
const ofWake = (wake) => RUNS.find((r) => r.wake === wake);

/** 本族 5 条会改数据库的命令（写后回执那一支，10 条写词落它们）。 */
const WRITE_KEYS = new Set([
  'calorie.goal.set', 'calorie.goal.water', 'calorie.goal.weight',
  'calorie.goal.pause', 'calorie.goal.resume',
]);

/* ── ① 25 条唤醒词逐条零命中（屏上可见文本） ── */

test('#561 ① 场景 06 的 25 条词实跑 exit 0，屏上可见文本 `数据来源` 零命中', () => {
  assert.equal(RUNS.length, 25, '场景 06 词表应 25 条（判据不许空跑）：实测 ' + RUNS.length);
  const kinds = RUNS.reduce((m, r) => { m[r.type] = (m[r.type] ?? 0) + 1; return m; }, {});
  assert.deepEqual(kinds, { result: 12, receipt: 13 },
    '25 条词的产物类别应 12 结果 ＋ 13 回执（其中 3 条落预检页）：实测 ' + JSON.stringify(kinds));
  for (const r of RUNS) {
    assert.equal(r.exit, 0, '「' + r.wake + '」`' + r.key + '` 应 exit 0，实测 exit=' + r.exit + ' ' + r.stderr);
    assert.ok(r.html !== null, '「' + r.wake + '」没落盘');
  }
  for (const r of RUNS) {
    assert.ok(!r.vis.includes('数据来源'),
      '「' + r.wake + '」`' + r.key + '` 屏上还有来源脚注：' + r.vis.split('\n').filter((l) => l.includes('数据来源')).join(' ｜ '));
    assert.ok(!r.html.includes('数据来源'),
      '「' + r.wake + '」`' + r.key + '` 原样 HTML 里还有 `数据来源`（屏上段零残留的加强读数）');
  }
});

/* ── ② 复制载荷里的来源仍在（正证没删错地方） ── */

test('#561 ② 复制载荷里的来源仍在，同一串在屏上已消失', () => {
  const receipts = RUNS.filter((r) => WRITE_KEYS.has(r.key));
  assert.equal(receipts.length, 10, '5 条目标写命令应覆盖 10 条写词（判据不许空跑）：实测 ' + receipts.length);
  for (const r of receipts) {
    assert.ok(r.payload.includes('daily_goal'),
      '「' + r.wake + '」复制日志载荷里来源丢了（删错地方）：' + r.payload.replace(/\s+/g, ' ').slice(0, 200));
    assert.ok(!r.vis.includes('本机目标库'),
      '「' + r.wake + '」屏上还印着回执脚注里的来源名 `本机目标库`');
  }
  /* 结果页那一支：来源名原样住在复制日志第 3 段（`copyArea` 的 `data-t` 载荷），屏上那行已撤。 */
  for (const [wake, needle] of [
    ['看目标完成度', '目标表与饮食记录'],
    ['看目标历史完成', '目标表与饮食记录'],
    ['看目标对比实际', '目标表与饮食记录'],
    ['看即将到期的目标', '目标表与体重目标'],
  ]) {
    const r = ofWake(wake);
    assert.ok(r !== undefined, '词表里应有「' + wake + '」');
    assert.ok(r.payload.includes(needle),
      '「' + wake + '」复制载荷里来源丢了（删错地方）：' + r.payload.replace(/\s+/g, ' ').slice(0, 200));
    assert.ok(!r.vis.includes(needle), '「' + wake + '」屏上还有来源名 `' + needle + '`');
  }
  /* 预检页那一支本票一行未改：来源只进载荷、屏上从来没有脚注（改前改后都零命中）。 */
  const wizard = ['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标'].map(ofWake);
  for (const r of wizard) {
    assert.ok(r.payload.includes('daily_goal ＋ user_profile ＋ weight_log'),
      '「' + r.wake + '」预检页复制载荷里来源丢了（本票不该碰它）');
    assert.ok(!r.vis.includes('数据来源'), '「' + r.wake + '」预检页屏上出现了来源脚注（本票不该加它）');
  }
});

/* ── ③ 产物仍是完整文档，区块没被连带删掉 ── */

test('#561 ③ 25 件产物仍是完整文档，复制区与页内导航都在', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」`' + r.key + '`';
    assert.ok(r.html.startsWith('<!doctype html>'), what + ' 缺 doctype');
    assert.ok(r.html.includes('charset="utf-8"'), what + ' 缺 charset');
    assert.ok(r.html.includes('<style'), what + ' 缺 style');
    assert.ok(r.html.includes('ilife-page'), what + ' 缺页面壳');
    assert.ok(r.html.includes('ilife-block-copy-block'), what + ' 复制区丢了（只删脚注不删区）');
    assert.ok(r.html.includes('ilife-block-toc'), what + ' 页内导航丢了');
  }
});

/* ── ④ 变异自证（字串级）：判据不许永真 ── */

test('#561 ④ 变异自证：塞回任一处来源脚注判据必红，还原必绿', () => {
  const result = ofWake('看目标完成度');
  const receipt = RUNS.find((r) => r.key === 'calorie.goal.set');
  assert.ok(result !== undefined && receipt !== undefined, '两件代表产物都在');
  assert.ok(!result.vis.includes('数据来源') && !receipt.vis.includes('数据来源'), '原样两件都该零命中');
  const mutResult = result.vis + '\n📊 数据来源：本机目标表与饮食记录，窗口 2026-09-01 至 2026-09-07。';
  const mutReceipt = receipt.vis + '\n数据来源：本机目标库 ｜ 本次影响 1 行 ｜ 时间 2026-09-07 08:00:00';
  assert.ok(mutResult.includes('数据来源'), '变异①：塞回结果页脚注后判据没红');
  assert.ok(mutReceipt.includes('数据来源'), '变异②：塞回回执页脚注后判据没红');
  assert.ok(!result.vis.includes('数据来源') && !receipt.vis.includes('数据来源'), '还原后判据没绿');
  console.log('T561-MUT 结果页改坏红=1 还原绿=1；回执页改坏红=1 还原绿=1');
});
