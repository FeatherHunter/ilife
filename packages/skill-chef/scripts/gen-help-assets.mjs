#!/usr/bin/env node
/** #213 · 私家大厨 HELP 内容资产生成器：老技能 HELP 载荷 → `src/help/sceneData.ts`（typed const）。
 *
 * 为什么留一个生成器：48 卡的 `prompt_template` 要求**逐字**（含 16 张卡的双花括号填写位），手抄必漂移；
 * 生成器只做「读事实源 → 声明式映射 → 逐字序列化 → 落盘」，跑两次字节一致。
 *
 * 用法（不进 build／test 管线；事实源在盘上才跑得动）：
 *   node packages/skill-chef/scripts/gen-help-assets.mjs              # 落盘
 *   node packages/skill-chef/scripts/gen-help-assets.mjs --check      # 只比对，不一致 exit 1
 *   node packages/skill-chef/scripts/gen-help-assets.mjs --src <载荷.json>
 *
 * 三处事实源（全程只读）：
 *   ① 老技能 HELP 载荷 `.scratch/chef-help/legacy-chef-help-payload.json`（74,581 B）。**以 `$.scenarios[]` 为准**：
 *      载荷把同一批 48 条输出了两遍（`$.wake_words[].scenarios[]` 是第二遍视图，48/48 逐字相同，本文件有断言），两遍不相加；
 *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`：唤醒词单一事实源。chip 路由与 14 张卡的状态**从它派生**
 *      （照兄弟件 `skill-bill/src/triggers/wake-assets.ts:984-986` 的派生法），本文件不落第二份字面量；
 *      ⚠️ 双向对账的实测口径：表 37 条 ↔ 资产 33 个组名。**表中有资产无＝17 条**（4 条 HELP 自身触发词 ＋
 *      13 条新表多出词）；**资产有表中无＝13 个老组名**（→ 14 张卡标 `'【待开发】'`）。那 13 条多出词按
 *      t2 §3.1／§5.1 是「待判」的 13 条（判「老卡近义触发／改名」9 ＋ 「真新条目」3 ＋ 「不造卡」1），
 *      §5.1 给它们判了内容来源与落位「接在对应二级组末尾」，但**本票资产按定案保持老骨架 48 卡**
 *      （t236 §2.2／§七 草案／本图裁决 3-4 的数都按 48 卡记账）⇒ 这 13 条**不在本票资产内**，见 `NEW_TABLE_ONLY`；
 *   ③ `docs/skills/skill-chef/t2-content-reconcile.md` §七 的 JSON 草案（定案的形状起点）：逐组／逐卡交叉复核
 *      （三层结构 ＋ 6 键逐字 ＋ 卡序），两地有一处对不上即 fail-closed。
 *
 * 与老骨架的**有意偏离**（四类，生成文件头注释同步声明）：
 *   1. `type`（单数、11 种字符串）→ `types`（复数数组）：按 `+` 拆、去 `(过程型)` 这类括号注（t2 §七 映射口径）；
 *   2. `dimensions`（42 键／80 条，含 1 条畸形键）→ `editable_fields`：键→`name`／`label`（逐字，不自造中文名），
 *      老值原文→`value`。**丢弃 1 条**＝`data_export_backup` 的畸形键 `默认不含)`（值为 `null`，过不了
 *      `SceneEditableField.value` 的 string）；同卡 `include_archived` 照 t2 丁类定案补 `hint`；
 *   3. `status`：老件 48/48 空串（老家缺陷，不照抄）⇒ 13 个不在 `WAKE_TABLE` 的老组名下 **14 张卡**标 `'【待开发】'`，
 *      其余 34 张空串。**13 个组名由 `WAKE_TABLE` 派生后逐字比对，不靠手抄**；
 *   4. **不迁四项**：`result`（48/48；裁决＝「用户拿到的结果型 HTML 文件就是最好的执行结果」）／
 *      `html.command_cn`（与组名 48/48 逐字相同，搬了＝同卡重复）／`html.template`（18 个老技能路径，新技能里一个不存在）／
 *      `html.data_source` ＋ `variants`（96 处全空）。
 *
 * 摘要锁（三把，任一不符即 exit 1；`--check` 另逐字节比对整份产物）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SCENE_DATA = join(PKG_DIR, 'src', 'help', 'sceneData.ts');
const WAKE_SRC = join(PKG_DIR, 'src', 'policy', 'wakewords.ts');
const DRAFT_DOC = join(PKG_DIR, '..', '..', 'docs', 'skills', 'skill-chef', 't2-content-reconcile.md');
const DEFAULT_SRC = 'D:\\ilife\\.scratch\\chef-help\\legacy-chef-help-payload.json';

/** 摘要锁：① 载荷文件字节；② 老 48 条 canonical；③ 映射后 48 条 canonical。 */
const SOURCE_SHA256 = 'c09f11d9ffa49e6b14c2ade094b5ab428f22fd440b2608442166e470db47d2ab';
const LEGACY_DIGEST = '620653ed98c85acbeaf0ab646adf0ef48345f4d65d218a8d756f59f86757ae55';
const ASSET_DIGEST = 'b87e504e2ecabccfcb9d7887e2a1153026bab6b882c9c068f29db93f82292d9f';

