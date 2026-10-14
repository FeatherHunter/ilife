/** #145 · 「饼干记账help」的交付**内容**：内容资产 ＋ 派生 → 共享 help 模板（`base-paint/help-shell`）全页 HTML。
 *
 * 本模块**零落盘**：落点与写盘全在 CLI 交付管线（#144：`src/help/helpPaths.ts` ＋ `src/output.ts`）；
 * 唯一的读＝模块初始化时读一次自身 `package.json` 的 `version`（关于页那个「技能 v…」，唯一真相源，
 * 见下方 `SKILL_PACKAGE_VERSION`）；除此之外本模块零 IO，`buildHelpFileData` 是纯函数。
 * 文件名主体是编译期常量 `HELP_FILE_STEM`（#762 起配置项 `html.helpStem` 已退休，本件不再读盘）。
 * 逐字对照老口径（只读基线 `D:\2Study\StudyNotes\SKILLS\饼干记账\scripts\render_help.py:build_help_contract`）：
 *  - `skill_name`／`title`／`contact`／`version` 照老实样（`:197-214`）；
 *  - `subtitle` 与 `meta_blocks[0]` 同源派生（老 `:194-202` 的 `summary_line` 一处算、两处用）；
 *  - `groups` 由内容资产直转（`WAKE_GROUPS`，只读引用不 clone）；
 *  - `init_banner` 文案照老 `INIT_BANNER_TEXT`（`:69-74`），`prompt` 取自 `setup_init_wizard`
 *    场景的 `prompt_template`（老 `:124-132` 同一个「从汇总里取该场景 prompt」的单源做法）。
 *
 * 三块可选键（用户 Q9=B 完整照传；仓内共享 help 模板运行时全量读这些键，TS 类型面只声明 5 键）：
 *  - `meta_blocks`：两块（`help_summary`／`help_wake_words`），内容全部派生，不写第二份源；
 *  - `version`：`'2.0'`——老口径 `str(summary.get("version","2.0"))`，语义是**技能数据世代**
 *    （bill 自己的 `init-status` 也自述「v2.0 特征 deleted_at」），**不是** npm 包版本 `0.1.0`；
 *  - `init_banner`：显隐由 `hidden` 控。老口径是「未初始化才给这个键」，help模板读的却是 `hidden`
 *    （`help-template.html` 的 `INIT_BANNER && !INIT_BANNER.hidden`），故新线**键常在、显隐走 `hidden`**：
 *    payload 形状不随状态变，下游用例能断言同一个键集。初始化状态由调用方传入（本模块零 IO）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHelpShellHtml } from 'base-paint/help-shell';
import { helpDataKeyOf } from 'base-paint/help-key';
import { HELP_WAKE_WORDS, SCENE_BY_ID, WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import { BillRenderError } from '../render/errors.js';
import { EMPTY_CANDIDATE_LISTS, type HelpCandidateLists } from './candidateLists.js';
/* #1280 候选项附注那一步住在自己的件里（见 `fieldNotes.ts` 件头：超线条按能力拆的一刀）。 */
import { fillNotes } from './fieldNotes.js';

/** 「饼干记账help」交付文件的文件名主体：**代码常量**（#762 起配置项 `html.helpStem` 已退休——
 *  用户改的曾经是配置文件，现在没有可改处；对外也不接受调用方传入，照 #139 S3-3）。
 *  「空串＝按默认落点」那条通则随配置项一起退休：这里只有一个值。 */
export const HELP_FILE_STEM = '饼干记账_HELP' as const;

/** 5 键头（老实物逐字）。 */
export const HELP_FILE_SKILL_NAME = '饼干记账' as const;
export const HELP_FILE_TITLE = '饼干记账 · 使用手册(HELP)' as const;
/** 技能数据世代版本（老口径 `summary.version`，非 npm 包版本）。 */
export const HELP_FILE_VERSION = '2.0' as const;

