#!/usr/bin/env node
/**
 * #96 · 其余 5 技能 HTML 不回归门（base-* 变更影响面）。
 *
 * 背景：`base-paint`（目录 `packages/base-render`）是共享层地基，#74–#78 已改注入器／样式／
 * 控件／图表／HELP 壳。本门把「base-* 变更对 5 个技能（bill／chef／home／schedule／memo-ilife）
 * 的 HTML 影响」变成可机械判定的两件事（2026-11 #1324 复核：#1197 已把 home／memo 的页面
 * **有意**迁到共享 base-paint，这 31 件产物在 MARKER_ALLOW 逐件登记；bill／chef／schedule
 * 仍要求零标记——新增命名空间标记照旧红，见下文 ②）：
 *
 *   ① **行为冻结**：把 5 技能渲染层的**全部 HTML 产物**（16/8/21/8/10 个 key 的 section 片段、
 *      6 形状片段、59 个模板填充页、共享 CSS／helpers 文本、escape 探针）取归一化 sha256 入快照。
 *      base-* 变更后重算必须**逐件相同**；任何一件不同即红，并打印首个差异行。
 *   ② **影响面断言**：任一产物文本**不得**出现 base-paint 命名空间标记（`ilife-`／`ilife-base`
 *      ／`data-ilife`）；出现即说明 base-* 的样式／控件／图表资产渗进了某个技能页面，本门必须
 *      先被显式修改（＝一次受审查的迁移），而不是静默变绿。#1197 把 home（`base-paint/blocks`
 *      的复制区与 `blocksCss`）与 memo（`pageUiCss`／`buildStyleSheet`）迁到共享层后，
 *      那 31 件是唯一允许带标记的产物（MARKER_ALLOW 逐件登记，其余一律红）。
 *
 * 比较口径：**逐件 sha256**（文本归一化：去 BOM ＋ CRLF→LF，跨 3 个 CI OS 同值）。
 * `text` 字段只作人工定位差异的辅助；若它与自身 sha256 不自洽（手改快照）即红。
 * 体积控制：单件 > 2048 B 只存 sha256＋bytes（`textOmitted: true`），用 `--show <id>` 定位。
 *
 * 为什么不含 skill-calorie：本票口径是「其余 5 技能」；calorie 的 HTML 正是 #108–#113／#83
 * 在途改造的对象，冻结它会让别的票一改就红（跨票假红）。
 *
 * 用法：
 *   node tooling/skill-html-snapshot.mjs --write        # 重建快照（**先校验后落盘**：影响面标记命中即 exit 1 且一个字节都不写）
 *   node tooling/skill-html-snapshot.mjs --write-en     # 重建英文列账本（只记英文列偏离中文列的产物）
 *   node tooling/skill-html-snapshot.mjs --check        # 校验（默认动作，差异即 exit 1）
 *   node tooling/skill-html-snapshot.mjs --show <id>    # 打印单件「快照 vs 实际」全文
 *   node tooling/skill-html-snapshot.mjs --list         # 列出全部产物 id ＋ 出处
 *   node tooling/skill-html-snapshot.mjs --full-diff    # 校验失败时打印全部差异行（默认每件 8 行）
 *
 * 依赖：读 `packages/<pkg>/dist/render/index.js`（构建产物）＋ `packages/base-link-core/dist`。
 * 未构建时**显式失败**，不静默跳过。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_LANGUAGE, langFromArgv, ledgerPath, normalizeLang } from './i18n-langs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_BASE = 'tooling/skill-html.snapshot.json';
const SNAP_PATH = join(root, SNAP_BASE);

/** 语言列的账本路径：中文列＝存量路径（逐字节不动），英文列＝tooling/skill-html.snapshot.en.json。
 *  语言身份由**文件名**承载，账本正文一个字段都不加（加字段＝字节变＝破坏「中文列逐字节不变」）。 */
export function snapPathOf(lang) {
  return join(root, ledgerPath(SNAP_BASE, normalizeLang(lang)));
}

/** 解析语言列：argv 的 --lang 优先，其次调用方给的 fallback，最后缺省语言（zh）。 */
export function resolveLang(argv, fallback) {
  const a = argv ?? process.argv.slice(2);
  const fromArgv = langFromArgv(a);
  if (fromArgv !== DEFAULT_LANGUAGE || a.some((t) => t === '--lang' || t.startsWith('--lang='))) return fromArgv;
  return normalizeLang(fallback === undefined ? DEFAULT_LANGUAGE : fallback);
}

