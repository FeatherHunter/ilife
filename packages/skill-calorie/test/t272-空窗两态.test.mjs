/** #272 整改 · 探针：**窗口为空**与**库为空**是两态（本票 S1 交付缺陷的收口断言）。
 *
 * **本探针守什么**（判据正本 `docs/skills/skill-calorie/t425-融合基准.md` 裁定 4 的 2026-09-15 澄清）：
 *
 *  ① **两态走不同出口**（这一条就是整改前**没有任何断言能区分**的那一处）：
 *     · **库为空**（整个库没数据）⇒ `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、**0 产物**、不落盘；
 *     · **窗口为空**（有命令、有窗口，库里有别处的记录、这一段零记录）⇒ `exit 0`、
 *       **落盘并回绝对路径**、产物是**完整文档**并含**空态句**与**引导句**。
 *     两条命令（单榜 `category`／全榜不给 `category`）**逐条**跑，两条都判——两态在代码里塌成一条时必红。
 *  ② **空窗页仍是完整页**：页内导航（裁定 3）／口径说明行（裁定 3）／来源脚注（裁定 3）／
 *     结论句含读数（裁定 2）四条都在，不是半页、不是空串。
 *  ③ **营养结构三段恒好 100%**（判据与裁定 §二 第 5 条本票自称改正过的那条口径）：
 *     `#272-排行榜页.test.mjs` 那 26 条**没盖住**它（复核席变异乙下 26 条全绿）——本条把它钉住：
 *     第三段吃余数 ⇒ 文字三段和恒 100、三段条宽和恒 100；退回「各段各自四舍五入」即红。
 *
 * 跑法：`node --test packages/skill-calorie/test/t272-空窗两态.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 * 变异自证（改坏 → 必红 → 逐文件还原 → 必绿）的可复跑脚本：
 * `node docs/skills/skill-calorie/t272-整改-run.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 种子窗口＝2026-09-01 ~ 2026-09-07；空窗那一根落在窗外（库里有记录、这一段零记录）。 */
const EMPTY_WINDOW = { window: 'custom', start: '2026-11-01', end: '2026-11-07' };
/** 空态句／引导句的钉点（空窗页两句的稳定片段；区间随窗口变，故只钉不带日期的部分）。 */
const EMPTY_TEXT = '里一条饮食记录都没有';
const GUIDE_TEXT = '说「记一餐」把吃的那顿记上';

/** 两态各一份库：`seed=true` 是有记录的库（空窗那一态），`false` 是空库（空库那一态）。 */
function freshDb(seed) {
  const dir = mkdtempSync(join(tmpdir(), 't272-2s-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

/** 产物目录：不给 `--html` 时落 `<库目录>/calorie_html/`。 */
const htmlDirOf = (dir) => join(dir, 'calorie_html');
const countHtml = (dir) => (existsSync(htmlDirOf(dir)) ? readdirSync(htmlDirOf(dir)).filter((f) => f.endsWith('.html')).length : 0);

/** 一条命令一次真跑（不指定 `--html`，走默认落点，好数产物件数）。 */
function run(dir, params) {
  const before = countHtml(dir);
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(SEED_TODAY) },
  });
  let output = '';
  try {
    output = String(JSON.parse(String(r.stdout)).data.output ?? '');
  } catch { output = ''; }
  /* 件数按**本次新增**算（两条命令共用一个库目录时，累计数会把前一条的产物也算进来）。 */
  return { status: r.status, stderr: String(r.stderr).trim(), output, made: countHtml(dir) - before };
}

/** 两条命令：单榜（带 `category`）与全榜（同一条命令、同一条参数，只是不给 `category`）。 */
const BOTH = [
  ['单榜 看高热量榜', { category: 'high_calorie', topN: 10, ...EMPTY_WINDOW }],
  ['全榜 看全部排行榜', { topN: 10, ...EMPTY_WINDOW }],
];

/* ── ① 两态走不同出口（整改前两态在代码里塌成一条） ── */

const EMPTY_DB = freshDb(false);
const SEEDED_DB = freshDb(true);
const LIB_EMPTY = BOTH.map(([label, params]) => ({ label, ...run(EMPTY_DB, params) }));
const WIN_EMPTY = BOTH.map(([label, params]) => ({ label, ...run(SEEDED_DB, params) }));

