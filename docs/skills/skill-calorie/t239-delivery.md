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
| 新增源码 1：`src/shared/copyArea.ts` | 同（117 行，对外 5 个） | 无（新建的理由见清单第一节） |
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
| 全包测试 | `node --test packages/skill-calorie/test/*.test.mjs` → **430 条，429 通过，1 失败**；唯一那条是 #180 有意先红的防回退断言（`no-script-commands-180.test.mjs`，账目 733 条） |
| 边界检查 | `node tooling/check-boundaries.mjs` → PASS |
| UI 四关（6 张页 × 390／1440） | ① 横向溢出 0 件（两档全部）② 触控：<40 的 0 个；<44 的只在 1440 桌面档＝3 颗复制按钮（520×40，共享层冻结值，属 #238 待裁的口径冲突）③ 对比度低件 0／正文最小字号问题件 0 ④ 间距集合成体系 |
| 产物形态 | 10 张页（5 张 × 空库／有档案）exit 0 ＋ `<!doctype html>` ＋ charset ＋ style ＋ 无残留标记；空库查档案仍 exit 4 且不落空页（既有缺失阻断口径） |

## 四、超线与账（照 `structure.md` 第四步）

- `src/cli/write.ts` **917 行**：**已超线，需要根据规则进行重构。** 超在前（#179 起就在 900 行以上），
  本次只加一行参数传递；拆法属「命令分派重构」那条线（#181），本次不拆。
- `src/render/receipt.ts` 对外已 17 个名字（先于本票存在，破铁律五）；本次多导出一个 `nowStamp`
  （日志第 5 段的唯一时间戳来源）。拆它要动 50 处调用点，不在本票。
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
