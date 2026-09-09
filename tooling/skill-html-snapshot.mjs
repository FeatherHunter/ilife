#!/usr/bin/env node
/**
 * #96 · 其余 5 技能 HTML 不回归门（base-* 变更影响面）。
 *
 * 背景：`base-paint`（目录 `packages/base-render`）是共享层地基，#74–#78 已改注入器／样式／
 * 控件／图表／HELP 壳。**本票冻结的 5 个技能（bill／chef／home／schedule／memo-ilife）当前
 * 只依赖 `base-link-core`，与 base-* 无任何运行时耦合**；本门把这条「零影响」变成可机械判定的
 * 两件事：
 *
 *   ① **行为冻结**：把 5 技能渲染层的**全部 HTML 产物**（16/8/21/8/10 个 key 的 section 片段、
 *      6 形状片段、59 个模板填充页、共享 CSS／helpers 文本、escape 探针）取归一化 sha256 入快照。
 *      base-* 变更后重算必须**逐件相同**；任何一件不同即红，并打印首个差异行。
 *   ② **影响面断言**：任一产物文本**不得**出现 base-paint 命名空间标记（`ilife-`／`ilife-base`
 *      ／`data-ilife`）——出现即说明 base-* 的样式／控件／图表资产已经渗进这 5 个技能，
 *      本门必须先被显式修改（＝一次受审查的迁移），而不是静默变绿。
 *
 * 比较口径：**逐件 sha256**（文本归一化：去 BOM ＋ CRLF→LF，跨 3 个 CI OS 同值）。
 * `text` 字段只作人工定位差异的辅助；若它与自身 sha256 不自洽（手改快照）即红。
 * 体积控制：单件 > 2048 B 只存 sha256＋bytes（`textOmitted: true`），用 `--show <id>` 定位。
 *
 * 为什么不含 skill-calorie：本票口径是「其余 5 技能」；calorie 的 HTML 正是 #108–#113／#83
 * 在途改造的对象，冻结它会让别的票一改就红（跨票假红）。
 *
 * 用法：
 *   node tooling/skill-html-snapshot.mjs --write        # 重建快照（受跟踪文件 tooling/skill-html.snapshot.json）
 *   node tooling/skill-html-snapshot.mjs --check        # 校验（默认动作，差异即 exit 1）
 *   node tooling/skill-html-snapshot.mjs --show <id>    # 打印单件「快照 vs 实际」全文
 *   node tooling/skill-html-snapshot.mjs --list         # 列出全部产物 id ＋ 出处
 *   node tooling/skill-html-snapshot.mjs --full-diff    # 校验失败时打印全部差异行（默认每件 8 行）
 *
 * 依赖：读 `packages/<pkg>/dist/render/index.js`（构建产物）＋ `packages/base-link-core/dist`。
 * 未构建时**显式失败**，不静默跳过。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_PATH = join(root, 'tooling/skill-html.snapshot.json');

/** 本门覆盖的 5 个技能（顺序固定，产物 id 与快照排序都按此）。 */
export const SKILLS = [
  { id: 'bill', dir: 'skill-bill', prefix: 'BILL', camel: 'Bill', fill: 'fillTemplate' },
  { id: 'chef', dir: 'skill-chef', prefix: 'CHEF', camel: 'Chef', fill: 'fillTemplate' },
  { id: 'home', dir: 'skill-home', prefix: 'HOME', camel: 'Home', fill: 'fillTemplate' },
  { id: 'schedule', dir: 'skill-schedule', prefix: 'SCHEDULE', camel: 'Schedule', fill: 'fillTemplate' },
  { id: 'memo', dir: 'skill-memo-ilife', prefix: 'MEMO', camel: 'Memo', fill: 'fillSharedMarkers' },
];

/** base-paint 命名空间标记：出现即说明 base-* 资产渗入（影响面断言）。 */
export const BASE_PAINT_MARKERS = ['ilife-base', 'data-ilife', 'ilife-'];

/** 影响面断言白名单（**必须为空**）：id → 允许出现的标记。留空是刻意的，见文件头 ②。 */
export const MARKER_ALLOW = {};

const TEXT_KEEP_MAX = 2048;

