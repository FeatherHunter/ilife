# t239 交付对账 · 复制数据／复制日志／弹提示 通用组件（必报五步 · 第五步）

> 票：**#239**。第一步清单：`docs/skills/skill-calorie/t239-impact-list.md`（逐行对账见第二节）。
> 结构判据 `docs/agents/structure.md`；用词 `docs/agents/wording.md`。证据目录 `.scratch/t239/`（不入库）。

## 一、这次交付了什么

场景 07 的复制区换成一个共用件，四张结果型页面 ＋ 预检确认页各多一颗「复制日志」：

| 页 | 按钮（页内 actionId 顺序） |
|---|---|
| 设置档案／设活动量回执 | `ilife-copy-data` ＋ `ilife-copy-log` |
| 改档案回执 | `ilife-copy-data` ＋ `ilife-copy-log` |
| 查档案结果页 | `ilife-copy-data` ＋ `ilife-copy-log` |
| 预检确认页 | `ilife-help-copy-prompt` ＋ `ilife-copy-data` ＋ `ilife-copy-log` |

对外 5 个名字（`promptCopyArea`／`dataCopyArea`／`copyArea`／`copyLog`／`notice`）住
`packages/skill-calorie/src/shared/copyArea.ts`；`base-render/**` 改动**零**。
「没有可复制的数据」在渲染期出一句话、**不出按钮**（不再有点了零反馈的死按钮）。

日志六段：① 场景标识（envelope 派生）②「本页由本地 CLI 渲染，无 AI 链」③ `calorie_data.db ｜ <数据来源>`
④ 命令原文（含本次 `--params`，照抄可重跑）＋ M5 整行 ⑤ 写入时刻／渲染时刻 ＋ 文档版本 ⑥「无」。

## 二、对账（第一步清单逐行 → 实际）

| 清单那一行 | 实际 | 偏差 |
|---|---|---|
| 新增源码 1：`src/shared/copyArea.ts` | 同（130 行，对外 5 个） | 无（新建的理由见清单第一节） |
| 改源码 1：`src/shared/docPage.ts` | 同（79→60 行，对外 2 个：`assembleDocPage`／`metricsOf`） | 无 |
| 改源码 3：`src/profile/{setup,update,view}.ts` | 同（312／64／107 行） | 无 |
| 改源码 1：`src/render/receipt.ts` | 同（`nowStamp` 私有改导出，232 行） | 无 |
| 改源码 1：`src/cli/write.ts` | 同（`profileReceiptDoc` 多接 `params`，917 行） | 无 |
| 改 import 行 10 个文件 | 同（六个 `*Docs.ts` ＋ `wizardPortDocs.ts` ＋ 三个 `profile/*.ts`） | 无 |
| 新增测试 1 | `test/copy-component-179.test.mjs`（5 条用例，覆盖三条性质＋日志六段＋提示块） | 无 |
| 改测试 1 | `test/profile-doc-179.test.mjs`（多一条四张页＋预检确认页的按钮／日志断言） | 无 |
| 重拍证据 | `.scratch/t239/run.mjs`／`shots.mjs`（6 张页 × 390／1440，跑完即删旧图重拍） | 无 |
| 逐字节对账 | `.scratch/t179/snapshot.mjs before-239 / after-239` | 无 |

**两处与设计的偏差（要说清）**：

1. **新建了一个文件**（票面原写「不新建」）：照票面把 7 个名字堆进 `docPage.ts` 会破铁律五
   「一个文件对外给的东西不多于五个」；拆成 5＋2 之后，票面算的那 5 个名字一个不多、一个不少。
2. **回执页的命令原文不从 `receipt.meta.wakeWord` 取**（设计 §3.3 的原话）：实测它是中文唤醒词
   （`cli/write.ts:807` 传 `'设置档案'`），照它写会得到一条跑不起来的命令。改成由分派处
   （`key` 与 `params` 都在作用域里）传命令原文，代价是 `cli/write.ts` 进本次改动面。

**一处新增覆盖（清单没写）**：`calorie.view.profile-wizard`（预检确认页）原先**没有任何测试**
（`wizard-profile-07.test.mjs` 在 #179 里没建出来）。本次在 `profile-doc-179.test.mjs` 里补了一条，
钉住它的三颗按钮与命令原文。

## 三、验收证据（都是实跑读数）

