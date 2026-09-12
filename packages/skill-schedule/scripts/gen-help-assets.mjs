#!/usr/bin/env node
/** #201 · 内容资产生成器：旧作息管家 HELP 场景数据 → `src/help/scenes/help-assets.ts`（typed const，禁手改词）。
 *
 * 为什么要一个生成器：旧 HELP 有 85 条场景、每条 prompt 都要逐字照搬，手抄必漂移。生成器只做
 * 「读事实源 → 逐字序列化 → 落盘」，跑两次字节一致；它是一次性入口，不挂在任何 build／test 脚本上
 * （测试只 `import` 它的常量做独立复核，故被 import 时不执行生成；守卫照
 * `packages/base-combos/scripts/build-help.mjs:98-102` 的路数——`packages/skill-bill/scripts/gen-wake-assets.mjs`
 * 与本包 `scripts/build-help.mjs` 那两份都没有这层守卫（被 import 即执行），别照抄。）
 *
 * 用法：
 *   node packages/skill-schedule/scripts/gen-help-assets.mjs                 # 落盘
 *   node packages/skill-schedule/scripts/gen-help-assets.mjs --check         # 只比对，不一致 exit 1
 *   node packages/skill-schedule/scripts/gen-help-assets.mjs --src <源.json> --out <目标.ts>
 *
 * 事实源在 `.scratch/`（工作副本，不入库），故 `--check` 只在源在盘的机器上可跑；源不在盘即大声失败，
 * 不许拿空内容当「一致」。
 *
 * 三处「非纯搬运」都写在本文件里、可复核（生成文件头注释同步声明）：
 *   ① 源 `dimensions`（参数名 → 说明）→ 契约 `editable_fields`（形状转换，见 `toField`）；
 *   ② 源 `status` 为空但唤醒词属「今天没有命令可执行」的那几条者，标 `【待开发】`（见 `NO_COMMAND_WAKE_WORDS`）；
 *   ③ 契约没有对应位、故不进载荷的两处源信息（场景 `result`／分组 `desc`）留在伴随表（见 `renderFile`）；
 *      它们今天没有任何渲染出口，是留给渲染票 #202 的未决项，文件头注释里按「未决的下游风险」写明。
 * 另：票面点名的逐场景「类型」字段不落（源场景字段闭集里没有类型位，契约里那个位叫 `types` 复数），
 *    文件头注释里有声明，免得后来者以为漏了。
 * 本文件被 import 时不执行生成（测试引用 `NO_COMMAND_WAKE_WORDS` 做独立复核）。
 * 断言：源形状（分层计数、场景字段闭集、id 唯一、唤醒词自洽）与产物字段闭集，任一处不符即 fail-closed。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const REPO_DIR = join(PKG_DIR, '..', '..');
const DEFAULT_SRC = join(REPO_DIR, '.scratch', 't198', 'old-scenarios.json');
const DEFAULT_OUT = join(PKG_DIR, 'src', 'help', 'scenes', 'help-assets.ts');

/** 源场景字段闭集（多一个键就说明有信息会静默丢掉，故 fail-closed）。 */
const SOURCE_SCENE_KEYS = ['wake_word', 'scenario_id', 'scenario_title', 'dimensions', 'prompt', 'status', 'result'];
/** 源一级分组字段闭集（`key`／`name`／`icon`／`desc` 四个都要在产物里有着落）。 */
const SOURCE_CATEGORY_KEYS = ['key', 'name', 'icon', 'desc', 'wake_words', 'pending_count'];
/** 源唤醒词字段闭集。 */
const SOURCE_WAKE_WORD_KEYS = ['wake_word', 'pending_count', 'scenarios'];

/** 产物字段闭集＝`packages/base-render/src/spec/help.ts` 的 `SCENE_DATA_SCHEMA`（各层 `additionalProperties:false`）。 */
const CONTRACT_GROUP_KEYS = ['id', 'icon', 'label', 'subgroups'];
const CONTRACT_SUBGROUP_KEYS = ['id', 'label', 'scenes'];
const CONTRACT_SCENE_KEYS = ['id', 'title', 'wake_word', 'status', 'prompt_template', 'editable_fields'];
const CONTRACT_FIELD_KEYS = ['name', 'label', 'value', 'hint', 'required'];

