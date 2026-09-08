// #77 复制文本序列化守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（对齐旧基线 `test_components.py` 7 条序列化用例的行为面，见契约 §8.10 A9）：
//   A2 逐 shape 投影（5 shape × 3 format，字段名恒取 `DATA_TEXT_PROJECTIONS`）
//   A3 6 段日志（段序／数据源恒取 `LOG_SECTIONS`／`LOG_SECTION_SOURCES`）＋ `(未知)`／`未填写` 口径
//   A4 三 format（text／json 的 `<` 与缩进／csv 的 RFC4180 引号与两列语义）
//   A5 敏感行判定（字面 `true`）与三 format 掩码
//   A6 三个错误码逐码可达 ＋ 失败抛错不返空 ＋ 判定次序
//   A9 旧层 7 条序列化用例的行为面逐条对应
//   R-4 与 #76（`copyText` 空串短路）／`ErrorReceiptInput.dataText|logText` 的接线
//
// 纪律：期望值**尽量从冻结常量派生**（`TEXT_HEADER_TEMPLATE`／`DATA_TEXT_PROJECTIONS`／`CSV_DIALECT`…），
// 契约 §3.4.1 登记为「不冻结也不排除」（owner #77）的**行书写形式**与逐 shape 样本按本票定案字面钉死
// （值必须被钉住才可鉴别，属正常契约守卫；**不另造第二份投影表**）；不删、不放宽、不恒真化任何断言。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_PAINT_CONTRACT_VERSION,
  COPY_FORMATS,
  CSV_DIALECT,
  DATA_TEXT_PROJECTIONS,
  DEFAULT_DATA_ATTR,
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
  renderErrorReceipt,
} from '../dist/index.js';

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BACKSLASH = String.fromCharCode(92);
const DELIM = CSV_DIALECT.delimiter;
const QUOTE = CSV_DIALECT.quote;

/* ── 测试小件 ─────────────────────────────────────────────── */

/** envelope 夹具（五字段；`data` 由调用方给）。 */
function envelope(shape, data, over = {}) {
  return { version: BASE_PAINT_CONTRACT_VERSION, skill: 'skill-a', shape, key: 'skill-a.key', data, ...over };
}

/** 输出头（逐位替换 `TEXT_HEADER_TEMPLATE` 的两个替换位）。 */
function headerOf(skill, key) {
  return TEXT_HEADER_TEMPLATE.split('{skill}').join(skill).split('{key}').join(key);
}

/** 模板**单趟**展开（`{字段}` ← 给定值）：插入的值不再被扫描（FX-77-8-3 同口径）。
 *  用于「投影表 header 展开成首行」的行为断言（FX-77-4：不得退化成常量 ↔ 常量比较）。 */
function expandTemplate(template, skill, key) {
  const values = { skill, key };
  let out = '';
  let rest = template;
  for (;;) {
    const open = rest.indexOf('{');
    if (open < 0) return out + rest;
    const close = rest.indexOf('}', open + 1);
    if (close < 0) return out + rest;
    out += rest.slice(0, open) + (values[rest.slice(open + 1, close)] ?? '');
    rest = rest.slice(close + 1);
  }
}

/** 三 format 一起跑（同输入）。 */
function allFormats(build, input) {
  return Object.fromEntries(COPY_FORMATS.map((format) => [format, build({ ...input, format })]));
}

/** 断言抛 `TextError` 且 code 命中；**并证明没有返回值**（失败不返空、不降级）。 */
function throwsCode(fn, code) {
  const SENTINEL = 'SENTINEL-NOT-RETURNED';
  let returned = SENTINEL;
  let err = null;
  try {
    returned = fn();
  } catch (e) {
    err = e;
  }
  assert.equal(returned, SENTINEL, '失败必须抛错，不得返回任何值（code=' + code + '）');
  assert.ok(err !== null, '必须抛错（code=' + code + '）');
  assert.equal(err.name, 'TextError', '错误名恒为 TextError（按 name／code 判定，TextError 不导出）');
  assert.equal(err.code, code);
  assert.equal(typeof err.message, 'string');
  assert.ok(err.message.length > 0, 'message 必须可辨因（一码多义由 message 区分）');
  assert.ok(err instanceof Error, '错误必须是 Error 实例（调用方可按 name／code 判定）');
  return err;
}

/** csv 文本 → 逐行字段数组（只用于**无引号**样本；含引号样本另用 splitCsv 判）。
 *  含引号时**显式失败**，避免朴素 `split` 静默误解析（V2 断言质量 nit 7）。 */
function csvRows(text) {
  assert.ok(!text.includes(QUOTE), 'csvRows 只接受无引号样本；含引号样本请用 parseCsv');
  return text.split(LF).map((line) => line.split(DELIM));
}

/** 严格 CSV 解析（RFC4180：引号包裹 ＋ 双写引号），用于断言引号转义样本。 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === QUOTE && text[i + 1] === QUOTE) { field += QUOTE; i += 1; continue; }
      if (ch === QUOTE) { quoted = false; continue; }
      field += ch;
      continue;
    }
    if (ch === QUOTE) { quoted = true; continue; }
    if (ch === DELIM) { row.push(field); field = ''; continue; }
    if (ch === LF) { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

/** 某段的期望文本（`scene` 由 envelope 派生；其余取 `LOG_SECTION_SOURCES` 指出的 copyLog 字段）。 */
function expectedSectionText(section, copyLog, shape) {
  const source = LOG_SECTION_SOURCES[section];
  if (source === 'envelope') return 'skill-a.skill-a.key（' + shape + '）';
  return copyLog[source.slice(source.indexOf('.') + 1)];
}

/* 每个 shape 的合规 `data` 与「主体行/收尾行」期望值（字段名一律从投影表读）。
 * `*Csv` 变体 = 同一行的 csv 口径（空值位置写空串，不写「未填写」，`contract:610`）。 */
const csvVariant = (line) => (line.endsWith(': ' + TEXT_EMPTY_PLACEHOLDER) ? line.slice(0, -TEXT_EMPTY_PLACEHOLDER.length) : line);
const SAMPLES = {
  stat: {
    data: { metrics: { 热量: 1800, 蛋白质: 92.5, 备注: null } },
    bodyLines: ['热量: 1800', '蛋白质: 92.5', '备注: ' + TEXT_EMPTY_PLACEHOLDER],
    tailLines: [],
  },
  list: {
    data: { items: ['第一条', 42, { name: '对象项' }], total: 3 },
    bodyLines: ['第一条', '42', '{"name":"对象项"}'],
    tailLines: ['total: 3'],
  },
  detail: {
    data: { item: { 名称: '台灯', 价格: 199, 备注: null } },
    bodyLines: ['名称: 台灯', '价格: 199', '备注: ' + TEXT_EMPTY_PLACEHOLDER],
    tailLines: [],
  },
  receipt: {
    data: { ok: true, message: '已写入' },
    bodyLines: ['ok: true'],
    tailLines: ['message: 已写入'],
  },
  analysis: {
    data: { summary: '本周热量偏高' },
    bodyLines: ['summary: 本周热量偏高'],
    tailLines: [],
  },
};

/* ── A2 逐 shape 投影 ─────────────────────────────────────── */

