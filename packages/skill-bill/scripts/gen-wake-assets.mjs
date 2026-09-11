#!/usr/bin/env node
/** #146 · 内容资产生成器：老实物 HELP payload → `src/triggers/wake-assets.ts`（typed const，禁手改词）。
 *
 * 为什么留一个生成器：产出文件 ~2.9k 行、且契约要求「逐字」，手抄必漂移。生成器是**一次性入口**
 * （不进 build/test 管线），只做「读事实源 → 逐字序列化 → 落盘」，跑两次字节一致。
 *
 * 用法：
 *   node packages/skill-bill/scripts/gen-wake-assets.mjs                  # 落盘
 *   node packages/skill-bill/scripts/gen-wake-assets.mjs --check          # 只比对，不一致 exit 1
 *   node packages/skill-bill/scripts/gen-wake-assets.mjs --src <老实物.html> --out <目标.ts>
 *
 * 事实源在**仓外**（老技能目录，机器本地）：`--check` 只在事实源在盘的机器上可跑；
 * 仓内不再落第二份 payload 副本（单一事实源），故 CI 不跑本脚本，改词走生成器。
 *
 * 三处「非纯搬运」都在本文件里写死、可复核（生成文件头注释同步声明）：
 *   ① `ADDED_SCENES`＝现 `WAKE_TABLE` 比老 HELP 多出的 3 条（Q8=A 补进对应域）；
 *   ② 断言 payload 形状（7 域／20 组／71 场景／字段齐／id 与唤醒词计数），形状变了就 fail-closed；
 *   ③ 4 条 HELP 短语不进场景目录，由 `HELP_WAKE_WORDS` 从口径层 `WAKE_TABLE` 派生（不落第二份字面量）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SRC = 'D:\\2Study\\StudyNotes\\SKILLS\\饼干记账\\饼干记账.html';
const DEFAULT_OUT = join(HERE, '..', 'src', 'triggers', 'wake-assets.ts');
const DATA_OPEN = '<script id="help-data" type="application/json">';

/** 期望形状（老实物 2026-08-16 新世代：7 域／20 二级组／71 场景；不符即 fail-closed）。 */
const EXPECT = { groups: 7, subgroups: 20, scenes: 71, uniqueWakeWords: 70 };

/** ① 现 `WAKE_TABLE` 比老 HELP 多出的 3 条：老实物无，故 `prompt_template` 按老实样重写
 *  （「请加载「饼干记账」技能,…(唤醒词:…)」＋ `____` 空槽，形状与老条目一致）。 */