/** `status` 只许两值（契约 `SCENE_STATUS`）。 */
const PENDING = '【待开发】';

/** 今天没有命令可执行的唤醒词（`docs/skills/skill-schedule/t198-old-help-truth.md` §三 实测缺口：
 *  `#1 准备消息`／`#2 同步作息`／`#3 增量同步`／`周视图`／`首次使用`）。这几条下辖的场景一律标【待开发】。
 *  这是一份内容判断清单（不是计数），生成时逐条核对在源里存在，缺一条即 fail-closed。
 *  导出给测试引用（`test/help-assets.test.mjs`）；测试另有对源数据的独立存在性断言，故改词两处会同时暴露。 */
export const NO_COMMAND_WAKE_WORDS = ['#1 准备消息', '#2 同步作息', '#3 增量同步', '周视图', '首次使用'];

/* ── 一 · 读事实源 ───────────────────────────────────────────── */

function readSource(src) {
  if (!existsSync(src)) throw new Error('事实源不在盘上：' + src);
  const bytes = readFileSync(src);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error('事实源带 UTF-8 BOM：' + src);
  const text = bytes.toString('utf8');
  if (text.includes('\uFFFD')) throw new Error('事实源不是合法 UTF-8：' + src);
  return JSON.parse(text);
}

/* ── 二 · 形状断言（fail-closed） ─────────────────────────────── */

/** 断言一份映射的键集恰等于给定闭集（顺序不论）。 */
function assertKeySet(where, value, closedSet) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(where + ' 不是对象');
  }
  const keys = Object.keys(value).sort().join(',');
  const want = [...closedSet].sort().join(',');
  if (keys !== want) throw new Error(where + ' 字段集变了：实测 [' + keys + ']，期望 [' + want + ']');
}

function assertText(where, value) {
  if (typeof value !== 'string' || value === '') throw new Error(where + ' 不是非空字符串');
}

/** 源的自我一致性＋形状。任一处不符即抛出，绝不「能读就读」。 */
function assertSource(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('事实源根不是对象');
  }
  if (!Array.isArray(payload.categories) || payload.categories.length === 0) {
    throw new Error('事实源 categories 不是非空数组');
  }
  const wakeWords = payload.categories.flatMap((c) => c.wake_words);
  const scenes = wakeWords.flatMap((w) => w.scenarios);
  if (payload.category_count !== payload.categories.length) {
    throw new Error('category_count=' + payload.category_count + ' 与实测 ' + payload.categories.length + ' 不符');
  }
  if (payload.wakeword_count !== wakeWords.length) {
    throw new Error('wakeword_count=' + payload.wakeword_count + ' 与实测 ' + wakeWords.length + ' 不符');
  }
  if (payload.scenario_count !== scenes.length) {
    throw new Error('scenario_count=' + payload.scenario_count + ' 与实测 ' + scenes.length + ' 不符');
  }

  /** 源自带的计数是两层各自汇总（分组这一层是它下辖唤醒词的合计），故分开累加、各自核对。 */
  let pendingByGroup = 0;
  let pendingByWakeWord = 0;
  for (const c of payload.categories) {
    assertKeySet('源分组 ' + c.key, c, SOURCE_CATEGORY_KEYS);
    for (const k of ['key', 'name', 'icon', 'desc']) assertText('源分组 ' + c.key + '.' + k, c[k]);
    if (!Array.isArray(c.wake_words) || c.wake_words.length === 0) {
      throw new Error('源分组 ' + c.key + ' 的 wake_words 不是非空数组');
    }
    pendingByGroup += c.pending_count;
    for (const w of c.wake_words) {
      assertKeySet('源唤醒词 ' + w.wake_word, w, SOURCE_WAKE_WORD_KEYS);
      assertText('源唤醒词名', w.wake_word);
      pendingByWakeWord += w.pending_count;
      if (!Array.isArray(w.scenarios) || w.scenarios.length === 0) {
        throw new Error('源唤醒词 ' + w.wake_word + ' 下没有场景（契约 scenes[] 非空）');
      }
      for (const s of w.scenarios) {
        assertKeySet('源场景 ' + s.scenario_id, s, SOURCE_SCENE_KEYS);
        for (const k of ['scenario_id', 'scenario_title', 'wake_word', 'prompt', 'result']) {
          assertText('源场景 ' + s.scenario_id + '.' + k, s[k]);
        }
        if (typeof s.status !== 'string') throw new Error('源场景 ' + s.scenario_id + '.status 不是字符串');
        if (s.status !== '' && s.status !== PENDING) {
          throw new Error('源场景 ' + s.scenario_id + ' 的 status 越出两值：' + s.status);
        }
        if (s.wake_word !== w.wake_word) {
          throw new Error('源场景 ' + s.scenario_id + ' 的 wake_word 与所属唤醒词不一致');
        }
        if (s.dimensions === null || typeof s.dimensions !== 'object' || Array.isArray(s.dimensions)) {
          throw new Error('源场景 ' + s.scenario_id + '.dimensions 不是对象');
        }
      }
    }
  }

  const ids = scenes.map((s) => s.scenario_id);
  if (new Set(ids).size !== ids.length) throw new Error('源场景 id 有重复');
  const selfMarked = scenes.filter((s) => s.status === PENDING).length;
  const levels = { 顶层: payload.pending_count, 分组层: pendingByGroup, 唤醒词层: pendingByWakeWord, 逐条数: selfMarked };
  for (const [level, value] of Object.entries(levels)) {
    if (value !== selfMarked) {
      throw new Error('待开发条数与「' + level + '」对不上：实测 ' + JSON.stringify(levels));
    }
  }
  const words = new Set(wakeWords.map((w) => w.wake_word));
  for (const word of NO_COMMAND_WAKE_WORDS) {
    if (!words.has(word)) throw new Error('没有命令可执行的唤醒词清单里的「' + word + '」不在源里');
  }
  return {
    groups: payload.categories.length,
    subgroups: wakeWords.length,
    scenes: scenes.length,
    selfMarked,
  };
}

