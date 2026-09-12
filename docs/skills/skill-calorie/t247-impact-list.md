# #247 · 恢复「复制数据」三格式三选一（纯文本／JSON／CSV）——影响清单与结构设计（必报五步 · 第一／二步）

> 票：#247（`wayfinder:task`）。裁定：**用户 2026-09-12 决策 4A「恢复老仓原样」**（纯文本／JSON／CSV 三选一，
> 选中即复制该格式，并按所选格式报提示）。对比页（桌面）：`ilife-scene07\decision-2-copyformats.html`。
> 结构判据 `docs/agents/structure.md`；老仓实物：`卡路里/templates/crud_receipt.html` 的可点版本 `2262fee1~1`。

## 一、影响清单（第一步）与对账（第五步）

| 目录 | 文件 | 做什么 | 碰它的理由 | 实际 |
|---|---|---|---|---|
| `packages/base-render/src/` | `spec/controls.ts` | `CopyButtonInput` 增 `formats` 可选位 ＋ 新类型 `CopyFormatTexts` | 三格式形态的**入参形状**只能定义在契约层（`src/spec/**` 是唯一真相源） | 同 |
| 同上 | `controls.ts` | `renderActionBar` 的三格式分支（菜单标记 ＋ 三项 `data-t`）＋ 运行时委派（开合／点外收起／选中即复制并按所选取格式报提示） | 渲染产出与页面运行时都只有这一个产出者 | 同（另修一处自己引入的缺陷，见 §三） |
| 同上 | `style.ts`（`copyButton` 区） | 新增 `.copy-menu-wrap`／`.copy-menu`／`.copy-menu-item`／`.copy-menu-hint`／`.copy-menu-label` 规则 | 样式正本只有这一处；**复用 `copyButton` 区**，不新增第 9 个区（`CONTROL_STYLE_SECTIONS` 是冻结闭集） | 同 |
| `packages/skill-calorie/src/` | `shared/copyArea.ts` | `copyArea` 的 `data` 位增「三格式」开关 `dataFormats`（缺省关）；三项各自的 `buildDataText({…, format})` ＋ 老仓原样用途提示 | 复制区的门面在卡路里侧，50 处调用点只经它 | 同 |
| 同上 | `profile/setup.ts`・`profile/update.ts`・`profile/view.ts` | 场景 07 五张页开 `dataFormats: true` | 验收顺序第 2 步：场景 07 五张页先接 | 同 |
| `packages/base-render/test/` | 新 `copy-format-menu-247.test.mjs`（14 条）；`style.test.mjs`・`copy-copied-121.test.mjs` 各改一处 | 三条测试（见票面）＋ 两处既有断言随形态同步 | 测试文件不在结构纪律管辖内 | 同 |
| `packages/skill-calorie/test/` | `copy-component-179.test.mjs`（＋1 条）、`profile-doc-179.test.mjs`（＋1 条、改 1 条） | 同上 | 同上 | 同 |
| `docs/base/`（不在管辖） | `base-paint-contract.md` §3.3 | 契约正本补三格式形态与「不新增 actionId」的例外 | 契约是冻结面的正本，新增可选位必须同步 | 同 |
| `docs/`（不在管辖） | `visual-spec-blocks.md` §B-11 | 复制区规格补菜单形态 | 规格正本同步 | 同 |
| `docs/skills/skill-calorie/`（不在管辖） | 本文件 ＋ `t247-delivery.md` | 影响清单与交付对账 | 交付记账 | 同 |

**没有碰的**：`COPY_FORMATS`／`COPY_ACTION_IDS`／`COPY_TEXT_DEFAULTS`／`TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS`
等冻结常量一个字未动；`SPEC_FROZEN_SURFACE` **条目数不变**（无新出口、无新 getter）；复制日志（6 段、
单格式）未动；envelope 未动；其余 45 张页的调用点文件未动。
**偏差为零。**

## 二、结构设计（第二步）

**没有新建文件、没有新建目录、没有第 9 个样式区。** 三格式形态是「复制数据那颗按钮的另一种形态」，
落在既有件里：

| 落点 | 对外给什么 | 数得出几个 |
|---|---|---|
| `src/spec/controls.ts` | 新增 1 个**类型出口** `CopyFormatTexts` ＋ `CopyButtonInput` 1 个可选位 | `CopyButtonInput` 仍是一个类型（字段 5 ＋ 1），不新增函数 |
| `src/controls.ts` | 不新增导出（`renderActionBar` 的形态扩展）——对外仍是那 10 个名字 | 10 个（未变） |
| `src/style.ts` | 不新增导出（`buildStyleSheet` 的区内容扩展） | 未变 |
| `src/shared/copyArea.ts` | 不新增导出（`copyArea` 的入参加 1 个可选位）——对外仍是 5 个名字 | 5 个（未变） |

**铁律五自查**：`copyArea.ts` 对外 5 个名字（未变）；`CopyAreaInput` 字段 6 个（≤8）；`CopyButtonInput`
字段 6 个（≤8）。**铁律二自查**：格式键闭集仍只有 `COPY_FORMATS` 一个定义地，菜单项的 `data-fmt`
取值直接取自它，卡路里侧不自造格式名单。

**共用件归属**：菜单的标记属性／类名常量住在 `controls.ts`（产出者本处），样式住在 `style.ts` 的
`copyButton` 区——**写得出哪两个能力在用**：卡路里「基础信息」与（后续按域接线的）其余六个页域文档，
都经 `copyArea` → `renderCopyBlock` → `renderActionBar` 这一条链。

**一处与票面的偏差（记账）**：票面写「菜单项各带一个 `data-action-id`（沿用 `bindCopyAction` 的
发现机制，**不新增 id 类别**）」。实施时发现两条口径打架——三颗**逐字不同**的 id 会撞
`renderActionBar` 的「同次渲染内唯一」校验（契约 §3.3 FX-17② 与本仓既有断言），而三颗**相同**的 id
又会让 `bindCopyAction` 的 `readDataText(id)` 元素反查指鹿为马。落法改为：**开合器不挂 id**（挂
`data-fmt-open="1"` 作开合标记），**菜单项也不挂 id**（靠自己的 `data-t` ＋ `data-fmt` 分辨）——
与页面运行时的实际取数方式（读**被点击元素**自己的 `data-t`，不做 id 反查）一致，也与 HELP 速查台
逐行写同一冻结 id 的既有记账（`src/render/copy.ts` 的 R27）同口径。**`COPY_ACTION_IDS` 一个字未加。**

## 三、写代码时自己抓出的一处缺陷（第三步自查，已修并补测）

首版把「按所选格式报提示」写成了 `title.textContent = fmt ? FORMAT_OK_MSG + "（" + fmt + "）" : msg;`
——**失败**分支也带着格式名（实测：headless 里 `file://` 下剪贴板不可用 → 走兜底 → 兜底也失败，
提示成了「❌ 数据复制成功（json）＋ 失败徽章」）。修法：`bad ? msg : (fmt ? … : msg)`，失败提示照旧
取 `FAIL_MSG`。补测 B6 钉死这条（失败提示既不含成功词干、也不含格式名）。**证据**：本票 UI 实拍
`shots/set-1440-选JSON.png` 修前即该缺陷的实物。