/** 本包 `package.json` 的路径（`dist/help/helpFile.js` → 上两级＝包根）。相对 `import.meta.url`
 *  算而不是相对 `process.cwd()`：装到哪个 profile、从哪个目录被调起，读到的都是这一份。 */
const PACKAGE_MANIFEST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

/** 技能包版本（关于页主行「技能 v…」那一个数）：**取包自身 `package.json` 的 `version`，不写常量**。
 *
 *  口径裁定（用户 2026-09-23 图报卡路里「关于」Tab 时拍定，本票 2026-10-13 按同一条口径落地）：
 *  屏上那个数要回答的是「用户装的这份技能是几版」，唯一真相源＝包清单的 `version`。写一份常量就是
 *  第二真相源——发版只 bump `package.json` 时页上那个数立刻撒谎。兄弟件先例＝
 *  `packages/skill-calorie/src/photo/helpFile.ts:39-73`（同一条注释链）。
 *
 *  读不到即抛（缺失阻断，与 `formatHelpMinute` 的坏参同一条家法）：这是**静态读一次**，读不到属
 *  「发布包缺 `package.json`」的故障，不静默降级回空版本。
 *
 *  条目 15 的另一半（数据世代 `2.0` 仍照老样印在主行前面）在 `HELP_FILE_VERSION`：那一位是技能数据
 *  世代，不是包版本，两者不同义、不能合并。 */
export const SKILL_PACKAGE_VERSION: string = ((): string => {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(PACKAGE_MANIFEST, 'utf8'));
  } catch (cause) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 技能包版本取不到：读不了 ' + PACKAGE_MANIFEST
      + '（' + (cause instanceof Error ? cause.message : String(cause)) + '）');
  }
  const version = (manifest as { version?: unknown } | null | undefined)?.version;
  if (typeof version !== 'string' || version === '') {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 技能包版本取不到：' + PACKAGE_MANIFEST
      + ' 的 version 不是非空字符串');
  }
  return version;
})();
/** 首次使用横幅的 prompt 取自该场景（老 `SETUP_INIT_SCENE_ID`）。 */
export const HELP_INIT_SCENE_ID = 'setup_init_wizard' as const;

export interface HelpContactItem {
  readonly label: string;
  readonly value: string;
  /** 标记「可点链接」（老实物该键为真时渲染成 `<a>`）。 */
  readonly url?: true;
}

export interface HelpContact {
  readonly items: readonly HelpContactItem[];
  readonly copy_all: true;
}

/** 联系作者三项（老 `render_help.py:59-63` 的 CONTACT ＋ `:206-213` 的 items 组法逐字；
 *  唯二例外是两个仓库地址：维护者 2026-09-27 定仓库已搬到 `ilife`，故 GitHub／Issues 两项的值改指
 *  `https://github.com/FeatherHunter/ilife`（＋`/issues`），标签与个数仍照老实样，邮箱不动）。 */
export const HELP_CONTACT: HelpContact = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: '邮箱', value: '975559549@qq.com' }),
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/ilife', url: true as const }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/ilife/issues', url: true as const }),
  ]),
  copy_all: true as const,
});

/** 透传信息块（老契约 `{id,title,html}`）。**自 t202 起共享 help 模板会渲染它**：块 `id` 逐字命中某个
 *  一级分组的 `id` 时，该块渲在那个分组页的页首。本件两块（`help_summary`／`help_wake_words`）与 7 个
 *  分组 id 零碰撞 ⇒ 本件页面上仍**不渲染**（行为同旧版，照旧只作页面外消费的透传位）。
 *  契约＝`docs/base/base-render/t202-help-meta-blocks.md`。 */
export interface HelpMetaBlock {
  readonly id: string;
  readonly title: string;
  readonly html: string;
}

/** 首次使用横幅（老 `:221-227` 五键 ＋ 新线追加的显隐开关 `hidden`）。 */
export interface HelpInitBanner {
  readonly title: string;
  readonly subtitle: string;
  readonly button_text: string;
  readonly prompt: string;
  readonly closable: true;
  readonly hidden: boolean;
}

