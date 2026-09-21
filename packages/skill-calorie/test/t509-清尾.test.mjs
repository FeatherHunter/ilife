/** #509 · 场景 02 饮食「文本清尾」的逐页探针（真出口 ＋ 场景 02 路由真值参数）。
 *
 * **本探针守什么**（每条对应票面一条判据）：
 *  ① **33／81 两页（校验批量导入／看批量导入预览）的内部词归零**：`精确名匹配`／`导入后建议补录`／
 *     `热量卡`／`库热量`／`✗ 缺库` 必须消失，「匹配」「—」不得再单独成行当表头／占位符；
 *     同时**新句在位**（读者的话），并且「未匹配」只准留在明细表的「是否已匹配」那一列，
 *     不许再当读数卡的卡标签（票面改法点名要写「未匹配」）。
 *  ② **同形页按唤醒词出对应标题**：01／02／03／05／06 五页各自的标题与其唤醒词对得上，
 *     且（把时间戳抹平之后）**两两不再逐字节相同**——这正是审查件第 21／27 条点的「三页逐字节相同」。
 *     页题逐字＝当刻实现的 `receipt.scene + '回执'`（**#581 去分隔符后不再以 ` · 回执` 收尾**），取法见 `titleOf`。
 *     05／06 的另一处差异＝副题的「来源：营养表照片」（编排者裁定 3：两条拍营养表的词一起做）。
 *  ③ **`source` 参数的三条硬要求**（编排者裁定 4）：未知参数不报错；参数名绝不上屏；
 *     复制日志里的**命令原文**必须带全它（照抄可重跑）。
 *  ④ **不新增机器话**：产物剥掉复制载荷后，四类机器话零命中（`t425-融合基准.md` 裁定 1）。
 *
 * **变异自证**：把新句改回旧写法（`食品库中无此食物`→`—`）、把标题改回旧写法（`拍照记一餐`→
 * `记一餐（含备注）`），同一段断言必须红；原样必绿。
 *
 * 跑法：`node --test packages/skill-calorie/test/t509-清尾.test.mjs`（先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;

/** 33／81 两页：同一条命令、两条路由（参数照 `src/diet/routes.ts` 的真值）。 */
const PREVIEW_CASES = [
  { id: '33 校验批量导入', params: { items: [{ foodName: '粥', calories: 150, protein: 3 }] } },
  { id: '81 看批量导入预览', params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: D }] } },
];

/** 票面第 46／47 条的旧内部词（必须归零）与改后的读者话（必须在位）。 */
const PREVIEW_GONE = ['精确名匹配', '导入后建议补录', '热量卡', '库热量', '✗ 缺库', '库匹配', 'diet.batch'];
const PREVIEW_WANT = [
  '食品库里有同名的', '可以直接导入',
  '食品库里没有的', '建议先「存食品」再导入',
  '这一条的热量（卡）', '食品库里的热量（卡）', '是否已匹配',
  '食品库中无此食物', '未匹配',
  '食品库对照＋合计试算',
  '食品库里没有这些食物', '想收进库里就说「存食品 粥」',
];

/** 五页回执：标题要与各自唤醒词对得上（票面判据 1 ＋ 编排者裁定 3）。
 *  `title` 逐字等于当刻实现「`receipt.scene + '回执'`」（#581 去分隔符后不再有 ` · `）。 */
