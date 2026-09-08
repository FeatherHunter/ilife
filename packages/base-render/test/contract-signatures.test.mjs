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
import { readFileSync, readdirSync } from 'node:fs';

import {
  BASE_PAINT_CONTRACT_VERSION,
  CHART_KINDS,
  CONTROLS_HOST_REQUIREMENT,
  CONTROL_AVAILABILITY,
  CONTROL_NAMES,
  COPY_CHANNELS,
  CSS_VAR_TOKENS,
  ESCAPE_HTML_CHARS,
  INJECTION_ORDER,
  MARKER_RULES,
  RENDER_CONTRACT_VERSION,
  SERIALIZABLE_SHAPES,
  SPEC_FROZEN_SURFACE,
  STRICT_ENVELOPE_SHAPES,
  STYLE_FORBIDDEN_TOKENS,
  TEMPLATE_MARKERS,
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

  it('格式合规：无 BOM、无字面反斜杠 n', () => {
    assert.notEqual(doc.charCodeAt(0), 0xfeff, '文档不得以 BOM 开头');
    const literalBackslashN = String.fromCharCode(92) + 'n';
    assert.ok(!doc.includes(literalBackslashN), '文档不得出现字面换行转义');
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
    assert.equal(escapeHtml("'"), "'", "单引号尚未归一 → #74／#79 实现后必须翻转为 &#39;");
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
});

describe('门禁红线（AC-7／AC-13／browser-safe）', () => {
  it('base-paint 无运行时依赖、files 覆盖发布面', () => {
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
    assert.ok(pkg.files.includes('dist'), 'files 必须含 dist（契约资产随 dist 发布）');
    assert.ok(!JSON.stringify(pkg).includes('base-combos'), 'L16：package.json 不得出现 base-combos 字样');
  });

  it('dist 资产 browser-safe：无 node:、无隐式全局', () => {
    for (const f of readdirSync(new URL('../dist', import.meta.url))) {
      if (!f.endsWith('.js')) continue;
      const src = readFileSync(new URL('../dist/' + f, import.meta.url), 'utf8');
      assert.ok(!/from\s+['"]node:/.test(src), f + ' 不得 import node:');
      assert.ok(!/\bwindow\./.test(src), f + ' 不得读 window（AC-7 无隐式全局）');
      assert.ok(!/\bdocument\./.test(src), f + ' 不得直写 document（端口由调用方注入）');
    }
  });

  it('src/spec/*.ts 只许 import type（AC-13）', () => {
    const dir = new URL('../src/spec/', import.meta.url);
    for (const f of readdirSync(dir)) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      const bad = src.match(/^\s*import\s+(?!type\b)/m);
      assert.equal(bad, null, f + ' 只许 import type');
      assert.ok(!/from\s+['"]node:/.test(src), f + ' 不得引 node:');
      assert.ok(!/\bwindow\./.test(src), f + ' 不得读 window');
    }
  });
});
