# t195 第五节：旧件摆正＋门禁＋纪律自查

只读两份事实包：`05-skill-home-today.md`（下称 `05`）、`04-constraints.md`（下称 `04`）；引用格式 `05:55`＝该文件行号。本票只给形状与判据，不写生产代码；标「建议」者皆为建议，不是定论。

## 1. 就地摆正的旧件

### 1.1 `packages/skill-home/src/cli/cmd_read.ts`（741 行）

- 改什么：只把 `case 'home.help.lookup'`（`05:46` 指到 `:674-678`）那一支挪进 `src/help/`，分派段只留一次调用。
- 为什么必须改：741 行 − 350 ＝ 超 **391 行**（`04:51`，约 2.1 倍），已触发第四步「超线报警」（`04:68`）；本票又要往这条支路加「落 help 文件＋回执绝对路径」，就地摆正要求旧代码不一致时同处修好（`04:67`）。
- **这 350 是哪来的（必须披露）**：`docs/agents/structure.md:70` 只给口径不给数字（「具体数字由各包自己定，写在各包自己的地方」）；350 ＋ LF 是**兄弟包先例**——落点 `packages/skill-chef/AGENTS.md:7`，`packages/skill-memo-ilife/AGENTS.md:7` 同数同口径。`packages/skill-home/AGENTS.md` **实测不存在**、包内该词零命中（`04:73`、`04:83`）。故上面那句「超 391 行」是**借兄弟包的数字算出来的**，不是本包既有规矩。
- **就地定本包数字与数法（动作，不是建议）**：本包先定下自己的告警线数字与数法（先例数法＝ LF、只数 `\n`、按文件不按目录），写进 `packages/skill-home/AGENTS.md`（`structure.md:70`、`06-precedents.md:81`）；数字与数法由谁定、定多少，本文件不替用户拍板。**本包数字一旦不是 350，上面那个 391 要按本包数字重算**（741 − 本包数字）。
- 会影响谁、要不要先打招呼：`cmd_read.ts` 是**零导出**（`05:20`），今天没有别的文件 import 它的符号，抽走一支不动包内其它件；会动到的只有 `test/cli.test.mjs` 的黑盒 spawn（`05:75`），那是端到端，不看文件内部形状。
- 抽不抽（已定，见 §6 第 1 条）：**本票只抽「看帮助」那一支（`home.help.lookup`），不整份重排。** `dispatch()` 不搬（它握 `openHomeDb`／`resolveDbPath`，`04:37-39`）；该支约 5 行，抽完 741 行仍在告警线之上。该文件的更大范围抽件不属本图（整包按 HELP 一级分组重排另立票）；票 7 #190 只按票 4 #187 的出口口径调整调用。
- 开库时机（已定，不再讨论）：`:55-59` 的「分派前先开库」是 help 落文件要不要开库的争点（`04:45`）。**票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。** 故本票不改写 `:55-59`，只把「本票不改开库时机」这一句写进改动说明。

### 1.2 `packages/skill-home/package.json`

- 改什么：`scripts.test`（`05:53`）今天只跑仓根 scaffold 两件；`node --test` 只跑显式给出的文件路径、不做目录发现，故 `packages/skill-home/test/*.test.mjs` 五件一律不跑（`05:55`），本票新增的 help 落文件行为没有回归网。改为能跑到包内五件用例。
- 影响面：只一条脚本字符串；`files` 三条（`05:54`）不动发布面。注意 `files` 里的 `SKILL.md` 是工作区未提交新增行（`05:84`）——**别碰**。

### 1.3 `packages/skill-home/scripts/build-help.mjs`

- 改什么：`build` 里加一次换行探测（读文本时查 `\r\n`），注入块与整份回写跟检出换行一致。为什么必须改：脚本自己（`:14-19`）注入块只用 LF、`lines.join('\n')`（`04:28`），读法只为「按 utf8 读、不探也不还原」这个事实负责（`04:30`、`04:86`）。
- 影响面：`SKILL.md` 的 `<!-- HELP-AUTO-* -->` 块（`05:68`）由构建期重写；另有子代理正在改这份工作区文件（`05:69`、`05:83`），**它的改动只读不碰**，替换文本要等它落地后再对齐。

