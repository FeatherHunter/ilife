# t180 影响清单 · 唤醒词数据里残留脚本命令清理（跨批 · 必报五步 · 第一步）

> 票：`#180`（卡路里唤醒词数据里的脚本命令清理）。**本文件只报清单**，用户看过再动。
> 结构判据：`docs/agents/structure.md`（五条铁律、必报五步、350 行告警线）。用词沿 `docs/agents/wording.md`。
> 复算口径：判定串 `python3?\s|\.py\b|scripts\/|mavis\s|mmx\s`，与 `docs/skills/skill-calorie/py-hardcode-scan.md:4` 同一串。
> 本文每个数字都是本席用该串对 10 个场景文件当场重算的（436 行逐行解析全成功），与那份扫描逐格一致。行号以 HEAD `1700773` 为准。

## 〇、这次要动的面（一眼表）

| 类别 | 数量 | 落在哪 |
|---|---|---|
| 改数据 | 10 个文件 | `packages/skill-calorie/src/triggers/scene-01-home.ts` … `scene-10-analysis.ts` |
| 改字段 | 375 ＋ 353 ＋ 3 | 命令字段 `main_prompt.cli`／取数来源字段 `data_source`／`variants[].cli` |
| 改源码 | 3 | `packages/skill-calorie/src/triggers/help-lookup.ts` ／ `packages/skill-calorie/src/triggers/routing.ts` ／ `packages/skill-calorie/src/render/helpCenter.ts`（只改注释） |
| 顺手修数据 | 4 条 | `scene-02-diet.ts:70-73` 餐别参数错位 |
| 改测试 | 3 处 | `test/calorie-sot.snapshot.json`（被 `test/calorie-triggers.test.mjs` 读）／`packages/skill-calorie/test/help-center-106.test.mjs`／`test/calorie-routing-81.test.mjs` |
| 新增脚本 | 1 | 快照重算脚本（住包内 `scripts/`） |
| 新增断言 | 1 处 | 防回退（落在 `help-center-106.test.mjs`，不新开文件） |

**三处票面没点到的连带面**（详见第二、五节）：
1. `packages/skill-calorie/src/triggers/routing.ts:33` **import 了** `HELP_EXEC_OVERRIDES`，并在 `:152-160`／`:374-383`／`:389`／`:534-535` 共 **22 处**用它当路由的命令文本——清补偿表前必须先把这 22 串落到 `routing.ts`，否则该文件编译即断。
2. `packages/skill-calorie/src/triggers/help-lookup.ts:154`／`:162` 自己也在用补偿表两串（合成首命中）。
3. `packages/skill-calorie/src/triggers/scene-06-goal.ts:28`（看目标历史完成，`goal_view_history_complete`）的命令字段是 `goal_history.list_completed_goals`——**既不是脚本命令、也不在本仓命令形态里**，所以它不在 375 条内，但「命令字段一律换成本仓命令」这条规则对它同样成立，建议同批改（1 条）。

## 一、改：10 个场景数据文件（命令字段 ＋ 取数来源字段）

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/triggers/scene-01-home.ts` | 9 条命令字段 ＋ 9 条取数来源字段 | 主页 9 条词全是老脚本命令 |
| `packages/skill-calorie/src/triggers/scene-02-diet.ts` | 55 ＋ 54（另见第三节的 4 条错位） | 含 `mmx` 2 条（`:9`／`:10`） |
| `packages/skill-calorie/src/triggers/scene-03-weight.ts` | 49 ＋ 49 | 体重 58 条词 |
| `packages/skill-calorie/src/triggers/scene-04-exercise.ts` | 26 ＋ 26 | 运动 39 条词 |
| `packages/skill-calorie/src/triggers/scene-05-workout.ts` | 32 ＋ 32 | 计划 32 条词全中 |
| `packages/skill-calorie/src/triggers/scene-06-goal.ts` | 11 ＋ 11 | 目标 25 条词 |
| `packages/skill-calorie/src/triggers/scene-07-profile.ts` | 1 ＋ 1（第 8 行，查档案） | 与 `#179` 同文件，见第七节串行 |
| `packages/skill-calorie/src/triggers/scene-08-body.ts` | 6 ＋ 6 | 身体细节 13 条词 |
| `packages/skill-calorie/src/triggers/scene-09-photo.ts` | 10 ＋ 10 | 身材照 10 条词全中 |
| `packages/skill-calorie/src/triggers/scene-10-analysis.ts` | 176 ＋ 155 ＋ 变体 3 条（展开 5 串，`:172` 一带） | 分析 176 条词全中；`mavis` 3 条在 `:160`／`:163`／`:170` |
| **合计** | **375 ＋ 353 ＋ 3** | 与扫描逐格一致 |

