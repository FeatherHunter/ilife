/** #86 wizard 4 页复刻 D1：静态 HTML＋copyText（3 配置＋1 GIF 框选器）。
 * 范围（t71 §2 #4/#6/#11/#9；#52 明确不做、#54 新版已有不碰）：
 * calorie.view.measure-wizard／view.composition-wizard／
 * view.photo-log-wizard／view.gif-planner。
 * 不碰：47 页已有／18 项移植（#108–#113 已关）／client 控件（B7 边界：表单零 JS，
 * formPrompt／selectList／smartSelect 一律不用；复制走 Base P0 双通道）。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/wizard-86.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { PHOTO_COMMANDS } from '../dist/photo/commands.js';
import { routesFor } from '../dist/triggers/routing.js';
import { MEASUREMENT_FIELDS, CALIPER_FIELDS } from '../dist/fetch/body.js';
import { WIZARD_MEASURE_CAMEL } from '../dist/render/wizardPort.js';

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function seedWizard(db) {
  db.prepare("INSERT INTO body_measurements (date, chest_cm, waist_cm, hip_cm, note) VALUES ('2026-09-06', 95, 80, 96, ''), ('2026-09-07', 94.5, 79.5, 95.5, '')").run();
  db.prepare("INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm, note) VALUES ('2026-09-06', 'home_caliper', 19.5, 10, 12, 14, 11, 13, 12, 10, '')").run();
  db.prepare("INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES ('2026-09-05', '08:00:00', 'w86_a.jpg', '正面', ''), ('2026-09-07', '08:00:00', 'w86_b.jpg', '正面', '')").run();
}

function mkWizardDb() {
  const dir = mkdtempSync(join(tmpdir(), 't86-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedWizard(db);
  return { dir, db };
}

function run(bin, key, params, envExtra, output) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  if (output) a.push('--html', output);
  return spawnSync(NODE_BIN, [bin, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function assertDoc(h, what) {
  assert.ok(h.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(!h.includes('<!--'), what + ' 有残留标记');
  assert.ok(h.includes('ilife-page'), what + ' 缺 page');
  assert.ok(h.includes('<style>'), what + ' 缺 style');
  assert.ok(h.includes('<script>'), what + ' 缺 helpers');
}

const WIZ_KEYS = [
  'calorie.view.measure-wizard',
  'calorie.view.composition-wizard',
  'calorie.view.photo-log-wizard',
  'calorie.view.gif-planner',
];

test('#86 域内唤醒词命中：2 条真词→wizard 命令；2 个照片流程内页无代表唤醒词', () => {
  // #159 词表订正：身材照片那两个页面是老技能场景 09 的**流程内页**，老技能没有给它们唤醒词
  // （场景 09 只有 8 个词，对账读数见 `docs/skills/skill-calorie/t450-词表订正.md`），
  // 故不再把「看身材照向导」「看GIF规划器」当入口词断言；身体细节两个真词照旧。
  const pairs = [
    ['看围度向导', 'calorie.view.measure-wizard'],
    ['看体脂向导', 'calorie.view.composition-wizard'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
    assert.equal(CALORIE_COMBOS[key].shape, 'stat', 'wizard 键须为 stat 形：' + key);
  }
  // 两个照片流程内页：命令仍登记（stat 形），但声明里已无代表唤醒词（改回即红）。
  for (const key of ['calorie.view.photo-log-wizard', 'calorie.view.gif-planner']) {
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
    assert.equal(CALORIE_COMBOS[key].shape, 'stat', 'wizard 键须为 stat 形：' + key);
    const spec = PHOTO_COMMANDS.find((c) => c.key === key);
    assert.ok(spec, '照片命令声明缺：' + key);
    assert.equal(spec.wakeWord, undefined, '流程内页不该有代表唤醒词：' + key);
  }
});

test('#86 围度 wizard：场景1空页＋场景2预填＋recent＋白名单', () => {
  const { db } = mkWizardDb();
  try {
    const empty = dispatch('calorie.view.measure-wizard', {}, db);
    assert.equal(empty.data.metrics.filledCount, 0);
    assert.equal(empty.data.metrics.hasRecent, 1);
    assert.ok(empty.html.includes('2026-09-07'), '空页应带最近一次日期');
    // #649（#538 新措辞）：复制区标题已由「复制 prompt」改「复制指令」，且「复制指令」四字也落在
    // 公共层运行时脚本里（`var COPY_LABEL`），断标题会不断牙；改断空态 prompt 首句（data-t 唯一一处，
    // 摘复制区／改首句两向各自必红）。
    assert.ok(empty.html.includes('还没量任何一项'), '空页应带复制区');
    assertDoc(empty.html, 'measure-wizard 空页');
    const pre = dispatch('calorie.view.measure-wizard', { date: '2026-09-07', chestCm: 95, waistCm: 80, note: '早上空腹' }, db);
    assert.equal(pre.data.metrics.filledCount, 2);
    assert.ok(pre.html.includes('胸围 95cm'), '预填应进 prompt');
    assert.ok(pre.html.includes('上身'), 'prompt 应按分组');
    assert.ok(pre.html.includes('value="95"'), '表单应预填值');
    assert.ok(pre.html.includes('早上空腹'), '备注应进 prompt');
    assert.throws(() => dispatch('calorie.view.measure-wizard', { waistCm: 80, bogusField: 1 }, db), /不支持字段/, '未知字段应 fail(2) 口径');
    assert.throws(() => dispatch('calorie.view.measure-wizard', { date: '昨天' }, db), /非法/, '非法日期应拦');
  } finally {
    db.close();
  }
});

test('#86 围度 camel 口径与写键 MEASURE_CAMEL 同集（防漂移）', () => {
  const snakeOf = (camel) => WIZARD_MEASURE_CAMEL[camel];
  assert.deepEqual(
    Object.keys(WIZARD_MEASURE_CAMEL).sort(),
    ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm', 'leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm', 'leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'].sort(),
  );
  assert.deepEqual(
    Object.values(WIZARD_MEASURE_CAMEL).sort(),
    [...MEASUREMENT_FIELDS].sort(),
    'wizard 围度字段须与 fetch/body MEASUREMENT_FIELDS 同集',
  );
  assert.equal(CALIPER_FIELDS.length, 7);
  for (const camel of Object.keys(WIZARD_MEASURE_CAMEL)) assert.ok(snakeOf(camel), camel);
});

test('#86 体脂 wizard：来源＋体脂率＋皮褶7点＋换算未移植口径', () => {
  const { db } = mkWizardDb();
  try {
    const bare = dispatch('calorie.view.composition-wizard', {}, db);
    // #649（#538 新措辞）：占位首句已由「请选来源」改「请先选来源。本页按默认的……」
    //（「先」字隔断，旧子串恒为假；新句在 data-t 唯一一处，两向必红）。
    assert.ok(bare.html.includes('请先选来源'), '空页 prompt 应先要来源');
    assertDoc(bare.html, 'composition-wizard 空页');
    const v = dispatch('calorie.view.composition-wizard', {
      date: '2026-09-07', source: '健身房', bodyFatPct: 18.5, age: 30, sex: '男', note: 'InBody',
    }, db);
    assert.ok(v.html.includes('外部测量'), '健身房来源应走外部测量分支');
    assert.ok(v.html.includes('体脂率:18.5%'), '体脂率应进 prompt');
    assert.ok(v.html.includes('性别:男'), '性别应中文呈现');
    const cal = dispatch('calorie.view.composition-wizard', {
      date: '2026-09-07', source: 'home_caliper', bodyFatPct: 19.5,
      caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11,
      caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10,
    }, db);
    assert.equal(cal.data.metrics.caliperCount, 7);
    assert.equal(cal.data.metrics.sum7, 82);
    // #649（#538 新措辞）：总和行已由半角 `7 处总和:82 mm` 改全角＋中文单位
    // `7 处总和：82 毫米`（新 preview 逐字）；旧串恒为假，新串在核对清单唯一一处。
    assert.ok(cal.html.includes('7 处总和：82 毫米'), '皮褶总和应进 prompt');
    assert.throws(() => dispatch('calorie.view.composition-wizard', { source: '火星测', bodyFatPct: 18 }, db), /source 非法/, '非法来源应拦');
    const over = dispatch('calorie.view.composition-wizard', { source: 'gym', bodyFatPct: 99 }, db);
    // #649（#538 新措辞）：越界句已由 `(0, 60)` 改人话「体脂率要在 0 到 60 之间……请核对」
    //（`bfRangeText` 旧串已下屏；新句在 data-t 唯一一处，改区间／撤清单即红）。
    assert.ok(over.html.includes('体脂率要在 0 到 60 之间'), '体脂率越界应在 prompt 标异常');
    assert.throws(() => dispatch('calorie.view.composition-wizard', { source: 'gym', bodyFatPct: 18, xx: 1 }, db), /不支持字段/, '未知字段应拦');
  } finally {
    db.close();
  }
});

test('#86 身材照 wizard：纯配置＋新 CLI 命令段', () => {
  const { db } = mkWizardDb();
  try {
    const bare = dispatch('calorie.view.photo-log-wizard', {}, db);
    assert.equal(bare.data.metrics.fileCount, 0);
    // #474：缺项占位句去参数名（旧句「请先填照片文件路径（srcPaths…）」不再出现）。
    assert.ok(bare.html.includes('还没填照片路径'), '空页 prompt 应先要照片');
    assert.ok(!bare.html.includes('（srcPaths'), '#474：参数名不许进可见文本的括号解释里');
    assertDoc(bare.html, 'photo-log-wizard 空页');
    const v = dispatch('calorie.view.photo-log-wizard', { srcPaths: ['D:\\照片\\正面1.jpg', 'D:\\照片\\侧面1.jpg'], tag: '正面', note: '晨起' }, db);
    assert.equal(v.data.metrics.fileCount, 2);
    assert.ok(v.html.includes('calorie-cmd-read calorie.photo.add'), '命令段应为新 CLI 同形（禁 python）');
    assert.ok(!v.html.includes('python scripts'), '不得出现旧 py 命令');
    // #474：tag 的值仍在参数段（拆行是呈现层的事，不牵连机器段）。
    assert.ok(v.html.includes('- tag:正面'), '命令段应带 tag');
    // #527 展示升级：字段名里的 `；` 是并列语义 → 拆句（限制与示例不再用符号串一行）。
    assert.ok(v.html.includes('照片文件路径（最多 20 张。如 D:\\照片\\正面1.jpg，多张换行或逗号分隔）'),
      '#527：照片路径字段名须带 Windows 真路径示例与张数上限，且不出现 `；`');
    assert.ok(v.html.includes('标签（最多 20 个字）'), '#474：标签字段名须写「最多 20 个字」');
    // #474（审查整改 2）：「最多 20 张」一页只留一处（照片路径字段名里那处）。
    assert.equal((v.html.match(/最多 20 张/g) ?? []).length, 1,
      '#474：`最多 20 张` 须恰 1 处（KPI 明细不再与字段名重复）');
    // #474（审查整改 3c）：表单上方那句「改了不会自动生效」恰 1 次，且在字段之前。
    //  #527：句中的 `；` 拆成句号（同一件事一页一处）。
    assert.equal((v.html.match(/这些是 AI 已经用的值。改了不会自动生效——要改就直接跟 AI 说一句。/g) ?? []).length, 1,
      '#527：记身材照页须恰 1 处「改了不会自动生效」告知句');
    assert.ok(v.html.indexOf('这些是 AI 已经用的值') < v.html.indexOf('name="srcPaths"'),
      '#474：告知句须在表单**上方**（字段之前）');
    assert.ok(!v.html.includes('≤20 字符'), '#474：旧限制句须 0 命中');
    assert.ok(!v.html.includes('照片源文件路径（每行 1 个，或逗号分隔）'), '#474：复述字段名的旧说明须删');
    // #474 复制区引导＋小标题（调用点传参，公共层缺省不动）。
    assert.ok(v.html.includes('下面这段是给 AI 的指令：整段复制粘过去就行，英文命令不用看懂'),
      '#474：复制区段前引导句缺失');
    assert.ok(v.html.includes('给 AI 的指令（复制这一段）'), '#474：复制区小标题缺失');
    assert.ok(!v.html.includes('复制 prompt（必走）'), '#474：公共层缺省小标题不该再出现');
    // #474 折叠标题改人话，8 个词仍可见。
    assert.ok(v.html.includes('常用标签（点一个填上去）'), '#474：折叠标题须改人话');
    assert.ok(v.html.includes('正面自然光') && v.html.includes('腿部'), '#474：8 个常用标签须仍可见');
    assert.throws(() => dispatch('calorie.view.photo-log-wizard', { tag: '123456789012345678901' }, db), /至多 20/, '超长 tag 应拦');
  } finally {
    db.close();
  }
});

test('#86 GIF 框选器：列表＋框选＋裁剪＋命令段（无 cropper.js）', () => {
  const { db } = mkWizardDb();
  try {
    const v = dispatch('calorie.view.gif-planner', { tag: '正面' }, db);
    assert.equal(v.data.metrics.photoCount, 2);
    assert.equal(v.data.metrics.selectedCount, 2);
    assert.ok(v.html.includes('w86_a.jpg'), '照片应文件名引用（禁 base64）');
    assert.ok(!v.html.includes('data:image'), '不得内嵌二进制');
    assert.ok(!v.html.includes('<script src'), '不得引入外部 JS 库（含 cropper.js）');
    assert.ok(v.html.includes('calorie-cmd-read calorie.photo.gif'), '命令段应为新 CLI 同形');
    assertDoc(v.html, 'gif-planner 页');
    const rows = v.data.metrics;
    assert.equal(rows.missingCount, 0);
    // #474 展示升级：两组数字分名（框选缺 ID ≠ 文件找不到），并给出四张 KPI 卡。
    assert.ok(v.html.includes('框选里没有的 ID'), '#474：缺 ID 那格须与「文件找不到」分开命名');
    assert.ok(v.html.includes('>要用</div>') && v.html.includes('>库里共 2 张</div>'), '#474：要用／库里共两张读数缺失');
    assert.ok(v.html.includes('>GIF 输出</div>'), '#474：GIF 输出格读数缺失');
    // #527：GIF 输出卡的明细（原 `500ms/帧 · 无限循环`）撤到卡下的事实条，两件事各一格。
    assert.ok(v.html.includes('ilife-block-fact-strip') && v.html.includes('每帧停')
      && v.html.includes('0.5 秒'), '#527：输出规格须落事实条（每帧停 0.5 秒）');
    assert.ok(v.html.includes('无限循环'), '#527：循环的人话须仍在');
    assert.ok(!v.html.includes('ms/帧 · '), '#527：`·` 串的输出明细须下屏');
    assert.ok(!v.html.includes('文件丢失'), '#474：旧「文件丢失」须 0 命中');
    // #527 候选行（原六列表）：一行一张照片——编号／标签／文件名各一槽，次要事实走徽章列。
    assert.ok(v.html.includes('照片 1') && v.html.includes('照片 2'), '#527：候选行须印「照片 N」（不印 `#N`）');
    assert.equal((v.html.match(/<li class="phu-pl">/g) ?? []).length, 2, '#527：候选行须两行');
    assert.ok(!v.html.includes('>照片文件</th>') && !v.html.includes('>裁剪</th>'), '#527：旧六列表头须下屏');
    assert.ok(v.html.includes('整图'), '#527：未裁剪的行应印「整图」');
    assert.ok(v.html.includes('已框选'), '#527：默认全选时每行须印「已框选」');
    assert.ok(!v.html.includes('>存在</td>') && !v.html.includes('>未校验</td>') && !v.html.includes('>缺失</td>'),
      '#474：正常行不该喊存在／未校验／缺失');
    // #474 表单：限制进字段名、数字框带上下限、两个枚举改下拉、坐标 JSON 那栏真撤掉。
    assert.ok(!v.html.includes('{"12":[x1,y1,x2,y2]}'), '#474：坐标 JSON 那栏须撤掉');
    assert.ok(!v.html.includes('name="crops"'), '#474（审查整改 3a）：crops 那一栏须真撤掉（不留空框）');
    assert.ok(!v.html.includes('要裁剪哪几张？'), '#474：裁剪栏连字段名一起走');
    assert.ok(!v.html.includes('50..5000，默认 500') && !v.html.includes('0/1/3/5（0=无限）'),
      '#474：看不见的 placeholder 限制句须 0 命中');
    assert.ok(!v.html.includes('cut / fade / dissolve'), '#474：英文过渡码须 0 命中');
    // #474（审查整改 1）：下拉的 `option value` 是机器真值、显示文本是中文；
    //  **当前值那一条必须带 `selected`**（先前拿中文当值 → 恒被「选一个」占位顶住，页上看不到当前值）。
    assert.equal((v.html.match(/<option value="0"( selected)?>无限<\/option>/g) ?? []).length, 1, '#474：循环下拉缺「机器值 0 ＋ 无限」项');
    assert.equal((v.html.match(/<option value="1"( selected)?>1 次<\/option>/g) ?? []).length, 1, '#474：循环下拉缺「机器值 1 ＋ 1 次」项');
    assert.equal((v.html.match(/<option value="3"( selected)?>3 次<\/option>/g) ?? []).length, 1, '#474：循环下拉缺「机器值 3 ＋ 3 次」项');
    assert.equal((v.html.match(/<option value="5"( selected)?>5 次<\/option>/g) ?? []).length, 1, '#474：循环下拉缺「机器值 5 ＋ 5 次」项');
    assert.equal((v.html.match(/<option value="cut"( selected)?>硬切<\/option>/g) ?? []).length, 1, '#474：切换效果下拉缺「机器值 cut ＋ 硬切」项');
    assert.equal((v.html.match(/<option value="fade"( selected)?>淡入淡出<\/option>/g) ?? []).length, 1, '#474：切换效果下拉缺「机器值 fade ＋ 淡入淡出」项');
    assert.equal((v.html.match(/<option value="dissolve"( selected)?>溶解<\/option>/g) ?? []).length, 1, '#474：切换效果下拉缺「机器值 dissolve ＋ 溶解」项');
    assert.match(v.html, /<option value="0" selected>无限<\/option>/, '#474：当刻 loop=0 那条须落 selected');
    assert.match(v.html, /<option value="cut" selected>硬切<\/option>/, '#474：当刻 transition=cut 那条须落 selected');
    assert.equal((v.html.match(/<option value="" disabled( selected)?>选一个<\/option>/g) ?? []).length, 0,
      '#527：下拉不许再有「选一个」占位（当刻当前值即所选那一条）');
    assert.ok(v.html.includes('每帧多久（毫秒，50 到 5000）') && v.html.includes('宽（像素，100 到 2000）'),
      '#527：数字字段的单位与范围须进字段名（原来只在空栏可见）');
    assert.ok(!v.html.includes('50..5000') && !v.html.includes('100..2000'),
      '#527：`..` 这种符号顶替文字须 0 命中（改写「50 到 5000」）');
    assert.ok(v.html.includes('type="number"') && v.html.includes('max="5000"') && v.html.includes('min="50"'),
      '#474：毫秒字段须是带上下限的数字框');
    // #474（审查整改 3c）：表单上方那句「改了不会自动生效」——两个过程型页各恰 1 次。
    //  #527：句中的 `；` 是并列语义 → 拆句（同一件事一页一处）。
    assert.equal((v.html.match(/这些是 AI 已经用的值。改了不会自动生效——要改就直接跟 AI 说一句。/g) ?? []).length, 1,
      '#527：GIF 规划器页须恰 1 处「改了不会自动生效」告知句');
    assert.ok(v.html.indexOf('这些是 AI 已经用的值') < v.html.indexOf('name="duration"'),
      '#474：告知句须在表单**上方**（字段之前）');
    const sel = dispatch('calorie.view.gif-planner', {
      tag: '正面', photoIds: [1], crops: { 1: [10, 20, 110, 220] }, duration: 300, loop: 3, transition: 'fade',
    }, db);
    assert.equal(sel.data.metrics.selectedCount, 1);
    assert.equal(sel.data.metrics.cropCount, 1);
    assert.ok(sel.html.includes('裁剪(每张单独)'), '裁剪应进 prompt');
    assert.ok(sel.html.includes('300ms/帧'), '细节应进 prompt');
    // #474（审查整改 1）：视图值一变，`selected` 跟着挪到那一条上（不是恒在占位项）。
    assert.match(sel.html, /<option value="3" selected>3 次<\/option>/, '#474：loop=3 时那条须落 selected');
    assert.match(sel.html, /<option value="fade" selected>淡入淡出<\/option>/, '#474：transition=fade 时那条须落 selected');
    assert.ok(!sel.html.includes('<option value="0" selected>') && !sel.html.includes('<option value="cut" selected>'),
      '#474：默认值那两条不许再带 selected');
    // #474（审查整改 2）：指令与下拉说同一个词（中文词），机器面参数不动。
    //  提示行住在 `data-t` 属性里（属性值走了 HTML 转义），判据先反转义再判。
    const unescaped = sel.html.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.match(unescaped, /- 过渡:淡入淡出/, '#474：指令的过渡行须与下拉同一个词');
    assert.match(unescaped, /- 循环:3 次循环/, '#474：指令的循环行须与下拉同一个词');
    assert.ok(!/- 过渡:(cut|fade|dissolve)/.test(unescaped), '#474：指令里不该再出现英文过渡码');
    assert.ok(unescaped.includes('calorie.photo.gif'), '命令段仍在');
    // #474：有裁剪的那张在本页候选行印「裁剪过」（与整图分开）。
    const selRows = /<ol class="phu-pl">([\s\S]*?)<\/ol>/.exec(sel.html);
    assert.ok(selRows, '#527：候选行容器（`<ol class="phu-pl">`）缺失');
    const croppedRow = selRows[1].split('<li class="phu-pl">').find((r) => r.includes('裁剪过'));
    assert.ok(croppedRow, '#527：裁剪过的行应印「裁剪过」');
    assert.ok(!croppedRow.includes('整图'), '#527：裁剪过的行不该印「整图」');
    const miss = dispatch('calorie.view.gif-planner', { tag: '正面', photoIds: [9999] }, db);
    assert.equal(miss.data.metrics.missingCount, 1);
    assert.equal(miss.data.metrics.selectedCount, 0);
    assert.ok(miss.html.includes('已跳过 9999'), '#474：缺 ID 那格须列出被跳过的编号');
    assert.ok(miss.html.includes('未选中任何照片'), '全丢 ID 应给空态 prompt');
    const none = dispatch('calorie.view.gif-planner', { tag: '不存在的标签' }, db);
    assert.equal(none.data.metrics.photoCount, 0);
    assert.ok(none.html.includes('这个标签／时间窗里没有照片'), '#474：空表须给指到操作的空态句');
    assert.throws(() => dispatch('calorie.view.gif-planner', { transition: 'spin' }, db), /transition/, '非法过渡应拦');
    assert.throws(() => dispatch('calorie.view.gif-planner', { crops: { 1: [5, 5, 1, 1] } }, db), /x2>x1/, '非法裁剪应拦');
  } finally {
    db.close();
  }
});

test('#474 文件找不到与框选缺 ID 各归各位：异常行出声、KPI 出徽标', () => {
  const dir = mkdtempSync(join(tmpdir(), 't474-gif-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedWizard(db);
  try {
    // 照片目录是空的：库里两张都登记着，但磁盘上一张也没有 → 两张都挂「会跳过」徽标。
    const v = dispatch('calorie.view.gif-planner', { tag: '正面', photosDir: join(dir, 'photos') }, db);
    const html = v.html;
    // #527：候选行改「一行一张照片」，异常不再是表里的「找不到（会跳过）」单元格，而是行上的徽标。
    const rows = /<ol class="phu-pl">([\s\S]*?)<\/ol>/.exec(html);
    assert.ok(rows, '#527：候选行容器（`<ol class="phu-pl">`）缺失');
    assert.equal((rows[1].match(/<li class="phu-pl">/g) ?? []).length, 2, '两张照片都该有候选行');
    assert.equal((rows[1].match(/>会跳过<\/span>/g) ?? []).length, 2, '两张找不到的照片都应逐行出声');
    assert.ok(html.includes('status-badge') && html.includes('会跳过'), '#474：异常格须挂状态徽标');
    assert.ok(html.includes('>框选里没有的 ID</div>'), '#474：缺 ID 那格须仍在（本用例为 0）');
    assert.ok(html.includes('>文件找不到</div>') && html.includes('>2</span>'), '#474：文件找不到那格须报 2 张');
    assert.ok(!html.includes('>文件丢失</div>'), '#474：旧「文件丢失」格须 0 命中');
    assert.ok(!html.includes('>存在</td>'), '#474：没有一张正常，仍不许印「存在」');
  } finally {
    db.close();
  }
});

test('#86 空库不抛：4 键在空库均可开页（场景1）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't86-empty-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    for (const k of WIZ_KEYS) {
      const out = dispatch(k, {}, db);
      assertDoc(out.html, k + ' 空库页');
    }
  } finally {
    db.close();
  }
});

test('#86 CLI 端到端：4 键 exit 0＋落盘＋复制属性', () => {
  const dir = mkdtempSync(join(tmpdir(), 't86-cli-'));
  const dbPath = join(dir, DB_FILENAME);
  const db = openDb(dbPath);
  seedWizard(db);
  db.close();
  const cases = [
    ['calorie.view.measure-wizard', { date: '2026-09-07', waistCm: 80 }],
    ['calorie.view.composition-wizard', { date: '2026-09-07', source: 'gym', bodyFatPct: 18.5 }],
    ['calorie.view.photo-log-wizard', { tag: '正面', srcPaths: ['/tmp/a.jpg'] }],
    ['calorie.view.gif-planner', { tag: '正面' }],
  ];
  for (const [key, params] of cases) {
    const outPath = join(dir, key.replace(/\./g, '_') + '.html');
    const r = run(BIN, key, params, { SKILLS_DB_PATH: dir }, outPath);
    assert.equal(r.status, 0, key + ' CLI 非零：' + r.stderr);
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, key);
    assert.equal(env.shape, 'stat');
    const html = readFileSync(outPath, 'utf8');
    assert.ok(html.includes('data-action-id'), key + ' 缺复制按钮承载属性');
    assert.ok(html.includes('data-t='), key + ' 缺复制文本承载属性');
    assert.ok(existsSync(outPath), key + ' 未落盘指定 --html');
  }
});

test('#86 复制只走 Base P0 双通道：页内无自造复制实现', () => {
  // 共享运行时（buildSharedHelpersJs，双通道＋toast＋委派）是唯一复制执行者；
  // 本票只断言技能侧无自造：零内联 onclick、无自产 copyText 全局调用。
  const { db } = mkWizardDb();
  try {
    for (const k of WIZ_KEYS) {
      const out = dispatch(k, {}, db);
      assert.ok(!out.html.includes('onclick'), k + ' 零内联 onclick');
      assert.ok(!out.html.includes('window.copyText('), k + ' 不得调用旧全局 copyText');
      assert.ok(out.html.includes('data-action-id'), k + ' 复制按钮应走委派属性');
    }
  } finally {
    db.close();
  }
});