test('#272 整改 ① 库为空 ⇒ 逐字保持 exit 4 ＋ ERR 4 ＋ 0 产物（口径一字不动）', () => {
  for (const r of LIB_EMPTY) {
    assert.equal(r.status, 4, r.label + ' 空库该 exit 4，实测 exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
    assert.match(r.stderr, /ERR 4: 取数失败（缺失阻断）/, r.label + ' 空库的失败文案不是既有那句：' + r.stderr.slice(-200));
    assert.equal(r.made, 0, r.label + ' 空库不该落盘，实测产物 ' + r.made + ' 件');
    assert.equal(r.output, '', r.label + ' 空库不该回产物路径');
  }
});

test('#272 整改 ① 窗口为空（库里有别处的记录）⇒ exit 0 ＋ 落盘 ＋ 完整文档 ＋ 空态句 ＋ 引导句', () => {
  for (const r of WIN_EMPTY) {
    assert.equal(r.status, 0, r.label + ' 空窗该出页，实测 exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
    assert.equal(r.made, 1, r.label + ' 空窗该落 1 件产物，实测 ' + r.made + ' 件');
    assert.ok(r.output !== '' && existsSync(r.output), r.label + ' 没回可打开的绝对路径：' + r.output);
    assert.ok(isAbsolute(r.output), r.label + ' 回的落点不是绝对路径：' + r.output);
    const html = readFileSync(r.output, 'utf8');
    assert.ok(html.startsWith('<!doctype html>') && html.includes('<meta charset="utf-8">'), r.label + ' 空窗产物不是完整文档');
    assert.ok(html.includes('</html>'), r.label + ' 空窗产物没有收尾');
    const text = visibleText(stripCopyPayload(html));
    assert.ok(text.includes(EMPTY_TEXT), r.label + ' 空窗页缺空态句（钉点「' + EMPTY_TEXT + '」）');
    assert.ok(text.includes(GUIDE_TEXT), r.label + ' 空窗页缺「怎么记第一条」的引导句（钉点「' + GUIDE_TEXT + '」）');
    assert.ok(statSync(r.output).size > 4000, r.label + ' 空窗页过小（' + statSync(r.output).size + ' B）');
  }
});

test('#272 整改 ① 两态的出口读数两两不同（塌成一条即红）', () => {
  for (let i = 0; i < BOTH.length; i++) {
    assert.notEqual(LIB_EMPTY[i].status, WIN_EMPTY[i].status,
      BOTH[i][0] + ' 两态出口读数相同（都是 exit ' + WIN_EMPTY[i].status + '）——两态又塌成一条了');
    assert.equal(LIB_EMPTY[i].status, 4, BOTH[i][0] + ' 空库那一态不是 exit 4');
    assert.equal(WIN_EMPTY[i].status, 0, BOTH[i][0] + ' 空窗那一态不是 exit 0');
    assert.ok(WIN_EMPTY[i].made > LIB_EMPTY[i].made, BOTH[i][0] + ' 两态产物件数没分开（空窗 ' + WIN_EMPTY[i].made + '／空库 ' + LIB_EMPTY[i].made + '）');
  }
});

/* ── ② 空窗页仍是完整页（裁定 2／3 那四条不许因为空窗而掉） ── */

test('#272 整改 ② 空窗页仍是完整页：页内导航／口径行／来源脚注／结论句四条都在', () => {
  for (const r of WIN_EMPTY) {
    const html = readFileSync(r.output, 'utf8');
    const visible = visibleText(stripCopyPayload(html));
    assert.ok(html.includes('class="ilife-block-toc"') && html.includes('aria-label="页内导航"'), r.label + ' 空窗页缺页内导航（裁定 3）');
    assert.ok(html.includes('class="ilife-block-caliber"'), r.label + ' 空窗页缺口径说明行（裁定 3）');
    assert.ok(visible.includes('数据来源 · 饮食记录 ·'), r.label + ' 空窗页缺来源脚注（裁定 3）');
    assert.ok(html.includes('ilife-empty-text'), r.label + ' 空窗页没有空态占位（表空要给占位列，移植项 26）');
    /* 结论句紧跟 H1：空窗那句也要含读数（本页读数＝窗口区间与 `—`）。页题从产物里取，
       不按字面猜（单榜页是「排行 …」、全榜页是「全部排行 …」）。 */
    const lines = visible.split('\n').map((l) => l.trim()).filter(Boolean);
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html);
    assert.ok(h1 !== null, r.label + ' 空窗页没有 H1');
    const titleAt = lines.indexOf(h1[1].trim());
    assert.ok(titleAt >= 0, r.label + ' 空窗页题不在可见文本里：' + h1[1]);
    const conclusion = lines[titleAt + 1];
    assert.ok(conclusion !== undefined && /[0-9]/.test(conclusion), r.label + ' 空窗页结论句里没有读数：' + conclusion);
  }
});

/* ── ③ 营养结构三段恒好 100%（本票自称改正、而 26 条探针没盖住的那条口径） ── */

const SYN_DB = freshDb(false);
{
  /* 测试饭 ×2：每条 protein 10／carbs 20／fat 5／calories 165 ⇒ 盘上 totalCal 330、cnt 2。
     纸上手算期望：p=round(20*4/330*100)=24、c=round(40*4/330*100)=48、f=100-24-48=28（三段和恒 100）；
     老实物口径（各段各自四舍五入）f=round(10*9/330*100)=27 ⇒ 和 99。 */
  const db = openDb(join(SYN_DB, 'calorie_data.db'));
  const ins = db.prepare('INSERT INTO food_log (food_name, date, time, calories, protein, carbs, fat, grams) VALUES (?,?,?,?,?,?,?,?)');
  ins.run('测试饭', '2026-09-03', '12:00', 165, 10, 20, 5, 100);
  ins.run('测试饭', '2026-09-04', '12:00', 165, 10, 20, 5, 100);
  db.close();
}

test('#272 整改 ③ 三段恒好 100%：文字三段和＝100、三段条宽和＝100（退回各段四舍五入即红）', () => {
  const out = join(SYN_DB, 't272-2s-nutri.html');
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify({ category: 'high_calorie', topN: 10, window: '7d' }), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(SYN_DB), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, '假样例该出页，实测 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-200));
  const html = readFileSync(out, 'utf8');
  const text = visibleText(stripCopyPayload(html));
  /* #587：#582 已把营养结构三段并列由 `｜` 改空格（`rankingDocs.ts:141 nutriText`），本断言随文案同改。 */
  const expect = '蛋白 24% 碳水 48% 脂肪 28%';
  assert.ok(text.includes(expect), '营养结构文字不是三段吃余数那一套：' + expect + ' 读不到');
  const m = /蛋白 (\d+)% 碳水 (\d+)% 脂肪 (\d+)%/.exec(text);
  assert.ok(m !== null, '读不到三段文字百分比');
  const [p, c, f] = [Number(m[1]), Number(m[2]), Number(m[3])];
  assert.equal(p + c + f, 100, '三段文字和不等于 100：' + p + '+' + c + '+' + f + '=' + (p + c + f));
  const bar = /<span class="ilife-block-rank-bar"[\s\S]*?<\/span><\/span>/.exec(html);
  const widths = bar === null ? [] : [...bar[0].matchAll(/width:(\d+)%/g)].map((x) => Number(x[1]));
  assert.deepEqual(widths, [24, 48, 28], '三段条宽不是 24/48/28（实测 ' + widths.join('/') + '）');
  assert.equal(widths.reduce((a, b) => a + b, 0), 100, '三段条宽和不等于 100：' + widths.join('+') + '=' + widths.reduce((a, b) => a + b, 0));
});

/* 收尾：本探针只在自己的临时库里写产物，不留痕（显式断言，免得以为它改了什么）。 */
test('#272 整改 探针不落仓内文件', () => {
  const stray = readdirSync(join(ROOT, 'packages', 'skill-calorie')).filter((f) => f.startsWith('t272-2s-'));
  assert.deepEqual(stray, [], '仓内出现探针产物：' + stray.join('、'));
});
