# t269 ＋ t276 独立复核（审查席终验）

> 依据 `docs/subagent-concurrency-protocol.md` §5.1：实施者不得兼任自己票的审查者。本件是**另派审查席**对
> 地图 #155 两张 frontier 票（`#269` 饮食回执骨架／`#276` 命令面二阶段）的独立复核，**不采信两席任何结论**，
> 每条主张自己跑一遍。本席只审不修：除本件与草稿目录 `.scratch/review269-276/` 外未改任何件，未改任何源码。
> 用词照 `docs/agents/wording.md`（`calorie.*` 叫「命令」）；结构照 `docs/agents/structure.md`。

## 判定

| 票 | 判定 | 分（五维：契约 30／证据 25／新旧 20／红线 15／文档 10） |
|---|---|---|
| **#269** | **PASS** | 87（27／20／19／14／7） |
| **#276** | **PASS** | 90（29／21／19／14／7） |

无 S1-交付缺陷，无未记录的过程违规（三条过程/对账缺口见第四节，均已如实记录、属 S3，不动摇验收结论）。

## 一、被审提交与运行标识

| 票 | 提交（本席 `git show --stat` 自查） | 内容 |
|---|---|---|
| #269 | `a347201` | 三件测试收窄 ＋ 证据件 ＋ 可复跑脚本 7 件 ＋ 门禁对账导出件（14 件） |
| #269 | `fd6b55a`、`442c780` | 门禁对账导出件回填（各 1 件，文档） |
| #276 | `bf274e6` | `order: 40` 复进 ＋ 覆盖门与 #97 表行两条欠账 ＋ 证据（7 件） |
| #276 | `3e33048`、`17d09ba` | 证据与运行记录回填（文档） |

复核时 HEAD＝`b549002`。本席运行（全部经 `node tooling/run-locked.mjs --ticket 269review`，运行标识从
`.scratch/locks/gate-runs.log` 逐行可查）：

| 运行标识 | 做的事 | 退出码 | 等锁 |
|---|---|---|---|
| `rev269-276-readmut` | 读侧全量读数 ＋ 变体电池（M1–M4）＋ 收尾还原 | 0 | 0 ms |
| `rev269-276-p2p3` | 第二批探针（默认落点／唤醒面／场景表唯一性）＋ 旧测试件对拍 | 0 | 0 ms |
| `rev269-276-p3b`／`p3c` | 旧测试件对拍（p3b 探针自身写错，作废；p3c 修正后成立） | 0 | 200020 ms／0 ms |
| `rev269-276-p1`…（`--dry` 无） | — | — | — |

## 二、机器读数（逐条自己跑）

### #269 主张 ① 13 条写命令逐条真出口 exit 0、产物为完整文档

- 跑被审脚本（本席执行）：`node docs/skills/skill-calorie/t269-cli-run13.mjs` → exit=0，`RESULT: RUN13 ok=13/13 doc=13/13`。
- 本席**另按字节复核** 13 份产物（不看它的判据）：`RESULT-R6b own_bytes_check ok=13/13 bad=[]`（判据＝以 `<!doctype html>` 开头
  ＋ 含 charset ＋ 含 `<style>` ＋ 含 `ilife-copy-log` ＋ 长度 ＞10000）。
- **新探针（被审脚本覆盖不到）**：被审脚本 13 条全部走 `--html` 显式落点，**默认落点没人验**。本席按默认三态交付跑
  （不给 `--html`）：`RESULT-P1` 三条饮食命令 `exit=0 tpl=doc-shell full=1 doctype=1 copylog=1 under_db=1`，
  自报字节与磁盘字节逐条相等（`bytes_match=1`），落点 `＜SKILLS_DB_PATH＞/calorie_html/记一餐_回执_鸡胸_20260914_145509.html` 一族；
  同批抽的 `calorie.goal.set` 仍是 `tpl=receipt`／275 字节片段。⇒ 整页形状**不是 `--html` 带出来的**。

### #269 主张 ② 其余 33 条会改数据库的命令产物逐 sha256 未变

- 跑被审脚本（本席执行）：`RESULT-DIFF keys=46 diet13=13/13 changed=13/13 others_same=33/33 others_changed=0 fail=0` ＋ `RESULT: PASS`；
  改动前一侧 `RESULT-ONE mode=before keys=46 full=20 diet13_full=0/13`（口径＝同一棵树用加载钩子把饮食端口换成恒 `null` 替身）。
  当刻命令册写侧全量＝46 条（本席自算 `RESULT-R0 writekeys=46`），票面「22 条」是 35 条命令册时代的数字，取代关系写在证据件里。