### 1.4 `packages/skill-home/templates/help.html`

- 改什么：**建议留、且只做微改（不加壳、不搬走）**。为什么：**这份文件今天不被任何 `.ts`／`.mjs`／`.json` 按字面引用**——本席重跑 `grep "help.html" packages/skill-home`（`--include=*.ts`／`*.mjs`／`*.json`）**实测 0 命中**，读取面全是**按名键间接**（4 处源码 ＋ 1 处快照实物，**共 5 处**）：`src/render/templates.ts:27`（`HOME_TEMPLATES` 里那一项 `'help'`）／`:55`（`templateFor` 把 `home.help.lookup` 映成 `'help'`）／`:62-67`（`loadTemplate` 拼 `name + '.html'` 读盘，模板目录在 `:60`）／**唯一生产调用点** `src/cli/cmd_read.ts:721`（`fillTemplate(loadTemplate(templateFor(key)), …)`）／快照实物 `tooling/skill-html.snapshot.json:697` 一条 `home/tpl/help`（锁 `bytes` ＋ `sha256`）。
- 影响面：改名或删除**破 2 处**——`test/render.test.mjs`（断言 21 件模板三标记各 1 次，`05:62`）破 **1 份测试**，`tooling/skill-html.snapshot.json` 破 **1 条**（`home/tpl/help`）；这是本票最该避的涟漪。注意读取面 5 处与破处 2 处**不是同一个集合**：另外 3 处（`templates.ts` 三处）改动时不会自己变红，名字对不上要跑到编译期／运行期才炸——这正是「按名键间接」的代价。落 help 文件应走同一套「help 模板 ＋ 公共层 `base-paint/help-shell`」，不是另起模板。

### 1.5 `src/help/index.ts`／`src/help/lookup.ts`

- 改什么：待定。`index.ts` 是纯 barrel（`05:26`、`05:44`）；`lookup.ts` 今天只出 `HelpHit`／`buildHelpLookup`／`lookupHelp`（`05:27`）。
- 要不要动：若本票只把「写文件＋回执路径」做成新函数挂进 `src/help/`，则 `lookup.ts` 不动，`index.ts` 加一行转发。若改 `lookup.ts` 的 `HelpHit` 形状（`05:45`），会牵动 `render/views.ts` 的 `HelpItem`（`05:39`）与 `cli.test.mjs` 的全表断言（`05:75`）——本票不建议。
- 影响面：`index.ts` 只被 `src/index.ts` star 转发（`05:19`）与 `scripts/build-help.mjs` 构建期 import（`05:49`）；加一行转发不影响它们。

### 1.6 内容资产线（生成物／生成器／摘要锁／禁手改）

