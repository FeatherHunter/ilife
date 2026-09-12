# t239 影响清单 · 复制数据／复制日志／弹提示 通用组件（必报五步 · 第一步）

> 票：**#239**（挂地图 #152 子议题）。设计正本：`docs/skills/skill-calorie/t179-copy-component-design.md`（§三 接口与归属、§四 六条待裁）。
> 结构判据：`docs/agents/structure.md`（五条铁律、必报五步、350 行告警线）。用词沿 `docs/agents/wording.md`。
> 行号以本仓当前 HEAD `3da2559` 实测为准。

## 〇、这次要动的面（一眼表）

| 类别 | 数量 | 落在哪 |
|---|---|---|
| 新增源码文件 | 1 | `packages/skill-calorie/src/shared/copyArea.ts`（票面原写「不新建文件」，本清单第一节说明为何必须新建） |
| 改源码 · 共用位 | 1 | `packages/skill-calorie/src/shared/docPage.ts`（复制与提示 5 个名字搬出，本文件只剩整页装配 2 个） |
| 改源码 · 场景 07 四张页 | 3 | `src/profile/setup.ts`（预检确认页 ＋ 两条写命令回执页）、`src/profile/update.ts`、`src/profile/view.ts` |
| 改源码 · 取时间戳唯一来源 | 1 | `src/render/receipt.ts`（`nowStamp` 由私有改导出，日志第 5 段用它，不写第二份格式） |
| 改源码 · 命令原文接进来 | 1 | `src/cli/write.ts`（`profileReceiptDoc` 多接一个 `params`，把 AI 真跑那条命令原文传进回执页） |
| 改源码 · 十个页域文件的 import 行 | 10 | 六个 `*Docs.ts` ＋ `wizardPortDocs.ts` ＋ `profile/{setup,update,view}.ts`（只改 import 行，页面产物逐字节不动） |
| 新增测试 | 1 | `packages/skill-calorie/test/copy-component-179.test.mjs`（三条性质 ＋ 日志内容） |
| 改测试 | 1 | `packages/skill-calorie/test/profile-doc-179.test.mjs`（四张页多一颗「复制日志」） |
| 重拍证据 | 1 套 | `.scratch/t239/`（四张页 × 390／1440，四关量测） |
| 逐字节对账 | 50 张页 | `.scratch/t179/snapshot.mjs before-239 / after-239`（其余 46 张页必须哈希相同） |

**不动**：`packages/base-render/**`（改动零——三件原语都已在，本组件只读它）；`src/render/copy.ts`（`copyActionHtml` 被 `test/render-copy-90.test.mjs:173-176` 逐字钉死）；其余 46 张页的调用点（本票只接场景 07 四张）。

## 一、为什么必须新建一个文件（与票面的一处偏差）

票面写「**扩**既有的 `src/shared/docPage.ts`（**不新建文件**）」。照票面做，`docPage.ts` 的对外名字会变成 **7 个**：

```
assembleDocPage、promptCopyArea、dataCopyArea、copyArea、copyLog、notice、metricsOf
```

`structure.md` 铁律五写死「**一个文件对外给的东西不多于五个**」，且是底线（「任何一条不成立，这次改动就没做完」）。票面自己算的也是「与复制／提示有关的对外名字**一共 5 个**」——正好是一个文件的上限。

故本次**就地摆正**为两个文件，对外名字一个不多：

| 文件 | 对外给什么 | 个数 |
|---|---|---|
| `src/shared/copyArea.ts`（新增） | `promptCopyArea`／`dataCopyArea`／`copyArea`／`copyLog`／`notice` —— 正是票面那 5 个 | 5 |
| `src/shared/docPage.ts`（改） | `assembleDocPage`／`metricsOf` —— 整页装配与度量投影 | 2 |

入参类型（`CopyAreaInput`／`CopyLogInput`／`NoticeInput`）**不导出**，照 `docPage.ts` 的 `DocPageInput` 现成做法（调用方传字面量即可，不进对外清单）。
十个页域文件只改 import 行：`dataCopyArea`／`promptCopyArea` 从 `shared/copyArea.js` 取，装配与投影仍从 `shared/docPage.js` 取。

## 二、三个新导出的形状（照设计 §3.1，逐条落实）

