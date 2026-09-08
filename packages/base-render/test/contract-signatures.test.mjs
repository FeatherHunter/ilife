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
  BASE_PAINT_CONTRACT_VERSION,
  CHART_BREAKPOINTS,
  CHART_COORD_RULE,
  CHART_EMPTY_RULE,
  CHART_ERROR_CODES,
  CHART_KINDS,
  CHART_PALETTE,
  CHART_STRUCTURE_RULE,
  CHARTS_STYLE_ID,
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
  LOG_SECTION_SOURCES,
  LOG_SECTION_TITLES,
  LOG_UNKNOWN_PLACEHOLDER,
  MARKER_RULES,
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
  TEMPLATE_ERROR_CODES,
  TEMPLATE_MARKERS,
  TEXT_EMPTY_PLACEHOLDER,
  TEXT_ERROR_CODES,
  TEXT_HEADER_TEMPLATE,
  TEXT_JSON_INDENT,
  TEXT_JSON_LT_RULE,
  TEXT_SENSITIVE_MASK,
  TOAST_DEFAULTS,
  TOAST_ICONS,
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
  ['forbidNodeBuiltins', /(?:from|import\s*\(|require\s*\()\s*['"]node:/, 'node: 内建'],
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
  it('五个占位符逐字 + 数量规则（AC-6／AC-12）', () => {
    assert.deepEqual(TEMPLATE_MARKERS, {
      injectData: '<!--INJECT-DATA-->',
      sharedHelpers: '<!--SHARED-HELPERS-->',
      sharedCss: '<!--SHARED-CSS-->',
      chartsHelpers: '<!--CHARTS-HELPERS-->',
      noShared: '<!--NO-SHARED-->',
    });
    assert.equal(MARKER_RULES.injectData.rule, 'exactly-one');
    assert.equal(MARKER_RULES.injectData.required, true);
    assert.equal(MARKER_RULES.sharedHelpers.rule, 'exactly-one');
    assert.equal(MARKER_RULES.sharedCss.rule, 'exactly-one');
    assert.equal(MARKER_RULES.chartsHelpers.rule, 'zero-or-one');
    assert.equal(MARKER_RULES.noShared.rule, 'zero-or-one-exempt');
    assert.equal(MARKER_RULES.sharedCss.exemptable, true, 'NO-SHARED 是唯一豁免通道');
    assert.equal(MARKER_RULES.injectData.exemptable, false, 'INJECT-DATA 不可豁免（AC-12 认领）');
    assert.deepEqual([...INJECTION_ORDER], ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']);
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
  });

  it('INJECT-DATA 容器口径与 HELP 复制文案（FX-2／FX-7）', () => {
    assert.equal(TEMPLATE_ERROR_CODES.length, 7);
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
  });

  it('FX-23：敏感行判定口径 ＋ 三 format 掩码文案', () => {
    assert.deepEqual({ ...SENSITIVE_ROW_RULE }, {
      textField: 'text', flagField: 'sensitive', flagValue: true, mask: '****', textNotice: '（敏感字段已脱敏）',
    });
    assert.equal(SENSITIVE_ROW_RULE.mask, TEXT_SENSITIVE_MASK, '掩码必须等于 TEXT_SENSITIVE_MASK（唯一真相）');
    assert.ok(doc.includes('SENSITIVE_ROW_RULE'), '文档必须冻结敏感行判定口径');
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
    assert.deepEqual(purityViolations("const fs = require('node:fs');"), ['node: 内建']);
    assert.deepEqual(purityViolations("await import('node:fs');"), ['node: 内建']);
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