**新文本的形态规则（按路由层有没有可跑入口分两类，这一步决定哪条断言会红）**

| 类别 | 条数 | 新文本写成什么 | 为什么 |
|---|---|---|---|
| 路由层已有可跑入口的词 | **283** | 逐字抄 `routing.ts` 里该词那条 exec 路由的命令文本 | `test/calorie-routing-81.test.mjs:176-180` 要求：一旦冻结文本是本仓命令形态，路由层必须同形且**逐字相同**。抄它即可全绿；抄错一个字就红 |
| 路由层没有可跑入口的词 | **92** | 只能写自然语言，且**不许**写成 `calorie-cmd-read …` | 这 92 条在路由层是 `non-exec`（无命令字段）。写成命令形态会让 `:178` 的 `assert.equal(r.kind,'exec')` 红 |

**另有一批硬约束（这 22 条老条目没有 `key`，它们的命令字段会被当成卡面 id 显示）**：`packages/skill-calorie/src/render/helpCenter.ts:242` 把老条目的命令原文直接当卡面 `id`，落进速查台与文本态索引。所以这 22 条的新文本要满足三条：
1. **不许**写成命令形态（否则 `help-center-106.test.mjs:170`「文本态场景行不得含 `calorie-cmd-read`」红）；
2. 尖括号**恰好**只留 `看「有备注」的饮食记录` 那一个 `<N>`，其余 21 条一个都不许有（`help-center-88.test.mjs:176-185` 要求文本态尖括号集合恒为 `['<N>']`，`:183-184` 又要求至少一条带 `<N>`；`help-center-106.test.mjs:172-173` 同口径）。实测今天 22 条里只有那一条带尖括号，这是本票最容易踩空的一处；
3. 22 条新文本两两不同（`id` 撞重即 duplicate-id，用法见 `help-center-106.test.mjs:74-75` 的注释）。

**取数来源字段的近况（实测，补上扫描文档里标「推测」的那条）**：`data_source` 在 `packages/` 与 `tooling/` 里**没有任何运行时读者**——只有两处类型声明（`src/triggers/types.ts:30` 与 `:53`，后者属 `SceneDataContractV1`＝scene-data 契约 v1 的 13 个必填字段之一）与一处注释（`base-render/src/help.ts:26`）。所以本票改它是**纯数据清理**，不会带动取数行为；反过来，契约要求该字段必填，**不能整字段删掉**，只能改值（清成空串会让 22 条缺字段与 414 条空串的差异失去意义，不建议）。