describe('#77 逐 shape 投影（A2）', () => {
  it('5 个可序列化 shape 全部有投影规格，且与 SERIALIZABLE_SHAPES 同键集', () => {
    assert.deepEqual(Object.keys(DATA_TEXT_PROJECTIONS).sort(), [...SERIALIZABLE_SHAPES].sort());
    assert.ok(!('fallback' in DATA_TEXT_PROJECTIONS), 'fallback 不进复制文本');
  });

  for (const shape of SERIALIZABLE_SHAPES) {
    const sample = SAMPLES[shape];
    const projection = DATA_TEXT_PROJECTIONS[shape];

    it(shape + '：text 行 = 输出头 ＋ 投影主体行 ＋ 投影收尾行', () => {
      const out = buildDataText({ envelope: envelope(shape, sample.data) });
      const lines = out.split(LF);
      assert.deepEqual(lines, [
        headerOf('skill-a', 'skill-a.key'),
        ...sample.bodyLines,
        ...sample.tailLines,
      ]);
      // 行为断言（FX-77-4）：首行恒等于**投影表 header** 的替换结果，不是「常量 ↔ 常量」比较——
      // 若实现改用别的表／别的写法，或投影表 header 漂移，此处即红。
      assert.equal(lines[0], expandTemplate(projection.header, 'skill-a', 'skill-a.key'),
        '首行必须由投影表 ' + shape + '.header 展开得到');
    });

    it(shape + '：json 键名 = envelope 五字段原样，data 取投影字段', () => {
      const parsed = JSON.parse(buildDataText({ envelope: envelope(shape, sample.data), format: 'json' }));
      assert.deepEqual(Object.keys(parsed), ['version', 'skill', 'shape', 'key', 'data']);
      assert.equal(parsed.version, BASE_PAINT_CONTRACT_VERSION);
      assert.equal(parsed.skill, 'skill-a');
      assert.equal(parsed.shape, shape);
      assert.equal(parsed.key, 'skill-a.key');
      assert.ok(projection.body in parsed.data, 'data 必须含投影表 body 字段：' + projection.body);
      // 值级保真（V2 审计项 9：此前只断键存在性）：json `data` 逐值等于输入 `data`
      assert.deepEqual(parsed.data, sample.data, 'json data 必须逐值保真（含嵌套对象／数组）');
      // 键集必须逐键等于输入 `data` 的键集（FX-77-4：不再硬编码 `'total'`；凭空多键／丢键即红）
      assert.deepEqual(Object.keys(parsed.data), Object.keys(sample.data),
        'json data 键集必须与输入 data 键集逐键一致（键不省略、不凭空造键）');
      if (projection.tail === null) {
        assert.deepEqual(Object.keys(parsed.data), [projection.body],
          'tail 为 null 的 shape：json data 只含投影表 body 字段，不得凭空出现收尾字段');
      } else {
        assert.ok(projection.tail in parsed.data, 'data 必须含投影表 tail 字段：' + projection.tail);
      }
    });

    it(shape + '：csv 表头 ＋ section 列 = 投影表 csvSections，行序 = 主体行 → 收尾行', () => {
      const out = buildDataText({ envelope: envelope(shape, sample.data), format: 'csv' });
      const rows = parseCsv(out);
      assert.deepEqual(rows[0], [...CSV_DIALECT.header]);
      const bodySection = projection.csvSections[0];
      const bodyLinesCsv = sample.bodyLines.map(csvVariant);
      const tailLinesCsv = sample.tailLines.map(csvVariant);
      const bodyCount = bodyLinesCsv.length;
      for (let i = 0; i < bodyCount; i += 1) {
        assert.equal(rows[i + 1][0], bodySection, '第 ' + (i + 1) + ' 行 section 必须是 ' + bodySection);
        assert.equal(rows[i + 1][1], bodyLinesCsv[i]);
      }
      if (projection.tail === null) {
        assert.equal(rows.length, 1 + bodyCount, '无收尾行时 csv 行数 = 1 表头 + 主体行数');
      } else {
        assert.equal(rows.length, 2 + bodyCount, '有收尾行时 csv 行数 = 1 表头 + 主体行 + 1 收尾行');
        assert.equal(rows[rows.length - 1][0], projection.csvSections[1]);
        assert.equal(rows[rows.length - 1][1], tailLinesCsv[0]);
      }
    });
  }

  it('投影表之外的 data 字段不进 text／csv（字段来源恒取投影表，不自造第二份）', () => {
    const data = { metrics: { a: 1 }, 额外字段: '不得出现' };
    const text = buildDataText({ envelope: envelope('stat', data) });
    const csv = buildDataText({ envelope: envelope('stat', data), format: 'csv' });
    assert.ok(!text.includes('不得出现'), 'text 只输出投影字段');
    assert.ok(!csv.includes('不得出现'), 'csv 只输出投影字段');
    // json 是「原样」口径：多余字段随 envelope 透传（契约 §3.4 行为补遗登记）
    const parsed = JSON.parse(buildDataText({ envelope: envelope('stat', data), format: 'json' }));
    assert.equal(parsed.data.额外字段, '不得出现');
  });

  it('fallback 降级载荷 → shape-unsupported（不进复制文本）', () => {
    const fb = envelope('fallback', { reason: '缺数据', degraded: true });
    throwsCode(() => buildDataText({ envelope: fb }), 'shape-unsupported');
    throwsCode(() => buildDataText({ envelope: fb, format: 'json' }), 'shape-unsupported');
    throwsCode(() => buildDataText({ envelope: fb, format: 'csv' }), 'shape-unsupported');
    throwsCode(() => buildLogText({ envelope: fb }), 'shape-unsupported');
  });

  it('六形状之外的 shape → shape-unsupported（闭集判定，不静默降级）', () => {
    for (const shape of ['bogus', '', 42, null, undefined]) {
      throwsCode(() => buildDataText({ envelope: envelope(shape, {}) }), 'shape-unsupported');
    }
  });
});

/* ── A4 三 format ────────────────────────────────────────── */