- **本席新探针（闭集一致性，被审脚本与变异电池都覆盖不到全量）**：拿 46 条写命令逐条问饮食端口「你认领谁」——
  `RESULT-R8 closed_set claimed=13 expected=13 same=1 extra=[] missing=[] threw=[]`。即：整张命令册上，**恰** 13 条非
  `null`，一条不多一条不少（既证「13 条是闭集」，也把「其余 33 条没被新端口接走」从侧面钉住）。
- 改变面静态收敛（本席自查）：实现笔 `1f88525` 只动 `src/cli/write.ts` 一行（`?? dietReceiptDoc(...)` 续接）＋ 新增
  `src/diet/receipt.ts`；`a347201` 本笔零源码改动（14 件＝3 测试 ＋ 证据 ＋ 脚本）。

### #269 主张 ③ 三件测试由红转绿且不新增红

- 现文件（本席跑）：`RESULT-R2 target3 tests=29 pass=28 fail=1`，唯一那条红是他席的
  `#239 四张页接上「复制日志」…`（住 `test/profile-doc-179.test.mjs`，断言内容与复制区有关，不属本票）。
- **本席新做法（把「红」这一侧真跑出来）**：把 `a347201^` 的三件测试**原文**取出（只改 import 落点，**断言一字不动**），
  在**当刻编译产物**上跑 → `RESULT-P3b old_tests tests=28 pass=23 fail=5`，五条红是：
  `C6 写收据HTML结构化分项`／`#83 写键同样有 delivery（receipt 产物族）`／`#83 ⑥ 相对 SKILLS_DB_PATH ＋ 写键…`／
  `#179 其余会改数据库的命令仍是原回执片段（没被一刀切换页）`／`#239 …`（他席）。
  四条**正是本票声称修好的红点**，第五条两版都在。⇒ 红转绿成立，且不是靠删断言换来的。
- 宽面基线（10 件，本席跑）：`RESULT-R4 wide tests=162 pass=153 fail=9`，九条红全在别线件
  （`T10 照片 parity`、四条 `#239`、`#111 域内唤醒词命中`、`HELP 速查…`×2、`copyActionHtml`、`bindCopyAction`）。

### #269 主张 ④「收窄不许放宽」——派单最要紧的一条

- **反例 M1（13 条之外、且被抽样表钉住的一条）**：源码级把 `calorie.goal.set` 加进 `src/diet/receipt.ts` 的具名命令集
  → `npx tsc -b` exit=0 → 校验编译产物真变了 → `RESULT-M1 mode=src tsc_exit=0 dist_changed=1 fail=3 red_hit=1`，
  红的里面**含** `#179 其余会改数据库的命令仍是原回执片段` 与 `#83 写键同样有 delivery`。⇒ **收窄有效，未放宽**。
- **本席新探针 M2（13 条之外、且三件测试都没抽到的一条）**：把 `calorie.exercise.add` 也算成饮食整页（编译产物级同义变异）
  → `RESULT-M2 dist_changed=1 target3_red=[仅他席 #239] wide_new_vs_baseline=[]`：**三件测试与另外七件收货面测试全都不红**。
  即断言面是**抽样**（片段表只钉 `goal.set`／`goal.water`／`body.measure-add` 三条，共 33 条非饮食写命令），
  对「把没抽到的那条放宽」不设防。本票证据件的注释与 §3 已如实写明是抽样（「本条只钉剩下的抽样」），
  13 条的正面由 `t269-verify-final.mjs` 逐条实跑兜住，故按 S3 记（见第四节 D1），不判 FAIL。
- 还原三件齐：`RESULT-M1-restore src_match=1 dist_match=1`；收尾 `RESULT-FINAL src_receipt_match=1 src_pi_match=1
  dist_receipt_match=1 dist_pi_match=1 dist_pollution=0 target3_fail=1 t276_fail=0`（源码 sha ＋ dist 重编 ＋ 红点回原值）。

### #276 主张 ① `order: 40` 复进与老住处占位已删

- 本席自读源码：`src/diet/routes.ts:36` ＝ `wakeWord: '批量导入食品'`／`kind: 'exec'`／`key: 'calorie.product.import'`
  ／cli 带 `--params`；`git grep "list: .wake., order: 40"` 只此一条。`src/cli/legacy/routes/scene-02.ts` 已是**空数组**
  （`RESULT-R9a scene02_placeholder_left=0 scene02_has_decl=0`）。
- 派生件两面（本席探针）：`RESULT-P4 src_order40_key=calorie.product.import gen_kind=exec gen_key=calorie.product.import agree=1`
  —— 当刻**工作区**的 `routes.generated.ts` 与源码一致；`HEAD` 上那份仍是 `non-exec`（票 #392，已知环境性，不归本票）。

### #276 主张 ② `calorie.product.import` 真出口 exit 0 且真写进库

