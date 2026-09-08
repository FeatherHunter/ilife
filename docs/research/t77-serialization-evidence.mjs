// #77 复制文本序列化证据（可复跑 ＋ 确定性；D6／S-5）。
//
// 复跑：pnpm build && node docs/research/t77-serialization-evidence.mjs
//       pnpm build && node docs/research/t77-serialization-evidence.mjs --out docs/research/t77-serialization-evidence.md
//
// 内容（与契约 §3.4「行为补遗」逐条对应）：
//   §1 5 个 shape × 3 个 format 的**实际产出文本**（逐条对应 `DATA_TEXT_PROJECTIONS`）
//   §2 6 段日志 × 3 个 format（逐段对应 `LOG_SECTION_SOURCES`）＋ `(未知)`／`未填写` 实证
//   §3 敏感行判定与掩码（字面 true 判定 ＋ 三 format 掩码 ＋ 原文不出现）
//   §4 三个错误码逐码可达（实际 message）＋ 判定次序 ＋ 失败不返空
//   §5 断言清单（任一不成立即 exit 1，绝不静默变绿）
//
// 确定性：不读时钟、不读环境变量、不遍历文件系统；输出只由冻结常量与本文夹具决定。
// 第二真相纪律：本文只从 `dist` 读冻结常量，**不自带副本**（缺 dist 时显式报错提示先 build）。
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../../packages/base-render/dist/index.js', import.meta.url);
if (!existsSync(fileURLToPath(DIST))) {
  console.error('缺 dist：请先 `pnpm build`（本脚本只读冻结常量，不自带副本）');
  process.exit(1);
}

const {
  BASE_PAINT_CONTRACT_VERSION,
  COPY_FORMATS,
  CSV_DIALECT,
  DATA_TEXT_PROJECTIONS,
  LOG_SECTIONS,
  LOG_SECTION_SOURCES,
  LOG_SECTION_TITLES,
  LOG_UNKNOWN_PLACEHOLDER,
  SENSITIVE_ROW_RULE,
  SERIALIZABLE_SHAPES,
  TEXT_EMPTY_PLACEHOLDER,
  TEXT_ERROR_CODES,
  TEXT_HEADER_TEMPLATE,
  TEXT_JSON_INDENT,
  TEXT_JSON_LT_RULE,
  TEXT_SENSITIVE_MASK,
  buildDataText,
  buildLogText,
  copyText,
} = await import(DIST.href);

const LF = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);
const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const OUT_FILE = outIndex >= 0 ? argv[outIndex + 1] : null;

/* ── 断言收集 ─────────────────────────────────────────────── */

const checks = [];
const vis = (v) => String(v).split(String.fromCharCode(13)).join('<CR>').split(LF).join('<LF>');
const check = (ok, name, detail) => { checks.push({ ok: ok === true, name, detail: detail ?? '' }); };
const eq = (actual, expected, name) =>
  check(actual === expected, name, '实测 ' + vis(actual) + '，期望 ' + vis(expected));
const header = (skill, key) => TEXT_HEADER_TEMPLATE.split('{skill}').join(skill).split('{key}').join(key);

/* ── 夹具（5 个 shape；含空值、敏感行、含分隔符／引号／换行的值） ── */

const SECRET = { [SENSITIVE_ROW_RULE.textField]: '超级密码', [SENSITIVE_ROW_RULE.flagField]: SENSITIVE_ROW_RULE.flagValue };
const SAMPLES = [
  ['stat', { metrics: { 热量: 1800, 蛋白质: 92.5, 备注: null, 密码: SECRET } }],
  ['list', { items: ['第一条', 42, { name: '对象项' }, SECRET], total: 4 }],
  ['detail', { item: { 名称: '台灯', 价格: 199, 备注: null, 备注2: 'a,b', 备注3: 'say "hi"' } }],
  ['receipt', { ok: false, message: '金额格式错误' }],
  ['analysis', { summary: '本周热量偏高 </script> <b>' }],
];
const envelope = (shape, data) => ({ version: BASE_PAINT_CONTRACT_VERSION, skill: 'calorie', shape, key: 'calorie.demo', data });
const COPY_LOG = {
  thinking: '先查库再算',
  dataStructure: 'items[]',
  callChain: 'read → rank',
  timestamp: '2026-01-02T03:04:05',
  exception: '无',
};