describe('#77 三 format（A4）', () => {
  it('format 缺省 = COPY_FORMATS 首项（行为面：与显式传首项逐字相同，其余 format 不同）', () => {
    const withDefault = buildDataText({ envelope: envelope('analysis', SAMPLES.analysis.data) });
    for (const format of COPY_FORMATS) {
      const explicit = buildDataText({ envelope: envelope('analysis', SAMPLES.analysis.data), format });
      // FX-77-4：不再只钉 `COPY_FORMATS[0] === 'text'` 这类常量；缺省行为必须**恰好**等于首项
      assert.equal(withDefault === explicit, format === COPY_FORMATS[0],
        '缺省 format 必须逐字等于 ' + COPY_FORMATS[0] + ' 的显式产出（' + format + ' 应'
        + (format === COPY_FORMATS[0] ? '' : '不') + '相同）');
    }
  });

  it('text：输出头恒为 TEXT_HEADER_TEMPLATE 替换位；title 覆盖；occurredAt 追加时间行', () => {
    const base = buildDataText({ envelope: envelope('analysis', SAMPLES.analysis.data) });
    assert.equal(base.split(LF)[0], headerOf('skill-a', 'skill-a.key'));
    const titled = buildDataText({ envelope: envelope('analysis', SAMPLES.analysis.data), title: '自定义标题' });
    assert.equal(titled.split(LF)[0], '自定义标题', 'title 覆盖输出头');
    const timed = buildDataText({ envelope: envelope('analysis', SAMPLES.analysis.data), occurredAt: '2026-01-02 03:04' });
    const lines = timed.split(LF);
    assert.equal(lines[0], headerOf('skill-a', 'skill-a.key'));
    assert.equal(lines[1], '时间: 2026-01-02 03:04', '时间行紧随输出头');
    assert.deepEqual(lines.slice(2), SAMPLES.analysis.bodyLines);
  });

  it('text：不转 HTML，行内换行替换为空格（行数不变）', () => {
    const out = buildDataText({ envelope: envelope('analysis', { summary: 'a<b>&c' + LF + 'd' + CR + 'e' }) });
    const lines = out.split(LF);
    assert.equal(lines.length, 2, '行内换行不得产生新行');
    assert.equal(lines[1], 'summary: a<b>&c d e');
    assert.ok(out.includes('a<b>&c'), 'text 口径不转 HTML');
  });

  it('json：缩进 TEXT_JSON_INDENT；无输出头（title／occurredAt 不参与）', () => {
    const out = buildDataText({
      envelope: envelope('analysis', SAMPLES.analysis.data),
      format: 'json',
      title: '不得出现',
      occurredAt: '2026-01-02 03:04',
    });
    assert.ok(!out.includes('不得出现'), 'json 口径无输出头');
    assert.ok(!out.includes('时间'), 'json 口径无时间行');
    assert.equal(out.split(LF)[1].slice(0, TEXT_JSON_INDENT), ' '.repeat(TEXT_JSON_INDENT));
    assert.notEqual(out.split(LF)[1].slice(TEXT_JSON_INDENT, TEXT_JSON_INDENT + 1), ' ');
  });

  it('json：`<` 一律写成反斜杠 + TEXT_JSON_LT_RULE（防断标签），其余字符不动', () => {
    const out = buildDataText({ envelope: envelope('analysis', { summary: '</script><b>' }), format: 'json' });
    assert.ok(out.includes(BACKSLASH + TEXT_JSON_LT_RULE), '必须出现反斜杠 + u003c');
    assert.ok(!out.includes('<'), 'json 口径不得出现裸 `<`');
    assert.ok(out.includes('</script>'.slice(1)), '只有 `<` 被转义，其余字符原样');
    assert.equal(JSON.parse(out).data.summary, '</script><b>', '转义后仍是合法 JSON 且可还原');
  });

  it('json：空值保留 null，键不省略（不写占位符）', () => {
    const parsed = JSON.parse(buildDataText({ envelope: envelope('detail', { item: { a: null } }), format: 'json' }));
    assert.deepEqual(parsed.data.item, { a: null });
    assert.ok(!JSON.stringify(parsed).includes(TEXT_EMPTY_PLACEHOLDER), 'json 不得出现「未填写」');
    assert.ok(!JSON.stringify(parsed).includes(LOG_UNKNOWN_PLACEHOLDER), 'json 不得出现「(未知)」');
  });

  it('csv：表头恒为 CSV_DIALECT.header，行尾恒按 CSV_DIALECT.lineEnding，无输出头／时间行', () => {
    const out = buildDataText({
      envelope: envelope('stat', SAMPLES.stat.data),
      format: 'csv',
      title: '不得出现',
      occurredAt: '2026-01-02 03:04',
    });
    assert.equal(out.split(LF)[0], CSV_DIALECT.header.join(DELIM));
    assert.ok(!out.includes('不得出现') && !out.includes('时间'), 'csv 口径无输出头与时间行');
    // FX-77-4／FX-77-8-4：不再只钉 `CSV_DIALECT.lineEnding === 'LF'` 标签——
    // 按冻结常量映射出的行尾字符**逐行**拆分，产出必须恰为该行数（实现若改用 CRLF，每行尾留 CR 即红）。
    const lineEnding = { LF, CRLF: CR + LF }[CSV_DIALECT.lineEnding];
    assert.equal(typeof lineEnding, 'string', 'CSV_DIALECT.lineEnding 必须是 LF／CRLF');
    assert.deepEqual(out.split(lineEnding), [
      CSV_DIALECT.header.join(DELIM),
      ...SAMPLES.stat.bodyLines.map((l) => DATA_TEXT_PROJECTIONS.stat.csvSections[0] + DELIM + csvVariant(l)),
    ], 'csv 行尾恒取 CSV_DIALECT.lineEnding');
    assert.ok(!out.includes(CR), 'csv 行尾为 LF，不得出现 CR');
    assert.ok(!out.endsWith(LF), '末尾不加空行');
  });

  it('csv：含分隔符／引号／换行的字段用引号包裹，内部引号双写（RFC4180）', () => {
    const data = { item: { 逗号: 'a,b', 引号: 'say "hi"', 换行: 'x' + LF + 'y', 干净: 'plain' } };
    const out = buildDataText({ envelope: envelope('detail', data), format: 'csv' });
    const rows = parseCsv(out);
    assert.deepEqual(rows[0], [...CSV_DIALECT.header]);
    assert.deepEqual(rows[1], ['item', '逗号: a,b']);
    assert.deepEqual(rows[2], ['item', '引号: say "hi"']);
    assert.deepEqual(rows[3], ['item', '换行: x' + LF + 'y']);
    assert.deepEqual(rows[4], ['item', '干净: plain']);
    assert.ok(out.includes(QUOTE + QUOTE), '内部引号必须双写');
    assert.ok(out.includes(QUOTE + '引号: say ' + QUOTE + QUOTE + 'hi' + QUOTE + QUOTE + QUOTE), '含引号字段必须整体包裹');
  });

  it('csv：空值写空字符串（不写占位符）', () => {
    const out = buildDataText({ envelope: envelope('detail', { item: { a: null, b: undefined, c: '' } }), format: 'csv' });
    assert.ok(!out.includes(TEXT_EMPTY_PLACEHOLDER), 'csv 不得出现「未填写」');
    assert.ok(!out.includes(LOG_UNKNOWN_PLACEHOLDER), 'csv 不得出现「(未知)」');
    assert.deepEqual(csvRows(out).slice(1), [
      ['item', 'a: '], ['item', 'b: '], ['item', 'c: '],
    ], '空值 → 标签后为空串（两列语义仍完整）');
  });

  it('csv：data 两列语义 = section 列取投影表，row 列取该行文本', () => {
    const out = buildDataText({ envelope: envelope('receipt', SAMPLES.receipt.data), format: 'csv' });
    const rows = csvRows(out);
    assert.deepEqual(rows, [
      [...CSV_DIALECT.header],
      ['status', 'ok: true'],
      ['message', 'message: 已写入'],
    ]);
  });
});

/* ── A3 6 段日志 ─────────────────────────────────────────── */