/** 老 5 键 ＋ 三块可选键（共享 help 模板运行时契约的超集）＋ 两块关于页事实键。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: HelpContact;
  readonly groups: typeof WAKE_GROUPS;
  readonly meta_blocks: readonly HelpMetaBlock[];
  readonly version: typeof HELP_FILE_VERSION;
  readonly init_banner: HelpInitBanner;
  /** 关于页主行「技能 v…」（条目 15）：本包装的是哪一版，取包清单 `version`（`SKILL_PACKAGE_VERSION`）。 */
  readonly skill_version: string;
  /** 关于页小字「本页数据生成于 …」（条目 15 的边界）：**这一页自己的文件事实**，与 `subtitle` 同源。
   *  不印复用窗口（那是调用方的策略参数）、不印任何业务承诺（候选完整性归各技能自己的数据来源）。 */
  readonly generated_at: string;
}

export interface HelpFileOptions {
  /** 库是否已初始化（`true` ⇒ 首次使用横幅隐藏）。缺省 `false`＝照显（见模块头：误显的代价小于误藏）。 */
  readonly initialized?: boolean;
  /** #1270 生成期候选（条目 10 标签 ＋ 条目 9／12／13 查询页的分类／账户／账本）：由调用方**只读**读出后传入
   *  （见 `help/candidateLists.ts`）。某张清单为空 ⇒ 声明里写了对应 `source` 的槽位退回自由文本。 */
  readonly candidates?: HelpCandidateLists;
  /** #1276 生成期预填（条目 24）：当前配置里**已有**的现值，键＝字段名，由调用方**只读**读出后传入
   *  （见 `setup/configPrefill.ts`）。缺位的键 ⇒ 声明里写了 `source: 'config'` 的槽位留空＝「空＝不改」。 */
  readonly configValues?: Readonly<Record<string, string>>;
  /** #1280 生成期候选项附注：键＝`<场景 id>.<字段名>`，值＝`{候选值: 行右侧小字}`，由调用方**只读**读出后传入
   *  （见 `help/helpSources.ts`）。没有这一格／这一格没候选 ⇒ 不填，页面照旧不印附注。 */
  readonly fieldNotes?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区，零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 更新时间须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 老 `:194-195` 的 `summary_line`：计数与版本**派生**，不写死 7／74（改资产即跟变）。 */
export function deriveSummaryLine(now: Date = new Date()): string {
  return String(WAKE_GROUPS.length) + ' 功能域 · ' + String(WAKE_ASSETS.length)
    + ' 场景 · 版本 ' + HELP_FILE_VERSION + ' · 更新于 ' + formatHelpMinute(now);
}

/** 两块 meta：HELP 汇总（＝summaryLine 同源）＋ HELP 唤醒词（＝口径层那 4 条派生）。 */
export function buildMetaBlocks(summaryLine: string): readonly HelpMetaBlock[] {
  return [
    { id: 'help_summary', title: 'HELP 汇总', html: '<p>' + summaryLine + '</p>' },
    { id: 'help_wake_words', title: 'HELP 唤醒词', html: '<p>' + HELP_WAKE_WORDS.join(' / ') + '</p>' },
  ];
}

/** 首次使用横幅：文案照老实样，`prompt` 取自初始化场景的 `prompt_template`（单源）。
 *  该场景缺位即抛（内容资产被机器生成 ＋ 摘要锁，缺位属真故障，不静默把横幅降级掉）。 */
export function buildInitBanner(initialized: boolean): HelpInitBanner {
  const scene = SCENE_BY_ID[HELP_INIT_SCENE_ID];
  const prompt = scene?.prompt_template;
  if (typeof prompt !== 'string' || prompt.length === 0) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA',
      'HELP 首次使用横幅缺 prompt：内容资产无场景 ' + HELP_INIT_SCENE_ID);
  }
  return {
    title: '🚀 第一次用饼干记账?',
    subtitle: '从「初始化」开始 — 自动检测环境、确认数据目录、建库、验证,全程零决策。完成初始化后,本区域将不再出现。',
    button_text: '📋 复制初始化 prompt',
    prompt,
    closable: true,
    hidden: initialized === true,
  };
}

