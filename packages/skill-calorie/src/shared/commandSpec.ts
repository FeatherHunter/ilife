/** 命令声明的形状（**唯一定义地**）：一条命令的事实——键／形状／标题／代表唤醒词／工作流程名／可执行示例／处理函数。
 *
 * 谁在用（写得出哪两个在用）：
 *   ① 各能力目录的声明文件（本票：`src/weight/commands.ts`）——命令事实的**唯一权威源**；
 *   ② 出口分派层的索引 `src/cli/registry.ts`——把各能力声明汇总成一张表，供两个分派文件查表。
 *
 * 为什么要 `kind` 判别式：读、写两条路的产物形状不同（读＝`ViewOut`、写＝`WriteOut`），
 * 分派层必须能**静态**窄化到正确的那一支（`docs/agents/structure.md` 铁律三：类型上写得出具体形状）；
 * `kind: 'write'` 与 `shape: 'receipt'` 是同一件事实的两种说法，测试里钉死二者等价。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { EnvelopeShape } from 'base-link-core';
import type { HtmlLanding } from 'base-paint/save-html';
import type { CrudReceipt } from '../render/receipt.js';

/** 该次产物的种类：`html`＝HTML 产物（模板／壳渲染），`text`＝结构化文本（渲染层已定文本交付）。 */
export type DeliveryKind = 'html' | 'text';

/** 读命令的产物：`data` 过 envelope 形状守卫，`html` 为产物（可为空串＝无模板，允许文字答）。 */
export interface ViewOut {
  data: Record<string, unknown>;
  html: string;
  deliveryKind?: DeliveryKind;
  /** #139 · 该次产物的落点**意图**（目录 ＋ 文件名主体）：给定时绕过 `<中文command>` 命名
   *  （`output.ts:deliverHtml`），仍走 `wx` 独占＋同秒递补（#237 起由共用件 `base-paint/save-html` 仲裁）；
   *  一个 key 出多种产物（HELP 文件／速查台／回执）时用它分开命名。 */
  target?: HtmlLanding;
}

/** 写命令的产物：回执三件（`ok`／`message`／`receipt`），`affectedRows` 由写分派统一注入。 */
export interface WriteOut {
  data: { ok: boolean; message: string; receipt: CrudReceipt };
  html: string;
}

export type ViewHandler = (params: Record<string, unknown>, db: DatabaseSync) => ViewOut;
export type WriteHandler = (params: Record<string, unknown>, db: DatabaseSync) => WriteOut;

/** 读命令的声明。 */
export interface ReadCommandSpec {
  readonly kind: 'read';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  /** 代表唤醒词（生成 SKILL.md 速查表的 `REPR` 用）；**可缺**——缺了速查表退回命令名本身
   *  （与 `cli/legacy/types.ts` 的 `LegacyCommandDecl.wakeWord?` 同口径）；
   *  给定时必须是 `TRIGGERS` 里真实存在的唤醒词。 */
  readonly wakeWord?: string;
  /** #338 · 这条命令服务的**工作流程名**（零条或多条），取值是一张**封闭**表：帮助面场景 03 的
   *  八个下一级分组名（量体重／改体重记录／看体重明细／看体重曲线／看体重稳不稳／看体重备注／对比体重／体重复盘）。
   *  为什么是表而不是一个值：一个键可以服务多条流程——`calorie.view.weight-history` 同时服务
   *  看体重明细（7 条词）／看体重曲线（10 条）／看体重备注（1 条）。
   *  名字的事实住这里（能力目录），SKILL.md 的「场景 03 体重工作流程」各写一次步骤、不另存清单；
   *  名字不在名单里时 `pnpm gen` 与 `pnpm help:build` 当场抛，不静默漏一列。 */
  readonly flows?: readonly string[];
  /** 照抄即能跑的一行（生成 SKILL.md 速查表「例」列的 `EXAMPLES` 用）；缺它 SKILL.md 生成即抛。 */
  readonly example: string;
  readonly run: ViewHandler;
}

/** 写命令的声明。
 *
 * **信封形状不写在这里**（#703）：写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * （`scripts/gen-cli.mjs` 合成 `cli/keys.ts` 的 `CALORIE_WRITE_COMBOS` 与 YAML 目录那一处）。
 * 声明上原来那个 `shape: 'receipt'` 与 `kind: 'write'` 是同一件事实的两种说法（铁律二），
 * 本票删掉前者、换来 `doc?` 这一位——字段数仍是不多不少的 8 个（铁律五「一个类型的字段不多于八个」）。
 */
export interface WriteCommandSpec {
  readonly kind: 'write';
  readonly key: string;
  readonly title: string;
  readonly wakeWord?: string;
  /** #338 · 这条命令服务的工作流程名（口径、取值与「为什么是表」见 `ReadCommandSpec.flows`）。 */
  readonly flows?: readonly string[];
  /** 照抄即能跑的一行（生成 SKILL.md 速查表「例」列的 `EXAMPLES` 用）；缺它 SKILL.md 生成即抛。 */
  readonly example: string;
  readonly run: WriteHandler;
  /** #703 · **整页回执端口**：给定时用它出这一条的整页；返 `null` 即让路，落回命令自己产出的片段。
   *  签名与六家既有回执件逐字相同（键／本次参数／已注入影响行数的回执／库句柄），故声明直接点名它们。
   *  为什么住声明：整页分派原先是 `cli/write.ts` 里一行六个 `??` 的硬接线，第 7 个带整页回执的能力
   *  必须改那个文件；搬到声明上之后，分派层一次查表，新能力只改自己目录里的声明。
   *  类型内联、不新增导出名（本件对外已有 8 个名字，再加一个就是第十个的第 9 个）。 */
  readonly doc?: (
    key: string,
    params: Record<string, unknown>,
    receipt: CrudReceipt,
    db: DatabaseSync,
  ) => string | null;
}

export type CommandSpec = ReadCommandSpec | WriteCommandSpec;