// ---------------------------------------------------------------- 归一化／摘要

/** 文本归一化：去 BOM ＋ CRLF→LF（跨 OS 同值；本仓无 .gitattributes，仍防御性归一）。 */
export function normalize(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export function sha256(text) {
  return createHash('sha256').update(normalize(text), 'utf8').digest('hex').slice(0, 32);
}

export function byteLen(text) {
  return Buffer.byteLength(normalize(text), 'utf8');
}

// ---------------------------------------------------------------- 统一夹具

/** 统一对抗夹具：覆盖 5 技能共 63 个 key 读到的字段，并含 HTML 特殊字符以驱动转义。 */
const R1 = {
  id: 1, category: '餐饮<&>', time: '2026-01-02 03:04:05', amount: -35.5, account: '支付宝',
  ledger: '生活', currency: '人民币', note: 'a<b>&"\'', title: '标题<&>', body: '正文<&>',
  content: '内容<&>', tag: '标签', location: '客厅', status: 'ok', name: '名称<&>', unit: '个',
  qty: 2, due: '2026-02-01', done: false, count: 3, date: '2026-01-02', weekday: '周五',
  duration: 30, kcal: 120, weight: 70.5, ok: true, message: 'm<&>',
};
const R2 = { ...R1, id: 2, category: '交通/地铁', time: '2026-01-03 08:00:00', amount: 5, note: '' };

export const PAYLOAD = {
  list: { items: [R1, R2], total: 2 },
  detail: { item: R1 },
  stat: { metrics: { a: 1, b: 2.5, c: 0 } },
  receipt: { ok: true, message: '已记录 <&>' },
  analysis: { summary: '汇总 <&>\n第二行' },
  fallback: { reason: '降级 <&>', degraded: true },
};

export const SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'];

/** escape 探针输入（五字符 ＋ 反引号 ＋ 波浪号 ＋ 代理对 ＋ 换行）。 */
export const ESCAPE_PROBE = '&<>"\'`~ 中文 🍣\n第二行';

const FILL_PROBE = '<p>probe &amp; &lt;x&gt;</p>';

// ---------------------------------------------------------------- 产物采集

async function loadRender(entry) {
  const p = join(root, 'packages', entry.dir, 'dist/render/index.js');
  if (!existsSync(p)) {
    throw new Error(`dist 缺失：packages/${entry.dir}/dist/render/index.js —— 请先 pnpm build（本门读构建产物，不读 src）`);
  }
  return import(pathToFileURL(p).href);
}

async function loadLinkCore() {
  const p = join(root, 'packages/base-link-core/dist/index.js');
  if (!existsSync(p)) throw new Error('dist 缺失：packages/base-link-core/dist/index.js —— 请先 pnpm build');
  return import(pathToFileURL(p).href);
}

/**
 * 采集全部产物：返回 Map<id, {text, src}>（id 已排序）。
 * 纯读：只 import dist、只 readFileSync 模板；不写任何文件。
 */
export async function collectArtifacts() {
  const core = await loadLinkCore();
  const out = new Map();
  const put = (id, text, src) => {
    if (out.has(id)) throw new Error('产物 id 重复：' + id);
    out.set(id, { text: normalize(text), src });
  };

  for (const entry of SKILLS) {
    const m = await loadRender(entry);
    const envSrc = `packages/${entry.dir}/src/render/envelope.ts`;
    const htmlSrc = `packages/${entry.dir}/src/render/html.ts`;
    const tplSrc = (n) => `packages/${entry.dir}/templates/${n}.html`;

    const shapes = m[`${entry.prefix}_KEY_SHAPES`];
    const templates = m[`${entry.prefix}_TEMPLATES`];
    if (!shapes || !templates) throw new Error(`${entry.id}: 缺 ${entry.prefix}_KEY_SHAPES／_TEMPLATES 导出`);

    // ① key→shape 映射表（结构性：改映射即红）
    const keys = Object.keys(shapes).sort();
    put(`${entry.id}/keys`, JSON.stringify(keys.map((k) => [k, shapes[k]])), envSrc);

    // ② 每个 key 的 section 片段（按该 key 分配的形状喂统一夹具）
    for (const k of keys) {
      const env = m[`build${entry.camel}Envelope`](k, PAYLOAD[shapes[k]]);
      put(`${entry.id}/frag/${k}`, m.renderEnvelopeHtml(env), envSrc);
    }

    // ③ 6 形状全覆盖（含 5 技能都没分配的 fallback 分支）＋未知形状必抛
    for (const shape of SHAPES) {
      const env = core.createEnvelope({ skill: entry.id, shape, key: `${entry.id}.snapshot.${shape}`, data: PAYLOAD[shape] });
      put(`${entry.id}/shape/${shape}`, m.renderEnvelopeHtml(env), htmlSrc);
    }
    let threw = '';
    try {
      m.renderEnvelopeHtml({ version: core.ENVELOPE_VERSION, skill: entry.id, shape: 'bogus', key: `${entry.id}.snapshot.bogus`, data: {} });
      threw = 'NO-THROW（未知形状未抛，缺陷）';
    } catch (e) {
      const code = e && e.code;
      const wantName = `${entry.camel}RenderError`;
      const wantCode = `${entry.prefix}_SHAPE_MISMATCH`;
      threw = (e && e.name === wantName && code === wantCode)
        ? `${wantName}/${wantCode}`
        : `WRONG-ERROR: name=${e && e.name} code=${code} message=${e && e.message}`;
    }
    put(`${entry.id}/shape-throw`, threw, htmlSrc);

    // ④ 模板清单 ＋ 每件模板的填充页
    put(`${entry.id}/templates`, JSON.stringify([...templates]), `packages/${entry.dir}/src/render/templates.ts`);
    for (const t of [...templates].sort()) {
      const raw = m.loadTemplate(t);
      const filled = entry.fill === 'fillTemplate'
        ? m.fillTemplate(raw, FILL_PROBE)
        : m.fillSharedMarkers(raw, '<style>probe-css</style>', '<script>probe-helpers</script>');
      put(`${entry.id}/tpl/${t}`, filled, tplSrc(t));
    }

    // ⑤ 共享资产文本（memo 无 SHARED_CSS／SHARED_HELPERS 导出，改由 ④ 的探针串覆盖）
    if (typeof m.SHARED_CSS === 'string') put(`${entry.id}/shared-css`, m.SHARED_CSS, htmlSrc);
    if (typeof m.SHARED_HELPERS === 'string') put(`${entry.id}/shared-helpers`, m.SHARED_HELPERS, htmlSrc);

    // ⑥ 转义探针
    put(`${entry.id}/escape`, m.escapeHtml(ESCAPE_PROBE), htmlSrc);
  }

  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

// ---------------------------------------------------------------- 快照读写

function entryFor(text, src) {
  const bytes = byteLen(text);
  const e = { src, bytes, sha256: sha256(text) };
  if (bytes <= TEXT_KEEP_MAX) e.text = normalize(text);
  else e.textOmitted = true;
  return e;
}

export function buildSnapshot(artifacts) {
  const entries = {};
  for (const [id, { text, src }] of artifacts) entries[id] = entryFor(text, src);
  return {
    generatedBy: 'tooling/skill-html-snapshot.mjs',
    ticket: '#96',
    purpose: '其余 5 技能 HTML 不回归门（base-* 变更影响面）：逐件 sha256 比较；text 仅作人工定位差异的辅助',
    hashAlgo: 'sha256(归一化文本) 前 32 hex；归一化＝去 BOM ＋ CRLF→LF',
    textKeepMaxBytes: TEXT_KEEP_MAX,
    skills: SKILLS.map((s) => ({ id: s.id, dir: s.dir, package: `packages/${s.dir}` })),
    artifactCount: Object.keys(entries).length,
    artifacts: entries,
  };
}

export function readSnapshot(path = SNAP_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ---------------------------------------------------------------- 比较

/**
 * 比较快照 vs 实际。
 * @returns {{changed:Array, added:Array, removed:Array, staleText:Array, markers:Array}}
 */
export function compare(snapshot, artifacts) {
  const snap = snapshot.artifacts || {};
  const changed = []; const added = []; const removed = []; const staleText = []; const markers = [];
  for (const [id, cur] of artifacts) {
    const prev = snap[id];
    const curSha = sha256(cur.text);
    if (!prev) { added.push(id); }
    else if (prev.sha256 !== curSha) changed.push(id);
    for (const mk of BASE_PAINT_MARKERS) {
      if (cur.text.includes(mk) && !(MARKER_ALLOW[id] || []).includes(mk)) markers.push({ id, marker: mk });
    }
  }
  for (const id of Object.keys(snap)) if (!artifacts.has(id)) removed.push(id);
  // 快照自洽：带 text 的条目，其 sha256 必须等于 text 的 sha256（防手改快照）
  for (const [id, prev] of Object.entries(snap)) {
    if (typeof prev.text === 'string' && sha256(prev.text) !== prev.sha256) staleText.push(id);
  }
  return { changed, added, removed, staleText, markers };
}

/** 按行对齐的首个差异（定位用，不声称是最小编辑距离）。 */
export function firstDiff(expected, actual, maxLines = 8) {
  const a = normalize(expected).split('\n');
  const b = normalize(actual).split('\n');
  const lines = [];
  if (a.length !== b.length) lines.push(`  行数：快照 ${a.length} ≠ 实际 ${b.length}`);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n && lines.length < maxLines; i++) {
    if (a[i] !== b[i]) {
      lines.push(`  L${i + 1} 快照: ${clip(a[i])}`);
      lines.push(`  L${i + 1} 实际: ${clip(b[i])}`);
    }
  }
  if (!lines.length) lines.push('  文本按行相同（差异在行尾换行或长度）');
  return lines;
}

function clip(s, max = 160) {
  return s.length <= max ? s : s.slice(0, max) + `…(+${s.length - max})`;
}

// ---------------------------------------------------------------- base-* 指纹

/** base-* 源码树指纹（**只报告、不入快照**）：让证据能记下「本次校验时 base-* 是什么样」。 */
export function baseFingerprint() {
  const dirs = ['packages/base-render/src', 'packages/base-render/package.json', 'packages/base-link-core/src'];
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f));
    else files.push(p);
  };
  for (const d of dirs) {
    const abs = join(root, d);
    if (existsSync(abs)) walk(abs);
  }
  files.sort();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f.slice(root.length + 1).replace(/\\/g, '/'));
    h.update('\0');
    h.update(normalize(readFileSync(f, 'utf8')));
    h.update('\0');
  }
  return { sha256: h.digest('hex').slice(0, 32), files: files.length };
}

