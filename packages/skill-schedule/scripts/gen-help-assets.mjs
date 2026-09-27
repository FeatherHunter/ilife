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
 * 事实源：**优先受跟踪 fixture** `test/fixtures/t198-old-scenarios.json`（#312 起的入库正本，
 * 与 `.scratch` 工作副本逐字节相同），退化到工作副本；两份都不在盘即大声失败，不许拿空内容当「一致」。
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
import { REWRITE } from './help-rewrite-table.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const REPO_DIR = join(PKG_DIR, '..', '..');
/** 事实源：**优先受跟踪 fixture**（入库正本，CI 上必在），退化到 `.scratch` 工作副本。
 *  #312：原先只认不入库的工作副本 ⇒ 新鲜 clone／CI 上「源不在盘」时生成器不产出一致行，
 *  依赖它的用例只能整条跳过（报告绿、覆盖少一块）。两份内容逐字节相同。 */
const SRC_FIXTURE = join(PKG_DIR, 'test', 'fixtures', 't198-old-scenarios.json');
const SRC_WORKCOPY = join(REPO_DIR, '.scratch', 't198', 'old-scenarios.json');
const DEFAULT_SRC = existsSync(SRC_FIXTURE) ? SRC_FIXTURE : SRC_WORKCOPY;
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
/** 字段：四个必有的 ＋ 一组可选附属（#975 起字段带 kind 与控件附属；多一个键即被模板校验器拒收）。 */
const CONTRACT_FIELD_REQUIRED = ['name', 'label', 'value', 'kind'];
const CONTRACT_FIELD_OPTIONAL = ['hint', 'required', 'options', 'min', 'max', 'step', 'placeholder'];
/** kind 闭集（＝`SceneFieldKind`；缺省 `text`，但本表一律显式给，好在产物上一眼数得清）。 */
const FIELD_KINDS = ['text', 'number', 'select', 'date', 'week', 'month', 'year', 'time'];
/** 字段名：ASCII snake_case（复制载荷按它做 `key:value` 行，故不许中文与空格）。 */
const FIELD_NAME_RE = /^[a-z][a-z0-9_]*$/;

/** `status` 只许两值（契约 `SCENE_STATUS`）。 */
const PENDING = '【待开发】';

/** 今天没有命令可执行的唤醒词（`docs/skills/skill-schedule/t198-old-help-truth.md` §三 实测缺口：
 *  `准备消息`／`同步作息`／`增量同步`／`周视图`／`首次使用`）。这几条下辖的场景一律标【待开发】。
 *  写法＝**裸词**（与路由表 `phrase` 同形，也无 `#1`／`T4` 这类序号——#975 去掉序号后两边同名）。
 *  这是一份内容判断清单（不是计数），生成时逐条核对在源里存在，缺一条即 fail-closed。
 *  导出给测试引用（`test/help-assets.test.mjs`）；测试另有对源数据的独立存在性断言，故改词两处会同时暴露。 */
export const NO_COMMAND_WAKE_WORDS = ['准备消息', '同步作息', '增量同步', '周视图', '首次使用'];

/** 老 HELP 唤醒词带序号前缀（`#0 记作息`／`T4 类别深挖`）：路由表用的是**裸词**，故产物也去前缀。
 *  这条只作用于「老文本 → 裸词」的归一；新文本一律由重写表给（生成器断言两者逐字相同）。 */
