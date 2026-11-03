/** 目录结论 → 故障码（#1327）：只看结构化读数（在不在／能不能写），不看本地化报文。
 *
 * 为什么住这里：记账／卡路里／作息三家体检各有一份「目录在不在、能不能写」的结论形状；
 * 故障码是**一个判据**，不许三家各抄一遍（铁律二·概念唯一）。本件零依赖、纯函数。
 */
export type DirFaultCode = 'DIR_MISSING' | 'DIR_UNWRITABLE';

/** 三类结论的最小读数面（各家 DirVerdict 都含这两格；reason 是给人看的，不参与分类）。 */
export interface DirVerdictShape {
  readonly exists: boolean;
  readonly writable: boolean;
}

/** 目录结论 → 故障码：不在＝DIR_MISSING、在但写不进去＝DIR_UNWRITABLE、可用＝undefined。 */
export function dirFaultCodeOf(verdict: DirVerdictShape): DirFaultCode | undefined {
  if (!verdict.exists) return 'DIR_MISSING';
  return verdict.writable ? undefined : 'DIR_UNWRITABLE';
}
