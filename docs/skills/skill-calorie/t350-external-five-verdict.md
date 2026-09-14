# #350 卡路里场景05：外部5条结局记录（落地×3／训记×2）

> 本票纯文档活，不落码，未跑外部命令。引用命令均注明出处文件。
> 认领：`gh issue edit 350 --add-assignee @me` 已成（回显 issue 链接，exit 0），assignees 此前为空。
> 相邻票只读正文：#349 写命令·变更类（5条改／删，验收 `scene05-write-mutate.test.mjs`），#351 真机端到端＋肉眼终审（32条实跑证据＋用户回执），#157 地图 Destination 要求 32 条从头走到尾、结果型 HTML 落盘、回执给绝对路径。

## 一、5条对照表（order 196–200）

| order | 唤醒词 | 老实现（只读仓外） | 老模板／类型 | 新仓路由今天 | 仓内规格依据 |
|---|---|---|---|---|---|
| 196 | 落地训练 | `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\sync_plan.py --days 1`（4步：补计划→记心愿→训记推送→训记回写，见 `sync_plan.py:7-11`） | `process_progress.html`／过程型（`t168-scene05-reconcile.md:33`） | non-exec／out-of-scope，理由 oosLanding（`packages/skill-calorie/src/workout/routes.ts:32`） | `docs/calorie-architecture.md:60` 落地列入“命中但不执行”；`t180-command-gap-classification.md:81` 记“开发”（要计划写命令＋外部推送两样） |
| 197 | 落地到本周末 | `sync_plan.py --days <N>`（同上，按天批量，标题“每天4段×45s限频”，`sync_plan.py:262`） | `process_progress.html`／过程型（同表:34） | non-exec／out-of-scope，oosLanding（`routes.ts:33`） | 同上；`t180:82` 记“同落地训练，另要按天批量” |
| 198 | 落地到本月底 | `sync_plan.py --days <N>`（同上，跨月批量） | `process_progress.html`／过程型（同表:35） | non-exec／out-of-scope，oosLanding（`routes.ts:34`） | 同上；`t180:83` |
| 199 | 同步到训记 | `render_plan_receipt.py --live-plan-sync --date <D> --chain "1.审计动作名→2.推送→3.回执"`（`t168:104`；回执读 `--results-json`，缺省 `pushed:0`，`t168-old-script-chains.md:118`）＋ `xunji_bridge/push.py:push_day_plan`（45s限频，`push.py:29`） | `crud_receipt.html`／结果型回执（`t168:36`） | non-exec／out-of-scope，oosXunji（`routes.ts:35`） | `docs/calorie-architecture.md:60` 训记列入“命中但不执行”；`t180:84` 记“缺取数与写库（推送动作名到外部应用）” |
| 200 | 拉训记实绩 | `render_plan_receipt.py --live-plan-backfill --date <D> --chain "1.拉取→2.回写→3.回执"`（`t168:105`；缺省 `inserted:0,updated:0`，同上）＋ `xunji_bridge/backfill.py:backfill_range`（幂等键 `xunji_localid+set_index`，`backfill.py:7`） | `crud_receipt.html`／结果型回执（`t168:37`） | non-exec／out-of-scope，oosXunji（`routes.ts:36`） | 同上；`t180:85` 记“缺取数（从外部应用读实做并回写）” |

补充：老 `render_plan_builder.py`（`COMMAND_CN='定训练计划'`，`:19`）只出过程型预检确认页、不写库（`t168-old-script-chains.md:50`），与本票5条无直接关系，仅说明“定计划”是落地链的数据源头。`xunji_bridge/__main__.py:29-35` 自述退出码 0成功／1一般错／2鉴权失败／3 API报错／4校验失败，8子命令含 `verify/fetch/upsert/push-plan/overlay-plan/backfill/key/run-sync`。

## 二、可执行性判定（逐条一句话，只走对方公开接口）