## 二、改：补偿表（`help-lookup.ts`）＋ 它的两个连带处

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/triggers/help-lookup.ts:74-98` | `HELP_EXEC_OVERRIDES` 共 **23 条**（票面写 22、扫描文档一处写 22 一处写 23，实测 23 条；其中 22 条被下面那个文件真用着，`goal_view_predict` 只被测试引用） | 数据改干净后它没有存在理由；留着就是同一个概念的第二个定义地（铁律二） |
| `packages/skill-calorie/src/triggers/help-lookup.ts:100-104` | `execCliFor()`：数据干净后它退化成「原样返回入参」的转发函数 | 铁律五点名「只把别人的东西转手再给出去的转发函数」要删；调用点 `:131`（唯一调用处）与另两处直接用补偿表串的地方 `:154`／`:162` 同批改成直接用命令字段 |
| `packages/skill-calorie/src/triggers/routing.ts:33`＋`:152-160`／`:374-383`／`:389`／`:534-535` | 把那 22 串就地落成本文件里的字面文本（不再 import 补偿表） | **票面没写的一处**：`routing.ts` 现在靠 import 这张表取值，表一删该文件即断 |
| `packages/skill-calorie/src/render/helpCenter.ts:25-27` | 注释里写着「376/436 是已不存在的脚本命令」——改完这个数要跟着改 | 顺手修的注释，不然注释在说假话；该文件不留别的改动 |

## 三、改：餐别参数错位（`scene-02-diet.ts:70-73`）

| 行 | 唤醒词 | 命令字段现写 | 取数来源字段现写 | 该怎么改 |
|---|---|---|---|---|
| 70 | 看午餐（最近 7 天） | `--meal breakfast` | `--meal lunch` | 命令字段改 `lunch`（对齐全文件的正确值） |
| 71 | 看晚餐（最近 7 天） | `--meal lunch` | `--meal dinner` | 命令字段改 `dinner` |
| 72 | 看加餐（最近 7 天） | `--meal dinner` | `--meal snack` | 命令字段改 `snack` |
| 73 | 看全部餐别分布（最近 7 天） | `--meal snack` | `--meal all` | 命令字段改 `all` |

同一文件的 `:69`「看早餐（最近 7 天）」两处都是 `breakfast`，可作参照。这 4 条本来就在 375 条里，改的时候别把取数来源字段那侧的正确值丢掉。

## 四、测试①：SoT 快照 —— 票面要求先补一个可复跑的重算方式（写具体）

| 项 | 内容 |
|---|---|
| 被钉住的地方 | `test/calorie-triggers.test.mjs:41-48` 逐条比 `entry_sha`（`canon()` 在 `:13-24`，把 `main_prompt.cli`、`main_prompt.text`、`data_source`、`prompt_template`、`variants` 全算进 sha256 前 16 位） |
| 要新增的脚本 | `packages/skill-calorie/scripts/gen-sot-snapshot.mjs`（一次性脚本住包内 `scripts/`，照 `structure.md:68`；两态：`--write` 写盘、`--check` 重算后不等即 exit 1） |
| 跑的命令 | `pnpm build && node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --write`（`--check` 供门禁用） |
| 按哪个函数的口径 | 逐字照 `test/calorie-triggers.test.mjs:8-24` 的 `S()`／`L()`／`canon()`：字段序 `wake_word, category, key, name, subfunction, output_type, html_template, data_source, prompt_template, user_intent, order, depends_on_external, data_fields, desc, main_prompt.cli, main_prompt.text, aliases, fill_hints, variants` 拼 `\u0001`，列表按 `数目＋各项` 拼 `\u0002`，`undefined/null` 记空串、`true/false` 记 `1/0`，sha256 取前 16 位。数据源是 `packages/skill-calorie/dist/triggers/index.js` 的 `TRIGGERS`，条目 id 取 `key ?? wake_word` |
| 产物写到哪 | `test/calorie-sot.snapshot.json`，**只重写 `entry_sha` 段**（`entry_sha` 段在 `:16` 起，一行一条） |
| 一个必须绕开的坑 | **不许** `JSON.stringify(JSON.parse(文件))` 整体回写：该文件 `scene_counts` 里各场景的次序是 `01…10`，JS 重排后 `10` 会跑到 `01` 前面（实测整体回写长度 26125 ≠ 原 26126，首个差异就在这一段）。按行只替换 `"  \"<id>\": \"<16位>\","` 里的哈希，其余字节（1 空格缩进、文末换行）保持不动 |
| 重算范围 | 整表 436 条一起重算（只有改动到的会变），比挑条目省事，且能顺带暴露意外改动；若只重算改过的，交付时要在「事后对账」里说明 |
| 另一处语义副作用 | 这份快照是「与老实物 `scripts/_triggers.py` 逐字一致」的凭证，改 SoT 原文即永久削弱这层鉴别力。建议交付说明里写明「这次是有意偏离」，别让快照默默变化 |

## 五、测试②：另外两处必红

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/test/help-center-106.test.mjs:82-84` | 现在断言「SoT 原文里确实有 300 条以上死命令」（写作 `dead.length > 300`）——这条的前提就是本票要清掉的东西 | 数据干净后必红；改成「等于 0」并扩成三字段扫描（见第六节）。同文件 `:64-76` 那组 341／95／261 走路由层，不受本票影响 |
| `test/calorie-routing-81.test.mjs` | 五组常量全部由命令原文反推，清干净后逐条失准 | 详见下表 |

`test/calorie-routing-81.test.mjs` 逐处：

