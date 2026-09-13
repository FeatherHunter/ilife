# t164 · skill-calorie 的 SKILL.md 与 HELP 页现状（只读取证）

范围：`packages/skill-calorie/SKILL.md`、其构建期注入、HELP 交付实物里的「目标管理」分组、`scene-06-goal.ts` 的 25 条唤醒词。
会话结论一句话：**今天没有任何一处告诉 AI「先出哪张页 → 再跑哪条命令 → 交付什么」**；AI 能拿到的只有「一条命令」（22 条）或「一串散文链」（3 条）。

---

## 一、SKILL.md 现状

### 1.1 谁生成它、哪一段是构建期注入

- 注入脚本：`packages/skill-calorie/scripts/build-help.mjs`。标记常量在 `build-help.mjs:8-9`（`<!-- HELP-AUTO-START -->` / `<!-- HELP-AUTO-END -->`）。
- 注入内容＝`buildHelpBlock()`（`build-help.mjs:209-221`）：**100 行**「唤醒词 | 命令 | 形状 | 例」表（＝`CALORIE_COMBOS` 实况条数，实测 100）＋ 一行「相关场景」＋ 一行照片 HELP 模块说明。例文本全部来自 `exampleFor()`（`build-help.mjs:97-207`），新命令落 `default` 直接抛（`build-help.mjs:205`）。
- 表里「唤醒词」列来自手写常量 `REPR`（`build-help.mjs:12-95`）；没有 REPR 的条目**直接拿命令名冒充唤醒词**（`build-help.mjs:214` `const wake = REPR[k] || k;`）。
- 只重写两个标记之间的内容，其余字节不动（`build-help.mjs:224-228`）；标记缺失即抛（同处 226）。被 import 时不写盘，只在当脚本跑时写（`build-help.mjs:242-246`）。
- 落点：`SKILL.md` 的 **L80-L186**（`<!-- HELP-AUTO-START -->` 在 L80，`<!-- HELP-AUTO-END -->` 在 L186）；标题写在 L78 并注明「勿手改」。
- 实测体量：文件 **211 行 / 24253 字**（任务书写 183 行，与实测不符，疑为更早版本）。其中两个标记之间的 AUTO 块 **L81-L185 共 105 行 / 15722 字＝全文件 65%**；L184 那一行「相关场景」单行 **2448 字**。

### 1.2 逐条体检（对照 `writing-for-agents` 规范条目）