describe('#77 6 段日志（A3）', () => {
  const copyLog = {
    thinking: '先查库',
    dataStructure: 'memo.items[]',
    callChain: 'search → rank',
    timestamp: '2026-01-02T03:04:05',
    exception: '无',
  };

  it('text：段序恒按 LOG_SECTIONS，标题恒取 LOG_SECTION_TITLES，段间无空行', () => {
    const out = buildLogText({ envelope: envelope('list', SAMPLES.list.data), copyLog });
    const lines = out.split(LF);
    assert.equal(lines.length, LOG_SECTIONS.length * 2, '每段 = 标题行 + 内容行');
    LOG_SECTIONS.forEach((section, i) => {
      assert.equal(lines[i * 2], LOG_SECTION_TITLES[section]);
      assert.equal(lines[i * 2 + 1], expectedSectionText(section, copyLog, 'list'));
    });
  });

  it('scene 段恒由 envelope 派生，形如 {skill}.{key}（{shape}）', () => {
    const out = buildLogText({ envelope: envelope('receipt', SAMPLES.receipt.data), copyLog: { thinking: 'x' } });
    const scene = out.split(LF)[1];
    assert.equal(scene, 'skill-a.skill-a.key（receipt）');
    assert.equal(LOG_SECTION_SOURCES.scene, 'envelope');
    // 反向鉴别：copyLog 里同名字段不得被当成 scene 源
    const withFake = buildLogText({
      envelope: envelope('receipt', SAMPLES.receipt.data),
      copyLog: { scene: '伪造', envelope: '伪造' },
    });
    assert.equal(withFake.split(LF)[1], 'skill-a.skill-a.key（receipt）', 'scene 段不得另找数据源');
  });

  it('timestampVersion 段取 copyLog.timestamp（不是同名字段）', () => {
    const out = buildLogText({
      envelope: envelope('stat', SAMPLES.stat.data),
      copyLog: { timestamp: '取我', timestampVersion: '别取我' },
    });
    const lines = out.split(LF);
    const idx = LOG_SECTIONS.indexOf('timestampVersion');
    assert.equal(lines[idx * 2 + 1], '取我');
    assert.equal(LOG_SECTION_SOURCES.timestampVersion, 'copyLog.timestamp');
  });

  it('json：6 个段名为键，键序 = LOG_SECTIONS，缺失段写 null，scene 同为派生文本', () => {
    const out = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'json', copyLog: { thinking: '只给一段' } });
    const parsed = JSON.parse(out);
    assert.deepEqual(Object.keys(parsed), [...LOG_SECTIONS], '键序恒按 LOG_SECTIONS');
    assert.equal(parsed.scene, 'skill-a.skill-a.key（stat）');
    assert.equal(parsed.thinking, '只给一段');
    for (const section of LOG_SECTIONS) {
      if (section === 'scene' || section === 'thinking') continue;
      assert.equal(parsed[section], null, section + ' 缺失必须写 null');
    }
  });

  it('csv：每段一行，section 列 = 段名，缺失写空串', () => {
    const out = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'csv', copyLog });
    const rows = csvRows(out);
    assert.deepEqual(rows[0], [...CSV_DIALECT.header]);
    assert.equal(rows.length, 1 + LOG_SECTIONS.length);
    LOG_SECTIONS.forEach((section, i) => {
      assert.equal(rows[i + 1][0], section);
      assert.equal(rows[i + 1][1], expectedSectionText(section, copyLog, 'stat'));
    });
    const missing = csvRows(buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'csv' }));
    for (let i = 1; i < missing.length; i += 1) {
      if (missing[i][0] === 'scene') continue;
      assert.equal(missing[i][1], '', '缺失段 csv 写空串');
    }
  });

  it('copyLog 缺省：text 写 LOG_UNKNOWN_PLACEHOLDER，json 写 null，csv 写空串', () => {
    const env = envelope('analysis', SAMPLES.analysis.data);
    const text = buildLogText({ envelope: env });
    const lines = text.split(LF);
    LOG_SECTIONS.forEach((section, i) => {
      if (section === 'scene') return;
      assert.equal(lines[i * 2 + 1], LOG_UNKNOWN_PLACEHOLDER, section + ' 缺失 → (未知)');
    });
    const parsed = JSON.parse(buildLogText({ envelope: env, format: 'json' }));
    for (const section of LOG_SECTIONS) {
      if (section === 'scene') continue;
      assert.equal(parsed[section], null);
    }
    assert.ok(!text.includes(TEXT_EMPTY_PLACEHOLDER), '日志缺段不得写「未填写」');
  });

  it('copyLog 字段为空串 → 视同缺失（三 format 一致）', () => {
    const env = envelope('analysis', SAMPLES.analysis.data);
    const empty = { thinking: '', dataStructure: '', callChain: '', timestamp: '', exception: '' };
    const text = buildLogText({ envelope: env, copyLog: empty });
    const lines = text.split(LF);
    LOG_SECTIONS.forEach((section, i) => {
      if (section === 'scene') return;
      assert.equal(lines[i * 2 + 1], LOG_UNKNOWN_PLACEHOLDER);
    });
    const parsed = JSON.parse(buildLogText({ envelope: env, copyLog: empty, format: 'json' }));
    for (const section of LOG_SECTIONS) {
      if (section === 'scene') continue;
      assert.equal(parsed[section], null);
    }
  });

  it('日志 json：`<` 同样按 TEXT_JSON_LT_RULE 转义', () => {
    const out = buildLogText({ envelope: envelope('analysis', SAMPLES.analysis.data), format: 'json', copyLog: { thinking: 'a<b' } });
    assert.ok(out.includes(BACKSLASH + TEXT_JSON_LT_RULE));
    assert.ok(!out.includes('<'));
  });
});

/* ── A5 敏感行 ───────────────────────────────────────────── */

describe('#77 敏感行判定与掩码（A5）', () => {
  const secret = { [SENSITIVE_ROW_RULE.textField]: '超级密码', [SENSITIVE_ROW_RULE.flagField]: SENSITIVE_ROW_RULE.flagValue };

  it('判定只认字面 true：sensitive: 1／"yes"／"true" 一律不脱敏（与旧侧真值判定不同）', () => {
    for (const flag of [1, 'yes', 'true', {}, [], null]) {
      const data = { metrics: { pwd: { text: '超级密码', sensitive: flag } } };
      const out = buildDataText({ envelope: envelope('stat', data) });
      assert.ok(!out.includes(TEXT_SENSITIVE_MASK), 'sensitive=' + JSON.stringify(flag) + ' 不得判为敏感行');
      assert.ok(out.includes('超级密码'), '非敏感行必须输出原文');
    }
  });

  it('text：掩码行恒为 TEXT_SENSITIVE_MASK，紧随一行 SENSITIVE_ROW_RULE.textNotice', () => {
    const data = { metrics: { 账号: 'a', 密码: secret } };
    const lines = buildDataText({ envelope: envelope('stat', data) }).split(LF);
    assert.deepEqual(lines, [
      headerOf('skill-a', 'skill-a.key'),
      '账号: a',
      TEXT_SENSITIVE_MASK,
      SENSITIVE_ROW_RULE.textNotice,
    ]);
    assert.equal(SENSITIVE_ROW_RULE.mask, TEXT_SENSITIVE_MASK);
    assert.ok(!lines.join(LF).includes('超级密码'), '原文一律不出现');
  });

  it('list 元素／detail 值同样按敏感行处理（投影行的三处值位置）', () => {
    const listLines = buildDataText({ envelope: envelope('list', { items: [secret, '明文'], total: 2 }) }).split(LF);
    assert.deepEqual(listLines, [
      headerOf('skill-a', 'skill-a.key'),
      TEXT_SENSITIVE_MASK,
      SENSITIVE_ROW_RULE.textNotice,
      '明文',
      'total: 2',
    ]);
    const detailLines = buildDataText({ envelope: envelope('detail', { item: { 密码: secret } }) }).split(LF);
    assert.deepEqual(detailLines, [
      headerOf('skill-a', 'skill-a.key'),
      TEXT_SENSITIVE_MASK,
      SENSITIVE_ROW_RULE.textNotice,
    ]);
  });

  it('json：该键值 = mask（不写 null、不夹中文提示）', () => {
    const parsed = JSON.parse(buildDataText({ envelope: envelope('stat', { metrics: { 密码: secret } }), format: 'json' }));
    assert.equal(parsed.data.metrics.密码, TEXT_SENSITIVE_MASK);
    assert.ok(!JSON.stringify(parsed).includes('超级密码'));
    assert.ok(!JSON.stringify(parsed).includes(SENSITIVE_ROW_RULE.textNotice), 'json 不得夹中文提示');
  });

  it('csv：row 列 = mask，section 列保留投影分组名（V1 洞 9 同口径）', () => {
    const out = buildDataText({ envelope: envelope('stat', { metrics: { 密码: secret } }), format: 'csv' });
    const rows = csvRows(out);
    assert.deepEqual(rows[1], [DATA_TEXT_PROJECTIONS.stat.csvSections[0], TEXT_SENSITIVE_MASK]);
    assert.ok(!out.includes(SENSITIVE_ROW_RULE.textNotice), 'csv 不得夹中文提示');
    assert.ok(!out.includes('超级密码'));
  });

  it('日志侧不受敏感行包装影响（copyLog 字段是纯字符串）', () => {
    const out = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), copyLog: { thinking: '普通文本' } });
    const idx = LOG_SECTIONS.indexOf('thinking');
    assert.equal(out.split(LF)[idx * 2 + 1], '普通文本', '普通文本原样进入该段');
    assert.ok(!out.includes(TEXT_SENSITIVE_MASK), '日志文本不得凭空出现掩码');
    // FX-77-8-5：上面的「不得出现掩码」按构造恒真（copyLog 只收字符串），故补**有鉴别力**的反向：
    // 字面 `****` 作为**数据**原样输出、且**不**触发敏感行提示行（判定看包装形态，不看文本）。
    const literal = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), copyLog: { thinking: TEXT_SENSITIVE_MASK } });
    assert.equal(literal.split(LF)[idx * 2 + 1], TEXT_SENSITIVE_MASK, '字面 **** 作为数据原样输出（不是掩码逻辑）');
    assert.ok(!literal.includes(SENSITIVE_ROW_RULE.textNotice), '日志不得出现脱敏提示行');
    const dataLiteral = buildDataText({ envelope: envelope('detail', { item: { a: TEXT_SENSITIVE_MASK } }) });
    assert.deepEqual(dataLiteral.split(LF), [headerOf('skill-a', 'skill-a.key'), 'a: ' + TEXT_SENSITIVE_MASK],
      '数据里字面 **** 不得被当成敏感行（无提示行）');
  });
});