const SOURCE_LISTS: Readonly<Record<string, keyof HelpCandidateLists>> = {
  tags: 'tags',
  categories: 'categories',
  accounts: 'accounts',
  ledgers: 'ledgers',
  accountTypes: 'accountTypes',
  debtParties: 'debtParties',
  backups: 'backups',
};

/** #1270（条目 10／9／12／13）：把生成期读到的候选清单填进声明里写了清单类 `source` 的槽位——
 *  升级成 `kind: 'select'` ＋ `options: 该清单`，页面就是一个「从已有值里选一个」的下拉。
 *
 *  三条边界：① 该清单为空 ⇒ **原样返回**（槽位保持自由文本，用户照敲，不出现空下拉）；
 *  ② 声明里同时写了写死的 `options` ⇒ 以写死的为准（本函数不动它）；
 *  ③ 只 clone 真被改到的层（分组／二级组／场景／字段），其余仍只读引用资产，省掉整棵树的拷贝。 */
function fillCandidates(
  groups: typeof WAKE_GROUPS,
  lists: HelpCandidateLists,
): typeof WAKE_GROUPS {
  const optionsOf = (field: { readonly source?: string; readonly options?: unknown }): readonly string[] | undefined => {
    if (field.options !== undefined) return undefined;
    const key = field.source === undefined ? undefined : SOURCE_LISTS[field.source];
    if (key === undefined) return undefined;
    const list = lists[key];
    return list.length === 0 ? undefined : list;
  };
  let changed = false;
  const nextGroups = groups.map((group) => {
    const nextSubs = group.subgroups.map((sub) => {
      const nextScenes = sub.scenes.map((scene) => {
        const fields = scene.editable_fields;
        if (fields === undefined || !fields.some((f) => optionsOf(f) !== undefined)) {
          return scene;
        }
        changed = true;
        return {
          ...scene,
          editable_fields: fields.map((f) => {
            const options = optionsOf(f);
            return options === undefined ? f : { ...f, kind: 'select' as const, options };
          }),
        };
      });
      const sameScenes = nextScenes.every((s, i) => s === sub.scenes[i]);
      return sameScenes ? sub : { ...sub, scenes: nextScenes };
    });
    const sameSubs = nextSubs.every((s, i) => s === group.subgroups[i]);
    return sameSubs ? group : { ...group, subgroups: nextSubs };
  });
  return changed ? nextGroups : groups;
}

/** #1276（条目 24）：把生成期读到的配置现值填进声明里写了 `source: 'config'` 的槽位——
 *  填的是字段的 `value`（页面一打开就写着现值，用户只改要改的那格）。
 *
 *  两条边界：① 这一格没值（文件里没写／读不出）⇒ 原样返回，字段留空＝「空＝不改」语义不动；
 *  ② 只 clone 真被改到的层（同 `fillCandidates` 的省拷贝口径）。 */
function fillConfigValues(
  groups: typeof WAKE_GROUPS,
  values: Readonly<Record<string, string>>,
): typeof WAKE_GROUPS {
  if (Object.keys(values).length === 0) return groups;
  let changed = false;
  const nextGroups = groups.map((group) => {
    const nextSubs = group.subgroups.map((sub) => {
      const nextScenes = sub.scenes.map((scene) => {
        const fields = scene.editable_fields;
        if (fields === undefined || !fields.some((f) => f.source === 'config' && values[f.name] !== undefined)) {
          return scene;
        }
        changed = true;
        return {
          ...scene,
          editable_fields: fields.map((f) => {
            const value = f.source === 'config' ? values[f.name] : undefined;
            return value === undefined || value === f.value ? f : { ...f, value };
          }),
        };
      });
      const sameScenes = nextScenes.every((s, i) => s === sub.scenes[i]);
      return sameScenes ? sub : { ...sub, scenes: nextScenes };
    });
    const sameSubs = nextSubs.every((s, i) => s === group.subgroups[i]);
    return sameSubs ? group : { ...group, subgroups: nextSubs };
  });
  return changed ? nextGroups : groups;
}