export function bareWake(word) {
  return String(word).replace(/^(?:#\d+|T\d+)\s*/, '');
}

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
  const words = new Set(wakeWords.map((w) => bareWake(w.wake_word)));
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

/* ── 三 · 内容装配（结构取自源、内容取自重写表） ───────────────── */

/** 维度值 → 文本：字符串原样；布尔与数字按其 JSON 字面量文本（`true`／`0`／`7`），免得丢字。
 *  **只在信息不丢失台账里用**（比对老维度名），不再进产物。 */
function dimensionText(raw) {
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

/** 重写表的字段 → 契约字段：补 `value`（一律空串，表里不重复写 142 遍），键序固定，
 *  附属按存在与否带上（`undefined` 的键不落，免得被 `additionalProperties:false` 当多余键）。 */
function toContractField(f) {
  const out = { name: f.name, label: f.label, value: '', kind: f.kind, required: f.required === true };
  if (f.hint !== undefined) out.hint = f.hint;
  if (f.options !== undefined) out.options = [...f.options];
  if (f.min !== undefined) out.min = f.min;
  if (f.max !== undefined) out.max = f.max;
  if (f.step !== undefined) out.step = f.step;
  if (f.placeholder !== undefined) out.placeholder = f.placeholder;
  return out;
}

/** 源场景 → 契约场景：结构位（id／status）取自源，内容位（标题／唤醒词／prompt／字段）取自重写表。
 *
 *  **信息不丢失台账（硬门）**：老 `dimensions` 里的每一个名，要么出现在新字段里，要么在重写表的
 *  `drops` 里具名声明丢弃；没声明就红。老维度表本身不全（多数场景缺 date／time_start 这类必填位），
 *  故只查「不丢」一个方向，新增字段不拦——新增由各条注释说明理由。 */
function toScene(s) {
  const bare = bareWake(s.wake_word);
  const status = s.status !== '' ? s.status : NO_COMMAND_WAKE_WORDS.includes(bare) ? PENDING : '';
  const r = REWRITE.get(s.scenario_id);
  if (!r) throw new Error('重写表缺场景：' + s.scenario_id + '（fixture 里有而表里没写＝漏改）');
  if (r.wake_word !== bare) {
    throw new Error('重写表的唤醒词与源不一致：' + s.scenario_id + ' 表里「' + r.wake_word + '」源里「' + bare + '」');
  }
  const names = r.editable_fields.map((f) => f.name);
  const drops = r.drops || [];
  for (const gone of Object.keys(s.dimensions)) {
    if (!names.includes(gone) && !drops.includes(gone)) {
      throw new Error('信息丢失未声明：' + s.scenario_id + ' 的老维度「' + gone + '」（老说明：'
        + dimensionText(s.dimensions[gone]) + '）既不在新字段里，也没写进 drops（要丢就具名声明，别静默丢）');
    }
  }
  for (const gone of drops) {
    if (names.includes(gone)) throw new Error('drops 与字段重复：' + s.scenario_id + ' 的「' + gone + '」');
  }
  return {
    id: s.scenario_id,
    title: r.title,
    wake_word: r.wake_word,
    status,
    prompt_template: r.prompt_template,
    editable_fields: r.editable_fields.map(toContractField),
  };
}

/** 源三层（分组 → 唤醒词 → 场景）→ 契约三层（groups → subgroups → scenes）。
 *  子功能取**唤醒词**那一层：旧技能 HELP 页上用户看到的就是「分组 Tab → 唤醒词折叠组 → 场景卡」，
 *  与源数据的层级一一对应，既不合并也不新造分组。
 *  二级组 id 由一级组 id 加序号派生（源里没有二级组 id；序号即源里的先后次序）；
 *  组标签＝该组下辖场景的重写唤醒词（同组各场景必须一致，不一致即红）。 */
function toGroups(payload) {
  return payload.categories.map((c) => ({
    id: c.key,
    icon: c.icon,
    label: c.name,
    subgroups: c.wake_words.map((w, i) => {
      const scenes = w.scenarios.map(toScene);
      const label = scenes[0] ? scenes[0].wake_word : bareWake(w.wake_word);
      for (const s of scenes) {
        if (s.wake_word !== label) {
          throw new Error('同一唤醒词组内重写结果不一致：' + s.id + ' 的是「' + s.wake_word + '」');
        }
      }
      return { id: c.key + '_' + (i + 1), label, scenes };
    }),
  }));
}

/** 一条字段的形状门：必有键都在、不许出现闭集外的键、kind 在闭集内、附属只给该 kind 用得上的、
 *  `select` 必须给非空 `options`、`value` 一律空串。任一处不符即抛——产物要被共享模板按
 *  `additionalProperties:false` 校验，与其等它拒收，不如在这里点名。 */
function assertFieldShape(scene, f) {
  const where = '产物字段 ' + scene.id + '.' + f.name;
  const keys = Object.keys(f);
  for (const k of CONTRACT_FIELD_REQUIRED) {
    if (!keys.includes(k)) throw new Error(where + ' 缺必有键：' + k);
  }
  for (const k of keys) {
    if (!CONTRACT_FIELD_REQUIRED.includes(k) && !CONTRACT_FIELD_OPTIONAL.includes(k)) {
      throw new Error(where + ' 出现闭集外的键：' + k);
    }
  }
  if (!FIELD_NAME_RE.test(f.name)) throw new Error(where + ' 的名字不合 snake_case：' + f.name);
  if (f.value !== '') throw new Error(where + ' 的 value 必须空串（无预置值；相对默认词进 hint）');
  if (!FIELD_KINDS.includes(f.kind)) throw new Error(where + ' 的 kind 越出闭集：' + f.kind);
  if (typeof f.label !== 'string' || f.label === '') throw new Error(where + ' 的 label 为空');
  if (f.required !== true && f.required !== false) throw new Error(where + ' 的 required 不是布尔');
  const textKeys = ['hint', 'placeholder'];
  for (const k of textKeys) {
    if (f[k] !== undefined && (typeof f[k] !== 'string' || f[k] === '')) {
      throw new Error(where + ' 的 ' + k + ' 给了空串（要么别给，要么写清）');
    }
  }
  if (f.kind === 'select') {
    if (!Array.isArray(f.options) || f.options.length === 0) throw new Error(where + ' 是 select 却没给非空 options');
  } else if (f.options !== undefined) {
    throw new Error(where + ' 不是 select 却给了 options');
  }
  for (const k of ['min', 'max', 'step']) {
    if (f[k] !== undefined && f.kind !== 'number') throw new Error(where + ' 不是 number 却给了 ' + k);
  }
}

/** 正文与字段表的对应门（#975 复制载荷成立的前提）：
 *  1. `{{name}}` 序列与字段表**一一对应且同序**；
 *  2. 正文无 `____` 残留、无裸 ISO 日期（预置值一律剥离）；
 *  3. 首行就是唤醒词行，且唤醒词逐字等于 `wake_word`。 */
function assertPromptFields(scene) {
  const found = [...scene.prompt_template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)].map((m) => m[1]);
  const names = scene.editable_fields.map((f) => f.name);
  if (found.length !== names.length || found.some((n, i) => n !== names[i])) {
    throw new Error('正文占位与字段表不一致：' + scene.id
      + ' 正文 [' + found.join(',') + '] 字段 [' + names.join(',') + ']');
  }
  if (scene.prompt_template.includes('____')) throw new Error('正文残留 ____：' + scene.id);
  if (/\d{4}-\d{2}-\d{2}/.test(scene.prompt_template)) throw new Error('正文残留裸 ISO 日期：' + scene.id);
  if (scene.prompt_template.split('\n')[0] !== '请你加载技能 作息管家,执行唤醒词「' + scene.wake_word + '」。') {
    throw new Error('首行不是唤醒词行：' + scene.id);
  }
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
        for (const f of s.editable_fields) assertFieldShape(s, f);
        assertPromptFields(s);
      }
    }
  }
}

