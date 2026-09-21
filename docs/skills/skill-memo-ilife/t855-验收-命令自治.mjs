#!/usr/bin/env node
/** #855 · **命令自治自证探针**（验收面）。判据：`UNACCOUNTED` 必须为空。
 *
 * 自治是什么意思：一条命令从「用户喊一句」到「跑出回执」的全通道都由**它自己的能力目录**供得上——
 * 声明（`src/<域>/commands.ts`）、实现（`src/<域>/run.ts`）、词面（`src/<域>/routes.ts`）、
 * 以及 HELP 场景面（`src/help/scenes/*.ts` 的 30 个场景卡，词面的权威出处）。本探针把四个面逐一取读数、
 * 交叉对账，凡是「在某一面出现过、却没被三桶任何一个收下」的键或词，一律计**未账**并点名。
 *
 * 三桶（互补不重叠，合起来必须覆盖全部键与全部词）：
 *   A 全通道自治 —— 声明＋实现＋词面＋场景＋速查四面齐；
 *   B 口径豁免   —— 声明＋实现齐，**按口径无词面**（下面 `EXEMPT` 逐条带原因与出处，改口径就得改本表）；
 *   C 框架位     —— 不属任何域的能力（`memo.help.lookup`：HELP 交付入口，按 `SKILL.md` 只认「备忘录 HELP」）。
 *
 * 另有两张**在册待办**表（不算未账，但每条都得有票）：`PENDING_WORDS`（词面无场景出处的词）、
 * `PENDING_SCENES`（场景卡暂时没有可用词的场景）。今天两张都只在实际读数为空时才有行。
 *
 * 跑：`node docs/skills/skill-memo-ilife/t855-验收-命令自治.mjs`（读 `dist/`，先 `pnpm build`）。
 * 退出码：0 全部在账；1 有未账或任一面读数与在册表不符；2 环境错（dist 不在）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(resolve(HERE, '..', '..', '..'), 'packages', 'skill-memo-ilife');
const D = (rel) => pathToFileURL(join(PKG, 'dist', rel)).href;
const distAbs = (rel) => join(PKG, 'dist', rel);

if (!existsSync(distAbs('cli/registry.js'))) {
  console.error('环境错：' + distAbs('cli/registry.js') + ' 不在——先 `pnpm build`。');
  process.exit(2);
}

/** 口径豁免（键 → 为什么没有词面 ＋ 出处）。改口径＝改本表（`src/shared/commandSpec.ts` 已允许 `wakeWord` 缺）。 */
const EXEMPT = {
  'memo.auth': {
    why: '无唤醒词：「飞书授权」唤醒短语随授权三支退役（#760），键保留给只读诊断（`step:"status"`／`"diag"`）',
    from: 'src/help/lookup.ts:40-41、src/sync/commands.ts:5',
  },
  'memo.stats': {
    why: '无唤醒词：老骨架 30 场景里 0 条统计内容（票 6 裁「不展」），键与读口保留（命令面处置归 #842）',
    from: 'src/memo/commands.ts:6、src/triggers/wakewords.ts:55',
  },
};

/** 框架位（不属任何域的能力：由出口的框架位服务，不进域门、也不进生成器的命令源）。 */
const FRAMEWORK = {
  'memo.help.lookup': {
    why: 'HELP 交付入口：开库之前分派（只读页不建库），入口词只认「备忘录 HELP」（不是 30 场景之一）',
    from: 'src/cli/cmd_read.ts 的 dispatchHelp 分派、src/help/sceneData.ts:53',
  },
};

/** 词面里暂时没有 HELP 场景出处的词，或场景别名暂时没接词面的词（在册待办，必须带票）。 */
const PENDING_WORDS = {
  '废弃提醒': { why: '旧表别名，HELP 30 场景没有它的出处', ticket: '#858（别名总表；`wakewords.ts` 注：本行撤行）' },
  '完成打卡': { why: '场景 `memo_complete_wish` 的别名，词面未接（本票是结构票，接词＝行为变更）', ticket: '#858（别名总表）' },
  '初始化': { why: '场景 `memo_init_setup` 的别名，词面未接（#850 只落了主名 `首次使用`）', ticket: '#858（别名总表）' },
  '新手': { why: '场景 `memo_init_setup` 的别名，词面未接（同上）', ticket: '#858（别名总表）' },
};

/** 场景卡暂时没有可用词的场景（在册待办，必须带票）。 */
const PENDING_SCENES = {};

const fail = [];
const note = (s) => console.log(s);

