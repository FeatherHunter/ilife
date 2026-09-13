# t168 老脚本链：场景 05 健身计划当初怎么落地

来源：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\` 下四个文件（只读）。
本文只写这四个文件能看出的事实，每条带 `文件:行号`。

## 1. 逐脚本

### 1.1 render_workout_plan.py（46272 字节，服务 13 个计划视图词）

**它是干什么的**：计划「读侧」的唯一出口——按 `--mode` 出 10 种计划视图的 结果型 HTML，只读 calorie DB，不改任何数据。

**命令行参数**（共 9 个，`render_workout_plan.py:1060-1070`）：

| 参数 | 含义 |
| --- | --- |
| `-m/--mode` | 渲染模式，10 选 1：`full/week/today/day/overview/vs/completion/missed/movement/action`，默认 `full`（`:1060-1062`） |
| `-w/--week` | 周次；`week` 模式必用，`full` 模式可用来聚焦单周（`:1063`） |
| `--date` | 目标日期 `YYYY-MM-DD`，`day` 模式用，默认今天（`:1064`） |
| `--name` | 动作名，`action` 模式用，支持子串匹配（`:1065`） |
| `--start` | 起始日期 `YYYY-MM-DD`，`vs` 模式用（`:1066`） |
| `--end` | 结束日期 `YYYY-MM-DD`，`vs` 模式用（`:1067`） |
| `--days` | 回溯天数，`missed`/`movement` 默认 28 天（`:1068`） |
| `--review` | 打开复盘 section（`full` 模式）（`:1069`） |
| `-o/--output` | 指定输出文件路径，不传则走默认命名（`:1070`） |

**产物**：模板 `templates/workout_plan_view.html`（`:36`）；默认输出路径由 `html_path(SKILL_DIR, _SCENE_NAMES[mode])` 决定（`:1051`），`write_html(html, default_path)` 落盘（`:1052`），函数返回路径字符串（`:1053`）；`main()` 把路径原样打印（`:1075-1078`，带 `--output` 时打成 `→ <路径>`）。形态：结果型 HTML，数据以 `<!--INJECT-DATA-->` 占位符注入一次（`:21`）。

**它服务本图哪些唤醒词**：模块头列了 13 个（`:4`）——看完整计划／看本周计划／看下周计划／看上周计划／看指定周计划／看今天练什么／看某天练什么／看计划概览／看计划 vs 实际／看计划完成率／看未完成训练／看动作完成率／看某动作安排。代码里的 `_SCENE_NAMES` 只认 10 个 mode（`:41-52`）：四个「看周」词共用 `week`，`today`/`day` 是两个 mode，`overview`/`vs`/`completion`/`missed`/`movement`/`action` 各对一个词。

### 1.2 render_plan_receipt.py（26252 字节，服务 11 个回执词）

**它是干什么的**：计划「写侧」的回执出口——12 个写动作各出一份 结果型 HTML 回执；真正改库的是同目录 `plan_generator`（`:133-345` 每个 builder 里 `import plan_generator` 后调 `write_plan`／`copy_plan`／`update_session`／`add_session`／`update_config`／`delete_day`／`delete_plan`），本脚本只负责拼 diff、拼摘要、出页面。

**命令行参数**（共 37 个，`render_plan_receipt.py:384-420`）：

12 个互斥 live 开关，必选其一（`required=True`，`:383`），每个开关对应一个写动作：
`--live-plan-set` 定训练计划（`:384`）、`--live-plan-copy` 复制计划（`:385`）、`--live-plan-rest` 定休息日（`:386`）、`--live-plan-add` 加训练动作（`:387`）、`--live-plan-set-week` 定一周计划（`:388`）、`--live-plan-update` 改训练计划（`:389`）、`--live-plan-update-day` 改某天训练（`:390`）、`--live-plan-delete-day` 删某天训练（`:391`）、`--live-plan-update-movement` 改动作（`:392`）、`--live-plan-delete` 撤销训练计划（`:393`）、`--live-plan-sync` 同步到训记（`:394`）、`--live-plan-backfill` 拉训记实绩（`:395`）。

25 个数据参数：
`--title`（`:396`）、`--plan-json` 完整计划 JSON `{config, weeks}`，定计划用（`:397`）、`--total-weeks`（`:398`）、`--start-date`（`:399`）、`--new-title` 复制时的新标题（`:400`）、`--week` 周次（`:401`）、`--day` 星期几（`:402`）、`--rest` 休息日开关，默认 1（`:403`）、`--session` 时段序号（`:404`）、`--name` 动作名（`:405`）、`--sets` 组数（`:406`）、`--weight` 重量（`:407`）、`--days-json` 定一周计划的整天数据（`:408`）、`--field` 改计划字段名，可重复（`:409`）、`--value` 与 field 配对的值，可重复（`:410`）、`--label` 时段名（`:411`）、`--time-start`（`:412`）、`--time-end`（`:413`）、`--total-sets`（`:414`）、`--old-name` 改动作前名（`:415`）、`--new-name` 改动作后名（`:416`）、`--date` 同步/回写目标日（`:417`）、`--results-json` 同步/回写的既有结果（`:418`）、`--chain` AI 思考链，**强制**（`:419`）、`--output` 输出路径（`:420`）。

`--chain` 由 `chain_valid` 校验，缺失或无效直接 `return 2`（`:423-425`）。

**产物**：模板 `templates/crud_receipt.html`（`:40`）；默认路径 `html_scene_path(SKILL_DIR, scene_name, 'receipt', suffix=file_suffix)`（`:503`），`write_html` 落盘（`:505`），然后打印 `✅ <路径>` 加一句摘要（`:507-508`）。文件名尾缀按场景语义取（`:472-501`）：定/复制/改计划带计划名，定休息日/改某天/删某天带「第N周周X」，加动作/改动作带（改后）动作名，定一周带「第N周」，同步/拉训记带 `YYYYMMDD`；取不到就留空，不因此中断（`:500-501`）。

**它服务本图哪些唤醒词**：模块头与代码里的场景表都给 12 个（`:5`、`:47-53`）——定训练计划／复制训练计划／定休息日／加训练动作／定一周计划／改训练计划／改某天训练／删某天训练／改动作／撤销训练计划／同步到训记／拉训记实绩。题面说这文件管 11 个回执词，正好是这 12 个里去掉「定训练计划」——它同时被 `render_plan_builder.py` 提供服务（见 1.3），口径差一个，记在「不确定」里。

### 1.3 render_plan_builder.py（4181 字节，服务 定训练计划）

**它是干什么的**：把一份计划 JSON 渲染成「定训练计划」的 过程型 HTML 预检确认页（模块头自称“过程型 HTML · AI 协同模式”，带 3 个复制按钮：采纳／修改偏好／换某动作，`:8-9`），它**不写库**。

**命令行参数**（共 2 个，`render_plan_builder.py:37-39`）：

| 参数 | 含义 |
| --- | --- |
| `--mock` | 必填，计划 JSON 文件路径（mock 或 `plan_generator` 的输出）（`:37-38`） |
| `--output` | 输出文件路径，不传走默认命名（`:39`） |

**产物**：模板 `templates/plan_builder_wizard.html`（`:28`）；默认路径 `html_path(SKILL_DIR, f'计划生成器_{input_path.stem}')`（`:115`），建好父目录后 `write_html`（`:116-117`），再打印 `✅ <路径>` 与「计划标题 · N 周 · N 场」（`:120-121`）。输入 JSON 兼容 `{data: ...}` 与裸计划两种形状（`:53-55`），缺失字段由 `normalize` 兜底补齐（`:58-88`）。

**它服务本图哪些唤醒词**：定训练计划（模块头 `:5`，`COMMAND_CN = '定训练计划'` 在 `:19`）。它出的是过程型页面，真正落库由 1.2 的 `--live-plan-set` 完成。

### 1.4 sync_plan.py（14381 字节，服务 3 个落地词）

**它是干什么的**：把「落地训练」的固定流程做成一条命令——一个脚本串起补计划（飞书日历）、记心愿（飞书 task）、训记推送、训记回写四步（`:7-11`）。模块头写明它存在的原因：以前每次 AI 都要重新拼三个工具的 CLI，SKILL.md 全文 1200+ 行，容易漏步骤，所以把固定流程沉到脚本里（`:13-15`）。

**命令行参数**（共 5 个，`sync_plan.py:300-309`）：

| 参数 | 含义 |
| --- | --- |
| `--start-offset` | 起始日偏移，0=今天、1=明天，默认 0（`:300-301`） |
| `--days` | 同步天数，默认 3 天（`:302-303`） |
| `--backfill-days` | 回写天数，默认 1 天（今天打完勾即可回写）（`:304-305`） |
| `--skip-backfill` | 跳过第 4 步回写，只做前 3 步（`:306-307`） |
| `--dry-run` | 不实际改任何数据，只打印计划（`:308-309`） |

**产物**：**不产 HTML**。它落到 disk 上的东西分三类——① 卡路里 `calorie_data.db` 里读出来的 N 天计划（只读，`:114-147`）；② 经外部 CLI 写进飞书日历的运动日程、写进备忘录库的心愿（`:172-178`、`:243-244`）；③ 训记平台的训练数据（`:270-271`、`:286-287`）。脚本自身的可见产物是 stdout 的分步进度与末尾汇总（`:312-343`）。

**它服务本图哪些唤醒词**：模块头只写了一个——`/卡路里 同步健身计划`（`:5`）。题面说这文件管 3 个落地词，另两个从这里看不出来（见「不确定」）。

## 2. 老技能的「落地训练」到底做了几步

**是四步，而且四步真的都在 `sync_plan.py` 里。** `main()` 顺序调 `step1_plan_events` → `step2_wishes` → `step3_push_plans` → `step4_backfill`（`:329-332`），第 4 步在 `--skip-backfill` 时整段跳过（`:332`）。四步之外的前置：`calc_day_plans` 读库算出 N 天计划（`:318`，实现 `:114-147`，靠 `workout_plan.get_day_plan` 逐日取 `:122`），读不到就打印「读 plan 失败」并 `return 1`（`:319-321`），随后先打一份 N 天概览（`:323-327`）。

**Step 1 · 补计划（飞书日历）**（`:150-195`）
逐个日期、逐个时段调 `作息管家/scripts/schedule_cli.py ensure-plan-event <日期> --time-start --time-end --title --notes --category 运动`（`:172-178`），标题形如「健身 <时段名> <开始>-<结束>」，备注取前三个动作拼「名字N组」（`:163-167`）。休息日和未开始的计划直接跳过并计数（`:157-160`）。按返回 JSON 的 `action` 分三种收尾：`created` 计成功并打印 `feishu_event_id` 前 18 位、`found` 计已存在、其它值计失败并打印前 120 字（`:179-191`）。
失败表现：stdout 不是 JSON 时打印 `❌ <日期> parse_err:` 并把 stdout/stderr 各截 120 字，计失败（`:192-194`）；`--dry-run` 时只打印 `DRY:` 行并算成功（`:168-171`）。

**Step 2 · 记心愿（飞书 task）**（`:198-256`）
先查重，两道：本机先直接 `sqlite3` 查 `memo.db` 的 `notes` 表按 `content + due` 严格相等（`:215` → `_check_wish_exists_direct` 实现 `:77-95`，注释说明是因为 FTS5 会把 content 里的「15:00」当列过滤解析失败导致误重建，`:77-82`、`:212-214`）；本机没有且找得到 lark-cli 时，再调 `lark-cli task +search --query <内容> --due <日期>,<日期> --format json` 比对 `summary` 与 `due_at`（`:218-232`）。两道都没有才写：`备忘录/script/memo_cli.py add <内容> --category 心愿 --due <日期>`（`:243-244`），内容形如「健身 <时段名> <开始>-<结束>」（`:210`）。
失败表现：`status != ok` 打印 `❌` 前 120 字计失败（`:250-252`）；stdout 不是 JSON 打印 `❌ parse_err:` 计失败（`:253-255`）；查重命中计「跳过」并打印 `(local=… feishu=…)`（`:234-237`）；`--dry-run` 只打印 `DRY:` 行（`:239-242`）。
另外两类静默坑：lark-cli 找不到时 `find_lark_cli()` 返回 `None`（`:67-74`），第二道查重被整段跳过（`:218`），只剩本机查重在挡重复；飞书查询 JSON 解析失败被吞成 `in_feishu = False`（`:231-232`），不会报错。

**Step 3 · 训记推送**（`:259-276`）
`--dry-run` 只按天打印「~N 段」并返回（`:263-267`）。真跑时先 `os.chdir` 到脚本所在目录（`:269`），再 `python -m xunji_bridge run-sync --days N --start-offset N`，超时 900 秒（`:270-272`），把 stdout 尾部 2000 字、stderr 尾部 500 字打出来（`:273-275`），返回 `rc`。
失败表现：**这一句这里没有分步失败判定**——脚本只看 `rc`，而 `rc` 只在末尾汇总里被打印（`:337`），既不中断流程也不影响退出码。

**Step 4 · 训记回写**（`:279-291`）
`--dry-run` 只打印 `DRY: backfill --days N`（`:282-284`）。真跑同样 `os.chdir`（`:285`）后 `python -m xunji_bridge backfill --days <backfill-days>`，超时 600 秒（`:286-287`），打印 stdout 尾 1500 字（`:288-290`），返回 `rc`。失败表现同上，只体现在汇总那一行 `rc=` 里。

**汇总与退出码**（`:334-343`）
先打三段计数（补计划 created/skipped/failed、记心愿 added/skipped/failed、推送 rc、回写 rc，`:335-341`），然后**无条件**打印 `✅ sync_plan 完成。` 并 `return 0`（`:342-343`）。也就是说 Step 1/2 里 failures 有多少条、Step 3/4 的 `rc` 是不是 0，都不会改变退出码——只有读不到计划那一种情况 `return 1`（`:319-321`）。

**异常处理的实际边界**：`run()` 只做 `subprocess.run` 的 UTF-8 包装，自己不兜异常（`:98-111`，注释说明 Windows GBK 会让中文 stdout 崩溃所以要显式 encoding，`:99-102`）。四个 `run(...)` 调用点（`:172`、`:243`、`:270`、`:286`）外面都没有 `try`，只有解析 stdout 的 JSON 那两处有大包（`:179-194`、`:245-255`）。因此「外部 CLI 不存在」「超时」这类异常会直接抛穿整个脚本，而不是被记进 failed 计数。

## 3. 老技能里「训记」这一侧是什么

只从 `sync_plan.py` 能看出来的部分（没读 `xunji_bridge.py`，其函数名一个都不写）：

- **它是同目录的一个 Python 模块**，与 `sync_plan.py` 同在 `卡路里/scripts/`（`:57` 注释明说）。
- **调用方式是子命令，不是函数**：`python -m xunji_bridge run-sync --days N --start-offset N`（`:270-271`）与 `python -m xunji_bridge backfill --days N`（`:286-287`）。模块头列的第三个子命令是 `push-plan`（`:10`、`:28`），但脚本自己从不直接调它——Step 3 走的是 `run-sync`。
- **调用前先 `os.chdir` 到脚本目录**（`:269`、`:285`），说明 `-m xunji_bridge` 靠当前工作目录找到模块。
- **超时预算**：`run-sync` 900 秒（`:272`），`backfill` 600 秒（`:287`）。
- **时间成本**：模块头说推送「每天 ~3 分钟」（`:10`），运行时打印的标题写「训记推送（每天 4 段 × 45s 限频）」（`:262`）——4 段 × 45 秒的限频节奏。
- **外部依赖**：训记侧要环境变量 `XUNJI_TRAINS_KEY`（优先，兼容 `XUNJI_API_KEY`）（`:33`）；飞书侧要 lark-cli 已登录（`:34`），Windows 默认找 `%LOCALAPPDATA%\Roaming\npm\lark-cli.cmd`，再兜底 PATH 里的 `lark-cli`（`:60-64`、`:67-74`）。
- **整体环境门槛**：Python 3.10+（`:32`），Windows/macOS/Linux 都能跑（`:36-37`）；脚本出口挂了 `_io_guard.guard_io()`（`:347`）。
- **回写的结果口径**（同一批文件里的另一处佐证，来自回执渲染器）：`backfill` 被说成「新增 N 条 / 更新 N 条」（`render_plan_receipt.py:370-373`，来源标 `xunji_bridge.backfill`），推送被说成「推送 N 条训练」（`render_plan_receipt.py:360-363`，来源标 `xunji_bridge.push-plan`）。这说明推送侧实际影响的是「条数」，回写侧影响的是本地实绩表的新增与更新行数。
- **回执渲染器只负责出页面，不负责调训记**：`--live-plan-sync` / `--live-plan-backfill` 两个分支读的是传进来的 `--results-json`，缺省就是 `pushed: 0` / `inserted: 0, updated: 0`（`render_plan_receipt.py:356-374`）——即真正的训记调用发生在渲染器之外。

## 4. 不确定

1. **产物到底落在哪个目录**：三个渲染器都通过 `html_path` / `html_scene_path`（`render_workout_plan.py:1051`、`render_plan_receipt.py:503`、`render_plan_builder.py:115`）算路径，这两个函数在 `html_paths.py` 里——不在我的阅读清单内，所以只能确定文件名的形态（场景名、`计划生成器_<输入名>`、「场景名 + 周次/动作名/日期尾缀」），不能确定目录。
2. **「11 个回执词」对不上**：`render_plan_receipt.py` 的模块头和场景表都是 12 个词（`:5`、`:47-53`），比题面说的 11 个多一个「定训练计划」，而这个词同时被 `render_plan_builder.py` 服务（`:5`、`:19`）。哪个是 05 场景的正式口径，四个文件里判不出来。
3. **`sync_plan.py` 的另外两个落地词是什么**：文件里只写了「同步健身计划」（`:5`），题面说的 3 个词里另两个看不出来。
4. **Step 3 内部到底做了什么**：`run-sync` 是否内部按天串行调 `push-plan`，只能从它收 `--days` / `--start-offset` 两个参数推断（`:270-271`）；`xunji_bridge.py` 未读，不猜。
5. **读侧文档与参数不一致**：模块头说 `today` 模式用 `--start <YYYY-MM-DD>`（`render_workout_plan.py:10`），但 argparse 里 `today`/`day` 用的是 `--date`（`:1064`），`--start` 属于 `vs` 模式（`:1066`）；实际生效的是 `--date`（`main()` 传 `day_date=args.date`，`:1073`）。是文档过时还是我漏看了 mode 内的另一条分支，未核。
6. **当初 AI 到底走的是哪条路**：是直调 `sync_plan.py`，还是照 SKILL.md 手拼三条外部命令（`schedule_cli.py` / `memo_cli.py` / `xunji_bridge`），这四个文件答不出来——只看到脚本自述「为替代手拼而存在」（`sync_plan.py:13-15`）。SKILL.md 本身不在阅读清单内。
7. **页面之间有没有互相引用**：例如回执里会不会带上计划页的路径、渲染器之间是否共享输出目录，四个文件里没有任何交叉引用，未确认。
8. **`--review` 开关的实际效果**（`render_workout_plan.py:1069`）只能从参数说明读成「打开复盘 section」，模板内具体长什么样没读。
9. **四步失败后的补跑语义**：`sync_plan.py` 没有断点续跑或状态文件，重跑靠 Step 1/2 自己的查重兜底（`:179-191`、`:215-237`）；Step 3/4 重跑会不会重复推送，未核。