/* ── A3/A4 空值口径 ─────────────────────────────────────── */

describe('#77 空值口径分层（A3／A4）', () => {
  it('数据空值：text 写「未填写」／json 写 null／csv 写空串', () => {
    const data = { item: { a: null } };
    assert.ok(buildDataText({ envelope: envelope('detail', data) }).includes(TEXT_EMPTY_PLACEHOLDER));
    assert.equal(JSON.parse(buildDataText({ envelope: envelope('detail', data), format: 'json' })).data.item.a, null);
    assert.deepEqual(csvRows(buildDataText({ envelope: envelope('detail', data), format: 'csv' }))[1], ['item', 'a: ']);
  });

  it('两个占位符互不串味：数据空值不写「(未知)」，日志缺段不写「未填写」', () => {
    const dataOut = buildDataText({ envelope: envelope('detail', { item: { a: null } }) });
    assert.ok(!dataOut.includes(LOG_UNKNOWN_PLACEHOLDER));
    const logOut = buildLogText({ envelope: envelope('detail', { item: { a: 1 } }) });
    assert.ok(!logOut.includes(TEXT_EMPTY_PLACEHOLDER));
  });

  it('U1：list.total 缺省 → 省略收尾行（text／csv／json 三口径一致），不报错', () => {
    const data = { items: ['a'] };
    const text = buildDataText({ envelope: envelope('list', data) });
    assert.deepEqual(text.split(LF), [headerOf('skill-a', 'skill-a.key'), 'a']);
    const csv = csvRows(buildDataText({ envelope: envelope('list', data), format: 'csv' }));
    assert.deepEqual(csv, [[...CSV_DIALECT.header], ['items', 'a']], '缺 total → 无收尾行');
    const parsed = JSON.parse(buildDataText({ envelope: envelope('list', data), format: 'json' }));
    assert.deepEqual(parsed.data, { items: ['a'] }, '缺 total → 键省略（非 null 占位）');
    // 反向鉴别：给了 total 就必须出现收尾行
    assert.ok(buildDataText({ envelope: envelope('list', { items: ['a'], total: 0 }) }).includes('total: 0'));
  });

  it('显式 total: null 是「空值」而非「缺省」：三 format 各按空值口径渲染', () => {
    const data = { items: ['a'], total: null };
    assert.deepEqual(buildDataText({ envelope: envelope('list', data) }).split(LF),
      [headerOf('skill-a', 'skill-a.key'), 'a', 'total: ' + TEXT_EMPTY_PLACEHOLDER]);
    assert.deepEqual(csvRows(buildDataText({ envelope: envelope('list', data), format: 'csv' })),
      [[...CSV_DIALECT.header], ['items', 'a'], ['total', 'total: ']]);
    const parsed = JSON.parse(buildDataText({ envelope: envelope('list', data), format: 'json' }));
    assert.ok('total' in parsed.data, 'json 空值保留键');
    assert.equal(parsed.data.total, null, 'json 空值写 null');
  });

  it('空容器（metrics／item／items 为空）→ 无主体行，不报错、不写占位符', () => {
    assert.deepEqual(buildDataText({ envelope: envelope('stat', { metrics: {} }) }).split(LF),
      [headerOf('skill-a', 'skill-a.key')]);
    assert.deepEqual(buildDataText({ envelope: envelope('detail', { item: {} }) }).split(LF),
      [headerOf('skill-a', 'skill-a.key')]);
    assert.deepEqual(buildDataText({ envelope: envelope('list', { items: [] }) }).split(LF),
      [headerOf('skill-a', 'skill-a.key')]);
    assert.deepEqual(csvRows(buildDataText({ envelope: envelope('list', { items: [] }), format: 'csv' })),
      [[...CSV_DIALECT.header]]);
  });

  it('receipt.ok 的 text 口径书写形式 = `ok: true`／`ok: false`（U2 定案）', () => {
    // FX-77-8-5：由 `includes('ok: true')` 改为**逐行等值**（子串断言任何含该片段的行都会通过）
    assert.deepEqual(buildDataText({ envelope: envelope('receipt', { ok: true, message: 'm' }) }).split(LF),
      [headerOf('skill-a', 'skill-a.key'), 'ok: true', 'message: m']);
    assert.deepEqual(buildDataText({ envelope: envelope('receipt', { ok: false, message: 'm' }) }).split(LF),
      [headerOf('skill-a', 'skill-a.key'), 'ok: false', 'message: m']);
    // 反向鉴别：布尔不得被翻译成中文或其它写法（冻结面无该常量）
    const out = buildDataText({ envelope: envelope('receipt', { ok: true, message: 'm' }) });
    assert.ok(!out.includes('成功') && !out.includes('True'), '布尔值恒按 String() 书写，不另造映射');
  });
});

/* ── FX-77-1 `undefined` 归一 ─────────────────────────────── */

