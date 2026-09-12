## Question

`docs/agents/structure.md` 的**必报五步**要求：写代码的票，**第一步「影响清单」与第二步「结构设计」先报用户点头**再动手。本票就是那道门——在任何人写第一行 HELP 代码之前，把形状报清、拿到点头。

用户 2026-09-12 原话裁定「**四条，照居家**」＝本图取四条新规全尺度；**形式样板是居家管家那张图**（`#183` 的 `#195` 就是同一道门）。

本票是票 5（内容资产入库 `#213`）与票 6（渲染接线 `#214`）**开工的前置**，关票条件是**用户点头**。

## 三块输入（都已到位）

- **票 1（`#209`）照抄清单**：`docs/skills/skill-chef/t1-bill-recipe.md` —— 5 件最小链（内容资产 → 渲染接线 → 命名落点通式 → 独占落盘点 → 出口分派）；8 件必改（下界）／6 件不抄；chef 侧落点 9 行候选（**未定案**）；门与告警线。
- **票 2（`#210`）对账表**：`docs/skills/skill-chef/t2-content-reconcile.md` —— **10 域中英名对照表**（铁律四的目录名来源）＋ 33 组归域 ＋ 48 条逐条对账 ＋ `groups→subgroups→scenes` JSON 草案。
- **票 3（`#211`）模板契约**：`docs/skills/skill-chef/t3-template-contract.md` —— 契约正本（5 项必填／三块可选／注入形状）、两层→三层四种落法、页面结构预期、内容不丢五个口子。

## 要定的形状（逐条）

1. **新增哪几个目录、哪几个文件**（内容资产／生成器／渲染接线／命名通式／落盘点），每个文件对外给什么（导出几个、各一句）；有没有共用件、写得出哪两个能力在用。
2. **HELP 交付算不算一个「能力」** —— `src/help/` 这种技能级落点违不违反铁律四（先例：卡路里的 `help-lookup` 是技能级查找入口，铁律四管不到它，见 `docs/skills/skill-calorie/t179-180-structure-design.md` 第五节）。
3. **10 个域的英文目录名**：**已有权威出处**，不用猜——老件十份域文件的**文件级 `domain.key`**：`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`（逐条行号见 t2 报告附表）。**但两处词形不一致要标注**：老脚本 `cooking_render.py` 对域 key `cook`、`recipe_render.py` 对域 key `view`；**以域文件 `domain.key` 为准**。
4. **两层 → 三层怎么落**：老骨架是 33 组／48 卡两层，通用 help 模板要域／组／场景三层。票 3 列了甲（域／33 老组／48 卡，1:1 保真，代价 24 组只有 1 卡）／乙（域／每域一个固定二级组，33 组名并入 title/chip）／丙（域／另造二级组）／丁（33 老组当 Tab，与用户 Q2 定案冲突）。**本票要就用户定案（Q2＝A「用那 10 个域做一级分组，48 条逐条归域」）收敛出一种。**
5. **被碰到的旧件怎么就地摆正**：`src/cli/cmd_read.ts`（**LF 388 行，已超 350 线**）、`src/fetch/db.ts`（**LF 451，已超**）、`src/render/`（工种名）、`src/policy/wakewords.ts`；哪些顺手摆正、哪些留给「整包重排」那张图外的票。
6. **告警线落点**：用户 Q4b 指定「350 ＋ LF 口径写进 `packages/skill-chef/AGENTS.md`」，而该文件**今天不存在** → 本票要不要一并建？超线两件怎么办（抽件还是登记）？
7. **每件归哪张票**（票 5 资产／票 6 渲染／票 7 出口）；票 1 查出来的「`scripts/build-help.mjs` 缺主入口守卫与换行保持」归哪张票。
8. **契约无兜底怎么防**：实测 `renderHelpShellHtml()`（`packages/base-render/src/helpShell.ts:73-80`）**唯一运行时校验是 `groups` 非空**——老家的全部硬校验（group/scene id 全局唯一、`status` 只许 `''`／`【待开发】`、scene 四元组）**在仓内 A 路一处都没有**。票 6 写错 id 或枚举**不会有任何构建期／运行期报错**，只有维护者肉眼能发现。**要不要在 chef 侧补一道资产自检（放哪、几个断言）是本票要定的形状。**

## 附：一处必须就地改掉的既有错说（2026-09-12 实测定案）

地图 Notes 原有这句是**错的**（正文已改正，此处留档以免再传）：

> 字段映射：`scenario_title→name`、`scenario_id→key`、`dimensions`（41 键）→ chip／表单。

**权威证据**（`packages/base-render/assets/help-template.html:1658-1682` 契约注释＋归一化代码；正式契约 `packages/base-render/src/spec/help.ts:30-46`）：注入层读 **`s.id`／`s.title`／`s.wake_word`／`s.types`／`s.prompt_template`／`s.status`／`s.editable_fields[{name,label,value,required,hint}]`**；`key`／`name` 是模板**内部**原型名，注入 false 会被忽略。正确换算：`scenario_id→id`、`scenario_title→title`、`prompt→prompt_template`、`type`（单数字符串，11 型）→`types`（数组）。`dimensions` 是 **42** 键（合法 41 ＋ 畸形键 `默认不含)`），落点 `editable_fields`（**不是** chip）。**照错写会得到「48 张卡标题与 id 全空」的页面。**

## 进度：0%

下一步：等票 2（`#210`）关票拿到 10 域中英名对照表与 JSON 草案，然后写形状报告报用户点头。