/* ── §1 逐 shape × 逐 format ──────────────────────────────── */

const parts = [];
parts.push('# #77 复制文本序列化 · 证据快照');
parts.push('');
parts.push('> 生成：`node docs/research/t77-serialization-evidence.mjs --out docs/research/t77-serialization-evidence.md`'
  + '（先 `pnpm build`；确定性输出，重跑逐字节相同）。');
parts.push('> 机读真相源：`packages/base-render/src/spec/text.ts`；行为补遗：`docs/base-paint-contract.md` §3.4。');
parts.push('> 换行在**行内**以 `<LF>` 标出；围栏块内为**实际产出**（含真实换行）。');
parts.push('');
parts.push('## 0. 口径与常量');
parts.push('');
parts.push('| 项 | 值 |');
parts.push('|---|---|');
parts.push('| `COPY_FORMATS` | `' + [...COPY_FORMATS].join('`／`') + '`（缺省 `text`） |');
parts.push('| `SERIALIZABLE_SHAPES` | `' + [...SERIALIZABLE_SHAPES].join('`／`') + '` |');
parts.push('| `TEXT_HEADER_TEMPLATE` | `' + TEXT_HEADER_TEMPLATE + '` |');
parts.push('| `TEXT_EMPTY_PLACEHOLDER` / `LOG_UNKNOWN_PLACEHOLDER` | `' + TEXT_EMPTY_PLACEHOLDER + '`／`' + LOG_UNKNOWN_PLACEHOLDER + '` |');
parts.push('| `TEXT_SENSITIVE_MASK` | `' + TEXT_SENSITIVE_MASK + '` |');
parts.push('| `TEXT_JSON_INDENT` / `TEXT_JSON_LT_RULE` | `' + TEXT_JSON_INDENT + '`／`' + BACKSLASH + TEXT_JSON_LT_RULE + '` |');
parts.push('| `CSV_DIALECT` | `' + CSV_DIALECT.header.join(',') + '`／`' + CSV_DIALECT.quote + '`／`' + CSV_DIALECT.quoteEscape + '`／' + CSV_DIALECT.lineEnding + ' |');
parts.push('| `TEXT_ERROR_CODES` | `' + [...TEXT_ERROR_CODES].join('`／`') + '` |');
parts.push('');
parts.push('## 1. 逐 shape × 逐 format（A2／A4）');
parts.push('');

for (const [shape, data] of SAMPLES) {
  const projection = DATA_TEXT_PROJECTIONS[shape];
  const env = envelope(shape, data);
  parts.push('### `' + shape + '` — 投影表 `' + JSON.stringify({ body: projection.body, tail: projection.tail, csvSections: [...projection.csvSections] }) + '`');
  parts.push('');
  parts.push('`data`：`' + vis(JSON.stringify(data)) + '`');
  parts.push('');
  for (const format of COPY_FORMATS) {
    const out = buildDataText({ envelope: env, format });
    parts.push('**`' + format + '`**（' + out.split(LF).length + ' 行）');
    parts.push('');
    parts.push('```text');
    parts.push(out);
    parts.push('```');
    parts.push('');
    // 断言：text 行 = 输出头 ＋ 投影行；csv 表头恒为 CSV_DIALECT.header；json 键恒为 envelope 五字段
    if (format === 'text') {
      const lines = out.split(LF);
      eq(lines[0], header('calorie', 'calorie.demo'), shape + '：text 首行 = TEXT_HEADER_TEMPLATE 替换位');
      check(!out.includes('&lt;') && !out.includes('&amp;') && !out.includes('&quot;'), shape + '：text 不转 HTML（零 HTML 实体）');
      check(shape !== 'analysis' || out.includes('</script>'), 'analysis：含 `</script>` 的值在 text 口径原样出现');
    } else if (format === 'json') {
      const parsed = JSON.parse(out);
      eq(JSON.stringify(Object.keys(parsed)), JSON.stringify(['version', 'skill', 'shape', 'key', 'data']),
        shape + '：json 键名 = envelope 五字段原样');
      // FX-77-3：逐行比对缩进层级（原 `startsWith('  ')` 会让 3 空格缩进也 PASS，无鉴别力）
      const jsonLines = out.split(LF);
      const indents = jsonLines.map((line) => line.length - line.replace(/^ +/, '').length);
      check(indents.every((n) => n % TEXT_JSON_INDENT === 0),
        shape + '：json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍', '缩进序列 ' + JSON.stringify(indents));
      eq(out, JSON.stringify(parsed, null, TEXT_JSON_INDENT).split('<').join(BACKSLASH + TEXT_JSON_LT_RULE),
        shape + '：json 逐行缩进层级逐字节等于 TEXT_JSON_INDENT 规范序列化');
      check(!out.includes('<'), shape + '：json 无裸 `<`（' + BACKSLASH + TEXT_JSON_LT_RULE + ' 规则）');
      check(projection.body in parsed.data, shape + '：json data 含投影表 body 字段');
    } else {
      const first = out.split(LF)[0];
      eq(first, CSV_DIALECT.header.join(CSV_DIALECT.delimiter), shape + '：csv 表头 = CSV_DIALECT.header');
      check(!out.includes(header('calorie', 'calorie.demo')), shape + '：csv 无输出头');
      check(out.split(LF).slice(1).every((l) => l.split(CSV_DIALECT.delimiter).length >= 2), shape + '：csv 两列语义');
    }
  }
}