/** 页面级三项（裁决 6「逐项照记账」），三个值各自钉在自己的事实上：
 *  - `skill_name` 取老 `meta.skill`（下方 `:185` 逐字断言）；
 *  - `title` 取**老家产物原文** `<title>私家大厨 HELP · 能力速查</title>`
 *    （实测留档 `.scratch/chef-help/A1-legacy-chef-help-skeleton.md:340`／`:398`；t3-template-contract.md:244 同）。
 *    ⚠️ **#213 首版此处取的是 t2 §七 草案的「私家大厨 · 能力速查」，票 6（#214）就地摆正为老家原文**
 *    ——草案那一版少了「HELP」，且与老家页面的 `<title>` 不一致；t236 §6.3 已复核老家原文走 `composeDocTitle`
 *    的「原样」支（`title` 含技能名 ⇒ 标签页不重复技能名）；
 *  - `version` 取老载荷 `meta.version`＝**技能数据世代**（下方 `:186` 逐字断言），**不是** npm 包
 *    `skill-chef@0.1.0` ——两者同值是巧合。口径照 bill `src/render/helpFile.ts:13-14`（老 `summary.version`）
 *    与 schedule `src/help/helpFile.ts:34-35`（「照 bill 口径：**不是** npm 包版本」）。 */
const SKILL_NAME = '私家大厨';
const HELP_TITLE = '私家大厨 HELP · 能力速查';
const HELP_VERSION = '0.1.0';

/** 十域（权威出处＝老技能 `scenes/*.yaml` 的文件级 `domain:` 块，t2 §一／§二；域序＝t2 §一 域序 1..10）。 */
const DOMAINS = [
  { id: 'cook', label: '做菜', icon: '🍳' },
  { id: 'view', label: '查看', icon: '👀' },
  { id: 'search', label: '搜索筛选', icon: '🔍' },
  { id: 'update', label: '修改', icon: '✏️' },
  { id: 'history', label: '历史', icon: '📜' },
  { id: 'shopping', label: '采购', icon: '🛒' },
  { id: 'add', label: '录入', icon: '📝' },
  { id: 'relation', label: '派生', icon: '🌿' },
  { id: 'setup', label: '开始使用', icon: '🚀' },
  { id: 'data', label: '数据管理', icon: '🗄️' },
];

/** 老 33 组 → 域（t2 §二 归属表逐行；组序仍取载荷 `$.wake_words[]` 序，域只是收组）。 */
const GROUP_DOMAIN = {
  '做菜模式': 'cook',
  '查看食谱': 'view', '查看食材': 'view', '查看步骤': 'view', '查看营养': 'view', '查看背景': 'view',
  '搜索食谱': 'search', '筛选菜系': 'search', '筛选食材': 'search', '筛选难度': 'search', '筛选时间': 'search',
  '筛选炊具': 'search', '筛选口味': 'search', '筛选季节': 'search', '筛选状态': 'search', '查看全部': 'search',
  '修改食谱': 'update', '修改步骤': 'update', '修改食材': 'update', '废弃食谱': 'update',
  '记录做菜': 'history', '查看历史': 'history', '查看统计': 'history',
  '生成清单': 'shopping',
  '录入食谱': 'add', '导入食谱': 'add',
  '添加派生关系': 'relation', '查看派生关系': 'relation', '从已有派生新菜': 'relation',
  '首次使用': 'setup',
  '体检': 'data', '批量改': 'data', '备份': 'data',
};