const RECEIPT_CASES = [
  { page: '01', wake: '记一餐', params: { foodName: '鸡胸', calories: 200, protein: 35 }, title: '记一餐回执', must: (t) => t.includes('记一餐') },
  { page: '02', wake: '记一餐（含备注）', params: { foodName: '鸡胸', calories: 200, protein: 35, note: '加了辣酱' }, title: '记一餐（含备注）回执', must: (t) => t.includes('备注') },
  { page: '03', wake: '补记饮食', params: { foodName: '米饭', calories: 500, protein: 10, time: '12:30:00', date: D }, title: '补记饮食回执', must: (t) => t.includes('补记') },
  { page: '05', wake: '拍营养表记一餐', params: { foodName: '鸡胸', calories: 200, protein: 35, note: '营养表识别', source: 'photo' }, title: '拍照记一餐回执', must: (t) => t.includes('拍照') },
  { page: '06', wake: '拍营养表补记一餐', params: { foodName: '米饭', calories: 500, protein: 10, date: D, time: '12:30:00', note: '营养表补记', source: 'photo' }, title: '拍照补记一餐回执', must: (t) => t.includes('拍照') },
];

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't509-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(D) },
  });
  return { status: r.status, stderr: String(r.stderr), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r.html;
}

/** 读数：可见文本（剥掉复制载荷）＋ 单独成行的旧标签 ＋ 机器话。
 *
 *  机器话探针前先剥掉**复制菜单的可见标签**：`JSON`／`CSV` 是作者裁定写死的中文格式名里的通用缩写
 *  （不是内部标识符），而 `visible-text-probe.mjs` 的 A1 规则（全大写常量）会把它当机器话报
 *  ——同 #496 的处理（那一处是复制区**有意**承载格式名的地方）。 */
function readings(html) {
  const body = stripCopyPayload(html).replace(
    /<span class="[^"]*ilife-copy-menu-label[^"]*">[^<]*<\/span>/g, '<span>［格式名］</span>');
  const text = visibleText(body);
  return {
    html,
    text,
    lines: text.split('\n').map((l) => l.trim()),
    kpiRegion: text.slice(0, text.includes('逐条预览') ? text.indexOf('逐条预览') : text.length),
    machine: machineWords(body).filter((w) => w.hit !== null).map((w) => w.kind + '＝「' + w.hit + '」'),
  };
}

/** 页面的内容标题：取页框的 `<h1>` 那一格（`assembleDocPage({ title })` 的落点，
 *  `src/shared/docPage.ts` → `packages/base-render/src/blocks.ts` 的 `pageShell`），不按行号猜。
 *
 *  **#581 收尾跟改**：`#581` 去分隔符把页题从「`scene · 回执`」改成 `receipt.scene + '回执'`
 *  （`src/diet/receipt.ts:388` 的 `title:` 一位，`scene` 与 `回执` 之间**不再有 `· `**）⇒ 旧口径
 *  「以 `· 回执` 收尾」在当刻产物里一条都扫不到，取回空串，②／④ 两条成了必红。
 *  也不能退化成「哪行以 `回执` 收尾就取哪行」：本页的区块标题与页内导航项都叫 `✅ 操作回执`
 *  （各一次，恒两条命中），先命中的那条不是页题。故只认 `<h1>` 这一格。 */
function titleOf(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  return m === null ? '' : visibleText(m[1]).trim();
}

/* 时间戳抹平：回执页天生带写库时刻，比较「逐字节相同」前先把它抹掉（否则比较永假）。 */
const scrub = (s) => s.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '［时刻］');

const PREVIEW_RUNS = PREVIEW_CASES.map((c) => ({ c, r: readings(renderOk(freshDb(), 'calorie.view.batch-import-preview', c.params, c.id)) }));
const RECEIPT_RUNS = RECEIPT_CASES.map((c) => ({ c, r: readings(renderOk(freshDb(), 'calorie.diet.add', c.params, c.page)) }));