| 行 | 现在的口径 | 改完数据后会怎样 |
|---|---|---|
| `:41`／`:144-150`／`:163` | 降级词集＝命令原文含 ` → ` 且不属明确不做桶的词，必须与字面集 `WIZARD_WORDS`（5 条）逐字相等（实测 7 条派生 − 2 条明确不做 ＝ 5） | 新文本不再含 ` → ` 时派生集变空 → 红，须重导这一组 |
| `:46-61`／`:207-215` | `paramFlipRoutes()` 派生集必须恰 237 条 | 283 条变成命令形态后这个派生集只剩 2 条 → 红，须重导或改判据 |
| `:152-155` | 命令原文含 `"source":"home_caliper"` 的词必须恰是「记体脂（皮褶钳）」1 条 | 抄路由层那条命令即可保住，但抄的时候别丢这一段字面 |
| `:176-180` | 冻结文本已是命令形态 → 路由层必须 exec 且**逐字相同** | 这是第一节「283 条抄路由」这条规则的出处 |
| `:181-185` | 冻结文本不是命令形态且命中补偿表 → 路由层必须取补偿表那条 | 补偿表清掉后这条分支整体消失 |
| `:204` | 孪生词转 exec 26 条 | 由路由层派生，不影响 |
| `:219`／`:227` | 路由记录 493 ＝ 436＋56＋1；新拟入口 56 | 本票不改路由，不红 |
| `:228-238`／`:246` | 「施工前既有入口」反推集必须恰 43 个命令名，且新拟入口不得与它重复 | 283 条变命令形态后这个集合并进大半个命令表 → 红，且 `:246` 会连带大面积红；须把「施工前基线」改成冻结字面或换判据 |
| `:259-278` | 覆盖修复入口由降级词的命令原文／补偿表反推 | 同上，须重导 |
| `:293-308` | exec 桶 398 条、证据快照行数一致、逐条 exit 0 | 本票不改路由 → 条数不红；但**快照里那条非零记录**（见第八节）与本票无关地红着 |

## 六、测试③：防回退断言放哪、断言什么

**落点：就地改 `packages/skill-calorie/test/help-center-106.test.mjs:78-90` 那个用例**（它今天就是这条鉴别力的所在地，且已经 import 了 `TRIGGERS` 与路由层；不新开文件＝同一个口径不出现第二处定义）。

断言内容（三行足够）：

1. 三个位置全扫：遍历 `TRIGGERS`，对 `main_prompt.cli`、`data_source`（可能缺字段）、`variants[].cli`（可能空数组）各跑一次判定串 `/python3?\s|\.py\b|scripts\/|mavis\s|mmx\s/`；
2. 命中集合为空：`assert.deepEqual(命中列表, [])`（写法照该文件现有风格）；
3. **口径只写一处**：判定串在该测试文件顶部定义成常量（与 `py-hardcode-scan.md:4` 同一串），别在两处各写一份。

同批要保住的两条既有断言（不能为了让新断言过而删）：`:78-81`（路由层给的命令不得是旧脚本原文）与 `:85-89`（`helpSceneCli` 函数体不得出现 `main_prompt`）。另外 `packages/skill-calorie/test/help-center-88.test.mjs:176-185` 与 `help-center-106.test.mjs:166-173` 那两条尖括号断言就是第一节三条硬约束的出处，改数据时按它们校。

## 七、顺序与风险（含与 `#179` 的撞车与串行）

**顺序**

| 步 | 做什么 | 这一步会让什么红 |
|---|---|---|
| 1 | 立断言（红）：改 `help-center-106.test.mjs` 的 `>300` → `=0` 并扩到三字段；新增 `gen-sot-snapshot.mjs` 并跑一次 `--check` | 当场红：实测 375／353／3（这就是本票要清的量）；`--check` 红 |
| 2 | 改数据（绿）：先 283 条能直接抄路由的，再 92 条写自然语言，老条目那 22 条按第一节三条硬约束写；同批修第三节 4 条错位、`scene-06-goal.ts:28` 那 1 条 | `test/calorie-triggers.test.mjs:41-48` 红（快照未重算）；`test/calorie-routing-81.test.mjs` 大面积红；`help-center-88.test.mjs:176-185` 若不慎引入别的尖括号也红 |
| 3 | 重算快照：`node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --write` | `calorie-triggers` 回绿；若用了整体 `JSON.parse` 回写，会顺带改掉 `scene_counts` 里各场景的次序（见第四节，能一眼看出） |
| 4 | 重导 `test/calorie-routing-81.test.mjs` 的五组常量（第五节表里的 4 处红点） | 这一步是最大的一处；改判据时别把 `:176-180` 的「逐字相同」这条放宽（它是唯一防止抄错命令的机械保障） |
| 5 | 清补偿表：先把 22 串落到 `routing.ts`（＋ `help-lookup.ts:154`／`:162`），再删表与 `execCliFor` | 漏落一处即编译断；`test/calorie-routing-81.test.mjs:158`／`:181-184`／`:235`／`:270` 引用该表的地方同批改 |
| 6 | 复算 `helpCenter.ts:25-27` 注释里的数字 | 无测试影响，纯注释 |

**与 `#179` 的撞车（实测三处同文件／同产物，必须串行）**

