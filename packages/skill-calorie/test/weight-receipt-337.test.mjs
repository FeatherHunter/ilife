/** #337 · 场景 03 体重页面⑤⑥：今日体重盘 2 条读 ＋ 写后回执 9 条写（以唤醒词为起点）。
 *
 * 每条参数取 `src/weight/routes.ts` 的 `cli`（`<日期>` 填真实日期，其余逐字）。
 * 逐条断言：exit 0、信封 `data.output` 是本次 `--html` 的绝对路径、产物是完整文档
 * （`assertDocPage` 五连）、含体重眉标与对账信息＋三格式复制菜单；并按老实物
 * （`docs/skills/skill-calorie/t165-老页面实物结构.md`）补三变体区块：
 * 单条（本次体重／较上次／距目标／备注）／批量（写入跳过失败数＋逐条明细）／
 * 改类（改前 → 改后）／删类（删除前的原值＋删除不可恢复）。写词另断言写前写后库真的变了
 * （同一临时库内回读，**不碰真库**：`SKILLS_DB_PATH` 指向本次临时目录）。
 * #483 文本审查后同步收紧：可见文本里不能再出现旧句（`影响行数`／`本次写入的行数`／`回执格式`／
 * `已写入 weight_log`／`线在量程外`／`删除口径`／`批量计数`／`删除快照`／参数名 `kg、note、date、time`）
 * ——`assertReceipt` 里逐条钉 0 命中；删掉的「批量计数」表改钉结论句那三数。
 * #510 收尾（同屏事实收敛 ≤2）：旧断言随新文案同步收紧——记体重的判语块只剩「记在哪一天哪一刻」
 * （不许再复述本次体重值）＋「写入字段」卡副行不再 `、` 枚举；批量补录的判语改说这张表怎么看
 * （三数归副标题与表题）；删体重（按 id）的判语块不发数不给方向词、表题保留条数，删某日那页
 * 副标题已含条数 ⇒ 表题改「（逐条）」不再复述。
 * #542（#340 打回批）：记／批量／删除三支回执的可见副标题整行撤——副标题槽里不再复述任何计数；
 * 批量三数（写入／跳过／失败）改住一条事实条，删除三页的日期／条数／不可恢复各住快照表／状态卡／判语。
 * 读数见
 * `.scratch/t154/text-review/rev-fix2/证据-收敛.md`（7 页最高值 4→2，超 2 次页数 0/9）。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t337-体重盘与回执-证据.md`）：
 * - 变异红：把 `src/weight/receipt.ts` 的 `assembleDocPage` 入口改坏一处
 *   （如 `eyebrow` 改字）→ 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * #501 两条结构化判据（读产物 HTML，不读源码，`assertReceipt` 内 11 页逐页调用）：
 * ① 对账信息键集 ≥2 且必含「记录编号」；② 复制载荷里的每个数都要在页面上找得到。
 * 判据②的那一向取舍（票面字面「页面 ⊆ 载荷」实测为红、归 #574）见件尾变异电池注释与
 * `docs/skills/skill-calorie/t501-回执页判据.md`。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/weight-receipt-337.test.mjs`
 * （先验形状：先跑 `记体重` 一条，再跑全量；`--test-name-pattern=记体重$` 即单条）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't337-weight-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘，回信封 ＋ 产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 只读回查（写前写后对账用；库由本测试的临时目录供给，不碰真库）。 */
function q1(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILENAME));
  try {
    return db.prepare(sql).get(...args);
  } finally {
    db.close();
  }
}

/** 可见正文（#505 收紧用）：削掉样式段／脚本段／复制区整块与一切 `data-*` 属性（复制载荷 JSON 住在属性里），
 *  再去标签。判据与出页扫描同口径：**正文里零 `·`／`；`**（允许项＝`<title>` 里的文档名、
 *  页脚口径行的 `｜`、日期区间的 `~`、复制载荷与命令原文这些机器面）。 */
