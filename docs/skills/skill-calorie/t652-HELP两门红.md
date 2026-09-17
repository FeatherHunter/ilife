# t652-HELP 两门红：复现读数＋归因＋修法证据

票：#652。源：地图 #159 收口跑「#437 的相关门」发现；同批另开 #649／#650。

## 一、复现读数

2026-09-17 实测（先 `tsc -b packages/skill-calorie`，再 `node --test`，持锁票 652）：

- `photo-helpdoc-488.test.mjs`：**4/4 绿**。本票报的 3 例红（①现找态／②全量态／④变异自证之「命令块数 ≠ 命中数」）已不存在——`8d4c284c` test(664) 按当刻实现换了计数对象（数行内手写载荷按钮，不再数 `renderPreBlock` 区块），MUTATION-RED 八类必红＋MUTATION-GREEN 改回必绿两行齐。photo 半边本票**只记录、不重改**。
- `wake-assets-133.test.mjs`：修前 7/8，唯一红 `wake 多重集 ＝ TRIGGERS`，`actual` 比 `expected` 恰少一句「定运动目标」；修后 **8/8 绿**。

第一性原理复查把 blast radius 扩大到 #652 票面之外（同为 437 漂移所致，逐条第一断言定属）：

| 件 | 红点 | 归属 |
|---|---|---|
| `t291-自造词别名` 乙⑤ | `TRIGGERS.length` 437≠436 | 本票，已重冻为 437 |
| `no-script-commands-180` | 条目数 437≠436（hits 账本身 0，文件绿） | 本票，只改条数钉 |
| `help-center-106` ①②×3卡面④ | 场景 437／exec 433／卡面 437／text 行 437 | 本票，重冻 FROZEN＋字面 |
| `help-center-91` ①①b② | sceneTotal／sceneCount 和／id 数 437 | 本票，重冻（含按钮 1308→1311） |
| `help-delivery-139` ① | sceneTotal 437 | 本票，重冻；②（资产侧）在资产补词后同步 436→437 |
| `help-shell-134` ⑥ | subtitle／场景数（资产侧） | 本票，资产补词后重冻 |
| `help-center-88` 全绿 | — | 断言全派生（#645），只改 7 处名注零行为 |
| `exercise-wakewords-266` 全绿 | — | 资产侧，重冻 436→437 |
| `t367-唤醒词门` ③ | 未登记词 13→**12**（定运动目标已入表） | 他席（#471 别名词 2＋workout 确认词 10），本票不管 |
| `help-center-106` ③ | 冻结面 148≠130（+18） | 他席在途（疑 #471 helpCenter 改动，未证），本票不管 |
| `help-center-106` ①尾 | 唯一 CLI 实测 400≠390 | 见 §四 |

修后总账（10 件联跑）：77 用例 75 绿，仅剩 106①尾（400≠390）与 106③（148≠130）两处他席红。

## 二、归因（`git log -S`）

- `git log -S "定运动目标" -- packages/skill-calorie/src` → `fa17ba8f` feat(621)（2026-09-16 14:46，早于本票 22:0x 实测）：给 TRIGGERS 系加了「定运动目标」（`goal/routes.ts` order 436 ＋ `scene-06-goal.ts` 25→26 词 ＋ `routes.generated.ts` ＋ `goal/commands.ts`），但冻结资产 `wake-assets.ts`（头注禁手改、上次落地 09-13）未同步，`WAKE_ASSETS` 436 对 `TRIGGERS` 437 恰差这一词。
- 本票原怀疑的 `11e1ac03`（HELP 检索面）／`5384ce63`（删词＋new 表重排）均未碰 `wake-assets.ts` 与 goal 路由，不成立；#437（scene-09 prompt 分叉）不成立（两件都不 import `helpFile.ts`，prompt 指纹修前即绿）。
- `11e1ac03`／`5384ce63` 与本案无关的旁证：prompt 全量指纹（总字符＋sha256）修前即绿，说明只是多一词、不是改词。

## 三、修法（本票实施，维护者特批头注例外一次）

`wake-assets.ts` 无在仓生成器（`scripts/_triggers.py` 不存在，`scripts/` 无写该文件的生成器；#437 亦承认生成链待找回）。本票走**逐字搬运**（禁自由发挥词句，立法原意内合规）：

