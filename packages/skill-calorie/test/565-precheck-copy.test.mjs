/** #565 · 场景 06 目标预检页（`calorie.view.goal-wizard`）：一页只留**一条**「复制日志」通道。
 *
 * 负责人 2026-09-15 肉眼验收报的缺陷：预检页上部「复制指令」那一排里已经有一颗「复制日志」
 * （公共层 #336 兜底补的**禁用态**占位），页底复制区又出一颗真日志 ⇒ 11 件产物各「复制日志」2 次、
 * copy-btn 4 个（同墙其余 22 件是 1 次／2 个）。收口后：上部只留「复制指令」，页底只留「复制日志」。
 *
 * 五组判据（每条都能真红）：
 *   ① 11 条带空位写词逐条真跑 exit 0 ＋ 完整文档四断言（doctype／charset／style／ilife-page）；
 *   ② 产物里「复制日志」**恰 1 次**（可见文本口径），copy-btn 元素**恰 2 个**，且**无禁用态**复制钮；
 *   ③ 两条通道各司其职：「复制指令」＝prompt 原文、「复制日志」＝六段日志，两份载荷都非空且不同；
 *   ④ 日志载荷没被删错：六段段名齐 ＋ 命令原文（含 `--params`）在，照抄可重跑；
 *   ⑤ 页内三块与 prompt 原文一字不改（正证删的是重复按钮，不是内容）。
 *
 * 配方照抄 `test/goal-wizard-251.test.mjs` 的临时库＋真 CLI 那一套（mkdtemp ＋ SKILLS_DB_PATH ＋
 * `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ `CALORIE_TODAY=SEED_TODAY`），不碰真库。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（经持锁包装器），
 *       再 `node --test packages/skill-calorie/test/565-precheck-copy.test.mjs`。
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
const KEY = 'calorie.view.goal-wizard';

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { SCENE_06_GOAL } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'scene-06-goal.js')).href);

/** 11 条「带空位」写词（逐字取 `docs/skills/skill-calorie/scene06-验收墙/produce.mjs:36-48` 的那一串）。 */
const PRECHECK_WORDS = [
  '定营养目标',
  '定营养目标(自动算)',
  '定体重目标',
  '定体重目标(自动算截止)',
  '定体重目标(含起始日)',
  '定饮水目标',
  '定饮水目标(自动算)',
  '一键定全套目标',
  '改营养目标',
  '改体重目标',
  '改饮水目标',
];

/** 一条写词一份临时种子库（`t81-seed.mjs` 的 `seedFull()`，不碰真库）。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't565-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 真 CLI 跑一条预检页（与验收墙 `produce.mjs:156` 同一条命令串、同一套环境变量）。 */
function runWake(wake) {
  const dir = freshDb();
  const out = join(dir, 'out.html');
  const r = spawnSync(process.execPath,
    [CLI, KEY, '--params', JSON.stringify({ wake }), '--html', out],
    {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
    });
  const html = existsSync(out) ? readFileSync(out, 'utf8') : null;
  return { wake, exit: r.status, stderr: String(r.stderr || '').trim().slice(-300), html };
}

/** 11 件实跑产物（模块级跑一次，五组判据共用这一批）。 */
const RUNS = PRECHECK_WORDS.map(runWake);

/** copy-btn 元素个数：口径与负责人那条探针（`.scratch/t153-视觉缺陷/probe.mjs:20`）逐字相同。 */
function copyBtnCount(html) {
  return (html.match(/class="[^"]*copy-btn[^"]*"/g) || []).length;
}

/** 「复制日志」可见命中次数：剥掉复制载荷后的可见文本里数（载荷是照抄用的技术原文，不算上屏文字）。 */
function visibleLogCount(html) {
  return (visibleText(stripCopyPayload(html)).match(/复制日志/g) || []).length;
}

/** 某一颗按钮的 `data-t` 载荷（按 `data-action-id` 取；取不到返回 `null`）。 */
function payloadOf(html, actionId) {
  const m = new RegExp('data-action-id="' + actionId + '"[^>]*data-t="([^"]*)"').exec(html);
  return m === null ? null : m[1];
}