describe('#77 `undefined` 归一为 null（FX-77-1）', () => {
  it('同一输入的三 format 键集／行数一一对应：`item` 含 undefined', () => {
    const data = { item: { a: null, b: '', c: undefined, d: 0 } };
    const outs = allFormats(buildDataText, { envelope: envelope('detail', data) });
    const parsed = JSON.parse(outs.json);
    assert.deepEqual(Object.keys(parsed.data.item), ['a', 'b', 'c', 'd'],
      'undefined 属性必须**保留键**（归一为 null，不得被 JSON.stringify 丢弃）');
    assert.deepEqual(parsed.data.item, { a: null, b: '', c: null, d: 0 }, 'undefined → null，其余原样');
    const textBody = outs.text.split(LF).slice(1);
    assert.deepEqual(textBody, [
      'a: ' + TEXT_EMPTY_PLACEHOLDER, 'b: ' + TEXT_EMPTY_PLACEHOLDER,
      'c: ' + TEXT_EMPTY_PLACEHOLDER, 'd: 0',
    ]);
    assert.equal(textBody.length, Object.keys(parsed.data.item).length, 'text 主体行数 = json 键数');
    const csvBody = csvRows(outs.csv).slice(1);
    assert.deepEqual(csvBody, [['item', 'a: '], ['item', 'b: '], ['item', 'c: '], ['item', 'd: 0']]);
    assert.equal(csvBody.length, Object.keys(parsed.data.item).length, 'csv 主体行数 = json 键数');
  });

  it('`metrics` 含 undefined：json 保留键写 null，text／csv 各按空值口径写行', () => {
    const outs = allFormats(buildDataText, { envelope: envelope('stat', { metrics: { a: undefined, b: null } }) });
    const parsed = JSON.parse(outs.json);
    assert.deepEqual(parsed.data.metrics, { a: null, b: null }, 'undefined 与 null 在 json 同为 null，键都保留');
    assert.deepEqual(outs.text.split(LF).slice(1),
      ['a: ' + TEXT_EMPTY_PLACEHOLDER, 'b: ' + TEXT_EMPTY_PLACEHOLDER]);
    assert.deepEqual(csvRows(outs.csv).slice(1), [['metrics', 'a: '], ['metrics', 'b: ']]);
  });

  it('envelope 缺 `key`／`key: undefined`：json 五键集不缩水，text 头按空串渲染', () => {
    const missing = { version: BASE_PAINT_CONTRACT_VERSION, skill: 'skill-a', shape: 'stat', data: { metrics: { a: 1 } } };
    for (const env of [missing, { ...missing, key: undefined }]) {
      const parsed = JSON.parse(buildDataText({ envelope: env, format: 'json' }));
      assert.deepEqual(Object.keys(parsed), ['version', 'skill', 'shape', 'key', 'data'],
        '五键集不得因 undefined 缩水');
      assert.equal(parsed.key, null, '缺 key／key: undefined → json 写 null（键保留）');
      assert.equal(buildDataText({ envelope: env }).split(LF)[0], headerOf('skill-a', ''),
        'text 头按空串渲染（行仍在）');
    }
  });

  it('U1 不被归一破坏：缺省 `total` 仍省略键（缺省 ≠ 空值）', () => {
    for (const data of [{ items: ['a'] }, { items: ['a'], total: undefined }]) {
      const parsed = JSON.parse(buildDataText({ envelope: envelope('list', data), format: 'json' }));
      assert.deepEqual(parsed.data, { items: ['a'] }, '缺省 total → json 省略该键（不得被归一成 null）');
      assert.deepEqual(csvRows(buildDataText({ envelope: envelope('list', data), format: 'csv' })),
        [[...CSV_DIALECT.header], ['items', 'a']], 'csv 同样省略该行');
    }
  });

  it('非投影字段的 undefined 同样保留键（77-8 透传口径）', () => {
    const parsed = JSON.parse(buildDataText({
      envelope: envelope('stat', { metrics: { a: 1 }, 额外: undefined }), format: 'json',
    }));
    assert.deepEqual(Object.keys(parsed.data), ['metrics', '额外']);
    assert.equal(parsed.data.额外, null, '透传字段的 undefined 同样归一为 null');
  });

  it('嵌套对象值内的 undefined 同样归一为 null（三 format 键集一一对应，含嵌套）', () => {
    const data = { item: { 嵌套: { b: undefined, c: 1 } } };
    const outs = allFormats(buildDataText, { envelope: envelope('detail', data) });
    assert.deepEqual(JSON.parse(outs.json).data.item.嵌套, { b: null, c: 1 }, 'json 嵌套键保留并写 null');
    assert.deepEqual(outs.text.split(LF).slice(1), ['嵌套: {"b":null,"c":1}'],
      'text 的对象值口径同样不丢键（§3.4.1「对象 → JSON.stringify」＋ FX-77-1 归一）');
    assert.deepEqual(parseCsv(outs.csv), [[...CSV_DIALECT.header], ['item', '嵌套: {"b":null,"c":1}']],
      'csv 同口径');
  });
});

/* ── FX-77-6 产出恒非空 ───────────────────────────────────── */

describe('#77 产出恒非空（FX-77-6）', () => {
  const EMPTY_OUTPUT_CASES = [
    ['空投影体 `metrics:{}`', { envelope: envelope('stat', { metrics: {} }) }],
    ['空投影体 `item:{}`', { envelope: envelope('detail', { item: {} }) }],
    ['空投影体 `items:[]`', { envelope: envelope('list', { items: [] }) }],
    ['空 title（`title: \'\'`）', { envelope: envelope('detail', { item: {} }), title: '' }],
    ['空 `skill`／`key`', { envelope: envelope('stat', { metrics: {} }, { skill: '', key: '' }) }],
  ];

  it('五种空产出诱因 × 三 format：产出均非空，且喂 copyText 不走 empty 短路', async () => {
    for (const [label, input] of EMPTY_OUTPUT_CASES) {
      const outs = allFormats(buildDataText, input);
      for (const format of COPY_FORMATS) {
        assert.notEqual(outs[format], '', label + '／' + format + ' 产出必须非空');
        const outcome = await copyText(outs[format], { clipboard: null, fallback: () => true });
        assert.equal(outcome.ok, true, label + '／' + format + ' 喂 copyText 必须 ok（不得静默短路）');
        assert.notEqual(outcome.reason, 'empty', label + '／' + format + ' 不得命中空串短路');
      }
    }
  });

  it('`title: \'\'` 视同缺省：输出头恒为模板展开（整行不得消失）', () => {
    const input = { envelope: envelope('detail', { item: {} }), title: '' };
    assert.equal(buildDataText(input), headerOf('skill-a', 'skill-a.key'),
      '空 title ＋ 空投影体 → 只剩输出头，且非空');
    assert.equal(buildDataText({ ...input, title: '自定义标题' }).split(LF)[0], '自定义标题',
      '非空 title 仍覆盖输出头');
  });

  it('空 `skill`／`key`：输出头恒存在（模板括号与分隔符即兜底文本）', () => {
    const out = buildDataText({ envelope: envelope('stat', { metrics: {} }, { skill: '', key: '' }) });
    assert.equal(out, expandTemplate(TEXT_HEADER_TEMPLATE, '', ''), '输出头 = 模板逐位替换（空值 → 空串）');
    assert.ok(out.length > 0, '输出头行不得为空');
    assert.equal(out.split(LF).length, 1, '空投影体 + 空 skill/key → 仅输出头一行');
  });
});

/* ── FX-77-2 未覆盖边界补测 ───────────────────────────────── */

