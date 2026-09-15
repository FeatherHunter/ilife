/** #279 · 场景 02 饮食 · **83 条唤醒词的真出口结构化断言**（CLI 级，不是模块级）。
 *
 * 本件守票面四段判据（每条判据一段，测试名开头就是那一段的号）：
 *  ① **逐条断言**（83 条）：唤醒词与命令行**从运行期总表取**（`dist/triggers/routes.generated.js`
 *     的 `ALL_ROUTES` 筛 `scene === '02'`，不手抄字面量）；命令实跑 **exit 0**、`data.output` 是
 *     **绝对路径**、文件**真落盘**、字节**如实**（信封报的＝盘上实际，且非 0）、**完整文档**
 *     （`<!doctype html>` 在第 0 字节 ＋ charset ＋ 样式段 ＋ `</html>` 收尾）。
 *  ② **写类词额外断言**：写前确认页先出（4 条词，且**库一格未动**）；写后回执含改动字段与对照；
 *     **真库写入**用与现值相同的值（写后回读计数）。
 *  ③ **两态各跑一遍**：空库（整表零行）⇒ 取数类读命令一律 `exit 4` ＋
 *     `ERR 4: 取数失败（缺失阻断）` ＋ 不落盘；窗口为空 ⇒ 出完整页 ＋ 空态句 ＋ 引导句。
 *  ④ 失败要能**指出卡在哪一步**（唤醒词命中／命令／页面）——断言消息里写清。
 *  ⑤ **变异自证**：改坏一处 ⇒ 必红；还原 ⇒ 必绿（两行机器读数见 `.scratch/t279/变异-读数.txt`，
 *     由 `.scratch/t279/变异.mjs` 出）。
 *  ⑥ 文件以本票号命名；`node --test` 该件全绿。
 *
 * **条数口径**（票面写 70，那是地图设计期老技能词表口径）：当刻运行期总表筛 `scene === '02'` 是
 * **83 条**；老词表 `SCENE_02_DIET` 的 **70 条**（按 `wake_word` 去重 70）**一条不漏全含在其中**，
 * 多出的 **13 条**见下面 `OLD_TABLE_EXTRA`。本锁锁 83 条。
 *
 * 跑法：`node D:\ilife\node_modules\typescript\bin\tsc -b packages/base-render packages/skill-calorie --force`
 * 之后 `node --test packages/skill-calorie/test/t279-真出口用例.test.mjs`（约 230 次真出口调用，一分钟上下）。
 *
 * **件名**：`t279-真出口用例.test.mjs`（票面要的 `test/t279-*.test.mjs`）。
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const SELF = basename(fileURLToPath(import.meta.url));
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 跑法与种子的**同一处定义**：判据件与可复跑脚本共用（`docs/skills/skill-calorie/t279-真跑.mjs`）。 */
const H = await import(pathToFileURL(join(ROOT, 'docs', 'skills', 'skill-calorie', 't279-真跑.mjs')).href);
const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { routesFor } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routing.js')).href);
const { SCENE_02_DIET } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'scene-02-diet.js')).href);

/** 老技能词表有、地图设计期写进票面的那 70 条之外的运行期补词（13 条，`t280-真跑台账.md` §一 同表）。 */
const OLD_TABLE_EXTRA = [
  '看今日饮食记录', '看饮食复盘', '查高热量排行', '查食品库', '搜食品', '看去重报告', '查营养配比',
  '看营养素明细', '看食品来源分布', '看今日饮水', '看批量导入预览', '看营养分析', '看每日六因素',
];

/** 空库那一态的**已知例外**（共 3 条）：参数全在命令里、不读库，故不受「空库取数失败」约束。 */
const EMPTY_DB_EXCEPTIONS = ['看有备注的饮食记录', '看「有备注」的饮食记录', '看批量导入预览'];

/** 空窗那一态的**已知例外**（共 1 条）：`t425` 裁定 4 要它出完整页，当刻 master 报 exit 4。
 *  `docs/skills/skill-calorie/t280-真跑台账.md` §四·二 已记为逐格缺陷第 82 格，归属 #275（页面族）／
 *  场景归属待编排者裁。本锁**具名钉住**它：它当刻必须仍是那一条红，且**除它之外不许再有第二条**。 */