function visibleBody(html) {
  return html
    .replace(/<title\b[\s\S]*?<\/title>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<section[^>]*ilife-block-copy-block[\s\S]*?<\/section>/gi, ' ')
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/** #501 判据①：页尾「对账信息」折叠区的行标签（项列）。折区一度只剩「落库时间」一行、
 *  「记录编号」整行不摆（#483 对抗审查缺陷 3）——那是靠人工审查发现的，程序看不出来。 */
function reconcileKeys(html) {
  const at = html.indexOf('对账信息');
  if (at < 0) return [];
  const rest = html.slice(at);
  const end = rest.indexOf('</details>');
  const block = end >= 0 ? rest.slice(0, end) : rest;
  return [...block.matchAll(/data-label="项">([^<]*)<\/td>/g)].map((m) => m[1]);
}

/** #501 判据①守卫：键集 ≥2 且必含「记录编号」（批量那几页允许值写「本次不适用」，标签仍要在）。 */
function assertReconcileKeys(html, what) {
  const keys = reconcileKeys(html);
  assert.ok(keys.length >= 2, what + ' 对账信息键集 <2：' + JSON.stringify(keys));
  assert.ok(keys.includes('记录编号'), what + ' 对账信息缺「记录编号」行：' + JSON.stringify(keys));
}

/** #501 判据②：三格式复制载荷（`data-t`，`data-fmt` 那三颗菜单项）的取数口。
 *  信封的机器面（`version`／`skill`／`shape`／`key` 与头行 `【skill · key】`）先剥掉——那几个数是
 *  契约号（`0.1.0`），不是页面上的数，留着会把判据变成永远假红。 */
function payloadTexts(html) {
  return [...html.matchAll(/data-fmt="[^"]*"\s+data-t="([^"]*)"/g)]
    .map((m) => m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/【[^】]*】/g, ' ')
      .replace(/"version"\s*:\s*"[^"]*"/g, ' ')
      .replace(/^\s*version\s*[:：][^\n]*/gim, ' ')
      .replace(/"skill"\s*:\s*"[^"]*"/g, ' ')
      .replace(/"shape"\s*:\s*"[^"]*"/g, ' ')
      .replace(/"key"\s*:\s*"[^"]*"/g, ' '));
}

/** 字符串里的数值多重集（判据②用）。 */
function numbersIn(text) {
  return new Set(text.match(/[0-9]+(?:\.[0-9]+)?/g) ?? []);
}

/** #501 判据②守卫：**载荷里的每个数都要在页面上找得到**（载荷可以更全，页面不许少认）。
 *  这一向是能立刻落地的那一向：反过来「页面每个数都在载荷里」当刻为红——载荷只装结论句
 *  （写页）或聚合读数（读页），不装逐行明细；改载荷口径是共用件的事，`#153` 决议「三通道维持现状、
 *  逐行明细另开一票（#574）」，不在本票写集。故本票按「载荷 ⊆ 页面」落地，实测读数与转票记录
 *  见 `docs/skills/skill-calorie/t501-回执页判据.md`。 */
function assertPayloadNumbersOnPage(html, what) {
  const pageNums = numbersIn(visibleBody(html));
  const payloadNums = [...numbersIn(payloadTexts(html).join('\n'))];
  const extra = payloadNums.filter((n) => !pageNums.has(n));
  assert.deepEqual(extra, [], what + ' 复制载荷里有页面上没有的数（载荷要更全、但不能多认）：' + JSON.stringify(extra));
}

/** 11 条共用的完整文档＋交付断言（五连走共用助手，三格式菜单在这里钉）。 */
function assertReceipt(r, what) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  /* 眉标整族删（文本审查轮裁定）：`体重 · 写后回执` 与页题「记体重回执」说同一件事，
   * 且读页那半边原来印的是内部命令键（`calorie.view.* · 运动身体域`）⇒ 权重域一律不出这一行。
   * 判据只认**眉标元素**（类名在共享样式段里恒在，拿裸类名当判据会假红，见 #473 的同款写法）。 */
  assert.doesNotMatch(r.file, /<p class="[^"]*page-shell-eyebrow/, what + ' 眉标整行应删（不许再出眉标元素）');
  assert.ok(r.file.includes('对账信息'), what + ' 缺页尾对账折叠区');
  // #501 判据①②：对账区键集 ≥2 且必含「记录编号」；三格式载荷的数不许比页面多认。
  assertReconcileKeys(r.file, what);
  assertPayloadNumbersOnPage(r.file, what);
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  // #483：旧句命中必须为 0（可见文本已改人话／已删；载荷里没有这些字面，故不误伤）。
  for (const gone of ['影响行数', '本次写入的行数', '回执格式', '已写入 weight_log', '线在量程外',
    '删除口径', '批量计数', '删除快照', 'kg、note、date、time']) {
    assert.ok(!r.file.includes(gone), what + ' 仍含 #483 已删文本：' + gone);
  }
  /* #505 形状化（口径 §三.3）三条：
   * ① **正文里零 `·`／`；`**（`visibleBody` 削掉机器面后逐字扫；旧写法是拿这两个符号顶替设计）；
   * ② 页题不再串 `·`（原 `记体重 · 回执` 改 `记体重回执`）；
   * ③ 形状词汇真的上了屏：结论块里是 `wui-verdict`／`wui-strip` 元素，**不是被转义成字面量的标签**
   *    （本票实测过一次：形状串进错入口会被整段转义印成 `<p class="wui-verdict">…` 原样文字）。 */
  const body = visibleBody(r.file);
  assert.ok(!body.includes('·'), what + ' 正文里仍有 `·`：' + (body.match(/.{0,24}·.{0,24}/) ?? [''])[0]);
  assert.ok(!body.includes('；'), what + ' 正文里仍有 `；`：' + (body.match(/.{0,24}；.{0,24}/) ?? [''])[0]);
  assert.doesNotMatch(r.file, /page-shell-title[^>]*>[^<]*·/, what + ' 页题里仍有 `·`');
  assert.ok(r.file.includes('<p class="wui-verdict">'), what + ' 结论块正文不是形状元素（判语块缺失或被转义）');
  assert.ok(!/&lt;(p|div|span|ul) class=&quot;wui-/.test(r.file), what + ' 形状词汇被当成字面量印上了屏');
}

