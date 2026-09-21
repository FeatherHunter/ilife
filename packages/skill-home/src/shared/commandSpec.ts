// 共用位·命令与路由声明形状（#800 新立）。
//
// 形状照抄 `packages/skill-calorie/src/shared/commandSpec.ts`（命令登记纪律：其他件照抄
// 形状即可），只收居家用到的子集：居家 20 条业务命令的出参形状只有 list／detail／
// receipt／stat 四形（见 `src/render/envelope.ts` 的出参分配），写命令一律 receipt。
// 本文件只定形状、不定事实；事实住各能力目录的 `commands.ts`／`routes.ts`。

import type { HomeDb } from '../fetch/db.js';

/** 一条命令的事实（住它自己的能力目录 `src/<能力>/commands.ts` 的那一行）。 */
export interface HomeCommandSpec {
  /** 读／写。写命令的出参形状不写在声明上，一律 receipt（生成器合成）。 */
  readonly kind: 'read' | 'write';
  /** 联动 key，如 `home.item.search`。 */
  readonly key: string;
  /** 读命令的出参形状；写命令不填。 */
  readonly shape?: string;
  /** 用户看到的中文名，如 `查物品`。 */
  readonly title: string;
  /** 代表唤醒词（须是路由表里真能命中本键的词；缺省则速查表退回键名）。 */
  readonly wakeWord?: string;
  /** 照抄即能跑的示例（必填非空）。 */
  readonly example: string;
  /** 处理函数（住同一能力目录的子功能文件）。 */
  readonly run: (params: Record<string, unknown>, handle: HomeDb) => unknown;
}

/** 一条路由声明（住它自己的能力目录 `src/<能力>/routes.ts` 的那一行）。 */
export interface HomeRouteSpec {
  /** 唤醒词原文。 */
  readonly phrase: string;
  /** 命中的联动 key。 */
  readonly key: string;
  /** 缺槽位（路由层即报，不进处理函数才报）。 */
  readonly needs?: readonly string[];
  /** 场景预设（路由带给处理函数的参数，如 `{op:"qty"}`）。 */
  readonly preset?: Readonly<Record<string, string | number | boolean>>;
}