/** 13 个不在 `WAKE_TABLE` 的老组名 ＋ 各组名下应标 `'【待开发】'` 的卡（t2 §3.2 逐条）。
 *  ⚠️ 这只作**比对期望**：状态本身由 `WAKE_TABLE` 派生（`assetWords − tablePhrases`），不是拿这张表赋值。 */
const PENDING_EXPECT = {
  '筛选难度': ['filter_difficulty_easy'],
  '筛选时间': ['filter_time_quick'],
  '筛选炊具': ['filter_by_cookware'],
  '筛选状态': ['filter_by_status'],
  '修改步骤': ['update_step_content'],
  '修改食材': ['update_ingredient'],
  '导入食谱': ['import_from_json', 'import_validation_failed'],
  '添加派生关系': ['add_relation'],
  '查看派生关系': ['view_relation_tree'],
  '首次使用': ['first_use'],
  '批量改': ['data_batch_edit'],
  '备份': ['data_export_backup'],
  '从已有派生新菜': ['derive_from_existing'],
};

/** t2 丁类定案的附带清洗：老件那句「是否含已废弃(选填,默认不含)」被 YAML 折行劈成两键，补全同卡 `hint`。 */
const FIELD_HINT_FIX = { 'data_export_backup/include_archived': '是否含已废弃(选填，默认不含)' };

/** 13 条「新表有、老骨架无同名组」的词（t2 §3.1 乙类／§5.1 逐条表）——**本票资产不含它们**。
 *  它们是新表相对老 HELP 多出来的词：判「老卡近义触发／改名」9 条（看菜谱／看菜／搜菜／查食材／加菜／开始做菜／
 *  继续做菜／补录做菜／改评分）＋「真新条目」3 条（完成做菜／查清单／清空清单）＋「不造卡（参数升格）」1 条（排除可选）。
 *  本节只把它们**列名豁免**（两个方向的对账都必须点名核对），不替它们造卡：本图裁决 3-4 与 t236 §2.2 的数都按
 *  老骨架 48 卡记账，要补这 12～13 条应另开决定（§5.1 的落位规则＝接在对应二级组末尾）。 */
const NEW_TABLE_ONLY = ['看菜谱', '看菜', '搜菜', '查食材', '加菜', '开始做菜', '继续做菜', '完成做菜',
  '排除可选', '查清单', '清空清单', '补录做菜', '改评分'];

/** 形状断言全表（每个数都在这里钉死，改资产即红）。 */
const EXPECT = {
  bytes: 74581, domains: 10, subgroups: 33, scenes: 48, cardsWithFields: 46, dimPairs: 79, dimKeys: 41,
  legacyDimPairs: 80, legacyDimKeys: 42, droppedPairs: 1, typeStrings: 11, placeholders: 16,
  wakePhrases: 37, helpWakeWords: 4, newTableOnlyWords: 13, tableOnlyWords: 17,
  pendingGroups: 13, pendingCards: 14, availableCards: 34,
};

const bad = (msg) => { throw new Error('生成器断言不过：' + msg); };
const eq = (what, got, want) => { if (got !== want) bad(what + ' ＝ ' + got + '，应为 ' + want); };
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const lf = (text) => (text.match(/\n/g) || []).length;
const canonicalLegacy = (scenes) => JSON.stringify(scenes.map((s) =>
  [s.scenario_id, s.scenario_title, s.wake_word, s.status, s.prompt, s.type, s.dimensions]));
const canonicalAsset = (scenes) => JSON.stringify(scenes.map((s) =>
  [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types, s.editable_fields ?? null]));

