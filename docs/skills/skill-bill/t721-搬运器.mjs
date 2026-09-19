#!/usr/bin/env node
/** #721 · 一次性**搬运器**（取证工具）：老实物 payload → 8 份域声明。
 *
 * 归档在文档目录、**不进构建与测试管线**（#684 D8：搬运器落 `docs/skills/skill-bill/`，
 * 不落 `packages/skill-bill/scripts/`——那里只放常跑的门，防「重搬覆盖已改好的手写声明」）。
 *
 * ## 三个输入
 *  ① **老实物 payload**（仓外只读对照）：`D:\2Study\StudyNotes\SKILLS\饼干记账\饼干记账.html`
 *     的 `<script id="help-data">`——7 域／20 二级组／71 场景逐字。**权威**。
 *  ② **现口径层词表**：`packages/skill-bill/dist/policy/wakewords.js` 的 `WAKE_TABLE`
 *     （77 条：phrase／key／preset／needs／carries）——词条事实与**词序**的权威（它今天还是手写的）。
 *  ③ **新增 3 条场景**：老实物无、现表有（用户 Q8=A 补进对应二级组），文案与已退役的
 *     `scripts/gen-wake-assets.mjs` 的 `ADDED_SCENES` 逐字同源。
 *
 * ## 一个输出
 *  八件手写域声明：`src/<域>/declaration.ts` ×7（write＝今天的 `record/`）＋ `src/help/declaration.ts`（无场景）。
 *
 * ## 判据（全过才落盘；§2.5 第 1 条：先在内存里算出产物 → 断言全过 → 才落盘）
 *  ① 形状：8 份声明、order 缺号/重号即抛、7 域／20 二级组／74 场景、场景 id 唯一；
 *  ② 归属：每条场景恰有一条词条拥有它（词条的 `phrase` ＝ 场景的 `wake_word`）；73 条功能短语条条有场景；
 *  ③ **0 差异**：声明 → 投影回 `WAKE_GROUPS`／`WAKE_ASSETS`／`WAKE_TABLE` 与原两输入**逐字段**比对；
 *  ④ **摘要锁**：老 71 条的 SHA-256 ＝ `test/wake-assets.test.mjs` 里那把 `LEGACY_DIGEST`（内容没搬丢）。
 *
 * 用法：`node docs/skills/skill-bill/t721-搬运器.mjs`（落盘）／加 `--dry` 只演练不落盘。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-bill');
const SRC = join(PKG, 'src');
const DRY = process.argv.includes('--dry');

const OLD_HTML = 'D:\\2Study\\StudyNotes\\SKILLS\\饼干记账\\饼干记账.html';
const DATA_OPEN = '<script id="help-data" type="application/json">';
const LEGACY_DIGEST = '93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0';
const ADDED_IDS = new Set(['write_record', 'query_bills', 'query_bill_detail']);

/** 域目录：域 id → 今天的目录名（`record/` 由 #689 改名 `write/`）。 */
const DOMAIN_DIR = {
  write: 'record', query: 'query', analysis: 'analysis',
  goal: 'goal', account: 'account', link: 'link', setup: 'setup',
};
const DOMAIN_ORDER = ['write', 'query', 'analysis', 'goal', 'account', 'link', 'setup'];
const EXPORT_NAME = (d) => d.toUpperCase() + '_DECLARATION';

/** ③ 新增 3 条（老实物无；文案与已退役的生成器逐字同源）。 */
const ADDED_SCENES = [
  {
    group: 'write', subgroup: 'write_1',
    scene: {
      id: 'write_record', title: '记一笔', wake_word: '记一笔', status: '',
      prompt_template:
        '请加载「饼干记账」技能,帮我记一笔(唤醒词:记一笔):\n\n'
        + '  金  额: ____ (支出写负数,收入写正数)\n'
        + '  分类/名目: ____ (如:餐饮 / 工资 / 打车)\n'
        + '  备  注: ____ (选填)\n'
        + '  时  间: ____ (选填,默认现在;补记昨天写「昨天」)\n'
        + '  账  户: ____ (选填,如:支付宝 / 微信)\n',
      types: ['采集'],
    },
  },
  {
    group: 'query', subgroup: 'query_1',
    scene: {
      id: 'query_bills', title: '查账单', wake_word: '查账单', status: '',
      prompt_template:
        '请加载「饼干记账」技能,帮我查账单(唤醒词:查账单):\n\n'
        + '  日  期: ____ (选填,默认今天;可写「昨天」或「2026-09-06」)\n',
      types: ['查看'],
    },
  },
  {
    group: 'query', subgroup: 'query_1',
    scene: {
      id: 'query_bill_detail', title: '查账单详情', wake_word: '查账单详情', status: '',
      prompt_template:
        '请加载「饼干记账」技能,帮我查一条账单的详情(唤醒词:查账单详情):\n\n'
        + '  记录 id: ____ (从「查账单」或「查今天」的列表里取)\n',
      types: ['查看'],
    },
  },
];