/** 本门覆盖的 5 个技能（顺序固定，产物 id 与快照排序都按此）。 */
export const SKILLS = [
  { id: 'bill', dir: 'skill-bill', prefix: 'BILL', camel: 'Bill', fill: 'fillTemplate' },
  { id: 'chef', dir: 'skill-chef', prefix: 'CHEF', camel: 'Chef', fill: 'fillTemplate' },
  { id: 'home', dir: 'skill-home', prefix: 'HOME', camel: 'Home', fill: 'fillTemplate' },
  { id: 'schedule', dir: 'skill-schedule', prefix: 'SCHEDULE', camel: 'Schedule', fill: 'fillTemplate' },
  { id: 'memo', dir: 'skill-memo-ilife', prefix: 'MEMO', camel: 'Memo', fill: 'fillTemplate' },
];

/** base-paint 命名空间标记：出现即说明 base-* 资产渗入（影响面断言）。 */
export const BASE_PAINT_MARKERS = ['ilife-base', 'data-ilife', 'ilife-'];

/** 影响面断言白名单：id → 允许出现的标记。**只登记已审查过的迁移**，见文件头 ②。
 *  2026-11（#1324）复核：#1197 把 home／memo 页面有意迁到 base-paint，实测这 31 件产物带标记
 *  （home 23 件、memo 8 件，命中 89 次）；逐件登记而不是按技能前缀放行，新增件／新增标记照旧红。
 *  bill／chef／schedule 三技能的产物仍是零标记。 */
const ALL_MARKERS = ['ilife-base', 'data-ilife', 'ilife-'];
const HOME_MIGRATED_TEMPLATES = [
  'care_query', 'care_receipt', 'help', 'inventory_records', 'inventory_round', 'item_detail',
  'item_receipt', 'item_search', 'item_update_receipt', 'location_query', 'location_receipt',
  'outfit_pick', 'shopping_query', 'shopping_receipt', 'stats_alert', 'stats_overview',
  'tag_query', 'tag_receipt', 'ticket_query', 'ticket_receipt', 'trip_receipt',
];
const MEMO_MIGRATED_TEMPLATES = [
  'change_category', 'init_report', 'memo_query', 'receipt', 'sync_report', 'wish_complete', 'wish_plan',
];
export const MARKER_ALLOW = {
  'home/shared-css': ['ilife-base', 'ilife-'],
  'home/shared-helpers': ['data-ilife', 'ilife-'],
  ...Object.fromEntries(HOME_MIGRATED_TEMPLATES.map((t) => ['home/tpl/' + t, ALL_MARKERS])),
  'memo/shape/list-empty': ['ilife-'],
  ...Object.fromEntries(MEMO_MIGRATED_TEMPLATES.map((t) => ['memo/tpl/' + t, ALL_MARKERS])),
};

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


/** 渲染面形状：本门喂夹具、取 section 片段的那 6 个（出处 base-link-core 的 ENVELOPE_SHAPES）。 */
export const SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'];

/** 非渲染面形状：进了形状闭集、但**本门不取片段**——不取片段不等于不管，见 assertShapeClosure()。
 *  resultset（数据族，#952「不参与渲染」）就是这一类：registry 里有 2 条命令落它
 *  （bill.data.schema／bill.data.query）；本门只认「它不渲染」这条事实，不假装有它的页面。 */
export const NON_RENDER_SHAPES = ['resultset'];

/** 形状闭集 = 渲染面 ∪ 非渲染面（取形状名册，不手抄第二份）。 */
export const ALL_SHAPES = [...SHAPES, ...NON_RENDER_SHAPES];

/** 载荷夹具：**逐形状**给一份结构合法的对抗夹具（形状名 → 载荷）。
 *  补新形状忘了补夹具时，本门会显式红（见 assertShapeClosure），不再出现
 *  「夹具查表得 undefined → 建 envelope 抛」这种把**门自己**摔死、读数作废的形态。 */