| 规范条目 | 体检结果 | 证据 |
|---|---|---|
| 上下文指针 | 常驻指针只有 L3 的 `description`（532 字，其中 437 字是「触发词：」后面那串 69 个唤醒词）：它把 69 个唤醒词摊成一张清单，却把整个技能描述成一件事「『卡路里HELP』→ 出 HELP 文件」。正文覆盖 436 条唤醒词，指针只挂了 1 个分支；规范要求「一个分支一条触发语」，这里等于把分支清单当成触发语 | L3 |
| 上下文指针 | 正文里的指针只有安装器/预检查类：`docs/public-installer-47.md`（L205、L206、L211）、`docs/research/t163-precheck-precedent.md`（L72）。**没有任何指针指向「某条唤醒词该走哪条流程」的材料** | L72、L205-L211 |
| 渐进披露 | 没有。全文 211 行单文件，100 条命令的对照表整表内联在正文中段，读者每次全量付费；被指向的 3 份 docs 都与流程无关 | L81-L185 |
| 完成判据 | 只有 Wizard Verify 铁则给出判据式收尾（违规回执逐字 + 「同轮修正 ≤3 次」），且只覆盖 6 类配置词。其余步骤没有「做完了」的条件：`快速开始` 只是 7 条例句，没说跑完该看到什么 | L76（判据）；L14-L24（只有例句）；L49-L53（只列 6 类词） |
| 完成判据 | 「定体重目标」这类写词没有「先出哪张页 / 确认后再写」的判据——预检确认页的规则 L51-L53 只写了「记体脂／记围度／定训练计划／设置档案／设活动量／改档案」6 类，**目标管理 13 条写词不在其列** | L11、L51-L53 |
| 禁止式表述 | 多处靠禁止驱动，规范建议改成正向目标：L75「禁止：用户给了数据仍跳过 verify」、L76「不得静默补记」、L73「不得承诺 verify 后写入」、L78「勿手改」、L190「别再给它加参数」、L191「不会自动刷新」、L45「模板不再做数学」 | 逐行见左列 |
| 重复（同一意思两处） | L184「相关场景」把 L81-L182 刚列过的 100 条命令**再逐条列一遍**（2448 字纯重复）；`calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` 出现 3 次（L23、L105、L208）；`calorie.help.center` 出现 4 次（L10、L17、L190、L191）；`看今日主页` 出现在 L23、L105、L152 | L184、L23/L105/L208 |
| 重复 | 同一唤醒词被指到两条不同命令且都写在同一张表里：`定营养目标` → L101 写命令 / L143 查看命令；`定体重目标` → L103 写命令 / L150 查看命令。AI 看到同名两行、形状不同，没有一句话说该挑哪行 | L101+L143、L103+L150 |
| 堆积 | AUTO 块占全文件 65%，其中表头下方的 100 行是构建期把 `CALORIE_COMBOS` 全量倒出，属于「环境里查得到的东西抄进文档」 | L81-L185 |
| cache（把环境能查到的东西抄进来） | L30 的退出码表、L37-L39 的信封字段与形状、L31 的落点命名规则、L8/L33 的命令条数与表结构＝把 CLI 与命令登记表的实况抄了一遍；L204-L207 的安装命令与版本号＝把 `package.json`（实测 version 0.2.3）与安装文档抄了一遍。文档说「引擎要 ≥22.13 + 必须有 SKILLS_DB_PATH」，这条属于环境查不到的运维前提，可以留 | L30、L31、L37-L39、L204-L207 |
| 陈旧层 | L63 还在写「当前不可写：95 条命令里没有训练计划写命令」，与本文件 L33 的行文（写链已含 35 条写命令）并存；两处口径要读者自己对齐 | L63、L33 |
| 陈旧层（抄进文档的数字失效） | L39 手写「读 64 条 + 写 35 条共 99 条」，而同一文件 L184 是构建期注入的「100 组合」，命令登记表实况也是 100 条——手写的那半已经落后一条 | L39、L184 |
| 唤醒词列冒充 | **18 处**表行的「唤醒词」列直接是命令名而不是唤醒词（目标管理区就有 `calorie.view.goal-expiring`、`calorie.view.goal-predict`、`calorie.view.goal-vs-actual` 三处），拿这张表反查唤醒词会查不到 | L144、L145、L149（全表 18 处） |
| 反例（AI 会走错） | 唤醒词 `记身材照` 在同一张表里被指到两个不同命令：L104 指向 `calorie.help.center`，L107 指向 `calorie.photo.add`。前一条是 REPR 手写映射（`build-help.mjs:57`），与真实归属不符 | L104、L107 |
| 反例 | L12 把对照表当成「唤醒词 → 命令」的答案，但那张表的「唤醒词」列有 18 处是命令名，另有 6 个唤醒词各占两行以上（`记身材照`、`看今日饮食概览`、`定营养目标`、`看今日目标进度`、`定体重目标`、`看今日主页`），**它不是可反查的对照表** | L12 |

### 1.3 一个 AI 拿到「定体重目标」时，SKILL.md 今天给它什么

能拿到：

- L103：`| 定体重目标 | calorie.goal.weight | receipt | calorie-cmd-read calorie.goal.weight --params '{"kg":68}' |` → **命令名 + 一条可跑例句 + 形状（回执）**。
- L150：`| 定体重目标 | calorie.view.goal-weight | stat | … |` → 另一条同名行，指向查看命令。

