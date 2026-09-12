/** #188 · 居家管家内容资产实体：仓内老骨架 yaml → 三层资产模型 → `src/help/helpAssets.ts` 文本。
 *
 * 三处「非纯搬运」都在本文件写死、可复核（生成件头注释同步声明）：
 *   ① `icon`／`label`／`id` 逐字取 yaml 的 `domains[].icon/name/key`（不另立图标表）；
 *   ② `types` 由 yaml 的单值 `type` 按 `+` 切开（顺序照原文、去重保留首次出现）；
 *   ③ `link` 域按登记位处理：组上标 `deprecated: true`、3 条场景 `prompt_template` 不迁（空串）。
 * 参数解析／`--check`／退出码在 `scripts/gen-help-assets.mjs`（薄 CLI）；YAML 子集读取在 `./yaml-subset.mjs`。
 *
 * **导出面只有 4 个**（铁律五：件对外只留必需面；期望值与夹具不再外放）：
 *   - `generate()`：CLI 落盘／`--check` 的唯一入口。
 *   - `PKG_DIR`／`SRC_YAML`／`OUT_TS`：路径常量，CLI 与资产锁（`test/help-assets.test.mjs`）都要用。
 * `EXPECT`／`TYPE_WORDS`／`GROUP_COMMAND_PREFIXES`／`buildGroups`／`sceneTypes`／`assertShape`／`renderAsset`
 * 都是**内部**生产件（形状断言、徽章词表、命令前缀对照），不再导出；它们的期望值由测试**自持**一份，
 * 并用「生成物里的字面量」与「模板原文」两侧交叉锁定（见 `test/help-assets.test.mjs`）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScenarioYaml } from './yaml-subset.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PKG_DIR = join(HERE, '..', '..');
/** 仓内唯一输入源（老骨架 yaml 的逐字副本）。 */
export const SRC_YAML = join(PKG_DIR, 'src', 'help', 'scenarios.yaml');
/** 仓内唯一产出件。 */
export const OUT_TS = join(PKG_DIR, 'src', 'help', 'helpAssets.ts');

/** 期望形状（老骨架 2026-08 版：9 域／30 二级组／73 场景，含联动 3 条登记位；不符即 fail-closed）。 */
const EXPECT = { domains: 9, subgroups: 30, scenes: 73, linkScenes: 3 };

/** 徽章词表：**逐字**取自共享 help 模板的实际配色表
 *  `packages/base-render/assets/help-template.html:1698-1709`（`var TYPE_DEFAULT = {...}` 的 10 个键）。 */
const TYPE_WORDS = ['采集', '查看', '结果', '向导', '批量', '校验', '选择', '过程', '回执', '录入'];

/** 分组 id ↔ 命令前缀（决策 2 细则：两套词的差异收在这一处）。
 *  取值口径＝`src/policy/wakewords.ts` 的 21 个 `HomeKey` 去掉末段后的命名空间；`home.help` 不入表（防自指）。 */
const GROUP_COMMAND_PREFIXES = [
  { group: 'items', prefixes: ['home.item', 'home.tag', 'home.inventory'] },
  { group: 'space', prefixes: ['home.location'] },
  { group: 'outfit', prefixes: ['home.outfit', 'home.trip'] },
  { group: 'stats', prefixes: ['home.stats'] },
  { group: 'express', prefixes: ['home.shopping'] },
  { group: 'receipt', prefixes: ['home.ticket'] },
  { group: 'family', prefixes: ['home.care'] },
  { group: 'setup', prefixes: ['home.care'] },
  { group: 'link', prefixes: [] },
];

