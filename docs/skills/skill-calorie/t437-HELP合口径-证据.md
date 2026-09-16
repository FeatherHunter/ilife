# t437 · HELP 双生 prompt 合并口径 · 证据件

票：`#437 场景 09：HELP 双生 prompt 合并口径（wake-assets 与 scene-09 分叉）`（父图 `#159`）。
票面判据：**两条 HELP 生成线合到同一口径——同一场景的 prompt 只有一处定义**。

## 一、对抗式复核：分叉今天还在吗 —— 在，而且是 10/10

探针 `.scratch/t437/probe-fork.mjs`：拿 `dist/triggers/wake-assets.js` 的 `body_photo` 组十条 prompt
与 SoT `dist/triggers/scene-09-photo.js` 的 `SCENE_09_PHOTO` 十条逐条比：

```text
不一致 body_photo_add_single / add_note / add_batch / list / detail / compare / gif / remove / tag_add / tag_remove
SoT 条数=10 HELP 场景数=10 不一致=10 缺失=0
「动笔前请先出预检确认页」出现在 HELP？否；SoT 里有 3 条
RESULT: diff=10 missing=0 flowInHelp=0
```

且源码事实：改前 `buildHelpFileData` **直接返回 `WAKE_GROUPS`**（`helpFile.ts:54`）⇒ 缺省交付件
`卡路里_HELP_<时间戳>.html` 的十条就是资产那十条 —— #345 给速查写的流程句（「动笔前请先出预检确认页」／
「动手前请先出候选页」）**在缺省 HELP 里读不出来**，分叉为真。

## 二、改法（做法 2；只用一处改动地，不动生成物）

`src/photo/helpFile.ts`：装配那一步按 **场景 id ↔ trigger key** 用 SoT 的 `prompt_template` 覆盖 `body_photo` 组十条
（新增内部件 `withScene09Prompts` ＋ 一处调用），其余字段（标题／唤醒词／分组／图标／顺序／scene 数）仍由资产给。

**没动的**：`wake-assets.ts`（生成物，头注禁令不许手改）——`wake-assets-133` 的 **sha256 指纹那条断言仍绿**；
`scene-09-photo.ts` 的十条流程句一字未回改；133 指纹未重冻。

`Trigger` 是 `SceneTrigger | LegacyTrigger` 的联合，故按 SoT 家法收窄（`'key' in t && 'prompt_template' in t`，
同 `helpLookup.ts` 的 `keyOf` 一脉），不硬转。

## 三、机器读数

| # | 读数 | 值 |
|---|---|---|
| 1 | 改前：资产 vs SoT | **不一致 10/10**；流程句在 HELP 里 **0 条** |
| 2 | 改后：**装配后的缺省 HELP** vs SoT | **不一致 0/10**；流程句 **3 条**（与 SoT 同数） |
| 3 | 资产本体仍分叉 | 10/10（本票**没去手改生成物**，符合票面「不得手改 wake-assets」） |
| 4 | 新门 `photo-help-fork-437.test.mjs` | **2 pass / 0 fail**：① 十条 prompt 与 SoT 逐字一致（含「缺场景即红」）② 整壳 HTML 里读得出流程句与落点 |
| 5 | **变异自证（两行）** | 摘掉 `withScene09Prompts`（改回 `= WAKE_GROUPS`）→ **tests 2 / pass 0 / fail 2**（改坏必红）；逐字节还原（sha256 与备份相同 → `restore-identical=True`）→ 重编 → **2/2 全绿**（还原必绿） |
| 6 | 编译 | `node node_modules/typescript/bin/tsc -b packages/skill-calorie` exit=0 |

门命令一律经 `node tooling/run-locked.mjs --ticket 437 -- <命令>`；探针与日志落 `.scratch/t437/`。

> 还原那一步踩了本仓已记录的老坑：`Copy-Item` 还原会保留旧 mtime ⇒ `tsc -b` **跳过重编**、`dist` 留着变异版
> （首轮「还原必绿」假红，`tests 2 / fail 2`）；换 `tsc -b --force` 重编后回绿（同 `t493-基线重落.md` §五 的记账）。

## 四、顺带撞上的两条跨线红（当场开票，未动手）

`photo-helpdoc-488` 三例（命令块数 ≠ 命中数）与 `wake-assets-133` 两例（唤醒词资产清单／多重集 ≠ TRIGGERS）
在本轮之前就已红：两件**都不 import** `photo/helpFile.ts`（分别走 `dist/render/index.js` 与 `dist/triggers/*`），
最可疑的是当日已落地的 `11e1ac03`（#471：`list:'new'` 族进 HELP 检索面）与 `5384ce63`（#592：删「看构建向导」＋ new 表重排）。
已开票 [#652](https://github.com/FeatherHunter/ilife/issues/652)，本票一行未碰。

## 五、未做项

- `wake-assets.ts` 的**重生成链**没有重建（票面做法 1「让 wake-assets 从 scene-09 派生」未选）；
  它是更彻底的一条，但代价是找回／重建生成链 ＋ 重冻 133 指纹，收益与做法 2 相同（prompt 单一事实源），
  故本票选做法 2 并如实记账：**资产本体仍是一份旧文案的拷贝**，只是**不再被任何交付面读取它的 scene 09 prompt**。
- 双档 vision 分未出（本会话无 `vision_*` 工具）；按 `docs/agents/视觉验收墙.md` §0 归负责人签字面（#287）。