/* ── 四 · 生成文件全文（LF、无 BOM；跑两次字节一致） ─────────── */

/** 逐条对账用的规范形（测试另有独立一份实现，互为复核）。
 *  字段取**全量键**（含 kind 与各 kind 附属），键名固定书写顺序，免两边靠对象键序对齐。 */
function canonicalField(f) {
  return [
    f.name, f.label, f.value, f.kind || 'text', f.required === true,
    f.hint === undefined ? null : f.hint,
    f.options === undefined ? null : f.options,
    f.min === undefined ? null : f.min,
    f.max === undefined ? null : f.max,
    f.step === undefined ? null : f.step,
    f.placeholder === undefined ? null : f.placeholder,
  ];
}

/** 逐条对账用的规范形（测试另有独立一份实现，互为复核）。 */
function canonicalScenes(scenes) {
  return JSON.stringify(scenes.map((s) => [
    s.id, s.title, s.wake_word, s.status, s.prompt_template,
    s.editable_fields.map(canonicalField),
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
  /** 契约无位、只好留在伴随表里的两处源信息已随 #975 删掉（见文件头）；这里只算待开发条数。 */
  const pendingTotal = scenes.filter((s) => s.status !== '').length;

  const header = `/** #201 · 作息管家 HELP 内容资产（机器生成，禁手改词）。
 *
 * 两个源（分工写死在生成器里，可复核）：
 *  1. **结构**取自受跟踪 fixture \`test/fixtures/t198-old-scenarios.json\`（老实物取证，一个字不改）：
 *     分组／唤醒词／场景的条数与先后次序、场景 id、待开发状态；
 *  2. **内容**取自 \`scripts/help-rewrite-table.mjs\`（#975 逐句重写表）：标题／唤醒词／prompt 正文／字段表。
 * 本文件由 \`scripts/gen-help-assets.mjs\` 生成：${groups.length} 个一级分组／${subgroups} 条唤醒词／${scenes.length} 条场景。
 *
 * 载荷契约：\`packages/base-render/src/spec/help.ts\` 的 \`SCENE_DATA_SCHEMA\`——\`HELP_GROUPS\` 就是
 * 共享 help 模板要的 \`groups\` 参数，分三层：一级分组 → 子功能（＝一条唤醒词）→ 场景卡片。
 * 该 schema 各层都是 \`additionalProperties:false\`，多一个键即校验失败，故本文件里的对象字段是闭集。
 *
 * 两处派生（生成器里写死、可复核）：
 *  1. 唤醒词去序号：老 HELP 的 \`#0 记作息\`／\`T4 类别深挖\` → 裸词 \`记作息\`／\`类别深挖\`
 *     （与路由表 \`src/triggers/routes.generated.ts\` 的 \`phrase\` 同形）。重写表里写的就是裸词，
 *     生成器另有「表里的唤醒词必须等于源去序号后的裸词」一条断言把两边钉在一起。
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
 * **不立字段的两种东西**（#975 重写时从老 \`dimensions\` 里摘掉的，逐条在重写表里具名声明）：
 *  · 场景条件开关：\`true\`／\`false\`／\`已有 4 条\` 这类**描述当前局面**的值——它们不是用户要填的参数，
 *    进意图句（让 AI 自己看局面），立成字段＝逼用户去描述 AI 自己能看出来的事；
 *  · 口径层**自算**的值：\`duration_minutes\` 由起止时刻算，\`src/policy/record.ts:99-104\` 还会核对
 *    用户给的值——立成字段只会让用户填错就报错。
 *  硬门：老维度名既不在新字段、又没写进重写表的 \`drops\` ⇒ 生成器 fail-closed（信息不丢失台账）；
 *  老维度表本身不全（多数场景缺 date／time_start 这类必填位），故只查「不丢」一个方向，新增不拦。
 *
 * 本文件**不再带**老的两张伴随表（\`HELP_SCENE_RESULTS\`＝场景 \`result\` 镜像／\`HELP_GROUP_NOTES\`＝
 * 一级分组 \`desc\` 镜像）：用户 2026-09-27 裁定「以后不再有预期这种 UI 显示和装填的内容，和预期相关的
 * 直接删掉」。老文本仍完整躺在 fixture 里，留档由那份取证承担，不在产物里再镜像一遍。
 *
 * 计数全部由数据算出（见 \`HELP_TOTALS\`），本文件不写第二个数；改资产即跟变。
 * 改词走生成器：\`node packages/skill-schedule/scripts/gen-help-assets.mjs\`（\`--check\` 只比对不落盘）。
 */

/** 参数化表单字段（契约 \`editable_fields\` 的一条；#975 起带 kind 与控件附属）。 */
export interface HelpSceneField {
  /** 机器键：正文里的 \`{{name}}\` 与复制载荷末尾 \`label: value\` 行的 key 都用它（ASCII snake_case）。 */
  readonly name: string;
  /** 人类可读标签（进复制载荷的 \`label: value\` 行；不列枚举／单位／格式）。 */
  readonly label: string;
  /** 缺省机器值——一律空串。相对默认词（今天／明天）写在 \`hint\` 里，由执行侧解成 ISO。 */
  readonly value: string;
  /** 输入类型（\`packages/base-render/src/spec/help.ts\` 的 \`SceneFieldKind\`）：
   *  text／number／select／date／week／month／year／time。 */
  readonly kind: string;
  /** 必填：空的必填项挡住「复制指令」并提示补齐（模板 \`getMissing\`）。 */
  readonly required: boolean;
  /** 格式／例／默认值说明（一句话；单位与枚举不进标签，进这里）。 */
  readonly hint?: string;
  /** 仅 \`select\`：候选项（必填非空）。 */
  readonly options?: readonly string[];
  /** 仅 \`number\`：值域与步长。 */
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** 控件占位提示。 */
  readonly placeholder?: string;
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

/** 计数（全部由数据算出；改资产即跟变，内容另由测试里的摘要锁钉住）。 */
export const HELP_TOTALS = Object.freeze({
  groups: HELP_GROUPS.length,
  subgroups: HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0),
  scenes: HELP_ASSETS.length,
  pending: HELP_ASSETS.filter((s) => s.status !== '').length,
  fields: HELP_ASSETS.reduce((n, s) => n + s.editable_fields.length, 0),
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