- **形态已定，不再讨论形态**：用户 2026-09-12 裁定「照卡路里、饼干记账的做法」——两家都是**机器生成 typed `.ts`** 资产：`packages/skill-calorie/src/triggers/wake-assets.ts`（本席实测 255362 字节，与 `08-calorie-practice.md:7` 逐字相符；但**按 LF 数得 4747 行**，该文记的是「4733 行」——差 14，说明那份文档那个「行」不是 LF 口径，数法本身要定，同 §1.1 那格）与 `packages/skill-bill/src/triggers/wake-assets.ts`（38556 字节 ／ LF **986**，与 `09-bill-practice.md:7` 逐字相符），都带生成器与摘要锁（**锁在测试里**），生成物明文禁手改。居家今天**这条线一件都没有**（`packages/skill-home/src/triggers/wake-assets.ts` 实测不存在、包内无摘要锁件），本票要整条建起来。
- **① 内容资产（机器生成的 `.ts`）**：落点**待定**（不照抄 `src/triggers/`——那是工种名）；件头注释写明「机器生成，禁手改」＋生成器入口与 `--check`（先例：bill `wake-assets.ts:8-10`、`gen-wake-assets.mjs:144-146`；chef `sceneData.ts:1-17`）。影响面：新件，不动旧件，但内容只能由事实源改。
- **② 生成器脚本（带 `--check`）**：落包内 `packages/skill-home/scripts/gen-help-assets.mjs`（与既有 `build-help.mjs` 并列，`structure.md:69`）；`--check` 只比对不落盘、不一致退非零（bill 先例 `gen-wake-assets.mjs:243-249`）；形状断言 fail-closed（bill `:99-118`：域数／组数／场景数／id 唯一／`types` 都落在模板配色表内）。事实源（老 yaml，`t188-body.md:22`）**只读**。
- **③ 摘要锁（进测试）**：落 `packages/skill-home/test/help-assets.test.mjs`（新建）——锁放测试里、不放生成器里（先例：卡路里锁在根测试 `test/calorie-triggers.test.mjs`，账单锁在包内 `test/wake-assets.test.mjs:14`）＋与口径层 `WAKE_TABLE` 双向对账（bill `:68-84`）。**这里居家要比两家做得好**：锁必须**真进包内门**——`scripts.test` 今天跑不到包内用例（§3），锁不进门等于没锁；三家现状里这一格是空的（bill `09-bill-practice.md:17` 记「一等门：无」）。
- **④ 生成物禁手改**：有牙的「禁手改」＝件头明文 ＋ `--check` 可复跑 ＋ 摘要锁进测试，三缺一，手改生成物在仓内就没有机械门。
- **协调风险（必须有人认领）**：生成器这条线与 `scripts/build-help.mjs` **抢同一块 `SKILL.md` 注入块**——`build-help.mjs:10-11` 的 `<!-- HELP-AUTO-START -->`／`<!-- HELP-AUTO-END -->`，`:24-29` 读整份 `SKILL.md`、只重写标记块后整份回写；而生成器这侧也被记为要碰同一块（`t195-part5-overview.md:25`、`t195-structure-design.md:32`：两边都碰注入块，边界面要写清）。两边重写同一块，**后跑的一方会把前一方的改动整体覆盖**（§1.3 的换行修法只改了 `build-help.mjs` 一侧，覆盖方向还会把换行还原回去）。开工前必须**二选一写清谁负责**：(a) 注入块**唯一归 `build-help.mjs`**，生成器只出资产、不碰 `SKILL.md`（卡路里先例就是这一形：`08-calorie-practice.md:15` 记 `build-help.mjs` 只重写标记块、不碰 `wake-assets.ts`）；(b) 生成器也写该块，则须定下**串行顺序（谁先谁后）＋唯一负责人**。本文件不替用户拍板，记进 §6。

## 2. 边界门禁