/** 今日盘 2 条读共用的完整文档＋交付断言（读页眉标与写后回执不同）。
 *  第一张卡的标签按窗口给（#487：一天窗叫「今日体重」，30 天窗叫「最新体重」）——当参数传，不写死一个。
 *  #505：读页同样受「正文里零 `·`／`；`」约束（口径 §三.3），判据与回执页同一份 `visibleBody`。 */
function assertDashboard(r, what, firstCard) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  for (const needle of [firstCard, '较上次', '结论', '体重曲线', '复制数据']) {
    assert.ok(r.file.includes(needle), what + ' 缺：' + needle);
  }
  const body = visibleBody(r.file);
  assert.ok(!body.includes('·'), what + ' 正文里仍有 `·`：' + (body.match(/.{0,24}·.{0,24}/) ?? [''])[0]);
  assert.ok(!body.includes('；'), what + ' 正文里仍有 `；`：' + (body.match(/.{0,24}；.{0,24}/) ?? [''])[0]);
  // 形状词汇上屏：窗口条 ＋ 方向胶囊（页头原是一句 `·` 串）＋ 结论块的判语。
  // 事实条只在真有**卡片上没有的事实**时出（#510 收敛口径：目标值／截止日那一型；未设体重目标的
  // 种子这一页没有可列的 ⇒ 结论块只剩一句判语）。有目标的那一支由本文件末尾「#510 设了目标」那条钉。
  for (const shape of ['<div class="wui-window-block">', '<span class="wui-days">', '<span class="wui-chip',
    '<p class="wui-verdict">']) {
    assert.ok(r.file.includes(shape), what + ' 缺形状件：' + shape);
  }
  assert.equal((r.file.match(/<p class="wui-verdict">/g) || []).length, 1, what + ' 结论块须恰一句判语');
  // #542：页头副标题整行撤（窗口与条数住窗口条与页脚来源行）——元素本身不得出现。
  assert.ok(!r.file.includes('class="ilife-block-page-shell-subtitle"'), what + ' 页头副标题应整行撤掉');
  assert.ok(!/&lt;(p|div|span|ul) class=&quot;wui-/.test(r.file), what + ' 形状词汇被当成字面量印上了屏');
}