| 导出 | 吃什么 | 出什么 | 关键性质 |
|---|---|---|---|
| `copyArea(input)` | 5 个可填位：`title?`／`prompt?`／`data?`／`log?`／`emptyText?` | 一个复制区：0–3 颗按钮；**三样全没给**出一句空态、不出按钮 | `copyArea({title,data})` 与今天的 `dataCopyArea(title,data)` **产物逐字相同**（其余 46 张页可机械替换） |
| `copyLog(input)` | 本次执行的过程证据：`command`／`source?`／`m5Line?`／`actionAt`（必填）／`version?` | `CopyLogFields`（6 段的第 2–6 段入参，`buildLogText` 的正本入参类型） | 时间戳**由页面层供给**（写库页给 `receipt.meta.actionAt`、只读页给渲染时刻 `nowStamp()`）——共用位不反向依赖渲染层的取时件 |
| `notice(input)` | `msg`／`detail?`／`title?`／`icon?` | toast 形态的静态提示块（`renderFeedbackBlock` ＋ `renderToast`） | 不自造第二条提示通道 |

按钮一律走 `renderCopyBlock`（`dataActionId` 缺省 `ilife-copy-data`、`logActionId` 缺省 `ilife-copy-log`，文案取冻结缺省「复制数据／复制日志」）；序列化走 `buildDataText`／`buildLogText`。**卡路里侧不自造按钮、不自造 id、不自造序列化**。

## 三、四张页各接什么

| 页 | 文件 | prompt 区 | 数据 | 日志的第 4 段（调用链） |
|---|---|---|---|---|
| 预检确认页 | `profile/setup.ts:buildProfileSettingDoc` | 有（原样） | 有（原样） | `calorie-cmd-read calorie.view.profile-wizard` |
| 设置档案／设活动量回执 | `profile/setup.ts:buildProfileSettingReceiptDoc` | — | 有（原样） | AI 真跑那条命令原文（由 `cli/write.ts` 传入）＋ M5 整行 |
| 改档案回执 | `profile/update.ts` | — | 有（原样） | 同上 |
| 查档案结果页 | `profile/view.ts` | — | 有（原样） | `calorie-cmd-read calorie.view.profile` |

**与设计 §3.3 的一处偏差（要用户点头）**：设计写「回执页取 `receipt.meta.wakeWord`」。实测 `receipt.meta.wakeWord` 是中文唤醒词（`cli/write.ts:807` 传 `'设置档案'`），照它写会得到「`calorie-cmd-read 设置档案`」——一条跑不起来的命令。真正可照抄重跑的命令原文在调用点手里（`cli/write.ts:343` 的 `key` 与 `params`），故本次把它传进去：`calorie-cmd-read calorie.profile.set --params '{"heightCm":174,…}'`。代价：`cli/write.ts` 进本次改动面（**该文件 912 行，已超线**，见第五节）。

## 四、验收面（做完怎么证）

1. 新测试 `test/copy-component-179.test.mjs`：`copyArea` 与 `dataCopyArea` 逐字相等／给了 `log` 出第二颗按钮（id＋文案）／三样全不给出空态不出按钮／日志六段内容含命令原文与 M5 行。
2. `test/profile-doc-179.test.mjs`：四张页各含 `ilife-copy-data` ＋ `ilife-copy-log` 两颗按钮。
3. `.scratch/t179/snapshot.mjs` 改前／改后 50 张页逐字节：**除四张场景 07 页外全部哈希相同**。
4. 既有测试：`render-copy-90`（`copyActionHtml` 逐字）／`delivery-83`／`cli-smoke-t41`／五个域的 `'复制数据'` 出现断言（24 条）。
5. UI 四关：`.scratch/t239/` 四张页 × 390／1440 实拍＋量测（横向溢出 0／触控／对比度／间距）。
6. `node --test packages/skill-calorie/test/*.test.mjs` 全绿。

## 五、超线与已知账（交付时报对账）

- `src/cli/write.ts` **912 行**（本包告警线 350）→ **已超线，需要根据规则进行重构。** 本次只在 `profileReceiptDoc`／其调用点各加一行（`key` 与 `params` 已经在其作用域里），不拆：拆它属「命令分派重构」（#181）那条线，且它一行都没超在本次改动上。
- `src/render/receipt.ts` 对外已 **17 个名字**（超铁律五，先于本票存在）→ 本次多导出一个 `nowStamp`（日志第 5 段的唯一时间戳来源）。拆它要动 50 处调用点，不在本票。
- `src/render/receipt.ts` 与 `src/fetch/exercise.ts` 各有一份同名 `nowStamp`（先于本票存在的重复，两处调用方分属渲染层与取数层）。本次不动取数层，只把渲染层那份导出。
- `notice` 本票**没有场景 07 调用方**：四张页的反馈面已由页面运行时自带（复制成功／失败两种）。它的第一个使用方留给 #238 的文案返修与其余 46 张页的按域接线。