const EMPTY_WINDOW_EXCEPTIONS = ['看营养分析'];

/* ── 一次实跑，多处断言（读数只取一遍） ────────────────────────────────────── */

const SCRATCH = mkdtempSync(join(tmpdir(), 't279-'));
const SNAP = H.buildSnapshot(join(SCRATCH, 'snapshot'), openDb);
const EMPTY_SNAP = H.buildEmptySnapshot(join(SCRATCH, 'snapshot-empty'), openDb);
const DIR = join(SCRATCH, 'db');

const ROUTES = H.scene02Routes();
const 甲 = ROUTES.map((route) => ({ route, ...H.readOne(DIR, SNAP.file, route) }));
const 写 = ROUTES.filter(H.isWriteRoute).map((route) => ({ route, ...H.readWrite(DIR, SNAP.file, route, openDb) }));
const READ_ROUTES = ROUTES.filter((r) => !H.isWriteRoute(r));
const 乙 = READ_ROUTES.map((route) => ({ route, ...H.readOne(DIR, EMPTY_SNAP.file, route) }));
const 乙写 = ROUTES.filter(H.isWriteRoute).map((route) => ({ route, ...H.readOne(DIR, EMPTY_SNAP.file, route) }));
const 丙 = ROUTES.filter(H.isWindowRoute).map((route) => ({
  route, params: H.emptyWindowParams(route.params), ...H.readOne(DIR, SNAP.file, route, H.emptyWindowParams(route.params)),
}));

const visibleOf = H.visible;
const docOk = H.completeDoc;
const emptyHit = (html) => H.EMPTY_RE.test(visibleOf(html));
const guideHit = (html) => H.GUIDE_RE.test(visibleOf(html));

/** 判据④：失败消息要点出**卡在第几步**（1 唤醒词命中／2 命令／3 页面）。 */
const STAGES = { 1: '唤醒词命中', 2: '命令实跑', 3: '页面' };
function where(route, step, extra) {
  return '唤醒词「' + route.wakeWord + '」｜命令 ' + route.key
    + '｜参数 ' + (route.params === null ? '（无）' : JSON.stringify(route.params))
    + '｜卡在第 ' + step + ' 步（' + STAGES[step] + '）' + (extra === undefined ? '' : '：' + extra);
}

/* ── ⑥ 件名与口径 ────────────────────────────────────────────────────────── */

test('#279 ⑥ 文件以本票号命名：' + SELF, () => {
  assert.match(SELF, /^t279-.+\.test\.mjs$/, '判据⑥ 要的文件名是 test/t279-*.test.mjs，实际 ' + SELF);
  assert.ok(existsSync(CLI), '第 2 步的入口不在：' + CLI + '（先 --force 重编）');
  assert.ok(SCRATCH.startsWith(tmpdir() + sep) || SCRATCH.startsWith(tmpdir()), '读数不许落仓内：' + SCRATCH);
});

test('#279 ① 条数口径：运行期总表 83 条／老词表 70 条全含其中／多出 13 条', () => {
  assert.equal(ROUTES.length, 83, '当刻运行期总表筛 scene === 02 的条数变了：' + ROUTES.length);
  const runWakes = new Set(ROUTES.map((r) => r.wakeWord));
  assert.equal(runWakes.size, ROUTES.length, '总表里有重名唤醒词：' + ROUTES.length + ' 条 / ' + runWakes.size + ' 个名字');

  const oldWakes = SCENE_02_DIET.map((x) => x.wake_word);
  assert.equal(oldWakes.length, 70, '老技能词表条数变了：' + oldWakes.length);
  assert.equal(new Set(oldWakes).size, 70, '老技能词表里有重名唤醒词');
  const 漏 = oldWakes.filter((w) => !runWakes.has(w));
  assert.deepEqual(漏, [], '老词表有词在运行期总表里查不到（70 条不全含）：' + JSON.stringify(漏));

  const 多 = [...runWakes].filter((w) => !oldWakes.includes(w));
  assert.deepEqual([...多].sort(), [...OLD_TABLE_EXTRA].sort(), '运行期比老词表多出的条数对不上：' + JSON.stringify(多));
  console.log('READING #279 ① 运行期 ' + ROUTES.length + ' 条／老词表 ' + oldWakes.length + ' 条，多出 ' + 多.length + ' 条');
});