- 摘不摘 `'skill-home'`：**建议摘**（`04:10` 的 `:55` 名单今天只剩它一个）。不摘的话，新件一旦 import `base-paint` 就同时撞两道断言——依赖闭包（`04:12`，包 `dependencies` 只有 `base-link-core`，`04:21`）与源码／模板扫描（`04:14`），各记 1 处破界。摘名单＝宣布它是有意消费方（`04:19`）。
- 同批还要改什么：照 chef 先例，「加 `"base-paint"` 依赖」与「从 `:55` 摘名」是**同一动作的两半**，一次做完（`04:21`，先例引 `:52`）。只摘不补、或只补不摘，都停在中途。
- 风险一句话（**如实说：摘名会把这道门禁整段架空，不是「少拦一道」**）：摘掉后这道门禁**不再**替 skill-home 拦越界，此后该包再 import 别的 `base-*` 不会有人喊停，护栏只剩评审。更重的是**假绿**：`tooling/check-boundaries.mjs:55` 名单会成**空数组**，`:57-62` 的依赖闭包断言随之空转、`:74-78` 的 `SRC_SCAN` 为空使 `:77-78` 退化成恒真，脚本**照样打印 `boundaries: PASS`**。对照实测（本席刚跑）：今天 9 行 `OK` ＋ `boundaries: PASS`（exit 0），其中 `OK: skill-home 依赖闭包不含 base-*（实得：无）` 与最后一条 `OK: 未迁移技能源码／模板不 import base-*（命中：无）` 分别由 `:57-62`、`:77-78` 打出；摘名后**前一条整条消失**（断言没了、连 OK 都不再打印），后一条仍在打印但已经不代表任何东西，末行还是 PASS。所以摘名之后的 PASS **不能当作验收证据**。
- 必须配套的动作（**二选一，写清选哪条、谁负责**，`t195-decisions-record.md:72` 记的也是二选一）：(a) **补一条等效断言**——摘名的同一批里，把 skill-home 单列成「只许 `base-paint/help-shell`、其余 `base-*` 仍拦」的白名单，让它不再靠空数组（`structure.md:68` 的就地摆正要求）；或 (b) **明确改由行为面门禁兜底**——源码面不再有本包断言，口径写成「本包页面产物由 `pnpm snapshot:html:check` ＋ 包内测试钉住」。两条路都要把「为什么可以」写进改动说明。本文件不替用户拍板。
- 判据三条（各写预期）：
  1. `node tooling/check-boundaries.mjs` → 预期 `boundaries: PASS`（exit 0）；若真破界，预期 `boundaries: N 处破界` ＋ 退出码 1（`:80`）。⚠️ 单看这一条**区分不出假绿**，必须与上面的配套动作同时验：选 (a) 要能看到新断言的输出行，选 (b) 要知道这一行今后不再守本包。
  2. `pnpm snapshot:html:check` → 预期逐件一致（exit 0）：居家在这份快照里是 `{ id:'home', dir:'skill-home' }`（`tooling/skill-html-snapshot.mjs:46`），键数与模板数**各 21 条钉死**（`home/keys` 恰 21 个 key、`home/templates` 恰 21 个名）。**本票 §1.4 若微改 `templates/help.html`，这条必红**：得先走 `tooling/skill-html-snapshot.mjs:374` 的 `MARKER_ALLOW` 显式放行＋审查，再 `pnpm snapshot:html`（`package.json:17`）重写快照——**不许顺手重写**。⚠️ 本席**未跑**这条（`--write` 会落盘）；且工作树里 `tooling/skill-html.snapshot.json` 与 `packages/base-render/assets/help-template.html` 今天都处于**他会话未提交**的改动中，故开工时若已红，先分清「既有红」与「本票碰红」。
  3. `node --test test/scaffold.test.mjs` → 预期 2 条 `it` 全过（exit 0）：`:6-8` 跑 `tooling/check-boundaries.mjs`、`:10-12` 跑 `tooling/write-snapshot.mjs --check`（`05:55`）。第二条锁的是 `ilife-skills`／`base-combos` 快照，**与居家无关**：它若红，先判是不是既有红（他会话正在改 combos 侧），照实记、别去改。

## 3. 回归网缺口

- 要不要同批修：**建议修**。判据：`node --test` 只跑显式给出的文件路径、不做目录发现；`scripts.test` 给的是 `../../test/scaffold.test.mjs`（`05:53`），于是包内 `test/*.test.mjs` 五件（`05:73-79`）从包目录跑一律不执行，仓根脚本才显式列了这条 glob（`05:55`）。
- 修法一句话：本票新增「落 help 文件＋回执绝对路径」，而这条支路今天只回 `{ items, total }`（`04:47`、`04:84`），没有任何回归网罩得住；修法＝把 `scripts.test` 改成显式列出包内五件（或包内 glob），并保留 `../../test/scaffold.test.mjs`；注意用例 import `dist/**`，跑之前必须先 `build`（`05:55`、`05:86`）。

## 4. 铁律五条逐条自查（原文摘录见 `04:57-61`）