/** 一份可跑的种子库（7 天批量史 ＋ 今日一条 ＋ 前天备注一条），回今日与备注行的记录号。 */
function seedBasic(dir) {
  const today = todayISO();
  const items = [];
  for (let d = 9; d >= 3; d--) items.push({ date: shiftISO(today, -d), kg: Math.round((70.9 - (9 - d) * 0.1) * 10) / 10 });
  const b = runCli(dir, 'calorie.weight.batch', { items }, 'seed-batch');
  assert.equal(b.status, 0, '种子批量 exit ' + b.status + ' stderr=' + b.stderr.slice(-300));
  const t = runCli(dir, 'calorie.weight.log', { kg: 70.1, date: today, time: '07:00:00' }, 'seed-today');
  assert.equal(t.status, 0, '种子今日 exit ' + t.status + ' stderr=' + t.stderr.slice(-300));
  const n = runCli(dir, 'calorie.weight.log', { kg: 70.2, date: shiftISO(today, -2), time: '07:00:00', note: '晨起空腹' }, 'seed-note');
  assert.equal(n.status, 0, '种子备注 exit ' + n.status + ' stderr=' + n.stderr.slice(-300));
  return {
    todayId: t.envelope.data.receipt.recordId,
    noteId: n.envelope.data.receipt.recordId,
    noteDate: shiftISO(today, -2),
  };
}

// ---------------------------------------------------------------- ⑤ 今日体重盘（2 条读）

test('#337 看今日体重', () => {
  const dir = mkDir();
  seedBasic(dir);
  const r = runCli(dir, 'calorie.view.weight', { window: '今日' }, 'view-today');
  assertDashboard(r, '看今日体重', '今日体重');
  assert.ok(r.file.includes(todayISO()), '缺今日日期');
  assert.ok(r.file.includes('70.1'), '今日卡缺今日值');
});

test('#337 看体重总览', () => {
  const dir = mkDir();
  seedBasic(dir);
  const r = runCli(dir, 'calorie.view.weight', { window: '30d' }, 'view-overview');
  assertDashboard(r, '看体重总览', '最新体重');
  assert.ok(r.file.includes('体重总览'), '缺体重总览区块');
});

/* #510（审查席 S2 第三类 ＋ 同类项）：今日盘的两处收敛——六张卡合成一个网格（两行同宽）、
 * 结论块的事实条只装卡片上没有的事实，且「标签 ＋ 一句说明」那一型走 `asNote`（两半分两档）。 */
test('#510 设了目标的今日盘：结论块的事实条只装卡片上没有的事实，说明那一型走 asNote', () => {
  const dir = mkDir();
  seedBasic(dir);
  const g = runCli(dir, 'calorie.goal.weight', { kg: 68, deadline: '2026-12-31' }, 'seed-goal');
  assert.equal(g.status, 0, '种子目标 exit ' + g.status + ' stderr=' + g.stderr.slice(-200));
  const r = runCli(dir, 'calorie.view.weight', { window: '30d' }, 'view-overview-goal');
  assertDashboard(r, '看体重总览（设了目标）', '最新体重');
  assert.ok(r.file.includes('<div class="wui-strip'), '结论块缺事实条（目标值／截止日两件卡上没有的事实）');
  assert.ok(r.file.includes('wui-strip-note'), '「标签 ＋ 说明」那一型未走 asNote（说明那半没退一档）');
  assert.ok(r.file.includes('图上没画目标线') && r.file.includes('目标值超出刻度'), '目标线没画那一件丢了');
  // 六张卡一个网格：卡网格元素恰一个（原来 2 卡 ＋ 4 卡两个网格、两行卡宽不同）。
  assert.equal((r.file.match(/<div class="ilife-block-kpi-card-grid"/g) || []).length, 1,
    '今日盘的卡网格不是一个（两行卡宽会不同）');
  // 判语块不再逐句复述卡片：那一句里不许出现关键数字与方向词（数与方向归卡片值槽与徽章）。
  const verdict = /<p class="wui-verdict">([^<]*)<\/p>/.exec(r.file)?.[1] ?? '';
  assert.ok(verdict.length > 0, '缺判语块正文');
  assert.ok(!/\d/.test(verdict), '判语块复述了数字：' + verdict);
  assert.ok(!/(上升|下降|持平)/.test(verdict), '判语块复述了方向词：' + verdict);
});

