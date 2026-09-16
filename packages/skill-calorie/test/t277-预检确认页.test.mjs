/** #277 · 预检确认页「4 条」真出口锁（CLI 级，不是模块级）＋「确认 → 执行」链路 ＋ 两态 ＋ 变异钩。
 *
 * **本锁守什么**（逐条对应 `docs/skills/skill-calorie/t277-报告.md` 的判据）：
 *  ① 四条词的**路由真 cli** 逐条实跑（`spawn dist/cli/cmd_read.js`）：exit 0、产物是**完整文档**
 *     （`<!doctype html>` 在第 0 字节 ＋ charset ＋ 内联样式段 ＋ `</html>` 收尾），
 *     并读出**绝对路径**（`data.output`）与**字节数**（`delivery.bytes`，与磁盘实况同值）。
 *  ② 内容按老实物重做：三张页的区块锚点／KPI 标签／表列头／口径行／来源脚注在位；
 *     拍营养表那页的八个字段名照 `nutrition_label_wizard.html` 逐字；不确定的格子有标记。
 *  ③ **确认 → 执行链路**：确认页给出它将写入的字段与值，且复制日志第 4 段带着那条写命令原文；
 *     把那条命令**原样跑一遍**必须真写进库（写后回读计数 +1）。
 *  ④ 两态：库为空仍出完整页（既有设计行为）；一条都进不了库时出**空态句 ＋ 引导句**。
 *  ⑤ 变异钩：把产物改坏一处，同一段断言必红（证明断言不是永真）。
 *
 * 跑法：`node node_modules/typescript/bin/tsc -b packages/skill-calorie` 之后
 * `node --test packages/skill-calorie/test/t277-预检确认页.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 四条词的**路由真值**（`src/diet/routes.ts`）。两条「过程型」词（老实物 `output_type: process`）
 *  的路由键必须是会改数据库的键（`scripts/build-help.mjs:394` 的 `dietFlowOf` 拦这一条），
 *  故它们跑的是写命令 ＋ 入口标记 `entry:"precheck"`——命令见它**只出预检确认页、不写库**。 */
const CASES = [
  {
    word: '批量导入食品', wake: '批量导入食品',
    key: 'calorie.product.import',
    params: { items: [{ productName: '测试导入燕麦', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }], entry: 'precheck' },
    title: '📥 批量导入预览',
  },
  {
    word: '校验批量导入', wake: '校验批量导入',
    key: 'calorie.view.batch-import-preview',
    params: { items: [{ foodName: '粥', calories: 150, protein: 3 }], entry: 'validate' },
    title: '📥 批量导入校验',
  },
  {
    word: '拍营养表记一餐', wake: '拍营养表记一餐',
    key: 'calorie.diet.add',
    params: { foodName: '鸡胸', calories: 200, protein: 35, carbohydrates: 2, fat: 4, note: '营养表识别', source: 'photo', entry: 'precheck' },
    title: '📷 营养表识别确认',
  },
  {
    word: '拍营养表补记一餐', wake: '拍营养表补记一餐',
    key: 'calorie.diet.add',
    params: { foodName: '米饭', calories: 500, protein: 10, carbohydrates: 85, fat: 5, date: SEED_TODAY, time: '12:30:00', note: '营养表补记', source: 'photo', entry: 'precheck' },
    title: '📷 营养表识别确认',
  },
];