| 项 | 结果 |
|---|---|
| 三条性质 | `node --test test/copy-component-179.test.mjs` → 5/5 绿（① 逐字相等 ② 第二颗按钮 id／文案／`data-t` ③ 空态无按钮 ＋ prompt-only 不补空态） |
| 四张页 ＋ 预检确认页 | `node --test test/profile-doc-179.test.mjs` → 5/5 绿（含「其余 32 条写命令仍是原回执片段」的反面断言） |
| **其余 50 张页逐字节** | `before-239` vs `after-239`：**50／50 哈希相同、字节相同**（`copyArea({title,data})` 与 `dataCopyArea` 逐字相等在产物层成立） |
| 全包测试 | `node --test packages/skill-calorie/test/*.test.mjs` → **424 条，423 通过，1 失败**；唯一那条是 #180 有意先红的防回退断言（`no-script-commands-180.test.mjs`，账目 733 条）。**注**：`softdelete-125`（三路径幂等）在并发跑整包时偶发一条红，单跑与重跑都绿——属测试并发噪声，本次没动过它 |
| 边界检查 | `node tooling/check-boundaries.mjs` → PASS |
| UI 四关（6 张页 × 390／1440） | ① 横向溢出 0 件（两档全部）② 触控：<40 的 0 个；<44 的只在 1440 桌面档＝3 颗复制按钮（520×40，共享层冻结值，属 #238 待裁的口径冲突）③ 对比度低件 0／正文最小字号问题件 0 ④ 间距集合成体系 |
| 产物形态 | 10 张页（5 张 × 空库／有档案）exit 0 ＋ `<!doctype html>` ＋ charset ＋ style ＋ 无残留标记；空库查档案仍 exit 4 且不落空页（既有缺失阻断口径） |

## 四、超线与账（照 `structure.md` 第四步）

- `src/cli/write.ts` **917 行**：**已超线，需要根据规则进行重构。** 超在前（#179 起就在 900 行以上），
  本次只加一行参数传递；拆法属「命令分派重构」那条线（#181），本次不拆。
- `src/render/receipt.ts` 对外已 17 个名字（先于本票存在，破铁律五）；本次多导出一个 `nowStamp`
  （写库回执的 `meta.actionAt` 与两个只读页的渲染时刻都取自它，不在别处另写一份格式）。
  拆它要动 50 处调用点，不在本票。
- `nowStamp` 另有一份私有副本在 `src/fetch/exercise.ts`（取数层，先于本票存在）；本次不动取数层。

## 五、留给谁

- **用户肉眼验收**：`.scratch/t239/shots/*.png`（ASCII 名，390／1440 两档；重点看预检确认页的三颗按钮与
  回执页的两颗按钮）。
- **其余 46 张页按域接「复制日志」**：本票只接了场景 07 五张页（票面 §3.6 第 3 步「一域一回事」）。
  接法是机械替换 `dataCopyArea('复制数据', {…})` → `copyArea({title:'复制数据', data:{…}})` 再补 `log`。
- **`notice` 暂无调用方**：四张页的反馈面已由页面运行时自带；它的第一个使用方是 #238 的文案返修与按域接线。
- **#238 的文案与排布**：复制区「标题与按钮同名」（本票四张页仍是「复制数据」标题 ＋ 两颗按钮）与
  桌面 40px 的口径冲突都还在 #238 那张票里，本次没动。
- **设计 §四 六条待裁**：本次按票面「三条硬性质」办——按钮名沿用冻结缺省、日志不带绝对路径、
  toast 时长不动、不另做日志空态、不加第三类按钮；`emptyText` 只有一句（不分数据缺／日志缺）。

## 六、提交后自审（两轴）与处置

对 `a8d3b27` 跑了两轴自审（Standards＝仓内标准 ＋ 固定坏味道基线；Spec＝票面与设计）。

**Standards 轴**：6 处硬违规 ＋ 5 处判断。处置如下（改掉的都落在后面的收口提交里）：