/* ── §1.5 `undefined` 归一（FX-77-1）＋ 空产出恒非空（FX-77-6） ── */

parts.push('## 1.5 `undefined` 归一与空产出恒非空（FX-77-1／FX-77-6）');
parts.push('');
parts.push('`json` 口径把 `undefined` 属性**归一为 `null` 并保留键**（`JSON.stringify` 默认会**丢键**，'
  + '与「空值保留 `null`、键不省略」冲突）→ 同一输入的三 format **键集／行数一一对应**；'
  + '输出头行**恒存在**（空 `title` 视同缺省、空 `skill`／`key` 按空串替换），故产出恒非空。');
parts.push('');

for (const [label, shape, body, map] of [
  ['`detail.item` 含 `undefined`', 'detail', 'item', { a: null, b: '', c: undefined, d: 0 }],
  ['`stat.metrics` 含 `undefined`', 'stat', 'metrics', { a: undefined, b: null }],
]) {
  const env = envelope(shape, { [body]: map });
  const outs = Object.fromEntries(COPY_FORMATS.map((format) => [format, buildDataText({ envelope: env, format })]));
  const parsed = JSON.parse(outs.json);
  const keys = Object.keys(parsed.data[body]);
  const textBody = outs.text.split(LF).slice(1);
  const csvBody = outs.csv.split(LF).slice(1);
  parts.push('### ' + label);
  parts.push('');
  parts.push('`' + body + '`：`' + vis(JSON.stringify(map)) + '`；输入键集 `' + Object.keys(map).join('`／`')
    + '`（`JSON.stringify` 展示时即丢掉 `undefined` 属性——正是本项要证的行为）');
  parts.push('');
  for (const format of COPY_FORMATS) {
    parts.push('**`' + format + '`**');
    parts.push('');
    parts.push('```text');
    parts.push(outs[format]);
    parts.push('```');
    parts.push('');
  }
  eq(JSON.stringify(keys), JSON.stringify(Object.keys(map)), label + '：json 键集 = 输入键集（`undefined` 保留键）');
  eq(textBody.length, keys.length, label + '：text 主体行数 = json 键数');
  eq(csvBody.length, keys.length, label + '：csv 主体行数 = json 键数');
  check(keys.every((k) => textBody.some((l) => l === k + ': ' + TEXT_EMPTY_PLACEHOLDER || l === k + ': ' + String(map[k]))),
    label + '：每个 json 键在 text 都有对应行');
  check(keys.every((k) => csvBody.some((l) => l.split(CSV_DIALECT.delimiter)[1].startsWith(k + ': '))),
    label + '：每个 json 键在 csv 都有对应行（`row` 列）');
}

{
  // 嵌套对象值内的 `undefined`：三 format 同口径（`text`／`csv` 的对象值经同一 JSON 包装）
  const nested = { item: { 嵌套: { b: undefined, c: 1 } } };
  const outs = Object.fromEntries(COPY_FORMATS.map((format) => [format, buildDataText({ envelope: envelope('detail', nested), format })]));
  eq(JSON.stringify(JSON.parse(outs.json).data.item.嵌套), JSON.stringify({ b: null, c: 1 }),
    '嵌套对象值内的 undefined：json 保留键写 null');
  eq(outs.text.split(LF).slice(-1)[0], '嵌套: {"b":null,"c":1}', '嵌套对象值内的 undefined：text 同口径不丢键');
  eq(outs.csv.split(LF).slice(-1)[0], 'item,"嵌套: {""b"":null,""c"":1}"', '嵌套对象值内的 undefined：csv 同口径不丢键');
}

