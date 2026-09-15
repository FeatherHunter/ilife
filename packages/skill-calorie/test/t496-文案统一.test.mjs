/** #496 · 场景 02 饮食「文案统一」（范围收窄后 12 条）的逐页探针（真出口 + 固定锚点日）。
 *
 * **本探针守什么**（每条对应票面一条判据，不是自设美观标准）：
 *  ① **复制区**（票面跨页第 1 条）：81 页的复制菜单点开是三个**中文**格式名（纯文本／JSON／CSV），
 *     机器面不动（`data-fmt` 键值与 `data-t` 载荷仍是 `text`／`json`／`csv`）；数据／日志两颗按钮在位，
 *     不出与按钮同名的标题。
 *  ② **状态卡说明按操作说**（票面跨页第 2 条）：删类页写「已从饮食记录中删除」、改类页写
 *     「已更新饮食记录」、只有新增类写「已写入饮食记录」——删／改 6 页的可见文本里不得再出现后者。
 *  ③ **十条页专属**（票面表 #3–#12）：逐页禁句归零 ＋ 新句在位（见 `PAGE_CASES` 的 `gone`／`want`）。
 *     第 12 条（`餐别分布 〈日期〉`）按编排者裁定**销号**：它现在是正常的图表标题，只断言那串丑括号
 *     （`窗口跟 MEAL_WINDOWS…`）不再出现，不要求标题消失。
 *  ④ **不新增机器话**：全部产物在剥掉复制载荷之后，四类机器话（全大写常量／snake_case／命令键／
 *     库表文件名）零命中（`t425-融合基准.md` 裁定 1）。
 *
 * **变异自证**：把产物里的中文标签换回 `text`（模拟「改坏了」）→ ① 必红；原样 → 必绿。
 *
 * 跑法：`node --test packages/skill-calorie/test/t496-文案统一.test.mjs`
 *（先 `npx tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;

/** 票面 #3–#12 的落点页（参数照场景 02 路由真值）：`gone` 必须归零，`want` 必须读得到。 */
const PAGE_CASES = [
  {
    id: '#3 补记饮食', wake: '补记饮食', key: 'calorie.diet.add',
    params: { foodName: '米饭', calories: 500, protein: 10, time: '12:30:00', date: D },
    gone: ['记一餐 · 回执'], want: ['补记饮食 · 回执', '已补记：'],
  },
  {
    id: '#3b 拍营养表补记一餐', wake: '拍营养表补记一餐', key: 'calorie.diet.add',
    params: { foodName: '米饭', calories: 500, protein: 10, date: D, time: '12:30:00', note: '营养表补记' },
    gone: ['记一餐 · 回执'], want: ['补记饮食 · 回执', '备注：营养表补记'],
  },
  {
    id: '#3c 记一餐（含备注）', wake: '记一餐（含备注）', key: 'calorie.diet.add',
    params: { foodName: '鸡胸', calories: 200, protein: 35, note: '加了辣酱' },
    gone: ['记一餐 · 回执'], want: ['记一餐（含备注） · 回执', '备注：加了辣酱'],
  },
  {
    id: '#4 批量补记饮食', wake: '批量补记饮食', key: 'calorie.diet.batch',
    params: { items: [{ foodName: '粥', calories: 150, protein: 3, date: D }] },
    gone: ['批量记饮食：新增', '跳过 0，失败 0'],
    want: ['已在库跳过', '同名同餐的记录不会重复添加', '分类失败'],
  },
  {
    id: '#5 看有备注的饮食记录', wake: '看有备注的饮食记录', key: 'calorie.today',
    params: { date: '今日', hasNote: true },
    // 先记一条带备注的（播种库里今天没有备注）——食物名取播种表今天没有的「三文鱼」，免得被写链的
    // 重复判定跳过（同名同日即算重复）；**日期必须显式给**，写链取的是真实当天、不认 `CALORIE_TODAY`。
    pre: [['calorie.diet.add', { foodName: '三文鱼', calories: 208, protein: 20, time: '13:45', date: D, note: '煎的，少油' }]],
    gone: [], want: ['只看有备注的', '备注', '煎的，少油', '三文鱼'],
  },
  {
    id: '#5b 看有备注的（当天没备注→空态页）', wake: '看有备注的饮食记录', key: 'calorie.today',
    params: { date: '今日', hasNote: true },
    emptyPage: true,
    gone: ['ERR 4'], want: ['今天没有带备注的记录', '只看有备注的'],
  },
  {
    id: '#6 校验批量导入', wake: '校验批量导入', key: 'calorie.view.batch-import-preview',
    params: { items: [{ foodName: '粥', calories: 150, protein: 3 }] },
    gone: ['缺库食物'], want: ['食品库里没有这些食物', '想收进库里就说「存食品 粥」'],
  },
  {
    id: '#7/#8 查营养配比', wake: '查营养配比', key: 'calorie.view.nutrition-ratio',
    params: { window: '7d' },
    gone: ['目标 —g', '总热量 1,916 蛋白', '· 目标 '],
    want: ['折算合计（千卡）', '每克 4 千卡', '每克 9 千卡'],
    // 目标设没设由库决定：这一条只守「占比 ＋ 目标」这半句的写法（没设明说没设，不许印「—g」）。
    wantRe: [/占 \d+% · (未设定每天目标|每天目标 [\d.]+ 克)/],
  },
  {
    id: '#9/#10 看营养分析', wake: '看营养分析', key: 'calorie.view.nutrition-analysis',
    params: { window: '7d' },
    gone: ['宏量占比＝', '891 蛋白', '微量＝日均 vs 每日推荐'],
    want: ['折算合计（千卡）', '每克 4 千卡', '不是同一个数'],
  },
  {
    id: '#11 看每日六因素', wake: '看每日六因素', key: 'calorie.view.six-factors',
    params: { date: '今日' },
    gone: ['热量/蛋白/饮水/运动/称重/三餐（无目标项明示'],
    want: ['六因素＝这 6 项：热量、蛋白、饮水、运动、称重、三餐'],
  },
  {
    id: '#12 看昨日饮食', wake: '看昨日饮食', key: 'calorie.view.diet',
    params: { window: '昨日' },
    // 销号项：只守那串丑括号（常量名 + 「窗口跟」）不再上屏；图表标题「餐别分布 〈日期〉」本身是对的。
    gone: ['MEAL_WINDOWS', '窗口跟', '加餐=下午茶+夜宵'],
    want: ['餐别分布', '加餐时段：下午茶、夜宵'],
  },
];

