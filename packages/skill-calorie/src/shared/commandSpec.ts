/** 命令声明的形状（**唯一定义地**）：一条命令的事实——键／形状／标题／代表唤醒词／处理函数。
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

/** 读命令的产物：`data` 过 envelope 形状守卫，`html` 为产物（可为空串＝无模板，允许文字答）。 */
export interface ViewOut {
  data: Record<string, unknown>;
  html: string;
  /** `html`＝HTML 产物（模板／壳渲染），`text`＝结构化文本（渲染层已定文本交付）。 */
  deliveryKind?: 'html' | 'text';
  /** 该次产物的落点**意图**（目录 ＋ 文件名主体）：给定时绕过 `<中文command>` 命名。 */
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
  /** 代表唤醒词（生成 SKILL.md 速查表的 `REPR` 用）；必须是 `TRIGGERS` 里真实存在的唤醒词。 */
  readonly wakeWord: string;
  readonly run: ViewHandler;
}

/** 写命令的声明（写命令一律 receipt 形，见 `cli/keys.ts` 的 `CALORIE_WRITE_COMBOS`）。 */
export interface WriteCommandSpec {
  readonly kind: 'write';
  readonly key: string;
  readonly shape: 'receipt';
  readonly title: string;
  readonly wakeWord: string;
  readonly run: WriteHandler;
}

export type CommandSpec = ReadCommandSpec | WriteCommandSpec;
