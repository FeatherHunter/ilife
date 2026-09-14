# #350 关票评论稿（待用户签字后用）

> 用法：`gh issue comment 350 --body-file <本文件>`，然后 `gh issue close 350`。
> 依赖：用户对 `docs/skills/skill-calorie/t350-external-five-verdict.md` 的 §4.1 改规格句与 §五 Destination 限定句两处签字。

## 正文

用户已签 `docs/skills/skill-calorie/t350-external-five-verdict.md` 的 §4.1（改规格建议句）与 §五（Destination 限定句建议）。据此收口：

### 一、裁定结果：维持不做

场景 05 外部 5 条（落地训练／落地到本周末／落地到本月底／同步到训记／拉训记实绩，order 196–200）**维持不做**：沿用架构规格 `docs/calorie-architecture.md:60` 与 `packages/skill-calorie/src/workout/routes.ts` 的 `kind: 'non-exec'`＋`bucket: 'out-of-scope'`，**词只保证命中与文案，执行层不承接**。

不移植老 `sync_plan.py` 与 `xunji_bridge` 的推送／回写能力；其中「审计动作名」保留为只读校验，「看落地训练进度」保留读侧命令 `calorie.view.process-progress`。

### 二、HELP 文案按 §4.2 改

5 条的现用文案仍是老 `prompt_template`（写「4 步全流程」等），按 §4.2 逐条改成「暂不承接外部执行」的写法；改法归对应票，不在本票落码。

### 三、另开票（本票不做）

- 《训记推送公开接口立项（推送＋回写＋KEY 管理＋限频）》
- 《落地本地部分先行（补计划＋记心愿走公开命令）》

### 四、旧坑已登记（若将来移植须先根治）

见 §三：退出码恒 0、外部调用无超时无存在性预检、回执渲染器不调外部（只读传入的 `--results-json`）。三条都写清了移植前必须先改什么。

关票。