- order 196 落地训练：**转裁定**——4步链中第3/4步（训记推送／回写）在本仓无任何公开推送或拉取命令可走（只有 `packages/skill-calorie/src/fetch/xunji-catalog.ts:49` 的只读动作名校验 `verifyMovementName`），且训记是外部应用（要 KEY＋网络＋45s限频），无“对方公开接口”，单命令跑不通。
- order 197 落地到本周末：**转裁定**——同196，另加按天批量需串行多天（老实现 `run-sync --days N` 超时900秒，`sync_plan.py:270-272`），更无单命令同形，跑不通。
- order 198 落地到本月底：**转裁定**——同197（跨月批量），跑不通。
- order 199 同步到训记：**转裁定**——“审计动作名”一步可用只读校验跑通（`verifyMovementName`／`verifyMany`，`xunji-catalog.ts:49-62`），但“推送”一步无公开命令（`push.py` 的 `push_day_plan` 未移植，全仓无 `push_day/upsert_trains` 对应命令），整条跑不通。
- order 200 拉训记实绩：**转裁定**——本仓无拉取命令（`fetch/fetch_trains`、`backfill_range` 均未移植；`fetch/cross-skill.ts:39-41` 跨读框架在命令未配置时直接阻断 `ok:false`，且训记不在技能互联域内），整条跑不通。

可复用的公开命令（裁定材料中引用，不单独成可执行路由）：作息 `schedule.plan.write`（`op=ensure/upsert`，`packages/skill-schedule/src/cli/cmd_read.ts:241` 分支，含 `ensurePlanEvent` 幂等）可承接“补计划”一步；备忘录 `memo.create`（`packages/skill-memo-ilife/src/cli/cmd_read.ts:169`）可承接“记心愿”一步（`memo.wish` 只是读心愿列表，`:207-208`）；卡路里自身 `calorie.view.process-progress`（`packages/skill-calorie/src/workout/commands.ts:38`）只是读侧进度（计划＋近7天执行，`render/trendMiscPort.ts:378-402`），不是落地执行。5条中没有任何一条能用“一条公开命令达成其所述能力”。

## 三、旧坑处置说明（若将来移植必须根治，不在本票落码）

1. **退出码恒0**：`sync_plan.py:main` 汇总后无条件 `print("✅ sync_plan 完成") + return 0`（`:342-343`）；Step3/4 的 `rc` 只打印（`:337-339`）不影响退出码；Step1/2 的 `failed` 计数只打印（`:335-336`）。唯一非0是读不到计划 `return 1`（`:319-321`）。移植时必须改为“任一步失败即非0退出＋失败即不落盘”，对齐判据“凡落码先出实跑证据”。
2. **外部调用无保护**：`run()` 只是 `subprocess.run` 的 UTF-8 包装（`:98-111`），4个调用点（`:172` 作息、` :243` 备忘录、`:270` run-sync、`:286` backfill）外无 `try`；“外部程序不存在／超时”会直接抛穿（`t168-old-script-chains.md:104`）。另有两处静默吞错：飞书查询 JSON 解析失败记 `in_feishu=False`（`:231-232`）；lark-cli 找不到时第二道查重整段跳过（`:218`）。移植时必须加超时＋存在性预检＋失败计数进退出码，超时预算不得照抄900/600秒。
3. **回执渲染器不调外部**：`--live-plan-sync/backfill` 只读传入的 `--results-json`（缺省0，见上），真正调用发生在渲染器之外——将来若做命令，必须把“调用→回执”收进同一命令的取数层，不得复用“先外部跑、再手动贴结果渲染”的老做法。

## 四、裁定材料（待用户签字）＋HELP差文

### 4.1 改规格建议句（5条共用一句，请用户签字）

> 场景05外部5条（落地训练／落地到本周末／落地到本月底／同步到训记／拉训记实绩）维持 `docs/calorie-architecture.md:60` 与 `routes.ts:32-36` 的“明确不做（落地／训记）；词只保证命中与文案，执行层不承接”，不移植 `sync_plan.py` 与 `xunji_bridge` 的推送／回写能力；其中“审计动作名”保留只读校验，“看落地训练进度”保留读侧进度命令；用户若要推翻，需另开票立项（见§六），不在本图内做。