/** 属性值还原成原始文本（`&quot;` ／ `&amp;` ／ `&lt;` ／ `&gt;` ／ `&#39;` 五种，同冻结转义表）。 */
function decodeAttr(value) {
  return String(value)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 该条词在触发词表里的逐字 prompt（唯一出处 `src/triggers/scene-06-goal.ts`）。 */
function frozenPrompt(wake) {
  const hit = SCENE_06_GOAL.find((t) => t.wake_word === wake);
  assert.ok(hit !== undefined, '触发词表里应有「' + wake + '」');
  return hit.prompt_template;
}

/** 完整文档四断言（口径同 `test/goal-wizard-251.test.mjs:56-64` 的前四条）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 <style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/* ── ① 11 条写词逐条真跑：exit 0 ＋ 完整文档 ── */

test('#565 ① 11 条带空位写词逐条真跑：exit 0 ＋ 产物仍是完整文档', () => {
  assert.equal(RUNS.length, 11, '带空位写词应 11 条（判据不许空跑）：实测 ' + RUNS.length);
  for (const r of RUNS) {
    assert.equal(r.exit, 0, '「' + r.wake + '」`' + KEY + '` 应 exit 0，实测 exit=' + r.exit + ' ' + r.stderr);
    assertDocPage(r.html, '「' + r.wake + '」预检页');
  }
});

/* ── ② 一页一条「复制日志」：1 次／2 个，且无禁用态占位 ── */

test('#565 ② 11 件产物各：「复制日志」恰 1 次、copy-btn 恰 2 个、无禁用态复制钮', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    assert.equal(visibleLogCount(r.html), 1,
      what + '「复制日志」应恰 1 次，实测 ' + visibleLogCount(r.html) + ' 次（两条同名通道没并成一条）');
    assert.equal(copyBtnCount(r.html), 2,
      what + ' copy-btn 应恰 2 个，实测 ' + copyBtnCount(r.html) + ' 个');
    const prompt = payloadOf(r.html, 'ilife-help-copy-prompt');
    const log = payloadOf(r.html, 'ilife-copy-log');
    assert.ok(prompt !== null, what + ' 缺「复制指令」那颗按钮（`ilife-help-copy-prompt`）');
    assert.ok(log !== null, what + ' 缺「复制日志」那颗按钮（`ilife-copy-log`）');
    assert.equal(/class="[^"]*copy-btn[^"]*"[^>]*disabled/.test(r.html), false,
      what + ' 还有禁用态的复制钮（公共层 #336 兜底那颗占位没撤掉）');
    assert.equal((r.html.match(/data-action-id="ilife-copy-log"/g) || []).length, 1,
      what + ' `data-action-id="ilife-copy-log"` 应恰 1 处，实测 '
      + (r.html.match(/data-action-id="ilife-copy-log"/g) || []).length + ' 处（多出来的那颗就是 #336 兜底占位）');
  }
});

/* ── ③ 两条通道各司其职：指令＝prompt 原文，日志＝六段，载荷都非空且不同 ── */

test('#565 ③ 两条通道各司其职：「复制指令」＝prompt 原文，「复制日志」＝六段日志', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    const prompt = payloadOf(r.html, 'ilife-help-copy-prompt');
    const log = payloadOf(r.html, 'ilife-copy-log');
    assert.ok(prompt !== null && prompt.trim() !== '', what + ' 复制指令载荷空了');
    assert.ok(log !== null && log.trim() !== '', what + ' 复制日志载荷空了（别把载荷删了）');
    assert.ok(prompt.includes('执行唤醒词「' + r.wake + '」'),
      what + ' 复制指令载荷不是这一条词的 prompt 原文：' + prompt.slice(0, 120));
    assert.ok(log.includes('场景标识') && log.includes('调用链'),
      what + ' 复制日志载荷不是六段日志：' + log.slice(0, 120));
    assert.notEqual(prompt, log, what + ' 两份载荷不该是同一份');
  }
});

/* ── ④ 日志载荷没被删错：六段齐 ＋ 命令原文在，照抄可重跑 ── */

test('#565 ④ 复制日志六段齐、命令原文（含本次参数）在，照抄可重跑', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    const log = payloadOf(r.html, 'ilife-copy-log');
    for (const seg of ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常']) {
      assert.ok(log.includes(seg), what + ' 日志第几段缺段名 `' + seg + '`：' + log.slice(0, 200));
    }
    assert.ok(log.includes(KEY), what + ' 日志缺本页命令键（不许改命令键名）');
    assert.ok(log.includes('--params'), what + ' 日志第 4 段缺本次参数（照抄重跑会跑成另一条词）');
    assert.match(log, /calorie_data\.db/, what + ' 日志第 3 段缺库文件名');
    assert.match(log, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · 版本 0\.1\.0/, what + ' 日志第 5 段缺时间戳或版本');
  }
});

/* ── ⑤ 内容一字不改：页内三块、库内现值表、prompt 原文都在（正证删的是重复按钮） ── */

test('#565 ⑤ 页内三块与 prompt 原文一字不改', () => {
  for (const r of RUNS) {
    const what = '「' + r.wake + '」预检页';
    for (const needle of [
      '库内现值（改前基准）', '改前基准：本页只摆现值，不替 AI 算最终对比',
      '营养 5 项（要填的项）', '体重目标（目标／起始日／截止日／速率校验）',
      '这一页只做预检、不写目标；确认下面的值无误后，把指令复制给 AI 执行',
    ]) {
      assert.ok(r.html.includes(needle), what + ' 页内内容丢了：`' + needle + '`');
    }
    // prompt 原文：页上那段预览（`<pre>`）与「复制指令」那颗的载荷，都逐字等于触发词表里的原文。
    const tpl = frozenPrompt(r.wake);
    const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(r.html);
    assert.ok(pre !== null, what + ' prompt 预览块没了');
    assert.equal(decodeAttr(pre[1]), tpl, what + ' prompt 预览块与原文不逐字相同（原文一字不改）');
    assert.equal(decodeAttr(payloadOf(r.html, 'ilife-help-copy-prompt')), tpl,
      what + ' 「复制指令」载荷与原文不逐字相同（原文一字不改）');
  }
});