function fail(msg) { throw new Error('[搬运器] ' + msg); }

function readPayload() {
  if (!existsSync(OLD_HTML)) fail('老实物不在盘：' + OLD_HTML + '（权威缺席，不臆造内容）');
  const raw = readFileSync(OLD_HTML, 'utf8');
  const at = raw.indexOf(DATA_OPEN);
  if (at < 0) fail('未找到 help-data 锚点：' + OLD_HTML);
  const start = at + DATA_OPEN.length;
  const end = raw.indexOf('</script>', start);
  if (end < 0) fail('help-data 未闭合：' + OLD_HTML);
  return JSON.parse(raw.slice(start, end));
}

/** 老 71 ＋ 新增 3 的 74 组结构（纯数据，不动老条目一字）。 */
function withAddedScenes(groups) {
  const out = JSON.parse(JSON.stringify(groups));
  const have = new Set(out.flatMap((g) => g.subgroups.flatMap((s) => s.scenes.map((x) => x.id))));
  for (const a of ADDED_SCENES) {
    if (have.has(a.scene.id)) fail('新增场景 id 与老条目撞名：' + a.scene.id);
    const g = out.find((x) => x.id === a.group);
    const sub = g && g.subgroups.find((x) => x.id === a.subgroup);
    if (!sub) fail('新增场景找不到落点：' + a.group + '/' + a.subgroup);
    sub.scenes.push(a.scene);
  }
  return out;
}

/** 场景 → 它所属的二级组与域（老 payload 的归属是权威）。 */
function indexScenes(groups) {
  const byId = new Map();
  for (const g of groups) {
    for (const sub of g.subgroups) {
      for (const s of sub.scenes) {
        if (byId.has(s.id)) fail('场景 id 重复：' + s.id);
        byId.set(s.id, { scene: s, group: g.id, subgroup: sub.id });
      }
    }
  }
  return byId;
}

/** 词条 → 域：由它拥有的场景所属的域决定；一条功能短语只准落一个域。 */
function domainOfPhrase(sceneIndex, phrase) {
  const groups = new Set();
  for (const v of sceneIndex.values()) if (v.scene.wake_word === phrase) groups.add(v.group);
  if (groups.size === 0) fail('功能短语没有场景（用户到不了它）：' + phrase);
  if (groups.size > 1) fail('功能短语跨域出现（一条词一个域）：' + phrase + ' → ' + [...groups].join('／'));
  return [...groups][0];
}

const sceneFields = (s) => ({ id: s.id, title: s.title, status: s.status, prompt_template: s.prompt_template, types: s.types });
const entryFields = (e) => {
  const o = { phrase: e.phrase, key: e.key };
  if (e.preset !== undefined) o.preset = e.preset;
  if (e.needs !== undefined) o.needs = e.needs;
  if (e.carries !== undefined) o.carries = e.carries;
  return o;
};

/** 单引号串（中文与换行安全；行内换行写成 `\n` 转义——这是代码字符串，不是文档正文）。 */
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const keyOf = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : q(k));
/** 值按**类型**落字面量：字符串加引号，布尔／数字原样，数组与对象递归（别把 `true` 写成 `'true'`）。 */
function val(v) {
  if (typeof v === 'string') return q(v);
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return '[' + v.map(val).join(', ') + ']';
  if (v !== null && typeof v === 'object') return '{ ' + Object.entries(v).map(([k, x]) => keyOf(k) + ': ' + val(x)).join(', ') + ' }';
  throw new Error('[搬运器] 认不得的 preset 取值类型：' + typeof v);
}
const objLine = (o) => val(o);
const arrLine = (a) => val(a);