const ADDED_SCENES = [
  {
    group: 'write',
    subgroup: 'write_1',
    why: '`记一笔`（bill.record.add 通用词）：现表有、老 HELP 无',
    scene: {
      id: 'write_record',
      title: '记一笔',
      wake_word: '记一笔',
      status: '',
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
    group: 'query',
    subgroup: 'query_1',
    why: '`查账单`（bill.record.today）：现表有、老 HELP 无',
    scene: {
      id: 'query_bills',
      title: '查账单',
      wake_word: '查账单',
      status: '',
      prompt_template:
        '请加载「饼干记账」技能,帮我查账单(唤醒词:查账单):\n\n'
        + '  日  期: ____ (选填,默认今天;可写「昨天」或「2026-09-06」)\n',
      types: ['查看'],
    },
  },
  {
    group: 'query',
    subgroup: 'query_1',
    why: '`查账单详情`（bill.record.detail，老代码注释自述「老家无直接词」）：现表有、老 HELP 无',
    scene: {
      id: 'query_bill_detail',
      title: '查账单详情',
      wake_word: '查账单详情',
      status: '',
      prompt_template:
        '请加载「饼干记账」技能,帮我查一条账单的详情(唤醒词:查账单详情):\n\n'
        + '  记录 id: ____ (从「查账单」或「查今天」的列表里取)\n',
      types: ['查看'],
    },
  },
];

/** 读老实物 → payload（只认 `help-data` 锚点，缺锚点即 fail-closed）。 */
function readPayload(src) {
  if (!existsSync(src)) throw new Error('事实源不在盘上：' + src);
  const raw = readFileSync(src, 'utf8');
  const at = raw.indexOf(DATA_OPEN);
  if (at < 0) throw new Error('未找到 help-data 锚点：' + src);
  const start = at + DATA_OPEN.length;
  const end = raw.indexOf('</script>', start);
  if (end < 0) throw new Error('help-data 未闭合：' + src);
  return JSON.parse(raw.slice(start, end));
}

/** 形状断言（fail-closed）：数量、字段齐、id 唯一、types 非空且用老词。 */
function assertShape(groups) {
  const bad = (msg) => { throw new Error('老实物形状不符：' + msg); };
  if (groups.length !== EXPECT.groups) bad('域数 ' + groups.length + ' ≠ ' + EXPECT.groups);
  const subs = groups.flatMap((g) => g.subgroups);
  if (subs.length !== EXPECT.subgroups) bad('二级组数 ' + subs.length + ' ≠ ' + EXPECT.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  if (scenes.length !== EXPECT.scenes) bad('场景数 ' + scenes.length + ' ≠ ' + EXPECT.scenes);
  if (new Set(scenes.map((s) => s.wake_word)).size !== EXPECT.uniqueWakeWords) bad('唯一唤醒词数不符');
  const ids = scenes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) bad('场景 id 有重复');
  const words = new Set(['采集', '查看', '选择', '向导', '回执']);
  for (const s of scenes) {
    for (const k of ['id', 'title', 'wake_word', 'status', 'prompt_template']) {
      if (typeof s[k] !== 'string') bad(s.id + ' 缺字段 ' + k);
    }
    if (!Array.isArray(s.types) || s.types.length === 0) bad(s.id + ' types 为空');
    for (const t of s.types) if (!words.has(t)) bad(s.id + ' 出现老词表外的 types：' + t);
  }
  if (new Set(scenes.map((s) => s.status)).size !== 1) bad('status 非全空（老实物 71/71 为空串）');
}

/** ① 把 3 条新增场景接到对应组的对应二级组末尾（老条目顺序与内容零改动）。 */
function withAddedScenes(groups) {
  const out = JSON.parse(JSON.stringify(groups));
  const have = new Set(out.flatMap((g) => g.subgroups.flatMap((s) => s.scenes.map((x) => x.id))));
  for (const a of ADDED_SCENES) {
    if (have.has(a.scene.id)) throw new Error('新增场景 id 与老条目撞名：' + a.scene.id);
    const g = out.find((x) => x.id === a.group);
    if (!g) throw new Error('新增场景找不到域：' + a.group);
    const sub = g.subgroups.find((x) => x.id === a.subgroup);
    if (!sub) throw new Error('新增场景找不到二级组：' + a.subgroup);
    sub.scenes.push(a.scene);
  }
  return out;
}

/** 生成文件全文（LF、无 BOM；跑两次字节一致）。 */
function renderFile(groups) {
  const header = `/** #146 · 饼干记账 HELP 内容资产（typed TS module，74 场景 ＝ 老 71 ＋ 现表多出 3 条）。
 *
 * 唯一事实源：老技能**新世代**实物 \`D:\\2Study\\StudyNotes\\SKILLS\\饼干记账\\饼干记账.html\`
 * 的 \`<script id="help-data">\` payload——7 域／20 二级组／71 场景逐字落地，域、组、场景顺序与实物一致。
 * ⚠️ 别拿 \`.db\\biscuit_accountant_html\\饼干记账_HELP_20260813_161051.html\` 当基准：那是 pre-v4.0 的
 * **上一代**（技能自带壳 + \`domains→subs→scenes\` 旧信封），比老技能切到公共组件模板早 6.5 小时。
 *
 * 本文件由 \`scripts/gen-wake-assets.mjs\` 机器生成（逐字 \`JSON.stringify\`），**禁止手工改词**：
 * 改内容＝改事实源或改生成器里的新增条目段，再跑 \`node packages/skill-bill/scripts/gen-wake-assets.mjs\`
 * （\`--check\` 只比对不落盘；事实源在仓外，故 CI 不跑，改词必走生成器）。
 *
 * 与「纯搬运」不同的三处（生成器里写死、可复核）：
 *  1. 新增 3 条场景 \`write_record\`/\`query_bills\`/\`query_bill_detail\` ＝现 \`WAKE_TABLE\` 比老 HELP
 *     多出的 3 条（\`记一笔\`/\`查账单\`/\`查账单详情\`，用户 Q8=A 补进对应域）；老实物无此三条，
 *     \`prompt_template\` 按老实样重写（\`____\` 空槽 ＋ \`(唤醒词:…)\` 尾注）。
 *  2. \`status\` 全空照老实样（71/71 可用，无「待开发」）。
 *  3. \`types\` 沿用老词（采集／查看／选择／向导／回执）——共享壳 \`help-template.html:TYPE_DEFAULT\`
 *     的徽章配色表里本来就有这 5 个词，零模板改动。
 *
 * 4 条 HELP 短语（\`bill.help.lookup\`）**不进场景目录**：HELP 是资产的呈现载体而非场景（防自指，
 * 照卡路里口径），由 \`HELP_WAKE_WORDS\` 从口径层 \`WAKE_TABLE\` **派生**——见本文件头下方说明。
 * 与 \`WAKE_TABLE\` 的双向对账由 \`test/wake-assets.test.mjs\` 钉住：老 70 个唯一唤醒词 100% 在位、
 * 现表 73 条非 HELP 短语全部有场景、场景唤醒词全部在现表。
 */
import { WAKE_TABLE } from '../policy/wakewords.js';

/** 徽章类型词（老实物用到的全集；共享壳 \`TYPE_DEFAULT\` 认得这些词，缺席即配色表要改）。 */
export type WakeSceneType = '采集' | '查看' | '选择' | '向导' | '回执';

export interface WakeSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  /** 老实物 71/71 为空串（可用）；\`【待开发】\` 为本仓预留态。 */
  readonly status: string;
  /** 「复制指令」按钮按出来的正文，逐字保留。 */
  readonly prompt_template: string;
  readonly types: readonly WakeSceneType[];
}

export interface WakeSubgroupAsset {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly WakeSceneAsset[];
}

export interface WakeGroupAsset {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroups: readonly WakeSubgroupAsset[];
}

/** 7 域／20 二级组／74 场景（老 71 逐字 ＋ 新增 3 条接在对应二级组末尾）。 */
export const WAKE_GROUPS: readonly WakeGroupAsset[] = [`;

  const json = JSON.stringify(groups, null, 2);
  const inner = json.split('\n').slice(1, -1).join('\n');

  const footer = `
];

/** 扁平 74 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const WAKE_ASSETS: readonly WakeSceneAsset[] = WAKE_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** id → 场景（74/74 唯一）。 */
export const SCENE_BY_ID: Readonly<Record<string, WakeSceneAsset>> = Object.fromEntries(
  WAKE_ASSETS.map((s) => [s.id, s]),
);

/** 资产总数（由 \`WAKE_ASSETS\` 派生，单源不复写第二遍数；改资产即跟变，测试仍钉 74）。 */
export const WAKE_ASSET_TOTAL: number = WAKE_ASSETS.length;

/** HELP 自身的唤醒词（老实物 \`meta_blocks.help_wake_words\` 那一块；4 条，不进场景目录）。
 *
 * 从口径层 \`WAKE_TABLE\` **派生**而非复写：口径层是唤醒词的单一事实源，本文件只投影。
 * （老实物写的是「饼干记账 帮助」（带空格），现表口径为「饼干记账帮助」——以现表为准。） */
export const HELP_WAKE_WORDS: readonly string[] = WAKE_TABLE
  .filter((e) => e.key === 'bill.help.lookup')
  .map((e) => e.phrase);
`;

  return header + '\n' + inner + footer;
}

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const src = resolve(argOf('--src', DEFAULT_SRC));
const out = resolve(argOf('--out', DEFAULT_OUT));
const check = argv.includes('--check');

const payload = readPayload(src);
const scenes = payload.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
console.log('老实物：' + scenes.length + ' 场景／' + payload.groups.length + ' 域／'
  + payload.groups.flatMap((g) => g.subgroups).length + ' 二级组／'
  + new Set(scenes.map((s) => s.wake_word)).size + ' 唯一唤醒词');
assertShape(payload.groups);
for (const a of ADDED_SCENES) console.log('新增：' + a.scene.id + '（' + a.scene.wake_word + '）→ '
  + a.group + '/' + a.subgroup + '　理由：' + a.why);

const text = renderFile(withAddedScenes(payload.groups));
if (check) {
  const now = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (now !== text) {
    console.error('DRIFT：' + out + ' 与生成结果不一致（禁止手改；重跑不带 --check 即覆盖）');
    process.exit(1);
  }
  console.log('OK：' + out + ' 与生成结果字节一致');
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text, 'utf8');
  console.log('已写入：' + out + '（' + Buffer.byteLength(text, 'utf8') + ' 字节）');
}
