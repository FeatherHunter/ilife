## Question

把**通用 help 模板**的注入契约读透，并给出私家大厨每一项的取值来源：

- 模板源：`packages/base-render/assets/help-template.html`——它是**生成物** `src/helpShell.ts` 的源，改源要跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红。
- 出口：`base-paint@0.3.0` 的 `./help-shell`（`renderHelpShellHtml`）。
- 样板：照 #143 的 #145 票（5 项必填 ＋ 三块可选内容），逐字对齐它读的是哪些字段。

要回答：

1. 5 项必填 ＋ 三块可选（`meta_blocks`／`version`／`init_banner`）的准确形状与渲染落点（以代码为准，不以文档为准）。
2. 私家大厨的 `groups`（10 域／33 组／48 场景）怎么喂进模板——注意老件是**两层**（33 组／48 卡），而模板要的是**三层**（域／组／场景），中间那层怎么落。
3. `meta_blocks` 两块（HELP 汇总 ＋ HELP 唤醒词）的内容怎么派生（照记账：一处算、两处用）。
4. `version` 取什么（老家 `scenarios.yaml` 里有没有版本号；记账取技能数据世代、不是 npm 包版本）。
5. `init_banner` 的显隐口径：老家是「DB 文件存在＝已初始化」；新仓要不要照搬、要不要「跑完不建库」。
6. `contact` 的取值（老家 payload 的 `meta` 里有什么可用的）。
7. 文档标题怎么派生（`composeDocTitle`）、有没有原型水印这类要一并清掉的东西。

产出：`docs/skills/skill-chef/t<本票>-template-contract.md`。

## 进度：0%

下一步：research 子代理已派，报告回来即贴票面并关票。