/* ── ① 逐条断言（83 条） ──────────────────────────────────────────────────── */

/* 每条一条测试：红了就能一眼看出是哪条词、卡在哪一步。 */
for (const { route, status, stderr, out, reportedBytes, diskBytes, html, produced } of 甲) {
  test('#279 ① 真出口 exit 0 ＋ 绝对路径 ＋ 真落盘 ＋ 字节如实 ＋ 完整文档 —— ' + route.wakeWord, () => {
    // 第 2 步：命令实跑。
    assert.equal(status, 0, where(route, 2, 'exit=' + status + ' stderr=' + stderr.slice(-240)));
    // 第 3 步：页面。
    assert.ok(out !== null, where(route, 3, '信封里没有 data.output'));
    assert.equal(isAbsolute(out), true, where(route, 3, 'data.output 不是绝对路径：' + String(out)));
    assert.equal(basename(dirname(out)), 'calorie_html', where(route, 3, '产物没落 <SKILLS_DB_PATH>/calorie_html/：' + out));
    assert.equal(existsSync(out), true, where(route, 3, '产物没真落盘：' + out));
    assert.equal(produced.length, 1, where(route, 3, '这一趟落盘的件数不是 1：' + JSON.stringify(produced)));
    assert.equal(diskBytes, reportedBytes, where(route, 3, '信封报 ' + reportedBytes + ' B，盘上 ' + diskBytes + ' B'));
    assert.ok(reportedBytes > 0, where(route, 3, '字节为 0'));
    assert.equal(diskBytes, statSync(out).size, where(route, 3, '读完盘之后文件又变了'));
    assert.equal(docOk(html), true, where(route, 3, completeGap(html)));
  });
}

/** 完整文档差了哪一条（判据①的四条硬事实逐条点名）。 */
function completeGap(html) {
  const gaps = [];
  if (!html.startsWith('<!doctype html>')) gaps.push('第 0 字节不是 <!doctype html>（读到 ' + JSON.stringify(html.slice(0, 16)) + '）');
  if (!html.includes('<meta charset="utf-8">')) gaps.push('缺 charset');
  if (!html.includes('<style>')) gaps.push('缺样式段');
  if (!html.trimEnd().endsWith('</html>')) gaps.push('结尾不是 </html>');
  return gaps.join('；');
}

test('#279 ① 83 条汇总读数（exit 分布／落盘件数／字节区间）', () => {
  const 非零 = 甲.filter((r) => r.status !== 0).map((r) => r.route.wakeWord);
  assert.deepEqual(非零, [], '这 ' + 非零.length + ' 条没跑到 exit 0：' + JSON.stringify(非零));
  const 落盘 = 甲.filter((r) => existsSync(r.out));
  assert.equal(落盘.length, 83, '真落盘的只有 ' + 落盘.length + ' 条');
  const 件数 = new Map();
  for (const r of 甲) 件数.set(r.out, (件数.get(r.out) ?? 0) + 1);
  const 撞 = [...件数].filter(([, n]) => n > 1).map(([p]) => p);
  assert.deepEqual(撞, [], '有两条词落到同一份产物上：' + JSON.stringify(撞));
  const 字节 = 甲.map((r) => r.reportedBytes);
  assert.ok(Math.min(...字节) > 10_000, '最小产物只有 ' + Math.min(...字节) + ' B，不像整页');
  console.log('READING #279 ① 83 条 exit 0／83 份产物／字节 ' + Math.min(...字节) + '–' + Math.max(...字节));
});

/* ── ② 写类词额外断言 ────────────────────────────────────────────────────── */

const 预检 = 写.filter((r) => H.isPrecheckRoute(r.route));
const 真写 = 写.filter((r) => !H.isPrecheckRoute(r.route));

