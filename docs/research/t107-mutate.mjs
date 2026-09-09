/** #107 变异自证（src 级 · **须在持锁包装器内跑**）：
 *  变异 → 重建 → 靶向测试红 → 立即还原（sha256 自校）→ 重建 → 靶向测试绿。
 *  跑法：node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-mutate.mjs
 *
 *  两处 **src 级**变异各打一条断言：
 *   M1 锚点漂移（`<h1>` → `<h2>`）：抽取契约必须大声失败（missing-data）。
 *   M2 摘掉「看板页入口」块（`meta_blocks` 不再追加）：file／inline 必须失去 6 条目。
 *  一处 **模板级**变异（承重性证明）：
 *   M3 改 `templates/home.html` 的 `<h1>` 一个字：速查台产物 SHA 必须随之变化（模板是唯一源）。
 *
 *  还原口径：**内存原文写回 ＋ sha256 自校**——本文件尚未提交时 `git checkout HEAD --` 会连本票改动
 *  一起丢（修订 3 §7-4：每个变异后立即还原 ＋ 重建 dist ＋ 自证，不得留到批末）。
 *  机器可读摘要：末行 `RESULT: PASS|FAIL`。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'packages/skill-calorie/src/render/helpCenter.ts');
const TPL = join(ROOT, 'packages/skill-calorie/templates/home.html');
const TEST = 'packages/skill-calorie/test/skill-t11.test.mjs';
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const original = readFileSync(FILE, 'utf8');
const originalSha = sha256(original);
console.log('SHA-BEFORE ' + originalSha);

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: true, cwd: ROOT });

function buildAndTest() {
  const b = run('pnpm', ['build']);
  if (b.status !== 0) return { build: b.status, test: null, fail: null, out: (b.stdout || '') + (b.stderr || '') };
  const t = run('node', ['--test', TEST]);
  const out = (t.stdout || '') + (t.stderr || '');
  const fail = /^ℹ fail (\d+)$/m.exec(out);
  return { build: 0, test: t.status, fail: fail ? Number(fail[1]) : null, out };
}

const mutations = [
  ['M1', '锚点漂移：<h1> → <h2>', (src) => src.replace("title: '<h1>([^<]*)</h1>'", "title: '<h2>([^<]*)</h2>'")],
  ['M2', '摘掉看板页入口块：meta_blocks 不再追加', (src) => src.replace(
    'meta_blocks: [...(baseData.meta_blocks ?? []), helpViewEntriesMetaBlock(entries)],',
    'meta_blocks: [...(baseData.meta_blocks ?? [])],',
  )],
];

let ok = true;
for (const [tag, label, mutate] of mutations) {
  const mutated = mutate(original);
  if (mutated === original) { console.log('MUT ' + tag + ' FAIL 变异未命中锚点'); ok = false; continue; }
  writeFileSync(FILE, mutated, 'utf8');
  const red = buildAndTest();
  console.log('MUT ' + tag + ' (' + label + ') build=' + red.build + ' testExit=' + red.test
    + ' fail=' + red.fail + ' → ' + (red.test !== 0 && red.fail > 0 ? 'RED-AS-EXPECTED' : 'NOT-RED(缺陷)'));
  if (!(red.test !== 0 && red.fail > 0)) { ok = false; console.log((red.out || '').slice(-1500)); }

  writeFileSync(FILE, original, 'utf8');
  const restoredSha = sha256(readFileSync(FILE, 'utf8'));
  console.log('MUT ' + tag + ' restored sha256=' + restoredSha + ' match=' + (restoredSha === originalSha));
  if (restoredSha !== originalSha) { ok = false; continue; }

  const green = buildAndTest();
  console.log('MUT ' + tag + ' green build=' + green.build + ' testExit=' + green.test
    + ' fail=' + green.fail + ' → ' + (green.test === 0 && green.fail === 0 ? 'GREEN-AS-EXPECTED' : 'NOT-GREEN(缺陷)'));
  if (!(green.test === 0 && green.fail === 0)) { ok = false; console.log((green.out || '').slice(-1500)); }
}

console.log('SHA-AFTER ' + sha256(readFileSync(FILE, 'utf8')));

/* ── M3 · 模板级承重性：改模板一个字，速查台产物必须变 ─────────────────────────── */
const tplOriginal = readFileSync(TPL, 'utf8');
const tplSha = sha256(tplOriginal);
const { renderHelpCenterHtml } = await import(
  new URL('../../packages/skill-calorie/dist/render/helpCenter.js', import.meta.url).href);
const renderSha = () => sha256(renderHelpCenterHtml({ mode: 'file' }).html);
const baseRender = renderSha();
const tplMutated = tplOriginal.replace('<h1>今日总览</h1>', '<h1>今日总览MUT</h1>');
if (tplMutated === tplOriginal) { console.log('MUT M3 FAIL 模板变异未命中锚点'); ok = false; }
else {
  writeFileSync(TPL, tplMutated, 'utf8');
  const mutatedRender = renderSha();
  const hit = renderHelpCenterHtml({ mode: 'file' }).html.includes('今日总览MUT');
  console.log('MUT M3 (改 templates/home.html 的 <h1>) 产物SHA变=' + (mutatedRender !== baseRender)
    + ' 产物含新标题=' + hit + ' → ' + (mutatedRender !== baseRender && hit ? 'PROPAGATED-AS-EXPECTED' : 'NOT-PROPAGATED(缺陷)'));
  if (!(mutatedRender !== baseRender && hit)) { ok = false; }
  writeFileSync(TPL, tplOriginal, 'utf8');
  const tplRestored = sha256(readFileSync(TPL, 'utf8'));
  const restoredRender = renderSha();
  console.log('MUT M3 restored sha256=' + tplRestored + ' match=' + (tplRestored === tplSha)
    + ' 产物SHA回原=' + (restoredRender === baseRender));
  if (tplRestored !== tplSha || restoredRender !== baseRender) { ok = false; }
}
console.log('SHA-TPL-AFTER ' + sha256(readFileSync(TPL, 'utf8')));

console.log('RESULT: ' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);