- `src/triggers/wake-assets.ts`：`goal_1`（定目标）子组末追加 1 对象——`id: goal_set_exercise`（＝场景 key）、`title/wake_word: 定运动目标`（＝场景 name／唤醒词，同组 8 条 title 恒等于 wake_word）、`prompt_template` 与场景行**逐字节相等**（程序化校验 `PROMPT_EQUAL=true`）、`types: ["回执"]`（output_type receipt，同组一致）、`status: ""`。派生量（`WAKE_ASSETS`／`SCENE_BY_ID`／`WAKE_ASSET_TOTAL`）自动跟进。
- `src/triggers/index.ts`：头注 `SoT 436` → `SoT 437`（一字注释）。
- 测试重冻：总数 436→437（133 四口径／180 条数／266／t291 乙⑤）；指纹总字符 48357→**48488**、sha256 → `4f4ed7c9a89b5cec20b39aeb003b80f7156c2351c24485ae75946eda5844cd33`；106 FROZEN（scenes 437／execScenes 433／uniqueCli 390，nonExec 4 不变）＋字面；91／139／134／88（名注或数字，88 零行为）；复制按钮 1308→**1311**（每卡 3，437×3）。
- 牙齿未动：多重集仍逐词对账、指纹仍逐字、变异仍两向、碰撞组 30／碰撞行 43 字面未碰、legacy 22／分组 10／子组 54 未碰。
- 台账：`wake-assets.ts` LF 4747→4757，`check-warning-line.mjs --sync` 已派生（门禁 91/91 PASS）。
- 未碰：t367③、106③（他席）；photo 系；routes 系；业务逻辑。`gen-cli.mjs` 原想改一字注释，撞见他席重构中（933→925 行），按并发纪律放弃。

## 四、级联遮蔽（本案最重要的过程发现）

fa17ba8f 把 106①的总数钉弄红（09-16）后，该文件后续断言再没跑过；他席 09-17 加的新 CLI（训记链／批量／落地训练等）把去重 CLI 推到 **400**，而 FROZEN 唯一 CLI 停在 389（#613 系总数红遮蔽下盲写，未及验证）。本票只认领 +1（`goal.exercise` CLI 全局唯一已验 → 390），断言文案写明 400 系他席在途、不代钉。教训：早失败的断言会掩盖同文件后续漂移；快照文件宜把总数钉拆到独立用例（待收口票议，不在本票动）。

## 五、边界口径（防再撞）

- 场景词（`list:'wake'` 进场景件）**进**冻结资产，本票即例；别名词（`list:'new'`／`'repair'`）**故意不进**（#343 教义不变）。以后加场景词的票自带重冻，别名票不碰。
- photo 半边：#664 的换对象修法予以认可（变异两向＋反证齐，仅 `ROWS_LEAD` 一处由锁文本降为锁出现恰一次，注释里如实写明）。

## 六、删单：照片 HELP q 支退役（维护者裁定，执行中）

- 依据：第一性原理复核——照片页 10 键 ⊆ 统一 HELP（程序化验证 `MISSING=[]`），可执行通道两边都有，差集只剩表现层（过滤视图＋约 30 句手写人话＋窄屏版式）；`t652-删单总览.html` 有全景图。
- 删（src 5＋测 1）：`photo/helpLookup.ts`、`helpDoc.ts`、`helpDocContent.ts`、`helpDocCss.ts`、`render/html.ts` 的旧 `renderPhotoHelpHtml`（#488 切走后零 src 调用方）＋`photo-helpdoc-488.test.mjs`。
- 改：`photo/help.ts` 摘 q 支（`q`／`keyword` 进来 exit 2 指路 lookup，缺省／mode 不动）；`render/index.ts` 撤 3 导出＋1 类型；8 测试件手术（t11／91②③b／345／90／t10／skill-t11／654 两行／245：摘 q 段落或换数据源；90-305 与 91④改作 exit 2 指路断言）。
- 不动：路由 17／68（跟来即见 exit 2 指路，t651 今日件零损）；生成物与 gen；缺省／mode 全家；t367／343；wake 半边（d13120b1）。
- 验收：构建绿＋q 真跑 exit 2＋lookup 出照片命中＋相关门绿（已知他席红除外）。
- 遗留注记（有意不管，零行为）：`output.ts` 的 `PHOTO_HELP_FILE_STEM` 死常量与复用名单项；`helpFile.ts:65` 指向已删文件的注释；`gen-cli.mjs` 与 `wakeword-gate-343` 头注里陈旧的 436 字样（他席文件中）。
- 过程注记：本轮撞上三处通道转码坑——pwsh 写文件必转 CRLF（以字节脚本量出 HEAD 为 LF 后改走 edit／行拼接通道，落盘后逐次验行尾）；pwsh 双引号内反引号变反斜杠、裸双引号被吃（内联 `node -e` 改走文件脚本；`--params` 改走单引号字面量）。教训已记，通道选用规则：内容写操作一律走文件工具，pwsh 只跑命令不写内容。