/** 写后回执必出的两块（老实物 `crud_receipt.html` 逐字）；② 与 ⑤ 共用这一处定义。 */
const RECEIPT_BLOCKS = ['✅ 操作回执', '📋 字段变更'];

test('#279 ② 写前确认页先出：4 条词出的是预检确认页，且库一格未动', () => {
  assert.equal(预检.length, 4, '带写前确认入口的词不是 4 条：' + JSON.stringify(预检.map((r) => r.route.wakeWord)));
  assert.deepEqual(预检.map((r) => r.route.wakeWord).sort(),
    ['批量导入食品', '拍营养表记一餐', '拍营养表补记一餐', '校验批量导入'].sort(),
    '写前确认页那 4 条词对不上：' + JSON.stringify(预检.map((r) => r.route.wakeWord)));
  for (const r of 预检) {
    assert.equal(r.status, 0, where(r.route, 2, 'exit=' + r.status + ' stderr=' + r.stderr.slice(-240)));
    assert.equal(docOk(r.html), true, where(r.route, 3, completeGap(r.html)));
    const t = visibleOf(r.html);
    assert.equal(t.includes('预检确认'), true, where(r.route, 3, '页上读不到「预检确认」——写前确认页没先出'));
    assert.equal(t.includes('✅ 操作回执'), false, where(r.route, 3, '写前确认页先出了写后回执，写前那一步被跳过了'));
    assert.deepEqual(r.after, r.before,
      where(r.route, 2, '写前确认页这一步不该改库，写前 ' + JSON.stringify(r.before) + ' 写后 ' + JSON.stringify(r.after)));
  }
  console.log('READING #279 ② 写前确认页 ' + 预检.length + ' 条 exit 0／库未动');
});

test('#279 ② 写后回执含改动字段与对照', () => {
  const 改类 = 真写.filter((r) => r.route.key.startsWith('calorie.diet.update') || r.route.key === 'calorie.product.update'
    || r.route.key === 'calorie.product.deprecate');
  const 删类 = 真写.filter((r) => r.route.key.startsWith('calorie.diet.remove'));
  const 新增类 = 真写.filter((r) => !改类.includes(r) && !删类.includes(r));
  assert.equal(真写.length, 15, '写后回执类词不是 15 条：' + JSON.stringify(真写.map((r) => r.route.wakeWord)));
  for (const r of 真写) {
    assert.equal(r.status, 0, where(r.route, 2, 'exit=' + r.status + ' stderr=' + r.stderr.slice(-240)));
    assert.equal(docOk(r.html), true, where(r.route, 3, completeGap(r.html)));
    const t = visibleOf(r.html);
    for (const b of RECEIPT_BLOCKS) {
      assert.equal(t.includes(b), true, where(r.route, 3, '缺「' + b + '」那一块（老实物 crud_receipt.html）'));
    }
  }
  for (const r of 改类) {
    const t = visibleOf(r.html);
    assert.equal(t.includes('改前 → 改后对照'), true, where(r.route, 3, '改类缺「改前 → 改后对照」表题'));
  }
  /* 按**条**删（`calorie.diet.remove`）那一条出被删快照四列；按日期／餐别／区间删的是条件式删除，
     快照表由老实物 `:390` 的 `items.length` 决定，条件式那一支不出（但要把「为什么没有」写出来）
     ——`#270` 的口径，逐条读数见 `.scratch/t279/probe-d.mjs`。 */
  const 逐条删 = 删类.filter((r) => r.route.key === 'calorie.diet.remove');
  assert.equal(逐条删.length, 1, '按条删那一条词不止一条：' + JSON.stringify(逐条删.map((r) => r.route.wakeWord)));
  for (const r of 逐条删) {
    assert.equal(visibleOf(r.html).includes('删除前的原值（逐条）'), true,
      where(r.route, 3, '按条删缺「删除前的原值（逐条）」快照表'));
  }
  for (const r of 删类) {
    const t = visibleOf(r.html);
    assert.equal(t.includes('删除成功'), true, where(r.route, 3, '删类回执的状态格不是「删除成功」'));
    /* 回执上那句读数要与真库落下的行数同值（写后回读计数对到页面上）。 */
    const m = /影响行数 (\d+) 行/.exec(t);
    assert.ok(m !== null, where(r.route, 3, '删类回执读不到「影响行数 N 行」'));
    const 落 = r.before.food_log - r.after.food_log;
    assert.equal(Number(m[1]), 落, where(r.route, 3, '回执说删了 ' + m[1] + ' 行，真库落了 ' + 落 + ' 行'));
    if (r.route.key !== 'calorie.diet.remove') {
      assert.equal(t.includes('本次回执未带删除前的逐条原值'), true,
        where(r.route, 3, '条件式删除没出快照表，却没写出「为什么没有」'));
    }
  }
  for (const r of 新增类) {
    assert.equal(visibleOf(r.html).includes('本次结果'), true, where(r.route, 3, '新增类缺「本次结果」那一列'));
    assert.equal(r.html.includes('>改前</th>'), false, where(r.route, 3, '新增类不该硬套「改前 → 改后」两列'));
  }
  console.log('READING #279 ② 写后回执 ' + 真写.length + ' 条：改类 ' + 改类.length + '／删类 ' + 删类.length + '／新增类 ' + 新增类.length);
});

