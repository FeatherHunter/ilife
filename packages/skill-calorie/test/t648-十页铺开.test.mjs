/** #648 靶向探针：**10 页铺开**（独立核席自设，不沿用 #647 的探针）。
 *
 * 票面问的是「10 页调用页是否达到 Destination」：`ilife-block-dist-row-name` 窄槽不再静默裁标签。
 * 本探针打的是 #647 一页探针**覆盖不到**的面——**铺开面本身**：
 *
 *   ① 10 条唤醒词逐条真跑，**每条页的名称栏都只出短名**（蛋白／碳水／脂肪），且逐页都还有
 *      「推荐范围对比」表把范围端点（10%／20%／45%／65%／35%）承担着——范围一个字不少；
 *   ② **全页无老写法**：`（推荐 ` 在这 10 页上一次都不出现（#647 只钉了配比页这一条，
 *      复盘那 8 页当时**必须**还留着老写法；本票把它翻过来，这条判据就整个换了方向）；
 *   ③ **值栏一位不差**：分布行值栏三条百分比，逐条都能在对比表「实际」列 `N 克（M%）` 里读到
 *      （短名化只动名称栏，不许连带读数）；
 *   ④ **负向边界（不含目标页）**：同区块的近邻页（餐别分布／对比围度／对比体脂／热身主页）
 *      名称栏一律不得出现短名化后的孤立「蛋白」行——锁死「谁被铺开、谁没被碰」；
 *   ⑤ **清单闭合**：源码里那处长标签产地只由本探针点名的这几条唤醒词读到；10 条词渲染出
 *      **去重后 9 张不同产物**（「看饮食复盘」与「饮食复盘（本周）」同库同窗同内容），
 *      少一张或多一张都算清单与产物对不上。
 *
 * 跑法：`node --test packages/skill-calorie/test/t648-十页铺开.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 * 本探针只在自己的临时库里出页，不落仓内文件。
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 一条命令真跑一次：库与产物都落系统 tmp（收尾自证不落仓内件）。 */
function render(key, params) {
  const dir = mkdtempSync(join(tmpdir(), 't648-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  const out = join(dir, 't648-out.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, key + ' 真跑失败：exit=' + r.status + ' :: ' + String(r.stderr).slice(0, 300));
  const html = readFileSync(out, 'utf8');
  return { html, bytes: statSync(out).size, sha256: createHash('sha256').update(html).digest('hex') };
}

/** 分布行名称栏逐格文本（顺序即产物顺序）。 */
function rowNames(html) {
  return [...html.matchAll(/<span class="ilife-block-dist-row-name">([^<]*)<\/span>/g)].map((m) => m[1]);
}
/** 分布行值栏逐格文本。 */
function rowValues(html) {
  return [...html.matchAll(/<span class="ilife-block-dist-row-val">([^<]*)<\/span>/g)].map((m) => m[1]);
}

/** 铺开面：10 条唤醒词（页名 → 命令 ＋ 参数）。 */
const PAGES = [
  ['看营养结构', 'calorie.view.diet-review', { window: '7d' }],
  ['看今日营养', 'calorie.view.diet-review', { window: '今日', entry: 'today-nutrition' }],
  ['看饮食复盘', 'calorie.view.diet-review', { window: '今日' }],
  ['饮食复盘（本周）', 'calorie.view.diet-review', { window: '本周' }],
  ['饮食复盘（本月）', 'calorie.view.diet-review', { window: '本月' }],
  ['饮食复盘（最近 90 天）', 'calorie.view.diet-review', { window: '90d' }],
  ['饮食复盘（今年）', 'calorie.view.diet-review', { window: '今年' }],
  ['饮食复盘（自定义时间）', 'calorie.view.diet-review', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }],
  ['查营养配比', 'calorie.view.nutrition-ratio', { window: '7d' }],
  ['查营养结构', 'calorie.view.diet-review', { window: '7d' }],
];

const RENDERED = PAGES.map(([name, key, params]) => ({ name, page: render(key, params) }));

