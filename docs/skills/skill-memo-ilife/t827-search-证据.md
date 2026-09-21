# t827 · 查找域（7 场景）端到端证据

票：[#827](https://github.com/FeatherHunter/ilife/issues/827)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
本件是本票的交付证据：**做了什么、逐条读数、哪几条过不了以及为什么**。所有读数都可重跑，命令逐条给在下面。

---

## 一 本域是哪 7 格（先说清范围）

HELP 官方源 `packages/skill-memo-ilife/src/help/scenes/search.ts`（查找类，3 个二级组／7 场景）；
册子格 `src/help/booklet.ts` 的 `seq 7–13`（族 列表查询）。

| seq | 场景 id | 唤醒词 | 标题（HELP） | 页型 `types` | 命令 | 这一次真跑的参数 | 册子格 |
|---|---|---|---|---|---|---|---|
| 7 | `memo_search_keyword` | **搜备忘** | 按关键词搜索笔记 | 查看＋回执 | `memo.search` | `{"q":"咖啡"}` | `搜备忘` |
| 8 | `memo_search_alias` | **查备忘** | 搜备忘的别名(同义触发) | 查看＋回执 | `memo.search` | `{"q":"咖啡","scene":"memo_search_alias"}` | `查备忘` |
| 9 | `memo_get_detail` | **看备忘** | 查看单条笔记详情 | 查看＋回执 | `memo.detail` | `{"id":<id>}` | `看备忘` |
| 10 | `memo_search_by_date` | **按时间搜备忘** | 按日期范围搜索笔记 | 查看＋回执 | `memo.search` | `{"start":…,"end":…}` | `按时间搜备忘` |
| 11 | `memo_search_wish` | **查心愿** | 查所有心愿(自动带分类过滤) | 查看＋回执 | `memo.wish` | `{"category":"心愿"}` | `查心愿` |
| 12 | `memo_search_checkin` | **查打卡** | 查所有打卡记录 | 查看＋回执 | `memo.search` | `{"category":"打卡"}` | `查打卡` |
| 13 | `memo_search_mood` | **查情绪** | 查所有情绪日记 | 查看＋回执 | `memo.search` | `{"category":"情绪日记"}` | `查情绪` |

---

## 二 做了什么（三处，都在本票写集内）

| # | 件 | 改动 | 为什么 |
|---|---|---|---|
| 1 | `src/search/run.ts` | 两条读命令补 `deliver`：`memo.search` 两支（区间／关键词-分类）＋ `memo.detail`；并加「这一次是哪一格」的判定 | 命令今天只回 JSON、**一件不落盘**；页面必须由命令出口的 `deliver` 钩子触发 |
| 2 | `test/t827-search-domain.test.mjs`（新增） | 4 例：① 7 词路由＋SKILL.md 行；② **6 格真落盘**（主体／目录／体积／整页）；③ 第 7 格命令能跑；④ 反例三面 | 票面「唤醒词能路由／命令能跑／产物真落盘」逐条要真出口用例 |
| 3 | `docs/skills/skill-memo-ilife/t827-probe-search.mjs`（入仓） | 开工前现状探针（7 场景真喂路由＋真跑＋看产物） | 本域的改前读数；客观记录「改前 0／7 落盘」 |

**页形状不新写**：列表族（34 格里 9 格）的唯一定义地是 `src/render/listPage.ts`（**#828 首建**，本票复用，不另立第二份）；
模板是族共用的 `templates/memo_query.html`；文件名主体只经 `bookletFileStem(sceneId)` 查册子。
**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、`src/render/**`、`src/wish/**`、老技能仓库、公共层任何件；没切分支、没 `reset`／`stash`。

### 「这一次是哪一格」怎么定（一条命令服务多格）

`memo.search` 服务 5 格、`memo.detail` 服务 1 格，而册子每格一个文件名。判定写在 `src/search/run.ts`：

1. **显式优先**：`params.scene` 给了就用它（只认本域这 5 格；给别域的格 ⇒ exit 2 点名，不静默改判）；
2. **缺省按参数推断**：`start`＋`end` → `按时间搜备忘`；`category:"打卡"` → `查打卡`；`category:"情绪日记"` → `查情绪`；
   其余 → `搜备忘`（主名那一格）。

⚠️ `查备忘`（别名场景）与 `搜备忘` 是同一件查询的两个词、页形相同、**格不同**，故别名那格要显式给 `scene`
（做法与提醒域 `memo.remind` 的两视图同一套）。AI 照 SKILL.md 那一行直跑（不带 `scene`）落的是主名格。

---

## 三 逐条验收读数（2026-09-21 现场）

### 3.1 唤醒词能路由 —— **过（7／7）**

同一个探针，改前／改后两跑（`node docs/skills/skill-memo-ilife/t827-probe-search.mjs`）：

| 时点 | routeNoSlotOk | routeWithSlotOk | exitZero | delivered | files |
|---|---|---|---|---|---|
| 开工前（#855 重排前） | 4 | 6 | 6 | **0** | **0** |
| 交付后 | **5** | **7** | **7** | **7** | **7** |

`查情绪` 由 `POLICY_NO_MATCH` 变通 —— #855 的路由声明件 `src/search/routes.ts:50-57` 已收这条主名（本票不动它）。

⚠️ **一条要记住的分离**：`SKILL.md` 的速查表**不是**由运行期路由表派生，而是由遗留手写表
`src/triggers/wakewords.ts` 的 `WAKE_TABLE`（`src/help/lookup.ts` → `scripts/build-help.mjs` 注入）派生；
那张表里只有别名形态 `查情绪日记`。**运行期路由已通、SKILL.md 那一行还没有**，主名／别名对齐归
[#858](https://github.com/FeatherHunter/ilife/issues/858)（不在本票写集）。本票本地重导过 SKILL.md 验证
（`node packages/skill-memo-ilife/scripts/build-help.mjs`，重导后该文件逐字节不变）。

### 3.2 命令能跑 ＋ 产物真落盘 —— **过（6 格本人接线 ＋ 第 7 格见 §五.1）**

`node .scratch/t827/gen-search-pages.mjs`（临时库 ＋ 隔离配置，绝不碰活库）：

```
序  唤醒词         命令          退出码  命中  产物
7   搜备忘         memo.search   0       1     .scratch\t827\pages\搜备忘_20260921_174053.html
8   查备忘         memo.search   0       1     .scratch\t827\pages\查备忘_20260921_174053.html
9   看备忘         memo.detail   0       1     .scratch\t827\pages\看备忘_20260921_174053.html
10  按时间搜备忘    memo.search   0       6     .scratch\t827\pages\按时间搜备忘_20260921_174053.html
11  查心愿         memo.wish     0       1     .scratch\t827\out-of-scope\心愿排期_20260921_174054.html   ← 见 §五.1
12  查打卡         memo.search   0       1     .scratch\t827\pages\查打卡_20260921_174054.html
13  查情绪         memo.search   0       1     .scratch\t827\pages\查情绪_20260921_174054.html
```

- 落盘名 ＝ 册子主体 ＋ 时间戳（`<主体>_YYYYMMDD_HHMMSS[_N].html`；时间戳与独占递补都住共用件 `base-paint/save-html`）；
- 落点 ＝ `<库目录>/memo_html/` 扁平一层（册子 §三：既有 216 件原地并排，不另开层）；
- 整页：模板三标记（`INJECT-DATA`／`SHARED-CSS`／`SHARED-HELPERS`）填完，页上出现场景词。
  三条都由 `test/t827-search-domain.test.mjs` 的 ② 逐格断言（tests 4／pass 4／fail 0）。

### 3.3 四个门 —— **过两个、读数一个、缺两个（件还没生出来）**

| 门 | 命令 | 读数 | 退出码 | 判 |
|---|---|---|---|---|
| **分隔符门** | `node packages/base-render/test/separator-probe.mjs <产物>`（逐件） | 6 件**全部节点级 0 处／行级 0 行** | **0** | **过** |
| **响应式门** | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/resp.json` | `OVERFLOW-ZERO pages=6 cells=18 failed=0` | **0** | **过** |
| **版式读数** | `node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/fmt.json` | 窄档字号 11px（9 档）；1440 列宽 ／ 越界 0 | 0 | 读数（不是门） |
| **新建六列机审** | 归 [#851](https://github.com/FeatherHunter/ilife/issues/851) | **件不存在**（`t407` 是账单域的，`t849-视觉基准.md` §4 已裁本图不用） | — | **缺** |
| **五维尺** | `node docs/skills/skill-calorie/t524-判分.mjs --dir <读数目录>` | **件不能直接用**：该判分吃姊妹读件 `facts.json`（同目录、人工清点的两张表），备忘录那份归 #851 | — | **缺** |

另有一条**门件与规格不符**的现场发现：`t849-视觉基准.md` §4 写分隔符门吃「产物**或页群目录**」，
而盘上的 `separator-probe.mjs` 传目录直接 `EISDIR` 崩（`readFileSync` 读目录）。本票按**逐件**跑（6／6 绿），
目录模式那条记在这里，归 #851 或另开小票。

版式读数（D5 那一维的料，读数器不是门）——6 件同形：

```
390 / 768 / 1440 三档：可点 5，<44px 命中 5（input. 1 ＋ button.copy 4），最小字号 11px
RESULT: touch pages=6 widths=390/768/1440 small=105 minFontPx=11 FAIL
```

三条要点：**①** 三档处数**完全相同** ⇒ 不是「只窄屏没适配」，是底座里没有 44px 这一档（与改前基线同一病因）；
**②** 命中的全是 `input.` 与 `button.copy`（页内搜索框与复制区那排按钮），属**共用底座**（`src/render/pageAssets.ts` 的
`MEMO_PAGE_CSS`，34 格共用）；**③** 11px 字号同属那一块。⇒ 这两样按 `t824-视觉基准.md` §3／§5 归 #851
（公共层共用形状件，走串行窗口），**域票不越界改共用位**。

### 3.4 自证（改坏必红／还原必绿，两行机器读数）

| 跑法 | 读数 |
|---|---|
| **代码变异**：`src/search/run.ts` 的 `sceneOf` 改成忽略 `params.scene` → 编译 → 本票用例 | `tests 4 / pass 2 / fail 2`（点名 `✖ ② 6 格真落盘…`） |
| 逐字还原（哈希一致 = True）→ 编译 → 同一用例 | `tests 4 / pass 4 / fail 0` |
| **分隔符门变异**（`.scratch/t827/mutation.mjs`）：6 件正例 → 往一件可见文本塞一处「；」并列 → 逐字还原 | `POS-SUM 6/6 exit 0` ／ `MUT exit=1（节点级 2 处）` ／ `BACK exit=0（0 处）` |

---

## 四 交付对账（必报五步第五步）

| 开工前清单（评论 2026-09-21） | 实际落到的路径 | 偏差 |
|---|---|---|
| `src/search/**`（能力目录：门／声明／路由／页装配） | 只动 `src/search/run.ts`（门／声明／路由在 #855 已落；**页装配不新写**，复用 #828 的 `src/render/listPage.ts`） | **−1 件**：`pages.ts` 没建（族定义地已存在，新建即第二处定义） |
| `test/t827-search-domain.test.mjs` | 同 | 零 |
| `src/cli/cmd_read.ts`（4 处 `deliver` ＋ 1 行 import） | **一件未动** | **−1 件**：#855 已把分派改成「只认登记表」，页面改由**域自己的运行件**返回 `deliver`；出口不再是共用位 |
| `src/policy/wakewords.ts`（补 1 行 `查情绪`） | **一件未动** | **−1 件**：#855 已把词表搬成各域 `routes.ts`，`查情绪` 那条已在 `src/search/routes.ts:50-57` |
| `templates/memo_query.html`（按基准改样式） | **一件未动** | **−1 件**：该模板是列表族 9 格共用件（#828 的族定义地消费它），且触摸区／字号属 #851 的公共层底座；域票改它＝改共用位 |
| — | `docs/skills/skill-memo-ilife/t827-probe-search.mjs`（探针入仓） | **+1 件**：开工前现状读数要可重跑（票面要求「逐场景真跑」留证） |

**行数门（本包 350 LF）**：本票碰的件 —— `src/search/run.ts` **199 LF**（未越线；改前 72）、
`test/t827-search-domain.test.mjs`（测试不管辖）。包内台账 `node packages/skill-memo-ilife/scripts/check-warning-line.mjs` 绿。

---

## 五 两条要交回去的发现（不夹带进本票）

### 1 🔴 第 11 格「查心愿」今天落到了**心愿域的主体**（撞格）

`查心愿`（HELP 场景 `memo_search_wish`，**查找类**）与 `心愿排期`（`memo_wish_schedule`，心愿类）
**共用同一条命令分支** `memo.wish` 的「不带 `wizard` 那支」。心愿域（#829）已把那一支接到自己的格：

```
src/wish/run.ts:90   deliver: buildWishReceipt({ scene: 'memo_wish_schedule', title: '心愿排期', … })
```

⇒ 于是 `查心愿` 跑出来的产物名是 `心愿排期_<时间戳>.html`，册子 seq 11 的 `查心愿.html` **从不产生**。
修法是一行：那一支按 `params.scene` 分格（缺省落 `memo_wish_schedule`，给 `memo_search_wish` 落本域那格），
与提醒域 `memo.remind` 的两视图同一套写法。**这条路在心愿域写集（`src/wish/**`）里，本票不越界改**——
请编排者裁定：由 #829 补这一行，还是授权本票代劳。本票的 6 格（seq 7–10／12／13）不受影响。

### 2 ⚠️ `separator-probe.mjs` 不支持「页群目录」（与 `t849` §4 表述不符）

见 §3.3 末段：传目录即 `EISDIR` 崩。本票按逐件跑替代；若 #851 的新六列机审也要吃页群目录，这条要先修。

---

## 六 可重跑清单（照本件复算）

```sh
# 仓根
node docs/skills/skill-memo-ilife/t827-probe-search.mjs                # 现状探针（路由三档 ＋ 落盘）
node tooling/run-locked.mjs --ticket 827 -- node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife
node tooling/run-locked.mjs --ticket 827 -- node --test packages/skill-memo-ilife/test/t827-search-domain.test.mjs
node tooling/run-locked.mjs --ticket 827 -- node .scratch/t827/gen-search-pages.mjs
node .scratch/t827/mutation.mjs                                        # 分隔符门正例／反例／还原
node packages/base-render/test/separator-probe.mjs .scratch/t827/pages/<产物>.html
node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/resp.json
node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/fmt.json
```

⚠️ 本包**测试必须把 cwd 钉在包目录跑**（出口依赖包内 `node_modules` 的 junction 依赖 `base-paint` 等）；
经 `run-locked.mjs` 跑时它的子进程 cwd 是**仓根**，故测试一律用**绝对路径**传文件（本票用例内部全走 `import.meta.url`，不受 cwd 影响）。

---

## 七 收尾口径

- 本票**做掉**：6 格真落盘（册子 seq 7–10／12／13）＋ 7 词路由全通 ＋ 反例三面 ＋ 分隔符门与响应式门两门绿；
- 本票**没做掉**：第 11 格（撞格，见 §五.1）、机审六列与五维尺（件归 #851，见 §3.3）、
  共用底座的触摸区与字号（归 #851）、SKILL.md 的 `查情绪` 行（归 #858）。