test('#279 ② 真库写入：写后回读计数（与写前对得上）', () => {
  const 期望 = new Map([
    // 词 → [表, 计数方向]：ins=涨、del=落、same=不动
    ['记一餐', ['food_log', 'ins']], ['记一餐（含备注）', ['food_log', 'ins']], ['补记饮食', ['food_log', 'ins']],
    ['批量补记饮食', ['food_log', 'ins']], ['记喝水', ['food_log', 'ins']], ['复制昨日饮食', ['food_log', 'ins']],
    ['改饮食记录', ['food_log', 'same']], ['改某日饮食', ['food_log', 'same']],
    ['删饮食记录', ['food_log', 'del']], ['删一餐', ['food_log', 'del']], ['删某日饮食', ['food_log', 'del']],
    ['批量删饮食', ['food_log', 'del']],
    ['存食品', ['nutrition_products', 'ins']], ['改食品', ['nutrition_products', 'same']], ['下架食品', ['nutrition_products', 'same']],
  ]);
  for (const r of 真写) {
    const spec = 期望.get(r.route.wakeWord);
    assert.ok(spec, where(r.route, 2, '这条写词没有登记读写后读数该看哪张表'));
    const [table, dir] = spec;
    const a = r.before[table];
    const b = r.after[table];
    if (dir === 'ins') assert.ok(b > a, where(r.route, 2, table + ' 没涨：' + a + ' → ' + b + '（没真写进库）'));
    else if (dir === 'del') assert.ok(b < a, where(r.route, 2, table + ' 没落：' + a + ' → ' + b + '（没真删掉）'));
    else assert.equal(b, a, where(r.route, 2, table + ' 行数该不动：' + a + ' → ' + b));
  }
  console.log('READING #279 ② 写后回读 ' + 真写.length + ' 条：' + 真写.map((r) => r.route.wakeWord + ' ' + JSON.stringify(r.before) + '→' + JSON.stringify(r.after)).slice(0, 3).join('；') + ' …');
});