function freshDir(tag, seed = true) {
  const dir = mkdtempSync(join(tmpdir(), 't277-' + tag + '-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

function countOf(dir, table) {
  const db = openDb(join(dir, 'calorie_data.db'));
  const n = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n;
  db.close();
  return Number(n);
}

/** 真出口：不给 `--html` ⇒ 落 `<SKILLS_DB_PATH>/calorie_html/<中文名>_<时间戳>.html`，
 *  路径与字节从 envelope 读（`data.output`／`delivery.bytes`）——判据要的「绝对路径与字节数」。 */
function run(dir, key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const out = env?.data?.output ?? null;
  return {
    status: r.status, stderr: String(r.stderr || '').trim(), env, out,
    bytes: env?.delivery?.bytes ?? null,
    html: out !== null && existsSync(out) ? readFileSync(out, 'utf8') : '',
  };
}

function runOk(dir, key, params, what) {
  const r = run(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-240));
  return r;
}

/** 复制载荷里的 `data-t` 值（实体解码后）——页面「命令原文」的唯一落点（`t425` 裁定 7）。 */
function payloads(html) {
  const out = [];
  for (const m of html.matchAll(/data-t="([^"]*)"/g)) {
    out.push(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  }
  return out;
}

/** 从复制载荷里抠出「确认后要跑的那条命令」——照抄可重跑的原文。
 *
 *  锚在复制日志第 4 段那句「确认后执行」上：同一段前半是**本页自己那条命令**（带入口标记
 *  `entry`，跑它只会再出一遍这一页），后半才是**用户确认之后要跑的那条**（不带标记、真写库）。 */
function writeCommandOf(html, key) {
  const prefix = '确认后执行 ';
  const head = 'calorie-cmd-read ' + key + " --params '";
  for (const p of payloads(html)) {
    const i = p.indexOf(prefix + head);
    if (i < 0) continue;
    const start = i + prefix.length;
    const j = p.indexOf("'", start + head.length);
    if (j > 0) return p.slice(start, j + 1);
  }
  return null;
}

function runCommandLine(dir, line) {
  const tok = [];
  let cur = '';
  let q = null;
  for (const ch of line) {
    if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { tok.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) tok.push(cur);
  return spawnSync(process.execPath, [CLI, ...tok.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
}

/** 裁定 1 的机器话探针读数：**先剥掉复制菜单的可见格式名**（`JSON`／`CSV` 是作者裁定的中文格式名里
 *  的通用缩写，不是内部标识符，同 #496／#509 的处理）。 */
function machineBad(html) {
  const body = stripCopyPayload(html).replace(
    /<span class="[^"]*ilife-copy-menu-label[^"]*">[^<]*<\/span>/g, '<span>［格式名］</span>');
  return machineWords(body).filter((w) => w.hit !== null).map((w) => w.kind + '＝「' + w.hit + '」');
}

/** 完整文档的四条硬事实（`<!doctype html>` 在第 0 字节／charset／样式段／`</html>` 收尾）。 */
function assertCompleteDoc(html, what) {
  assert.equal(html.startsWith('<!doctype html>\n<html lang="zh-CN">'), true, what + '：<!doctype html> 不在第 0 字节');
  assert.equal(html.includes('<meta charset="utf-8">'), true, what + '：缺 charset');
  assert.equal(html.includes('<style>'), true, what + '：缺内联样式段');
  assert.equal(html.includes('ilife-page'), true, what + '：缺页面壳');
  assert.equal(html.trimEnd().endsWith('</html>'), true, what + '：结尾不是 </html>');
}

const RUNS = CASES.map((c) => {
  const dir = freshDir('run');
  return { c, dir, r: runOk(dir, c.key, c.params, c.word) };
});

const scrub = (s) => s.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '［时刻］')
  .replace(/_\d{8}_\d{6}(_\d+)?\.html/g, '_［时刻］.html');

/* ① 真出口：四条词逐条 exit 0 ＋ 完整文档 ＋ 绝对路径与字节如实 */
for (const { c, r } of RUNS) {
  test('#277 ① 真出口完整文档与落盘读数 —— ' + c.word, () => {
    assert.equal(isAbsolute(r.out), true, c.word + ' 的产物路径不是绝对路径：' + String(r.out));
    assertCompleteDoc(r.html, c.word);
    const size = statSync(r.out).size;
    assert.equal(r.bytes, size, c.word + ' envelope 报的字节数与磁盘不一致');
    assert.ok(size > 1000, c.word + ' 产物只有 ' + size + ' 字节，不像整页');
    console.log('READING #277 ① ' + c.word + ' exit=0 bytes=' + size + ' path=' + r.out);
  });
}

/* ② 页头四条词各对上，且两两不撞（同形页没分家） */
test('#277 ② 页头按唤醒词对上 ＋ 四条词两两不撞', () => {
  for (const { c, r } of RUNS) {
    const text = visibleText(stripCopyPayload(r.html));
    /* #581 · 眉标去“ · 饮食”，只留唤醒词（`src/diet/precheck.ts:33-35`／`precheckLabel.ts:159`）。 */
    assert.equal(text.includes(c.wake), true, c.word + ' 的眉标读不到「' + c.wake + '」');
    assert.equal(text.includes('· 饮食'), false, c.word + ' 的眉标仍有间隔号「· 饮食」');
    assert.equal(text.includes(c.title), true, c.word + ' 的内容标题读不到「' + c.title + '」');
    assert.equal(text.includes('预检确认'), true, c.word + ' 的类型徽章读不到「预检确认」');
  }
  const seen = new Map();
  for (const { c, r } of RUNS) {
    const key = scrub(r.html);
    for (const [other, v] of seen) {
      assert.notEqual(key, v, c.word + ' 与 ' + other + ' 的产物（抹平时间戳后）逐字节相同——同形页没分家');
    }
    seen.set(c.word, key);
  }
});

/* ② 老实物 batch_import_preview.html 的块：两形态各判一遍 */
const IMPORT_CASES = [
  { label: '预览形态（批量导入食品）', case: RUNS[0], mustEmpty: false },
  { label: '校验形态（校验批量导入）', case: RUNS[1], mustEmpty: false },
];
for (const { label, case: cc } of IMPORT_CASES) {
  test('#277 ② 导入预检页的块与列头 —— ' + label, () => {
    const html = cc.r.html;
    const text = visibleText(stripCopyPayload(html));
    /* 页内导航（§五 第 4 行）锚点逐个可解析。 */
    let anchors = 0;
    for (const m of html.matchAll(/<nav class="[^"]*ilife-block-toc[^"]*"[^>]*>([\s\S]*?)<\/nav>/g)) {
      for (const a of m[1].matchAll(/href="#([^"]+)"/g)) {
        anchors += 1;
        assert.equal(html.includes('id="' + a[1] + '"'), true, label + ' 导航锚点解析不到：' + a[1]);
      }
    }
    assert.ok(anchors >= 3, label + ' 页内导航只有 ' + anchors + ' 个锚点');
    for (const id of ['sec-read', 'sec-rows', 'sec-write']) {
      assert.equal(html.includes('id="' + id + '"'), true, label + ' 缺区块 ' + id);
    }
    /* 老实物 `明细` 那一张表的列（逐字）。 */
    for (const col of ['第几条', '食品', '这一条的热量（卡）', '食品库里的热量（卡）', '是否已匹配', '会不会进库', '原因']) {
      assert.equal(text.includes(col), true, label + ' 表列头读不到「' + col + '」');
    }
    /* 老实物 `导入概览` 的读数与 `确认后操作` 那一块。 */
    assert.equal(text.includes('待导入'), true, label + ' 缺「待导入」读数');
    assert.equal(text.includes('确认后操作'), true, label + ' 缺「确认后操作」块');
    assert.equal(text.includes('会写进去的字段'), true, label + ' 缺「会写进去的字段」表');
    /* 裁定 3：口径说明行 ＋ 来源脚注两条恒出。 */
    assert.ok((text.match(/数据来源：/g) ?? []).length >= 1, label + ' 缺来源脚注');
    /* 裁定 7：复制区双按钮。 */
    assert.equal(html.includes('aria-label="复制数据（点开选格式）"'), true, label + ' 缺「复制数据」按钮');
    assert.equal(html.includes('ilife-copy-log'), true, label + ' 缺「复制日志」按钮');
    /* 裁定 1：可见文本零机器话（复制载荷已剥）。 */
    const bad = machineBad(html);
    assert.deepEqual(bad, [], label + ' 可见文本里有机器话：' + bad.join('　'));
  });
}

test('#277 ② 校验形态与预览形态各自认自己的读数', () => {
  const validate = visibleText(stripCopyPayload(RUNS[1].r.html));
  const preview = visibleText(stripCopyPayload(RUNS[0].r.html));
  for (const col of ['通过', '失败', '通过率']) {
    assert.equal(validate.includes(col), true, '校验形态缺「' + col + '」');
  }
  for (const col of ['食品库里有同名的', '食品库里没有的', '合计热量', '会新增', '会跳过', '会失败']) {
    assert.equal(preview.includes(col), true, '预览形态缺「' + col + '」');
  }
  /* #581 · 副题只留结论一句（三计数由「这次的处置」读数卡说，不再顿号并列）。 */
  for (const [label, text] of [['预览形态', preview], ['校验形态', validate]]) {
    assert.ok(/食品库对照＋合计试算：共 \d+ 条，合计 \d+ 卡。/.test(text),
      label + '的副题不是一句话结论');
  }
});

/* ② 老实物 nutrition_label_wizard.html 的块：八个字段逐字 ＋ 不确定标记 */
for (const [i, label] of [[2, '记一餐'], [3, '补记一餐']]) {
  const cc = RUNS[i];
  test('#277 ② 营养表确认页的字段与标记 —— ' + label, () => {
    const html = cc.r.html;
    const text = visibleText(stripCopyPayload(html));
    for (const id of ['sec-read', 'sec-photo', 'sec-fields', 'sec-write']) {
      assert.equal(html.includes('id="' + id + '"'), true, label + ' 缺区块 ' + id);
    }
    /* 老实物那八个字段名（`nutrition_label_wizard.html:272-293`）逐字。 */
    for (const f of ['热量 (kcal)', '蛋白质 (g)', '脂肪 (g)', '饱和脂肪 (g)', '碳水 (g)', '糖 (g)', '膳食纤维 (g)', '钠 (mg)']) {
      assert.equal(text.includes(f), true, label + ' 字段表读不到「' + f + '」');
    }
    assert.equal(text.includes('营养表照片'), true, label + ' 缺「营养表照片」一行');
    assert.equal(text.includes('补录日期'), true, label + ' 缺「补录日期」一行');
    assert.equal(text.includes('会写进去的字段'), true, label + ' 缺「会写进去的字段」表');
    assert.equal(html.includes('precheck-tag'), true, label + ' 缺识别来源标记（老实物 `.diff-tag`）');
    const bad = machineBad(html);
    assert.deepEqual(bad, [], label + ' 可见文本里有机器话：' + bad.join('　'));
  });
}

test('#277 ② 补记那一支按给定日期，记一餐那一支写「今天」', () => {
  const back = visibleText(stripCopyPayload(RUNS[3].r.html));
  const today = visibleText(stripCopyPayload(RUNS[2].r.html));
  assert.equal(back.includes(SEED_TODAY), true, '补记那一支读不到给定日期 ' + SEED_TODAY);
  assert.equal(today.includes('今天'), true, '记一餐那一支读不到「今天」');
});

test('#277 ② 识别不确定的格子有标记，其余没有', () => {
  /* **钉形状、不钉人话**（`t425` 裁定 11 的教训）：判的是那两颗标记的类名与区块，不是整句文案——
     文案以后要改，形状不该跟着改。 */
  const marks = (h) => (h.match(/precheck-tag is-check/g) ?? []).length;
  const dir = freshDir('uncertain');
  const r = runOk(dir, 'calorie.view.label-precheck', {
    productName: '酸奶', calories: 120, protein: 6, carbohydrates: 10, fat: 3, uncertain: 'protein,fat',
  }, '不定标记');
  assert.equal(marks(r.html), 2, '标了两格不确定，产物里的「要你核对」标记数不是 2');
  assert.equal(r.html.includes('id="sec-check"'), true, '有不确定的格子却没出「要核对的格子」区块');
  assert.equal(visibleText(stripCopyPayload(r.html)).includes('有 2 格识别不确定'), true, '不确定格数没报对');
  const r2 = runOk(freshDir('certain'), 'calorie.view.label-precheck',
    { productName: '酸奶', calories: 120, protein: 6 }, '全确定');
  assert.equal(marks(r2.html), 0, '没标 uncertain 却出了「要你核对」标记');
  assert.equal(r2.html.includes('id="sec-check"'), false, '没标 uncertain 却出了「要核对的格子」区块');
});

/* ③ 确认 → 执行链路：确认页给出字段与值 ＋ 那条写命令原样能跑且真写进库 */
test('#277 ③ 导入预检页 → calorie.product.import 真写进库', () => {
  const cc = RUNS[0];
  const text = visibleText(stripCopyPayload(cc.r.html));
  assert.equal(text.includes('食品名'), true, '确认页没有把「会写进去的字段」摆出来（食品名）');
  assert.equal(text.includes('热量'), true, '确认页没有把「会写进去的字段」摆出来（热量）');
  const line = writeCommandOf(cc.r.html, 'calorie.product.import');
  assert.ok(line !== null, '确认页的复制日志第 4 段里没有那条写命令原文');
  const before = countOf(cc.dir, 'nutrition_products');
  const w = runCommandLine(cc.dir, line);
  assert.equal(w.status, 0, '按确认页给的那条命令跑写库失败：exit=' + w.status + ' ' + String(w.stderr).slice(-240));
  const after = countOf(cc.dir, 'nutrition_products');
  assert.equal(after, before + 1, '写后回读：食品库 ' + before + ' → ' + after + '，没真写进去');
  console.log('READING #277 ③ 导入 写前=' + before + ' 写后=' + after);
});

test('#277 ③ 营养表确认页 → calorie.diet.add 真写进库', () => {
  const cc = RUNS[2];
  const text = visibleText(stripCopyPayload(cc.r.html));
  assert.equal(text.includes('食物名'), true, '确认页没有把「会写进去的字段」摆出来（食物名）');
  const line = writeCommandOf(cc.r.html, 'calorie.diet.add');
  assert.ok(line !== null, '确认页的复制日志第 4 段里没有那条写命令原文');
  const before = countOf(cc.dir, 'food_log');
  const w = runCommandLine(cc.dir, line);
  assert.equal(w.status, 0, '按确认页给的那条命令跑写库失败：exit=' + w.status + ' ' + String(w.stderr).slice(-240));
  const after = countOf(cc.dir, 'food_log');
  assert.equal(after, before + 1, '写后回读：饮食记录 ' + before + ' → ' + after + '，没真写进去');
  console.log('READING #277 ③ 营养表 写前=' + before + ' 写后=' + after);
});

/* ④ 两态：库为空仍出完整页；一条都进不了库时空态句 ＋ 引导句 */
test('#277 ④ 库为空：导入预检页仍 exit 0 且是完整文档', () => {
  const dir = freshDir('emptydb', false);
  const r = runOk(dir, 'calorie.view.batch-import-preview', { items: [{ productName: '燕麦', calories: 389 }] }, '空库');
  assertCompleteDoc(r.html, '空库');
  const text = visibleText(stripCopyPayload(r.html));
  assert.equal(text.includes('食品库里没有这些食物'), true, '空库那一态没给「食品库里没有」的说明块');
  console.log('READING #277 ④ 空库 exit=0 bytes=' + r.bytes);
});

test('#277 ④ 一条都进不了库：空态句 ＋ 引导句', () => {
  const dir = freshDir('allempty');
  /* 缺必填的营养数字 ⇒ 逐行校验全失败 ⇒ 这一趟一条都进不了库。 */
  const r = runOk(dir, 'calorie.view.batch-import-preview',
    { items: [{ productName: '只有名字' }], entry: 'precheck' }, '全失败');
  const text = visibleText(stripCopyPayload(r.html));
  assert.equal(text.includes('这次一条都进不了食品库'), true, '缺空态句');
  assert.equal(text.includes('再说一次「批量导入食品」'), true, '空态句后缺「怎么记第一条」的引导句');
  assert.equal(text.includes('失败'), true, '空态页没报失败读数');
  console.log('READING #277 ④ 全失败 exit=0 bytes=' + r.bytes);
});

/* ⑤ 变异钩：把产物改坏一处，同一段断言必红 */
test('#277 ⑤ 变异钩：改坏产物一处，同一段断言必红', () => {
  const html = RUNS[0].r.html;
  const base = (h) => {
    let anchors = 0;
    for (const m of h.matchAll(/<nav class="[^"]*ilife-block-toc[^"]*"[^>]*>([\s\S]*?)<\/nav>/g)) {
      for (const a of m[1].matchAll(/href="#([^"]+)"/g)) {
        if (!h.includes('id="' + a[1] + '"')) anchors += 1;
      }
    }
    return anchors === 0 && h.includes('id="sec-write"');
  };
  assert.equal(base(html), true, '原样产物本该通过这一段');
  const broken = html.replace('id="sec-write"', 'id="sec-removed"');
  assert.equal(base(broken), false, '把「确认后操作」那一块摘掉之后这一段仍通过——断言是永真的');
});