拿不到（缺什么）：

1. **先出哪张页**：写前该出 `templates/goal_weight.html`（该字段写在场景数据 `scene-06-goal.ts:7` 的 `html_template`），但 SKILL.md 全篇不含这个文件名，且本包 `src/`（`triggers/` 之外）**零处消费 `html_template`**——这条页面信息今天在新实现里是断的。
2. **再跑哪条命令**：只有一条例句，没有「先确认、确认后写」的次序判据（目标类不在 L51-L53 的 6 类配置词里）。
3. **交付什么**：只给了形状名 `receipt`，没说交付物是回执片段还是整张页、落到哪里（落点规则在 L31，是全局的，不是这条场景的）。
4. 反过来，L150 那条同名行会让 AI 以为「定体重目标」是查看动作（`stat`），与 L103 的写动作冲突且无裁决语。

---

## 二、25 条唤醒词 → 工作流程 现状映射（目标管理）

说明栏用四个来源代号：
- **A** ＝ `main_prompt.text`（唤醒词提示词自身；HELP 页「复制」按钮给的就是它）；
- **B** ＝ `main_prompt.cli`（唤醒词数据自带的命令字段；`calorie.help.lookup` 返回的 `cli` 就是它，`help-lookup.ts:121-130`）；
- **C** ＝ SKILL.md 联动速查表（构建期注入的那张表）；
- **D** ＝ `routing.ts` 有命令可执行的路由（AI 拿不到，只能经 `help.lookup` 间接得到）。

| # | 唤醒词 | 今天的工作流程说明在哪 | 说了几步 | 缺哪一步 |
|---|---|---|---|---|
| 1 | 定营养目标 | A＋B（`scene-06-goal.ts:5`）＋C（L101） | 1 | 缺「先出哪张页 / 确认后再写」；缺交付说明 |
| 2 | 定营养目标(自动算) | A＋B 写的是一条散文链（`goal-recommend` → 确认后 `goal.set`）；D 判**没有命令可执行**（`routing.ts:368`） | 2（散文） | 缺可执行入口：第 2 步的命令在字段里被「确认后」三个字隔断，不能照抄 |
| 3 | 定体重目标 | A＋B（`:7`）＋C（L103、L150） | 1 | 缺「先出哪张页 / 确认后再写」；正文两行同名指向读/写两条命令 |
| 4 | 定体重目标(自动算截止) | A＋B（`:8`）；C 无、D 有命令 | 2（算截止 → 写） | 「算」只有提示词里的文字，没有算法口径指针 |
| 5 | 定体重目标(含起始日) | A＋B（`:9`）；C 无、D 有命令 | 1 | 同 3 |
| 6 | 定饮水目标 | A＋B（`:10`）＋C（L102） | 1 | 同 3 |
| 7 | 定饮水目标(自动算) | A＋B 散文链；D 判没有命令可执行（`routing.ts:373`） | 2（散文） | 同 2 |
| 8 | 一键定全套目标 | A＋B 散文链（`recommend` → 依次 3 条写命令）；D 判没有命令可执行（`routing.ts:374`） | 4（散文） | 同 2；且 4 条命令用「＋」串起来，照抄即报错 |
| 9 | 看今日目标 | A＋B（`:13`） | 1 | 缺「体重目标要引导到另一条唤醒词」的落点说明（提示词里只说了「请引导我」） |
| 10 | 看本周目标 | A＋B（`:14`） | 1 | 示例窗口名（start/end）与「本周」的算法口径无指针 |
| 11 | 看营养目标进度 | A＋B（`:15`） | 1 | 无（命令即产物） |
| 12 | 看体重目标进度 | A＋B（`:16`） | 1 | 命令字段本身对；但 `help.lookup` 用这条唤醒词查，**首命中给的是 `view.goal-progress`**（见 §四） |
| 13 | 看饮水目标进度 | A＋B（`:17`） | 1 | 无 |
| 14 | 看目标对比实际 | A＋B（`:18`） | 1 | 提示词声明「默认 30 天」，命令示例给的是 3 天窗口（见 §四） |
| 15 | 看目标完成度 | A＋B（`:19`） | 1 | 无 |
| 16 | 看即将到期的目标 | A＋B（`:20`）；C（L144）示例参数与 B 不一致 | 1 | 提示词支持自定义窗口，命令字段无窗口参数（见 §四） |
| 17 | 看目标完成率(按周) | A＋B（`:21`） | 1 | 无 |
| 18 | 看目标完成率(按月) | A＋B（`:22`） | 1 | 「本月」与示例窗口（当月至今 7 天）的口径无文字说明 |
| 19 | 改营养目标 | A＋B（`:23`） | 1 | 缺「改前值从哪读」（提示词要求预估影响，命令只写新值） |
| 20 | 改体重目标 | A＋B（`:24`） | 1 | 缺「改前值 + 新速率建议」的步骤说明 |
| 21 | 改饮水目标 | A＋B（`:25`） | 1 | 缺「改前值」步骤说明 |
| 22 | 暂停所有目标 | A＋B（`:26`）＋C（L99） | 1 | 缺「恢复入口」这条后续动作的说明（提示词要求提示，文档无对应） |
| 23 | 重启所有目标 | A＋B（`:27`）＋C（L100） | 1 | 无 |
| 24 | 看目标历史完成 | A＋B（`:28`） | 1 | 提示词声明「默认 30 天」，示例给 3 天窗口（见 §四） |
| 25 | 看目标预测达成 | A＋B（`:29`） | 1 | 无（提示词说体重部分复用另一条逻辑，无指针） |