### 4.2 HELP差文（每条：现状 → 建议，用户签字后由对应票改 help 模板）

- 落地训练：现状 help 仍沿用老 `prompt_template`“补计划到日历、记心愿、推送到训记、拉取训记实绩4步全流程”（`scene-05-workout.ts:25`）→ 建议改为“暂不承接外部执行；已落地的计划可用读命令查看，可用 `calorie.view.process-progress` 看落地训练进度；要真正推日历／推训记请等立项票”。
- 落地到本周末／本月底：现状同上（批量口径，`:26-27`）→ 建议改为“批量落地暂不承接；可按天用读命令查看计划；批量口径（跨天汇总＋总完成度）待立项票定义后再补”。
- 同步到训记：现状“推送前先检查动作名”（`:28`）→ 建议改为“只做动作名只读校验（认不认识先告诉你），推送到训记 App 暂不做；校验不通过的动作名会给出建议名”。
- 拉训记实绩：现状“拉回来写进运动记录，如有冲突请提示”（`:29`）→ 建议改为“从训记拉取并回写暂不做；已记录的运动可用运动侧读命令查看；冲突处理口径待立项票定义”。

### 4.3 待签记录

- [ ] 用户签 §4.1 改规格句（签则本票5条以“待签裁定”结局关闭，HELP 改法进 §4.2 的对应票）。
- [ ] 用户签 §五 Destination 限定句建议句。
- [ ] 不签则本票保持打开，不落码（票面“未经用户签字的规格不落码”）。

## 五、收口建议（只建议，不改 #157 正文）

地图 #157 Destination 限定句更新建议句（请地图设计者写入正文 Decisions so far）：

> 场景05外部5条（落地×3／训记×2，order 196–200）以“做到可跑，或经用户裁定改规格＋改 HELP”为准；本次裁定为维持不做（§4.1），HELP 按 §4.2 改文案；#351 端到端验收时这5条只验“命中＋文案”，不验执行。

附带发现另开票建议：

- 建议新开票《训记推送公开接口立项（推送＋回写＋KEY管理＋限频）》——理由：老 `xunji_bridge` 有完整契约（`__main__.py:8-13` 8子命令、`push.py:29` 45s限频、`backfill.py:7` 幂等键），但新仓零移植（只有只读校验）；是否做、密钥放哪、限频谁守，需用户先立项。本票不做。
- 若用户想先拿到部分价值，可另开票《落地本地部分先行（补计划＋记心愿走公开命令）》——路由为 `schedule.plan.write(op=ensure)`＋`memo.create`，训记两步仍裁定不做。本票不做。
- 无其他发现。

## 六、机器证据与文件清单（省上下文：大输出只给判定＋路径）

- `gh issue view 350 --json number,title,body`：OPEN，标题“卡路里场景 05：外部 5 条有结局（落地×3／训记×2）”，正文要点：逐条有结局／先查老实现与排除条款／只走对方公开接口／旧坑根治／交付物落 `docs/skills/skill-calorie/`。
- `gh issue view 157/349/351`：只读正文（#157 Destination＋Out of scope 10条含落地3训记2；#349 变更类5条；#351 端到端＋肉眼终审）。
- 只读源码（未改 `packages/`）：`scene-05-workout.ts:25-29`（5条 data_fields 含 `depends_on_external:true`）、`workout/routes.ts:32-36`（order 196-200）、`triggers/routing.ts:87-90`（oosXunji/oosLanding）、`fetch/xunji-catalog.ts`（只读校验）、`fetch/cross-skill.ts`（未配置即阻断）、`render/trendMiscPort.ts:365-402`（读侧进度）、`skill-schedule/src/cli/cmd_read.ts:241`（plan.write）、`skill-memo-ilife/src/cli/cmd_read.ts:169,207`（create／wish）。
- 只读仓外（未拷入仓）：`scripts/sync_plan.py`（348行）、`scripts/render_plan_builder.py`（127行）、`scripts/xunji_bridge/__main__.py/push.py/backfill.py`、老 `scripts/_triggers.py:2121-2167`（5条 cli 行）。