/** dist 陈旧提醒（**只警告**：mtime 判据在增量构建下可能误报，不作红）。 */
export function staleness() {
  const warn = [];
  for (const entry of SKILLS) {
    const dist = join(root, 'packages', entry.dir, 'dist', 'render', 'index.js');
    if (!existsSync(dist)) continue;
    const dmt = statSync(dist).mtimeMs;
    const srcDir = join(root, 'packages', entry.dir, 'src');
    const tplDir = join(root, 'packages', entry.dir, 'templates');
    const newer = [];
    const scan = (p) => {
      for (const f of readdirSync(p)) {
        const abs = join(p, f);
        const st = statSync(abs);
        if (st.isDirectory()) scan(abs);
        else if (st.mtimeMs > dmt + 1) newer.push(abs.slice(root.length + 1));
      }
    };
    if (existsSync(srcDir)) scan(srcDir);
    if (existsSync(tplDir)) scan(tplDir);
    if (newer.length) warn.push(`${entry.id}: dist 早于 ${newer.length} 个源文件（${newer[0]} …）`);
  }
  return warn;
}

// ---------------------------------------------------------------- CLI

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isEntry) {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const valOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  const fullDiff = has('--full-diff');
  const showId = valOf('--show');

  try {
    const artifacts = await collectArtifacts();
    const fp = baseFingerprint();

    if (has('--list')) {
      for (const [id, a] of artifacts) console.log(`${id}\t${byteLen(a.text)}B\t${a.src}`);
      console.log(`RESULT: artifacts=${artifacts.size} base-* fingerprint=${fp.sha256}`);
      process.exit(0);
    }

    if (has('--write')) {
      const snap = buildSnapshot(artifacts);
      writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n', 'utf8');
      // 写后自校验：任何影响面标记都会让写模式也红（迁移必须显式改本工具，不得静默变绿）
      const cmp = compare(snap, artifacts);
      if (cmp.markers.length) {
        console.error(`FAIL: 影响面断言：${cmp.markers.length} 件产物含 base-paint 命名空间标记`);
        for (const { id, marker } of cmp.markers.slice(0, 20)) console.error(`  ! ${id} ← ${marker}`);
        console.error('  （若这是有意的迁移，须先显式修改 tooling/skill-html-snapshot.mjs 的 MARKER_ALLOW 并走审查）');
        process.exit(1);
      }
      console.log(`wrote ${SNAP_PATH.slice(root.length + 1)} artifacts=${snap.artifactCount} base-* fingerprint=${fp.sha256}`);
      process.exit(0);
    }

    const snap = readSnapshot();

    if (showId) {
      const prev = snap.artifacts?.[showId];
      const cur = artifacts.get(showId);
      if (!prev && !cur) { console.error(`FAIL: 未知产物 id：${showId}`); process.exit(2); }
      console.log(`=== 快照 ${showId} ===`);
      console.log(typeof prev?.text === 'string' ? prev.text : `（无 text：bytes=${prev?.bytes} sha256=${prev?.sha256}）`);
      console.log(`=== 实际 ${showId} ===`);
      console.log(cur ? cur.text : '（实际不存在）');
      process.exit(prev && cur && prev.sha256 === cur.sha256 ? 0 : 1);
    }

    const cmp = compare(snap, artifacts);
    const warn = staleness();
    for (const w of warn) console.error(`WARN: dist 可能陈旧 → ${w}`);

    if (cmp.staleText.length) {
      console.error(`FAIL: 快照自洽性：${cmp.staleText.length} 件条目的 text 与其 sha256 不符（手改快照）`);
      for (const id of cmp.staleText.slice(0, 20)) console.error(`  ! ${id}`);
      process.exit(1);
    }
    if (cmp.markers.length) {
      console.error(`FAIL: 影响面断言：${cmp.markers.length} 件产物含 base-paint 命名空间标记（base-* 已渗入 5 技能页面）`);
      for (const { id, marker } of cmp.markers.slice(0, 20)) console.error(`  ! ${id} ← ${marker}`);
      process.exit(1);
    }
    const total = cmp.changed.length + cmp.added.length + cmp.removed.length;
    if (total) {
      console.error(`FAIL: 5 技能 HTML 快照差异 ${total} 件（变化 ${cmp.changed.length}／新增 ${cmp.added.length}／消失 ${cmp.removed.length}）`);
      const show = (label, ids, expOf) => {
        for (const id of ids.slice(0, 40)) {
          console.error(`  ${label} ${id}${expOf ? `  [${expOf(id)}]` : ''}`);
          if (label === '~' && typeof snap.artifacts?.[id]?.text === 'string') {
            for (const l of firstDiff(snap.artifacts[id].text, artifacts.get(id).text, fullDiff ? 1e9 : 8)) console.error(l);
          }
        }
        if (ids.length > 40) console.error(`  …（另有 ${ids.length - 40} 件，用 --list 查看）`);
      };
      show('~', cmp.changed, (id) => artifacts.get(id)?.src ?? '');
      show('+', cmp.added, (id) => artifacts.get(id)?.src ?? '');
      show('-', cmp.removed, () => '');
      console.error('  处置：① 若不是有意变更 → 修回；② 若是有意变更 → 跑 pnpm snapshot:html 重写快照并在证据里逐件说明。');
      console.error(`RESULT: artifacts=${artifacts.size} changed=${cmp.changed.length} added=${cmp.added.length} removed=${cmp.removed.length} base-* fingerprint=${fp.sha256}`);
      process.exit(1);
    }
    console.log(`OK: 5 技能 HTML 快照 == 实际（${artifacts.size} 件产物，base-* 指纹 ${fp.sha256}，base-* 文件 ${fp.files} 件）`);
    console.log(`RESULT: artifacts=${artifacts.size} changed=0 added=0 removed=0 base-* fingerprint=${fp.sha256}`);
    process.exit(0);
  } catch (e) {
    console.error('FAIL: ' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
}