test('#279 ② 真库写入用与现值相同的值：写进去的值＝回读到的值；写同一个值再跑一遍仍落在真库', () => {
  /* 甲：改类词的命令值 → 回读到的库面值必须同值（`改饮食记录` 的克数、`改食品` 的备注、`下架食品` 的下架位）。 */
  const 改饮食 = 真写.find((r) => r.route.key === 'calorie.diet.update');
  assert.equal(Number(改饮食.foodRow1.grams), Number(改饮食.route.params.grams),
    where(改饮食.route, 2, '写进库的克数 ' + 改饮食.foodRow1.grams + ' ≠ 命令里的 ' + 改饮食.route.params.grams));
  const 改食品 = 真写.find((r) => r.route.key === 'calorie.product.update');
  assert.equal(改食品.productRow1.note, 改食品.route.params.note,
    where(改食品.route, 2, '写进库的备注 ' + JSON.stringify(改食品.productRow1.note) + ' ≠ 命令里的 ' + JSON.stringify(改食品.route.params.note)));
  const 下架 = 真写.find((r) => r.route.key === 'calorie.product.deprecate');
  assert.equal(Number(下架.productRow1.is_deprecated), 1,
    where(下架.route, 2, '下架位没落到真库：is_deprecated=' + 下架.productRow1.is_deprecated));

  /* 乙：拿库里的**现值**再写一遍（值不变），回读计数与内容都不许变——证明写的是真库，不是副本。 */
  H.restore(DIR, SNAP.file);
  const 现值 = H.rowOf(DIR, openDb, 'food_log', 1);
  const 写前 = H.countOf(DIR, openDb, 'food_log');
  const r = H.runCli(DIR, 'calorie.diet.update', { id: 1, grams: 现值.grams });
  assert.equal(r.status, 0, '按现值再写一遍 exit=' + r.status + ' stderr=' + r.stderr.slice(-240));
  assert.equal(H.countOf(DIR, openDb, 'food_log'), 写前, '按现值再写一遍，饮食库行数动了');
  const 回读 = H.rowOf(DIR, openDb, 'food_log', 1);
  assert.equal(Number(回读.grams), Number(现值.grams), '回读到的克数 ≠ 现值：' + 回读.grams + ' vs ' + 现值.grams);
  assert.equal(回读.food_name, 现值.food_name, '按现值再写一遍，同一行的食物名变了');
  console.log('READING #279 ② 现值再写：id=1 克数 ' + 现值.grams + ' → ' + 回读.grams + '，行数 ' + 写前 + ' → ' + H.countOf(DIR, openDb, 'food_log'));
});

/* ── ③ 两态：空库 ────────────────────────────────────────────────────────── */

test('#279 ③ 空库（整表零行）：取数类读命令一律 exit 4 ＋ `ERR 4: 取数失败（缺失阻断）` ＋ 不落盘', () => {
  assert.equal(乙.length, READ_ROUTES.length, '空库这一态跑漏了条数');
  const 例外 = 乙.filter((r) => EMPTY_DB_EXCEPTIONS.includes(r.route.wakeWord)).map((r) => r.route.wakeWord);
  assert.deepEqual([...例外].sort(), [...EMPTY_DB_EXCEPTIONS].sort(),
    '空库那一态的例外集合变了（多出或少了）：' + JSON.stringify(例外));
  for (const r of 乙) {
    if (EMPTY_DB_EXCEPTIONS.includes(r.route.wakeWord)) continue;
    assert.equal(r.status, 4, where(r.route, 2, '空库该 exit 4，实跑 exit=' + r.status + ' stderr=' + r.stderr.slice(-240)));
    assert.ok(r.stderr.startsWith('ERR 4: 取数失败（缺失阻断）'),
      where(r.route, 2, '空库的失败面不是「ERR 4: 取数失败（缺失阻断）」，读到：' + JSON.stringify(r.stderr.slice(0, 120))));
    assert.equal(r.out, null, where(r.route, 3, '空库报错了却给了产物路径：' + String(r.out)));
    assert.deepEqual(r.produced, [], where(r.route, 3, '空库报错了却落了盘：' + JSON.stringify(r.produced)));
  }
  for (const r of 乙.filter((x) => EMPTY_DB_EXCEPTIONS.includes(x.route.wakeWord))) {
    assert.equal(r.status, 0, where(r.route, 2, '这条例外（参数全在命令里、不读库）该 exit 0，实跑 ' + r.status));
    assert.equal(docOk(r.html), true, where(r.route, 3, completeGap(r.html)));
  }
  console.log('READING #279 ③ 空库：读命令 ' + 乙.length + ' 条，exit 4 共 ' + (乙.length - 3) + ' 条／例外 ' + 3 + ' 条');
});

