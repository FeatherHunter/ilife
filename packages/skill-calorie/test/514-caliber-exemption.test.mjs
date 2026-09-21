/** #514 · 体重口径行判据对齐守卫（让路结论，不改源码）。
 *
 * 让路依据（只读判定，不转述改写）：
 * - #505 状态 OPEN，其票面「允许保留」段逐字含「页脚口径行的 `｜`（全仓同形元信息件）」；
 * - #508 §三③「现存豁免（不许扩大）」逐字含「页脚口径行的 `｜`」；
 * - `src/weight/weightUi.ts:22` 逐字「页脚口径行的 `｜`（`renderCaliberLine` 全仓同形）」；
 * - `src/weight/log.ts:269` 逐字「条数两处同值（页脚口径行另有窗口与条数，属允许项 §二）」。
 * ⇒ #505 按豁免保留了 `｜`，本票选项 (a) 作废（不抢 #505 窗口，`log.ts` 一行不动）。
 *
 * 本件只做判据对齐（选项 (b) 的落盘一半，不碰豁免条款本身）：
 * ① 钉住 `log.ts` 两处口径行仍按豁免保留 `｜`（防悄悄改一半）；
 * ② 钉住豁免条款仍在（`weightUi.ts`＋`log.ts:269`）；
 * ③ 钉住产物口径行可见文本无 `｜·；` 且三段事实俱全（公共层 `renderCaliberLine`
 *    已按 `｜` 拆成三枚 `<span>`，分隔活在版式里，不在文本里）；
 * ④ 变异自证（改坏必红／还原必绿，读数打 `T514-MUT`）。
 *
 * 禁区：`src/weight/` 其余件、公共层（`packages/base-render/*`）、`src/home/` 一行不碰；
 * 本件只读源码文本（`readFileSync`），不 `import` 任何能力件。
 *
 * 运行：`node tooling/run-locked.mjs --ticket 514 -- node --test packages/skill-calorie/test/514-caliber-exemption.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const SRC_DIR = join(import.meta.dirname, '..', 'src', 'weight');
const LOG_PATH = join(SRC_DIR, 'log.ts');
const UI_PATH = join(SRC_DIR, 'weightUi.ts');
// 压行产物（编排者重出，认领者不自改；本件只读该行做对齐断言）。
const PRODUCT = join(import.meta.dirname, '..', '..', '..', '.scratch', 't375', 'products', '看今日体重概览.html');

/** 产物 `:1839` 口径行实况（只读快照，逐字；空格为段间一空格，见公共层注释）。 */
const CALIBER_HTML = '<p class="ilife-block-caliber"><span>📊 数据来源：体重记录</span> <span>窗口 2026-09-01 ~ 2026-09-07</span> <span>共 7 条</span></p>';

/** 可见文本＝剥全部标签＋压空白（口径行无 style/script/注释/实体，够用；全页口径见探针）。 */
function caliberVisible(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 票面验收 1：`/[｜·；]/u.test(t) === false`（给 `false` 读数）。 */
function assertCaliberClean(t) {
  assert.equal(/[｜·；]/u.test(t), false, '口径行可见文本仍含分隔符：' + t);
}

/* ── 与探针 `.scratch/sep-audit/probe.mjs:77-94` 同判的极简 R3（只判单串） ── */
const MAXSEG = 40;
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
function parallelRun(text) {
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i += 1; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end += 1;
      if (end - i + 1 >= 3) return { sep, n: end - i + 1 };
      i = end + 1;
    }
  }
  return null;
}