for (const { c, r } of PREVIEW_RUNS) {
  test('#509 ① 33／81 内部词归零 ＋ 读者话在位 —— ' + c.id, () => {
    for (const g of PREVIEW_GONE) {
      assert.equal(r.text.includes(g), false, c.id + ' 可见文本里仍有内部词：「' + g + '」');
    }
    for (const w of PREVIEW_WANT) {
      assert.equal(r.text.includes(w), true, c.id + ' 读不到读者话：「' + w + '」');
    }
    assert.equal(r.lines.includes('匹配'), false, c.id + ' 还有单独成行的「匹配」当表头');
    assert.equal(r.lines.includes('—'), false, c.id + ' 还有单独成行的「—」当缺值占位（该格应写「食品库中无此食物」）');
    assert.equal(r.kpiRegion.includes('未匹配'), false, c.id + ' 读数卡上还有「未匹配」这个卡标签（票面要求它只留在明细表那一列）');
    assert.deepEqual(r.machine, [], c.id + ' 可见文本里还有机器话：' + r.machine.join('　'));
  });
}

test('#509 ② 五页回执标题按唤醒词对上 ＋ 两两不再逐字节相同', () => {
  for (const { c, r } of RECEIPT_RUNS) {
    const first = titleOf(r.html);
    console.log('READING #509 标题 ' + c.page + ' 唤醒词「' + c.wake + '」→ 标题「' + first + '」');
    assert.equal(first, c.title, c.page + ' 的标题与唤醒词对不上');
    assert.equal(c.must(first), true, c.page + ' 的标题看不出「' + c.wake + '」');
  }
  const seen = new Map();
  for (const { c, r } of RECEIPT_RUNS) {
    const key = scrub(r.html);
    for (const [other, v] of seen) {
      assert.notEqual(key, v, c.page + ' 与 ' + other + ' 的产物（抹平时间戳后）逐字节相同——同形页没分家');
    }
    seen.set(c.page, key);
  }
});

test('#509 ③ 来源标记的三条硬要求：不报错、不上屏、命令原文带全', () => {
  const dir = freshDb();
  const photo = RECEIPT_RUNS.find((x) => x.c.page === '05');
  assert.equal(photo.r.text.includes('来源：营养表照片'), true, '05 的副题读不到「来源：营养表照片」');
  assert.equal(photo.r.text.includes('source'), false, '05 的可见文本里出现了参数名「source」（它只该落在复制载荷里）');
  /* 命令原文（复制日志那一段）必须把这条参数写全——照抄可重跑。它落在复制载荷里：
     「有意承载可照抄技术原文的那几段」（`visible-text-probe.mjs` 件头第二行），可见文本里读不到。 */
  assert.equal(photo.r.html.includes('calorie-cmd-read calorie.diet.add'), true, '05 的产物里没有复制日志的命令原文');
  assert.equal(/source&quot;:&quot;photo/.test(photo.r.html), true, '命令原文没带全 --params（照抄跑不出同一页）');
  // 未知参数不报错：另给一个命令不认识的参数，仍须 exit 0。
  const r = render(dir, 'calorie.diet.add', { foodName: '酸奶', calories: 120, protein: 6, note: '加餐', 未知参数: '随便' });
  assert.equal(r.status, 0, '命令收到未知参数报错了（应能忽略）：exit=' + r.status + ' ' + r.stderr.slice(-200));
});

test('#509 ④ 变异自证：新句改回旧写法 / 标题改回旧写法，同一段断言必红', () => {
  const preview = PREVIEW_RUNS[0].r;
  const receipt = RECEIPT_RUNS.find((x) => x.c.page === '05').r;

  const badPreview = readings(preview.html.replace(/食品库中无此食物/g, '—'));
  assert.notEqual(badPreview.text, preview.text, '把新句改回「—」之后读数没变——① 的断言是永真的');
  assert.equal(badPreview.lines.includes('—'), true, '改坏之后应能读到单独成行的「—」');

  const badReceipt = readings(receipt.html.replace('拍照记一餐', '记一餐（含备注）'));
  const badFirst = titleOf(badReceipt.html);
  const goodFirst = titleOf(receipt.html);
  assert.equal(goodFirst, '拍照记一餐回执', '原样产物该读到新标题');
  assert.notEqual(badFirst, goodFirst, '把标题改回旧写法之后读数没变——② 的断言是永真的');
});