function renderDeclaration(domain, decl) {
  const L = [];
  L.push(domain === 'help'
    ? '/** #721 · **HELP 位**的域声明（同形、无场景：4 条短语不进场景目录——防自指的规则只写一处）。'
    : '/** #721 · ' + decl.label + '域的**域声明**（手写、唯一事实源）。');
  L.push(' *');
  L.push(' * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；');
  L.push(' * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。');
  L.push(' * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。');
  L.push(' */');
  L.push("import type { DomainDeclaration } from '../triggers/routeSpec.js';");
  L.push('');
  L.push('export const ' + EXPORT_NAME(domain) + ': DomainDeclaration = {');
  L.push('  id: ' + q(decl.id) + ',');
  if (decl.label !== undefined) L.push('  label: ' + q(decl.label) + ',');
  if (decl.icon !== undefined) L.push('  icon: ' + q(decl.icon) + ',');
  L.push('  order: ' + String(decl.order) + ',');
  L.push('  entries: [');
  for (const e of decl.entries) {
    L.push('    {');
    L.push('      phrase: ' + q(e.phrase) + ',');
    L.push('      key: ' + q(e.key) + ',');
    if (e.preset !== undefined) L.push('      preset: ' + objLine(e.preset) + ',');
    if (e.needs !== undefined) L.push('      needs: ' + arrLine(e.needs) + ',');
    if (e.carries !== undefined) L.push('      carries: ' + arrLine(e.carries) + ',');
    if (e.scenes.length === 0) {
      L.push('      scenes: [],');
    } else {
      L.push('      scenes: [');
      for (const s of e.scenes) {
        L.push('        {');
        L.push('          id: ' + q(s.id) + ',');
        L.push('          title: ' + q(s.title) + ',');
        L.push('          status: ' + q(s.status) + ',');
        L.push('          prompt_template: ' + q(s.prompt_template) + ',');
        L.push('          types: ' + arrLine(s.types) + ',');
        L.push('        },');
      }
      L.push('      ],');
    }
    L.push('    },');
  }
  L.push('  ],');
  if (decl.subgroups.length === 0) {
    L.push('  subgroups: [],');
  } else {
    L.push('  subgroups: [');
    for (const sg of decl.subgroups) {
      L.push('    { id: ' + q(sg.id) + ', label: ' + q(sg.label) + ', scenes: ' + arrLine(sg.scenes) + ' },');
    }
    L.push('  ],');
  }
  L.push('};');
  L.push('');
  return L.join('\n');
}

/** 搬运当刻那份**手写词表**（词面权威）：取自 `git show HEAD:` 的 `src/policy/wakewords.ts`。
 *
 * 为什么不用编译产物：这条工具跑完一次之后，仓内的词表就改成从域声明派生了——再跑一次会拿**自己刚写出的东西**
 * 当权威（实测踩过：第一次写出来的 `recent: 'true'` 被当成事实，0 差异照样绿）。故这里钉死读**改前那次提交**，
 * 词面与场景面（老实物 payload）都是**本票之前**的事实。 */
function readWordsFromHead() {
  let text;
  try {
    text = execFileSync('git', ['show', 'HEAD:packages/skill-bill/src/policy/wakewords.ts'], { cwd: REPO, encoding: 'utf8' });
  } catch (e) {
    fail('读不到改前的词表（git show HEAD:src/policy/wakewords.ts）：' + (e && e.message));
  }
  const at = text.indexOf('export const WAKE_TABLE');
  if (at < 0) fail('改前的词表里找不到 WAKE_TABLE');
  const eq = text.indexOf('=', at);            // 跳过类型注记里的 `WakeEntry[]`
  const start = text.indexOf('[', eq);
  let depth = 0; let quote = null; let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (quote !== null) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) {
      const arr = new Function('return (' + text.slice(start, i + 1) + ');')();
      if (!Array.isArray(arr) || arr.length === 0) fail('改前的词表解析结果不是数组');
      return arr;
    } }
  }
  fail('改前的词表括号不配平');
}

// ───────────────────────────── 主流程 ─────────────────────────────

const payload = readPayload();
const groups = withAddedScenes(payload.groups);
const sceneIndex = indexScenes(groups);
const WAKE_TABLE = readWordsFromHead();

