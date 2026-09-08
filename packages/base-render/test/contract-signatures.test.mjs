// #92 契约签名 · 运行时出口面锁（node:test；随 root `pnpm test` 跑）。
//
// 断言对象：
//  1. 冻结面清单 `SPEC_FROZEN_SURFACE`（名字／种类／票／状态／章节／逐字签名）；
//  2. `dist/index.js` 的真实运行时出口（既有 18 个仍在 + 新增恰好等于清单里 implemented 的运行时项）；
//  3. 文档 `docs/base-paint-contract.md` 的机器可读投影（标记区内表格）与清单逐字一致；
//  4. 冻结口径逐值（占位符／token／双通道／形状表／schema）；
//  5. 红线：无运行时依赖、无 `node:`、无隐式全局、spec 只许 import type。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACTION_BAR_DEFAULTS,
  ACTION_BAR_KINDS,
  ACTION_ID_ATTR,
  ASSET_MARKER_KEYS,
  ASSET_WRAPPERS,
  ASSET_WRAP_RULE,
  BASE_PAINT_CONTRACT_VERSION,
  CHART_BREAKPOINTS,
  CHART_COORD_RULE,
  CHART_EMPTY_RULE,
  CHART_ERROR_CODES,
  CHART_KINDS,
  CHART_PALETTE,
  CHART_STRUCTURE_RULE,
  CHARTS_STYLE_ID,
  CONTAINER_CHECK_RULE,
  CONTROLS_ERROR_CODES,
  CONTROLS_HOST_REQUIREMENT,
  CONTROL_AVAILABILITY,
  CONTROL_NAMES,
  COPY_ACTION_IDS,
  COPY_CHANNELS,
  COPY_TEXT_DEFAULTS,
  CSS_VAR_TOKENS,
  CSV_DIALECT,
  DATA_TEXT_PROJECTIONS,
  DATA_SCRIPT_TYPE,
  DEFAULT_DATA_ATTR,
  DEFAULT_DATA_SCRIPT_ID,
  ESCAPE_HTML_CHARS,
  HELP_COPY_ACTIONS,
  HELP_COPY_TARGETS,
  HELP_SCHEMA_ERROR_CODES,
  HELP_SHELL_ID,
  INJECTION_ORDER,
  LOG_SECTIONS,
  LOG_SECTION_SOURCES,
  LOG_SECTION_TITLES,
  LOG_UNKNOWN_PLACEHOLDER,
  MARKER_RULES,
  PAYLOAD_SLOT_RULE,
  RENDER_CONTRACT_VERSION,
  SENSITIVE_ROW_RULE,
  SERIALIZABLE_SHAPES,
  SHARED_HELPERS_JS_RULE,
  SPEC_FROZEN_SURFACE,
  STATUS_DEFAULT_TEXT,
  STRICT_ENVELOPE_FIELDS,
  STRICT_ENVELOPE_SHAPES,
  STYLE_FORBIDDEN_TOKENS,
  STYLE_SHEET_ID,
  TEMPLATE_CHECK_ORDER,
  TEMPLATE_ERROR_CODES,
  TEMPLATE_KIND_RULE,
  TEMPLATE_KINDS,
  TEMPLATE_MARKERS,
  TEXT_EMPTY_PLACEHOLDER,
  TEXT_ERROR_CODES,
  TEXT_HEADER_TEMPLATE,
  TEXT_JSON_INDENT,
  TEXT_JSON_LT_RULE,
  TEXT_SENSITIVE_MASK,
  TOAST_DEFAULTS,
  TOAST_ICONS,
  WRAP_PREDICATES,
  SCENE_DATA_SCHEMA,
  SCENE_TYPE_FIELD,
  escapeHtml,
} from '../dist/index.js';
import { ENVELOPE_SHAPES, ENVELOPE_VERSION } from 'base-link-core';

const DOC_URL = new URL('../../../docs/base-paint-contract.md', import.meta.url);
const doc = readFileSync(DOC_URL, 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** 基线：既有 18 个运行时出口（#92 前实测，D4 只许追加）。 */
const BASELINE_RUNTIME = [
  'createPageRegistry', 'pageOrReco', 'recoDescriptor',
  'STYLE_PREFIX', 'STYLE_TOKENS', 'STYLE_VERSION', 'cx', 'token',
  'RenderError', 'RENDER_CONTRACT_VERSION', 'RENDER_ENVELOPE_VERSION', 'escapeHtml', 'renderPage', 'renderReco',
  'INJECTOR_DEFAULT_MAX_RETRIES', 'INJECTOR_DEFAULT_RETRY_MS', 'mountInjector', 'openPage',
];

/** 解析 markdown 表格行（`\|` 视为转义竖线，反引号剥离）。 */
function parseRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === '\\' && inner[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells.map((c) => (c.startsWith('`') && c.endsWith('`') && c.length > 1 ? c.slice(1, -1) : c));
}

/** 拆行（格式约束：源码里不出现字面换行转义）。 */
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const splitLines = (text) => text.split(LF).map((l) => (l.endsWith(CR) ? l.slice(0, -1) : l));

/** 抽出所有 `<!-- FROZEN-SURFACE-TABLE-START -->…END` 标记区里的表行。 */
function frozenSurfaceRows(text) {
  const rows = [];
  const re = /<!-- FROZEN-SURFACE-TABLE-START -->([\s\S]*?)<!-- FROZEN-SURFACE-TABLE-END -->/g;
  for (const m of text.matchAll(re)) {
    for (const raw of splitLines(m[1])) {
      const line = raw.trim();
      if (!line.startsWith('|')) continue;
      const cells = parseRow(line);
      if (cells[0] === '名字' || /^-+$/.test(cells[0])) continue;
      rows.push({
        name: cells[0], kind: cells[1], ticket: cells[2], status: cells[3], section: cells[4], signature: cells[5],
      });
    }
  }
  return rows;
}

/** 去掉注释（块注释 + 行注释；保留 `://` 这类 URL）——纯度扫描只判代码，不判注释文字（FX-18）。 */
const LINE_COMMENT = new RegExp('(^|[^:])//[^' + String.fromCharCode(10) + ']*', 'g');
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(LINE_COMMENT, '$1');
}

/** 纯度扫描口径（**唯一实现**，与 `SHARED_HELPERS_JS_RULE`（§3.3，FX-18）逐项对齐）：
 *  只禁「`node:` 内建」与「向 `window.<id>`／`globalThis.<id>` 赋值」；
 *  **允许**页面侧 DOM 读取（`document.*`）——共享 JS 是页面侧代码。 */