{
  const noKey = { version: BASE_PAINT_CONTRACT_VERSION, skill: 'calorie', shape: 'stat', data: { metrics: { a: 1 } } };
  const outs = Object.fromEntries(COPY_FORMATS.map((format) => [format, buildDataText({ envelope: noKey, format })]));
  const parsed = JSON.parse(outs.json);
  parts.push('### envelope 缺 `key`（五字段存在性归 #74，本处只证 json 不丢键）');
  parts.push('');
  for (const format of COPY_FORMATS) {
    parts.push('**`' + format + '`**');
    parts.push('');
    parts.push('```text');
    parts.push(outs[format]);
    parts.push('```');
    parts.push('');
  }
  eq(JSON.stringify(Object.keys(parsed)), JSON.stringify(['version', 'skill', 'shape', 'key', 'data']),
    '缺 `key`：json 五键集不缩水');
  eq(parsed.key, null, '缺 `key`：json 写 null（不丢键）');
  eq(outs.text.split(LF)[0], header('calorie', ''), '缺 `key`：text 输出头按空串渲染（行仍在）');
}

{
  parts.push('### 空产出反例（V3 洞 1）：三 format 均非空 ＋ 不触发 `copyText` 空串短路');
  parts.push('');
  parts.push('| 诱因 | format | 产出（`vis`） | 长度 | `copyText` |');
  parts.push('|---|---|---|---|---|');
  for (const [label, input] of [
    ['空投影体（`metrics:{}`）', { envelope: envelope('stat', { metrics: {} }) }],
    ['空 title（`title: \'\'`）', { envelope: envelope('detail', { item: {} }), title: '' }],
    ['空 `skill`／`key`', { envelope: { ...envelope('stat', { metrics: {} }), skill: '', key: '' } }],
  ]) {
    for (const format of COPY_FORMATS) {
      const out = buildDataText({ ...input, format });
      const outcome = await copyText(out, { clipboard: null, fallback: () => true });
      parts.push('| ' + label + ' | `' + format + '` | `' + vis(out) + '` | ' + out.length + ' | '
        + (outcome.ok === true ? 'ok（' + outcome.channel + '）' : '**' + outcome.reason + '**') + ' |');
      check(out.length > 0, label + '：' + format + ' 产出非空');
      check(outcome.ok === true, label + '：' + format + ' 喂 copyText 不走空串短路');
    }
  }
  parts.push('');
}

{
  const deepOut = buildDataText({ envelope: envelope('detail', { item: { a: { b: { c: { d: 1 } } } } }), format: 'json' });
  const deepIndents = deepOut.split(LF).map((line) => line.length - line.replace(/^ +/, '').length);
  eq(JSON.stringify(deepIndents), JSON.stringify([0, 2, 2, 2, 2, 2, 4, 6, 8, 10, 12, 10, 8, 6, 4, 2, 0]),
    '深层 json 缩进逐级恰为 TEXT_JSON_INDENT 的倍数（2／4／6／8／10／12）');
  check(deepIndents.every((n) => n % TEXT_JSON_INDENT === 0),
    '深层 json 每行缩进恒为 TEXT_JSON_INDENT 的整数倍', '缩进序列 ' + JSON.stringify(deepIndents));
}

/* ── §2 6 段日志 × 3 format ──────────────────────────────── */

parts.push('## 2. 6 段日志 × 3 个 format（A3）');
parts.push('');
parts.push('段序恒按 `LOG_SECTIONS`；数据源恒按 `LOG_SECTION_SOURCES`（`scene` ← envelope，其余 ← `copyLog.*`）。');
parts.push('');
parts.push('| 段序 | 段名 | 标题（`LOG_SECTION_TITLES`） | 数据源（`LOG_SECTION_SOURCES`） |');
parts.push('|---|---|---|---|');
LOG_SECTIONS.forEach((section, i) => {
  parts.push('| ' + (i + 1) + ' | `' + section + '` | ' + LOG_SECTION_TITLES[section] + ' | `' + LOG_SECTION_SOURCES[section] + '` |');
});
parts.push('');