test('#648 ① 10 页逐页：名称栏只出三条短名，且对比表把范围端点全担着', () => {
  for (const { name, page } of RENDERED) {
    const names = rowNames(page.html);
    assert.deepEqual(names, ['蛋白', '碳水', '脂肪'], name + '：名称栏不是三条短名（铺开没生效／顺序变了）');
    assert.ok(page.html.includes('推荐范围对比'), name + '：对比表不在位（范围就没地方承担了）');
    for (const endpoint of ['10%（', '20%（', '45%（', '65%（', '35%（']) {
      assert.ok(page.html.includes(endpoint), name + '：对比表里读不到范围端点 ' + endpoint);
    }
  }
});

test('#648 ② 10 页全页无老写法「（推荐 」', () => {
  for (const { name, page } of RENDERED) {
    assert.equal(page.html.includes('（推荐 '), false, name + '：页面上还残留老写法「（推荐 …）」');
  }
});

test('#648 ③ 值栏一位不差：三条百分比都能在对比表「实际」列交叉核对', () => {
  for (const { name, page } of RENDERED) {
    const values = rowValues(page.html);
    assert.equal(values.length, 3, name + '：分布行值栏条数变了');
    for (const v of values) {
      assert.match(v, /^\d+(\.\d+)?%$/, name + '：值栏不再是百分比读数：' + v);
      assert.ok(page.html.includes('（' + v + '）'), name + '：对比表「实际」列与值栏对不上：' + v);
    }
  }
});

test('#648 ④ 负向边界：近邻页（餐别／围度／体脂／今日账）不得出现铺开后的短名分布行', () => {
  const NEIGHBOURS = [
    ['看饮食总览', 'calorie.view.diet', { window: '7d', entry: 'overview' }],
    ['对比围度', 'calorie.view.body-measure-compare', { date1: '2026-09-05', date2: '2026-09-07' }],
    ['对比体脂', 'calorie.view.body-composition-compare', {
      period1Start: '2026-09-05', period1End: '2026-09-05',
      period2Start: '2026-09-07', period2End: '2026-09-07',
    }],
    /* 今日账（主页）＝短标签分布行的另一个调用点（`homeViewParts.ts:101`）。 */
    ['看今日热量预算', 'calorie.view.home', { date: '今日' }],
    /* 缺口分解＝`trendPredictDocs.ts:97`（日常消耗／运动）。 */
    ['查热量缺口', 'calorie.view.deficit', { window: '7d' }],
  ];
  for (const [name, key, params] of NEIGHBOURS) {
    const names = rowNames(render(key, params).html);
    assert.equal(names.includes('蛋白') || names.includes('碳水') || names.includes('脂肪'), false,
      name + '：近邻页被顺带铺开了（本票只铺配比区块那 10 页）');
  }
});

test('#648 ⑤ 清单闭合：10 条词 → 归一后 7 组同文产物（已实测的同文组）', () => {
  /* 去重不比整页字节：产物里有两处**不是版面事实**的会随时间／参数变——页脚「复制日志」的生成时刻
     与本次命令参数（复制出去要能原样重跑）；窗口那一格则**是**版面事实，故只归一参数值不删参数名。
     10 条词归一后落到 7 组同文产物（本种子库实测）：
       A 组＝看营养结构／查营养结构／饮食复盘（本月）（7d 与「本月」在本数据下同窗同文）
       B 组＝看饮食复盘／饮食复盘（本周）（同命令同参数）
       其余五条各一组。数字变了说明清单与产物对不上（多一条词、或某页被改得与同组分家）。 */
  const keyOf = (html) => html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '<TS>')
    .replace(/(&#39;\{&quot;window&quot;:&quot;)[^&]*/g, '$1<W>');
  const groups = new Map();
  for (const { name, page } of RENDERED) {
    const k = keyOf(page.html);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(name);
  }
  assert.equal(RENDERED.length, 10, '清单条数变了');
  assert.equal(groups.size, 7, '10 条词归一后不是 7 组同文产物：' + JSON.stringify([...groups.values()]));
  const pair = [...groups.values()].find((g) => g.length === 2) ?? [];
  assert.deepEqual(pair.sort(), ['看饮食复盘', '饮食复盘（本周）'],
    '同参数那一对的成员变了（清单该跟着改）：' + JSON.stringify(pair));
});