/* ── 三 · 形状转换 ───────────────────────────────────────────── */

/** 维度值 → 文本：字符串原样；布尔与数字按其 JSON 字面量文本（`true`／`0`／`7`），免得丢字。 */
function dimensionText(raw) {
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

/** 源（参数名 → 说明）→ 契约 `editable_fields` 的一条。
 *  - `name`／`label`＝维度键原名（源里没有更友好的显示名）；
 *  - `hint`＝维度说明原文（逐字，一个字不摘）；
 *  - `value`＝空串：源里没有独立的「推荐值」字段，那串说明可能是取值区间（`1-1440`）或提示语
 *    （`JSON 文件路径`），填进 `value` 会变成用户可能误提交的默认值；
 *  - `required`＝false：源里没有针对该维度自身的必填标记（唯一出现「必填」二字的是
 *    `record_add_missing_field` 的 `missing → 任一必填`，说的是「哪个必填字段缺失」＝取值说明）。 */
function toField(name, raw) {
  return { name, label: name, value: '', hint: dimensionText(raw), required: false };
}

/** 源场景 → 契约场景。`status` 派生：源自标待开发照旧；属无命令唤醒词者补标。 */
function toScene(s) {
  const status = s.status !== '' ? s.status : NO_COMMAND_WAKE_WORDS.includes(s.wake_word) ? PENDING : '';
  return {
    id: s.scenario_id,
    title: s.scenario_title,
    wake_word: s.wake_word,
    status,
    prompt_template: s.prompt,
    editable_fields: Object.entries(s.dimensions).map(([name, raw]) => toField(name, raw)),
  };
}

/** 源三层（分组 → 唤醒词 → 场景）→ 契约三层（groups → subgroups → scenes）。
 *  子功能取**唤醒词**那一层：旧技能 HELP 页上用户看到的就是「分组 Tab → 唤醒词折叠组 → 场景卡」，
 *  与源数据的层级一一对应，既不合并也不新造分组。
 *  二级组 id 由一级组 id 加序号派生（源里没有二级组 id；序号即源里的先后次序）。 */
function toGroups(payload) {
  return payload.categories.map((c) => ({
    id: c.key,
    icon: c.icon,
    label: c.name,
    subgroups: c.wake_words.map((w, i) => ({
      id: c.key + '_' + (i + 1),
      label: w.wake_word,
      scenes: w.scenarios.map(toScene),
    })),
  }));
}

/** 产物字段闭集断言：多一个键即被共享 help 模板的校验器拒收（`additionalProperties:false`）。 */
function assertContractShapes(groups) {
  for (const g of groups) {
    assertKeySet('产物分组 ' + g.id, g, CONTRACT_GROUP_KEYS);
    for (const sub of g.subgroups) {
      assertKeySet('产物二级组 ' + sub.id, sub, CONTRACT_SUBGROUP_KEYS);
      if (sub.scenes.length === 0) throw new Error('产物二级组 ' + sub.id + ' 没有场景');
      for (const s of sub.scenes) {
        assertKeySet('产物场景 ' + s.id, s, CONTRACT_SCENE_KEYS);
        if (s.status !== '' && s.status !== PENDING) throw new Error('产物场景 ' + s.id + ' 的 status 越出两值');
        if (s.prompt_template === '') throw new Error('产物场景 ' + s.id + ' 的 prompt_template 为空');
        for (const f of s.editable_fields) assertKeySet('产物字段 ' + s.id + '.' + f.name, f, CONTRACT_FIELD_KEYS);
      }
    }
  }
}

/* ── 四 · 生成文件全文（LF、无 BOM；跑两次字节一致） ─────────── */

/** 逐条对账用的规范形（测试另有独立一份实现，互为复核）。 */
function canonicalScenes(scenes) {
  return JSON.stringify(scenes.map((s) => [
    s.id, s.title, s.wake_word, s.status, s.prompt_template,
    s.editable_fields.map((f) => [f.name, f.label, f.value, f.hint, f.required]),
  ]));
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 把 JSON 里的 `[`／`]` 那两行去掉，剩下的当缩进体（与 bill 的生成器同法）。 */
function indentedLines(value) {
  return JSON.stringify(value, null, 2).split('\n').slice(1, -1).join('\n');
}

function renderFile(groups, source) {
  const scenes = groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const subgroups = groups.reduce((n, g) => n + g.subgroups.length, 0);
  /** 契约无位、只好留在伴随表里的两处源信息：场景 `result` 与一级分组 `desc`（照源里的先后次序）。 */
  const results = {};
  const notes = {};
  for (const c of source.categories) {
    notes[c.key] = c.desc;
    for (const w of c.wake_words) for (const s of w.scenarios) results[s.scenario_id] = s.result;
  }
  const pendingTotal = scenes.filter((s) => s.status !== '').length;

  const header = `/** #201 · 作息管家 HELP 内容资产（机器生成，禁手改词）。
 *
 * 唯一内容源：\`.scratch/t198/old-scenarios.json\`——旧作息管家 HELP 实物里原样取出的场景数据
 * （世代判定与内容骨架见 \`docs/skills/skill-schedule/t198-old-help-truth.md\`）。
 * 本文件由 \`scripts/gen-help-assets.mjs\` 生成：${groups.length} 个一级分组／${subgroups} 条唤醒词／${scenes.length} 条场景，
 * 分组、唤醒词、场景的先后次序与源数据一致。
 *
 * 载荷契约：\`packages/base-render/src/spec/help.ts\` 的 \`SCENE_DATA_SCHEMA\`——\`HELP_GROUPS\` 就是
 * 共享 help 模板要的 \`groups\` 参数，分三层：一级分组 → 子功能（＝旧唤醒词）→ 场景卡片。
 * 该 schema 各层都是 \`additionalProperties:false\`，多一个键即校验失败，故本文件里的对象字段是闭集。
 *
 * 三处形状转换（生成器里写死、可复核）：
 *  1. 源 \`dimensions\`（参数名 → 说明的自由对象）→ 契约 \`editable_fields\`：\`name\`／\`label\` 取维度键
 *     原名；\`hint\` 取维度说明原文（逐字；布尔与数字按其 JSON 字面量文本）；\`value\` 一律空串、
 *     \`required\` 一律 false——理由见生成器的 \`toField\`。
 *  2. 源 \`status\` 为空、但唤醒词属「今天没有命令可执行」的 ${NO_COMMAND_WAKE_WORDS.length} 条者，标 \`【待开发】\`：
 *     源自标待开发 ${source.pending_count} 条，加上这几条下辖的场景，本文件标 \`【待开发】\` 的共 ${pendingTotal} 条。
 *  3. 三层对齐：源「分组 → 唤醒词 → 场景」直接对到契约「groups → subgroups → scenes」，
 *     不合并、不新造分组（用户在 HELP 页里看到的分组与旧技能所见一致）。
 *
 * 票面点名的逐场景「类型」字段（\`type\`）在本文件里不存在——这是有据的偏离，不是漏了：契约里那个位
 * 叫 \`types\`（复数、无单数别名，\`packages/base-render/src/spec/help.ts\` 的 \`SCENE_TYPE_FIELD\`／
 * \`Scene.types\`），而源数据的场景字段是闭集（生成器 \`SOURCE_SCENE_KEYS\`＝${SOURCE_SCENE_KEYS.join('／')}）、
 * 里面没有类型位，旧实物 HELP 也没有类型徽章——凭空补一个空 \`types\` 等于自造内容，故不落该字段；
 * 将来源数据真出现类型位，生成器会因字段闭集断言失败而报错（不会静默丢掉）。要变体徽章另开票。
 *
 * 未决的下游风险（留给渲染票 #202 收口；下面是「未决」，不是「已落地」）：契约没有对应位、故不进
 * \`HELP_GROUPS\` 的两处源信息，今天只有本文件里的伴随表形态——全仓没有消费者，两个渲染出口与
 * \`#help-data\` 载荷里都取不到 \`result\`／\`desc\`：即旧 HELP 页面上用户看得见的「预期 ·」与一级
 * 分组说明，在新产物里今天是不显示的。源场景的 \`result\` → \`HELP_SCENE_RESULTS\`；
 * 源一级分组的 \`desc\` → \`HELP_GROUP_NOTES\`。#202 要么把它们折进契约既有可见位（例如
 * \`meta_blocks[].html\`，该位原样透传）渲染出来，要么由用户裁定不显示后把这两张表一并删除；
 * 在那之前不得当作已交付的可见内容。
 * 为什么不塞进载荷：校验器按 \`additionalProperties:false\` 直接拒收多余键
 * （\`packages/base-render/src/help.ts\` 的字段闭集判定）；并进 \`editable_fields[].hint\` 会让
 * 「可编辑参数」这个位变浑浊，且没有维度的场景（\`first_use\`）无处可放。
 *
 * 计数全部由数据算出（见 \`HELP_TOTALS\`），本文件不写第二个数；改资产即跟变。
 * 改词走生成器：\`node packages/skill-schedule/scripts/gen-help-assets.mjs\`（\`--check\` 只比对不落盘）。
 */

/** 参数化表单字段（契约 \`editable_fields\` 的一条）。 */
export interface HelpSceneField {
  /** 参数名（＝源 \`dimensions\` 的维度键原名）。 */
  readonly name: string;
  /** 显示标签（源里没有更友好的显示名，同 \`name\`）。 */
  readonly label: string;
  /** 推荐值（源里没有独立的推荐值字段，一律空串）。 */
  readonly value: string;
  /** 源维度说明原文（逐字）。 */
  readonly hint: string;
  /** 必填（源里没有针对该维度自身的必填标记，一律 false）。 */
  readonly required: boolean;
}

/** 两态状态（契约 \`SCENE_STATUS\`：空串＝可用，【待开发】＝禁用）。写成联合型，
 *  好让 \`HELP_GROUPS\` 直接就是共享 help 模板 \`SceneData['groups']\` 的形状，接线上不做二次转换。 */
export type HelpSceneStatus = '' | '【待开发】';

/** 场景卡片（契约 \`scenes[]\` 的一条）。 */
export interface HelpSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly status: HelpSceneStatus;
  /** 「复制指令」按钮按出来的正文，逐字照搬源 \`prompt\`。 */
  readonly prompt_template: string;
  readonly editable_fields: readonly HelpSceneField[];
}

/** 子功能折叠组（契约 \`subgroups[]\` 的一条；＝旧的一条唤醒词）。 */
export interface HelpSubgroupAsset {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly HelpSceneAsset[];
}

/** 一级分组（契约 \`groups[]\` 的一条）。 */
export interface HelpGroupAsset {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroups: readonly HelpSubgroupAsset[];
}

/** ${groups.length} 个一级分组／${subgroups} 条唤醒词／${scenes.length} 条场景（＝共享 help 模板要的 \`groups\` 参数）。 */
export const HELP_GROUPS: readonly HelpGroupAsset[] = [`;

  const footer = `];

/** 扁平 ${scenes.length} 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const HELP_ASSETS: readonly HelpSceneAsset[] = HELP_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** 源场景 \`result\` 原文（${scenes.length}/${scenes.length}，键＝场景 id）。契约里没有这个位，故不进 \`HELP_GROUPS\`；
 *  今天无消费者、不进任何渲染出口（见文件头「未决的下游风险」，归 #202）。 */
export const HELP_SCENE_RESULTS: Readonly<Record<string, string>> = ${JSON.stringify(results, null, 2)};

/** 源一级分组 \`desc\` 原文（${source.categories.length}/${source.categories.length}，键＝分组 id）。同上：契约里没有这个位，
 *  今天无消费者、不进任何渲染出口（见文件头「未决的下游风险」，归 #202）。 */
export const HELP_GROUP_NOTES: Readonly<Record<string, string>> = ${JSON.stringify(notes, null, 2)};

/** 计数（全部由数据算出；改资产即跟变，内容另由测试里的摘要锁钉住）。 */
export const HELP_TOTALS = Object.freeze({
  groups: HELP_GROUPS.length,
  subgroups: HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0),
  scenes: HELP_ASSETS.length,
  pending: HELP_ASSETS.filter((s) => s.status !== '').length,
});
`;

  return header + '\n' + indentedLines(groups) + '\n' + footer;
}

/* ── 五 · 命令行入口（只在被 node 直接执行时跑；被 import 时静默，测试要引用上面的常量） ── */

function runCli(argv) {
  const argOf = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const src = resolve(argOf('--src', DEFAULT_SRC));
  const out = resolve(argOf('--out', DEFAULT_OUT));
  const check = argv.includes('--check');

  const payload = readSource(src);
  const measured = assertSource(payload);
  const groups = toGroups(payload);
  assertContractShapes(groups);

  const text = renderFile(groups, payload);
  const scenes = groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const pendingText = scenes.filter((s) => s.status !== '').length;

  console.log('事实源：' + src);
  console.log('实测：' + measured.groups + ' 个一级分组／' + measured.subgroups + ' 条唤醒词／' + measured.scenes
    + ' 条场景；源自标【待开发】' + measured.selfMarked + ' 条；无命令唤醒词 ' + NO_COMMAND_WAKE_WORDS.length
    + ' 条 → 产物标待开发的共 ' + pendingText + ' 条');
  console.log('摘要：场景规范形 sha256=' + sha256(canonicalScenes(scenes)));
  console.log('摘要：'+ scenes.length + ' 条 prompt 逐一拼接 sha256=' + sha256(scenes.map((s) => s.prompt_template).join('\n')));
  console.log('摘要：产物文件 sha256=' + sha256(text) + '（' + Buffer.byteLength(text, 'utf8') + ' 字节）');

  if (check) {
    const now = existsSync(out) ? readFileSync(out).toString('utf8') : '';
    if (now !== text) {
      console.error('不一致：' + out + ' 与生成结果不同（禁止手改；重跑不带 --check 即覆盖）');
      process.exit(1);
    }
    console.log('一致：' + out + ' 与生成结果字节相同');
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text, 'utf8');
    console.log('已写入：' + out);
  }
}

/** 判断是否被直接执行（照 `packages/base-combos/scripts/build-help.mjs:98-102` 的路数；本包 `scripts/build-help.mjs` 与 `skill-bill` 的生成器都没有这层守卫，不是先例）。 */
const isMain = (() => {
  try { return process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false; }
  catch { return false; }
})();
if (isMain) runCli(process.argv.slice(2));
