/** #511 · 场景 02 饮食「文本清尾二」的逐页探针（真出口 ＋ 场景 02 路由真值参数）。
 *
 * **本探针守什么**（每条对应票面一条判据）：
 *  ① **面外 8 处残留按审查件的改法收掉**：38 的单位（`0g`／`540mg` → 克／毫克）、77 的
 *     「10%（48g）」（克数标出「几天合计」）、41 的三个榜名统一成「常吃榜」、60 的 `周末/工作日`／`0/708`
 *     拆成两张带单位的卡、75 的空品牌破折号不再印、82 的副标题改「这页有什么」、83 的热量单位与
 *     「没设目标」那句话。
 *  ② **同源入口页按唤醒词出对应标题**：38／78（看营养素深度／看营养素明细）与 24／80
 *     （看今日喝水／看今日饮水）四个入口都留，各自页头对上进来的那条词，且**两两不再逐字节相同**
 *     ——这正是审查件第 80／81 条点的「逐行相同」，作者裁定一。
 *  ③ **`entry` 标记的三条硬要求**（照 #509 裁定 4 的三条）：未知参数不报错；标记名绝不上屏；
 *     复制日志里的**命令原文**必须带全它（照抄可重跑）。
 *  ④ **变异自证**：把新句改回旧写法（`≥25 克/天`→`≥25g/天`、`常吃榜`→`常吃`、`营养素明细`→`营养素深度`），
 *     同一段断言必须红；原样必绿。
 *
 * 跑法：`node --test packages/skill-calorie/test/t511-清尾二.test.mjs`（先 `npx tsc -b packages/skill-calorie`）。
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
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;

/** 本票逐页真改（参数照 `src/diet/routes.ts` 的真值；`gone`＝旧写法必须消失，`want`＝读者的话必须在位）。 */
const PAGE_CASES = [
  {
    id: '38 看营养素深度（单位）',
    key: 'calorie.view.nutrition-detail',
    params: { window: '7d' },
    gone: ['≥25g/天', '≤2000mg/天', '≤50g/天'],
    want: ['≥25 克/天', '≤2000 毫克/天', '≤50 克/天', '累计（7 天）', '每天平均', '每天推荐', '完成度'],
    /* 审查件第 53 条点的那一列：每格原来是「数字＋g／mg」（`0g`／`540mg`／`77.1mg/天`）⇒ 一格都不许再是那个形状。 */
    noLine: /^\d+(\.\d+)?(g|mg)(\/天)?$/,
  },
  {
    id: '77 查营养配比（克数合计口径）',
    key: 'calorie.view.nutrition-ratio',
    params: { window: '7d' },
    gone: ['g）', '宏量营养素 ⚠ 失衡'],
    want: ['克数均为这', '天合计'],
    noLine: /%（\d+g）/,
  },
  {
    id: '82 看营养分析（副标题）',
    key: 'calorie.view.nutrition-analysis',
    params: { window: '7d' },
    gone: ['配比＋微量＋规则建议', '建议阈值见数据层注释', '不编造结论'],
    want: ['三大营养素比例、其他营养素摄入、以及根据这些数据给出的建议'],
  },
  {
    id: '41 看频繁吃榜（三个名字统一）',
    key: 'calorie.view.ranking',
    params: { category: 'frequent', topN: 10, window: '7d' },
    gone: ['📅 频繁吃榜', '排行 常吃 '],
    want: ['排行 常吃榜', '📅 常吃榜', '常吃榜'],
  },
  {
    id: '60 饮食复盘（本周）（周末/工作日拆卡）',
    key: 'calorie.view.diet-review',
    params: { window: '本周' },
    gone: ['周末/工作日', '均值（卡）'],
    want: ['工作日平均', '周末平均'],
  },
  {
    id: '75 搜食品（空品牌不再印破折号）',
    key: 'calorie.view.search',
    params: { keyword: '鸡胸' },
    gone: [],
    want: ['鸡胸肉', '热量', '蛋白'],
  },
];

const RENDERED = PAGE_CASES.map((c) => {
  const dir = freshDb();
  const r = render(dir, c.key, c.params);
  return { c, dir, ...r, text: visibleText(stripCopyPayload(r.html)) };
});

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't511-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  /* 六因素那一页要看「没设目标」那一支（审查件第 87 条），种子里有目标就先清掉。 */
  db.exec('DELETE FROM daily_goal');
  db.close();
  return dir;
}

function render(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: D },
  });
  return { status: r.status, stderr: String(r.stderr), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r.html;
}

/** 可见文本里的行（剥掉复制载荷）。 */
const linesOf = (html) => visibleText(stripCopyPayload(html)).split('\n').map((l) => l.trim()).filter(Boolean);

/** 页头 H1：跳掉页头族名那两行（「卡路里·饮食」／「卡路里 · 饮食」）。 */
const h1Of = (html) => linesOf(html).find((l) => !/^卡路里\s*[·・]/.test(l)) ?? '';