const logEnv = envelope('list', SAMPLES[1][1]);
for (const [label, input] of [
  ['`copyLog` 齐全', { envelope: logEnv, copyLog: COPY_LOG }],
  ['`copyLog` 缺省', { envelope: logEnv }],
]) {
  parts.push('### ' + label);
  parts.push('');
  for (const format of COPY_FORMATS) {
    const out = buildLogText({ ...input, format });
    parts.push('**`' + format + '`**');
    parts.push('');
    parts.push('```text');
    parts.push(out);
    parts.push('```');
    parts.push('');
  }
  const text = buildLogText(input);
  const lines = text.split(LF);
  eq(lines.length, LOG_SECTIONS.length * 2, label + '：text 行数 = 6 段 × 2 行');
  LOG_SECTIONS.forEach((section, i) => {
    eq(lines[i * 2], LOG_SECTION_TITLES[section], label + '：第 ' + (i + 1) + ' 段标题');
    const source = LOG_SECTION_SOURCES[section];
    const expected = source === 'envelope'
      ? 'calorie.calorie.demo（list）'
      : (input.copyLog === undefined ? LOG_UNKNOWN_PLACEHOLDER : input.copyLog[source.slice(source.indexOf('.') + 1)]);
    eq(lines[i * 2 + 1], expected, label + '：第 ' + (i + 1) + ' 段内容（源 ' + source + '）');
  });
  const parsed = JSON.parse(buildLogText({ ...input, format: 'json' }));
  eq(JSON.stringify(Object.keys(parsed)), JSON.stringify([...LOG_SECTIONS]), label + '：json 键序 = LOG_SECTIONS');
  const csv = buildLogText({ ...input, format: 'csv' }).split(LF);
  eq(csv.length, 1 + LOG_SECTIONS.length, label + '：csv 行数 = 1 表头 + 6 段');
  LOG_SECTIONS.forEach((section, i) => {
    eq(csv[i + 1].split(CSV_DIALECT.delimiter)[0], section, label + '：csv 第 ' + (i + 1) + ' 行 section 列');
  });
}

parts.push('### 空值口径分层实证（`text` 写占位符／`json` 写 `null`／`csv` 写空串）');
parts.push('');
parts.push('同一份 `data`（含空值）与同一份缺段日志，三 format 并排：');
parts.push('');
{
  const env = envelope('detail', { item: { 有值: 'x', 空值: null } });
  const lastLine = (out) => out.split(LF).slice(-1)[0];
  const jsonValue = (out, pick) => JSON.stringify(pick(JSON.parse(out)));
  parts.push('| format | 数据空值（`item.空值 = null`） | 日志缺段（`exception` 缺省） |');
  parts.push('|---|---|---|');
  parts.push('| `text` | `' + vis(lastLine(buildDataText({ envelope: env }))) + '` | `' + LOG_UNKNOWN_PLACEHOLDER + '` |');
  parts.push('| `json` | `' + jsonValue(buildDataText({ envelope: env, format: 'json' }), (p) => p.data.item.空值) + '` | `'
    + jsonValue(buildLogText({ envelope: env, format: 'json' }), (p) => p.exception) + '` |');
  parts.push('| `csv` | `' + vis(lastLine(buildDataText({ envelope: env, format: 'csv' }))) + '` | `'
    + vis(lastLine(buildLogText({ envelope: env, format: 'csv' }))) + '` |');
  parts.push('');
  const textData = buildDataText({ envelope: env });
  const jsonData = buildDataText({ envelope: env, format: 'json' });
  const csvData = buildDataText({ envelope: env, format: 'csv' });
  check(textData.includes(TEXT_EMPTY_PLACEHOLDER), '数据空值：text 写「未填写」');
  check(JSON.parse(jsonData).data.item.空值 === null, '数据空值：json 写 null');
  check(csvData.split(LF).slice(-1)[0].endsWith(': '), '数据空值：csv 写空串（标签后为空）');
  const textLog = buildLogText({ envelope: env });
  const jsonLog = buildLogText({ envelope: env, format: 'json' });
  const csvLog = buildLogText({ envelope: env, format: 'csv' });
  check(textLog.includes(LOG_UNKNOWN_PLACEHOLDER), '日志缺段：text 写「(未知)」');
  check(JSON.parse(jsonLog).exception === null, '日志缺段：json 写 null');
  check(csvLog.split(LF).slice(-1)[0] === 'exception,', '日志缺段：csv 写空串');
  check(!textLog.includes(TEXT_EMPTY_PLACEHOLDER), '两个占位符不串味：日志不得写「未填写」');
  check(!textData.includes(LOG_UNKNOWN_PLACEHOLDER), '两个占位符不串味：数据不得写「(未知)」');
}