const RENDER_FIXTURE = {
  list: { items: [R1, R2], total: 2 },
  detail: { item: R1 },
  stat: { metrics: { a: 1, b: 2.5, c: 0 } },
  receipt: { ok: true, message: '已记录 <&>' },
  analysis: { summary: '汇总 <&>\n第二行' },
  fallback: { reason: '降级 <&>', degraded: true }
};

/** 非渲染面夹具（带上＝本门知道这个形状的 envelope 怎么建，只是不取片段）。 */
const NON_RENDER_FIXTURE = { resultset: { results: [] } };

/** 全部形状的夹具（渲染面 ＋ 非渲染面）。 */
export const PAYLOAD = { ...RENDER_FIXTURE, ...NON_RENDER_FIXTURE };



/** 空列表探针（第 7 件形状探针）：5 技能都有 `!items.length` 空态分支，非空载荷打不到它。 */
export const LIST_EMPTY = { items: [], total: 0 };

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
/** 形状闭集自证：**每一件**（渲染面／非渲染面）都必须有夹具，且两面并集必须正好盖住闭集。
 *  不通过即抛——读数作废、不静默、不落盘。把「夹具查表得 undefined → 建 envelope 抛」这种
 *  摔死形态治成显式红：**门自己的缺件**不许伪装成产物缺陷。 */
export function assertShapeClosure() {
  const all = ALL_SHAPES;
  const missing = all.filter((sh) => !Object.prototype.hasOwnProperty.call(PAYLOAD, sh));
  if (missing.length) {
    throw new Error('形状夹具缺件：' + missing.join('、')
      + '（补 PAYLOAD 夹具；形状闭集出处 base-link-core 的 ENVELOPE_SHAPES）');
  }
  const extra = Object.keys(PAYLOAD).filter((sh) => !all.includes(sh));
  if (extra.length) throw new Error('夹具里有闭集外形状：' + extra.join('、'));
  const dup = all.filter((sh, i) => all.indexOf(sh) !== i);
  if (dup.length) throw new Error('形状名册有重复：' + dup.join('、'));
  return { render: SHAPES.length, nonRender: NON_RENDER_SHAPES.length, total: all.length };
}

/** 形状名册分面（CLI 与自证用）：渲染面／非渲染面各自的清单。 */
export function shapeRoster() {
  return { render: [...SHAPES], nonRender: [...NON_RENDER_SHAPES] };
}

