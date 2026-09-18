/** #401 · 可见文本守卫（分隔符设计债）——「一个内容要靠 `·` 和 `；` 分割，就说明 UI 还没设计」。
 *
 * 本件是 `.scratch/sep-audit/probe.mjs`（#401 施工工单的只读探针）**入仓那一份**，判据逐字同源：
 *  · 三条读数：含 `·`／含 `；`／≥3 段并列，**全 0 才算绿**；
 *  · ≥3 段并列＝同一并列分隔符切出连续 ≥3 个非空片段、每段 ≤40 字；分隔符闭集
 *    `· ； ; ｜ | ／ / 、 ＋`（`，。：~ → ＝` 是行文标点／范围／指向／等号，不算并列，
 *    免得把正常散文误判——口径同 `probe.mjs:28-34`）；
 *  · 可见文本抽取**复用仓内既有那一份** `visible-text-probe.mjs`（`t401c` 探针同款）：剥
 *    `head/style/script/注释` 与全部标签属性 ⇒ 复制载荷（`data-t` 里的日志原文）天然不参与判定，
 *    那是给复核的人照抄用的技术原件（452 同款口径）。
 *    与 `.scratch` 探针的唯一差别：探针把 `<title>` 的文本也算可见文本，本件按仓内口径把 head 剔掉；
 *    故本件**另加一条**显式锁：`<title>` 文本里也不许有 `·`（工单「title 不删但与眉标写法统一」）。
 *
 * 变异自证（改坏必红）：往产物可见文本里塞回一处 `·` 并列／一处 `；` → 三条读数必红；
 * 拿掉（＝原始产物）→ 三条读数全 0。跑法：`node --test packages/skill-calorie/test/t401-可见文本守卫.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { visibleLines } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 并列分隔符闭集（逐字照 `.scratch/sep-audit/probe.mjs:39`）。 */
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
/** 一段并列的每段长度上限（超过就不是「并列事实」而是散文，同探针 `MAXSEG`）。 */
const MAXSEG = 40;

/** 同一分隔符切出的**极大**并列串（连续 ≥3 段、每段 ≤MAXSEG）；没有就 null。 */
function parallelRun(text) {
  let best = null;
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i++; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end++;
      const segs = parts.slice(i, end + 1).map((p) => p.trim());
      if (segs.length >= 3 && (!best || segs.length > best.segs.length)) best = { sep, segs };
      i = end + 1;
    }
  }
  return best;
}

/** 三条读数：`dots`＝`·` 出现次数、`semis`＝`；` 出现次数、`runs`＝逐文本节点的 ≥3 段并列。 */
export function separatorHits(html) {
  const segs = visibleLines(html);
  const all = segs.join('\n');
  return {
    dots: all.split('·').length - 1,
    semis: all.split('；').length - 1,
    runs: segs.map((t) => parallelRun(t)).filter((r) => r !== null),
  };
}

/** 真出口跑一遍：固定种子库（`SEED_TODAY`）＋`dist/cli/cmd_read.js`，与 `home-lock-374` 同法。 */
function render(params) {
  const workDir = mkdtempSync(join(tmpdir(), 't401-guard-'));
  const db = openDb(join(workDir, DB_FILENAME));
  seedFull(db);
  db.close();
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.home', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(workDir), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, '真出口 exit 0（stderr：' + String(r.stderr).slice(0, 300) + '）');
  return readFileSync(JSON.parse(String(r.stdout).trim()).data.output, 'utf8');
}

const PAGE = render({ date: '今日' });