/** 三层结构：域顺序照 yaml，二级组与场景照出现序；二级组 id ＝ `<域id>_<序数>`。 */
function buildGroups(doc) {
  if (!doc.version) throw new Error('事实源缺 version');
  for (const d of doc.domains) {
    for (const k of ['key', 'name', 'icon']) if (typeof d[k] !== 'string' || !d[k]) throw new Error('域记录缺字段 ' + k + '：' + JSON.stringify(d));
  }
  const groups = doc.domains.map((d) => ({ id: d.key, icon: d.icon, label: d.name, subgroups: [] }));
  const byKey = new Map(groups.map((g) => [g.id, g]));
  const byLabel = new Map(groups.map((g) => [g.id, new Map()]));
  const lastLabel = new Map();
  const NEED = ['domain', 'sub', 'wake_word', 'scenario_id', 'scenario_title', 'type', 'status', 'prompt'];
  for (const s of doc.scenes) {
    for (const k of NEED) if (typeof s[k] !== 'string') throw new Error('场景记录缺字段 ' + k + '：' + JSON.stringify(s.scenario_id));
    const g = byKey.get(s.domain);
    if (!g) throw new Error('场景 ' + s.scenario_id + ' 的域 ' + s.domain + ' 不在 domains 里');
    const labels = byLabel.get(g.id);
    let sub = labels.get(s.sub);
    if (!sub) {
      sub = { id: g.id + '_' + (g.subgroups.length + 1), label: s.sub, scenes: [] };
      labels.set(s.sub, sub);
      g.subgroups.push(sub);
    } else if (lastLabel.get(g.id) !== s.sub) {
      throw new Error('域 ' + g.id + ' 的二级组 ' + s.sub + ' 出现两次且不相邻（老成组规则只认相邻）');
    }
    lastLabel.set(g.id, s.sub);
    sub.scenes.push({
      id: s.scenario_id,
      title: s.scenario_title,
      wake_word: s.wake_word,
      status: s.status,
      // 登记位：联动 3 条 prompt 不迁（HELP 不列、不建目录），故留空串。
      prompt_template: g.id === 'link' ? '' : s.prompt,
      types: sceneTypes(s.type),
    });
  }
  for (const g of groups) if (g.id === 'link') g.deprecated = true;
  return groups;
}

/** `采集+回执` → `['采集', '回执']`（顺序照原文、去重保留首次出现）。 */
function sceneTypes(raw) {
  return [...new Set(String(raw).split('+').map((x) => x.trim()).filter(Boolean))];
}

