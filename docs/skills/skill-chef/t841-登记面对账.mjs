#!/usr/bin/env node
/** #841 · 登记面对账：三处「登记面」与唤醒词表（`src/policy/wakewords.ts` 的 `WAKE_TABLE`）逐字一致。
 *
 * 三处登记面是同一件事的三种投影，都从 `WAKE_TABLE` 派生；本件只读、只对账，不改任何产物：
 *   ① `packages/skill-chef/SKILL.md` 的 HELP 标记块（`scripts/build-help.mjs` 构建期注入的 50 行快照）
 *      ＋ frontmatter 的 `description`（`scripts/add-frontmatter-218.mjs` 从同一张表机械拼出）；
 *   ② `packages/skill-chef/src/help/sceneData.ts` 的 48 张卡 `status`（`scripts/gen-help-assets.mjs` 派生）；
 *   ③ 各域 `src/<域>/routes.ts` 的 `RouteDecl`（`order` ＝ 该词在表里的 1-based 行号）。
 *
 * 跑法：
 *   node docs/skills/skill-chef/t841-登记面对账.mjs
 *   node docs/skills/skill-chef/t841-登记面对账.mjs --snapshot <另一份 SKILL.md>   # 反例用：拿变异件比
 *   node docs/skills/skill-chef/t841-登记面对账.mjs --repo <另一份 skill-chef 目录>  # 反例用：三处全换根
 *
 * 退出码：全过 0；任一不一致 1（逐条点名到文件与词）。**不一致永不静默**：三处只要有一处
 * 与表脱钩（多一条、少一条、key 换了、徽章没翻、order 错位），本件都红。
 *
 * 变异自证（必跑，见 `t841-登记面.md` §反例与 `t841-变异电池.mjs`）：
 *   把 SKILL.md 快照里的任一行删掉 → 本件 exit 1 并点名「快照缺词：<词>」；还原即绿。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');

const argv = process.argv.slice(2);
const flagOf = (name) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined; };
/** 被对账的 skill-chef 目录：默认仓内真件；反例可指一份副本（三处登记面同一个根，不然对不到一起）。 */
const PKG = resolve(flagOf('--repo') || join(ROOT, 'packages', 'skill-chef'));

const WAKE_SRC = join(PKG, 'src', 'policy', 'wakewords.ts');
const CLIENT_KEYS = join(PKG, 'src', 'cli', 'keys.ts');
const SCENE_SRC = join(PKG, 'src', 'help', 'sceneData.ts');
const SKILL_MD = join(PKG, 'SKILL.md');

/** 十域目录：路由声明的十个落点（英文字母序，与 `t839-落位对账.mjs` 同集合）。 */
const DOMAINS = ['add', 'cook', 'data', 'history', 'relation', 'search', 'setup', 'shopping', 'update', 'view'];

/** HELP 标记块在 SKILL.md 里的起止（与 `scripts/build-help.mjs` 的常量逐字相同）。 */
const START_MARK = '<!-- HELP-AUTO-START -->';
const END_MARK = '<!-- HELP-AUTO-END -->';

const problems = [];
const fail = (msg) => problems.push(msg);