// ---------------------------------------------------------------- ⑥ 写后回执（9 条写）

test('#337 记体重', () => {
  const dir = mkDir();
  const before = q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n;
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5 }, 'log');
  assertReceipt(r, '记体重');
  for (const needle of ['本次体重', '70.5', '较上次差值', '距目标差', '备注']) {
    assert.ok(r.file.includes(needle), '记体重缺：' + needle);
  }
  // #505：结论块两件都在——判语（写入时刻那句）＋ 事实条（较上次／距目标／近 30 天 ＋ BMI 一枚）。
  assert.ok(r.file.includes('<div class="wui-strip">'), '记体重 结论块缺事实条');
  // #510 收敛（S2）：判语块不再复述本次体重那个数（数字只住卡片值槽）；四个字段名也不再 `、` 枚举。
  // 判语里剩下的数字属性只有「写入时刻」那一个时间戳（它是卡片上没有的事实），故按「无本次体重值」判。
  const verdict = /<p class="wui-verdict">([^<]*)<\/p>/.exec(r.file)?.[1] ?? '';
  assert.ok(verdict.length > 0, '记体重缺判语块正文');
  assert.ok(!verdict.includes('70.5'), '记体重的判语块复述了本次体重值：' + verdict);
  assert.match(verdict, /^\D*[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}。$/,
    '记体重的判语块只剩「记在哪一天哪一刻」这一句：' + verdict);
  assert.ok(r.file.includes('体重 与 备注 与 日期 与 时间'), '「写入字段」卡副行未改写成一句话（仍是 `、` 枚举）');
  const body = visibleBody(r.file);
  assert.ok(!body.includes('（BMI 23 · '), '记体重 副标题仍在印机器面那句 `BMI 23 · 时刻`');
  // #542：可见副标题整行撤（「已记体重 70.5 kg」不上屏）——本次体重住 KPI 卡值槽，时刻住判语。
  assert.ok(!r.file.includes('class="ilife-block-page-shell-subtitle"'), '记体重 页头副标题应整行撤掉');
  assert.ok(!body.includes('已记体重'), '记体重 正文仍有副标题那句');
  assert.ok(r.envelope.data.receipt.recordId > 0, '回执缺记录号');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n, before + 1, '写后库行数未 +1');
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE id = ?', r.envelope.data.receipt.recordId).w, 70.5, '落库值不对');
});

test('#337 记体重（含备注）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5, note: '晨起空腹' }, 'log-note');
  assertReceipt(r, '记体重（含备注）');
  assert.ok(r.file.includes('晨起空腹'), '明细缺备注值');
  assert.equal(q1(dir, 'SELECT note AS v FROM weight_log WHERE id = ?', r.envelope.data.receipt.recordId).v, '晨起空腹', '备注未落库');
});

test('#337 补录体重', () => {
  const dir = mkDir();
  const d = shiftISO(todayISO(), -1);
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5, date: d }, 'log-backfill');
  assertReceipt(r, '补录体重');
  assert.ok(r.file.includes(d), '缺补录日期');
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE date = ?', d).w, 70.5, '补录行未落库');
});