test('#279 ③ 空库：写类词不崩（exit ∈ {0, 4}），报错时不落盘', () => {
  for (const r of 乙写) {
    assert.ok(r.status === 0 || r.status === 4,
      where(r.route, 2, '空库跑写类词出了不是 0/4 的 exit=' + r.status + ' stderr=' + r.stderr.slice(-240)));
    if (r.status !== 0) {
      assert.equal(r.out, null, where(r.route, 3, '报错却给了产物路径'));
      assert.deepEqual(r.produced, [], where(r.route, 3, '报错却落了盘：' + JSON.stringify(r.produced)));
    } else {
      assert.equal(docOk(r.html), true, where(r.route, 3, completeGap(r.html)));
    }
  }
  console.log('READING #279 ③ 空库写类：' + 乙写.length + ' 条，exit 0 共 ' + 乙写.filter((r) => r.status === 0).length
    + '／exit 4 共 ' + 乙写.filter((r) => r.status === 4).length);
});

/* ── ③ 两态：窗口为空 ────────────────────────────────────────────────────── */

test('#279 ③ 窗口为空（库里有底、这段时间没记）：出完整页 ＋ 空态句 ＋ 引导句', () => {
  const 干净 = 丙.filter((r) => !EMPTY_WINDOW_EXCEPTIONS.includes(r.route.wakeWord));
  assert.equal(干净.length, 丙.length - 1, '空窗那一态跑漏了条数');
  for (const r of 干净) {
    assert.equal(r.status, 0, where(r.route, 2, '空窗该出完整页，实跑 exit=' + r.status + ' stderr=' + r.stderr.slice(-240)));
    assert.equal(docOk(r.html), true, where(r.route, 3, completeGap(r.html)));
    assert.equal(emptyHit(r.html), true, where(r.route, 3, '空窗页上读不到空态句（形状 ' + H.EMPTY_RE + '）'));
    assert.equal(guideHit(r.html), true, where(r.route, 3, '空态句后没接「怎么记第一条」的引导句（形状 ' + H.GUIDE_RE + '）'));
  }
  console.log('READING #279 ③ 空窗：' + 干净.length + ' 条 exit 0／完整文档／空态句＋引导句齐全');
});

test('#279 ③ 空窗：已知例外只有一条（看营养分析），且它当刻仍是那一条红', () => {
  const 红 = 丙.filter((r) => !(r.status === 0 && docOk(r.html) && emptyHit(r.html) && guideHit(r.html)));
  assert.deepEqual([...红.map((r) => r.route.wakeWord)].sort(), [...EMPTY_WINDOW_EXCEPTIONS].sort(),
    '空窗那一态的红不止一条，或有例外被修好却没更新这份具名名单：' + JSON.stringify(红.map((r) => r.route.wakeWord)));
  const r = 红[0];
  assert.equal(r.status, 4, where(r.route, 2, '这条例外当刻的实况变了：exit=' + r.status));
  assert.ok(r.stderr.startsWith('ERR 4: 取数失败（缺失阻断）'),
    where(r.route, 2, '这条例外的失败面变了：' + JSON.stringify(r.stderr.slice(0, 120))));
  assert.deepEqual(r.produced, [], where(r.route, 3, '这条例外报错了却落了盘'));
  console.log('READING #279 ③ 空窗例外 ' + r.route.wakeWord + '：仍 exit 4（与 t425 裁定 4 冲突，t280 台账逐格缺陷第 82 格，归属 #275）');
});

/* ── ④ 失败要能指出卡在哪一步 ────────────────────────────────────────────── */

test('#279 ④ 第 1 步：83 条词在运行期路由器里都命中得到本锁跑的那条命令', () => {
  let 多解 = 0;
  for (const route of ROUTES) {
    const 命中 = routesFor(route.wakeWord);
    assert.ok(命中.length > 0, where(route, 1, '运行期路由器按这条唤醒词查不到任何记录（词没接上）'));
    assert.ok(命中.some((h) => h.key === route.key),
      where(route, 1, '按这条唤醒词解析到的命令里没有本锁跑的那条：' + JSON.stringify(命中.map((h) => h.key))));
    if (命中.length > 1) 多解 += 1;
  }
  console.log('READING #279 ④ 83 条词在路由器里都命中；其中 ' + 多解 + ' 个词在总表里挂不止一条记录');
});