/** 跨页第 2 条：删类 4 页 + 改类 2 页（写库页，各起一份新库）。 */
const STATUS_CASES = [
  { id: '删饮食记录', key: 'calorie.diet.remove', params: { id: 1 }, want: '已从饮食记录中删除', op: 'delete' },
  { id: '删一餐', key: 'calorie.diet.remove-by-type', params: { mealType: '早餐', date: D }, want: '已从饮食记录中删除', op: 'delete' },
  { id: '删某日饮食', key: 'calorie.diet.remove-by-date', params: { date: D }, want: '已从饮食记录中删除', op: 'delete' },
  { id: '批量删饮食', key: 'calorie.diet.remove-by-range', params: { start: D, end: D }, want: '已从饮食记录中删除', op: 'delete' },
  { id: '改饮食记录', key: 'calorie.diet.update', params: { id: 1, grams: 150 }, want: '已更新饮食记录', op: 'update' },
  { id: '改某日饮食', key: 'calorie.diet.update-by-date', params: { note: '食堂', date: D }, want: '已更新饮食记录', op: 'update' },
  { id: '记一餐', key: 'calorie.diet.add', params: { foodName: '鸡胸', calories: 200, protein: 35 }, want: '已写入饮食记录', op: 'create' },
  { id: '记喝水', key: 'calorie.water.log', params: { ml: 300 }, want: '已写入饮水记录', op: 'create' },
];

/** 三格式菜单的**可见**标签（中文），与机器面 `data-fmt` 键值分开读。 */
function menuLabels(html) {
  return [...html.matchAll(
    /<button[^>]*ilife-copy-menu-item[^>]*data-fmt="([^"]+)"[^>]*>\s*<span class="[^"]*ilife-copy-menu-label[^"]*">([^<]*)<\/span>/g,
  )].map((m) => ({ key: m[1], label: m[2] }));
}

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't496-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: D },
  });
  assert.equal(r.status, 0, key + ' 真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  return readFileSync(out, 'utf8');
}

/** 逐页读数：可见文本 ＋ 复制区读数。
 *
 *  机器话探针前先剥掉**复制菜单的可见标签**：`JSON`／`CSV` 是作者裁定写死的中文格式名里的通用缩写
 *  （不是内部标识符），而 `visible-text-probe.mjs` 的 A1 规则（全大写常量）会把 `JSON` 当机器话报。
 *  同一处先例是它的 `stripCopyPayload`——复制区那一段是**有意**承载格式名与技术原文的地方。 */