describe('#77 未覆盖边界补测（FX-77-2／FX-77-8）', () => {
  it('csv：字段含 CR 视同换行加引号（U11），首尾空格不加引号', () => {
    const data = { item: { cr: 'x' + CR + 'y', lead: '  p', trail: 'q  ', crlf: 'x' + CR + LF + 'y' } };
    const out = buildDataText({ envelope: envelope('detail', data), format: 'csv' });
    assert.deepEqual(parseCsv(out), [
      [...CSV_DIALECT.header],
      ['item', 'cr: x' + CR + 'y'],
      ['item', 'lead:   p'],
      ['item', 'trail: q  '],
      ['item', 'crlf: x' + CR + LF + 'y'],
    ], 'CR／CRLF 必须加引号且值可逆；首尾空格不加引号（字段值 = 原值）');
    assert.ok(out.includes(QUOTE + 'cr: x' + CR + 'y' + QUOTE), '含 CR 字段必须整体加引号');
    assert.ok(out.includes('item,lead:   p'), '含首尾空格字段不得加引号');
  });

  it('循环引用 → structure-invalid（77-4）：三 format 均抛错、不返空', () => {
    const cyclic = { metrics: {} };
    cyclic.metrics.self = cyclic;
    for (const format of COPY_FORMATS) {
      throwsCode(() => buildDataText({ envelope: envelope('stat', cyclic), format }), 'structure-invalid');
    }
    const items = [];
    items.push(items);
    throwsCode(() => buildDataText({ envelope: envelope('list', { items }) }), 'structure-invalid');
    // 注：`buildLogText` **不渲染** `data` 的投影值（只校验容器形态 ＋ 渲染 6 段），
    // 故循环引用在日志出口不可达（不是漏检）——日志段的唯一来源是 `copyLog` 字符串。
    assert.equal(buildLogText({ envelope: envelope('stat', cyclic) }).split(LF).length, LOG_SECTIONS.length * 2);
  });

  it('非字符串 `skill`／`key`（77-7）：text 头／scene 段按空串，json 原样透传', () => {
    const env = envelope('stat', { metrics: { a: 1 } }, { skill: 42, key: null });
    assert.equal(buildDataText({ envelope: env }).split(LF)[0], headerOf('', ''), '非字符串 → 空串渲染');
    assert.equal(buildLogText({ envelope: env }).split(LF)[1], '.（stat）', 'scene 段同样按空串渲染');
    const parsed = JSON.parse(buildDataText({ envelope: env, format: 'json' }));
    assert.equal(parsed.skill, 42, '非字符串在 json 原样透传');
    assert.equal(parsed.key, null, 'null 原样透传');
  });

  it('json：键名含 `<` 同样按 TEXT_JSON_LT_RULE 转义，且往返无损', () => {
    const data = { item: { '<k>': '</script>', 普通: 'a<b' } };
    const out = buildDataText({ envelope: envelope('detail', data), format: 'json' });
    assert.ok(!out.includes('<'), '键名与值都不得出现裸 `<`');
    assert.ok(out.includes(BACKSLASH + TEXT_JSON_LT_RULE), '转义形态 = 反斜杠 + u003c');
    const parsed = JSON.parse(out);
    assert.deepEqual(Object.keys(parsed.data.item), ['<k>', '普通'], 'parse 还原键名');
    assert.equal(parsed.data.item['<k>'], '</script>');
    assert.equal(parsed.data.item.普通, 'a<b');
  });

  it('json：深层缩进逐级恰为 TEXT_JSON_INDENT 的倍数（2／4／6／8…）', () => {
    const out = buildDataText({ envelope: envelope('detail', { item: { a: { b: { c: { d: 1 } } } } }), format: 'json' });
    const indents = out.split(LF).map((l) => l.length - l.replace(/^ +/, '').length);
    assert.deepEqual(indents, [0, 2, 2, 2, 2, 2, 4, 6, 8, 10, 12, 10, 8, 6, 4, 2, 0],
      '逐行缩进层级（3 空格缩进在此即红）');
    assert.ok(indents.every((n) => n % TEXT_JSON_INDENT === 0), '每行缩进必须是 TEXT_JSON_INDENT 的倍数');
    assert.equal(out, JSON.stringify(JSON.parse(out), null, TEXT_JSON_INDENT).split('<').join(BACKSLASH + TEXT_JSON_LT_RULE),
      '逐字节等于按 TEXT_JSON_INDENT 的规范序列化');
  });

  it('输出头模板单趟展开：`skill` 值里的 `{key}` 不得被二次展开（FX-77-8-3）', () => {
    const out = buildDataText({ envelope: envelope('stat', { metrics: { a: 1 } }, { skill: '{key}', key: 'KK' }) });
    assert.equal(out.split(LF)[0], '【{key} · KK】', '单趟展开：插入的值不再被扫描');
    assert.ok(!out.includes('KK · KK'), '不得出现二次展开结果');
  });

  it('`$` 系字符原样：无替换语义泄漏', () => {
    const out = buildDataText({ envelope: envelope('stat', { metrics: { a: 1 } }, { skill: '$&$`', key: "$'" }) });
    assert.equal(out.split(LF)[0], '【$&$` · $\'】');
  });

  it('BigInt：text 按 String()、json 抛 structure-invalid，文案不得误称「循环引用」（FX-77-8-2）', () => {
    const env = envelope('detail', { item: { a: 1n } });
    assert.deepEqual(buildDataText({ envelope: env }).split(LF), [headerOf('skill-a', 'skill-a.key'), 'a: 1']);
    const bigintErr = throwsCode(() => buildDataText({ envelope: env, format: 'json' }), 'structure-invalid');
    assert.ok(!bigintErr.message.includes('循环引用'), 'BigInt 报错不得写「循环引用」：' + bigintErr.message);
    assert.ok(bigintErr.message.includes('BigInt'), '文案应指明非 JSON 值：' + bigintErr.message);
    // 嵌套 BigInt：text／csv 的对象值口径同样抛错并按因辨文（显式 `typeof === 'bigint'` 判定，不依赖运行时文案）
    const nestedErr = throwsCode(() => buildDataText({ envelope: envelope('detail', { item: { a: { b: 1n } } }) }), 'structure-invalid');
    assert.ok(nestedErr.message.includes('BigInt'), '嵌套 BigInt 也须按因辨文：' + nestedErr.message);
    const cyclic = { item: {} };
    cyclic.item.self = cyclic;
    const cycleErr = throwsCode(() => buildDataText({ envelope: envelope('detail', cyclic), format: 'json' }), 'structure-invalid');
    assert.ok(cycleErr.message.includes('循环引用'), '循环引用文案保留「循环引用」：' + cycleErr.message);
    assert.notEqual(cycleErr.message, bigintErr.message, '同码不同因 → message 必须不同');
  });
});

/* ── A6 错误码 ───────────────────────────────────────────── */

describe('#77 三个错误码（A6）', () => {
  it('TEXT_ERROR_CODES 三码全部可达（逐码）', () => {
    assert.deepEqual([...TEXT_ERROR_CODES], ['shape-unsupported', 'structure-invalid', 'format-unknown']);
    throwsCode(() => buildDataText({ envelope: envelope('fallback', { reason: 'r', degraded: true }) }), 'shape-unsupported');
    throwsCode(() => buildDataText({ envelope: envelope('stat', { metrics: 'not-object' }) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'yaml' }), 'format-unknown');
    throwsCode(() => buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'yaml' }), 'format-unknown');
  });

  it('format-unknown：非字符串／闭集外／显式 undefined 之外的一切非法值', () => {
    for (const format of ['yaml', 'TEXT', '', 1, null, {}, []]) {
      throwsCode(() => buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), format }), 'format-unknown');
    }
  });

  it('structure-invalid：逐 shape 判据以 EnvelopeDataByShape 为准', () => {
    const bad = [
      ['stat', {}], ['stat', { metrics: null }], ['stat', { metrics: [] }],
      ['list', {}], ['list', { items: {} }], ['list', { items: 'x' }],
      ['detail', {}], ['detail', { item: null }], ['detail', { item: [] }],
      ['receipt', { ok: true }], ['receipt', { message: 'm' }], ['receipt', { ok: 'yes', message: 'm' }],
      ['analysis', {}], ['analysis', { summary: '' }], ['analysis', { summary: 1 }],
    ];
    for (const [shape, data] of bad) {
      throwsCode(() => buildDataText({ envelope: envelope(shape, data) }), 'structure-invalid');
    }
  });

  it('structure-invalid：data 整体非对象／envelope 非对象／入参非对象', () => {
    throwsCode(() => buildDataText({ envelope: envelope('stat', null) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('stat', []) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: null }), 'structure-invalid');
    throwsCode(() => buildDataText({}), 'structure-invalid');
    throwsCode(() => buildDataText(null), 'structure-invalid');
    throwsCode(() => buildLogText({ envelope: null }), 'structure-invalid');
    throwsCode(() => buildLogText(null), 'structure-invalid');
  });

  it('structure-invalid：title／occurredAt 非字符串；copyLog 形态非法', () => {
    throwsCode(() => buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), title: 42 }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), occurredAt: 42 }), 'structure-invalid');
    throwsCode(() => buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), copyLog: 'x' }), 'structure-invalid');
    throwsCode(() => buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), copyLog: { thinking: 42 } }), 'structure-invalid');
  });

  it('U14：buildLogText 与 buildDataText 同口径校验 data', () => {
    const badEnvelope = envelope('stat', { metrics: 'not-object' });
    throwsCode(() => buildLogText({ envelope: badEnvelope }), 'structure-invalid');
    throwsCode(() => buildLogText({ envelope: badEnvelope, format: 'json' }), 'structure-invalid');
    // 反向鉴别（FX-77-8-5）：不再只断 `length > 0`，改为**逐行等值**（12 行、标题与内容逐段）
    const lines = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data) }).split(LF);
    assert.equal(lines.length, LOG_SECTIONS.length * 2);
    LOG_SECTIONS.forEach((section, i) => {
      assert.equal(lines[i * 2], LOG_SECTION_TITLES[section]);
      assert.equal(lines[i * 2 + 1], section === 'scene' ? 'skill-a.skill-a.key（stat）' : LOG_UNKNOWN_PLACEHOLDER);
    });
  });

  it('判定次序：format-unknown → shape-unsupported → structure-invalid（首个命中即抛）', () => {
    const broken = envelope('fallback', { bad: true });
    throwsCode(() => buildDataText({ envelope: broken, format: 'yaml' }), 'format-unknown');
    throwsCode(() => buildDataText({ envelope: broken, title: 42 }), 'shape-unsupported');
    throwsCode(() => buildDataText({ envelope: envelope('stat', { metrics: 1 }), title: 42 }), 'structure-invalid');
  });

  it('一码多义由 message 辨因：同码不同因的 message 必须不同', () => {
    const a = throwsCode(() => buildDataText({ envelope: envelope('stat', {}) }), 'structure-invalid');
    const b = throwsCode(() => buildDataText({ envelope: envelope('list', {}) }), 'structure-invalid');
    const c = throwsCode(() => buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), title: 1 }), 'structure-invalid');
    assert.notEqual(a.message, b.message);
    assert.notEqual(a.message, c.message);
  });
});