/* ── §3 敏感行 ───────────────────────────────────────────── */

parts.push('## 3. 敏感行判定与掩码（A5）');
parts.push('');
parts.push('判定只看源值的 `' + SENSITIVE_ROW_RULE.flagField + '` 是否为**字面** `' + SENSITIVE_ROW_RULE.flagValue
  + '`（不看文本内容、不做真值判定）；掩码恒为 `' + SENSITIVE_ROW_RULE.mask + '`。');
parts.push('');
parts.push('| `sensitive` 取值 | 判为敏感行？ | `text` 产出 | `json` 值 | `csv` row 列 |');
parts.push('|---|---|---|---|---|');
for (const flag of [true, 1, 'yes', 'true', {}, [], null]) {
  const data = { metrics: { pwd: { text: '超级密码', sensitive: flag } } };
  const env = envelope('stat', data);
  const text = buildDataText({ envelope: env });
  const json = buildDataText({ envelope: env, format: 'json' });
  const csv = buildDataText({ envelope: env, format: 'csv' });
  const masked = text.includes(TEXT_SENSITIVE_MASK);
  parts.push('| `' + JSON.stringify(flag) + '` | ' + (masked ? '**是**' : '否') + ' | `' + vis(text.split(LF).slice(1).join('` ／ `')) + '` | `'
    + vis(JSON.stringify(JSON.parse(json).data.metrics.pwd)) + '` | `' + vis(csv.split(LF).slice(-1)[0]) + '` |');
  eq(masked, flag === true, 'sensitive=' + JSON.stringify(flag) + ' 的判定只认字面 true');
  check(flag === true ? !text.includes('超级密码') : text.includes('超级密码'),
    'sensitive=' + JSON.stringify(flag) + '：敏感行原文不出现／非敏感行原文必须出现');
}
parts.push('');
{
  const env = envelope('stat', { metrics: { 账号: 'a', 密码: SECRET } });
  const text = buildDataText({ envelope: env });
  const lines = text.split(LF);
  check(lines[2] === TEXT_SENSITIVE_MASK, 'text：掩码行恒为 TEXT_SENSITIVE_MASK');
  check(lines[3] === SENSITIVE_ROW_RULE.textNotice, 'text：掩码行之后紧跟一行 textNotice');
  check(JSON.parse(buildDataText({ envelope: env, format: 'json' })).data.metrics.密码 === TEXT_SENSITIVE_MASK, 'json：该键值 = mask');
  check(!buildDataText({ envelope: env, format: 'json' }).includes(SENSITIVE_ROW_RULE.textNotice), 'json：不得夹中文提示');
  const csvRows = buildDataText({ envelope: env, format: 'csv' }).split(LF);
  check(csvRows.slice(-1)[0].split(CSV_DIALECT.delimiter)[0] === DATA_TEXT_PROJECTIONS.stat.csvSections[0], 'csv：section 列保留投影分组名');
  check(csvRows.slice(-1)[0].split(CSV_DIALECT.delimiter)[1] === TEXT_SENSITIVE_MASK, 'csv：row 列 = mask');
  parts.push('三 format 掩码实证（`stat.metrics = { 账号, 密码: {text, sensitive:true} }`）：');
  parts.push('');
  for (const format of COPY_FORMATS) {
    parts.push('```text');
    parts.push(buildDataText({ envelope: env, format }));
    parts.push('```');
    parts.push('');
  }
}

/* ── §4 错误码 ───────────────────────────────────────────── */

parts.push('## 4. 三个错误码逐码可达（A6）');
parts.push('');
parts.push('失败一律抛错（不返空、不降级）；判定次序：`format-unknown` → `shape-unsupported` → `structure-invalid`。');
parts.push('');
parts.push('| code | 触发输入 | 实际 `name` | 实际 `message` | 有返回值？ |');
parts.push('|---|---|---|---|---|');