归总：

- **25 条全部有 A（提示词）＋B（命令字段）**；其中 6 条的唤醒词在 C 里有自己的一行（`定营养目标`、`定饮水目标`、`定体重目标`、`定营养目标(自动算)`、`暂停所有目标`、`重启所有目标`），`看今日目标` 只在 L142/L146 里作为 `看今日目标进度` 的子串出现——**19 条在 SKILL.md 里查不到自己**。
- **达到「先出哪张页 → 再跑哪条命令 → 交付什么」三要素的：0 条。**
- **有可执行命令、页面与交付都靠命令自身默认行为的：22 条**（12 条读词 ＋ 10 条写词；读词是「一条命令即产物」，写词除回执外没有页面与确认步骤）。
- **连一条可执行命令都没有的：3 条**（定营养目标(自动算)、定饮水目标(自动算)、一键定全套目标；路由层判「没有命令可执行」，`routing.ts:368/373/374`，理由码 `NON_EXEC_REASONS.wizard`，同文件 L608 有说明）。

---

## 三、HELP 页现状

### 3.1 HELP 页怎么生成的

**交付件（`卡路里_HELP_<时间戳>.html`，「卡路里HELP」缺省产物）这条链**：

1. `cli/cmd_read.ts:796` 起 `case 'calorie.help.center'`；缺省分支在 `cmd_read.ts:827`：`renderHelpFileHtml(buildHelpFileData(now))`。
2. `render/helpFile.ts:53-66` `buildHelpFileData()` 组装 5 字段（skill_name / title / subtitle / contact / groups）。分组数据直接取 `triggers/wake-assets.ts` 的 `WAKE_GROUPS`（`wake-assets.ts:45`；场景总量 `WAKE_ASSETS` 在 `:4737`），出自老实物 `help-data`，**与 `scene-*.ts` 是两份数据**。
3. `render/helpFile.ts:71-73` → `render/helpShell.ts:22-31` → `base-paint/help-shell:renderHelpShellHtml`；模板源 `packages/base-render/assets/help-template.html`（前端脚本按 `HELP.groups` 现场生成 DOM）。
4. 页面渲染细节（模板里）：`help-template.html:1660-1673` 把每条场景归一成 `{id, name(=title), chip(=wake_word), types, dev, prompt(=prompt_template), params(=editable_fields)}`；卡片在 `:1784-1792`，一张卡片只有四项：**唤醒词 chip ＋ 类型徽章 ＋ 标题 ＋ 一个「复制」按钮**，复制的是 `buildPrompt(s, {})`＝`prompt_template` 原文（`:1790`）。
5. **速查台是另一件产物**：`render/helpCenter.ts` 造 `SceneData`（`HELP_GROUPS` 在 `:64-76`，「目标管理」在 `:71`；子功能顺序 `:80-88`，`:82` 为「定目标/看目标/改目标」），并由 `helpSceneCli()`（`:109-125`）给每条场景补一行「可执行命令」，内容取路由层、不取命令字段原文（`:25-27` 有口径说明）。这件产物只有显式要 `--params '{"mode":"file"}'` 才出（SKILL.md L192），**与 HELP 交付件不是同一份**。