/** 变异演示：把副题改回改前那串 `·` 并列（`2026-09-01 至 2026-09-07 · 有记录 5/7 天 · 连续记录 3 天`）。
 *  走产物而不是走源码：守卫吃的是 HTML（源码里的引号会被「丢标签」那一步当属性吃掉，拿源码演示
 *  会得到一个假绿）——与 `t401c` 探针的变异同法。
 *  **#401e 只改锚点、不改判据**：副题那句的区间连接符按审查必改项 #7（R-e）由 `~` 改成「至」，
 *  故这段「把并列塞回去」的固定串跟着上屏文本走；三条读数（`·`／`；`／≥3 段并列 全 0）一字未动，
 *  变异后的期望读数也照旧（2 处 `·`、1 处 3 段并列）。 */
const SUBTITLE_CLEAN = '<p class="ilife-block-page-shell-subtitle">2026-09-01 至 2026-09-07</p>';

function mutateDots(html) {
  assert.ok(html.includes(SUBTITLE_CLEAN), '产物里找不到变异点（副题那一行）');
  return html.replace(SUBTITLE_CLEAN,
    '<p class="ilife-block-page-shell-subtitle">2026-09-01 至 2026-09-07 · 有记录 5/7 天 · 连续记录 3 天</p>');
}

function mutateSemi(html) {
  // **#401g 只改夹具锚点、不改判据**：审查必改项 #8 把页首那条「缺数一律写 —。」并入页脚「数据来源」行
  // （页级口径仍是一条 `p.ilife-block-caliber`，判据「塞一处 `；` ⇒ 读数 1」一字未动），
  // 锚点跟着上屏文本走。**#401i 同法再挪一次锚点**：缺数口径从页脚跟到表下那条（页脚只说来源），
  // 判据与期望读数仍一字未动。
  const hit = '<p class="ilife-block-caliber">缺口是消耗减摄入的差。缺数一律写 —。</p>';
  assert.ok(html.includes(hit), '产物里找不到变异点（页级口径行）：' + hit);
  return html.replace(hit,
    '<p class="ilife-block-caliber">缺口是消耗减摄入的差。缺数一律写 —；有记录才有数。</p>');
}

test('#401 可见文本守卫：`·`／`；`／≥3 段并列 三条读数全 0', () => {
  const hits = separatorHits(PAGE);
  assert.equal(hits.dots, 0, '可见文本里还有 `·`：' + hits.dots + ' 处');
  assert.equal(hits.semis, 0, '可见文本里还有 `；`：' + hits.semis + ' 处');
  assert.deepEqual(hits.runs.map((r) => r.sep + '×' + r.segs.length + '＝' + r.segs.join('｜')), [],
    '还有 ≥3 段并列');
  // `<title>` 那条单锁（`.scratch` 探针把它算可见文本，本件按仓内口径剔 head ⇒ 另加一条明锁）。
  const title = /<title>([^<]*)<\/title>/.exec(PAGE);
  assert.ok(title !== null, '产物里读不到 `<title>`');
  assert.ok(!title[1].includes('·'), '`<title>` 里还有 `·`：' + title[1]);
  assert.ok(title[1].includes('卡路里'), '`<title>` 丢了产品名：' + title[1]);
});

test('#401 变异自证：塞回一处 `·` 并列／一处 `；` → 必红；拿掉 → 必绿', () => {
  const dirty = separatorHits(mutateDots(PAGE));
  assert.equal(dirty.dots, 2, '变异后 `·` 读数该是 2，实得 ' + dirty.dots);
  assert.equal(dirty.runs.length, 1, '变异后该命中 1 处 ≥3 段并列，实得 ' + dirty.runs.length);
  const semi = separatorHits(mutateSemi(PAGE));
  assert.equal(semi.semis, 1, '变异后 `；` 读数该是 1，实得 ' + semi.semis);
  // 拿掉（＝原始产物）→ 绿：同一条判据在同一份产物上归零。
  const clean = separatorHits(PAGE);
  assert.equal(clean.dots, 0, '原始产物不该命中 `·`');
  assert.equal(clean.semis, 0, '原始产物不该命中 `；`');
  assert.equal(clean.runs.length, 0, '原始产物不该命中 ≥3 段并列');
});