test('#514 对齐① log.ts 两处口径行按豁免保留｜（不抢 #505 窗口）', () => {
  const src = readFileSync(LOG_PATH, 'utf8');
  // 有窗页 `:265-266` 与空窗页 `:342` 两处定义都在（逐字钉住，不转述）。
  assert.ok(src.includes("const sourceText = '体重记录 ｜ 窗口 ' + rangeText"), '有窗页口径行定义丢失');
  assert.ok(src.includes("const sourceText = '体重记录 ｜ 窗口 ' + rangeText + ' ｜ 共 0 条'"), '空窗页口径行定义丢失');
  // 豁免标记仍在（改一半的反证）。
  assert.ok(src.includes('属允许项 §二'), 'log.ts:269 豁免标记丢失');
  const seps = (src.match(/｜/g) ?? []).length;
  console.log('T514-SRC log.ts ｜字符数=' + seps + ' 口径行定义=2处 豁免标记=在');
  assert.ok(seps >= 4, 'log.ts 里的 ｜ 少于两处口径行的 4 个（被悄悄改了一半？）：' + seps);
});

test('#514 对齐② 豁免条款仍在（weightUi.ts）', () => {
  const ui = readFileSync(UI_PATH, 'utf8');
  assert.ok(ui.includes('页脚口径行的 `｜`'), 'weightUi.ts 豁免条款丢失');
  console.log('T514-EXEMPT weightUi.ts 页脚口径行｜豁免=在');
});

test('#514 对齐③ 产物口径行无分隔符且三段事实俱全（公共层结构槽）', () => {
  const vis = caliberVisible(CALIBER_HTML);
  console.log('T514-CALIBER VIS=' + vis);
  console.log('T514-CALIBER HASSEP=' + /[｜·；]/u.test(vis));
  assertCaliberClean(vis);
  assert.equal(parallelRun(vis), null, '口径行可见文本仍触发 R3（≥3 段并列）');
  // 删符号不删事实：三段事实各有去处（来源／窗口／条数），一段不少。
  assert.ok(vis.includes('体重记录'), '来源段丢失');
  assert.ok(vis.includes('2026-09-01 ~ 2026-09-07'), '窗口段丢失（含 `~`，非并列分隔符）');
  assert.ok(vis.includes('共 7 条'), '条数段丢失');
  // 结构形状：三枚 <span>（分隔活在版式里，不在文本里）。
  const spans = (CALIBER_HTML.match(/<span>/g) ?? []).length;
  assert.equal(spans, 3, '口径行须是三枚 <span>（公共层按｜拆段）：' + spans);
  console.log('T514-CALIBER SPANS=3 FACTS=来源/窗口/条数俱全 R3=null');
  // 实盘抽查（文件在才判，不在不拦——交付目录由编排者重出）。
  if (existsSync(PRODUCT)) {
    const html = readFileSync(PRODUCT, 'utf8');
    const m = html.match(/<p class="ilife-block-caliber">[\s\S]*?<\/p>/);
    assert.ok(m, '产物里找不到口径行 <p>');
    const prodVis = caliberVisible(m[0]);
    console.log('T514-PRODUCT VIS=' + prodVis.slice(0, 80));
    assertCaliberClean(prodVis);
    assert.equal((m[0].match(/<span>/g) ?? []).length, 3, '实盘口径行不是三枚 <span>');
  } else {
    console.log('T514-PRODUCT SKIP（产物不在盘上，只判快照）');
  }
});

test('#514 变异自证：改回｜三段串必红，还原必绿', () => {
  const clean = caliberVisible(CALIBER_HTML);
  assertCaliberClean(clean);
  assert.equal(parallelRun(clean), null, '干净串不应触发 R3');
  // 变异：把三段事实改回 `｜` 硬串（选项 (a) 改前形态）。
  const mut = '📊 数据来源：体重记录 ｜ 窗口 2026-09-01 ~ 2026-09-07 ｜ 共 7 条';
  assert.notEqual(mut, clean, '变异串没塞进去');
  assert.throws(() => assertCaliberClean(mut), /仍含分隔符/, '变异（塞回｜三段串）未红');
  const run = parallelRun(mut);
  assert.ok(run !== null && run.sep === '｜' && run.n === 3, '变异串应触发 R3:｜x3');
  // 还原必绿。
  assertCaliberClean(clean);
  assert.equal(parallelRun(clean), null, '还原后没绿');
  console.log('T514-MUT 塞｜三段串 R3=｜x3 必红 还原 R3=null 必绿');
});