const PURITY_CHECKS = [
  // 四种写法都要拦（FX-28／V5 C-1）：`from 'node:…'`／裸副作用 `import 'node:…'`／动态 `import('node:…')`／`require('node:…')`。
  ['forbidNodeBuiltins', /(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/, 'node: 内建'],
  ['forbidGlobalAssignment', /\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/, 'window／globalThis 隐式全局赋值'],
];

function purityViolations(source) {
  const code = stripJsComments(source);
  return PURITY_CHECKS
    .filter(([flag, re]) => SHARED_HELPERS_JS_RULE[flag] === true && re.test(code))
    .map(([, , label]) => label);
}

/** 递归收集 `dist/**\/*.js`（FX-18：旧扫描只查 dist 顶层，漏掉 `dist/spec/*.js`）。 */
function listDistJs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listDistJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 抽出 §2 对照表的数据行。 */
function section2Rows(text) {
  const body = text.split('## 2. v1.30 逐条对照表')[1]?.split('## 3. 冻结签名')[0] ?? '';
  return splitLines(body).filter((l) => l.trim().startsWith('|')).map(parseRow)
    .filter((c) => c[0] !== '节号' && !/^-+$/.test(c[0]));
}

/** 抽出 §3.4「6 段日志 ↔ `CopyLogFields` 对应表」的数据行（列：段序／`LOG_SECTIONS` 成员／`LOG_SECTION_TITLES`／数据源／缺失时）。 */
function logSectionRows(text) {
  const body = text.split('6 段日志 ↔ `CopyLogFields` 对应表')[1]?.split('**`format` 语义补全')[0] ?? '';
  return splitLines(body).filter((l) => l.trim().startsWith('|')).map(parseRow)
    .filter((c) => c[0] !== '段序' && !/^-+$/.test(c[0]));
}

const manifest = [...SPEC_FROZEN_SURFACE];
const mod = await import('../dist/index.js');
const runtimeKeys = new Set(Object.keys(mod));

describe('冻结面清单（SPEC_FROZEN_SURFACE）', () => {
  it('不可变、条目合法、名字唯一', () => {
    assert.ok(Object.isFrozen(SPEC_FROZEN_SURFACE), '清单必须 Object.freeze');
    assert.ok(manifest.length >= 60, '冻结面条目数异常偏少：' + manifest.length);
    const names = new Set();
    for (const e of manifest) {
      assert.equal(typeof e.name, 'string');
      assert.ok(['runtime', 'type'].includes(e.kind), e.name + ' kind 非法');
      assert.ok(['implemented', 'pending'].includes(e.status), e.name + ' status 非法');
      assert.ok(['3.1', '3.2', '3.3', '3.4', '3.5', '5', '7'].includes(e.section), e.name + ' section 非法');
      assert.ok(['#74', '#75', '#76', '#77', '#78', '#92'].includes(e.ticket), e.name + ' ticket 非法');
      assert.ok(e.signature.length > 0, e.name + ' 缺逐字签名');
      assert.ok(!names.has(e.name), '重名：' + e.name);
      names.add(e.name);
    }
    for (const t of ['#74', '#75', '#76', '#77', '#78']) {
      assert.ok(manifest.some((e) => e.ticket === t), t + ' 无任何冻结条目');
    }
  });

  it('B7：交互控件不得进 base-paint', () => {
    for (const banned of ['formPrompt', 'selectList', 'smartSelect', 'confirm', 'foldBox']) {
      assert.ok(!manifest.some((e) => e.name === banned), banned + ' 不得出现在冻结面');
      assert.ok(!runtimeKeys.has(banned), banned + ' 不得是运行时出口');
    }
  });
});

describe('运行时出口面锁', () => {
  it('既有 18 个出口仍在（D4 只追加）', () => {
    for (const name of BASELINE_RUNTIME) assert.ok(runtimeKeys.has(name), '既有出口丢失：' + name);
  });

  it('新增运行时出口恰好等于清单 implemented 的运行时项', () => {
    const expected = manifest.filter((e) => e.kind === 'runtime' && e.status === 'implemented').map((e) => e.name).sort();
    const actual = [...runtimeKeys].filter((n) => !BASELINE_RUNTIME.includes(n)).sort();
    assert.deepEqual(actual, expected);
  });

  it('pending 运行时项必须尚未导出（实现后翻转清单）', () => {
    for (const e of manifest.filter((x) => x.kind === 'runtime' && x.status === 'pending')) {
      assert.ok(!runtimeKeys.has(e.name), e.name + ' 已实现 → 请把清单 status 改为 implemented');
    }
  });

  it('type-only 名字不得成为运行时出口', () => {
    for (const e of manifest.filter((x) => x.kind === 'type')) {
      assert.ok(!runtimeKeys.has(e.name), e.name + ' 是类型，不得有运行时值');
    }
  });
});

describe('文档投影绑死（docs/base-paint-contract.md）', () => {
  it('标记区表格与清单逐字一致', () => {
    const rows = frozenSurfaceRows(doc);
    assert.ok(rows.length > 0, '文档缺 FROZEN-SURFACE-TABLE 标记区');
    const norm = (r) => JSON.stringify([r.name, r.kind, r.ticket, r.status, r.section, r.signature]);
    assert.deepEqual(rows.map(norm).sort(), manifest.map(norm).sort());
  });

  it('章节标题逐字合规（D1 结构）', () => {
    for (const h of [
      '# 规格：base-* 共享层契约（冻结版 v1）',
      '## 0. 地位与依据', '## 1. 命名区分', '## 2. v1.30 逐条对照表', '## 3. 冻结签名',
      '### 3.1 占位符契约与统一填充器（#74）', '### 3.2 共享样式资产（#75）',
      '### 3.3 控件层（#76）', '### 3.4 复制文本序列化（#77）', '### 3.5 图表层与 HELP 壳（#78）',
      '## 4. 归属边界', '## 5. 版本机制', '## 6. 给执行票的实现指引', '## 7. 签名测试清单',
    ]) assert.ok(doc.includes(h), '缺章节：' + h);
  });

  it('§2 覆盖 v1.30 全部 26 项且判定合法', () => {
    const rows = section2Rows(doc);
    assert.equal(rows.length, 26, '§2 必须 26 行，实为 ' + rows.length);
    for (const r of rows) {
      assert.equal(r.length, 7, '§2 行必须 7 列：' + r[0]);
      assert.ok(['有', '部分', '无'].includes(r[3]), r[1] + ' 判定非法：' + r[3]);
      assert.ok(r[4].length > 0, r[1] + ' 缺新落点');
      assert.ok(r[5].length > 0, r[1] + ' 缺新签名/不移植理由');
    }
  });

  it('AC-1…AC-17 逐条有落点，且不移植项写明理由', () => {
    for (let i = 1; i <= 17; i += 1) assert.ok(doc.includes('AC-' + i), '缺 AC-' + i);
    for (const s of ['metaHeader', 'remindersBlock', '08 规范', '不移植']) assert.ok(doc.includes(s), '缺：' + s);
    assert.ok(doc.includes('types'), 'AC-3 必须写 types');
    assert.ok(doc.includes('不提供 `type` 别名'), 'AC-3 必须显式否定单数别名');
  });

  it('返修单落点（FX-1…FX-16）在文档中可核', () => {
    const anchors = [
      ['FX-1', 'EnvelopeDataByShape'],
      ['FX-1', 'DATA_TEXT_PROJECTIONS'],
      ['FX-1', 'LOG_SECTION_SOURCES'],
      ['FX-2', '只替换标记文本'],
      ['FX-2', 'container-missing'],
      ['FX-2', 'buildSharedHelpersJs'],
      ['FX-3', 'toast?: ToastHostPort'],
      ['FX-3', 'bindCopyAction'],
      ['FX-4', 'ENVELOPE_SHAPES'],
      ['FX-5', 'delivery'],
      ['FX-5', '#83'],
      ['FX-5', '#87'],
      ['FX-5', '#106'],
      ['FX-5', '#107'],
      ['FX-6', 'scene-data.schema.json'],
      ['FX-7', 'HELP_COPY_ACTIONS'],
      ['FX-7', '复制指令'],
      ['FX-8', '主题接缝'],
      ['FX-9', '区块'],
      ['FX-10', '#99'],
      ['FX-11', 'injector.py:107-120'],
      ['FX-13', '既有失败台账'],
      ['FX-14', 'STATUS_KINDS'],
      ['FX-15', 'CONTEXT.md'],
      ['FX-15', 'RenderError'],
      ['FX-16', 'injectHelpBlock'],
    ];
    for (const [fx, needle] of anchors) assert.ok(doc.includes(needle), fx + ' 落点缺失：' + needle);
  });

  it('格式合规：无 BOM、无字面反斜杠 n', () => {
    assert.notEqual(doc.charCodeAt(0), 0xfeff, '文档不得以 BOM 开头');
    const literalBackslashN = String.fromCharCode(92) + 'n';
    assert.ok(!doc.includes(literalBackslashN), '文档不得出现字面换行转义');
  });

  it('第二轮返修单落点（FX-17…FX-25）在文档中可核', () => {
    const anchors = [
      ['FX-17', 'COPY_ACTION_IDS'],
      ['FX-17', 'ACTION_ID_ATTR'],
      ['FX-17', 'listActionIds'],
      ['FX-17', '端到端接线示例'],
      ['FX-18', 'SHARED_HELPERS_JS_RULE'],
      ['FX-18', '允许 DOM 读取'],
      ['FX-18', '禁 `node:`'],
      ['FX-19', '占位符契约'],
      ['FX-19', '死资产'],
      ['FX-19', '#107'],
      ['FX-20', '逐值断言'],
      ['FX-21', 'docs/research/t92-architect-calls.md'],
      ['FX-22', 'buildChartsHelpersJs'],
      ['FX-23', 'SENSITIVE_ROW_RULE'],
      ['FX-23', '（敏感字段已脱敏）'],
      ['FX-24', '契约自定的 JSON 转义规则'],
      ['FX-25', 'calorie-architecture.md:54'],
    ];
    for (const [fx, needle] of anchors) assert.ok(doc.includes(needle), fx + ' 落点缺失：' + needle);
  });

  it('FX-21：溯源指针指向已归档的 AC 条文（不得再指 rulings 或 .scratch）', () => {
    assert.ok(doc.includes('docs/research/t92-architect-calls.md'), 'AC-1…AC-17 出处必须指归档文件');
    const rulings = readFileSync(new URL('../../../docs/research/t92-architect-rulings.md', import.meta.url), 'utf8');
    assert.ok(!/^## AC-/m.test(rulings), 'rulings 文件不含 AC 条文（故不得作为 AC 出处）');
    const archived = readFileSync(new URL('../../../docs/research/t92-architect-calls.md', import.meta.url), 'utf8');
    for (let i = 1; i <= 17; i += 1) assert.ok(archived.includes('## AC-' + i), '归档件缺 AC-' + i);
    for (const line of splitLines(doc)) {
      if (!line.includes('.scratch/t92/ARCHITECT-CALLS.md')) continue;
      assert.ok(line.includes('归档'), '提及 .scratch 原路径时必须在同一行写明「已归档」：' + line);
    }
  });

  it('FX-24：u003c 归因正确（契约自定规则，非旧侧行为）', () => {
    assert.ok(doc.includes('契约自定的 JSON 转义规则'), '必须写明 u003c 是契约自定规则');
    assert.ok(doc.includes('injector.py:119'), '仍须给出旧侧真实行为的证据行号');
    assert.ok(!doc.includes('`injector.py:119-120` 即此形态'), '旧归因措辞必须删除（u003c 不是旧侧行为）');
  });
});

describe('冻结口径逐值', () => {
  it('六个占位符逐字 + 数量规则（AC-6／AC-12／#118 A1）', () => {
    assert.deepEqual(TEMPLATE_MARKERS, {
      injectData: '<!--INJECT-DATA-->',
      content: '<!--CONTENT-->',
      sharedHelpers: '<!--SHARED-HELPERS-->',
      sharedCss: '<!--SHARED-CSS-->',
      chartsHelpers: '<!--CHARTS-HELPERS-->',
      noShared: '<!--NO-SHARED-->',
    });
    assert.equal(MARKER_RULES.injectData.rule, 'zero-or-one', '#118 D-2：INJECT-DATA 放宽为 zero-or-one');
    assert.equal(MARKER_RULES.injectData.required, false, '#118 D-2：INJECT-DATA required 放宽为 false');
    assert.equal(MARKER_RULES.content.rule, 'zero-or-one', '#118 D-1：CONTENT 为 zero-or-one');
    assert.equal(MARKER_RULES.content.required, false);
    assert.equal(MARKER_RULES.content.exemptable, false);
    assert.equal(MARKER_RULES.content.literal, '<!--CONTENT-->');
    assert.equal(MARKER_RULES.sharedHelpers.rule, 'exactly-one');
    assert.equal(MARKER_RULES.sharedCss.rule, 'exactly-one');
    assert.equal(MARKER_RULES.chartsHelpers.rule, 'zero-or-one');
    assert.equal(MARKER_RULES.noShared.rule, 'zero-or-one-exempt');
    assert.equal(MARKER_RULES.sharedCss.exemptable, true, 'NO-SHARED 是唯一豁免通道');
    assert.equal(MARKER_RULES.injectData.exemptable, false, 'INJECT-DATA 不可豁免（AC-12 认领）');
    assert.deepEqual([...INJECTION_ORDER], ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']);
    assert.ok(!INJECTION_ORDER.includes('content'), '#118：CONTENT 不在 INJECTION_ORDER 内（既有冻结签名不得改，见契约 §3.1.2）');
    for (const lit of Object.values(TEMPLATE_MARKERS)) assert.ok(doc.includes(lit), '文档缺占位符逐字：' + lit);
  });

  it('样式 token 恰 11 个、逐值、无 Q14 禁入项（AC-9／Q12／Q14）', () => {
    assert.equal(Object.keys(CSS_VAR_TOKENS).length, 11);
    assert.equal(CSS_VAR_TOKENS['--blue'], '#007aff', 'Q12 主色锁定 B1');
    assert.equal(CSS_VAR_TOKENS['--fg'], '#1d1d1f');
    assert.equal(CSS_VAR_TOKENS['--bg'], '#f5f5f7');
    assert.equal(CSS_VAR_TOKENS['--ok'], '#34c759');
    assert.ok(CSS_VAR_TOKENS['--shadow'].includes('0 12px 36px'));
    assert.deepEqual([...STYLE_FORBIDDEN_TOKENS], ['--r-xl', '--pink']);
    for (const name of Object.keys(CSS_VAR_TOKENS)) assert.ok(doc.includes(name + ': ' + CSS_VAR_TOKENS[name]), '文档缺 token 逐值：' + name);
  });

  it('复制双通道逐字（Q13／AC-16）', () => {
    assert.deepEqual([...COPY_CHANNELS], ['clipboard', 'fallback']);
    assert.equal(CONTROLS_HOST_REQUIREMENT, 'none', '控件必须无宿主可用');
  });

  it('控件清单与可用性表一一对应（AC-16②）', () => {
    assert.deepEqual(Object.keys(CONTROL_AVAILABILITY).sort(), [...CONTROL_NAMES].sort());
    for (const name of CONTROL_NAMES) {
      const a = CONTROL_AVAILABILITY[name];
      assert.equal(typeof a.staticHtml, 'boolean');
      assert.equal(typeof a.needsRuntime, 'boolean');
      if (a.needsRuntime) assert.ok(a.runtimePort !== null, name + ' 需运行时就必须声明端口');
      if (!a.needsRuntime) assert.equal(a.runtimePort, null, name + ' 纯静态不得声明端口');
    }
    assert.equal(CONTROL_AVAILABILITY.statusBadge.needsRuntime, false);
    assert.equal(CONTROL_AVAILABILITY.emptyState.needsRuntime, false);
  });

  it('envelope 形状表与 link-core 同步（AC-13 零依赖自持 + 漂移钉死）', () => {
    assert.deepEqual([...STRICT_ENVELOPE_SHAPES], [...ENVELOPE_SHAPES]);
    const serializable = new Set(SERIALIZABLE_SHAPES);
    assert.equal(serializable.size, SERIALIZABLE_SHAPES.length, 'SERIALIZABLE_SHAPES 不得重复');
    for (const s of serializable) assert.ok(ENVELOPE_SHAPES.includes(s), s + ' 不在 link-core 形状表内');
    assert.deepEqual([...ENVELOPE_SHAPES].filter((s) => !serializable.has(s)), ['fallback'], '唯一排除项必须是 fallback');
  });

  it('escapeHtml 五字符口径（AC-14）：当前实现 4/5，本断言是漂移哨兵', () => {
    assert.deepEqual([...ESCAPE_HTML_CHARS], ['&', '<', '>', '"', "'"]);
    for (const ch of ESCAPE_HTML_CHARS.filter((c) => c !== "'")) assert.notEqual(escapeHtml(ch), ch);
    // 哨兵（FX-16）：本断言当前为真**只表示 AC-14 归一尚未执行**，不代表该行为被契约接受。
    // AC-14 归一（五字符 `& < > " '`）落地后，本断言**必须翻转**为 assert.equal(escapeHtml("'"), '&#39;')；
    // 契约 §3.3／§7 已把它登记为待翻转 tripwire，执行归 #74（#79 复核）。
    assert.equal(escapeHtml("'"), "'", "单引号尚未归一 → AC-14 归一后本断言必须翻转为 &#39;（不得把缺陷固化）");
  });

  it('逐 shape 投影表（FX-1①）：5 个可序列化 shape 全覆盖且逐值', () => {
    assert.deepEqual(Object.keys(DATA_TEXT_PROJECTIONS).sort(), [...SERIALIZABLE_SHAPES].sort(), '投影表必须覆盖全部可序列化 shape');
    assert.deepEqual({ ...DATA_TEXT_PROJECTIONS.stat }, { header: '【{skill} · {key}】', body: 'metrics', tail: null, csvSections: ['metrics'] });
    assert.deepEqual({ ...DATA_TEXT_PROJECTIONS.list }, { header: '【{skill} · {key}】', body: 'items', tail: 'total', csvSections: ['items', 'total'] });
    assert.deepEqual({ ...DATA_TEXT_PROJECTIONS.detail }, { header: '【{skill} · {key}】', body: 'item', tail: null, csvSections: ['item'] });
    assert.deepEqual({ ...DATA_TEXT_PROJECTIONS.receipt }, { header: '【{skill} · {key}】', body: 'ok', tail: 'message', csvSections: ['status', 'message'] });
    assert.deepEqual({ ...DATA_TEXT_PROJECTIONS.analysis }, { header: '【{skill} · {key}】', body: 'summary', tail: null, csvSections: ['summary'] });
  });

  it('6 段日志数据源（FX-1③）：scene 由 envelope 派生，其余 5 段取 CopyLogFields', () => {
    assert.deepEqual(Object.keys(LOG_SECTION_SOURCES).sort(),
      ['callChain', 'dataStructure', 'exception', 'scene', 'thinking', 'timestampVersion'].sort());
    assert.equal(LOG_SECTION_SOURCES.scene, 'envelope', 'scene 段必须由 envelope 派生（skill／key／shape）');
    assert.equal(LOG_SECTION_SOURCES.thinking, 'copyLog.thinking');
    assert.equal(LOG_SECTION_SOURCES.dataStructure, 'copyLog.dataStructure');
    assert.equal(LOG_SECTION_SOURCES.callChain, 'copyLog.callChain');
    assert.equal(LOG_SECTION_SOURCES.timestampVersion, 'copyLog.timestamp', 'timestampVersion 段取 copyLog.timestamp');
    assert.equal(LOG_SECTION_SOURCES.exception, 'copyLog.exception');
    assert.equal(Object.values(LOG_SECTION_SOURCES).filter((v) => v === 'envelope').length, 1, '恰好 1 段由 envelope 派生');
    // FX-27（V5 C-5）：段序本身是契约（§3.4「段序恒按 `LOG_SECTIONS`」）——逐值顺序锁定，不只看成员集。
    assert.deepEqual([...LOG_SECTIONS], ['scene', 'thinking', 'dataStructure', 'callChain', 'timestampVersion', 'exception'],
      '段序恒按 LOG_SECTIONS：顺序是契约，重排成员即红');
    const rows = logSectionRows(doc);
    assert.equal(rows.length, LOG_SECTIONS.length, '§3.4 段序表必须逐段 1 行，实为 ' + rows.length);
    assert.deepEqual(rows.map((r) => r[1]), [...LOG_SECTIONS], '文档段序表的成员列必须与 LOG_SECTIONS 逐值同序');
    assert.deepEqual(rows.map((r) => r[2]), [...LOG_SECTIONS].map((s) => LOG_SECTION_TITLES[s]),
      '文档段序表的标题列必须与 LOG_SECTION_TITLES 逐段同序同值');
  });

  it('INJECT-DATA 容器口径与 HELP 复制文案（FX-2／FX-7）', () => {
    assert.equal(TEMPLATE_ERROR_CODES.length, 8, '#118 A3：既有 7 个 ＋ content-missing');
    assert.deepEqual([...TEMPLATE_ERROR_CODES].slice(0, 7),
      ['marker-missing', 'marker-duplicate', 'marker-conflict', 'data-missing', 'container-missing', 'asset-missing', 'strict-invalid'],
      '#118 A3：只追加——既有 7 个逐字逐序不变，content-missing 在末尾');
    assert.ok([...TEMPLATE_ERROR_CODES].includes('content-missing'), '#118 D-4：正文缺失必须有错误码');
    assert.ok([...TEMPLATE_ERROR_CODES].includes('container-missing'), '模板缺自带容器必须有错误码');
    assert.equal(DEFAULT_DATA_SCRIPT_ID, 'payload');
    assert.equal(DATA_SCRIPT_TYPE, 'application/json');
    assert.deepEqual(Object.keys(HELP_COPY_ACTIONS).sort(), [...HELP_COPY_TARGETS].sort());
    assert.equal(HELP_COPY_ACTIONS.prompt.label, '复制指令', 'prompt 目标文案必须是「复制指令」');
    assert.equal(HELP_COPY_ACTIONS.wakeWord.label, '复制唤醒词');
    assert.equal(HELP_COPY_ACTIONS.params.label, '复制参数');
    for (const t of HELP_COPY_TARGETS) {
      assert.ok(HELP_COPY_ACTIONS[t].actionId.startsWith('ilife-help-copy-'), t + ' actionId 必须带 ilife-help-copy- 前缀');
    }
  });

  it('scene-data.schema.json 若随包发布必须由 SCENE_DATA_SCHEMA 生成（FX-6）', () => {
    for (const u of [new URL('../dist/scene-data.schema.json', import.meta.url), new URL('../scene-data.schema.json', import.meta.url)]) {
      if (!existsSync(u)) continue;
      const parsed = JSON.parse(readFileSync(u, 'utf8'));
      assert.deepEqual(parsed, JSON.parse(JSON.stringify(SCENE_DATA_SCHEMA)),
        '随包发布的 schema 必须由 SCENE_DATA_SCHEMA 序列化生成，禁止手写第二真相：' + u.pathname);
    }
  });

  it('图表 8 接口，无白名单例外（B4／AC-17）', () => {
    assert.deepEqual([...CHART_KINDS], ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']);
    assert.ok(doc.includes('**不移植**（B4）'), 'B4：图表白名单例外必须显式写成不移植');
  });

  it('scene-data 取 types（AC-3）＋ 机读 schema 权威（AC-4）', () => {
    assert.equal(SCENE_TYPE_FIELD, 'types');
    assert.deepEqual([...SCENE_DATA_SCHEMA.required], ['skill_name', 'title', 'groups']);
    assert.equal(SCENE_DATA_SCHEMA.additionalProperties, false);
    const scene = SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups.items.properties.scenes.items.properties;
    assert.ok('types' in scene, '机读 schema 必须用 types');
    assert.ok(!('type' in scene), '机读 schema 不得有单数 type');
    for (const k of ['init_banner', 'contact', 'version', 'recommendations']) {
      assert.ok(k in SCENE_DATA_SCHEMA.properties, '旧 schema 漏字段必须补进唯一权威：' + k);
    }
  });

  it('版本口径（B8／AC-10）＋ changeset 交付（D5）', () => {
    assert.equal(BASE_PAINT_CONTRACT_VERSION, RENDER_CONTRACT_VERSION);
    assert.equal(BASE_PAINT_CONTRACT_VERSION, ENVELOPE_VERSION);
    const cs = readFileSync(new URL('../../../.changeset/base-paint-contract-freeze.md', import.meta.url), 'utf8');
    assert.ok(cs.includes("'base-paint': minor"), 'changeset 必须声明 base-paint minor');
    assert.ok(cs.includes('#92'), 'changeset 必须引票号');
    assert.ok(cs.includes('#79'), 'changeset 必须写明 B8 统一版本归 #79');
  });

  /** FX-20（V4 N-4）：这 27 条曾「清单文本 ↔ 文档表」双约束、无任何断言 → 逐值钉死。 */
  const FX20_VALUE_LOCKS = [
    'STRICT_ENVELOPE_FIELDS', 'STYLE_SHEET_ID', 'COPY_TEXT_DEFAULTS', 'TOAST_ICONS', 'TOAST_DEFAULTS',
    'ACTION_BAR_KINDS', 'ACTION_BAR_DEFAULTS', 'STATUS_DEFAULT_TEXT', 'CONTROLS_ERROR_CODES',
    'LOG_SECTION_TITLES', 'LOG_UNKNOWN_PLACEHOLDER', 'TEXT_EMPTY_PLACEHOLDER', 'TEXT_SENSITIVE_MASK',
    'TEXT_HEADER_TEMPLATE', 'TEXT_JSON_INDENT', 'TEXT_JSON_LT_RULE', 'CSV_DIALECT', 'TEXT_ERROR_CODES',
    'CHARTS_STYLE_ID', 'CHART_STRUCTURE_RULE', 'CHART_EMPTY_RULE', 'CHART_COORD_RULE', 'CHART_BREAKPOINTS',
    'CHART_PALETTE', 'CHART_ERROR_CODES', 'HELP_SHELL_ID', 'HELP_SCHEMA_ERROR_CODES',
  ];

  it('FX-20：27 条运行时条目逐值断言（V4 N-4 名单，改 spec 值即红）', () => {
    assert.equal(FX20_VALUE_LOCKS.length, 27, '名单必须 27 条');
    for (const n of FX20_VALUE_LOCKS) {
      const e = manifest.find((x) => x.name === n);
      assert.ok(e, n + ' 不在冻结面清单');
      assert.equal(e.kind, 'runtime', n + ' 必须是运行时条目');
      assert.equal(e.status, 'implemented', n + ' 必须已落地');
    }
    assert.deepEqual([...STRICT_ENVELOPE_FIELDS], ['version', 'skill', 'shape', 'key', 'data']);
    assert.equal(STYLE_SHEET_ID, 'ilife-base');
    assert.deepEqual({ ...COPY_TEXT_DEFAULTS }, {
      emptyTextShortCircuit: true, failBadgeAlwaysOn: true, okMessage: '已复制', okDetail: '粘贴给 AI',
      failMessage: '复制失败', failDetail: '长按选择文本手动复制',
    });
    assert.deepEqual([...TOAST_ICONS], ['copy', 'ok', 'warn', 'danger', 'info']);
    assert.deepEqual({ ...TOAST_DEFAULTS }, {
      timeoutMs: 4500, maxStack: 5, mobileMaxStack: 3, mobileMaxPx: 820, gapPx: 8,
      role: 'status', ariaLive: 'polite', defaultIcon: 'copy',
    });
    assert.deepEqual([...ACTION_BAR_KINDS], ['primary', 'red', 'ghost']);
    assert.deepEqual({ ...ACTION_BAR_DEFAULTS }, {
      copyDataLabel: '复制数据', copyLogLabel: '复制日志', ghostOwnRow: true, evenRowPairs: 2,
      minHeightPx: 40, fontSizePx: 12, fontWeight: 600, ghostBorderAlpha: 0.38,
    });
    assert.deepEqual({ ...STATUS_DEFAULT_TEXT }, { ok: '成功', warn: '警告', danger: '失败', empty: '无数据' });
    assert.deepEqual([...CONTROLS_ERROR_CODES], ['bad-input', 'bad-format']);
    assert.deepEqual({ ...LOG_SECTION_TITLES }, {
      scene: '场景标识', thinking: 'AI 思考链', dataStructure: '数据结构',
      callChain: '调用链', timestampVersion: '时间戳版本', exception: '异常',
    });
    assert.equal(LOG_UNKNOWN_PLACEHOLDER, '(未知)');
    assert.equal(TEXT_EMPTY_PLACEHOLDER, '未填写');
    assert.equal(TEXT_SENSITIVE_MASK, '****');
    assert.equal(TEXT_HEADER_TEMPLATE, '【{skill} · {key}】');
    assert.equal(TEXT_JSON_INDENT, 2);
    assert.equal(TEXT_JSON_LT_RULE, 'u003c');
    assert.deepEqual({ ...CSV_DIALECT }, {
      delimiter: ',', quote: '"', quoteEscape: '""', lineEnding: 'LF', header: ['section', 'row'],
    });
    assert.deepEqual([...TEXT_ERROR_CODES], ['shape-unsupported', 'structure-invalid', 'format-unknown']);
    assert.equal(CHARTS_STYLE_ID, 'ilife-charts');
    assert.equal(CHART_STRUCTURE_RULE, 'throw');
    assert.equal(CHART_EMPTY_RULE, 'emptyState');
    assert.equal(CHART_COORD_RULE, 'viewBox-only');
    assert.deepEqual({ ...CHART_BREAKPOINTS }, { mobileMaxPx: 720, dotSizeMobilePx: 8, lineHeightMobilePx: 150, stackedGapPx: 3 });
    assert.deepEqual([...CHART_PALETTE], ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']);
    assert.deepEqual([...CHART_ERROR_CODES], ['structure-invalid', 'pct-invalid', 'kind-unknown']);
    assert.equal(HELP_SHELL_ID, 'ilife-help-shell');
    assert.deepEqual([...HELP_SCHEMA_ERROR_CODES], ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']);
  });

  it('FX-17：复制按钮 actionId 冻结表 ＋ 承载属性 ＋ 与 HELP 侧 id 不撞名', () => {
    assert.equal(ACTION_ID_ATTR, 'data-action-id');
    assert.equal(DEFAULT_DATA_ATTR, 'data-t', '复制文本承载属性名必须冻结为常量（渲染端与适配端同一约定）');
    assert.ok(doc.includes('渲染端恒用'), '文档必须写明 dataAttr 覆盖口径：渲染端恒用 DEFAULT_DATA_ATTR（FX-29／V5 C-6）');
    assert.deepEqual({ ...COPY_ACTION_IDS }, {
      actionBar: { copyData: 'ilife-copy-data', copyLog: 'ilife-copy-log' },
      errorReceipt: { copyData: 'ilife-error-copy-data', copyLog: 'ilife-error-copy-log' },
    });
    const ids = [
      COPY_ACTION_IDS.actionBar.copyData, COPY_ACTION_IDS.actionBar.copyLog,
      COPY_ACTION_IDS.errorReceipt.copyData, COPY_ACTION_IDS.errorReceipt.copyLog,
      ...HELP_COPY_TARGETS.map((t) => HELP_COPY_ACTIONS[t].actionId),
    ];
    assert.equal(new Set(ids).size, ids.length, '全部 base-paint actionId 必须页面内唯一（含 HELP 侧）');
    for (const id of ids) assert.ok(id.startsWith('ilife-'), id + ' 必须带 ilife- 前缀');
    assert.ok(doc.includes('ACTION_ID_ATTR'), '文档必须写明 actionId 承载属性');
    assert.ok(doc.includes('listActionIds'), '文档必须写明 actionId 发现机制');
  });

  it('FX-18：共享 JS 产出内容契约 ＋ 与扫描口径一致', () => {
    assert.deepEqual({ ...SHARED_HELPERS_JS_RULE }, {
      selfContained: true, idempotent: true, domAllowed: true,
      forbidGlobalAssignment: true, forbidNodeBuiltins: true,
    });
    assert.deepEqual(PURITY_CHECKS.map(([flag]) => flag), ['forbidNodeBuiltins', 'forbidGlobalAssignment'],
      '扫描实现必须只覆盖 SHARED_HELPERS_JS_RULE 里为 true 的两项（DOM 读取不扫）');
    assert.ok(doc.includes('SHARED_HELPERS_JS_RULE'), '文档必须冻结产出内容契约');
    assert.ok(doc.includes('允许 DOM 读取'), '文档必须写明允许 DOM 读取');
    assert.ok(doc.includes('剥注释后'), '扫描口径必须写明「剥注释后」（FX-26／V5 C-3，与 stripJsComments() 逐字对齐）');
  });

  it('FX-23：敏感行判定口径 ＋ 三 format 掩码文案', () => {
    assert.deepEqual({ ...SENSITIVE_ROW_RULE }, {
      textField: 'text', flagField: 'sensitive', flagValue: true, mask: '****', textNotice: '（敏感字段已脱敏）',
    });
    assert.equal(SENSITIVE_ROW_RULE.mask, TEXT_SENSITIVE_MASK, '掩码必须等于 TEXT_SENSITIVE_MASK（唯一真相）');
    assert.ok(doc.includes('SENSITIVE_ROW_RULE'), '文档必须冻结敏感行判定口径');
  });
});

describe('#118 契约补遗（CONTENT 槽位／载荷槽规则／包裹约定／模板分型）', () => {
  /** 分型判定（机读规则 `TEMPLATE_KIND_RULE` 的镜像实现）：按 required／forbidden 逐型试配。 */
  const classify = (counts) => TEMPLATE_KINDS.filter((k) => {
    const r = TEMPLATE_KIND_RULE[k];
    return r.required.every((m) => counts[m] === 1) && r.forbidden.every((m) => counts[m] === 0);
  });

  it('A2：载荷槽规则可机读（两者都有 → marker-conflict；都没有 → marker-missing）', () => {
    assert.deepEqual({ ...PAYLOAD_SLOT_RULE }, {
      members: ['injectData', 'content'], rule: 'exactly-one',
      conflictCode: 'marker-conflict', missingCode: 'marker-missing',
    });
    assert.equal(PAYLOAD_SLOT_RULE.members.length, 2, '载荷槽恰两成员');
    for (const m of PAYLOAD_SLOT_RULE.members) assert.ok(m in MARKER_RULES, m + ' 必须是已冻结标记');
    assert.ok(TEMPLATE_ERROR_CODES.includes(PAYLOAD_SLOT_RULE.conflictCode), '冲突码必须在错误码表内');
    assert.ok(TEMPLATE_ERROR_CODES.includes(PAYLOAD_SLOT_RULE.missingCode), '缺失码必须在错误码表内');
    // 恰有其一 → 合法分型；两者皆有 → 三型皆不命中（= marker-conflict 的机读判据）
    assert.deepEqual(classify({ injectData: 1, content: 0 }), ['data-page']);
    assert.deepEqual(classify({ injectData: 0, content: 1 }), ['content-page']);
    assert.deepEqual(classify({ injectData: 0, content: 0 }), ['legacy']);
    assert.deepEqual(classify({ injectData: 1, content: 1 }), [], '两者都有 → 不属任何型');
  });

  it('A5：三分型穷尽且互斥（无「两类都不属于且非 legacy」的模板）', () => {
    assert.deepEqual([...TEMPLATE_KINDS], ['data-page', 'content-page', 'legacy']);
    assert.deepEqual(Object.keys(TEMPLATE_KIND_RULE), [...TEMPLATE_KINDS], '规则表必须覆盖全部三型且同序');
    for (const k of TEMPLATE_KINDS) {
      const r = TEMPLATE_KIND_RULE[k];
      assert.ok(Array.isArray(r.required) && Array.isArray(r.forbidden), k + ' 必须给 required／forbidden');
      for (const m of [...r.required, ...r.forbidden]) assert.ok(m in MARKER_RULES, k + ' 引用了非标记：' + m);
      for (const m of r.required) assert.ok(!r.forbidden.includes(m), k + ' 同一标记不得既 required 又 forbidden');
    }
    assert.deepEqual([...TEMPLATE_KIND_RULE.legacy.forbidden].sort(), [...PAYLOAD_SLOT_RULE.members].sort(),
      'legacy 口径 = 两载荷槽皆无（与 PAYLOAD_SLOT_RULE 同口径）');
    for (const c of [{ injectData: 2, content: 0 }, { injectData: 0, content: 3 }]) {
      assert.deepEqual(classify(c), [], '数量不为 0／1 的组合不得命中任何型：' + JSON.stringify(c));
    }
  });

  it('A4：包裹约定＝资产裸文本 ＋ 填充器包裹（两条不变量 ＋ 断言）', () => {
    assert.deepEqual({ ...ASSET_WRAP_RULE }, {
      assetsBare: true, fillerWraps: true, forbidPreWrappedMarker: true,
      assetWrappedCode: 'asset-missing', markerPreWrappedCode: 'marker-conflict',
    });
    assert.ok(TEMPLATE_ERROR_CODES.includes(ASSET_WRAP_RULE.assetWrappedCode), '不变量①的错误码必须在错误码表内');
    assert.ok(TEMPLATE_ERROR_CODES.includes(ASSET_WRAP_RULE.markerPreWrappedCode), '不变量②的错误码必须在错误码表内');
    assert.deepEqual(Object.keys(ASSET_WRAPPERS).sort(), ['chartsHelpersJs', 'sharedCssText', 'sharedHelpersJs'],
      '包裹表必须与 TemplateAssets 同键集');
    assert.deepEqual({ ...ASSET_WRAPPERS.sharedCssText }, { openTag: '<style>', closeTag: '</style>' });
    assert.deepEqual({ ...ASSET_WRAPPERS.sharedHelpersJs }, { openTag: '<script>', closeTag: '</script>' });
    assert.deepEqual({ ...ASSET_WRAPPERS.chartsHelpersJs }, { openTag: '<script>', closeTag: '</script>' });
    assert.notEqual(ASSET_WRAPPERS.sharedCssText.openTag, ASSET_WRAPPERS.sharedHelpersJs.openTag,
      'CSS 与 JS 的包裹标签不得互换（style vs script）');
    for (const needle of ['ASSET_WRAP_RULE', 'ASSET_WRAPPERS', '不变量']) {
      assert.ok(doc.includes(needle), '文档缺包裹约定条文：' + needle);
    }
  });

  it('A6：与旧基线的偏离已显式记账（README.md:63 模板自带包裹 vs 本契约填充器包裹）', () => {
    assert.ok(doc.includes('README.md:63'), '必须引旧基线原文行号');
    assert.ok(doc.includes('填充器包裹'), '必须写明新约定');
    assert.ok(doc.includes('有意偏离'), '必须写明这是有意偏离');
    assert.ok(doc.includes('与旧基线的偏离'), '必须有偏离记账小节');
  });

  it('A1：CONTENT 槽位溯源＝新架构发明的槽位（旧基线 0 命中）', () => {
    assert.ok(doc.includes('新架构发明'), '必须写明 CONTENT 是新架构发明的槽位');
    assert.ok(doc.includes('零命中'), '必须写明旧基线 0 命中');
    assert.ok(doc.includes('content-missing'), '必须写明正文缺失错误码');
    for (const needle of ['正文槽位', '载荷槽', '模板分型']) assert.ok(doc.includes(needle), '文档缺 #118 小节：' + needle);
  });

  /* ── FX-118 返修机读自证（S-1…S-4） ───────────────────────── */

  /** §3.1.2⑤ 判定次序表的数据行（列：次序／阶段／触发条件／错误码）。 */
  const checkOrderRows = (text) => {
    const body = text.split('**⑤ 错误码判定次序（机读，FX-118-2）**')[1]?.split('**所属包**')[0] ?? '';
    return splitLines(body).filter((l) => l.trim().startsWith('|')).map(parseRow)
      .filter((c) => c[0] !== '次序' && !/^-+$/.test(c[0]));
  };

  /** 包裹不变量②判定执行：作用域／标签名／判定方式**全部读冻结常量**（`WRAP_PREDICATES`／
   *  `ASSET_WRAPPERS`）；方式名不符即抛错，避免静默漂移。本函数只做「按冻结谓词执行」，
   *  不构成第二份实现。 */
  const preWrappedMarkers = (template) => {
    const p = WRAP_PREDICATES.forbidPreWrappedMarker;
    assert.equal(p.method, 'enclosing-open-tag', '谓词方式漂移：' + p.method);
    const tagNames = [...new Set(Object.values(ASSET_WRAPPERS).map((w) => w.openTag.slice(1, -1)))];
    const hits = [];
    for (const key of p.scope) {
      const literal = TEMPLATE_MARKERS[key];
      for (let idx = template.indexOf(literal); idx >= 0; idx = template.indexOf(literal, idx + 1)) {
        const before = template.slice(0, idx);
        if (tagNames.some((t) => before.lastIndexOf('<' + t) > before.lastIndexOf('</' + t))) { hits.push(key); break; }
      }
    }
    return hits;
  };

  /** 容器判定执行（作用域／id／type 恒取 `CONTAINER_CHECK_RULE`）；返回错误码或 null。 */
  const containerCode = (sample) => {
    if ((sample.counts[CONTAINER_CHECK_RULE.appliesWhenMarker] ?? 0) === 0) return null;
    const c = sample.container;
    return c && c.id === CONTAINER_CHECK_RULE.id && c.type === CONTAINER_CHECK_RULE.type ? null : CONTAINER_CHECK_RULE.code;
  };

  /** 次序裁决器（**非填充器实现**——`fillTemplate` 仍 pending，见下「不得实现」断言）：
   *  只回答「哪些码命中」与「谁最先」，条件判定读冻结常量，顺序读 `TEMPLATE_CHECK_ORDER`。 */
  const codesHit = (sample) => {
    const set = new Set();
    const c = sample.counts;
    if (Object.values(c).some((n) => n > 1)) set.add('marker-duplicate');
    const slots = PAYLOAD_SLOT_RULE.members.map((m) => c[m] ?? 0);
    if (slots.every((n) => n === 0)) set.add(PAYLOAD_SLOT_RULE.missingCode);
    if (slots.every((n) => n >= 1)) set.add(PAYLOAD_SLOT_RULE.conflictCode);
    if ((c.noShared ?? 0) > 0 && ((c.sharedCss ?? 0) > 0 || (c.sharedHelpers ?? 0) > 0)) set.add('marker-conflict');
    if (sample.preWrapped.length > 0) set.add(WRAP_PREDICATES.forbidPreWrappedMarker.code);
    if (containerCode(sample) !== null) set.add(CONTAINER_CHECK_RULE.code);
    if (sample.assetsWrapped) set.add(WRAP_PREDICATES.assetsBare.code);
    if (slots[0] >= 1 && sample.dataMissing) set.add('data-missing');
    if (slots[1] >= 1 && sample.contentMissing) set.add('content-missing');
    if (sample.strictInvalid) set.add('strict-invalid');
    return set;
  };
  const firstHit = (sample) => TEMPLATE_CHECK_ORDER.find((code) => codesHit(sample).has(code)) ?? null;
  const sampleOf = (counts, extra = {}) => ({
    counts, container: null, preWrapped: [], assetsWrapped: false,
    dataMissing: false, contentMissing: false, strictInvalid: false, ...extra,
  });

  it('FX-118-1／S-1：容器校验仅当模板含 INJECT-DATA 时执行（内容页无容器合法）', () => {
    assert.deepEqual({ ...CONTAINER_CHECK_RULE }, {
      appliesWhenMarker: 'injectData', openTag: '<script>', closeTag: '</script>',
      id: 'payload', type: 'application/json', code: 'container-missing',
    });
    assert.ok(TEMPLATE_ERROR_CODES.includes(CONTAINER_CHECK_RULE.code), '容器码必须在错误码表内');
    assert.equal(CONTAINER_CHECK_RULE.openTag, ASSET_WRAPPERS.sharedHelpersJs.openTag, '容器标签复用 ASSET_WRAPPERS，不得另写字面量');
    assert.equal(CONTAINER_CHECK_RULE.id, DEFAULT_DATA_SCRIPT_ID);
    assert.equal(CONTAINER_CHECK_RULE.type, DATA_SCRIPT_TYPE);
    // S-1：内容页模板（无容器）→ 不执行容器校验 → 不抛 container-missing
    assert.equal(containerCode(sampleOf({ injectData: 0, content: 1 })), null, 'S-1：内容页无容器必须合法');
    // 数据页缺容器 / id 或 type 不符 → container-missing
    assert.equal(containerCode(sampleOf({ injectData: 1, content: 0 })), 'container-missing');
    assert.equal(containerCode(sampleOf({ injectData: 1, content: 0 }, { container: { id: 'payload', type: 'text/plain' } })), 'container-missing');
    assert.equal(containerCode(sampleOf({ injectData: 1, content: 0 }, { container: { id: 'help-data', type: 'application/json' } })), 'container-missing');
    // 合规容器 → 通过
    assert.equal(containerCode(sampleOf({ injectData: 1, content: 0 }, { container: { id: 'payload', type: 'application/json' } })), null);
    assert.ok(doc.includes('仅当模板含 `<!--INJECT-DATA-->` 时执行'), 'FX-118-1：§3.1 必须写明容器校验的条件性');
    assert.ok(doc.includes('不可能**抛 `container-missing`'), 'FX-118-1：内容页不抛容器码必须写进条文');
  });

  it('FX-118-3／S-2：不变量②作用域排除 injectData（数据页容器不算预包裹）', () => {
    assert.deepEqual([...WRAP_PREDICATES.forbidPreWrappedMarker.scope].sort(), Object.values(ASSET_MARKER_KEYS).sort(),
      '作用域必须等于 ASSET_MARKER_KEYS 的值集');
    assert.deepEqual(Object.keys(ASSET_MARKER_KEYS).sort(), Object.keys(ASSET_WRAPPERS).sort(),
      '资产键映射必须与 ASSET_WRAPPERS 同键集');
    assert.deepEqual([...WRAP_PREDICATES.forbidPreWrappedMarker.excludes], ['injectData']);
    assert.ok(!WRAP_PREDICATES.forbidPreWrappedMarker.scope.includes('injectData'), 'injectData 必须在作用域外');
    // S-2：memo 数据页形态（INJECT-DATA 落在自带容器内 ＋ 两个共享标记被包裹）
    const dataPage = [
      '<style><!--SHARED-CSS--></style>',
      '<script id="payload" type="application/json"><!--INJECT-DATA--></script>',
      '<script><!--SHARED-HELPERS--></script>',
    ].join(LF);
    const hits = preWrappedMarkers(dataPage).sort();
    assert.ok(!hits.includes('injectData'), 'S-2：容器内的 INJECT-DATA 不得判为预包裹（否则不抛 marker-conflict）');
    assert.deepEqual(hits, ['sharedCss', 'sharedHelpers'], '只有作用域内标记参与判定');
    // 内容页形态（裸标记）→ 零命中
    assert.deepEqual(preWrappedMarkers(['<!--SHARED-CSS-->', '<!--CONTENT-->', '<!--SHARED-HELPERS-->'].join(LF)), []);
    // 跨行预包裹同样命中（口径＝扫描整个前缀，不限同行）
    assert.deepEqual(preWrappedMarkers(['<style>', '<!--SHARED-CSS-->', '</style>'].join(LF)), ['sharedCss']);
    assert.ok(doc.includes('排除 `injectData`'), 'FX-118-3：文档必须写明作用域排除 injectData');
    assert.ok(doc.includes('enclosing-open-tag') && doc.includes('trim-prefix-or-suffix'), 'FX-118-3：两种判定方式必须写进条文');
  });

  it('FX-118-3／S-3：两条不变量的判定谓词只有一份实现（契约常量 ＋ 工具脚本共用）', () => {
    assert.deepEqual({ ...WRAP_PREDICATES.assetsBare }, {
      scope: ['sharedCssText', 'sharedHelpersJs', 'chartsHelpersJs'],
      method: 'trim-prefix-or-suffix', code: 'asset-missing',
    });
    assert.deepEqual([...WRAP_PREDICATES.assetsBare.scope].sort(), Object.keys(ASSET_WRAPPERS).sort(), '不变量①作用域 = ASSET_WRAPPERS 键集');
    assert.equal(WRAP_PREDICATES.assetsBare.code, ASSET_WRAP_RULE.assetWrappedCode);
    assert.equal(WRAP_PREDICATES.forbidPreWrappedMarker.code, ASSET_WRAP_RULE.markerPreWrappedCode);
    const toolSrc = readFileSync(new URL('../../../tooling/classify-templates.mjs', import.meta.url), 'utf8');
    const toolCode = stripJsComments(toolSrc);
    for (const needle of ['WRAP_PREDICATES', 'ASSET_WRAPPERS', 'ASSET_MARKER_KEYS', 'TEMPLATE_KINDS', 'CONTAINER_CHECK_RULE', 'TEMPLATE_MARKERS']) {
      assert.ok(toolSrc.includes(needle), 'FX-118-9：分类脚本必须复用冻结常量：' + needle);
    }
    assert.ok(!/['"]<style['"]|['"]<script['"]/.test(toolCode), 'FX-118-9：脚本代码不得硬编码包裹标签字面量');
    assert.ok(!/['"](?:data-page|content-page|legacy)['"]/.test(toolCode), 'FX-118-9：脚本代码不得硬编码分型字符串');
    assert.ok(!toolSrc.includes('其它'), 'FX-118-10②：分型三名统一为「遗留」（不得再用「其它」）');
  });

  it('FX-118-2／S-4：判定次序唯一且多条件输入下首个命中即抛', () => {
    assert.deepEqual([...TEMPLATE_CHECK_ORDER], [
      'marker-duplicate', 'marker-missing', 'marker-conflict', 'container-missing',
      'asset-missing', 'data-missing', 'content-missing', 'strict-invalid',
    ]);
    assert.equal(TEMPLATE_CHECK_ORDER.length, TEMPLATE_ERROR_CODES.length, '次序必须覆盖全部错误码');
    assert.deepEqual([...TEMPLATE_CHECK_ORDER].sort(), [...TEMPLATE_ERROR_CODES].sort(), '次序是错误码表的一个排列');
    assert.equal(new Set(TEMPLATE_CHECK_ORDER).size, TEMPLATE_CHECK_ORDER.length, '次序不得重复');
    // 文档 §3.1.2⑤ 次序表的「错误码」列必须与常量逐值同序
    const rows = checkOrderRows(doc);
    assert.equal(rows.length, TEMPLATE_CHECK_ORDER.length, '§3.1.2⑤ 次序表必须逐码 1 行，实为 ' + rows.length);
    assert.deepEqual(rows.map((r) => r[3]), [...TEMPLATE_CHECK_ORDER], '§3.1.2⑤ 次序表的错误码列必须与 TEMPLATE_CHECK_ORDER 逐值同序');
    // S-4 样本①：真实 calorie 形态（两载荷槽皆无 ＋ SHARED-CSS 预包裹）→ 命中 2 条，取靠前的 marker-missing
    const legacy = sampleOf({ injectData: 0, content: 0, sharedCss: 1, sharedHelpers: 1 }, { preWrapped: ['sharedCss'] });
    assert.equal(codesHit(legacy).size, 2, '样本必须同时命中 ≥2 条（否则验证无意义）');
    assert.equal(firstHit(legacy), 'marker-missing', 'S-4①：legacy＋预包裹 → marker-missing（次序 2 早于 3）');
    // S-4 样本②：重复 ＋ 缺槽 ＋ 预包裹 ＋ 空资产 → 命中 4 条，取 marker-duplicate
    const dup = sampleOf({ injectData: 0, content: 0, sharedCss: 1, sharedHelpers: 2 },
      { preWrapped: ['sharedCss', 'sharedHelpers'], assetsWrapped: true });
    assert.ok(codesHit(dup).size >= 3, '样本②必须同时命中 ≥3 条');
    assert.equal(firstHit(dup), 'marker-duplicate', 'S-4②：重复优先于缺槽／冲突／资产');
    // S-4 样本③：两载荷槽皆有 ＋ 缺容器 → marker-conflict 优先于 container-missing
    const both = sampleOf({ injectData: 1, content: 1, sharedCss: 1, sharedHelpers: 1 });
    assert.equal(firstHit(both), 'marker-conflict');
    // S-4 样本④：数据页合规容器但 data 缺失 ＋ strict 非法 → data-missing 优先于 strict-invalid
    const badData = sampleOf({ injectData: 1, content: 0, sharedCss: 1, sharedHelpers: 1 },
      { container: { id: 'payload', type: 'application/json' }, dataMissing: true, strictInvalid: true });
    assert.equal(firstHit(badData), 'data-missing');
    assert.ok(doc.includes('首个命中即抛、不聚合'), 'FX-118-2：文档必须写明「首个命中即抛、不聚合」');
    // 本票不得实现 fillTemplate（仍归 #74）
    assert.ok(!runtimeKeys.has('fillTemplate'), 'FX-118：fillTemplate 必须仍未实现（归 #74）');
    assert.ok(doc.includes('无先后语义') && !doc.includes('恒为最后一步'), 'FX-118-6：正文时序两说必须统一');
  });

  it('FX-118-4／5／8／10：迁移面、占位符口径、证据路径与三处措辞', () => {
    assert.ok(doc.includes('生产接线不属 #74'), 'FX-118-4：memo 生产接线归属必须写明');
    assert.ok(doc.includes('迁移后满足'), 'FX-118-5：memo 数据页须写「迁移后满足」');
    assert.ok(doc.includes('docs/research/t118-template-inventory.md'), 'FX-118-8：证据指针必须指向仓内路径');
    assert.ok(doc.includes('一码多义由 `message` 辨因'), 'FX-118-10①：一码多义必须要求 message 辨因');
    assert.ok(doc.includes('勿与 `</script>`/`</style>` 字样混在资产注释里'), 'FX-118-10③：README:63 引用必须补全后半句');
    assert.ok(doc.includes('仅对合法模板（计数 ∈ {0,1}）成立'), 'FX-118-7：三型穷尽性必须加计数限定');
    assert.ok(doc.includes('不是 `marker-conflict`'), 'FX-118-7：计数 >1 的码归属必须更正为 marker-duplicate');
    for (const k of TEMPLATE_KINDS) {
      assert.equal(TEMPLATE_KIND_RULE[k].noKindCode, PAYLOAD_SLOT_RULE.conflictCode, 'FX-118-7：noKindCode 必须等于载荷槽冲突码');
      assert.ok(TEMPLATE_ERROR_CODES.includes(TEMPLATE_KIND_RULE[k].noKindCode));
    }
  });
});

describe('门禁红线（AC-7／AC-13／browser-safe）', () => {
  it('base-paint 无运行时依赖、files 覆盖发布面', () => {
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
    assert.ok(pkg.files.includes('dist'), 'files 必须含 dist（契约资产随 dist 发布）');
    assert.ok(!JSON.stringify(pkg).includes('base-combos'), 'L16：package.json 不得出现 base-combos 字样');
  });

  it('dist 资产 browser-safe：无 node:、无隐式全局赋值；DOM 读取允许（FX-18 收窄口径）', () => {
    assert.equal(SHARED_HELPERS_JS_RULE.domAllowed, true, '共享 JS 允许页面侧 DOM 读取（FX-18②）');
    assert.equal(SHARED_HELPERS_JS_RULE.forbidNodeBuiltins, true);
    assert.equal(SHARED_HELPERS_JS_RULE.forbidGlobalAssignment, true);
    const files = listDistJs(fileURLToPath(new URL('../dist', import.meta.url)));
    assert.ok(files.length > 0, 'dist 无 JS 产物');
    assert.ok(files.some((p) => p.includes('spec') && p.endsWith('.js')), '扫描必须覆盖 dist/spec/*.js（FX-18 收窄口径后仍须递归）');
    for (const p of files) {
      const src = readFileSync(p, 'utf8');
      assert.deepEqual(purityViolations(src), [], p + ' 违反纯度口径');
    }
  });

  it('纯度扫描口径自证（FX-18）：含 DOM 的合法 helpers JS 过门，隐式全局赋值／node: 不过门', () => {
    const legalHelpersJs = [
      '(function () {',
      '  if (document.querySelector(\'[data-ilife-helpers="1"]\')) return;',
      '  var root = document.createElement("div");',
      '  root.setAttribute("data-ilife-helpers", "1");',
      '  document.addEventListener("click", function (ev) {',
      '    var el = ev.target && ev.target.closest ? ev.target.closest("[data-action-id]") : null;',
      '    if (!el) return;',
      '    void el.getAttribute("data-t");',
      '  });',
      '  document.body.appendChild(root);',
      '}());',
    ].join(LF);
    // ① 含 DOM 的合法 helpers JS 必须过门（FX-18 自证①）
    assert.deepEqual(purityViolations(legalHelpersJs), [], '含 DOM 的合法 helpers JS 必须过纯度门');
    assert.ok(legalHelpersJs.includes('document.'), '样本必须真的含 DOM 读取');
    // ② 负样本必须被拦（否则口径形同虚设）
    assert.deepEqual(purityViolations('window.__hmPayload = {};'), ['window／globalThis 隐式全局赋值']);
    assert.deepEqual(purityViolations('globalThis.toast = function () {};'), ['window／globalThis 隐式全局赋值']);
    assert.deepEqual(purityViolations("import { readFileSync } from 'node:fs';"), ['node: 内建']);
    assert.deepEqual(purityViolations("import 'node:fs';"), ['node: 内建'], '裸副作用 import 必须被拦（FX-28／V5 C-1）');
    assert.deepEqual(purityViolations("const fs = require('node:fs');"), ['node: 内建']);
    assert.deepEqual(purityViolations("await import('node:fs');"), ['node: 内建']);
    // 三种写法（裸 import／require／动态 import()）逐一自证，且换一个 node: 内建名同样命中（避免只锁 fs 字面）
    for (const sample of ["import 'node:path';", "const p = require('node:path');", "await import('node:path');"]) {
      assert.deepEqual(purityViolations(sample), ['node: 内建'], '三种写法都必须被拦：' + sample);
    }
    // ③ 注释里的说明文字不参与判定（dist 保留注释，禁的是代码）
    assert.deepEqual(purityViolations('/* 禁 window.toast = x 与 document.* 无关 */'), []);
  });

  it('src/spec/*.ts 只许 import type（AC-13）＋ 代码不得读写浏览器全局（AC-7）', () => {
    const dir = new URL('../src/spec/', import.meta.url);
    for (const f of readdirSync(dir)) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      const bad = src.match(/^\s*import\s+(?!type\b)/m);
      assert.equal(bad, null, f + ' 只许 import type');
      assert.ok(!/(?:from|import\s*\()\s*['"]node:/.test(src), f + ' 不得引 node:');
      const code = stripJsComments(src);
      assert.ok(!/\b(?:window|document|globalThis)\s*\./.test(code), f + ' 代码（非注释）不得读写浏览器全局');
      assert.ok(!/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(code), f + ' 不得向 window／globalThis 赋值');
    }
  });
});