test('#337 批量补录体重', () => {
  const dir = mkDir();
  const today = todayISO();
  // 先占住 -5 那一天，批量里那一条才真的走「跳过」（新库什么都不跳过，三态就只剩写入与失败）。
  const seed = runCli(dir, 'calorie.weight.log', { kg: 70.9, date: shiftISO(today, -5) }, 'batch-seed');
  assert.equal(seed.status, 0, '批量种子 exit ' + seed.status + ' stderr=' + seed.stderr.slice(-300));
  const items = [
    { date: shiftISO(today, -4), kg: 70.8 },
    { date: shiftISO(today, -5), kg: 70.5 },
    { date: 'xx', kg: 1 },
  ];
  const r = runCli(dir, 'calorie.weight.batch', { items }, 'batch');
  assertReceipt(r, '批量补录体重');
  // #483：「批量计数」表整块删（摘要与结论句里已有同样三数），改钉结论句那三个读数与两条定义。
  // #505：结论块改形状后，三数那句由 `：`＋`、` 串改成两句人话（判语一句 ＋ 两条定义各成一行）。
  // #510 收敛：判语块不再复述数字（判语只留一句判语）——三数由副标题与表题给，判语只说这张表怎么看。
  // #542：副标题整行撤，三数改住一条事实条（`写入／跳过／失败` 各一枚「标签 ＋ 值」）。
  for (const needle of ['逐条明细（共 3 条）', '这一次批量的逐条结果都在下表里，有的写进去了，有的跳过了，有的失败，原因各有各的说法。',
    '跳过＝那天已经记过（不覆盖旧记录）', '失败＝日期格式或体重值不对（原因见下表）']) {
    assert.ok(r.file.includes(needle), '批量补录体重缺：' + needle);
  }
  assert.ok(!r.file.includes('class="ilife-block-page-shell-subtitle"'), '批量补录体重 页头副标题应整行撤掉');
  for (const [k, v] of [['写入', '1 条'], ['跳过', '1 条'], ['失败', '1 条']]) {
    assert.ok(r.file.includes('<span class="wui-fact-k">' + k + '</span><span class="wui-fact-v">' + v + '</span>'),
      '批量补录体重 缺事实条「' + k + ' ' + v + '」');
  }
  // 两条定义是**逐条列表**（`wui-bullets` 里的两个 `<li>`），不再挤在一句里（#505）。
  assert.ok(r.file.includes('<ul class="wui-bullets"><li>跳过＝那天已经记过（不覆盖旧记录）</li>'
    + '<li>失败＝日期格式或体重值不对（原因见下表）</li></ul>'), '批量补录体重的两条定义不是逐条列表');
  assert.match(r.envelope.data.message, /写入 1，跳过 1，失败 1/, '批量计数摘要不对：' + r.envelope.data.message);
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE date = ?', shiftISO(today, -4)).w, 70.8, '批量行未落库');
});

test('#337 改体重记录', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.update', { id: seed.todayId, kg: 70 }, 'update-id');
  assertReceipt(r, '改体重记录');
  for (const needle of ['改前 → 改后', '70.1', '70']) {
    assert.ok(r.file.includes(needle), '改体重记录缺：' + needle);
  }
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE id = ?', seed.todayId).w, 70, '改后值未落库');
});

test('#337 改某日体重', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.update', { date: seed.noteDate, kg: 70, note: '改后' }, 'update-date');
  assertReceipt(r, '改某日体重');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照');
  const row = q1(dir, 'SELECT weight_kg AS w, note AS v FROM weight_log WHERE date = ?', seed.noteDate);
  assert.equal(row.w, 70, '按日改后值未落库');
  assert.equal(row.v, '改后', '按日改备注未落库');
});

test('#337 删体重记录', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const before = q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n;
  const r = runCli(dir, 'calorie.weight.remove', { id: seed.todayId }, 'remove-id');
  assertReceipt(r, '删体重记录');
  // #483：可见文本的「删除前快照」改「删除前的原值」（快照列改状态列）；副标题里那句机器面摘要一字不动。
  // #510 收敛：表题保留条数（值槽 ＋ 表题＝2 处）。#542：可见副标题整行撤（编号与前值住快照表，
  // 不可恢复住判语，条数住状态卡值槽）——机器面摘要一字不动。
  // #542：用户定的「硬删除，不可恢复」口径词随副标题撤掉搬进判语（一句，不发数不给方向词）。
  for (const needle of ['删除前的原值（共 1 条）', '硬删除，不可恢复，要还原请照下表原值重新记一次']) {
    assert.ok(r.file.includes(needle), '删体重记录缺：' + needle);
  }
  // #510 收敛：判语块只说这一句（不发数、不给方向词——数与方向归卡片值槽与徽章）。
  const verdict = /<p class="wui-verdict">([^<]*)<\/p>/.exec(r.file)?.[1] ?? '';
  assert.ok(verdict.length > 0, '删体重记录缺判语块正文');
  assert.ok(!/\d/.test(verdict), '删体重记录的判语块复述了数字：' + verdict);
  assert.ok(!/(上升|下降|持平)/.test(verdict), '删体重记录的判语块复述了方向词：' + verdict);
  // #505：删类页的结论块＝判语（含不可恢复那句）＋ 一枚「删后最新体重」事实条。
  assert.ok(r.file.includes('<div class="wui-strip">'), '删体重记录 结论块缺「删后最新体重」事实条');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE id = ?', seed.todayId).n, 0, '按 id 未硬删');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n, before - 1, '写后库行数未 -1');
});

