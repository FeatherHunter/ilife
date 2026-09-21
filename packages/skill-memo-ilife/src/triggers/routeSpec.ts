/** 路由声明的形状（**唯一定义地**，票 #855）：一条记录＝一个唤醒词归哪条命令、去哪个 HELP 场景。
 *
 * 三处各自管什么（别混）：
 *   - **冻结词表（只读）**＝`src/help/scenes/*.ts`（HELP 官方源，8 片，每场景带 `wake_word` 与 `types`）。
 *     它是权威出处，**不在本目录另立第二份词表**（铁律二）。
 *   - **本件与各域 `routes.ts`**＝**声明面**：`src/<域>/routes.ts` 恰好导出一个 `RouteDecl[]`，
 *     这是唯一该手改的地方（加／删一个词改自己那一份）。
 *   - **`src/triggers/routes.generated.ts`**＝**记录面**（生成物）：`scripts/gen-cli.mjs` 按 `order`
 *     升序拼出 `WAKE_ROUTES`，运行期路由只读它；手改即被 `pnpm gen:check` 判红。
 *
 * 顺序权威只住声明的 `order` 字段：生成器不含任何顺序知识，将来把记录换文件搬动也不会打乱顺序。
 * 机械不变式（生成期抛，不产出半成品）：`order` 全表唯一；`wakeWord` 一条记录只住一件（跨件重复即抛）；
 * `key` 必须真在命令登记表里（删了声明不改路由 ⇒ 生成期直接点名，不落到运行期才炸）。
 */
import type { MemoKey } from '../cli/keys.js';

/** 路由记录（生成物的元素形状，＝声明去掉 `order`）。 */
export interface WakeRoute {
  readonly wakeWord: string;
  /** HELP 场景 id（`src/help/scenes/*.ts` 的 `id`，形如 `memo_search_keyword`）。 */
  readonly scene: string;
  /** 必须真在命令登记表里（`src/cli/keys.ts` 的 `MemoKey`，生成物）。 */
  readonly key: MemoKey;
  /** 照抄即能跑的一行（唯一出口形态；生成 SKILL.md 速查表用）。 */
  readonly cli: string;
  /** 缺槽位（缺哪个参数即报`POLICY_MISSING_SLOT`）；不给＝不需要。 */
  readonly needs?: readonly string[];
  /** 命中即并进参数的默认值（如 `{ category: '心愿' }`）。 */
  readonly preset?: Readonly<Record<string, unknown>>;
}

/** 路由声明（各域 `routes.ts` 写出的形状＝运行时记录 ＋ 顺序权威）。 */
export interface RouteDecl extends WakeRoute {
  /** 全表 0 基位次（顺序权威）；生成器按它升序排，空洞／重复即抛。 */
  readonly order: number;
}