test('#279 ④ 失败消息点得出卡在哪一步（唤醒词命中／命令／页面）', () => {
  const route = ROUTES.find((r) => r.wakeWord === '看今日饮食');
  assert.ok(route, '总表里找不到「看今日饮食」这一步的样本');
  for (const step of [1, 2, 3]) {
    const m = where(route, step, '样例细节');
    assert.ok(m.includes('唤醒词「看今日饮食」'), '第 ' + step + ' 步的消息没点出唤醒词：' + m);
    assert.ok(m.includes('命令 ' + route.key), '第 ' + step + ' 步的消息没点出命令：' + m);
    assert.ok(m.includes('参数 '), '第 ' + step + ' 步的消息没点出参数：' + m);
    assert.ok(m.includes('卡在第 ' + step + ' 步（' + STAGES[step] + '）'), '第 ' + step + ' 步的消息没点出步骤名：' + m);
  }
  /* 拿一条**真的会红**的跑法验一遍：库文件被抽走 ⇒ 第 2 步（命令）失败，消息里必须写着第 2 步。 */
  const 空目录 = mkdtempSync(join(tmpdir(), 't279-red-'));
  const bad = H.runCli(空目录, route.key, route.params);
  assert.notEqual(bad.status, 0, '库文件不在时命令反而 exit 0 了');
  const m = where(route, 2, 'exit=' + bad.status + ' stderr=' + bad.stderr.slice(0, 80));
  assert.ok(m.includes('卡在第 2 步（命令实跑）'), '真红那一条的消息没写出卡在命令那一步：' + m);
  console.log('READING #279 ④ 真红样本 exit=' + bad.status + ' ｜ ' + m.slice(0, 120));
});

/* ── ⑤ 变异自证 ──────────────────────────────────────────────────────────── */

test('#279 ⑤ 变异：把产物改坏一处，「完整文档」那条断言必红；原样必绿', () => {
  const html = 甲[0].html;
  assert.equal(docOk(html), true, '原样产物本该判为完整文档（' + 甲[0].route.wakeWord + '）');
  const 变异 = [
    ['第 0 字节前插一个换行', '\n' + html],
    ['摘掉 </html> 收尾', html.replace(/<\/html>\s*$/, '')],
    ['摘掉 charset', html.replace('<meta charset="utf-8">', '<meta>')],
    ['摘掉样式段', html.replace('<style>', '<style data-gone>').replace('</style>', '')],
    ['截断成半页', html.slice(0, Math.floor(html.length / 2))],
  ];
  for (const [name, broken] of 变异) {
    assert.equal(docOk(broken), false, '变异「' + name + '」之后仍判为完整文档——那条断言是永真的');
  }
  console.log('READING #279 ⑤ 变异 ' + 变异.length + ' 种：原样 true／逐种 false');
});

test('#279 ⑤ 变异：把回执的四块摘掉一块，② 那两条断言各自必红', () => {
  const 回执页 = 真写[0];
  const 断言式 = (h) => RECEIPT_BLOCKS.filter((b) => visibleOf(h).includes(b));
  assert.deepEqual(断言式(回执页.html), RECEIPT_BLOCKS, '原样回执本该四块齐全（' + 回执页.route.wakeWord + '）');
  for (const b of RECEIPT_BLOCKS) {
    const broken = 回执页.html.split(b).join('［摘掉］');
    assert.deepEqual(断言式(broken), RECEIPT_BLOCKS.filter((x) => x !== b),
      '把「' + b + '」摘掉之后那条断言仍判为齐——断言是永真的');
  }
  console.log('READING #279 ⑤ 回执块 ' + RECEIPT_BLOCKS.length + ' 条：原样齐／逐条摘掉各自缺一条');
});

/* ── 不落仓内件 ─────────────────────────────────────────────────────────── */

test('#279 读数不落仓内件：产物全在系统临时目录', () => {
  for (const r of 甲) {
    assert.ok(r.out.startsWith(SCRATCH), '产物落到仓内了：' + r.out + '（该落 ' + SCRATCH + '）');
  }
  assert.equal(existsSync(join(ROOT, 'calorie_html')), false, '仓根不该长 calorie_html');
});
