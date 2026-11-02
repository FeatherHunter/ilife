/** @generated —— 由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，手改无效（#1231 守漂移）。
 *
 *  客户端通道名原先是七份手写副本（六家各自的契约件 ＋ 总管导航表）；漂开一次，面板就取不到那家
 *  的配置体检（#735 实测的恒空回执）。现在唯一可编辑处是 tooling/shared-copy.json：改那张表再跑
 *  `node tooling/gen-shared-copy.mjs`，`--check` 判「盘上 ≡ 表派生」。
 */
export const RPC_CHANNEL = '/ilife-home-ilife' as const;