const ERROR_CASES = [
  ['shape-unsupported', 'envelope.shape = fallback', () => buildDataText({ envelope: envelope('fallback', { reason: '缺数据', degraded: true }) })],
  ['shape-unsupported', 'envelope.shape = bogus（闭集外）', () => buildDataText({ envelope: envelope('bogus', {}) })],
  ['structure-invalid', 'stat 缺 metrics', () => buildDataText({ envelope: envelope('stat', {}) })],
  ['structure-invalid', 'list.items 非数组', () => buildDataText({ envelope: envelope('list', { items: 'x' }) })],
  ['structure-invalid', 'receipt 缺 message', () => buildDataText({ envelope: envelope('receipt', { ok: true }) })],
  ['structure-invalid', 'analysis.summary 空串', () => buildDataText({ envelope: envelope('analysis', { summary: '' }) })],
  ['structure-invalid', 'title 非字符串', () => buildDataText({ envelope: envelope('stat', { metrics: {} }), title: 42 })],
  ['structure-invalid', 'buildLogText：data 不符 shape（U14 同口径）', () => buildLogText({ envelope: envelope('stat', { metrics: 'no' }) })],
  ['format-unknown', 'buildDataText：format = yaml', () => buildDataText({ envelope: envelope('stat', { metrics: {} }), format: 'yaml' })],
  ['format-unknown', 'buildLogText：format = yaml', () => buildLogText({ envelope: envelope('stat', { metrics: {} }), format: 'yaml' })],
];
const seen = new Set();
for (const [code, label, fn] of ERROR_CASES) {
  const SENTINEL = 'NOT-RETURNED';
  let returned = SENTINEL;
  let err = null;
  try { returned = fn(); } catch (e) { err = e; }
  const noReturn = returned === SENTINEL;
  parts.push('| `' + code + '` | ' + label + ' | `' + (err ? err.name : '(未抛错)') + '` | ' + (err ? err.message : '—') + ' | '
    + (noReturn ? '无（已抛错）' : '**有：' + vis(returned) + '**') + ' |');
  check(err !== null, code + '：必须抛错');
  check(noReturn, code + '：不得返回任何值');
  if (err) {
    eq(err.name, 'TextError', code + '：错误名恒为 TextError');
    eq(err.code, code, code + '：错误码命中');
    check(typeof err.message === 'string' && err.message.length > 0, code + '：message 可辨因');
  }
  seen.add(code);
}
parts.push('');
eq([...seen].sort().join(','), [...TEXT_ERROR_CODES].sort().join(','), '三个错误码逐码可达（TEXT_ERROR_CODES 全覆盖）');
{
  // 判定次序：同一坏输入叠加多个违规 → 首个命中即抛
  const cases = [
    ['format-unknown', { envelope: envelope('fallback', { bad: true }), format: 'yaml' }],
    ['shape-unsupported', { envelope: envelope('fallback', { bad: true }), title: 42 }],
    ['structure-invalid', { envelope: envelope('stat', { metrics: 1 }), title: 42 }],
  ];
  for (const [code, input] of cases) {
    let err = null;
    try { buildDataText(input); } catch (e) { err = e; }
    eq(err === null ? '(未抛错)' : err.code, code, '判定次序：叠加违规时首个命中 = ' + code);
  }
}

/* ── §5 断言清单 ─────────────────────────────────────────── */

parts.push('## 5. 断言清单（任一不成立即 exit 1）');
parts.push('');
parts.push('共 ' + checks.length + ' 条，失败 ' + checks.filter((c) => !c.ok).length + ' 条。');
parts.push('');
parts.push('| # | 结果 | 断言 | 实测／期望 |');
parts.push('|---|---|---|---|');
checks.forEach((c, i) => {
  parts.push('| ' + (i + 1) + ' | ' + (c.ok ? 'PASS' : '**FAIL**') + ' | ' + c.name + ' | ' + (c.detail === '' ? '—' : c.detail) + ' |');
});
parts.push('');

const text = parts.join(LF);
if (OUT_FILE === null) {
  process.stdout.write(text);
} else {
  writeFileSync(resolve(process.cwd(), OUT_FILE), text, 'utf8');
  process.stdout.write('写入 ' + OUT_FILE + '（' + checks.length + ' 条断言，失败 ' + checks.filter((c) => !c.ok).length + ' 条）' + LF);
}
const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  for (const f of failed) console.error('FAIL: ' + f.name + ' — ' + f.detail);
  process.exit(1);
}
