/** #721 · 路由与声明的**形状**（类型唯一处）。
 *
 * 本件只放类型与形状，**不含任何记录数据、不含任何逻辑**：
 *   - 三个路由类型（`BillKey` 键联合／`WakeEntry` 路由项／`WakeRoute` 路由结果）——今天的行为逐字不变；
 *   - 四份**声明形状**（`DomainDeclaration` / `WakeEntryDecl` / `WakeSubgroupDecl` / `WakeSceneDecl`）——
 *     各域 `declaration.ts` 写出的形状，比运行时记录多一个「场景归谁所有」的位置；
 *   - 三个**投影形状**（`WakeSceneAsset` / `WakeSubgroupAsset` / `WakeGroupAsset`）——HELP 目录那一面
 *     （`src/triggers/wake-assets.ts` 转出，路径与导出面照旧）。
 *
 * 顺序权威：词的顺序＝**域声明里 `entries` 的书写顺序**（词表由各声明按 `order` 拼接得出，
 * 不打乱、不重排）；域的顺序＝`DomainDeclaration.order`（缺号／重号 fail-closed）。
 * 谁在写声明：`src/<域>/declaration.ts` ×7 ＋ `src/help/declaration.ts`（无场景的那一份）。
 *
 * 口径出处：形状照兄弟件 `packages/skill-calorie/src/triggers/routeSpec.ts`（照结构，不照文件）——
 * 「类型唯一处、声明件只写记录」是同一条分工；住处由 [规格] 目标 src/ 形状（#720）归入
 * 「外壳与机器面」里的触发与路由机器面。
 */

/** 记账的 16 个命令名（跨技能契约，冻结不动；`bill.record.*` 六条属写入域与查询域两域共用同一前缀）。 */
export type BillKey =
  | 'bill.record.add' | 'bill.record.update'
  | 'bill.record.today' | 'bill.record.range' | 'bill.record.search' | 'bill.record.detail'
  | 'bill.analysis.overview' | 'bill.analysis.compare' | 'bill.analysis.trend'
  | 'bill.goal.write' | 'bill.goal.query'
  | 'bill.account.write' | 'bill.account.query'
  | 'bill.link.submit' | 'bill.setup.run'
  | 'bill.help.lookup';

/** 路由结果：命中哪条命令 ＋ 随命令带下去的槽位。 */
export interface WakeRoute { readonly key: BillKey; readonly params: Record<string, unknown>; }

/** 路由项（＝域声明里去掉场景的那半）；`needs`＝必需槽位（给不出就在路由层报错）；
 *  `carries`＝**不拦**、上下文里给了就带下去的槽位（改记录／撤销／恢复三条词的 `id` 住这里）。
 *  分两格的理由见 `src/policy/wakewords.ts` 的旧注释（逐字保留在本件的 `WakeEntry` 上）。 */
export interface WakeEntry {
  readonly phrase: string;
  readonly key: BillKey;
  readonly preset?: Readonly<Record<string, unknown>>;
  readonly needs?: readonly string[];
  readonly carries?: readonly string[];
}

/** 徽章类型词（老实物用到的全集；共享 help 模板 `TYPE_DEFAULT` 认得这些词，缺席即配色表要改）。 */
export type WakeSceneType = '采集' | '查看' | '选择' | '向导' | '回执';

/** 一条场景（老 HELP 卡的内容面）。**不写 `wake_word`**——那是拥有它的词条的**投影**。 */
export interface WakeSceneDecl {
  readonly id: string;
  readonly title: string;
  /** 老实物 71/71 为空串（可用）；`【待开发】` 为本仓预留态。 */
  readonly status: string;
  /** 「复制指令」按钮按出来的正文，逐字保留。 */
  readonly prompt_template: string;
  readonly types: readonly WakeSceneType[];
}

/** 一条词条：这个词怎么说、路由到哪条命令、说完看到哪几张卡（`scenes` ×0..n）。 */
export interface WakeEntryDecl {
  readonly phrase: string;
  readonly key: BillKey;
  readonly preset?: Readonly<Record<string, unknown>>;
  readonly needs?: readonly string[];
  readonly carries?: readonly string[];
  readonly scenes: readonly WakeSceneDecl[];
}

/** 一个二级组：名字 ＋ 它按序排的场景 id（场景本身住词条名下，不在这里再抄一遍）。 */
export interface WakeSubgroupDecl {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly string[];
}

/** 一份**域声明**（手写、唯一事实源）。
 *
 * 机械不变式（合并件与判据都按这几条判）：
 *   - `order` 在 8 份声明里唯一且连续，从 0 起（0＝HELP 自身位，排在所有域之前，保住今天的词序）；
 *   - 有场景的声明（`subgroups` 非空）必须有 `label` 与 `icon`；无场景的那一份（HELP 位）两者都不给；
 *   - 一个场景 id 只准被一条词条拥有一次；二级组点名的场景必须在本域内（否则合并期即抛）。 */
export interface DomainDeclaration {
  readonly id: string;
  readonly label?: string;
  readonly icon?: string;
  readonly order: number;
  readonly entries: readonly WakeEntryDecl[];
  readonly subgroups: readonly WakeSubgroupDecl[];
}

/** 投影面：一条场景卡（HELP 页读的那一层；`wake_word` 由拥有它的词条算出）。 */
export interface WakeSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly status: string;
  readonly prompt_template: string;
  readonly types: readonly WakeSceneType[];
}

/** 投影面：一个二级组（`scenes` 已是场景卡）。 */
export interface WakeSubgroupAsset {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly WakeSceneAsset[];
}

/** 投影面：一个域（HELP 一级分组）。 */
export interface WakeGroupAsset {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroups: readonly WakeSubgroupAsset[];
}

/** 投影的线索（调用方知道自己手里的哪几件事，就给哪几件）。 */
export interface WakeScope {
  /** 命令名（缺省＝在全部词条里找）。 */
  readonly key?: BillKey;
  /** 内部型名（`expense`／`lend`…）：按词条的 `preset.kind` 认。 */
  readonly kind?: string;
  /** 操作名（`undo`／`restore`…）：按词条的 `preset.op` 认。 */
  readonly op?: string;
  /** 命令的入参原样（页面标题那一支：按 preset 子集与 needs 命中）。 */
  readonly preset?: Readonly<Record<string, unknown>>;
}