- **本席新探针（被审脚本没做的两种跑法）**：
  1. 把路由行**自己的 cli 文本**逐字取出来跑（不抄它的脚本）：`RESULT-R9b route_cli_exit=0 affected=1 rows=1`，
     本席自有 `SELECT` 回读 `{id:1, product_name:'测试导入燕麦', calories:389, protein:13, fat:7, carbohydrates:66, sodium:5, is_deprecated:0}` 逐列一致。
  2. 独立新库复跑：`RESULT-R10 first_exit=0 rows=1 msg="批量导入食品：新增 1…" second_exit=0 rows_after=1 msg2="…跳过 1…"`（去重不落第二行）。
  3. **反向探针**：`RESULT-R11 no_params exit=2／empty_items exit=2／脏行 exit=0 但库内 0 行`；
     逐条报文（`RESULT-R11b`）＝缺参两条都是 `ERR 2: 缺参数 items（非空数组）`，脏行那条报文是
     `批量导入食品：新增 0，更新 0，跳过 0，下架 0，失败 1` —— 没有「exit 0 而什么都没做」的假成功
     （`dist/cli/write.js` 那个坑不在此路）。
- 真库只读复核（本席，**只读**）：`D:\2Study\StudyNotes\.db\calorie_data.db` 里 `id=1940 / 测试导入燕麦 / 389·13·7·66·5 / is_deprecated=0`
  在位，库字节数 3072000 —— 与它证据件的 `BEFORE rows=0`／`bytesBefore=bytesAfter=3072000` 逐项相符。

### #276 主张 ③ 覆盖门 20/20 ＋ `#97` 场景表 46 条

- 本席跑两件：`RESULT-R3 t276 tests=75 pass=75 fail=0 exit=0`（＝`cmd-write-40-persist` 20 ＋ `m5-receipt-97` 55），
  且收尾复跑 `RESULT-FINAL … t276_fail=0`。
- 条数**自己算**（不读它的证据）：`RESULT-R5 probe_rows=45 plus1=46 writekeys=46 match=1`；
  `RESULT-P3 … uniq=46 dup=[] missing=[] extra=[]` ⇒ 场景表与命令册 46 条**一一对应且无重复**。

### #276 主张 ④ 变异自证

- A 轮（源码级）：把 `src/diet/productImport.ts` 的 `calories` 取值键改错 → `RESULT-M3 mode=src tsc_exit=0 dist_changed=1 fail=4`，
  红的四条含 `落库 · 食品 product.import（批量导入）：逐列回读`／`覆盖门 · 全部写键逐键落库断言`／`#97 · M5 四要素：calorie.product.import`／
  `#97 · idSource 三值`。还原 `src_match=1 dist_match=1`。
- C 轮（表行级）：删掉 `#97` 场景表后加的那一行 → `RESULT-M4 fail=1`，红＝`#97 · 场景表覆盖全部写键`；还原 `src_match=1`。

## 三、逐条路径

| 主张 | 件 | 本席读数 | 结论 |
|---|---|---|---|
| #269 ① | `dist/cli/cmd_read.js` 真出口 ×13 | `RUN13 ok=13/13 doc=13/13` ＋ 本席字节复核 13/13 ＋ 默认落点另三例 `full=1` | 成立 |
| #269 ② | 46 条写命令产物 | `others_same=33/33 others_changed=0` ＋ 闭集探针 `claimed=13 same=1` | 成立（before 侧取值法见第五节） |
| #269 ③ | `profile-doc-179`／`calorie-c43`／`delivery-83` | 现文件 29/28/1（红为他席）／旧文件 28/23/5（四条本票红点） | 成立 |
| #269 ④ | 具名命令集 | M1（抽到的一条）红；M2（没抽到的一条）不红 | 抽样内成立，抽样外不设防（D1） |
| #276 ① | `src/diet/routes.ts:36`、`scene-02.ts` | exec／key 对得上；老住处空数组 | 成立 |
| #276 ② | `calorie.product.import` | 路由原文实跑 exit 0＋7 列回读一致 ＋ 复跑去重 ＋ 反向探针 2 个非零 ＋ 真库行在位 | 成立 |
| #276 ③ | `cmd-write-40-persist`／`m5-receipt-97` | 75/75／0；场景表 46 且唯一 | 成立 |
| #276 ④ | 变异三轮 | M3 四红、M4 一红，还原双 sha 一致 | 成立 |

## 四、缺陷清单（逐条：归属 ＋ 分级）