### 3.2 「目标管理」分组长什么样（实物）

取最新实物 `D:\2Study\StudyNotes\.db\calorie_html\卡路里_HELP_20260912_001033.html`（202738 字节，页眉「10 分类 · 436 场景 · 更新于 2026-09-12 00:10」）。分组结构：

- 组：`目标管理`（id `goal`，图标 🎯），3 个子功能：**定目标 8 条 / 看目标 12 条 / 改目标 5 条 ＝ 25 条**。
- 每条场景对象只有 6 个字段：`id, title, wake_word, status, types, prompt_template`。**没有命令字段、没有描述、没有步骤**。
- 全文件扫字串：`calorie-cmd-read` 出现 **0** 次，`calorie.` 出现 **0** 次，「可执行命令」出现 **0** 次（唯一的 `editable_fields` 命中来自模板自身脚本文字）。**即：HELP 交付件里没有任何一条命令**。

### 3.3 逐条能不能追到一条可执行的唤醒词与工作流程

| # | 条目（唤醒词） | 能追到可执行命令？ | 缺什么 |
|---|---|---|---|
| 1 | 定营养目标 | 能（`calorie.goal.set`） | 缺页与交付；无写前确认步骤 |
| 2 | 定营养目标(自动算) | **不能** | 没有单条可执行命令（路由层判「没有命令可执行」）；卡片只有提示词 |
| 3 | 定体重目标 | 能（`calorie.goal.weight`） | 缺页与交付；SKILL.md 里同名两行指向读/写两条命令 |
| 4 | 定体重目标(自动算截止) | 能（`calorie.goal.weight` 带截止日） | 缺「算截止日」这步的判据 |
| 5 | 定体重目标(含起始日) | 能（`calorie.goal.weight` 带起始项） | 缺交付说明 |
| 6 | 定饮水目标 | 能（`calorie.goal.water`） | 缺页与交付 |
| 7 | 定饮水目标(自动算) | **不能** | 同第 2 条 |
| 8 | 一键定全套目标 | **不能** | 同第 2 条；卡片提示词里写的是「先看结果、确认后再采纳」，没有命令 |
| 9 | 看今日目标 | 能（`view.goal-progress`） | 缺「体重目标另走一条唤醒词」的落点 |
| 10 | 看本周目标 | 能（`view.goal-progress`） | 窗口口径无指针 |
| 11 | 看营养目标进度 | 能（`view.goal-progress`） | 无 |
| 12 | 看体重目标进度 | 能，但**查出来的首条是别的命令** | `help.lookup` 首命中给 `view.goal-progress`（该命令字段本身正确） |
| 13 | 看饮水目标进度 | 能（`view.goal-progress`） | 无 |
| 14 | 看目标对比实际 | 能（`view.goal-vs-actual`） | 示例窗口与提示词默认不符 |
| 15 | 看目标完成度 | 能（`view.goal`） | 无 |
| 16 | 看即将到期的目标 | 能（`view.goal-expiring`） | 自定义窗口无处放；SKILL.md 示例参数与它不一致 |
| 17 | 看目标完成率(按周) | 能（`view.goal-progress`） | 无 |
| 18 | 看目标完成率(按月) | 能（`view.goal-progress`） | 「本月」口径无文字 |
| 19 | 改营养目标 | 能（`calorie.goal.set`） | 缺改前值来源 |
| 20 | 改体重目标 | 能（`calorie.goal.weight`） | 缺改前值与速率建议 |
| 21 | 改饮水目标 | 能（`calorie.goal.water`） | 缺改前值 |
| 22 | 暂停所有目标 | 能（`calorie.goal.pause`） | 缺「恢复入口」说明 |
| 23 | 重启所有目标 | 能（`calorie.goal.resume`） | 无 |
| 24 | 看目标历史完成 | 能（`view.goal`） | 示例窗口与提示词默认不符 |
| 25 | 看目标预测达成 | 能（`view.goal-predict`） | 无 |

