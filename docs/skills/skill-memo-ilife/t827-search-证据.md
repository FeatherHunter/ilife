# t827 · 查找域（7 场景）端到端证据

票：[#827](https://github.com/FeatherHunter/ilife/issues/827)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
本件是本票的交付证据：**做了什么、逐条读数、哪几条过不了以及为什么**。所有读数都可重跑，命令逐条给在下面。

**修订（2026-09-21 傍晚）**：本件第一版把「第 11 格撞格」「页面不达标」都写成「归别人」，页面**从未看一眼**；
本版按负责人「80 分主义、质量优先」的要求重做两处——**第 11 格已修**（7/7 格真落盘）、**族样式已硬化**
（§2 数值表逐条达标），并补了**人眼复核**与**判分**（§3.5／§3.6）。

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
| 11 | `memo_search_wish` | **查心愿** | 查所有心愿(自动带分类过滤) | 查看＋回执 | `memo.wish` | `{"category":"心愿","scene":"memo_search_wish"}` | `查心愿` |
| 12 | `memo_search_checkin` | **查打卡** | 查所有打卡记录 | 查看＋回执 | `memo.search` | `{"category":"打卡"}` | `查打卡` |
| 13 | `memo_search_mood` | **查情绪** | 查所有情绪日记 | 查看＋回执 | `memo.search` | `{"category":"情绪日记"}` | `查情绪` |

---

## 二 做了什么（五处，逐处给理由）

| # | 件 | 改动 | 为什么 |
|---|---|---|---|
| 1 | `src/search/run.ts`（本域） | `memo.search`（区间／关键词-分类两支）与 `memo.detail` 补 `deliver`；加「这一次是哪一格」判定 | 命令今天只回 JSON、一件不落盘；页面必须由命令出口的 `deliver` 钩子触发 |
| 2 | `src/wish/run.ts`（跨域一处，已通报 [#829](https://github.com/FeatherHunter/ilife/issues/829)） | `memo.wish` 不带 `wizard` 那一支按 `params.scene` 分格：给 `memo_search_wish` 走列表族落 `查心愿` 格，关键词过滤复用 `searchNotes` | 那一支被两条场景共用（查找类 `memo_search_wish`／心愿类 `memo_wish_schedule`），原先无条件落 `心愿排期` ⇒ 册子 seq 11 **永不产生** |
| 3 | `templates/memo_query.html` ＋ `src/render/pageAssets.ts`（族共用件，已通报 [#828](https://github.com/FeatherHunter/ilife/issues/828)） | 触摸区 44px（`button`／`.copy`／`input`／`.pill`）、`#list .badge` 11→12px、`viewport-fit=cover`、三向安全区、族内断点 `800`→**820**、hero／pre 改色令牌；toast 组件字号 10–11→12px、关闭键 44×44 | 照 `t849-视觉基准.md` §2 数值表逐条达标（改前实测：三档同值、每页 5–10 处 <44px、最小字号 11px） |
| 4 | `test/t827-search-domain.test.mjs`（新增） | 4 例：① 7 词路由＋SKILL.md 行；② **7 格真落盘**（主体／目录／体积／整页）；③ 第 11 格分格两件事；④ 反例三面 | 票面「唤醒词能路由／命令能跑／产物真落盘」逐条要真出口用例 |
| 5 | `docs/skills/skill-memo-ilife/t827-{probe-search,gen-pages,mutation}.mjs`（入仓） | 现状探针／真产物驱动（含撞格防线）／分隔符门变异电池 | 读数要别人能重跑（协议 §5：可复跑脚本随证据入仓） |

**页形状不新写**：列表族唯一定义地是 `src/render/listPage.ts`（#828 首建），本票复用；模板族共用 `memo_query`；
文件名主体只经 `bookletFileStem(sceneId)` 查册子。
**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、`packages/base-render/**`（公共层）、老技能仓库；没切分支、没 `reset`／`stash`。

### 「这一次是哪一格」怎么定（一条命令服务多格）

1. **显式优先**：`params.scene` 给了就用它（`memo.search` 只认本域 5 格，给别域 ⇒ exit 2 点名，不静默改判）；
2. **缺省按参数推断**：`start`＋`end` → `按时间搜备忘`；`category:"打卡"` → `查打卡`；`category:"情绪日记"` → `查情绪`；其余 → `搜备忘`；
3. `memo.wish` 那一支：给 `memo_search_wish` → `查心愿`，**不给则逐字不变**（仍落心愿域 `心愿排期`）。

⚠️ **一条协议层的缺口（如实登记）**：别名格（`查备忘`）与跨域格（`查心愿`）需要调用方显式给 `scene`；
而 SKILL.md 速查表由**遗留手写表**派生（不是运行期路由声明），那两行不带 `scene` ⇒ **真实 AI 路径直跑时落的是主名／本域格**。
本票用「驱动按格调用＋用例钉住两种调用形」把册子 7 格做实；让 AI 直跑也带 `scene` 归 #858 的表清理（那里才有权改速查行）。

---

## 三 逐条验收读数（2026-09-21 现场）

### 3.1 唤醒词能路由 —— **过（7／7）**

同一支探针两跑（开工前那次在 #855 重排前）：

| 时点 | routeNoSlotOk | routeWithSlotOk | exitZero | delivered | files |
|---|---|---|---|---|---|
| 开工前 | 4 | 6 | 6 | **0** | **0** |
| 交付后 | **5** | **7** | **7** | **7** | **7** |

`查情绪` 由 `POLICY_NO_MATCH` 变通（#855 的路由声明件收了这条主名，本票不动它）。
⚠️ 分离：`SKILL.md` 速查表由遗留手写表派生，那一行仍只有别名形态；主名／别名对齐归 [#858](https://github.com/FeatherHunter/ilife/issues/858)。

### 3.2 命令能跑 ＋ 产物真落盘 —— **过（7／7 格）**

`node docs/skills/skill-memo-ilife/t827-gen-pages.mjs`（临时库＋隔离配置，绝不碰活库）：

```
序  唤醒词         命令          退出码  命中  产物
7   搜备忘         memo.search   0       1     .scratch\t827\pages\搜备忘_….html
8   查备忘         memo.search   0       1     .scratch\t827\pages\查备忘_….html
9   看备忘         memo.detail   0       1     .scratch\t827\pages\看备忘_….html
10  按时间搜备忘    memo.search   0       6     .scratch\t827\pages\按时间搜备忘_….html
11  查心愿         memo.wish     0       1     .scratch\t827\pages\查心愿_….html
12  查打卡         memo.search   0       1     .scratch\t827\pages\查打卡_….html
13  查情绪         memo.search   0       1     .scratch\t827\pages\查情绪_….html
```

落盘名＝册子主体＋时间戳；落点＝`<库目录>/memo_html/` 扁平一层；整页三标记填完（逐格断言见用例 ②）。

### 3.3 四个门 —— **三绿一读数，一门缺件**

| 门 | 命令 | 读数 | 退出码 | 判 |
|---|---|---|---|---|
| **分隔符门** | `node packages/base-render/test/separator-probe.mjs <产物>`（逐件） | 7 件**节点级 0 处／行级 0 行** | 0 | **过** |
| **响应式门** | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/resp.json` | `OVERFLOW-ZERO pages=7 cells=21 failed=0` | 0 | **过** |
| **版式读数** | `node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/fmt.json` | 三档 **`touchSmall=0`、`minFontPx=12`、越界 0**（改前：5–10 处／11px） | 0 | 读数（不是门） |
| **新建六列机审** | 归 [#851](https://github.com/FeatherHunter/ilife/issues/851) | **件不存在**（`t407` 是账单域的，`t849` §4 已裁本图不用） | — | **缺** |
| **五维尺** | `node docs/skills/skill-memo-ilife/t827-判分.mjs --dir .scratch/t827`（过渡复制件） | **逐页 96、7／7 过线**（首判 87／0 过线，三条扣分处置见 §3.6） | 0 | **过** |

### 3.4 人眼复核（本版补做，第一版缺）

`vision_html_screenshot` 390×844 整页截图（`搜备忘`），按 `t849` §2／§3 逐条问：

- **触摸区**：改前「筛选胶囊 ≈32–36px、卡片右上角复制 ≈28–32px」明显点不中 → 改后读数 `touchSmall=0`；
- **字号与层级**：改前「说明行一片灰小字（11–12px）」→ 改后最小 12px；标题／摘要／列表卡片层级清楚；
- **标点当设计用**：运行时渲染的 `生成时间：… · 场景：…` 一行仍有 `·`（见 §五.2 门件盲区）；
- **内部标识**：列表卡片左上角仍以 `#2` 形状显示编号，`场景：搜备忘` 是内部叫法直出；
- 总评（模型原话）：**「功能跑通、视觉有骨架，但文案与交互细节停留在『能用』阶段」**——
  与本票的分工一致：形状与文案的族级统一归 #851，本票把**能测的硬线**（触摸／字号／安全区／断点／溢出／分隔符）全部做绿。

### 3.5 自证（改坏必红／还原必绿，两行机器读数）

| 跑法 | 读数 |
|---|---|
| **代码变异**：`src/search/run.ts` 的 `sceneOf` 改成忽略 `params.scene` | `tests 4 / pass 2 / fail 2`（点名 `✖ ② 7 格真落盘…`） |
| 逐字还原（哈希一致 = True） | `tests 4 / pass 4 / fail 0` |
| **分隔符门变异**（`t827-mutation.mjs`）：7 件正例 → 塞一处「；」并列 → 逐字还原 | `POS-SUM 7/7 exit 0` ／ `MUT exit=1（节点级 2 处）` ／ `BACK exit=0（0 处）` |

### 3.6 五维尺 —— **过（7／7 页 96 分）**

件：`docs/skills/skill-memo-ilife/t827-判分.mjs`（卡路里判分件的**备忘录过渡复制件**，照 `t849` §4「过渡期用判分复制件」，
原件归 #851 的公共层单引擎）＋ `t827-facts.mjs`（facts 机器可复算件，口径写在 `facts.json` 的 `method`）。

```sh
node docs/skills/skill-memo-ilife/t827-facts.mjs
node docs/skills/skill-memo-ilife/t827-判分.mjs --dir .scratch/t827
```

| 序 | 页 | D1 15 | D2 20 | D3 25 | D4 15 | D5 25 | 硬扣 | 页分 | 过线（≥90 且每维 ≥80%） |
|---|---|---|---|---|---|---|---|---|---|
| 7 | 搜备忘 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 8 | 查备忘 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 9 | 看备忘 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 10 | 按时间搜备忘 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 11 | 查心愿 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 12 | 查打卡 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |
| 13 | 查情绪 | 15 | 20 | 25 | 15 | 21 | −0 | **96** | 是 |

族均分 96、最低 96（七页同分，不取平均掩盖短板）。**判分件自证**：脚本腿与字面公式腿逐页逐维比对 49 项，最大绝对差 **0**。

**第一次判分是 87（0／7 过线）** —— 三条扣分与处置：

| 扣分 | 命中 | 处置 |
|---|---|---|
| H3 −4 | 「复制数据」「复制日志」各出现 2 次（`dl>dt` 说明与同名按钮） | **本票已收**：说明收成一句人话，标签只留按钮一处 |
| H7 −1 | 说明行里的 `AI` 与 `=` | **本票已收**：改写为「可直接粘贴给助手继续下一步…」 |
| D5 −4 | 页内定位腿（`tocEl=0`、无锚点） | **部分收**：页头补锚点导航 ＋ `scroll-margin-top:20px`；该腿判分件按**公共层类名**认（自持 nav 不计满）⇒ 收满归 #851 |

**未取值位（如实声明，不伪造）**：`d1`／`d2`／`d4cut` 是人核位，本次写 `null`，判分件按 0 扣 ⇒ **D1／D2／D4 是乐观上界**；
本域 `sep.json` 由 `separator-probe.mjs` 出（只发 R1–R3）⇒ **H2（内部标识符）／H4（符号顶替）没有判据**，
报 0 是「探针没有这条」而非「实测干净」；可见文本取自静态源件，JS 注入的正文不在内 ⇒ `dupFacts`／`english` 是**下界**。
另：人眼复核（§3.4）指出运行时渲染的三处 —— `生成时间：… · 场景：…`、卡片 `#2`、`创建：`／`改：`；
机器判据看不到它们（§五.2 门件盲区），**已在最后一批当批收掉**（见 §七 最末两行）。

---

## 四 交付对账（必报五步第五步）

| 开工前清单（评论 2026-09-21） | 实际落到的路径 | 偏差与理由 |
|---|---|---|
| `src/search/**`（门／声明／路由／页装配） | `src/search/run.ts`（门／声明／路由 #855 已落；页装配复用 #828 的族定义地） | −1 件：不新建 `pages.ts`（新建即第二处定义） |
| `test/t827-search-domain.test.mjs` | 同 | 零 |
| `src/cli/cmd_read.ts`（4 处 `deliver`） | **未动** | #855 已把分派改成「只认登记表」，页面由域运行件返回 `deliver`；出口不再是共用位 |
| `src/policy/wakewords.ts`（补 `查情绪`） | **未动** | #855 已把词表搬成各域 `routes.ts`，那条已在 `src/search/routes.ts` |
| `templates/memo_query.html`（按基准改样式） | **改了**（触摸区／字号／安全区／视口／断点／色令牌） | 第一版判为「共用位不碰」，本版按质量要求硬化：**尺寸与断点属可测硬线**，页形仍归 #851 |
| — | `src/wish/run.ts`（跨域 1 处：scene 分格） | **+1 件**（票面「涉及命令键含 `memo.wish`」授权；已通报 #829） |
| — | `src/render/pageAssets.ts`（toast 字号与触摸） | **+1 件**（同族共用运行时件，随 template 一并硬化） |
| — | `docs/skills/skill-memo-ilife/t827-{probe-search,gen-pages,mutation}.mjs` | **+3 件**：读数可重跑 |

**行数门**：`src/search/run.ts` **199 LF**、`src/wish/run.ts` ~137 LF（均在 350 线下）；
包内台账 `node packages/skill-memo-ilife/scripts/check-warning-line.mjs` → `103/103 PASS`（当场实测，非转述）。

---

## 五 交回去的发现（不夹带进本票）

### 1 ✅ 已修：第 11 格撞格
`查心愿`（查找类）与 `心愿排期`（心愿类）共用 `memo.wish` 无 `wizard` 那一支，原实现无条件落 `心愿排期`。
本版按 `params.scene` 分格修正（提交 `b6c26f76`），**缺省路径逐字不变**，心愿域既有用例 32/32 绿。

### 2 ⚠️ 门件盲区：分隔符门读不到**运行时渲染**的文本
`separator-probe.mjs` 整段剔除 `<script>`／`<style>`（件内规则 ①，行 20／72），
而本族页面的 `生成时间：… · 场景：…` 与列表行文本是 JS 渲染的 ⇒ **门报 0 处，人眼却看得到 `·`**。
本票的「7/7 绿」是**静态面**的绿；运行时面的同类缺陷要么由 #851 的新六列机审覆盖，要么给该门补一条运行时读数。

### 3 ⚠️ `separator-probe.mjs` 不支持页群目录
`t849` §4 写它吃「产物或页群目录」，实测传目录即 `EISDIR` 崩。本票按逐件跑（7/7 绿），目录模式归 #851 或另开小票。

### 4 ⚠️ #855 搬迁等价基线已过期且无人处置
`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` → `RESULT: 4/14` exit 1（DIFF 全是各域新增落点，属**预期变化**）；
它**没接 CI／包门**，红着不会被发现。建议 #834 收口时重铺基线，或在件头写明「域票期后作废」。

### 5 ⚠️ 公共层还没有的本族件（登记给 #851）
- 复制区说明行与操作按钮组的**共用形状件**（`t824` §3 点名要收进公共层）；
- 状态色令牌（`badge.warn/ok` 目前字面色值：`#fff7e8`／`#b25b00`／`#ecfff2`，公共层无对应令牌）；
- 页族配方（列表族仍住技能侧 `MEMO_PAGE_CSS`，未走 `blocksCss()`＋`pageUiCss()`）。

---

## 六 可重跑清单（照本件复算）

```sh
# 仓根
node docs/skills/skill-memo-ilife/t827-probe-search.mjs                # 现状探针（路由三档 ＋ 落盘）
node tooling/run-locked.mjs --ticket 827 -- node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife
node tooling/run-locked.mjs --ticket 827 -- node --test packages/skill-memo-ilife/test/t827-search-domain.test.mjs
node tooling/run-locked.mjs --ticket 827 -- node .scratch/t827/gen-search-pages.mjs   # 等价件入仓：docs/skills/skill-memo-ilife/t827-gen-pages.mjs
node docs/skills/skill-memo-ilife/t827-mutation.mjs                    # 分隔符门正例／反例／还原
node packages/base-render/test/separator-probe.mjs .scratch/t827/pages/<产物>.html
node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/resp.json
node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t827/pages --widths 390,768,1440 --json .scratch/t827/fmt.json
node docs/skills/skill-memo-ilife/t827-判分.mjs --dir .scratch/t827   # 过渡判分件（见 §3.6）
```

⚠️ 本包**测试必须把 cwd 钉在包目录跑**；经 `run-locked.mjs` 跑时子进程 cwd 是**仓根**，故测试一律用
**绝对路径**传文件（本票用例内部全走 `import.meta.url`，不受 cwd 影响）。

---

## 七 提交

| 提交 | 内容 |
|---|---|
| `f97c3888` | 本域 `deliver` 接线 ＋ 用例 ＋ 探针 ＋ 本件（⚠️ 标题被终端代码页损坏） |
| `4c4857af` | 上条的可读信息副本（订正事故记录见下） |
| `bbe1e003` | 驱动与变异件入仓（含撞格防线） |
| `b6c26f76` | 第 11 格撞格修正（`src/wish/run.ts` scene 分格）＋ 用例扩到 7 格 |
| `bcf4ae54` | 族样式硬化（模板 ＋ pageAssets：触摸区／字号／安全区／视口／断点／色令牌） |
| `746123ff` | 生成物对齐（memo `routes.generated.ts`）＋ HTML 快照基线重铺（CI 两处红步在提交树上收掉） |
| `0d8c3dd9` | 页内收债：去 H3 重复／去 H7 英文与等号／补页内导航锚点／拉层级 ＋ 判分件与 facts 件入仓（87→96，7／7 过线） |
| `15fce2a3` | 证据件按「80 分主义」重写（补 §3.4 人眼复核、§3.6 五维尺、§五 交回项） |
| `fae7b45b` | 运行时文本收尾：元信息去 `·` 与重复场景词、编号改「第 N 条」、时间改「创建于／改于」（机器门盲区里的三处，按人眼复核收掉） |

⚠️ **一处过程事故（如实记）**：`f97c3888` 的标题用 `git commit -m` 传中文，被 PowerShell 代码页损坏；
按并发纪律不可 `--amend`／`reset`，故用 `4c4857af` 补可读副本。此后每次提交一律「先落 UTF-8 文件，用 `-F`，
提交后回读校验」。

---

## 八 收尾口径

- **做掉**：7 格真落盘（册子 seq 7–13）＋ 7 词路由全通 ＋ 反例三面 ＋ **五维尺逐页 96、7／7 过线（每维 ≥满权 80%）**
  ＋ 分隔符门／响应式门两门绿 ＋ 版式读数三档归零（`touchSmall=0`、`minFontPx=12`）＋ 人眼复核两轮
  ＋ 变异自证两行 ＋ 判分件与 facts 件入仓 ＋ 生成物与快照基线对齐（CI 两处红步在提交树上收掉）；
- **没做掉（各有主，均不在本票写集）**：机审六列（件归 #851）、页族配方搬公共层与 D5 页内定位腿（归 #851）、
  `查情绪` 在 SKILL.md 的可发现性（归 #858）、运行时渲染文本的分隔符面（门件盲区，见 §五.2，归 #851 的新机审）。