- **D1（#269，本票范围，S3）**：片段断言面是**抽样**。把 13 条之外、且三件测试都没抽到的写命令
  （`calorie.exercise.add`）改成整页，三件测试与另外七件收货面测试**全不红**（`RESULT-M2 wide_new_vs_baseline=[]`）。
  票面「收窄不许放宽」在**抽样内**成立（M1 红），在**抽样外**无锚。不判 FAIL 的依据：本票证据件的用例注释与 §3 已如实写明
  「本条只钉剩下的抽样」「不断言＝口径无锚，跳过＝放宽，都不许」，13 条正面另有逐条实跑读数；它没有把抽样说成全量。
  **下一手**（若要闭合）：把片段表的抽样换成「46 条命令册 − 已切整页清单」的**派生式全量断言**（加一条命令不失锚）。
- **D2（#269，本票范围，S3·对账）**：证据件三处引的运行标识 `t269f-verify-docs` 在 `.scratch/locks/gate-runs.log`
  **没有对应条目**（同命令 `g11-windowA.cmd` 的留痕标识是 `t269f-windowA`，exit=0）；按 §2.4 第 3 条③「声明必须引运行标识、
  只认标识相同的条目」，该条声明成立不了。同时 `t269f-commit3`（`442c780` 那一笔自己的窗口，exit=0）在日志里**有留痕、两份文档里都没声明**。
  判据：`442c780` 的提交信息自称「导出件自身这次提交的运行条目…如实声明」，但 `t269-final-verify.md` 第七节并无此行。
  按 §2.4 第 3 条末句「没有声称的运行不按裸跑追究」，此条不记为过程违规；`t269f-windowA` 留痕在位、exit=0，实质未被伪造。
  **修法＝一行**：把 `t269f-verify-docs` 改成 `t269f-windowA`，并补一行 `t269f-commit3`。
- **D3（#276，本票范围，S3·对账）**：`t276-证据.md` §5.8 的提交清单只有 `bf274e6`／`3e33048` 两行，**漏 `17d09ba`**
  （第三笔文档提交，`docs(276)`）；该笔自己的窗口 `d191ca3e-…`（`commit-p2b.mjs`，exit=0）在日志里有留痕，
  两份 276 文档都没声明（递归尾部缺口，与 D2 同源）。修法＝清单补一行 ＋ 运行记录表补一行。
- **范围外发现（不决定判定，只报编排者）**：
  - `HEAD` 上 `src/triggers/routes.generated.ts` 与 `src/cli/keys.ts` 仍是**派生件旧值**（批量导入食品 `non-exec`、写 45 条），
    属票 **#392**；当刻工作区已被他席重生成（写 46／读 72 ＝118 条），本票的读数是在**重生成后的工作区**下取的（`RESULT-R0 writekeys=46`）。
  - 宽面九条红（`T10 照片 parity`／`#239`×4／`#111`／`HELP 速查`×2／`copyActionHtml`／`bindCopyAction`）与
    `test/t358-missing-ask`／`trend-homogeneity-110` 一族均属别线在途件，本席未认领、未代改。
  - 真库落了一行测试数据（`id=1940 '测试导入燕麦'`，`D:\2Study\StudyNotes\.db\calorie_data.db`）。它是 #276 证据件声明的
    「真库实跑」的产物，本席只读复核、**未清除**（清除属用户数据操作，须由编排者/用户裁决）。

## 五、未做项与下一手缺什么

1. **未跑全量 `pnpm test`**（共享工作区摆动 ＋ 锁窗口成本）：以「靶向 3 件 ＋ 两件 #276 测试 ＋ 宽面 10 件（162 用例）」取代，
   并逐条给出红点归属（见三、四节）。下一手若要全量：请给一个独占窗口，或接受他席在途件造成的既有红。
2. **#269「其余 33 条未变」的 before 侧未换树重跑**：`D:\ilife-wt\t155-269`（`db329e3`）**已含本票实现**，
   不能当 before；故本席的独立证据＝改变面静态收敛（`1f88525` 只动一行）＋ 闭集探针 ＋ 复跑被审脚本的 before/after 两侧读数。
   下一手若要硬证据：checkout `1f88525^` 建独立工作区、装依赖、用同一份命令表对拍 sha256。
3. **未核 `pnpm gen:check`**（已知摆动值，票 #392，不归本票）。
4. 本席第二批探针里的「唤醒词→命令 真分派」**未成立**（`routeWakeword()` 只认 `WAIT_TABLE` 三条餐别别名，本席调用约定不符），
   已弃用、不作为读数；#276 的接线证据由「路由原文逐字实跑 ＋ 派生件两面一致」承担。
5. 本席探针脚本（`probe.mjs`／`probe2.mjs`／`probe3.mjs`／`realdb-check.mjs`）与全部原始日志住
   `.scratch/review269-276/`（未受版本控制）；按派单「只提交你自己的这一个件」，本件**不自带脚本**，
   每条读数都在第二、三节给了可复核的命令名、标识与摘要行。
