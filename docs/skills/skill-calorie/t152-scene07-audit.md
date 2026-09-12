# 地图 #152 场景 07 基础信息 · 门票逐条审计（用户审查用）

> 用户 2026-09-12 要的「按 HELP 当前能力、本图每个场景：场景名／prompt／样例 HTML 绝对路径／遗漏」。
> 实测口径：能力侧＝拿标准种子库（`docs/research/t81-seed.mjs`）真跑命令；HELP 呈现侧＝`HELP_LOOKUP`／
> `getHelpCards()`（用户在 HELP 里点「复制指令」拿到的那条）；样例＝真跑落盘的 HTML 文件。
> 复跑：`.scratch/t239/inventory-run.mjs`（跑全部 436 条）与 `.scratch/t239/help-scene07.mjs`（HELP 呈现侧）。

## 一、本图 4 条唤醒词逐条

| 场景名（唤醒词） | 命令（key） | 能力侧（实测） | HELP 里挂的可复制命令 | 样例 HTML（绝对路径） | 状态 |
|---|---|---|---|---|---|
| 设置档案 | `calorie.profile.set` | exit 0 ／ 52,729 B | ✅ `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,…}'` | `C:\Users\辰辰洋洋\Desktop\ilife-scene07\场景样例\设置档案.html` | ✅ 打通 |
| 设活动量 | `calorie.profile.activity` | exit 0 ／ 52,524 B | ✅ `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` | `C:\Users\辰辰洋洋\Desktop\ilife-scene07\场景样例\设活动量.html` | ✅ 打通 |
| 改档案 | `calorie.profile.update` | exit 0 ／ 52,509 B | ✅ `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` | `C:\Users\辰辰洋洋\Desktop\ilife-scene07\场景样例\改档案.html` | ✅ 打通 |
| 查档案 | `calorie.view.profile` | exit 0 ／ 52,729 B | ✅ **已修**：`calorie-cmd-read calorie.view.profile`（走呈现层覆盖表，见下节第 1 条） | `C:\Users\辰辰洋洋\Desktop\ilife-scene07\场景样例\查档案.html` | ✅ 打通 |

**过程型页（不是唤醒词，是本图新增的那条只读命令）**：`calorie.view.profile-wizard`（档案预检）——
样例：`…\默认命名-有档案\档案预检_20260912_153352.html`（58,854 B）、`…\默认命名-空库\档案预检_20260912_153354.html`（57,579 B）。

## 二、遗漏（4 条，第 1 条已修）

1. ~~**`查档案` 的 HELP 呈现层没接上**~~ → **已修（2026-09-12，本会话）**，走的是票 #177 正文预留的**备选路径**：
   `HELP_EXEC_OVERRIDES.profile_view = 'calorie-cmd-read calorie.view.profile'`。
   实测：用户可见的 `calorie.help.lookup`（`cmd_read.ts` → `searchHelp` → `execCliFor`）回的就是这条真命令。
   **为什么没走票面首选的「改 SoT」**（实测结论）：改 SoT 的两字段会让冻结账目连环动——
   ① `test/calorie-triggers.test.mjs` 逐条 sha 红（需同批改 `test/calorie-sot.snapshot.json` 的
   `entry_sha.profile_view` `00b7332798a8d3a6` → `bfb7d75c0d64cf7f`，实测重算与票面预言**逐字一致**）；
   ② 更麻烦的是 `test/calorie-routing-81.test.mjs` 的 D2⑤：`calorie.view.profile` 一旦成为冻结直连键，
   就与既有新拟词「看档案视图」（`routing.ts:649`）撞键，那张票的 57 新拟键账目要连带动。
   那套数据面清理（375 条 cli ＋ 353 条 data_source 成批重写 ＋ 快照同批重算）**属 #180**，本图只修用户看到的那一条。
   连带的**有意更新**一处：D2⑤ 的基线计算跳过一个**具名例外** `calorie.view.profile`
   （理由与撤销条件写在测试注释里：那是呈现层映射、不是新入口；根因清了就该撤）。
   仍**未覆盖**：`getHelpCards()`／`HELP_LOOKUP` 两处不经 `execCliFor`，其 `cli` 仍是老 python 串——
   但 HELP 速查台产物本身不含命令列（载荷只有 prompt／types），用户看不到，故不在本图收口。
2. **#175／#176／#177 三张票仍 OPEN**——**不能关**（逐条比对见 §五）。
3. **#178 端到端验收没做**：Destination 的第 ② 条硬指标——用户本人**在全新空白 session** 里跑这 4 条唤醒词。
4. **#179／#239 的肉眼验收没做**：两批截图与 HTML 已在桌面 `ilife-scene07\`（`t179-*`／`t239-*`）。

## 三、票面状态（本图）

