/** #313 · 路由声明层：**类型唯一处**。
 *
 * 本件只放类型与声明形状，不含任何记录数据：
 *   - 路由记录类型（`RouteKey`／`SceneNo`／`NonExecBucket`／`ExecWakeRoute`／`NonExecWakeRoute`／`WakeRoute`）
 *     —— 与 #81 裁定 D-1～D-4 的运行时事实逐字一致（原住 `src/triggers/routing.ts`）。
 *   - 声明形状 `RouteDecl` —— 各声明件（`src/<能力>/routes.ts`）
 *     写出的记录形状；比运行时记录多两个字段：它属于哪个列表（`list`）与它在原列表内的 0 基位次（`order`）。
 *
 * 顺序权威（#313 硬约束）：`WAKE_ROUTES[i].wakeWord` 必须与 SoT 逐位对齐（断言见
 * `test/calorie-routing-81.test.mjs`）。因此**顺序事实只住声明的 `order` 字段**——生成器按 `(list, order)`
 * 排序复原三个列表；将来把记录换文件搬动，也不会打乱顺序。
 *
 * 落位与分工见对照物 `docs/skills/skill-calorie/t313-routing-oracle.mjs` 与接口冻结记录：声明件手写，
 * `src/triggers/routes.generated.ts` 由声明派生，`src/triggers/routing.ts` 只留逻辑与类型再导出。
 *
 * 记账（#313 生成器席落实）：`scripts/gen-cli.mjs` 的 `declarationSources()` 必须**显式**纳入
 * 各能力 `src/<能力>/routes.ts`——它们不在命令声明扫描面内，若不入印记则「改了声明没重建」
 * 会被直接放行（假绿）。
 */

import type { CalorieComboKey, CalorieWriteKey } from '../cli/keys.js';

/** 100 键内的路由键（读 65 ＋ 写 35；两 registry 无重叠） */
export type RouteKey = CalorieComboKey | CalorieWriteKey;

/** 场景号（与 SoT 10 场景一致） */
export type SceneNo = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10';

/** 「命中但不执行」桶内的细分标记（D-3） */
export type NonExecBucket = 'out-of-scope' | 'legacy-chain';

/** 可执行桶记录（D-2） */
export interface ExecWakeRoute {
  readonly wakeWord: string;
  readonly scene: SceneNo;
  readonly kind: 'exec';
  /** 必须在 100 键内（编译期由 RouteKey 约束，运行期由测试断言） */
  readonly key: RouteKey;
  /** 唯一出口形态：calorie-cmd-read calorie.* */
  readonly cli: string;
}

/** 命中但不执行桶记录（D-2） */
export interface NonExecWakeRoute {
  readonly wakeWord: string;
  readonly scene: SceneNo;
  readonly kind: 'non-exec';
  readonly bucket: NonExecBucket;
  /** 逐字理由（取值来自 `NON_EXEC_REASONS`，单一来源） */
  readonly reason: string;
}

export type WakeRoute = ExecWakeRoute | NonExecWakeRoute;

/** 路由声明（声明件写出的形状＝运行时记录 ＋ 归位信息）。
 *
 * 机械不变式（生成器与守门测试都按这几条判）：
 *   - `kind: 'exec'`      ⇒ `key` 与 `cli` 必有，且 `bucket`／`reason` 不出现；
 *   - `kind: 'non-exec'`  ⇒ `bucket` 与 `reason` 必有，且 `key`／`cli` 不出现；
 *   - `(list, order)` 在全部声明件里唯一，且 `order` 是该列表内的 0 基位次、连续无洞；
 *   - 同一条记录只住一个声明件：`scene` 与所在场景分片一致，或由「已搬迁键」的能力件认领。
 */
export interface RouteDecl {
  readonly list: 'wake' | 'new' | 'repair'; // 它属于哪个列表
  readonly order: number; // 原列表内 0 基位次（顺序权威）
  readonly wakeWord: string;
  readonly scene: SceneNo;
  readonly kind: 'exec' | 'non-exec';
  readonly key?: RouteKey; // kind:'exec' 必有
  readonly cli?: string; // kind:'exec' 必有
  readonly bucket?: NonExecBucket; // kind:'non-exec' 必有
  readonly reason?: string; // kind:'non-exec' 必有
}
