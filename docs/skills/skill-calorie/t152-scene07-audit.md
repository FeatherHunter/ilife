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
| 查档案 | `calorie.view.profile` | exit 0 ／ 52,729 B | ✅ **已修**：`calorie-cmd-read calorie.view.profile`（原为老脚本 `python scripts/render_crud_view.py …`） | `C:\Users\辰辰洋洋\Desktop\ilife-scene07\场景样例\查档案.html` | ✅ 打通 |

**过程型页（不是唤醒词，是本图新增的那条只读命令）**：`calorie.view.profile-wizard`（档案预检）——
样例：`…\默认命名-有档案\档案预检_20260912_153352.html`（58,854 B）、`…\默认命名-空库\档案预检_20260912_153354.html`（57,579 B）。

## 二、遗漏（4 条，第 1 条已修）

1. ~~**`查档案` 的 HELP 呈现层没接上**（本图内唯一一条）~~ → **已修**（2026-09-12，本会话）：
   `src/triggers/scene-07-profile.ts:8` 的 `main_prompt.cli` 与 `data_source` 由老脚本
   `python scripts/render_crud_view.py --entity profile --chain "…"` 换成 `calorie-cmd-read calorie.view.profile`。
   修后实测：`HELP_LOOKUP`／`getHelpCards()`／`searchHelp` 三处都回新命令；**#180 的账目随之 733 → 731**
   （`main_prompt.cli` 375→374、`data_source` 353→352），全包测试 424 条 423 通过（唯一红仍是 #180 那条有意先红的）。
2. **#175／#176／#177 三张票仍 OPEN**（写前页 · 设置档案／改档案、写前页 · 设活动量、结果页 · 查档案）：
   它们的实物已由 #179 做出来（预检确认页 ＋ 三条写命令回执 ＋ 查档案结果页），但票没关。
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