| 撞点 | `#179` 怎么碰 | `#180` 怎么碰 |
|---|---|---|
| `packages/skill-calorie/src/triggers/scene-07-profile.ts` | 改 `:5-7` 三条写入词的 prompt 文本 | 改 `:8` 查档案的命令字段与取数来源字段 |
| `test/calorie-sot.snapshot.json` | 三条的 `entry_sha` 变（prompt 算进 sha256） | 全表重算 |
| `test/calorie-routing-81.test.mjs` | 改计数行（覆盖命令数 99→100、新拟入口 56→57、路由记录 493→494、exec 桶 398→399） | 改五组反推判据 |
| `docs/research/t81-exec-smoke.md` | 重生成（多一行；该脚本只读路由层） | 不动（本票不改路由） |

**建议的串行**：**`#180` 先、`#179` 后**。理由：`#180` 会重导 `calorie-routing-81` 的五组常量并把快照重算脚本落地；它先做完，`#179` 只需在同一脚本上跑一次 `--write`（3 条），并在已重导过的常量上做 +1 计数，冲突面最小。反过来若 `#179` 先做（它阻塞 `#175`／`#176`／`#177` 三张票，确有先做的理由），则必须：① `#179` 自带的 3 条 `entry_sha` 要么手改、要么顺手把重算脚本一起落地；② `#180` 起步前 rebase 到含 `#179` 的基线，**重新数一遍** 375／353／99／398 这些数（`#179` 加的那条命令在新拟入口里，会让 `:227` 的 56 变 57）；③ 两个票不许并行改同一个文件——按上面的撞点表，同文件同产物一律排队。

**350 行告警线**：本票要碰的 `packages/skill-calorie/src/triggers/routing.ts` 780 行、`help-lookup.ts` 170 行（不越线）、`packages/skill-calorie/src/render/helpCenter.ts` 483 行。`routing.ts` 已超线，动它时按必报五步第四步当场报「已超线，需要根据规则进行重构」，并说明本次为什么不拆（它是一张 436＋56＋1 条的穷举路由表，拆它要连带动 6 个测试文件与证据脚本，属别的票）。10 个场景数据文件各自 9～176 行不等，其中 `scene-10-analysis.ts` 每行一整条 JSON，改的时候只动字段值、不重排格式。

## 八、不确定／待核实

1. **`docs/research/t81-exec-smoke.md:18` 自报「非零（失败） 1」**（`复制昨日运动` exit 4），而 `test/calorie-routing-81.test.mjs:300` 断言这个数是 0——该快照最后一次改动是 `aef6ae0`（`#86`），当时断言同样写着 0。**这条今天大概率红着**，与本票无因果但会让「测试全绿」这条验收判不出来，动手前请先裁定（改种子库／把那条路由改成无单命令入口／另立裁定）。
2. **补偿表条数**：票面写 22 条、`py-hardcode-scan.md` §1 写 23 条、§6 写 22 条，实测 **23 条**（`:75-97`），其中 22 条被 `routing.ts` 用、`goal_view_predict` 只被 `test/calorie-routing-81.test.mjs:158` 引用。删表时那一条单独处理。
3. **92 条无入口词的命令字段该写什么**：本清单按票面写成自然语言，但该字段名与呈现位（`calorie.help.lookup` 的 `cli` 位 ＋ 旁边那个照着它复制的按钮）都还是「命令」语义——用户会看到一句中文写在一个「命令」位置并配一个复制按钮。若维护者认为这一位应当留空或改指向替代入口，请先裁；这会影响第一、六两节。
4. **`SceneDataContractV1`（`types.ts:44-59`）今天只被 `triggers/index.ts:16` 再导出，没有别的使用方**——按「生死」铁律它是可以删的，但本票不动它（改字段值不必碰类型）。若维护者要顺手机清，那是一次独立的改动。
5. **`variants[].cli` 的 3 条**（`查健康报告`／`查热量趋势`／`查营养结构`，`scene-10-analysis.ts:172` 一带，展开 5 串）今天**没有任何测试读它**（`help-center-106.test.mjs:12-14` 只锁「产物里不得出现变体 label／prompt」）。改它是纯清理，但也没人替它把关，建议在防回退断言里一并扫（第六节已含）。
6. **改动量本身**：375 ＋ 353 ＋ 3 条字段值分散在 10 个文件的单行整条 JSON 里，建议一次只改一个文件（01→10 按序）并每步跑一次 `node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --check` 看差集，别一次全改完再排错。