// 词条按域分箱（表序即词序，域序即 payload 域序）。
const byDomain = new Map(DOMAIN_ORDER.map((d) => [d, []]));
const helpEntries = [];
for (const e of WAKE_TABLE) {
  if (e.key === 'bill.help.lookup') { helpEntries.push({ ...entryFields(e), scenes: [] }); continue; }
  byDomain.get(domainOfPhrase(sceneIndex, e.phrase)).push(entryFields(e));
}

// 每条词条挂上它拥有的场景（场景序＝老权威的遍历序）。
const sceneOrder = new Map([...sceneIndex.keys()].map((id, i) => [id, i]));
for (const [, entries] of byDomain) {
  for (const e of entries) {
    const owned = [...sceneIndex.values()].filter((v) => v.scene.wake_word === e.phrase).map((v) => v.scene);
    owned.sort((a, b) => sceneOrder.get(a.id) - sceneOrder.get(b.id));
    e.scenes = owned.map(sceneFields);
  }
}

const declarations = [];
for (const [i, domain] of DOMAIN_ORDER.entries()) {
  const g = groups.find((x) => x.id === domain);
  declarations.push({
    domain,
    decl: {
      id: domain, label: g.label, icon: g.icon, order: i + 1,
      entries: byDomain.get(domain),
      subgroups: g.subgroups.map((sg) => ({ id: sg.id, label: sg.label, scenes: sg.scenes.map((s) => s.id) })),
    },
  });
}
declarations.push({
  domain: 'help',
  decl: { id: 'help', order: 0, entries: helpEntries, subgroups: [] },
});

// ── 判据 ────────────────────────────────────────────────────────────
const problems = [];
const want = (cond, msg) => { if (!cond) problems.push(msg); };

want(declarations.length === 8, '声明份数 ≠ 8：' + declarations.length);
const orders = declarations.map((d) => d.decl.order).sort((a, b) => a - b);
want(JSON.stringify(orders) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7]), 'order 缺号或重号：' + orders.join(','));
want(groups.length === 7, '域数 ≠ 7：' + groups.length);
want(groups.flatMap((g) => g.subgroups).length === 20, '二级组数 ≠ 20');
const allScenes = groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
want(allScenes.length === 74, '场景数 ≠ 74：' + allScenes.length);

// 投影：声明 → 三层资产 + 词表
const projGroups = [];
for (const { decl } of [...declarations].sort((a, b) => a.decl.order - b.decl.order)) {
  const scenesOf = new Map();
  for (const e of decl.entries) for (const s of e.scenes) {
    if (scenesOf.has(s.id)) fail('场景被两条词条同时拥有：' + s.id);
    scenesOf.set(s.id, s);
  }
  const sub = decl.subgroups.map((sg) => ({
    id: sg.id, label: sg.label,
    scenes: sg.scenes.map((id) => {
      const s = scenesOf.get(id);
      if (s === undefined) fail('二级组点名了域内不存在的场景：' + sg.id + ' → ' + id);
      const owner = decl.entries.find((e) => e.scenes.some((x) => x.id === id));
      return { id: s.id, title: s.title, wake_word: owner.phrase, status: s.status, prompt_template: s.prompt_template, types: s.types };
    }),
  }));
  if (sub.length === 0) continue; // 无场景的声明（HELP 位）不进目录
  want(decl.label !== undefined && decl.icon !== undefined, '有场景的声明缺 label／icon：' + decl.id);
  projGroups.push({ id: decl.id, icon: decl.icon, label: decl.label, subgroups: sub });
}
const projScenes = projGroups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const projTable = [...declarations].sort((a, b) => a.decl.order - b.decl.order)
  .flatMap((d) => d.decl.entries.map((e) => ({ phrase: e.phrase, key: e.key, preset: e.preset, needs: e.needs, carries: e.carries })));

