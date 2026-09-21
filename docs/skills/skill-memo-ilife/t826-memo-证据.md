# #826 备忘域 6 场景端到端 · 交付证据

> 票：[#826](https://github.com/FeatherHunter/ilife/issues/826)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
> 本域 6 场景 seq 1–6（记备忘／改备忘／删备忘／备忘改分类／备忘改子分类／备忘改分类-批量）＋ 过程页 seq 31。
> 结论先行：**唤醒词 6 主名全通、4 命令真跑 7 格全落盘（exit 全 0）、分隔符门 7 件全 0、响应式门 21 格全 0、六列机审 7/7 PASS、五维尺 7/7 页 96 分过线**；九 § 为 #851 关票后补跑的两门读数。验收五条全绿，本票可关。

---

## 一 交付对账（必报五步第五步：事前清单逐行对，偏差标出）

事前清单见本票评论《影响清单与结构设计》。对账如下。

| # | 事前 | 实际 | 偏差 |
|---|---|---|---|
| 1 | `src/memo/index.ts` 新增能力门 | #855 已落（`MEMO_COMMANDS`＋`WAKE_TOPS`），本票未动 | 无需新建（框架前置已备） |
| 2 | `src/memo/commands.ts` 命令声明 | #855 已落（5 键），本票未动 | 同上 |
| 3 | `src/memo/routes.ts` 路由声明 | #855 已落（主名 6＋别名 4，order 11–16／29／30／34／35），本票未动 | 同上 |
| 4 | `src/memo/pages.ts` 本域页面源 | 落为 **`src/memo/receipt.ts`**（83 LF）：6 格槽位装配（`memoCreatePage`／`memoUpdatePage`／`memoRemovePage`／`memoBatchResultPage`）＋ `MemoReceiptScene` | 改名：照 `src/wish/receipt.ts` 的域装配形状（对称），不另立 `pages.ts` |
| 5 | `src/memo/receipt.ts` 回执装配 | 见上（与 4 合并） | 同上 |
| 6 | `src/cli/cmd_read.ts` 共用位 | #855 已拆（367→318 LF），本票未动 | 前置已备 |
| 7 | `src/policy/wakewords.ts` 共用位 | 已撤（路由走 `src/triggers/routing.ts` 读生成表），本票未动 | 同上 |
| 8 | `src/render/**` 共用位 | 本票动了两处最小开口（见下） | **偏差**：族注册要求逐域追加，无法只写自家目录 |

**共用位两处最小开口**（逐行追加，不改别人行；`src/render/receipt.ts` 的 6 行已由在途会话随手提交，本票认领）：

- `src/render/receipt.ts`：`RECEIPT_SCENES` ＋6（`memo_add_basic`／`memo_update_basic`／`memo_delete_basic`／`memo_change_category_single`／`memo_change_subcategory`／`memo_batch_change_category`）；族剩 3 格（checkin 域）归 #830。
- `templates/change_category.html`：复制区说明行 `·` 拆成 `dl` 两条（照 `templates/receipt.html` 同日落定的形状）＋ 向导 `meta` 行 `·` 改括号（分隔符门 R1 消债）。
- `templates/receipt.html` 的同款 `·` 由在途会话先修（本票未动该件，只消费结果）。
- `test/receipt-831.test.mjs`：反例断言收窄为只数 mood 三主体（备忘笔记的改／删自本票起落自己域的页，原断言「总数不变」已无真值；意图「不冒充」不变）。

**本域 `run.ts` 改动**（只加分岔，不改既有行为；`git diff` 逐 hunk 带 `#826`）：记备忘分支（备忘行）／改备忘系三格（纯分类补丁→单条、纯子分类补丁→子分类、备忘行字段改→改备忘）／删备忘分支（备忘行）／批量执行结果页／批量收集 stem 改册子过程页主体。心愿／情绪日记／提醒三支一行未动；打卡那支留给 #830。

## 二 真跑记录（唯一出口，临时库 ＋ 隔离家目录）

驱动 `.scratch/wf826/t826-true-run.mjs`（可重跑；种子 5 条直插，7 趟全走 `dist/cli/cmd_read.js`）：

| 场景 | 命令 | exit | 主体 | 产物（绝对路径） | bytes | 落盘一致 |
|---|---|---|---|---|---|---|
| 记备忘 | `memo.create` | 0 | 记备忘 | `…\Temp\memo-826-pljCGz\memo_html\记备忘_20260921_175426.html` | 17793 | ✓ |
| 改备忘 | `memo.update` | 0 | 改备忘 | `…\memo_html\改备忘_20260921_175427.html` | 17793 | ✓ |
| 备忘改子分类 | `memo.update` | 0 | 备忘改子分类 | `…\memo_html\备忘改子分类_20260921_175427.html` | 17863 | ✓ |
| 备忘改分类 | `memo.update` | 0 | 备忘改分类 | `…\memo_html\备忘改分类_20260921_175427.html` | 17841 | ✓ |
| 删备忘 | `memo.remove` | 0 | 删备忘 | `…\memo_html\删备忘_20260921_175427.html` | 17791 | ✓ |
| 批量收集 | `memo.batch` | 0 | 备忘改分类-批量-向导 | `…\memo_html\备忘改分类-批量-向导_20260921_175428.html` | 23659 | ✓ |
| 批量执行 | `memo.batch` | 0 | 备忘改分类-批量 | `…\memo_html\备忘改分类-批量_20260921_175428.html` | 17945 | ✓ |

产物另存 `.scratch/memo-826/artifacts/`（7 件，与上表逐字节一致，供收口 #834 取用；活库与真家目录零写入）。

## 三 路由读数（探针真喂生成表，可重跑 `.scratch/wf826/probe-memo-routes.mjs`）

6 条主名：记备忘→`memo.create`／改备忘→`memo.update`（缺 id 报槽位）／删备忘→`memo.remove`／备忘改分类→`memo.update`（单条，order 14）／备忘改子分类→`memo.update`／批量场景主名同词。4 条别名：批量改分类→`memo.batch`／改子分类→`memo.update`／记一条→`memo.create`／添加笔记→`memo.create`（单独喂词时全中）。

已知特性（非缺陷，框架既定语义）：「备忘改分类」一词两场景同长并列，按 `order` 升序由单条胜出；整句 prompt 若同时含「批量改分类」与「备忘改分类」仍落单条——批量走无歧义别名或直调 `memo.batch`（路由 `cli` 例即此）。改动该语义归框架票，不在本票。

## 四 四门读数

| 门 | 跑法 | 读数 |
|---|---|---|
| 分隔符门 | `separator-probe.mjs` 逐件跑 7 产物 | **7 件全 exit 0**（节点级＋行级双 0；改前家族模板 1 处 `·` 已清，见一 §共用位） |
| 响应式门 | `measure-responsive.mjs --dir .scratch/memo-826/artifacts` | **OVERFLOW-ZERO pages=7 cells=21 failed=0**（390／768／1440 三档零溢出，exit 0） |
| 机审六列 | 票面写的 `t407` 经 #824 裁定本图不用；备忘录版归 #851（未开工） | **跑不了**（待确认 ①） |
| 五维尺 | 票面写的 `t<票号>-判分.mjs` 不存在；引擎归 #851（未开工） | **跑不了**（待确认 ②；过渡口径「判分复制件＋人核」在 `t824-视觉基准.md` §4，本票产物已备齐待喂） |

## 五 测试读数（`run-locked.mjs --ticket 826` 串行）

- 编译 `tsc -b packages/skill-memo-ilife`：exit 0。
- 行数门 `check-warning-line.mjs`：**103/103 PASS**（超线 0；本票新件 `src/memo/receipt.ts` 83 LF 已在册；`run.ts` 311 LF 在册备查）。
- 绿：`cli` 6/6、`render` 5/5、`cmd-registry-855` 13/13、`wizard-pages-665` 6/6、`receipt-831` **10/10**（反例收窄后回绿）。
- 红（**非本票**，归 #828 在途改路由未合测试）：`policy` 1（设提醒 needs）、`route-table-parity-855` 2（设提醒／查已提醒备忘）、`cmd-850` 1（同族）、`skill` 1（同族）—— 均为 remind 域未提交改动与已提交测试的差，动过的文件是 `src/remind/routes.ts`＋生成表，本票未碰。

## 六 并发记录（同工作区多席，照实记）

- 本票施工期间 #828／#829／#830／#827 四席同时在途：`src/render/receipt.ts` 一日内被三席追加（mood→remind→wish→本票 6 行，各自只加行，`git diff` 可见）；`templates/receipt.html` 的 `·` 由别席先修，本票复核后未重复改。
- 中途见过一次红树（#829 会话写坏 `src/memo/run.ts` 编码，`tsc` 报 `Unterminated string literal`）：本票未碰该文件，数分钟后该席自修（拆分落定 `receiptPage.ts`，`run.ts` 367→285），复测转绿。教训已留给编排者：同文件多席写时，坏一次全席等。
- 编译／测试／落锁一律经 `run-locked.mjs --ticket 826`（遇活锁只等不抢，共 4 次等待记录）。

## 七 遗留出口（本票不夹带，逐条有去处）

1. 六列机审与判分引擎 → #851（本票产物已备齐，引擎落成即喂）。
2. 打卡三场景的记／改／删页 → #830（本票分岔已给它们留 `undefined` 口，行为零改动）。
3. `src/triggers/routes.generated.ts` 未提交的重导 → 重导者（本票未碰路由）。
4. 快照门 `skill-html.snapshot.json` 的 memo 键表（缺新两键）→ 快照主（本票未加键）。
5. 一词两场景的并列语义（order  tie 落单条）→ 框架口径（如要改，由框架票定）。

## 八 对抗式自查（逐条验收命令，真／假）

- 本域命令真出口：真（7 趟 exit 0 ＋落盘＋字节一致，二 §）。
- 分隔符门双 0：真（7 件 exit 0）。
- 响应式三档零溢出：真（21 格 0）。
- 机审六列 exit 0：**真**（`t869-机审.mjs --dir` 7/7 PASS，六列全 0；九 §）。
- 五维尺逐页 ≥90：**真**（`t827-判分.mjs --dir` 7/7 页 96 分，RECONCILE 差 0；九 §）。
- 源码只碰声明路径、产物主体逐字对册子（7 主体＝册子 seq 1–6／31）：真（`stemOk` 全绿，二 §）。

## 九 待确认①②消账（#851 关票后补跑，读数目录 `.scratch/memo-826/gates/`）

前置变化：#851 关票（判据三件落定：#868 公共层判分引擎、#869 备忘录六列机审、#870 共用形状件＋备忘录接线——自持 CSS／运行时退役，模板 20:55 全量重接）。本票产物在 #870 之前（17:54）已过期，**全部重跑**（新库新时间戳，7 趟 exit 0，主体与字节一致；旧 7 件留 `.scratch/memo-826/artifacts/` 备查）。

| 门 | 命令 | 读数 |
|---|---|---|
| 机审六列 | `t869-机审.mjs --dir .scratch/memo-826/gates/pages` | **RESULT: 7/7 PASS ①0 ②0 ③0 ④0 ⑤0 ⑥0**（⑤c 旁证 0；名单对册子 0 漂移） |
| 分隔符门 | `separator-probe.mjs` 逐件（票面原命令） | 7 件 exit 全 0（节点级＋行级双 0） |
| 响应式门 | `measure-responsive.mjs --dir … --json resp.json` | **OVERFLOW-ZERO pages=7 cells=21 failed=0** |
| 版式读数 | `t516-判据-版式.mjs --dir … --json fmt.json` | 7/7 件读数完成；窄档字号 12；越界 0 |
| facts | `t826-facts.mjs`（`t827-facts.mjs` 过渡复制件，口径一行未动） | 6 回执页 dup=0 english=0；向导页初判 english=2（两处 `AI`）→ 修后 0 |
| 五维尺 | `t827-判分.mjs --dir .scratch/memo-826/gates --json score.json` | **7/7 页 96 分（D1 15／D2 20／D3 25／D4 15／D5 21，硬扣 0），7/7 过线；RECONCILE 差 0（49 项）** |

判分前修的三处（全是本域写集内，零行为改动；修后重跑 7 趟＋四门全绿）：

1. 向导模板两处 `AI` → `助手`（facts 英文 2→0，H7 消债；照 #827 同款处置）。
2. 同模板副标题 `→` 链改直述（运行时可见债，门看不见但人看得见）。
3. `src/memo/receipt.ts` 批量结果摘要 `→` 改 `，`（t869 ⑤c 旁证 1→0）。

D5＝21 的构成（满 25）：toc 腿 −4（回执页无页内目录；与 #827 七页同值，族形状归 #851；仍 ≥ 下限 20）。d1／d2／d4cut 人核位 null 按 0（乐观上界，已如 #827 般声明；终审 #835 另判）。