- **追不到可执行命令的：3 条**（2、7、8）。
- **能追到命令但查错页的：1 条**（12）。
- 卡片本身永远带唤醒词（chip 与复制文本里逐字都在），所以「追不到」指的是**追不到命令**，不是追不到唤醒词。

---

## 四、唤醒词数据里的命令字段瑕疵

判定口径：`main_prompt.cli` **不可执行**，或**与它该走的流程不符**。

**硬瑕疵 3 条（不可作为单条命令执行）**：

| 行 | 唤醒词 | 命令字段 | 为什么不能用 |
|---|---|---|---|
| `scene-06-goal.ts:6` | 定营养目标(自动算) | `… view.goal-recommend … → 确认后 … goal.set …` | 含「→ 确认后」散文，两条命令缝在一句里；路由层同时判「没有命令可执行」（`routing.ts:368`） |
| `scene-06-goal.ts:11` | 定饮水目标(自动算) | `… goal-recommend … → 确认后 … goal.water …` | 同上（`routing.ts:373`） |
| `scene-06-goal.ts:12` | 一键定全套目标 | `… goal-recommend … → 确认后依次 … goal.set … ＋ … goal.weight … ＋ … goal.water …` | 4 条命令用「＋」串成一句（`routing.ts:374`） |

三条链里的 `--params '{"profile":"cut"}'` 取值合法（允许值 cut/maintain/bulk，`cmd_read.ts:646-648`），但把方向写死成「减脂」，而提示词让用户选减脂/维持/增肌——照抄即写错方向。

**跨处不一致 1 处**：

- `SKILL.md:144` 给 `calorie.view.goal-expiring` 的例句是 `--params '{"withinDays":150,"today":"2026-09-07"}'`，而唤醒词 16 的命令字段是**不带参数**的 `calorie-cmd-read calorie.view.goal-expiring`（`routing.ts:382` 与 `scene-06-goal.ts:20` 一致），代码默认值是 **14 天**（`render/goalExtra.ts:37` `buildGoalExpiringView(db, withinDays = 14, …)`），提示词也写「默认 14 天」。同一件事三处口径：文档 150 天、代码 14 天、字段无参。

**示例窗口与提示词声明不符 2 条**：

| 行 | 唤醒词 | 提示词声明 | 命令字段给的窗口 |
|---|---|---|---|
| `scene-06-goal.ts:18` | 看目标对比实际 | 默认 30 天，用户可填 | `start 2026-09-05 / end 2026-09-07`（3 天） |
| `scene-06-goal.ts:28` | 看目标历史完成 | 默认 30 天，用户可填 | `start 2026-09-05 / end 2026-09-07`（3 天） |

**检索层瑕疵 1 条（不是字段本身错，但会让 AI 跑错命令）**：