/** `WAKE_TABLE` 逐条读（口径层是唤醒词的单一事实源；本文件只投影，不落第二份）。 */
function readWakeTable() {
  const rows = [...readFileSync(WAKE_SRC, 'utf8').matchAll(/\{ phrase: '([^']+)', key: '([^']+)'/g)]
    .map((m) => ({ phrase: m[1], key: m[2] }));
  eq('WAKE_TABLE 条数', rows.length, EXPECT.wakePhrases);
  eq('WAKE_TABLE 词不重复', new Set(rows.map((r) => r.phrase)).size, rows.length);
  return rows;
}

/** t2 §七 的 JSON 草案（形状起点）——逐组／逐卡交叉复核用。锚在「## 七、」标题之后取第一段 ```json。 */
function readDraft() {
  const lines = readFileSync(DRAFT_DOC, 'utf8').split('\n');
  const head = lines.findIndex((l) => l.startsWith('## 七、'));
  if (head < 0) bad('t2 文档里找不到「## 七、」标题：' + DRAFT_DOC);
  const open = lines.findIndex((l, i) => i > head && l.trim() === '```json');
  const close = lines.findIndex((l, i) => i > open && l.trim() === '```');
  if (open < 0 || close < 0) bad('t2 草案的 ```json 段找不到：' + DRAFT_DOC);
  return JSON.parse(lines.slice(open + 1, close).join('\n'));
}

/** 老件 `type`（单数）→ 契约 `types`（复数）：按 `+` 拆、去括号注（t2 §七 映射口径）。 */
function splitTypes(raw, id) {
  const atoms = raw.replace(/\([^)]*\)/g, '').split('+').map((t) => t.trim());
  if (atoms.some((a) => a === '' || a.includes('(') || a.includes(')'))) bad(id + ' 的 type 拆不干净：' + raw);
  return atoms;
}

/** 老件 `dimensions` → 契约 `editable_fields`：键→`name`／`label`，老值原文→`value`；非 string 的一条丢弃。 */
function toFields(scene, dropped) {
  const fields = [];
  for (const [name, value] of Object.entries(scene.dimensions)) {
    if (typeof value !== 'string') { dropped.push([scene.scenario_id, name, value]); continue; }
    const hint = FIELD_HINT_FIX[scene.scenario_id + '/' + name];
    fields.push(hint ? { name, label: name, value, hint } : { name, label: name, value });
  }
  return fields;
}