| 意见 | 处置 |
|---|---|
| ① `notice` 零调用方，破铁律五 | **保留**（票面点名要的三个新导出之一），但把「今天有调用方的是前 4 个」写进文件头与本文档——不含糊其辞地假装它有用方 |
| ② 文件头「谁在用」没写清 `notice` 无使用方 | **已改**：文件头点明现状与它的第一个使用方在哪张票 |
| ③ `shared/copyArea.ts` 反用 `render/receipt.js` 的 `nowStamp`（共用位反向依赖能力件） | **已改**：`copyLog` 的 `actionAt` 改**必填**，时间戳由页面层供给（写库页给 `receipt.meta.actionAt`、只读页给 `nowStamp()`），共用件不再取时钟。`render/copy.js` 那条同向依赖是 #179 留下的（`copyActionHtml` 是全技能唯一复制接线点），本次不动、记账在此 |
| ④ `envelope` 在调用处写两遍 | **不采纳**：传的是**同一个对象**（一处定义、两处引用），不是第二份定义；`LogTextInput` 的 `{envelope, copyLog}` 形状是 base-render 冻结面 |
| ⑤ `nowStamp` 两份副本（`render/receipt.ts` 与 `fetch/exercise.ts`） | **记账未动**：先于本票存在，修它要动取数层（见 §四） |
| ⑥ 对账里 `copyArea.ts` 行数写 117，实测 130 | **已改**（本文档第二节） |
| 判断类：`dataCopyArea` 是薄转发（Middle Man） | **保留**：设计 §3.6 第 3 步要用它做 46 张页的机械替换，改名会让「字节不动」这条证据失效 |
| 判断类：`CopyLogInput` 与 `CopyLogFields` 同形 | **保留**：一个是技能侧的过程证据（`command`／`source`／`m5Line`／`actionAt`／`version`），一个是 base-render 冻结的 6 段入参，语义与归属都不同 |
| 判断类：两个回执页同形 | **先于本票存在**（`update.ts` 头注释已说明为什么不合并：改档案多一整块逐字段对照） |
| 判断类：命令原文的 shell 单引号 | **已加注**：`cli/write.ts` 的 `commandLine` 注明参数值含半角单引号时要自行转义 |

**Spec 轴**：4 处缺／半、3 处范围外扩、2 处可疑。处置如下：

| 意见 | 处置 |
|---|---|
| ① 票面「数据结构＝库文件名 ＋ 本次库表名」只做一半：两个只读页没给来源，日志第 3 段只有 `calorie_data.db`（**唯一没在自报对账里说明的偏差**） | **已改**：新增 `PROFILE_SOURCE`（`profile/view.ts` 导出、写前页同目录取用——档案现值与最近体重同出一份查询，说法共用一份），两个只读页第 3 段现在是 `calorie_data.db ｜ user_profile ＋ weight_log`，并加了两条断言 |
| ② 其余 46 张页没接 | **不在本票本次范围**：票面「不加阻塞边」条与 §3.6 第 3 步都写「本票先实施，其余按域接，一域一回事」；**是否现在就接着做，请用户裁** |
| ③ 空态只在组件层（四张页走不到那个分支）、`notice` 零调用方 | **如实**：四张页必有数据，空态是给「没有可投影数据」的页准备的（46 张里才有走得到的页）；组件测试钉住它 |
| ④ UI 四关证据不在提交里（`.scratch` 不入库） | **仓约定**：`.scratch` 不入库（上一棒同样），证据在磁盘上（`.scratch/t239/`），本次已按最终代码重拍一遍 |
| 范围外扩 1：`receipt.ts` 导出 `nowStamp` | 已改为「时间戳由页面层取」（见 Standards 轴 ③），导出仍保留（`profile/` 两个只读页在用）；账记在 §四 |
| 范围外扩 2：`cli/write.ts` 加 `params` | **自报偏差第 2 条**（§二已写明：设计写 `receipt.meta.wakeWord`，实测拼出来跑不起来） |
| 范围外扩 3：设计正本与 `t179-ui-issues.md` 一并入库 | 两份都是上一棒留下的**未入库件**（前者是 #239 的设计正本、后者是 #238 的清单），本次一并入库以免设计正本丢失；要从提交里摘出可以说 |
| 可疑 1：新建 `copyArea.ts` 与设计「不新建文件」直冲突 | **需用户裁决**（理由＝铁律五，见 §二偏差 1） |
| 可疑 2：第 3 段取 `receipt.meta.source`，设计原句写 `receipt.meta.entityType` | **真偏差，补记**：实测 `meta.entityType` 收的是中文场景名（`buildReceiptMeta(scene,…)`，`cli/write.ts:827` 传 `'设置档案'`），不是库表名；`meta.source` 才是 `user_profile (写库回执)`——故改用它，票面要的「库表名」在不在 `entityType` 里 |
| 6 条待裁有没有偷偷拍板 | 没有：§五 明写 5 条保持原状；第 6 条「复制失败给谁长按」本次也没动（未挂可展开的原文预览） |