/** 形状断言（fail-closed）：数量、三层 id 唯一、types 非空且在模板词表内、status 全场同值。 */
function assertShape(groups) {
  const bad = (msg) => { throw new Error('资产形状不符：' + msg); };
  if (groups.length !== EXPECT.domains) bad('域数 ' + groups.length + ' ≠ ' + EXPECT.domains);
  const subs = groups.flatMap((g) => g.subgroups);
  if (subs.length !== EXPECT.subgroups) bad('二级组数 ' + subs.length + ' ≠ ' + EXPECT.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  if (scenes.length !== EXPECT.scenes) bad('场景数 ' + scenes.length + ' ≠ ' + EXPECT.scenes);
  const ids = (rows) => rows.map((r) => r.id);
  for (const [what, rows] of [['域', groups], ['二级组', subs], ['场景', scenes]]) {
    const xs = ids(rows);
    if (new Set(xs).size !== xs.length) bad(what + ' id 有重复');
  }
  const words = new Set(TYPE_WORDS);
  for (const s of scenes) {
    for (const k of ['title', 'wake_word', 'status']) {
      if (typeof s[k] !== 'string') bad(s.id + ' 缺字段 ' + k);
    }
    if (typeof s.prompt_template !== 'string') bad(s.id + ' 缺字段 prompt_template');
    if (!Array.isArray(s.types) || s.types.length === 0) bad(s.id + ' types 为空');
    for (const t of s.types) if (!words.has(t)) bad(s.id + ' 出现模板词表外的 types：' + t);
  }
  const st = new Set(scenes.map((s) => s.status));
  if (st.size !== 1) bad('status 不是全场同值：' + [...st].join('/'));
  const dep = groups.filter((g) => g.deprecated);
  if (dep.length !== 1 || dep[0].id !== 'link') bad('登记位不是「只有 link 一个域」');
  const depScenes = scenes.filter((s) => s.prompt_template === '');
  if (depScenes.length !== EXPECT.linkScenes) bad('登记位场景数 ' + depScenes.length + ' ≠ ' + EXPECT.linkScenes);
  if (dep[0].subgroups.flatMap((s) => s.scenes).some((s) => s.prompt_template !== '')) bad('link 域有场景没按登记位留空 prompt');
  if (scenes.filter((s) => s.prompt_template !== '').length !== EXPECT.scenes - EXPECT.linkScenes) {
    bad('在位场景数 ≠ ' + (EXPECT.scenes - EXPECT.linkScenes));
  }
  for (const c of GROUP_COMMAND_PREFIXES) if (!groups.some((g) => g.id === c.group)) bad('命令前缀对照里有不存在的组：' + c.group);
  return { domains: groups.length, subgroups: subs.length, scenes: scenes.length, deprecatedScenes: depScenes.length };
}

/** 渲染整套资产 .ts（LF、无 BOM、换行真实）。 */
function renderAsset(groups, yamlText) {
  const yamlBytes = Buffer.byteLength(yamlText, 'utf8');
  const yamlSha = createHash('sha256').update(yamlText, 'utf8').digest('hex');
  const json = (v) => JSON.stringify(v, null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  const L = [];
  L.push('// 本文件由 packages/skill-home/scripts/gen-help-assets.mjs 生成 —— 禁止手工修改。');
  L.push('// 改动一律走生成器（手改会被 --check 判漂移、被 test/help-assets.test.mjs 的摘要锁打红）。');
  L.push('//');
  L.push('// 事实源（仓内唯一）：src/help/scenarios.yaml · ' + yamlBytes + ' 字节 · sha256 ' + yamlSha);
  L.push('// 重算摘要：node -e "const f=require(\'fs\'),c=require(\'crypto\');console.log(c.createHash(\'sha256\').update(f.readFileSync(\'packages/skill-home/src/help/helpAssets.ts\')).digest(\'hex\'))"');
  L.push('// icon／label／id：逐字取事实源 domains[].icon/name/key（老骨架自带 9 个域图标，不另立图标表）。');
  L.push('// types 词表：共享 help 模板的配色表 packages/base-render/assets/help-template.html:1698-1709（TYPE_DEFAULT 10 词）。');
  L.push('// link 域＝登记位（deprecated: true）：prompt 不迁、HELP 不列、不建目录；渲染侧按 HELP_GROUPS 过滤。');
  L.push('');
  L.push('/** 场景徽章词：共享 help 模板 TYPE_DEFAULT 认得这 10 个（模板实测，非老 yaml 自带）。 */');
  L.push('export type HelpSceneType =');
  L.push(TYPE_WORDS.map((w) => "  | '" + w + "'").join('\n') + ';');
  L.push('');
  L.push('/** 场景：id 取老骨架 scenario_id；types 由老骨架 type 按 `+` 切开（顺序照原文、去重保留首次出现）。 */');
  L.push('export interface HelpSceneAsset {');
  L.push('  id: string;');
  L.push('  title: string;');
  L.push('  wake_word: string;');
  L.push('  status: string;');
  L.push('  prompt_template: string;');
  L.push('  types: readonly HelpSceneType[];');
  L.push('}');
  L.push('');
  L.push('/** 二级组：id ＝ `<域id>_<序数>`，label 取老骨架 sub。 */');
  L.push('export interface HelpSubgroupAsset { id: string; label: string; scenes: readonly HelpSceneAsset[]; }');
  L.push('');
  L.push('/** 一级分组：id ＝ 老骨架 9 个域 key；`deprecated` 为 true 者＝登记位（不列、不建目录）。 */');
  L.push('export interface HelpGroupAsset {');
  L.push('  id: string;');
  L.push('  icon: string;');
  L.push('  label: string;');
  L.push('  deprecated?: true;');
  L.push('  subgroups: readonly HelpSubgroupAsset[];');
  L.push('}');
  L.push('');
  L.push('/** 分组 id ↔ 命令前缀：老骨架分组词与新命令命名空间的差异只在这一处。 */');
  L.push('export interface HelpGroupCommands { group: string; prefixes: readonly string[]; }');
  L.push('');
  L.push('export const HELP_GROUPS: readonly HelpGroupAsset[] = ' + json(groups) + ';');
  L.push('');
  L.push('/** 全部场景（含登记位 3 条：渲染侧按组过滤，见 HELP_GROUPS）。 */');
  L.push('export const HELP_ASSETS: readonly HelpSceneAsset[] = HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));');
  L.push('');
  L.push('/** 场景 id → 场景（模板把 id 当字典键，重名即后写覆盖前者）。 */');
  L.push('export const HELP_SCENE_BY_ID: Readonly<Record<string, HelpSceneAsset>> = Object.fromEntries(HELP_ASSETS.map((s) => [s.id, s]));');
  L.push('');
  L.push('export const HELP_ASSET_TOTAL: number = HELP_ASSETS.length;');
  L.push('');
  L.push('export const HELP_GROUP_COMMAND_PREFIXES: readonly HelpGroupCommands[] = ' + json(GROUP_COMMAND_PREFIXES) + ';');
  return L.join('\n') + '\n';
}

/** 读仓内事实源 → 资产文本（唯一入口：先断言形状，再渲染）。 */
export function generate() {
  if (!SRC_YAML.startsWith(PKG_DIR)) throw new Error('输入源不在包内：' + SRC_YAML);
  if (!existsSync(SRC_YAML)) throw new Error('仓内事实源不在盘上：' + SRC_YAML);
  const yamlText = readFileSync(SRC_YAML, 'utf8');
  const doc = parseScenarioYaml(yamlText);
  const groups = buildGroups(doc);
  const stat = assertShape(groups);
  return { text: renderAsset(groups, yamlText), yamlText, doc, groups, stat };
}