/** 载荷 → 资产（十域／33 组／48 卡）。所有断言的落点都在这一个函数里。 */
function build(payload, wakeTable) {
  eq('载荷 meta.skill', payload.meta.skill, SKILL_NAME);
  eq('载荷 meta.version', payload.meta.version, HELP_VERSION);
  eq('载荷卡数', payload.scenarios.length, EXPECT.scenes);

  const nested = payload.wake_words.flatMap((w) => w.scenarios); // 计数陷阱：这是同一批 48 条的第二遍视图
  eq('嵌套视图条数', nested.length, EXPECT.scenes);
  for (let i = 0; i < nested.length; i += 1) {
    if (JSON.stringify(nested[i]) !== JSON.stringify(payload.scenarios[i])) bad('第 ' + (i + 1) + ' 条两遍视图不一致');
  }

  const raw = payload.wake_words.map((w) => ({ name: w.name, domain: GROUP_DOMAIN[w.name], scenes: w.scenarios }));
  eq('老组数', raw.length, EXPECT.subgroups);
  for (const g of raw) {
    if (!g.domain) bad('组 ' + g.name + ' 不在 t2 §二 归属表里');
    for (const s of g.scenes) if (s.wake_word !== g.name) bad(s.scenario_id + ' 的 wake_word ≠ 所属组名 ' + g.name);
  }

  const tablePhrases = wakeTable.map((e) => e.phrase);
  const helpPhrases = wakeTable.filter((e) => e.key === 'chef.help.lookup').map((e) => e.phrase);
  const names = raw.map((g) => g.name);
  const assetOnly = names.filter((w) => !tablePhrases.includes(w)); // 方向①：资产有、表中无
  const tableOnly = tablePhrases.filter((p) => !names.includes(p)); // 方向②：表中有、资产无
  eq('资产有表中无的组名数', assetOnly.length, EXPECT.pendingGroups);
  for (const w of Object.keys(PENDING_EXPECT)) if (!assetOnly.includes(w)) bad('非路由老组名少了 ' + w);
  for (const w of assetOnly) if (!PENDING_EXPECT[w]) bad('多出一个非路由老组名：' + w);
  eq('表中有资产无的词数', tableOnly.length, EXPECT.tableOnlyWords);
  eq('其中 HELP 自身触发词', tableOnly.filter((p) => helpPhrases.includes(p)).length, EXPECT.helpWakeWords);
  eq('其中新表多出词（本票不造卡）', tableOnly.filter((p) => NEW_TABLE_ONLY.includes(p)).length, EXPECT.newTableOnlyWords);
  for (const p of tableOnly) {
    if (!helpPhrases.includes(p) && !NEW_TABLE_ONLY.includes(p)) bad('表中多出的词既不是 HELP 触发词、也不在 t2 §5.1 的 13 条里：' + p);
  }
  const pending = new Set(assetOnly);

  const dropped = [];
  const typeStrings = new Set();
  const asset = DOMAINS.map((d) => ({
    id: d.id, icon: d.icon, label: d.label,
    subgroups: raw.filter((g) => g.domain === d.id).map((g) => ({
      id: g.name, label: g.name,
      scenes: g.scenes.map((s) => {
        typeStrings.add(s.type);
        const fields = toFields(s, dropped);
        const scene = {
          id: s.scenario_id, title: s.scenario_title, wake_word: s.wake_word,
          types: splitTypes(s.type, s.scenario_id),
          status: pending.has(s.wake_word) ? '【待开发】' : '',
          prompt_template: s.prompt,
        };
        if (fields.length) scene.editable_fields = fields;
        return scene;
      }),
    })),
  }));

  // 三层计数 ＋ 字段账
  eq('域数', asset.length, EXPECT.domains);
  const subs = asset.flatMap((g) => g.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  const fields = scenes.flatMap((s) => s.editable_fields || []);
  eq('组数', subs.length, EXPECT.subgroups);
  eq('卡数', scenes.length, EXPECT.scenes);
  eq('卡 id 唯一数', new Set(scenes.map((s) => s.id)).size, EXPECT.scenes);
  eq('组 id 唯一数', new Set(subs.map((s) => s.id)).size, EXPECT.subgroups);
  eq('带字段卡数', scenes.filter((s) => s.editable_fields).length, EXPECT.cardsWithFields);
  eq('字段条数', fields.length, EXPECT.dimPairs);
  eq('字段键唯一数', new Set(fields.map((f) => f.name)).size, EXPECT.dimKeys);
  eq('丢弃的畸形键条数', dropped.length, EXPECT.droppedPairs);
  eq('丢弃的畸形键值', String(dropped[0][2]), 'null');
  eq('老件键值对', payload.scenarios.flatMap((s) => Object.keys(s.dimensions)).length, EXPECT.legacyDimPairs);
  eq('老件键并集', new Set(payload.scenarios.flatMap((s) => Object.keys(s.dimensions))).size, EXPECT.legacyDimKeys);
  eq('老件 type 取值种数', typeStrings.size, EXPECT.typeStrings);
  eq('双花括号卡数', scenes.filter((s) => s.prompt_template.includes('{{')).length, EXPECT.placeholders);
  for (const s of scenes) {
    if (!s.title || !s.prompt_template || !s.wake_word || !s.id) bad(s.id + ' 有空字段');
    for (const f of s.editable_fields || []) {
      if (typeof f.name !== 'string' || typeof f.label !== 'string' || typeof f.value !== 'string') bad(s.id + ' 字段非 string');
    }
  }
  const dev = scenes.filter((s) => s.status === '【待开发】');
  eq('待开发卡数', dev.length, EXPECT.pendingCards);
  eq('可用卡数', scenes.length - dev.length, EXPECT.availableCards);
  for (const [name, ids] of Object.entries(PENDING_EXPECT)) {
    const got = dev.filter((s) => s.wake_word === name).map((s) => s.id);
    if (JSON.stringify(got) !== JSON.stringify(ids)) bad('组 ' + name + ' 的待开发卡：实测 ' + JSON.stringify(got));
  }
  return { asset, subs, scenes, fields, dropped, tablePhrases, helpPhrases, assetOnly, tableOnly };
}

/** 与 t2 §七 草案交叉复核：三层结构 ＋ 每卡逐字（草案不搬 `dimensions`，字段账另算）。
 *  **唯一豁免 `status`**：草案照抄老件（48/48 空串），本件按裁决 3-4 改了 14 张 ⇒ 差异条数必须恰好 14。 */
function crossCheckDraft(asset, draft) {
  let statusDiffs = 0;
  eq('草案域数', draft.groups.length, EXPECT.domains);
  // 页面级 `title` **有意与草案不一致**：草案写的是提案「私家大厨 · 能力速查」，#214（票 6）按裁决 6 取
  // **老家产物原文**「私家大厨 HELP · 能力速查」（三条证据见 `HELP_TITLE` 声明处）。故这里对草案仍逐字断言
  // 它的原值（草案若被改动即红），另对**生成件**断言「含技能名」＝`composeDocTitle` 走原样支的充要条件
  // （`packages/base-render/src/helpShell.ts:66-70`）。
  eq('草案 skill_name／version', [draft.skill_name, draft.version].join('|'), [SKILL_NAME, HELP_VERSION].join('|'));
  eq('草案 title（本件有意不照抄，见上）', draft.title, '私家大厨 · 能力速查');
  eq('title 含技能名（composeDocTitle 原样支）', HELP_TITLE.includes(SKILL_NAME), true);
  for (let i = 0; i < asset.length; i += 1) {
    const d = draft.groups[i]; const m = asset[i];
    for (const k of ['id', 'icon', 'label']) if (d[k] !== m[k]) bad('第 ' + (i + 1) + ' 域 ' + k + '：草案 ' + d[k] + ' ≠ 生成 ' + m[k]);
    eq('域 ' + d.id + ' 组数', d.subgroups.length, m.subgroups.length);
    for (let j = 0; j < m.subgroups.length; j += 1) {
      const ds = d.subgroups[j]; const ms = m.subgroups[j];
      for (const k of ['id', 'label']) if (ds[k] !== ms[k]) bad(d.id + ' 第 ' + (j + 1) + ' 组 ' + k + '：草案 ' + ds[k] + ' ≠ 生成 ' + ms[k]);
      eq('组 ' + ds.id + ' 卡数', ds.scenes.length, ms.scenes.length);
      for (let k = 0; k < ms.scenes.length; k += 1) {
        const a = ds.scenes[k]; const b = ms.scenes[k];
        for (const key of ['id', 'title', 'wake_word', 'prompt_template']) {
          if (a[key] !== b[key]) bad(b.id + ' 的 ' + key + '：草案 ' + JSON.stringify(a[key]) + ' ≠ 生成 ' + JSON.stringify(b[key]));
        }
        if (a.status !== '') bad(b.id + ' 的草案 status 不是空串（草案照抄老件，应 48/48 空串）：' + JSON.stringify(a.status));
        if (JSON.stringify(a.types) !== JSON.stringify(b.types)) bad(b.id + ' 的 types：草案 ' + JSON.stringify(a.types) + ' ≠ 生成 ' + JSON.stringify(b.types));
        if (b.status !== a.status) statusDiffs += 1;
      }
    }
  }
  eq('与草案的 status 差异条数（裁决 3-4 的 14 张）', statusDiffs, EXPECT.pendingCards);
}

/** 头部声明（事实源／摘要锁／四类偏离／两个导出）。 */
function header(digests) {
  return ['/** #213 · 私家大厨 HELP 内容资产：老骨架 48 卡 → 10 域／33 组／48 卡的 typed const。',
    ' *',
    ' * ⚠️ 机器生成，**禁手改**：由 `packages/skill-chef/scripts/gen-help-assets.mjs` 产出。',
    ' *    改内容＝改生成器里的声明表（十域表／组→域归属表／字段映射），再跑',
    ' *    `node packages/skill-chef/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。',
    ' *',
    ' * 事实源（全程只读）：',
    ' *   ① 老技能 HELP 载荷 `.scratch/chef-help/legacy-chef-help-payload.json`（74,581 B）；**以 `$.scenarios[]` 为准**——',
    ' *      载荷把同一批 48 条输出了两遍（`$.wake_words[].scenarios[]` 是第二遍视图，48/48 逐字相同），两遍不相加；',
    ' *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条 phrase）：唤醒词单一事实源，本件的 chip 路由与',
    ' *      14 张卡的状态从它**派生**（`资产组名 − 表内 phrase`），不落第二份字面量。双向对账：表 37 ↔ 资产 33 组名；',
    ' *      资产有表中无 ＝ 13 个老组名（→ 14 张 `\'【待开发】\'`）；表中有资产无 ＝ 17 条（4 条 HELP 自身触发词 ＋',
    ' *      13 条新表多出词——后者见 t2 §3.1／§5.1，本票资产按老骨架保持 48 卡、不含它们）；',
    ' *   ③ `docs/skills/skill-chef/t2-content-reconcile.md` §七 的 JSON 草案：形状起点，生成器已逐组／逐卡交叉复核。',
    ' * 摘要锁：载荷文件 sha256＝' + digests.source,
    ' *           老 48 条 sha256＝' + digests.legacy,
    ' *           映射后 48 条 sha256＝' + digests.asset,
    ' *',
    ' * 与老骨架的**有意偏离**（四类，逐条对账见生成器头注释与 t2 §七）：',
    ' *   1. `type`（单数、11 种字符串）→ `types`（复数数组）：按 `+` 拆、去 `(过程型)` 这类括号注；',
    ' *   2. `dimensions`（42 键／80 条）→ `editable_fields`：键→`name`／`label`（逐字，不自造中文名），老值原文→`value`；',
    ' *      **丢弃 1 条**＝`data_export_backup` 的畸形键 `默认不含)`（值为 `null`，过不了 `value: string`）；',
    ' *      同卡 `include_archived` 照 t2 丁类定案补 `hint`（「是否含已废弃(选填，默认不含)」）；',
    ' *   3. `status`：老件 48/48 空串是老家缺陷，不照抄 ⇒ 13 个不在 `WAKE_TABLE` 的老组名下 **14 张卡**标',
    ' *      `\'【待开发】\'`（卡面出「待开发」徽章），其余 34 张空串；',
    ' *   4. **不迁四项**：`result`（48/48；裁决「用户拿到的结果型 HTML 文件就是最好的执行结果」）／',
    ' *      `html.command_cn`（与组名 48/48 逐字相同）／`html.template`（18 个老技能路径，新技能里一个不存在）／',
    ' *      `html.data_source` ＋ `variants`（96 处全空）。',
    ' *',
    ' * 本文件给 **2 个导出**：`CHEF_SCENES`（全量 `groups`，复用公共层 `base-paint` 的契约类型）与',
    ' * `buildChefSceneData()`（全量 `SceneData`）。页面级三项照裁决 6「逐项照记账」：`skill_name` 取老 `meta.skill`，',
    ' * `title` 取**老家产物原文**（`.scratch/chef-help/A1-legacy-chef-help-skeleton.md:340`／`:398` 实测的',
    ' * `<title>私家大厨 HELP · 能力速查</title>`；含技能名 ⇒ `composeDocTitle` 走「原样」支，标签页不重复技能名），',
    ' * `version` 取老载荷 `meta.version`＝**技能数据世代**（非 npm 包版本；同值是巧合）。',
    ' */'].join('\n');
}

/** 资产 → `sceneData.ts` 全文（一卡一行：48 卡是数据行，横着读比竖着读省 300 行）。 */
function render(stat, digests) {
  const scenes = stat.scenes;
  const L = [header(digests), '', "import type { SceneData, SceneGroup } from 'base-paint';", '',
    '/** 10 域／33 组／48 卡：域序＝t2 §一 域序 1..10；组序＝载荷 `$.wake_words[]` 序按域收组；卡序＝载荷书写序。 */',
    'export const CHEF_SCENES: readonly SceneGroup[] = ['];
  for (const g of stat.asset) {
    L.push('  { id: ' + q(g.id) + ', icon: ' + q(g.icon) + ', label: ' + q(g.label) + ', subgroups: [');
    for (const sub of g.subgroups) {
      L.push('    { id: ' + q(sub.id) + ', label: ' + q(sub.label) + ', scenes: [');
      for (const s of sub.scenes) {
        const keys = ['id: ' + q(s.id), 'title: ' + q(s.title), 'wake_word: ' + q(s.wake_word),
          'types: [' + s.types.map(q).join(', ') + ']', 'status: ' + q(s.status),
          'prompt_template: ' + q(s.prompt_template)];
        if (s.editable_fields) {
          keys.push('editable_fields: [' + s.editable_fields.map((f) =>
            '{ name: ' + q(f.name) + ', label: ' + q(f.label) + ', value: ' + q(f.value) +
            (f.hint ? ', hint: ' + q(f.hint) : '') + ' }').join(', ') + ']');
        }
        L.push('      { ' + keys.join(', ') + ' },');
      }
      L.push('    ] },');
    }
    L.push('  ] },');
  }
  L.push('];', '',
    '/** 全量 `SceneData`（`base-paint` 的 `spec/help.ts` 契约形状；`subtitle`／`contact` 归装配层 #214）。 */',
    'export function buildChefSceneData(): SceneData {',
    '  return {',
    '    skill_name: ' + q(SKILL_NAME) + ',',
    '    title: ' + q(HELP_TITLE) + ',',
    '    version: ' + q(HELP_VERSION) + ',',
    '    groups: CHEF_SCENES,',
    '  };',
    '}');
  const text = L.join('\n') + '\n';
  eq('卡行数（scenes 总行）', text.split('\n').filter((l) => l.startsWith('      { ')).length, scenes.length);
  return text;
}

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const SRC = resolve(argOf('--src', DEFAULT_SRC));
const check = argv.includes('--check');
if (!existsSync(SRC)) throw new Error('事实源不在盘上：' + SRC);
const rawSrc = readFileSync(SRC, 'utf8');
eq('载荷文件字节', Buffer.byteLength(rawSrc, 'utf8'), EXPECT.bytes);
const payload = JSON.parse(rawSrc);
const stat = build(payload, readWakeTable());
crossCheckDraft(stat.asset, readDraft());

const digests = {
  source: sha256(rawSrc),
  legacy: sha256(canonicalLegacy(payload.scenarios)),
  asset: sha256(canonicalAsset(stat.scenes)),
};
const text = render(stat, digests);
const locks = [['载荷文件 sha256', digests.source, SOURCE_SHA256],
  ['老 48 条 sha256', digests.legacy, LEGACY_DIGEST], ['映射后 48 条 sha256', digests.asset, ASSET_DIGEST]];
if (locks.some((l) => l[2].startsWith('FILL_'))) {
  throw new Error('摘要锁未回填（fail-closed）：\n  ' + locks.map(([n, got]) => n + ' = ' + got).join('\n  '));
}
for (const [name, got, want] of locks) {
  if (got !== want) throw new Error('摘要锁对不上：' + name + ' 实测 ' + got + ' ≠ 锁定 ' + want);
}

console.log('事实源：' + SRC + '（' + Buffer.byteLength(rawSrc, 'utf8') + ' 字节，sha256=' + digests.source.slice(0, 16) + '…）');
console.log('三层：域 ' + stat.asset.length + '／组 ' + stat.subs.length + '／卡 ' + stat.scenes.length
  + '；带字段卡 ' + stat.scenes.filter((s) => s.editable_fields).length + '／字段 ' + stat.fields.length
  + ' 条（键 ' + new Set(stat.fields.map((f) => f.name)).size + '；丢畸形键 ' + stat.dropped.length + ' 条）');
console.log('状态：待开发 ' + stat.scenes.filter((s) => s.status === '【待开发】').length + '／可用 '
  + stat.scenes.filter((s) => s.status === '').length);
console.log('对账①资产有表中无 ' + stat.assetOnly.length + ' 个老组名（→ 待开发卡）：' + stat.assetOnly.join('／'));
console.log('对账②表中有资产无 ' + stat.tableOnly.length + ' 条（豁免 HELP 自身触发词 '
  + stat.tableOnly.filter((p) => stat.helpPhrases.includes(p)).length + ' ＋ t2 §5.1 的 13 条新表多出词 '
  + stat.tableOnly.filter((p) => !stat.helpPhrases.includes(p)).length + '）：' + stat.tableOnly.join('／'));
console.log('摘要锁：老 48 条 ' + digests.legacy + '；映射后 48 条 ' + digests.asset);
if (check) {
  const now = existsSync(SCENE_DATA) ? readFileSync(SCENE_DATA, 'utf8') : '';
  if (now !== text) {
    console.error('DRIFT：' + SCENE_DATA + ' 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）');
    process.exit(1);
  }
  console.log('OK：sceneData.ts 与生成结果字节一致（' + lf(text) + ' LF；--check 不落盘）');
} else {
  writeFileSync(SCENE_DATA, text, 'utf8');
  console.log('已写入 ' + SCENE_DATA + '（' + lf(text) + ' LF）');
}