- 铁律一 · 能力自治：**有疑问**。本票要碰的活（分派一支＋落 help 文件）都住技能自己的目录里，走公共层 `base-paint/help-shell` 出口即可；疑问在「落文件」这一步有没有借别家的写法，须在尺寸设计里点明。
- 铁律二 · 概念唯一：**有疑问**。HELP 的过滤规则今天有两份独立实现（`buildHelpItems` 与 `lookupHelp`，`05:46`）；本票**不建议**顺手合并——那会同时动 `views` 与 `lookup`；但「本票不合并」这句必须写进影响清单，否则口径有两个定义地这道坎一直挂着。
- 铁律三 · 改动可预告：**本票要做**。上条文件与 `package.json` 的改法见 §1；逐行对账留到第五步，那是整套纪律唯一的机械验收点（`04:69`）。
- 铁律四 · 名字取自 HELP：**待命名，暂不判合规**。方向没问题——新件住 `src/help/`（HELP 一级分组）、沿用 `help.lookup` 这一级；但**名字本身还没定**（新件叫什么、`src/help/index.ts` 加不加件，见 §1.5「改什么：待定」与 §6 第 3 条），名字未定就不能判「合规」。待名字落地后，按「讲得出它属于哪一组的哪一步」复核。铁律五 · 接口小、里面厚：**有疑问**——`src/help/index.ts` 今天只出 3 个名（`05:26`），离「不多于五个」还有余量；但「落文件」若直接挂在 `lookup.ts` 上，这层就从「速查」扩成「速查＋落文件」两件事，建议另起一件。

## 5. 必报五步走到第几步

- 第一步 · 影响清单：**本次要做**。§1 已给候选清单；待用户看过再动（`04:65`）。
- 第二步 · 结构设计：**本次要做**（本文件即本节）。树、每文件职责与导出几个、共用件被谁用，要给全（`04:66`）；本票只给到形状，未给最终文件名单。
- 第三步 · 写代码：**留待何时**——本票不写生产代码，由用户点头后的实现票做。
- 第四步 · 超线报警：**本次要做**，且是当场报。`cmd_read.ts` 741 行已超线（`04:51`）；报告话术照原文「已超线，需要根据规则进行重构。」＋为什么超＋拆法（`04:68`）。
- 第五步 · 交付对账：**留待何时**——本票只出文档，最终对账落在实现票交付时（`04:69`）。

## 6. 我定不下来的

1. `cmd_read.ts` 本票抽多少块？**已定，不再是问题：票 #195 只抽「看帮助」那一支（`home.help.lookup`）；`dispatch()` 不搬；该文件的更大范围抽件不属本图（整包按 HELP 一级分组重排另立票）；票 7 #190 只按票 4 #187 的出口口径调整调用，不承担搬分派函数的责任；票 6 #189 与这件事无关。**
2. 本票要不要顺手修开库时机（`:55-59` 对所有命令都先建目录、建库、建表，`04:45`）？**已定，不再是问题：票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。** 本票不改写 `:55-59`，只把「本票不改开库时机」这一句写进改动说明。
3. 「落文件＋回执绝对路径」放一个新文件还是并进 `lookup.ts`？新文件叫什么（铁律四要求名字取自 HELP 相应一级）。
4. `scripts.test` 改法与 `build-help.mjs` 换行修法是否都并入本票？这两件都在包内但都不属 `src/`（`04:78` 的管辖范围边界）。
5. 新件挂公共层后，`base-paint` 依赖版本号取什么（`04:21` 举的先例是 `^0.3.0`）。
6. `SKILL.md` 注入块归谁写：`gen-help-assets.mjs` 与 `scripts/build-help.mjs` 都碰 `<!-- HELP-AUTO-START -->`／`<!-- HELP-AUTO-END -->`（§1.6 协调风险）——是「注入块唯一归 `build-help.mjs`、生成器不碰」（卡路里先例），还是「两家都写、定串行顺序」？谁负责这一格也要点名。