/* ── A9 旧层 7 条序列化用例的行为面 ─────────────────────── */

describe('#77 对齐旧层 7 条序列化用例行为面（A9）', () => {
  it('① 旧 `test_snapshot_validation_blocked`（6 样本）→ 全部结构违规必须抛错', () => {
    // 旧侧判据是 snapshot 结构；新契约判据改为 EnvelopeDataByShape（B2／FX-1②）——行为面等价：
    // 「结构违规 → 直接报错，不返空」，6 个样本逐一映射到新判据。
    throwsCode(() => buildDataText({ envelope: null }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('stat', null) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('list', { items: 'x' }) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('detail', {}) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('receipt', { ok: true }) }), 'structure-invalid');
    throwsCode(() => buildDataText({ envelope: envelope('analysis', { summary: '' }) }), 'structure-invalid');
  });

  it('② 旧 default 文本输出 → 输出头 ＋ 逐行主体（无分节标题）', () => {
    const out = buildDataText({ envelope: envelope('stat', SAMPLES.stat.data) });
    const lines = out.split(LF);
    assert.equal(lines[0], headerOf('skill-a', 'skill-a.key'));
    assert.equal(lines.length, 1 + SAMPLES.stat.bodyLines.length);
    assert.ok(!out.includes('▍'), '旧侧分节标题写法不得移植（B2）');
  });

  it('③ 旧 json 输出 → 现在是 envelope 五字段（不再序列化 snapshot）', () => {
    const parsed = JSON.parse(buildDataText({ envelope: envelope('stat', SAMPLES.stat.data), format: 'json' }));
    assert.deepEqual(Object.keys(parsed), ['version', 'skill', 'shape', 'key', 'data']);
    assert.ok(!('snapshot' in parsed) && !('sections' in parsed) && !('summary' in parsed));
  });

  it('④ 旧 csv 输出 → 现在是表头 ＋ 两列（section／row），不再是行拼接', () => {
    // FX-77-4：样本必须**含分隔符与引号**，否则 `every(r => r.length === 2)` 对任何两列形状都通过；
    // 含引号样本用严格 `parseCsv`（朴素 `split` 会静默误解析）。
    const data = { metrics: { 有逗号: 'a,b', 有引号: 'say "hi"', 普通: 'plain' } };
    const out = buildDataText({ envelope: envelope('stat', data), format: 'csv' });
    const rows = parseCsv(out);
    assert.deepEqual(rows[0], ['section', 'row'], '旧侧无表头 → 新契约必须有表头');
    assert.deepEqual(rows, [
      ['section', 'row'],
      ['metrics', '有逗号: a,b'],
      ['metrics', '有引号: say "hi"'],
      ['metrics', '普通: plain'],
    ], '两列语义：section 列恒取投影表分组名、row 列恒为该行文本（含引号字段可逆）');
    assert.ok(out.includes(QUOTE + '有逗号: a,b' + QUOTE), '含分隔符字段必须整体加引号');
  });

  it('⑤ 旧敏感行 → 掩码＋提示拆两行，原文不出现（三 format 一律 mask）', () => {
    const secret = { text: '超级密码', sensitive: true };
    const text = buildDataText({ envelope: envelope('stat', { metrics: { 密码: secret } }) });
    assert.ok(text.includes(TEXT_SENSITIVE_MASK + LF + SENSITIVE_ROW_RULE.textNotice), '掩码行 ＋ 紧随提示行');
    assert.ok(!text.includes('超级密码'));
  });

  it('⑥ 旧 `build_log_text_sections` → 6 段逐段可定位且段序恒定', () => {
    const copyLog = { thinking: 't', dataStructure: 'd', callChain: 'c', timestamp: 'ts', exception: 'e' };
    const lines = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data), copyLog }).split(LF);
    assert.equal(lines.length, 12);
    LOG_SECTIONS.forEach((section, i) => {
      assert.equal(lines[i * 2], LOG_SECTION_TITLES[section]);
      assert.equal(lines[i * 2 + 1], expectedSectionText(section, copyLog, 'stat'));
    });
  });

  it('⑦ 旧 `build_log_text_missing_defaults` → 缺省统一 (未知)（旧侧四种文案已统一）', () => {
    const out = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data) });
    for (const legacy of ['(本地渲染 · 无 AI 链)', '(只读查询)', '无']) {
      assert.ok(!out.includes(legacy), '旧缺省文案不得移植：' + legacy);
    }
    assert.equal(out.split(LF).filter((l) => l === LOG_UNKNOWN_PLACEHOLDER).length, LOG_SECTIONS.length - 1);
  });
});

/* ── R-4 与相邻票的接口 ─────────────────────────────────── */

describe('#77 与 #76／#90 的接口（R-4）', () => {
  it('产出可直接喂 copyText（空串短路口径下恒非空）', async () => {
    const dataText = buildDataText({ envelope: envelope('stat', SAMPLES.stat.data) });
    const logText = buildLogText({ envelope: envelope('stat', SAMPLES.stat.data) });
    // FX-77-8-5：不再只断 `length > 0`（合规输入按构造必然 ≥ 1 行，无法区分「实现正确」与「只输出头」），
    // 改为逐行等值 ＋ 恒非空必要条件。
    assert.deepEqual(dataText.split(LF), [headerOf('skill-a', 'skill-a.key'), ...SAMPLES.stat.bodyLines]);
    assert.equal(logText.split(LF).length, LOG_SECTIONS.length * 2);
    assert.notEqual(dataText, '');
    assert.notEqual(logText, '');
    let captured = null;
    const outcome = await copyText(dataText, { clipboard: null, fallback: (text) => { captured = text; return true; } });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.channel, 'fallback');
    assert.equal(captured, dataText, '喂给 copyText 的文本必须逐字是序列化产出');
    // 空串短路的存在性（证明「非空」是必要条件而非巧合）
    const empty = await copyText('', { clipboard: null, fallback: () => true });
    assert.equal(empty.ok, false);
    assert.equal(empty.reason, 'empty');
  });

  it('产出可进 ErrorReceiptInput.dataText／logText（走 DEFAULT_DATA_ATTR，零注入面）', () => {
    const html = renderErrorReceipt({
      message: '渲染失败',
      dataText: buildDataText({ envelope: envelope('stat', SAMPLES.stat.data) }),
      logText: buildLogText({ envelope: envelope('stat', SAMPLES.stat.data) }),
    });
    assert.ok(html.includes(DEFAULT_DATA_ATTR), '复制按钮必须带承载属性');
    assert.ok(html.includes(headerOf('skill-a', 'skill-a.key')), '数据文本应进 data-t');
    assert.ok(html.includes(LOG_SECTION_TITLES.scene), '日志文本应进 data-t');
  });
});