test('#337 删某日体重', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.remove', { date: seed.noteDate }, 'remove-date');
  assertReceipt(r, '删某日体重');
  // #510 收敛：表题不再复述 `共 1 条`（值槽 ＋ 表题＝2 处），改说「逐条」。
  // #542：可见副标题整行撤（日期住快照表、条数住状态卡、不可恢复住判语）。
  assert.ok(!r.file.includes('class="ilife-block-page-shell-subtitle"'), '删某日体重 页头副标题应整行撤掉');
  assert.ok(r.file.includes('删除前的原值（逐条）'), '缺删除前的原值区（#510 后表题不再带条数）');
  assert.ok(!r.file.includes('删除前的原值（共 1 条）'), '删某日体重的表题仍复述条数');
  assert.ok(r.file.includes('硬删除，不可恢复'), '缺硬删除口径（机器面摘要）');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE date = ?', seed.noteDate).n, 0, '按日未硬删干净');
});

test('#337 批量删体重', () => {
  const dir = mkDir();
  seedBasic(dir);
  const today = todayISO();
  const r = runCli(dir, 'calorie.weight.remove', { start: shiftISO(today, -9), end: shiftISO(today, -8) }, 'remove-range');
  assertReceipt(r, '批量删体重');
  // #542：可见副标题整行撤（范围与条数住快照表与状态卡）。
  assert.ok(!r.file.includes('class="ilife-block-page-shell-subtitle"'), '批量删体重 页头副标题应整行撤掉');
  assert.match(r.envelope.data.message, /2 条/, '批量删摘要不对：' + r.envelope.data.message);
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE date BETWEEN ? AND ?', shiftISO(today, -9), shiftISO(today, -8)).n, 0, '按范围未硬删干净');
});

// ---------------------------------------------------------------- ⑦ #501 判据鉴别力（变异电池）

/* #501 判据缺口：文本审查那两针（对账区键集／载荷数字对账）因两任执行席中断未落成用例。
 * 本电池给两条守卫各配一次「改坏必红／还原必绿」的字符串级读数，判定权在守卫本身，不动 src。 */
test('#501 变异电池：去掉「记录编号」行 ⇒ 判据①红；载荷多认一个数 ⇒ 判据②红；还原 ⇒ 两判据绿', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5 }, 'mut-base');
  assertReceipt(r, '变异电池底页');
  const clean = r.file;
  assertReconcileKeys(clean, '变异电池底页');
  assertPayloadNumbersOnPage(clean, '变异电池底页');

  // 变异①（#483 缺陷 3 的旧形态：折区只剩时间戳，「记录编号」整行不摆）。
  const mut1 = clean.replace(/>记录编号</, '>落库编号<');
  assert.notEqual(mut1, clean, '变异①没塞进去');
  assert.throws(() => assertReconcileKeys(mut1, '变异①'), /缺「记录编号」行/, '变异①（去掉记录编号）未红');

  // 变异②（#483 第 31 条那型：三格式载荷多出页面上没有的数）。
  const mut2 = clean.replace(/(data-fmt="text"\s+data-t=")/, '$1 99.9 ');
  assert.notEqual(mut2, clean, '变异②没塞进去');
  assert.throws(() => assertPayloadNumbersOnPage(mut2, '变异②'), /载荷里有页面上没有的数/, '变异②（载荷多认一个数）未红');

  // 还原一致：底页原样再判一遍。
  assertReconcileKeys(clean, '变异电池还原');
  assertPayloadNumbersOnPage(clean, '变异电池还原');
});