for (const { c, status, stderr, html, text } of RENDERED) {
  test('#511 ① 面外残留逐页收掉 —— ' + c.id, () => {
    assert.equal(status, 0, c.id + ' 真出口 exit=' + status + ' stderr=' + String(stderr).slice(-300));
    for (const g of c.gone) assert.equal(text.includes(g), false, c.id + ' 还能读到旧写法：「' + g + '」');
    for (const w of c.want) assert.equal(text.includes(w), true, c.id + ' 读不到读者的话：「' + w + '」');
    if (c.noLine) {
      const bad = linesOf(html).filter((l) => c.noLine.test(l));
      assert.deepEqual(bad, [], c.id + ' 还有旧形状的单元格：' + bad.join('　'));
    }
  });
}

test('#511 ① 41 页：「常吃」只作为「常吃榜」的一部分出现（不得单独成词）', () => {
  const r = RENDERED.find((x) => x.c.id.startsWith('41'));
  const bare = [...r.text.matchAll(/常吃/g)].filter((m) => r.text.slice(m.index + 2, m.index + 3) !== '榜');
  assert.deepEqual(bare.map((m) => r.text.slice(m.index - 8, m.index + 8)), [], '41 页还有没带「榜」的「常吃」');
  assert.ok([...r.text.matchAll(/常吃榜/g)].length >= 3, '41 页「常吃榜」不足三处（榜名／页题／表题）');
});

test('#511 ① 83 页：热量带单位 ＋ 没设目标那句说清去哪设', () => {
  const dir = freshDb();
  const html = renderOk(dir, 'calorie.view.six-factors', { date: D }, '83');
  const text = visibleText(stripCopyPayload(html));
  for (const w of ['热量（千卡）达标', '没有设热量目标，所以判不了达标。要设请说“定营养目标”',
    '没有设蛋白目标，所以判不了达标', '没有设饮水目标，所以判不了达标。要设请说“定饮水目标”',
    '六因素＝这 6 项：热量、蛋白、饮水、运动、称重、三餐（热量按千卡计）']) {
    assert.equal(text.includes(w), true, '83 页读不到：「' + w + '」');
  }
  for (const g of ['无热量目标（先设目标）', '无蛋白目标（先设目标）', '无饮水目标（先设目标）', '热量达标']) {
    assert.equal(text.includes(g), false, '83 页还能读到旧写法：「' + g + '」');
  }
  /* 项名（读数卡标签／明细表「因素」列）不许把「热量」单独写出来不给单位。 */
  const lines = text.split('\n').map((l) => l.trim());
  const bareLabel = lines.filter((l) => l === '热量' || l === '热量达标');
  assert.deepEqual(bareLabel, [], '83 页还有不带单位的项名「热量」');
});

/* ── 同源入口页（一条命令两个入口）：四个入口都留，各自页头对上进来的那条词 ── */

const HOMOLOG_CASES = [
  { pair: '营养素深度／明细', key: 'calorie.view.nutrition-detail', base: { window: '7d' }, token: 'entry', value: 'detail', a: '营养素深度', b: '营养素明细' },
  { pair: '今日饮水／喝水', key: 'calorie.view.today-water', base: { date: D }, token: 'entry', value: 'drink', a: '今日饮水', b: '今日喝水' },
];

const HOMOLOG_RUNS = HOMOLOG_CASES.map((c) => {
  const dir = freshDb();
  const first = renderOk(dir, c.key, c.base, c.pair + ' 默认入口');
  const second = renderOk(dir, c.key, { ...c.base, [c.token]: c.value }, c.pair + ' 带标记入口');
  return {
    c,
    first: { html: first, title: h1Of(first), text: visibleText(stripCopyPayload(first)) },
    second: { html: second, title: h1Of(second), text: visibleText(stripCopyPayload(second)) },
  };
});

for (const { c, first, second } of HOMOLOG_RUNS) {
  test('#511 ② 同源入口页各自标题对上唤醒词 ＋ 两页不再逐字节相同 —— ' + c.pair, () => {
    console.log('READING #511 ' + c.pair + ' 默认入口标题「' + first.title + '」／带标记入口标题「' + second.title + '」');
    assert.ok(first.title.includes(c.a), c.pair + ' 默认入口标题看不出「' + c.a + '」：' + first.title);
    assert.ok(second.title.includes(c.b), c.pair + ' 带标记入口标题看不出「' + c.b + '」：' + second.title);
    assert.notEqual(first.title, second.title, c.pair + ' 两个入口出了同一个标题');
    assert.notEqual(first.html, second.html, c.pair + ' 两个入口的产物逐字节相同——同源入口页没分家');
    /* 「正文也要各自有对应差异」：两页的可见文本除了标题那一行之外也必须不同。 */
    const strip = (t) => t.split('\n').filter((l) => !l.includes(c.a) && !l.includes(c.b)).join('\n');
    assert.notEqual(strip(first.text), strip(second.text), c.pair + ' 两页只有标题不同，正文一模一样');
  });
}