function readings(c) {
  const dir = freshDb();
  for (const [k, p] of c.pre ?? []) render(dir, k, p);
  const html = render(dir, c.key, c.params);
  const body = stripCopyPayload(html).replace(
    /<span class="[^"]*ilife-copy-menu-label[^"]*">[^<]*<\/span>/g, '<span>［格式名］</span>');
  const text = visibleText(body);
  return {
    html, text,
    labels: menuLabels(html),
    nDataMenu: (html.match(/data-fmt-open="1"/g) ?? []).length,
    logButtons: [...html.matchAll(/<button[^>]*data-action-id="ilife-copy-log"[^>]*>/g)].map((m) => m[0]),
    sameTitle: /<h2[^>]*>\s*复制(数据|日志)\s*<\/h2>/.test(html),
    machine: machineWords(body).filter((w) => w.hit !== null).map((w) => w.kind + '＝「' + w.hit + '」'),
  };
}

const READ_RUNS = PAGE_CASES.map((c) => ({ c, r: readings(c) }));
const WRITE_RUNS = STATUS_CASES.map((c) => ({ c, r: readings(c) }));

for (const { c, r } of [...READ_RUNS, ...WRITE_RUNS]) {
  test('#496 ① 复制区逐页：中文菜单 ≫ 双按钮 ≫ 无同名标题 —— ' + c.id + '（' + c.key + '）', () => {
    console.log('READING #496 复制区 ' + c.id + ' 标签=' + JSON.stringify(r.labels.map((x) => x.label))
      + ' 菜单×' + r.nDataMenu + ' 日志按钮×' + r.logButtons.length);
    if (c.emptyPage === true) {
      // 空态页按裁定 5 不出按钮（点了没反应的死按钮就是问题）：这一支只守空态句。
      assert.equal(r.nDataMenu, 0, c.id + ' 空态页不该出复制菜单');
      assert.equal(r.logButtons.length, 0, c.id + ' 空态页不该出复制日志按钮');
      return;
    }
    assert.deepEqual(r.labels, [
      { key: 'text', label: '纯文本' }, { key: 'json', label: 'JSON' }, { key: 'csv', label: 'CSV' },
    ], c.id + ' 复制菜单的可见标签不是三个中文格式名（机器面 data-fmt 键值仍须是 text/json/csv）');
    assert.ok(r.nDataMenu >= 1, c.id + ' 复制区没有「复制数据」三格式菜单开合器');
    assert.equal(r.sameTitle, false, c.id + ' 出了与复制按钮同名的标题');
    assert.ok(r.logButtons.length >= 1, c.id + ' 复制区没有「复制日志」按钮（写页必须有）');
  });
}

for (const { c, r } of READ_RUNS) {
  test('#496 ③ 十条页专属 —— ' + c.id + '（' + c.key + '）', () => {
    for (const g of c.gone) {
      assert.equal(r.text.includes(g), false, c.id + ' 可见文本里仍有旧句：「' + g + '」');
    }
    for (const w of c.want) {
      assert.equal(r.text.includes(w), true, c.id + ' 读不到新句：「' + w + '」');
    }
    for (const re of c.wantRe ?? []) {
      assert.equal(re.test(r.text), true, c.id + ' 读不到该形状的新句：' + String(re));
    }
    assert.deepEqual(r.machine, [], c.id + ' 可见文本里还有机器话：' + r.machine.join('　'));
  });
}

for (const { c, r } of WRITE_RUNS) {
  test('#496 ② 状态卡说明按操作走 —— ' + c.id + '（' + c.key + '）', () => {
    console.log('READING #496 状态 ' + c.id + ' op=' + c.op + ' 可见「' + c.want + '」='
      + r.text.includes(c.want) + ' 可见「已写入饮食记录」=' + r.text.includes('已写入饮食记录'));
    assert.equal(r.text.includes(c.want), true, c.id + ' 状态卡的说明读不到「' + c.want + '」');
    if (c.op !== 'create') {
      assert.equal(r.text.includes('已写入饮食记录'), false,
        c.id + '（' + c.op + ' 类）不该再说「已写入饮食记录」——删类说删了、改类说改了');
    }
    assert.deepEqual(r.machine, [], c.id + ' 可见文本里还有机器话：' + r.machine.join('　'));
  });
}

test('#496 ⑥ 变异自证：把中文标签换回 text → ① 必红；原样 → 必绿', () => {
  const html = READ_RUNS[0].r.html;
  const clean = menuLabels(html);
  assert.deepEqual(clean.map((x) => x.label), ['纯文本', 'JSON', 'CSV'], '原样产物该读到三个中文标签');
  // 只把「纯文本」这一处换回 text（模拟改动被改坏 / 回退），同一段断言必须红。
  const dirty = menuLabels(html.replace('>纯文本</span>', '>text</span>'));
  assert.equal(dirty[0].label, 'text', '把标签换回 text 之后读数没变——① 的断言是永真的');
  assert.notDeepEqual(dirty.map((x) => x.label), clean.map((x) => x.label),
    '改坏之后标签读数必须与原来不同（否则断言抓不住回归）');
});