/** 内容资产 ＋ 派生 → 全量 HELP JSON（纯函数；`now` 显式传入以保证可复现）。 */
export function buildHelpFileData(now: Date = new Date(), opts: HelpFileOptions = {}): HelpFileData {
  if (WAKE_GROUPS.length === 0 || WAKE_ASSETS.length === 0) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 内容资产为空（WAKE_GROUPS／WAKE_ASSETS）');
  }
  const summaryLine = deriveSummaryLine(now);
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: summaryLine,
    contact: HELP_CONTACT,
    /* 三步填充次序固定：候选 → 配置现值 → 候选项附注（附注印在候选行上，故必须排在候选之后）。 */
    groups: fillNotes(fillConfigValues(fillCandidates(WAKE_GROUPS, opts.candidates ?? EMPTY_CANDIDATE_LISTS), opts.configValues ?? {}), opts.fieldNotes ?? {}),
    meta_blocks: buildMetaBlocks(summaryLine),
    version: HELP_FILE_VERSION,
    init_banner: buildInitBanner(opts.initialized === true),
    skill_version: SKILL_PACKAGE_VERSION,
    generated_at: formatHelpMinute(now),
  };
}

/** HELP 的**数据指纹**（#1277）：算式唯一实现在公共层 `base-paint/help-key` 的 `helpDataKeyOf`
 *  （#1281 抽出——六家技能共用一套共享壳，算式不该有第二份）；本件只把本家的**分钟串**喂进去：
 *  `generated_at` 与 `subtitle`／`meta_blocks[0]` 里嵌的是同一个 `formatHelpMinute(now)`。 */
export function helpDataKey(data: HelpFileData): string {
  return helpDataKeyOf(data, data.generated_at);
}

/** 一次取齐交付要的三件（#1277）：载荷、整页 HTML、数据指纹。
 *  出口件按它一行取齐——`src/cli/cmd_read.ts` 是**棘轮件**（#686 冻结行数，新分支别加在那儿）。 */
export function buildHelpFile(
  now: Date,
  opts?: HelpFileOptions,
): { readonly data: HelpFileData; readonly html: string; readonly dataKey: string } {
  const data = buildHelpFileData(now, opts);
  return { data, html: renderHelpFileHtml(data), dataKey: helpDataKey(data) };
}

/** 全量 HELP JSON → 全help模板 HTML（模板唯一实现＝共享层 verbatim 老实物；空分组抛 `missing-data`，调用方 exit 5）。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  return renderHelpShellHtml(data);
}

/** 交付索引（envelope 的 `data` 载荷；`list` 形要 `items`）：域级一行，计数全**派生**——
 *  与 `help_summary` 同源思路，改资产即跟变，不回写第二份数字。 */
export interface HelpIndexItem {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroupCount: number;
  readonly sceneCount: number;
}

export interface HelpIndex {
  readonly items: readonly HelpIndexItem[];
  readonly total: number;
  readonly sceneTotal: number;
  readonly subgroupTotal: number;
}

export function buildHelpIndex(): HelpIndex {
  let sceneTotal = 0;
  let subgroupTotal = 0;
  const items = WAKE_GROUPS.map((g) => {
    const sceneCount = g.subgroups.reduce((n, s) => n + s.scenes.length, 0);
    sceneTotal += sceneCount;
    subgroupTotal += g.subgroups.length;
    return { id: g.id, icon: g.icon, label: g.label, subgroupCount: g.subgroups.length, sceneCount };
  });
  return { items, total: items.length, sceneTotal, subgroupTotal };
}