const sceneFieldsOf = (s) => ({ id: s.id, title: s.title, wake_word: s.wake_word, status: s.status, prompt_template: s.prompt_template, types: s.types });
const diffScenes = allScenes.filter((s, i) => JSON.stringify(sceneFieldsOf(s)) !== JSON.stringify(projScenes[i]));
want(diffScenes.length === 0, '场景投影与老权威有差异：' + diffScenes.length + ' 条（首条 ' + (diffScenes[0] || {}).id + '）');
want(JSON.stringify(projGroups.map((g) => [g.id, g.icon, g.label])) === JSON.stringify(groups.map((g) => [g.id, g.icon, g.label])), '域序／域元数据与老权威不一致');
want(JSON.stringify(projGroups.map((g) => g.subgroups.map((s) => [s.id, s.label]))) === JSON.stringify(groups.map((g) => g.subgroups.map((s) => [s.id, s.label]))), '二级组名与顺序与老权威不一致');
const tableFieldsOf = (e) => JSON.stringify({ phrase: e.phrase, key: e.key, preset: e.preset, needs: e.needs, carries: e.carries });
const diffTable = WAKE_TABLE.filter((e, i) => tableFieldsOf(e) !== JSON.stringify(projTable[i]));
want(diffTable.length === 0, '词表投影与现 WAKE_TABLE 有差异：' + diffTable.length + ' 条（首条 ' + (diffTable[0] || {}).phrase + '）');
want(projTable.length === WAKE_TABLE.length, '词条条数 ≠ ' + WAKE_TABLE.length);

const legacyRows = projScenes.filter((s) => !ADDED_IDS.has(s.id));
want(legacyRows.length === 71, '老条目数 ≠ 71：' + legacyRows.length);
const canonical = (rows) => JSON.stringify(rows.map((s) => [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types]));
const legacyDigest = createHash('sha256').update(canonical(legacyRows), 'utf8').digest('hex');
want(legacyDigest === LEGACY_DIGEST, '摘要锁不成立：' + legacyDigest + ' ≠ ' + LEGACY_DIGEST);
want(projScenes.filter((s) => s.wake_word === '备份').length === 2, '「备份」一词两场景的形状没搬对');

// **落盘文本往返**：把要写的字面量求值回来，逐字段与内存里的声明比对——
// 判据必须盯「写出去的文本」，不能只盯内存（实测踩过：布尔 `true` 被写成字符串 `'true'` 而内存断言照样绿）。
const roundTrip = [];
for (const { domain, decl } of declarations) {
  const text = renderDeclaration(domain, decl);
  const m = / = \{\n(?<body>[\s\S]*)\n\};$/.exec(text.trimEnd());
  if (m === null) { roundTrip.push(domain + '：抽不出对象字面量'); continue; }
  let back;
  try { back = new Function('return ({' + m.groups.body + '});')(); }
  catch (e) { roundTrip.push(domain + '：落盘文本求值失败（' + e.message + '）'); continue; }
  if (JSON.stringify(back) !== JSON.stringify(decl)) {
    roundTrip.push(domain + '：落盘文本与内存声明不一致（值被改写——查 preset 里的布尔／数字）');
  }
}
want(roundTrip.length === 0, '落盘往返对不上：' + roundTrip.join('；'));

console.log('老实物：' + (allScenes.length - ADDED_IDS.size) + ' 场景／' + payload.groups.length + ' 域／'
  + payload.groups.flatMap((g) => g.subgroups).length + ' 二级组／' + new Set(allScenes.map((s) => s.wake_word)).size + ' 唯一唤醒词');
console.log('搬运后：' + projScenes.length + ' 场景／' + projGroups.length + ' 域／'
  + projGroups.flatMap((g) => g.subgroups).length + ' 二级组／' + projTable.length + ' 词条');
console.log('0 差异：场景 ' + projScenes.length + ' 条逐字段＝老权威；词表 ' + projTable.length + ' 条逐字段＝现 WAKE_TABLE');
console.log('摘要锁：legacy71 sha256=' + legacyDigest);
console.log('RESULT: ' + (problems.length === 0 ? 'PASS' : 'FAIL ' + problems.length));
for (const p of problems) console.log('  RED ' + p);
if (problems.length > 0) process.exitCode = 1;
else {
  const targets = declarations.map(({ domain, decl }) => ({
    path: join(SRC, domain === 'help' ? 'help' : DOMAIN_DIR[domain], 'declaration.ts'),
    text: renderDeclaration(domain, decl),
  }));
  for (const t of targets) console.log('  ' + (DRY ? 'DRAFT' : 'OUT') + ' ' + t.path.slice(REPO.length + 1) + '  sha256='
    + createHash('sha256').update(t.text, 'utf8').digest('hex').slice(0, 16) + '  LF=' + (t.text.split('\n').length - 1));
  if (!DRY) {
    for (const t of targets) { mkdirSync(dirname(t.path), { recursive: true }); writeFileSync(t.path, t.text, 'utf8'); }
    console.log('已写入 ' + targets.length + ' 件域声明');
  } else {
    console.log('--dry：未落盘');
  }
}