/** 源码文本级抽 `WAKE_TABLE` 的 [短语, 键]：与生成器同口径（不 `import`，故本件在任何构建态都能跑）。 */
function readWakeTable(text) {
  return [...text.matchAll(/\{ phrase: '((?:[^'\\]|\\.)*)', key: '((?:[^'\\]|\\.)*)'/g)]
    .map((m) => ({ phrase: m[1], key: m[2] }));
}

/** 源码文本级抽某域 `routes.ts` 的 RouteDecl（与 `t839-落位对账.mjs` 的 rowsOfRoutes 同口径）。 */
function readRoutes(text, domain) {
  const str = "'(?:[^'\\\\]|\\\\.)*'";
  const atom = '(?:[^\\\'{}]|' + str + ')';
  const re = new RegExp('\\{(?:' + atom + ')*?\\border\\s*:\\s*(\\d+)(?:' + atom + ')*?\\}', 'gs');
  const out = [];
  for (const m of text.matchAll(re)) {
    const b = m[0];
    const w = b.match(/wakeWord\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const k = b.match(/key\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const c = b.match(/cli\s*:\s*'((?:[^'\\]|\\.)*)'/);
    out.push({ domain, order: Number(m[1]), wakeWord: w ? w[1] : '', key: k ? k[1] : '', cli: c ? c[1] : '' });
  }
  return out;
}

// ── 0. 取事实源 ────────────────────────────────────────────────────────────────
const TABLE = readWakeTable(readFileSync(WAKE_SRC, 'utf8'));
if (TABLE.length === 0) fail('抽不到 WAKE_TABLE 的词（检查 `src/policy/wakewords.ts` 的写法）');
const KEY_OF = new Map(TABLE.map((e) => [e.phrase, e.key]));

// 形状表（生成物）：快照每行的「shape」列按 key 取，可与它逐字对账。
const SHAPES = new Map([...readFileSync(CLIENT_KEYS, 'utf8').matchAll(/'([^']+)'\s*:\s*'(receipt|list|detail)'/g)]
  .map((m) => [m[1], m[2]]));

// ── 1. 登记面①：SKILL.md 快照 + frontmatter description ───────────────────────
const snapshotPath = resolve(flagOf('--snapshot') || SKILL_MD);
if (!existsSync(snapshotPath)) {
  fail('SKILL.md 不在盘上：' + snapshotPath);
} else {
  const skill = readFileSync(snapshotPath, 'utf8');
  if (skill.charCodeAt(0) === 0xfeff) fail('SKILL.md 以 BOM 开头（禁 BOM）');
  const si = skill.indexOf(START_MARK);
  const ei = skill.indexOf(END_MARK);
  if (si < 0 || ei < 0 || ei < si) {
    fail('SKILL.md 缺 HELP 标记块（' + START_MARK + ' ／ ' + END_MARK + '）');
  } else {
    const rows = skill.slice(si + START_MARK.length, ei).split('\n')
      .filter((l) => l.startsWith('| '))
      .filter((l) => !l.startsWith('| 唤醒词 ') && !l.startsWith('|---'));
    const snap = rows.map((l) => {
      const cells = l.slice(2, l.endsWith(' |') ? -2 : undefined).split(' | ');
      return { phrase: cells[0], key: cells[1], shape: cells[2], cli: String(cells[3] || '').replace(/^`|`$/g, '') };
    });
    const snapBy = new Map(snap.map((r) => [r.phrase, r]));
    if (snap.length !== TABLE.length) fail('快照行数 ' + snap.length + ' ≠ 表内词数 ' + TABLE.length);
    for (const e of TABLE) {
      const r = snapBy.get(e.phrase);
      if (!r) { fail('快照缺词：' + e.phrase); continue; }
      if (r.key !== e.key) fail('快照 key 与表不符：' + e.phrase + '（快照 ' + r.key + ' ≠ 表 ' + e.key + '）');
      const wantShape = SHAPES.get(e.key);
      if (wantShape && r.shape !== wantShape) fail('快照形状与形状表不符：' + e.phrase + '（' + r.shape + ' ≠ ' + wantShape + '）');
      if (!r.cli.startsWith('chef-cmd-read ' + e.key)) fail('快照「例」与 key 不符：' + e.phrase + '（' + r.cli + '）');
    }
    // 反向：快照里有、表里没有的（表是唯一事实源，快照不许自造词）
    for (const r of snap) if (!KEY_OF.has(r.phrase)) fail('快照多词（不在 WAKE_TABLE）：' + r.phrase);
  }
  // frontmatter description：插件侧的锁要求它覆盖表内全部词（`packages/plugin-chef/test/skills-provider.test.mjs`）
  const fm = skill.startsWith('---\n') ? skill.slice(4, skill.indexOf('\n---\n', 3)) : '';
  if (!fm) {
    fail('SKILL.md 缺 frontmatter（name／description）');
  } else {
    const m = fm.match(/^description: "(.*)"$/m);
    if (!m) {
      fail('SKILL.md frontmatter 缺 description');
    } else if (!m[1].includes('触发词：')) {
      fail('SKILL.md description 缺「触发词：」段（唤醒词列表的落点）');
    } else {
      const listed = m[1].split('触发词：')[1].split('、');
      const miss = TABLE.map((e) => e.phrase).filter((p) => !listed.includes(p));
      const extra = listed.filter((p) => !KEY_OF.has(p));
      if (miss.length) fail('description 缺词（' + miss.length + '）：' + miss.join('、'));
      if (extra.length) fail('description 多词（不在 WAKE_TABLE）：' + extra.join('、'));
      if (listed.length !== TABLE.length) fail('description 词数 ' + listed.length + ' ≠ 表内词数 ' + TABLE.length);
    }
  }
}

// ── 2. 登记面②：HELP 页 48 张卡的 status（生成物，从表派生） ──────────────────
const sceneText = readFileSync(SCENE_SRC, 'utf8');
const sceneRows = [...sceneText.matchAll(/\{\s*id:\s*'((?:[^'\\]|\\.)*)'\s*,\s*title:[^}]*?status:\s*'((?:[^'\\]|\\.)*)'/gs)]
  .map((m) => ({ id: m[1], status: m[2] }));
if (sceneRows.length === 0) fail('从 sceneData.ts 抽不到卡（检查生成物的写法）');
for (const s of sceneRows) if (s.status !== '') fail('HELP 卡仍带徽章：' + s.id + '（status＝' + s.status + '）');
// 卡面 chip（wake_word）必须在表里：徽章翻了但词没入表＝偷偷放宽
const chips = [...new Set([...sceneText.matchAll(/wake_word:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]))];
const chipMissing = chips.filter((c) => !KEY_OF.has(c));
if (chipMissing.length) fail('卡面 chip 不在 WAKE_TABLE：' + chipMissing.join('、'));

// ── 3. 登记面③：各域 RouteDecl 的 order 与 key（表行号是唯一顺序事实源） ──────
const routes = [];
for (const d of DOMAINS) {
  const p = join(PKG, 'src', d, 'routes.ts');
  if (!existsSync(p)) { fail('域目录缺 routes.ts：' + d); continue; }
  for (const r of readRoutes(readFileSync(p, 'utf8'), d)) routes.push(r);
}
const routeBy = new Map();
for (const r of routes) {
  if (routeBy.has(r.wakeWord)) fail('同一短语在两个域各声明一行：' + r.wakeWord + '（' + routeBy.get(r.wakeWord).domain + '／' + r.domain + '）');
  routeBy.set(r.wakeWord, r);
  if (r.order === 0) fail('order:0 待接入行残留：' + r.domain + '／' + r.wakeWord);
  if (r.key === 'tbd') fail('key:tbd 行残留：' + r.domain + '／' + r.wakeWord);
}
TABLE.forEach((e, i) => {
  if (e.key === 'chef.help.lookup') return; // HELP 词的事实住 help 链，域 ROUTES 不声明它们
  const r = routeBy.get(e.phrase);
  if (!r) { fail('路由未覆盖：' + e.phrase + '（表内 ' + e.key + '）'); return; }
  if (r.key !== e.key) fail('路由 key 与表不符：' + e.phrase + '（路由 ' + r.key + ' ≠ 表 ' + e.key + '）');
  if (r.order !== i + 1) fail('路由 order 与表行号不符：' + e.phrase + '（route ' + r.order + '，表第 ' + (i + 1) + ' 行）');
  if (!r.cli.includes('chef-cmd-read ' + e.key)) fail('路由 cli 与 key 不符：' + e.phrase + '（' + r.cli + '）');
});

// ── 4. 报读数（票面验收口径的那一行） ────────────────────────────────────────
const devCards = sceneRows.filter((s) => s.status !== '').length;
console.log('SKILL.md 词 ' + TABLE.length + '／HELP 待开发 ' + devCards + '／不一致 ' + problems.length);
if (problems.length) {
  for (const p of problems) console.error('不一致：' + p);
  console.error('（三处登记面须与 `src/policy/wakewords.ts` 的 WAKE_TABLE 逐字一致；改表后重跑：'
    + 'scripts/gen-help-assets.mjs → scripts/build-help.mjs → scripts/add-frontmatter-218.mjs → scripts/gen-chef-scenes.mjs）');
  process.exit(1);
}
console.log('OK：快照 ' + TABLE.length + ' 词／48 卡全可用／路由 ' + routes.length + ' 行，三处登记面与表一致');
