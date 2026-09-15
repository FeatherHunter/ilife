/** #560 体重片 · 体重盘两窗屏上来源脚注删除的验收用例。
 *
 * 用户裁决原文（`gh issue view 560` 票面，逐条引用同一句）：
 * 「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉'
 * （用户直接看得见按钮与内容，不需要脚注复读来路）。」
 *
 * 本票范围（只落 `src/weight/log.ts` 来源行一带，主盘与空窗共用 `deliveryBlocks` 一并处理）：
 *  - `deliveryBlocks` 内 `+ renderCaliberLine('📊 数据来源：' + sourceText)` 整段撤；
 *  - `sourceText` 转进 `copyLog({ source: sourceText, … })`（复制日志第 3 段技术原件，一律保留，只删屏上脚注）；
 *  - `renderCaliberLine` import 清（helper 本身保留，别家页在用）；写命令入参落库段一行不动；
 *  - 其余 weight 件、`today.ts`／`routes.ts`／公共层一律不碰。
 *
 * 判据（三条 ＋ 变异）：
 *  ① 主盘（有数窗）与空窗两窗可见文本（剥复制载荷后）`数据来源` 零命中，原样 HTML 亦零命中；
 *  ② 复制载荷里来源仍在（正证未删错地方：`data-t` 载荷仍含 `体重记录`，复制区仍在）；
 *  ③ 变异自证（字串级）：塞回任一窗来源脚注 ⇒ 判据必红；还原 ⇒ 必绿。
 *
 * 跑法：先编译再跑 `node --test packages/skill-calorie/test/560-weight-no-source.test.mjs`。
 * 会改工作区的动作一律走 `node tooling/run-locked.mjs --ticket 560 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
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
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 固定种子库：真出口经 `dist/cli/cmd_read.js`，与 `560-no-source` 同法。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't560-weight-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

function runOk(dir, key, params, what) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  const out = String(JSON.parse(String(r.stdout).trim()).data.output ?? '');
  assert.ok(out !== '', what + ' 没回产物路径');
  return readFileSync(out, 'utf8');
}

/** 复制载荷：复制菜单按钮的 `data-t` 属性值（可照抄的技术原件，含日志第 3 段来源名）。 */
function payloadOf(html) {
  return [...String(html).matchAll(/data-t="([^"]*)"/g)].map((m) => m[1]).join('\n');
}

/* 主盘有数窗（种子库逐日有体重记录）与空窗（库里别处有记录，这一段一条也没有）。 */
const MAIN_HTML = runOk(freshDb(), 'calorie.view.weight', { start: '2026-09-01', end: '2026-09-07' }, '体重主盘');
const EMPTY_HTML = runOk(freshDb(), 'calorie.view.weight', { start: '2020-01-01', end: '2020-01-07' }, '体重空窗');

/* ── ① 两窗可见文本（剥载荷后）`数据来源` 零命中 ＋ 原样 HTML 零命中 ── */

test('#560体重 ① 主盘屏上无来源脚注', () => {
  const vis = visibleText(stripCopyPayload(MAIN_HTML));
  assert.ok(!vis.includes('数据来源'), '体重主盘屏上还有来源脚注：' + vis.slice(0, 200));
  assert.ok(!stripCopyPayload(MAIN_HTML).includes('数据来源'), '体重主盘原样 HTML 屏上段还有来源脚注');
  assert.ok(!MAIN_HTML.includes('数据来源'), '体重主盘原样 HTML 还有 `数据来源`（屏上段零残留的加强读数）');
});

test('#560体重 ① 空窗屏上无来源脚注', () => {
  const vis = visibleText(stripCopyPayload(EMPTY_HTML));
  assert.ok(!vis.includes('数据来源'), '体重空窗屏上还有来源脚注：' + vis.slice(0, 200));
  assert.ok(!stripCopyPayload(EMPTY_HTML).includes('数据来源'), '体重空窗原样 HTML 屏上段还有来源脚注');
  assert.ok(!EMPTY_HTML.includes('数据来源'), '体重空窗原样 HTML 还有 `数据来源`（屏上段零残留的加强读数）');
});

/* ── ② 复制载荷里来源仍在（正证未删错地方） ── */

test('#560体重 ② 复制载荷里的来源段保留（只删屏上脚注，不删技术原件）', () => {
  for (const [what, html] of [['主盘', MAIN_HTML], ['空窗', EMPTY_HTML]]) {
    const payload = payloadOf(html);
    assert.ok(html.includes('ilife-block-copy-block'), '体重' + what + '复制区丢了（只删脚注不删区）');
    assert.ok(payload.includes('体重记录'), '体重' + what + '复制载荷里来源丢了（删错地方）：' + payload.replace(/\s+/g, ' ').slice(0, 200));
  }
  /* 空窗的窗口与条数仍在载荷里可重跑（`共 0 条` 那半句随 sourceText 进载荷，不再上屏）。 */
  assert.ok(payloadOf(EMPTY_HTML).includes('共 0 条'), '体重空窗载荷里窗口条数丢了');
});

/* ── ③ 变异自证（字串级）：塞回任一窗必红、还原必绿 ── */

test('#560体重 ③ 变异自证：塞回任一窗来源脚注必红，还原必绿', () => {
  const cleanMain = visibleText(stripCopyPayload(MAIN_HTML));
  const cleanEmpty = visibleText(stripCopyPayload(EMPTY_HTML));
  assert.ok(!cleanMain.includes('数据来源'), '原样主盘应当零命中');
  assert.ok(!cleanEmpty.includes('数据来源'), '原样空窗应当零命中');
  const mutMain = cleanMain + '\n📊 数据来源：体重记录 ｜ 窗口 2026-09-01 ~ 2026-09-07 ｜ 共 7 条';
  const mutEmpty = cleanEmpty + '\n📊 数据来源：体重记录 ｜ 窗口 2020-01-01 ~ 2020-01-07 ｜ 共 0 条';
  assert.ok(mutMain.includes('数据来源'), '变异①：塞回主盘来源脚注后判据没红');
  assert.ok(mutEmpty.includes('数据来源'), '变异②：塞回空窗来源脚注后判据没红');
  assert.ok(!cleanMain.includes('数据来源') && !cleanEmpty.includes('数据来源'), '还原后判据没绿');
  console.log('T560W-MUT 主盘改坏红=1 还原绿=1；空窗改坏红=1 还原绿=1');
});