test('#511 ③ entry 标记的三条硬要求：不报错、不上屏、命令原文带全', () => {
  const { c, first, second } = HOMOLOG_RUNS[0];
  for (const r of [first, second]) {
    assert.equal(r.text.includes(c.token), false, '可见文本里出现了标记名「' + c.token + '」（它只该落在复制载荷里）');
  }
  /* 命令原文带全（照抄可重跑）：标记由**入口那条路由记录**带进来，读侧命令自己收不到唤醒词。
     路由声明在 `src/triggers/routes.generated.ts`（生成物，`pnpm gen:check` 守同步）——从那里取
     命令原文、照抄跑一遍，页头必须正好落在带标记那一支（这一条同时证了「入口 → 页头」这条链真的通）。 */
  const GEN = readFileSync(join(ROOT, 'packages', 'skill-calorie', 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  const ROUTES = [
    { wake: '看今日喝水', key: 'calorie.view.today-water', token: 'entry', value: 'drink', want: '今日喝水' },
    { wake: '看营养素明细', key: 'calorie.view.nutrition-detail', token: 'entry', value: 'detail', want: '营养素明细' },
  ];
  for (const rt of ROUTES) {
    const line = GEN.split('\n').find((l) => l.includes("wakeWord: '" + rt.wake + "'"));
    assert.ok(line, 'routes.generated.ts 里找不到唤醒词「' + rt.wake + '」的记录');
    /* 生成物里这条 cli 写成单引号串（里面的 params 用 `\'` 转义）⇒ 取到最后一个单引号、再把转义还原。 */
    const cli = line.slice(line.indexOf("cli: '") + 6, line.lastIndexOf("'")).replace(/\\'/g, "'");
    assert.ok(cli.includes(rt.key), rt.wake + ' 的命令原文没指向 ' + rt.key + '：' + cli);
    assert.ok(cli.includes('"' + rt.token + '":"' + rt.value + '"'),
      rt.wake + ' 的命令原文没带全标记（照抄跑不出同一页）：' + cli);
    if (rt.key === c.key) assert.notEqual(first.title, second.title, '两条记录跑出了同一个页头');
    /* 照抄执行：从命令原文里取出 key 与 params，直接跑真出口。 */
    const m = /^calorie-cmd-read (\S+)(?: --params '(\{.*\})')?$/.exec(cli);
    assert.ok(m, rt.wake + ' 的命令原文不是可照抄的形状：' + cli);
    const dir = freshDb();
    const html = renderOk(dir, m[1], m[2] ? JSON.parse(m[2]) : {}, rt.wake);
    assert.ok(h1Of(html).includes(rt.want), rt.wake + ' 照抄命令原文跑出来的页头不是「' + rt.want + '」：' + h1Of(html));
  }
  /* 未知参数不报错：另给一个命令不认识的参数，仍须 exit 0。 */
  const dir = freshDb();
  const r = render(dir, c.key, { ...c.base, 未知参数: '随便' });
  assert.equal(r.status, 0, '命令收到未知参数报错了（应能忽略）：exit=' + r.status + ' ' + r.stderr.slice(-200));
  /* 未知**取值**也不报错：标记只认登记的那一个，别的取值回落默认那一支。 */
  const other = render(dir, c.key, { ...c.base, [c.token]: '不认识' });
  assert.equal(other.status, 0, '标记取了不认识的值得报错：exit=' + other.status + ' ' + other.stderr.slice(-200));
  assert.equal(h1Of(other.html), first.title, '标记取不认识的值得回落默认那一支');
});

test('#511 ④ 变异自证：新句改回旧写法 / 标题改回旧写法，同一段断言必红', () => {
  const d38 = RENDERED.find((x) => x.c.id.startsWith('38'));
  const badUnit = visibleText(stripCopyPayload(d38.html.replace(/≥25 克\/天/g, '≥25g/天')));
  assert.equal(d38.text.includes('≥25 克/天'), true, '原样产物该读到新单位写法');
  assert.notEqual(badUnit, d38.text, '把单位改回旧写法之后读数没变——① 的断言是永真的');
  assert.equal(badUnit.includes('≥25g/天'), true, '改坏之后应能读到旧单位写法');

  const d41 = RENDERED.find((x) => x.c.id.startsWith('41'));
  const badName = visibleText(stripCopyPayload(d41.html.replace(/常吃榜/g, '常吃')));
  assert.equal(d41.text.includes('长吃榜') || d41.text.includes('常吃榜'), true, '原样产物该读到新榜名');
  assert.notEqual(badName, d41.text, '把榜名改回旧写法之后读数没变——① 的断言是永真的');
  assert.equal([...badName.matchAll(/常吃/g)].some((m) => badName.slice(m.index + 2, m.index + 3) !== '榜'), true,
    '改坏之后应能读到没带「榜」的「常吃」');

  const h = HOMOLOG_RUNS[0];
  const badTitle = h1Of(h.second.html.replace('🧪 营养素明细', '🧪 营养素深度'));
  assert.equal(h.second.title.includes('营养素明细'), true, '原样产物该读到带标记入口的标题');
  assert.equal(badTitle.includes('营养素明细'), false, '把标题改回旧写法之后读数没变——② 的断言是永真的');
});