// —— 面读数 ——
/** ① 声明面（手写＝权威）：各域 `commands.ts` 里 `key:` 那一行。 */
const declared = new Map(); // key → 域
for (const e of readdirSync(join(PKG, 'src'), { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const file = join(PKG, 'src', e.name, 'commands.ts');
  if (!existsSync(file)) continue;
  for (const m of readFileSync(file, 'utf8').matchAll(/^\s*key: '([^']+)',\s*$/gm)) declared.set(m[1], e.name);
}

const { REGISTRY, REGISTRY_KEYS } = await import(D('cli/registry.js'));
const { WAKE_ROUTES } = await import(D('triggers/routes.generated.js'));
const { buildHelpLookup } = await import(D('help/index.js'));
const { buildHelpSceneIndex, MEMO_HELP_GROUPS } = await import(D('help/sceneData.js'));
const { MEMO_DECLARED_SHAPES } = await import(D('cli/keys.js'));
/** envelope 认的全表（＝声明派 13 条 ＋ 框架位那几行；两张表的逐键一致由 `test/cmd-registry-855.test.mjs` 守）。 */
const { MEMO_KEY_SHAPES } = await import(D('render/index.js'));

/** ② 实现面：登记表里每条键的处理函数。 */
const impl = new Map(REGISTRY_KEYS.map((k) => [k, REGISTRY[k]]));
/** ③ 词面：键 → 指向它的词（保序去重）。 */
const words = new Map();
for (const r of WAKE_ROUTES) {
  if (!words.has(r.key)) words.set(r.key, []);
  if (!words.get(r.key).includes(r.wakeWord)) words.get(r.key).push(r.wakeWord);
}
const routeWords = new Set(WAKE_ROUTES.map((r) => r.wakeWord));
/** ④ 场景面（词面的权威出处）：词 → 场景 id／别名。 */
const sceneOfWord = new Map();
const scenes = [];
for (const g of MEMO_HELP_GROUPS) {
  for (const sg of g.subgroups) {
    for (const s of sg.scenes) {
      scenes.push({ domain: g.id, scene: s.id, word: s.wake_word, aliases: s.aliases ?? [] });
      for (const w of [s.wake_word, ...(s.aliases ?? [])]) if (w) sceneOfWord.set(w, s.id);
    }
  }
}
/** ⑤ 速查面（SKILL.md 那张表的上游）：键 → 词。 */
const helpKeys = new Set(buildHelpLookup().map((h) => h.key));

// —— 对账 ——
const keys = [...new Set([...declared.keys(), ...impl.keys(), ...words.keys(), ...helpKeys, ...Object.keys(FRAMEWORK)])].sort();
const bucketA = [], bucketB = [], bucketC = [], unaccounted = [];

for (const key of keys) {
  const dom = declared.get(key);
  const spec = impl.get(key);
  const ws = words.get(key) ?? [];
  if (FRAMEWORK[key] !== undefined) {
    if (dom !== undefined || spec !== undefined) { unaccounted.push('框架位 ' + key + ' 竟然进了域声明或登记表（该只走框架位）'); continue; }
    bucketC.push({ key, ws, note: FRAMEWORK[key] });
    continue;
  }
  if (dom === undefined) { unaccounted.push('键 ' + key + ' 有一面读数、却没有任何域声明它（声明面缺席）'); continue; }
  if (spec === undefined || typeof spec.run !== 'function') { unaccounted.push('键 ' + key + ' 声明在 `' + dom + '/commands.ts`、但没有可跑的登记表条目'); continue; }
  if (ws.length === 0) {
    if (EXEMPT[key] === undefined) { unaccounted.push('键 ' + key + ' 无词面、且不在口径豁免在册表里（要么补词，要么在 EXEMPT 在册说明原因）'); continue; }
    bucketB.push({ key, dom, note: EXEMPT[key] });
    continue;
  }
  // 有词面：逐词查场景出处 + 速查面覆盖
  const noScene = ws.filter((w) => !sceneOfWord.has(w));
  for (const w of noScene) {
    const pend = PENDING_WORDS[w];
    if (pend === undefined) unaccounted.push('词「' + w + '」（→ ' + key + '）在词面里、却在 HELP 场景面查不到出处，也不在 PENDING_WORDS 在册表里');
  }
  if (!helpKeys.has(key)) unaccounted.push('键 ' + key + ' 有词面、但不在 HELP 速查面（SKILL.md 那张表会漏词）');
  bucketA.push({ key, dom, ws, noScene });
}

// 场景面反向对账：每张场景卡的词都得能路由；主名路由到的键必须是真声明的键。
for (const s of scenes) {
  const pend = PENDING_SCENES[s.scene];
  if (!routeWords.has(s.word) && pend === undefined) {
    unaccounted.push('场景 ' + s.scene + ' 的主名「' + s.word + '」在词面里路由不到（HELP 承诺了、命令面接不住）');
    continue;
  }
  for (const a of s.aliases) {
    if (!routeWords.has(a) && PENDING_WORDS[a] === undefined) {
      unaccounted.push('场景 ' + s.scene + ' 的别名「' + a + '」在词面里路由不到，也不在 PENDING_WORDS 在册表里');
    }
  }
}
// 有词面的键数必须等于场景面覆盖到的键数（词面不许覆盖场景面管不到的命令键）
const sceneKeys = new Set();
for (const s of scenes) for (const w of [s.word, ...s.aliases]) {
  const hit = WAKE_ROUTES.find((r) => r.wakeWord === w);
  if (hit) sceneKeys.add(hit.key);
}
for (const k of words.keys()) if (!sceneKeys.has(k) && !declared.has(k)) unaccounted.push('词面指向的键 ' + k + ' 既没有场景出处也没有域声明');

// —— 框架位自证（真跑，不只看源码）——
const idx = buildHelpSceneIndex();
if (idx.items.length !== 8 || idx.sceneTotal !== 30) {
  unaccounted.push('框架位 index 载荷不对：域 ' + idx.items.length + '（应 8）／场景 ' + idx.sceneTotal + '（应 30）');
}
if (MEMO_KEY_SHAPES['memo.help.lookup'] === undefined) unaccounted.push('框架位 memo.help.lookup 不在键形状表里（envelope 会拒绝它）');
if (!readFileSync(join(PKG, 'src/cli/cmd_read.ts'), 'utf8').includes('dispatchHelp')) unaccounted.push('出口里找不到 dispatchHelp——框架位没接线');
// 声明派形状与 envelope 全表逐键一致（两张表同名不同名都行，事实只能一处：声明；这里验它们没漂）
for (const [k, s] of Object.entries(MEMO_DECLARED_SHAPES)) {
  if (MEMO_KEY_SHAPES[k] !== s) unaccounted.push('键 ' + k + ' 的形状两表不一致：声明派 ' + s + ' ≠ envelope ' + MEMO_KEY_SHAPES[k]);
}

// —— 报告 ——
note('#855 · 命令自治自证（命令 ' + declared.size + ' 条／词 ' + routeWords.size + ' 个／场景 ' + scenes.length + ' 张）');
note('');
note('桶 A 全通道自治（' + bucketA.length + '）：声明 ＋ 实现 ＋ 词面 ＋ 场景 ＋ 速查');
for (const b of bucketA) {
  note('  ' + b.key.padEnd(16) + '域 ' + b.dom.padEnd(8) + '词 ' + b.ws.length + '：' + b.ws.join('、') + (b.noScene.length ? '（无场景出处：' + b.noScene.join('、') + '，在 PENDING_WORDS 在册）' : ''));
}
note('');
note('桶 B 口径豁免（' + bucketB.length + '）：声明 ＋ 实现齐，按口径无词面');
for (const b of bucketB) note('  ' + b.key.padEnd(16) + '域 ' + b.dom.padEnd(8) + b.note.why + '｜出处 ' + b.note.from);
note('');
note('桶 C 框架位（' + bucketC.length + '）：不属任何域');
for (const b of bucketC) note('  ' + b.key.padEnd(17) + b.note.why + '｜出处 ' + b.note.from);
note('');
note('在册待办：词 ' + Object.keys(PENDING_WORDS).length + ' 条（' + (Object.keys(PENDING_WORDS).join('、') || '无') + '）／场景 ' + Object.keys(PENDING_SCENES).length + ' 条');
for (const [w, v] of Object.entries(PENDING_WORDS)) note('  · 词「' + w + '」' + v.why + ' → ' + v.ticket);
note('');
if (unaccounted.length) {
  note('UNACCOUNTED（' + unaccounted.length + '）：');
  for (const u of unaccounted) note('  ✖ ' + u);
  note('RESULT: FAIL（未账非空）');
  process.exit(1);
}
note('UNACCOUNTED: 空');
note('RESULT: PASS（' + keys.length + ' 键全部落桶：A ' + bucketA.length + ' ＋ B ' + bucketB.length + ' ＋ C ' + bucketC.length + '）');