export async function collectArtifacts() {
  assertShapeClosure();
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
    //   只取**渲染面**形状的片段：非渲染面形状（resultset，#952 不参与渲染）在渲染入口必拒，
    //   给它取片段＝让门自己摔死；它由 ③′ 的显式拒绝探针覆盖。
    for (const k of keys) {
      if (!SHAPES.includes(shapes[k])) continue;
      const env = m[`build${entry.camel}Envelope`](k, PAYLOAD[shapes[k]]);
      put(`${entry.id}/frag/${k}`, m.renderEnvelopeHtml(env), envSrc);
    }

    // ③ 6 形状全覆盖（含 5 技能都没分配的 fallback 分支）＋空列表空态分支＋未知形状必抛
    for (const shape of SHAPES) {
      const env = core.createEnvelope({ skill: entry.id, shape, key: `${entry.id}.snapshot.${shape}`, data: PAYLOAD[shape] });
      put(`${entry.id}/shape/${shape}`, m.renderEnvelopeHtml(env), htmlSrc);
    }
    put(`${entry.id}/shape/list-empty`,
      m.renderEnvelopeHtml(core.createEnvelope({ skill: entry.id, shape: 'list', key: `${entry.id}.snapshot.list-empty`, data: LIST_EMPTY })),
      htmlSrc);
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
    // 非渲染面形状（resultset）**不落账本**：账本记的是渲染产物，拒渲染是它在渲染入口上的行为，
    //   不是一件产物。它由 compareShapeClosure() 的「必须显式拒」判据盖住（见该函数），
    //   这样既不把结构事实塞进产物账本，也不新增账本条目（#96 的 194 件读数逐字不动）。

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

/** 以指定语言上下文采集产物（#1324）：中文列＝现状（不进上下文）；其它语言用 base-entries 的
 *  runWithLanguage 包住**同一个采集器**——语言只影响 m() 取词，采集面与夹具完全一致，
 *  因此两列的 id 集合必然相同，差异只可能来自「有没有英文词条」。 */
export async function collectArtifactsLang(lang = DEFAULT_LANGUAGE) {
  const L = normalizeLang(lang);
  if (L === DEFAULT_LANGUAGE) return collectArtifacts();
  const p = join(root, 'packages/base-entries/dist/index.js');
  if (!existsSync(p)) throw new Error('dist 缺失：packages/base-entries/dist/index.js —— 请先 pnpm build');
  const { runWithLanguage } = await import(pathToFileURL(p).href);
  return runWithLanguage(L, () => collectArtifacts());
}

/** 英文列账本（records 形）的构造器（--write-en／自证共用）：只把**英文列 sha ≠ 中文列 sha**
 *  的件写进 records；同哈希件＝英文列与中文列逐字相同，按账本语义不入 records（中文列就是它的基线）。 */
export function buildEnColumn(enArtifacts, zhArtifacts) {
  const records = {};
  for (const [id, cur] of enArtifacts) {
    const zh = zhArtifacts.get(id);
    if (!zh) throw new Error('英文列采集到中文列没有的产物：' + id);
    const sha = sha256(cur.text);
    if (sha === sha256(zh.text)) continue;
    records[id] = {
      sha256: sha,
      bytes: byteLen(cur.text),
      note: '英文列版本（#1324 录入：与中文列逐字不同＝确实取到英文词条）',
    };
  }
  return {
    generatedBy: 'tooling/skill-html-snapshot.mjs',
    ticket: '#1324',
    purpose: '5 技能 HTML 产物账本的**英文列**记录：键＝英文列偏离中文列的那些产物；未偏离的不进本账本（中文列本身就是它的基线）',
    lang: 'en',
    basedOn: SNAP_BASE,
    hashAlgo: 'sha256(归一化文本) 前 32 hex；归一化＝去 BOM ＋ CRLF→LF（与中文列同一口径）',
    notations: [
      '记录形：{ "<产物 id>": { "sha256": "<32hex>", "bytes": <n>, "note": "<为什么偏离中文列>" } }',
      '键集必须是中文列 artifacts 的子集（英文列不许凭空多产物）',
      '记录的 sha256 必须 ≠ 中文列同件（相等＝没记，空转绿）',
      '本账本只记**偏离中文列**的产物；与中文列逐字节相同的件不进这里（中文列 194 件的绝大多数如此）',
      'readonlyUntilMigrated: false＝英文列已录入；--check 按英文列**当刻实际**判漏记／错记',
    ],
    readonlyUntilMigrated: false,
    artifactCount: Object.keys(records).length,
    records,
  };
}

/** 写英文列账本：同目录临时文件再 rename（与中文列 --write 的原子写法同形）。 */
export function writeEnColumn(snap, { snapPath = snapPathOf('en') } = {}) {
  const tmp = `${snapPath}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, JSON.stringify(snap, null, 2) + '\n', 'utf8');
    renameSync(tmp, snapPath);
  } catch (e) {
    if (existsSync(tmp)) unlinkSync(tmp);
    throw e;
  }
  return snapPath;
}

// ---------------------------------------------------------------- 语言列账本

/** 语言列账本的**前半**（除 artifacts 之外的元信息）：两种语言同形，故共用。 */
function snapMeta(snap) {
  const { artifacts, ...meta } = snap;
  return meta;
}

/** 英文列的**记录文件**（不是中文列的复制）：中文列没记的产物＝英文列没记；键是**英文列偏离中文列**
 *  的那些产物。完整性三条（缺一即抛，不许当成「英文列没问题」）：
 *   ① 记录里的 id 必须在中文列里有（英文列不许凭空多产物）；
 *   ② 记录的 sha256 必须 ≠ 中文列同件（相等＝没记＝空转绿，见 #1199 的「空转绿＝假绿」）；
 *   ③ 记录与中文列的元信息除语言列口径外必须自洽（见 loadLangColumn 的 baseLang 校验）。 */
export function loadLangColumn(lang, { snapPath = undefined, basePath = SNAP_PATH } = {}) {
  const L = normalizeLang(lang);
  if (L === DEFAULT_LANGUAGE) {
    const snap = readSnapshot(snapPath === undefined ? basePath : snapPath);
    return { lang: L, kind: 'base', meta: snapMeta(snap), artifacts: snap.artifacts || {}, records: null };
  }
  const p = snapPath === undefined ? snapPathOf(L) : snapPath;
  if (!existsSync(p)) throw new Error('英文列账本缺失：' + p + '（语言列骨架必须随本票入仓，不能等迁移票补）');
  const snap = readSnapshot(p);
  if (snap.lang !== L) throw new Error('英文列账本声明的语言不对：' + p + ' 写的是 ' + JSON.stringify(snap.lang) + '，请求的是 ' + L);
  if (snap.basedOn !== SNAP_BASE) throw new Error('英文列账本必须声明 basedOn=' + SNAP_BASE + '（实得 ' + JSON.stringify(snap.basedOn) + '）');
  const records = snap.records;
  if (records === undefined || records === null || typeof records !== 'object') throw new Error('英文列账本缺 records 对象：' + p);
  const base = readSnapshot(basePath);
  const baseArtifacts = base.artifacts || {};
  for (const [id, rec] of Object.entries(records)) {
    const b = baseArtifacts[id];
    if (!b) throw new Error('英文列记了一条中文列没有的产物：' + id);
    if (!rec || typeof rec !== 'object') throw new Error('英文列记录必须是对象：' + id);
    if (typeof rec.sha256 !== 'string') throw new Error('英文列记录缺 sha256：' + id);
    if (rec.sha256 === b.sha256) throw new Error('英文列记录与中文列同件同哈希（＝没记，空转绿）：' + id);
  }
  return { lang: L, kind: 'records', meta: snapMeta(snap), artifacts: baseArtifacts, records };
}

/** 英文列记录 vs **英文列当刻实际**：给了对照读数就逐件判（漏记／错记／多余），
 *  没给＝**待对照**（pending），既不当绿也不当红——英文页还没采集到，就没有「英文页通过了」
 *  这句话可说。对照读数两种形状都收：采集器给的 {text}，或外部读数的 {sha256}。 */
export function englishGaps(col, enArtifacts) {
  const recorded = col.kind === 'records' ? Object.keys(col.records).length : 0;
  if (!enArtifacts) return { recorded, pending: true, unrecorded: [], extra: [], mismatched: [], missing: [] };
  const unrecorded = [];
  const extra = [];
  const mismatched = [];
  const list = enArtifacts instanceof Map ? [...enArtifacts.entries()] : Object.entries(enArtifacts);
  for (const [id, cur] of list) {
    const zh = col.artifacts[id];
    if (!zh) { extra.push(id); continue; }
    const curSha = typeof cur?.sha256 === 'string' ? cur.sha256 : sha256(cur.text);
    const rec = col.records[id];
    if (curSha !== zh.sha256) {
      if (rec === undefined) unrecorded.push(id);
      else if (rec.sha256 !== curSha) mismatched.push(id + ' 记录 ' + rec.sha256 + ' 实际 ' + curSha);
    } else if (rec !== undefined) {
      mismatched.push(id + ' 记录 ' + rec.sha256 + ' 实际与中文列同哈希（记录应删除：同哈希不入 records）');
    }
  }
  const has = (id) => (enArtifacts instanceof Map ? enArtifacts.has(id) : enArtifacts[id] !== undefined);
  const missing = Object.keys(col.records).filter((id) => !has(id));
  return { recorded, pending: false, unrecorded, extra, mismatched, missing };
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

/**
 * **先校验后落盘**（红队 R-S3-1）：影响面断言不通过时**一个字节都不写**，
 * 受跟踪快照 `tooling/skill-html.snapshot.json` 的 sha256 保持不变。
 * 校验通过则写同目录临时文件再 `rename` 原子替换，避免半截文件。
 *
 * 变异点（自证用）：把 `compare` 挪到 `renameSync` 之后 → 本函数在标记命中时也会落盘。
 *
 * @returns {{written:boolean, markers:Array<{id:string,marker:string}>, snap:object}}
 */
export function writeSnapshotChecked(artifacts, { snapPath = SNAP_PATH } = {}) {
  const snap = buildSnapshot(artifacts);
  const cmp = compare(snap, artifacts);
  if (cmp.markers.length) return { written: false, markers: cmp.markers, snap };
  const tmp = `${snapPath}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, JSON.stringify(snap, null, 2) + '\n', 'utf8');
    renameSync(tmp, snapPath);
  } catch (e) {
    if (existsSync(tmp)) unlinkSync(tmp);
    throw e;
  }
  return { written: true, markers: [], snap };
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
  // --en-artifacts：英文列对照读数入口（外部生成的英文产物 sha 从这里喂进来；不给就自己采集英文上下文）。
  const enArtifactsFile = valOf('--en-artifacts');
  if (has('--selftest')) {
    const bad = [];
    const want = (cond, msg) => { if (!cond) bad.push(msg); };
    // ① 形状闭集：渲染面 ∪ 非渲染面，每件都有夹具
    const closure = assertShapeClosure();
    want(closure.render === 6 && closure.nonRender === 1 && closure.total === 7, '形状闭集读数：' + JSON.stringify(closure));
    // ② 语言列路径：中文列＝存量路径（逐字节不动），英文列另起
    want(snapPathOf('zh') === SNAP_PATH, '中文列必须落在存量路径 tooling/skill-html.snapshot.json 上');
    want(snapPathOf('en').endsWith('skill-html.snapshot.en.json'), '英文列必须另起账本：' + snapPathOf('en'));
    want(snapPathOf('zh') !== snapPathOf('en'), '中英两列不许共用同一个账本文件');
    // ③ 英文列账本完整性：空 records 合法（0 件＝待录入），但必须显式带 lang／basedOn
    const enCol = loadLangColumn('en', { snapPath: snapPathOf('en'), basePath: SNAP_PATH });
    want(enCol.lang === 'en' && enCol.kind === 'records', '英文列账本形态：' + JSON.stringify({ lang: enCol.lang, kind: enCol.kind }));
    want(enCol.meta.basedOn === SNAP_BASE, '英文列必须声明 basedOn=' + SNAP_BASE);
    const gaps0 = englishGaps(enCol, null);
    want(gaps0.pending === true, '没给英文列对照读数时必须报 pending（0 件＝待录入），不许当绿');
    // ③′ 英文列真实采集：与中文列同一 id 集合；偏离件正好由 buildEnColumn 记进 records
    const zhArts = await collectArtifacts();
    const enArts = await collectArtifactsLang('en');
    want(enArts.size === zhArts.size, '英文列与中文列产物数必须相同：' + enArts.size + ' vs ' + zhArts.size);
    const built = buildEnColumn(enArts, zhArts);
    const gapsEn = englishGaps({ ...enCol, records: built.records }, enArts);
    want(gapsEn.unrecorded.length === 0 && gapsEn.mismatched.length === 0,
      '英文列对实际采集的漏记／错记必须为 0：' + JSON.stringify({ unrecorded: gapsEn.unrecorded, mismatched: gapsEn.mismatched }));
    want(built.artifactCount > 0, '英文列偏离中文列的件数必须 > 0（0＝英文词条没生效，门失明）：' + built.artifactCount);
    // ③″ 变异：删一条记录 → 漏记必红；改一条 sha → 错记必红（还原即下面 gapsEn 的 0 读数）
    const enFirst = Object.keys(built.records)[0];
    const dropped = { ...built.records };
    delete dropped[enFirst];
    const gapsDropped = englishGaps({ ...enCol, records: dropped }, enArts);
    want(gapsDropped.unrecorded.includes(enFirst), '删掉英文列一条记录必须报漏记：' + enFirst);
    const wrongRec = { ...built.records, [enFirst]: { ...built.records[enFirst], sha256: 'deadbeefdeadbeefdeadbeefdeadbeef' } };
    const gapsWrong = englishGaps({ ...enCol, records: wrongRec }, enArts);
    want(gapsWrong.mismatched.length === 1, '改坏英文列记录必须报错记：' + JSON.stringify(gapsWrong.mismatched));
    console.log('SELFTEST 读数：形状闭集 ' + JSON.stringify(closure) + '；英文列 recorded=' + gaps0.recorded + ' pending=' + gaps0.pending);
    console.log('SELFTEST 英文列读数：' + JSON.stringify({ artifacts: enArts.size, recorded: built.artifactCount, unrecorded: gapsEn.unrecorded.length, dropped: gapsDropped.unrecorded.length, mismatch: gapsWrong.mismatched.length }));
    // ④ 变异：往英文列记录里塞一条与中文列同哈希的假记录 → 必须抛（同件同哈希＝没记＝空转绿）
    const zhNow = readSnapshot(SNAP_PATH);
    const anyId = Object.keys(zhNow.artifacts)[0];
    const fakeRecords = { [anyId]: { sha256: zhNow.artifacts[anyId].sha256, bytes: zhNow.artifacts[anyId].bytes, note: 'selftest-mutation' } };
    const fakeCol = { lang: 'en', kind: 'records', meta: enCol.meta, artifacts: zhNow.artifacts, records: fakeRecords };
    let threwSame = false;
    try {
      const tmpFile = join(tmpdir(), 'snapshot-selftest-' + process.pid + '.json');
      writeFileSync(tmpFile, JSON.stringify({ ...enCol.meta, lang: 'en', basedOn: SNAP_BASE, records: fakeRecords }), 'utf8');
      loadLangColumn('en', { snapPath: tmpFile, basePath: SNAP_PATH });
    } catch { threwSame = true; }
    want(threwSame, '英文列记一条与中文列同哈希的记录必须抛（空转绿＝假绿）');
    void fakeCol;
    // ⑤ 变异：把中文列账本的一个值改掉 → compare 必须报 changed
    const artsNow = await collectArtifacts();
    const mutated = { ...zhNow, artifacts: { ...zhNow.artifacts, [anyId]: { ...zhNow.artifacts[anyId], sha256: 'deadbeefdeadbeefdeadbeefdeadbeef' } } };
    const cMut = compare(mutated, artsNow);
    want(cMut.changed.includes(anyId), '账本值被改必须报 changed（改坏必红）');
    const cBase = compare(zhNow, artsNow);
    want(!cBase.staleText.length, '账本自洽性：text 与 sha256 必须一致');
    console.log('SELFTEST 变异读数：同哈希假记录 threw=' + threwSame + '；改账本值 changed=' + cMut.changed.length + '（含 ' + anyId + '=' + cMut.changed.includes(anyId) + '）');
    if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
    console.log('SELFTEST: 形状闭集／语言列路径／英文列记录通道／英文列真实采集与变异／改坏必红 六条自证 OK');
    console.log('SELFTEST: 还原必绿 = 下面这次 --check 的读数');
    process.exit(0);
  }
  const zhPath = snapPathOf(DEFAULT_LANGUAGE);
  const enPath = snapPathOf('en');
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
      // 先校验后落盘（R-S3-1）：标记命中即 exit 1，且**不写**受跟踪快照（不留脏文件）
      const { written, markers, snap } = writeSnapshotChecked(artifacts);
      if (!written) {
        console.error(`FAIL: 影响面断言：${markers.length} 件产物含 base-paint 命名空间标记（**未落盘**，受跟踪快照逐字节不变）`);
        for (const { id, marker } of markers.slice(0, 20)) console.error(`  ! ${id} ← ${marker}`);
        console.error('  （若这是有意的迁移，须先显式修改 tooling/skill-html-snapshot.mjs 的 MARKER_ALLOW 并走审查）');
        process.exit(1);
      }
      console.log(`wrote ${SNAP_PATH.slice(root.length + 1)} artifacts=${snap.artifactCount} base-* fingerprint=${fp.sha256}`);
      process.exit(0);
    }

    if (has('--write-en')) {
      // 英文列重录（#1324）：采集英文上下文产物 → 只记偏离中文列的件 → 原子写盘。
      const enArts = await collectArtifactsLang('en');
      if (enArts.size !== artifacts.size) {
        console.error('FAIL: 英文列与中文列产物数不同（' + enArts.size + ' vs ' + artifacts.size + '）——两列必须同集合');
        process.exit(1);
      }
      const snapEn = buildEnColumn(enArts, artifacts);
      const zhCol = Object.fromEntries([...artifacts].map(([id, a]) => [id, { sha256: sha256(a.text) }]));
      const gaps = englishGaps({ kind: 'records', artifacts: zhCol, records: snapEn.records }, enArts);
      if (gaps.unrecorded.length || gaps.mismatched.length) {
        console.error('FAIL: 英文列自校失败 unrecorded=' + gaps.unrecorded.length + ' mismatched=' + gaps.mismatched.length);
        process.exit(1);
      }
      const p = writeEnColumn(snapEn);
      console.log('wrote ' + p.slice(root.length + 1) + ' records=' + snapEn.artifactCount
        + '（同哈希不入账 ' + (artifacts.size - snapEn.artifactCount) + ' 件＝英文列与中文列逐字相同）');
      process.exit(0);
    }

    // 中文列：与改造前完全同一个账本、同一套比较（默认动作＝中文列）。
    const snap = readSnapshot(zhPath);
    // 英文列：另起一份账本（records 形）；对照读数默认按英文上下文现采（同一采集器，见 collectArtifactsLang）。
    const enCol = loadLangColumn('en', { snapPath: enPath, basePath: zhPath });
    const enCount = enCol.kind === 'records' ? Object.keys(enCol.records).length : 0;
    const enArtifacts = enArtifactsFile
      ? new Map(Object.entries(JSON.parse(readFileSync(enArtifactsFile, 'utf8'))))
      : await collectArtifactsLang('en');
    const gaps = englishGaps(enCol, enArtifacts);
    const sameAsZh = [...enArtifacts.keys()].filter((id) => {
      const cur = enArtifacts.get(id);
      const zhSha = snap.artifacts?.[id]?.sha256;
      return zhSha !== undefined && (typeof cur?.sha256 === 'string' ? cur.sha256 : sha256(cur.text)) === zhSha;
    }).length;
    console.log('COLUMN zh  artifacts=' + artifacts.size + ' ledger=' + snapPathOf(DEFAULT_LANGUAGE).slice(root.length + 1));
    console.log('COLUMN en  recorded=' + enCount + ' ledger=' + enPath.slice(root.length + 1)
      + ' unrecorded=' + gaps.unrecorded.length + ' sameAsZh=' + sameAsZh
      + '（同哈希件＝英文列与中文列逐字相同，按账本语义不入 records）');
    const roster = shapeRoster();
    console.log('SHAPES render=' + roster.render.join(',') + ' nonRender=' + roster.nonRender.join(',') + '（非渲染面不取片段，只在渲染入口上判「必须拒」）');

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

    // 英文列：records 与**英文列当刻实际**逐条比（records 是偏离中文列的记录，不能拿中文列产物比）。
    if (gaps.mismatched.length) {
      console.error('FAIL: 英文列记录与英文列实际不符 ' + gaps.mismatched.length + ' 件（英文列是**偏离中文列**的记录，不是中文列的复制）');
      for (const x of gaps.mismatched.slice(0, 40)) console.error('  ! ' + x);
      console.error('  处置：英文列产物确有变更 → 跑 --write-en 重录；不该变 → 修回。');
      console.error('RESULT: lang=en recorded=' + enCount + ' mismatch=' + gaps.mismatched.length);
      process.exit(1);
    }
    if (gaps.missing.length) {
      console.error('FAIL: 英文列记录点名了英文列里不存在的产物 ' + gaps.missing.length + ' 件：' + gaps.missing.slice(0, 20).join('、'));
      process.exit(1);
    }
    if (gaps.extra.length) {
      console.error('FAIL: 英文列采集到中文列没有的产物 ' + gaps.extra.length + ' 件：' + gaps.extra.slice(0, 20).join('、'));
      process.exit(1);
    }
    if (gaps.unrecorded.length) {
      console.error('FAIL: 英文列有 ' + gaps.unrecorded.length + ' 件产物偏离中文列却没录入英文列账本（漏记＝假绿）');
      for (const id of gaps.unrecorded.slice(0, 40)) console.error('  ! ' + id);
      console.error('  处置：这些产物的英文列版本必须显式录入 ' + enPath.slice(root.length + 1) + ' 的 records（--write-en）。');
      console.error('RESULT: lang=en recorded=' + enCount + ' unrecorded=' + gaps.unrecorded.length);
      process.exit(1);
    }

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
    console.log(`OK: 5 技能 HTML 快照 == 实际（${artifacts.size} 件产物，中文列账本 ${SNAP_BASE}，base-* 指纹 ${fp.sha256}，base-* 文件 ${fp.files} 件）`);
    console.log(`COLUMN en  recorded=${enCount} unrecorded=0 sameAsZh=${sameAsZh}（未录入口为 0 即英文列已追上中文列）`);
    console.log(`RESULT: artifacts=${artifacts.size} changed=0 added=0 removed=0 base-* fingerprint=${fp.sha256}`);
    process.exit(0);
  } catch (e) {
    console.error('FAIL: ' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
}