- 用 `calorie.help.lookup --params '{"q":"看体重目标进度"}'` 查（`cmd_read.ts:857-860` → `triggers/help-lookup.ts:108-142` 的 `searchHelp`），首命中给的是 `calorie.view.goal-progress`（5 项目标进度），而不是该唤醒词自己的 `calorie.view.goal-weight`。原因：`searchHelp` 除唤醒词外还按 `desc` 子串匹配（`help-lookup.ts:111-120`），而 `看今日目标` 那条的描述里写着「引导到看体重目标进度」（`scene-06-goal.ts:13`），两条都是可执行、排序稳定（`:137`），于是先出现的错条排在前面。
- 同文件 `:167-174` 还有一条兜底：查询里带「目标」两字时，会在结果最前面塞一条合成的「定营养目标」命中——即查任何带「目标」的词，第一条可能都是写营养目标的命令。

**字段本身可执行且与流程相符的：22 条**（22 条有命令可执行的场景，其 `main_prompt.cli` 与路由层 `cli` **逐字相同**，逐条核对见方法节）。

---

## 方法

**读过的东西（只读，未跑 build / test / tsc，未做任何 git 写操作，未动数据库）**：

- 规范：`writing-for-agents/SKILL.md`（81 行）与同目录 `SKILL-MECHANICS.md`（22 行）。
- 代码：`packages/skill-calorie/scripts/build-help.mjs`、`SKILL.md`、`src/render/helpFile.ts`、`helpShell.ts`、`helpCenter.ts:1-140`、`help.ts`、`src/triggers/help-lookup.ts`、`src/triggers/wake-assets.ts`（只看结构 1-37 行 + 定位行号）、`base-render/assets/help-template.html`（只看 1655-1795 段）。
- 实物：`D:\2Study\StudyNotes\.db\calorie_html\卡路里_HELP_20260912_001033.html`（按修改时间取最新一份）。

**抽取脚本**（临时件，前缀 `c-`，全在 `D:\ilife\.scratch\t164\`）：`c-parse-goal.mjs`（解析 25 条场景字段）、`c-extract-help.mjs`（从实物 HTML 抽 `help-data` 的「目标管理」组）、`c-routes.mjs`（经 `dist/` 读 `SCENE_06_GOAL` / `routesFor` / `searchHelp`，逐条给路由与首命中）、`c-drift.mjs`（比对实物 `prompt_template` 与 `scene-06-goal.ts` 的 `main_prompt.text`：**25 条全同，0 条漂移**）、`c-audit.mjs`（量体与用词分布、扫 `html_template` 消费点）、`c-wake-in-skill.mjs`、`c-pointers.mjs`、`c-find.mjs`、`c-recommend.mjs`。

**口径与限制**：

- 行号一律按仓库工具读到的行数记（`SKILL.md` 211 行；`scene-06-goal.ts` 的 25 条在 L5-L29）。
- `c-routes.mjs` 走 `dist/`（`dist/triggers/routing.js` 比 `src/triggers/routing.ts` 新，`dist/triggers/scene-06-goal.js` 与源同日），并已用 `c-find.mjs` 在源码里逐条复核 3 条散文链、`看体重目标进度`、`看即将到期的目标` 的行号。
- 「`html_template` 零消费」的结论范围是 `packages/skill-calorie/src/` 内 `triggers/` 之外（未扫测试与 `packages/` 其它包）。
- 本机 `Get-Content` 默认按 GBK 解码该文件，行数会数错；本报告的行数/字数全部由 Node 按 UTF-8 读取后统计。
- 未确证：`calorie.view.goal-expiring` 不带参数能否真的跑通（只能引用路由层口径与 `t81-exec-smoke` 的全量实跑说法，本轮未实跑命令）；HELP 交付件与 `scene-*.ts` 两份数据长期是否会漂移（本轮 25 条逐字相同，其余 411 条未比对）。