| 票 | 状态 | 说明 |
|---|---|---|
| #152 地图 | OPEN | 进度按票算：已关 1（#163）／在册 9 |
| #163 边界票 | **CLOSED** | 4 条词对账、页面归 3 类、公共层增量 |
| #179 页面装配与预检页命令 | OPEN | 代码侧完工（90%），等肉眼验收 |
| #239 复制组件（本图新挂） | OPEN | 代码侧完工（90%），等肉眼验收 |
| #175／#176／#177 三张页面票 | OPEN | 实物已由 #179 做出，票待收 |
| #178 端到端验收 | OPEN | 等用户亲自跑 |
| #180 唤醒词数据清理 | OPEN | 第一步落地（防回退断言有意先红）；**第二步未做**——HELP 侧 353/436 条还是老命令 |
| #181 命令分派重构 ／ #182 外部集成立项 ／ #235 base-render 拆分 | OPEN | 本图外沿 |
| #237 `saveHtmlFile` 共用件 | **CLOSED** | 别的图的件，卡路里已在用（落盘命名正本） |

## 四、全技能口径下的本图位置（对照）

436 条唤醒词里：**打通 340 ／没打通 86 ／没开发 10**；本图所在的「基础信息」分组是 **4 打通／0／0**。
逐条账见 `docs/skills/skill-calorie/scene-inventory.md`；完整表在桌面 `ilife-scene07\场景清单.md`。

## 五、对抗式审查：#175／#176／#177 **不能关**（逐条比对票面）

**第一性原理**：票的存在意义是「可验收的完成标准」，关票＝宣称该标准已满足。**「页面已出新形态」≠「票面要求的内容齐全」**——
#163 当初判的两处不达标正是「① 产物是片段 ② 内容比场景规格少」；**#179 只解决了 ①（整页装配＝前半），
② 的内容补齐正是 #175／#176／#177 这三张票（后半）**，所以它们在构造上不可能被 #179 覆盖。

| 票 | 票面要求 | 实测 | 判定 |
|---|---|---|---|
| #177 | 结果页补 **6 项**：BMI／BMR／TDEE／活动系数／创建时间／更新时间 | `profile/view.ts` 现行页：4 张 KPI（性别+年龄／活动量／目标／最新体重）＋ 5 行表（身高/年龄/性别/活动量/备注）＋ 营养目标折叠区。**六项一个都没有** | ❌ 未做 |
| #177 | 修 HELP 查找条目（首选改 SoT，备选覆盖表） | 已修（走备选覆盖表），理由与观测见 §二第 1 条 | ⚠️ 部分（备选路径） |
| #177 | 「空库态怎么表现」写进结论 ＋ UI 两关结论写进票 | 空库仍是缺失阻断（exit 4、不落页）✓，但**票面结论没写**、UI 结论也没落票 | ❌ 未收口 |
| #175 | `改档案` **无档案时按裁定报错**（不再建行后更新） | 实测空库跑 `calorie.profile.update`：**exit 0 ＋ 落盘回执**（`empty-profile-update.html` 52,688 B），`test/profile-doc-179.test.mjs` 还钉着 `— → 176` | ❌ 未做 |
| #175 | `设置档案` 回执补 3 项：性别／推荐活动量／设置时间 | 回执只有「写入时刻」一项（＝设置时间）；摘要里是身高/年龄/活动量，**没有性别、没有推荐活动量** | ❌ 只做 1/3 |
| #175 | 4 字段位 ＋ 采访式引导承载 ＋ 活动量推荐辅助 ＋ 复制 prompt；改档案 5 项 ＋ 改前→改后对照 | 全部在位（`renderParamForm` 4／5 项、五档系数表、`beforeTable` 的改前值/本次拟写、复制 prompt 区） | ✅ |
| #176 | 页面 5 档 ＋ 系数 ＋ TDEE 影响；**档案不全不许出任何 TDEE 数字** | 在位（`tdeeChoices` 的 `ready` 判据卡死，缺数据渲染成「—（缺身高/年龄/性别/体重，不算）」） | ✅ |
| #176 | **回执**补「活动系数 与 TDEE 影响」（同样受陷阱约束） | 三条写命令共用 `buildProfileSettingReceiptDoc`，里面**没有任何系数/TDEE 字段** | ❌ 未做 |
| 三张共同 | UI 两关结论写进票面 ＋ 用户肉眼验收 | 四关实测已过（本会话重拍），但**票面结论没写**、用户未验收 | ❌ 未收口 |

**结论**：三张票各自都还欠实打实的内容（#177 欠 6 个指标＋结论；#175 欠空库守卫＋回执 2 项；#176 欠回执 2 项），
**关票会把「内容比规格少」这条缺陷永久藏起来**——正是 #163 裁定要防的那件事。**建议：保持 OPEN**，
按「先补内容、再落结论、最后等 #178 验收」推进；先前那句「实物已被 #179 覆盖、可直接关」**撤回**。
