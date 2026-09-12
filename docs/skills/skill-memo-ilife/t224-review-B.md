# 票 4（`#224`）决策草案 · 对抗式复审报告（复审员 B）

审阅对象：`t224-decision-draft.md`（248 行／25171 B，2026-09-12 13:09 落盘）＋ 伴随件 `t224-body.md`（线上 `#224`）＋ `t224-delivery-path-evidence.md`。
本席**只读**：未改 `packages/`、未动任何 issue、未 commit、未 `git add`；本次唯一新建的文件是本报告。
本席不碰「管线归属选甲／乙／丙」那道架构题的结论（归复审员 A）；下面只指出该题**证据**层面的毛病。

---

## 一、总评与评分

**总评一句话**：代码／磁盘／老技能这三类硬证据，草案引得又密又准（我逐条复算，绝大多数 `file:line` 精确命中），但**整篇的骨架——「已定案 ⇒ 本项目不必再问用户」——撑不住**：第五节列的六条「定案」里，没有一条能在采访区找到逐字原话（用户原话只有 `Q3=A` 这五个字符）；而其中「落盘目录要不要加一层 `help/`」恰恰是地图三处明文交回**本票**裁的题（`map-220-body.md:38`／`:57`／`:126`），把它判成「已定案、不必再问」是**结论方向性错误**，不是措辞问题。另有一处把隔壁大厨图的裁定错记成 `#237` 的建议，并据此改写了「选甲的代价」。

### 评分（合计 **65 / 100**）

| 维度 | 得分 | 说明 |
|---|---|---|
| 事实准确 | **20 / 35** | 代码／磁盘／老技能类断言命中率高；但「用户原话」标错来源（5 行）、`#237` 的 `_N` 建议凭空出现、`calorie.help.center` 漏算、「三家同形」与自己的「2 家」自相矛盾 |
| 证据可核 | **16 / 25** | 每条基本都带 `文件:行号` 且可重跑，这点很好；但 4 处行号不精确／不完整，1 处把「同一份地图的两个段落」包装成「独立佐证」 |
| 格式合规 | **14 / 15** | 三个文件均无 BOM、0 处字面反斜杠转义、`## 进度：N%` 独占一行、段间留空行；线上 `#224` 与本地**逐字节一致**；未越权改 `packages/`、未 close 任何 issue。扣 1 分：「未动任何 issue」按字面不成立（本票票面本身已写回） |
| 是否服务目的地 | **15 / 25** | 「出口方向相反」那条与目的地强相关且证据扎实、归票清楚；但把地图交回本票裁的题判成「已定案」，一旦照此关票就会**少问一次用户**，直接影响产物落点与 `#233` 验收 |

### 每一处扣分的事实（点名）

1. `t224-decision-draft.md:76-84` 表格列头写「用户原话（逐字）」，第 1／2／3／4／5 行的引文**全部不是用户原话**：出处是 `map-220-body.md:3`（`## Destination`，地图正文）与 `:83`（`## Notes`），都是 AI 写的段落；采访区（`:137-171`）里用户对这几题的原话只有 `Q3=A`。
2. `:86`「`help/` 那一层、落盘目录、文件名主体这三条**都不需要再问负责人**」——地图 `:126` 白纸黑字写着「**落盘目录要不要加一层 `help/`**……归票 4 裁」，`:38` 接手须知写「（**含「落盘目录要不要加一层 `help/`」那道题**）」。
3. `:34`／`:234`／`:215` 三处把「`_N` 从 `_1` 起」记成 `#237` 的建议；`#237` 正文里**没有** `_1`、没有 `align_08.py`，其第二节表格反而写「`succession`（缺省）→ 自动 `_2`／`_3` 递补 → 三家 HELP 现在的行为」。
4. `:67`「唯一登记过 HELP 的是卡路里 `calorie.help.lookup`」——`calorie.help.center`（真正的 HELP 文件命令）也登记了（`combos.yaml:111`／`present.ts:25`）。
5. `:68`「`PRESENT_KEYS` 的消费方**只有** `base-combos/src/index.ts:2-6` 的 `createRegistry`」——另有 `index.ts:4` 的再导出、`test/combos-p8.test.mjs:11`、`test/combos-42.test.mjs:15`，以及 `tooling/check-combos.mjs`／`test/combos-help-80.test.mjs` 的门。
6. `:47`「与三家先例同形（账单／居家／卡路里同判法）」——居家 `#187`／`#190` **至今 open**，`packages/skill-home/src` 无任何落盘件；而草案自己 `:29` 写「消费者今天实测 **2 家**」。
7. `:123`／`:171`／`t224-body.md:23`／`t229-body.md:13` 沿用 `src/fetch/db.ts:21-29`——该函数实际是 `:19-27`（缺目录在 `:22`、非目录 `:23`、不可读 `:24-25`），`:29` 已是无关函数 `parseNoteFile` 的开头。
8. `:8`／`:86`／`:230` 把 `t224-delivery-path-evidence.md`（编排会话）称作「**独立**得出同一结论」——该证据件的「证据一」引的就是 `Destination` ＋ `Notes:83` 这两处，与草案第二节用的是**同一个来源**；真正独立的只有它的磁盘实测。

---

## 二、打假清单 1–8

### 1. 「用户原话已定案」的四条 claim —— **不成立（4 条全部不成立；第 4 条部分成立）**

逐条找原话（`docs/skills/skill-memo-ilife/map-220-body.md`，线上 `#220` 与本地逐字节一致，sha256 `E4B214AC…`，见第 7 条）：

| 草案条目 | 草案引的「原话」 | 出处是否采访区 | 采访区里的实际原文 |
|---|---|---|---|
| ① 落盘目录＝`memo_html/` | 「产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径」 | **否**（`:3` 是 `## Destination`，地图正文；用户认可 ≠ 用户原话） | 采访区 `:157-164` 只有 `Q1=A`／`Q3=A` 之类字母；全文无 `memo_html` 三字 |
| ② 不加 `help/` | 「交付 HTML 落老目录 `<SKILLS_DB_PATH>/memo_html/`」（Q3=A） | **否**（`:83` 是 `## Notes` 的 AI 归纳句） | 同上；且这句话**没说** `help/` 加不加 |
| ③ 文件名主体＝`备忘录_HELP` | 「同上第 1 条原话逐字」 | **否** | 无；真正出处是老代码 `memo_render.py:602`（我复核为真） |
| ④ 缺省＝HELP 文件 | 「在 DSH 真机对 AI 说『备忘录 help』→ **明确拿到 help HTML 文件**（落盘＋可打开）」 | **否**（`:3` 第一句） | 无直接原话；最接近的是 `Q2=A`（`:158`）谈「官方源」，没说缺省 |
| ⑤ 不写固定名镜像 | 「老技能那条……**不做**（`#131`／`#143` 已裁）」 | **否**（`:83`） | 无 |

真正能在采访区逐字坐实的，是草案第二节第 6 条（用户 2026-09-12 裁定「就 备忘录 HELP 不分大小写……」）与第 7 条（U1／U2／U3／U6 备注）——但第 6 条的**出处行号也引错了**，见下。

- **第 6 条 出处 `:41` 错**：草案 `:83` 写「出处 `map-220-body.md:41`（三条硬规矩段）」。`:41` 只有「HELP 入口只认 1 条：`备忘录 HELP`（不分大小写）」，**没有**引号里那句。逐字原话在 `:62`（`⚠️ **但新技能只认 1 条**（用户 2026-09-12 裁定）：「<i>就 备忘录 HELP 不分大小写，其他的不需要，太复杂了</i>」）。实际行号＝**`:62`**。
- **第 7 条 出处部分正确**：`:65`（U1／U2／U3 备注）、`:66`（U6 备注）逐字命中；第三条「HELP HTML 中不包括 HELP 的唤醒词场景」在 `t226-resolution.md:9`（草案也引了 `t226-resolution.md:7-9`，正确）。
- **一条对草案有利的补充**：`Q3` 的**选项 A** 确实写着「交付 HTML 落 `.db\memo_html\``（`docs/skills/skill-memo-ilife/决策待确认-备忘录HELP地图.html:162`，摘要表在 `:92`）。所以「落盘目录＝`memo_html/`」**作为用户点选的结果**是有据的——但这是「用户点了 A」，不是「用户说了这句话」，而且**选项 A 通篇没提 `help/`**。

**判定**：①③ 作为「用户点选／老名沿用」**部分成立**；②④ 作为「用户原话定案」**不成立**；「用户原话（逐字）」这个列头对上述 5 行**整体不成立**。

**最要命的一条**：地图在**三处**把 `help/` 这道题交回本票：
- `:38`（接手须知）「票 4 决策 —— 命名落盘归属 ＋ 缺省出口口径（**含「落盘目录要不要加一层 `help/`」那道题**，Notes 里写了兄弟图两条口径的冲突来龙去脉）。这张要用户亲自裁。」
- `:57`（Notes）「⚠️ 备忘录的老目录 `.db\memo_html\` **没有** `help/` 子目录——「沿用老目录」与「与兄弟同形」在备忘录这里冲突，**归票 4 裁**。」
- `:126`（Not yet specified）「**落盘目录要不要加一层 `help/`**……归票 4 裁（它是「命名落盘」那道题的一部分）。」

连本票票面也同意：`t224-body.md:17`／`t229-body.md:17` 都写「归票 4」。草案把它写成「已被用户原话定案，本项目不必再问」——**与地图三处明文冲突**。

### 2. 磁盘实测 claim 复核 —— **成立（但草案少列一个目录、文件数写得偏小）**

命令与原始输出（2026-09-12，只读列目录，`$db = D:\2Study\StudyNotes\.db`）：

```
Get-ChildItem $db -Directory -Filter "*_html" | ForEach-Object {
  $subs = (Get-ChildItem $_.FullName -Directory -EA SilentlyContinue | Select -ExpandProperty Name) -join ','
  $files = (Get-ChildItem $_.FullName -File -EA SilentlyContinue).Count
  "{0,-30} files={1,-6} subdirs=[{2}]" -f $_.Name, $files, $subs
}

biscuit_accountant_html        files=76     subdirs=[]
calorie_html                   files=323    subdirs=[]
home_manager_html              files=18     subdirs=[]
memo_html                      files=207    subdirs=[]
schedule_html                  files=3      subdirs=[help,plan,record,replay]
traffic_html                   files=4      subdirs=[]
```

```
Get-ChildItem $db -Directory | Where-Object { $_.Name -notlike "*_html" } | ...   # 非 *_html 顶层目录
.feathers / backup_reports / biscuit_accountant_backups / CalorieHub / CookHub /
docs / HomeHub / MedalHub / MemoHub / tests / _bak / __pycache__
CookHub                        subdirs=[backup,cooking,designs,help,list,quality,recipes,screencap,setup,shopping,source_photos,xhs-local,xhs-video-summary,xiaohongshu-extract,_serve]
```

`memo_html\` 里 HELP 实物的 `_N` 递补（原始文件名，节选）：

```
备忘录_HELP_20260810_093619.html     57500
备忘录_HELP_20260810_093619_2.html   57500
备忘录_HELP_20260810_093619_3.html   57500
备忘录_HELP_20260810_093619_4.html   57500
备忘录_HELP_20260812_184346_2.html   57500   备忘录_HELP_20260812_184346_3.html   57500
备忘录_HELP_20260813_143514_2.html   103993  备忘录_HELP_20260813_143514_3.html   103993
备忘录_HELP_20260820_150143.html     55053   备忘录_HELP_20260820_150143_2.html   55053
（该目录 *HELP* 文件共 61 个：57500 B ×12／57501 B ×2／103993 B ×38／105215 B ×6／55053 B ×3，四代壳）
```

结论（逐项）：
- 六张 `*_html` 里**只有 `schedule_html` 有子目录**（`help/plan/record/replay`）——**成立**（草案 `:202`，证据件 `:34-41` 同值）。
- `memo_html\` **无 `help/`、扁平**——**成立**。
- `_N` 递补后缀**真的出现过**，且**没有 `_1`**：凡同秒撞名都从 `_2` 起（`_2`／`_3`／`_4` 齐全）——**成立**，与老代码 `n = 2` 互相印证。
- 老 `CookHub\help\` 存在——**成立**。
- **两处不精确**：① 草案 `:201` 写 `memo_html`「190＋」文件，实测 **207**（不算假，但偏小；证据件 `:38` 写的是 207）；② 草案 `:199-206` 的表**漏了 `traffic_html`**（第 6 张 `*_html`，4 文件、扁平），证据件 `:40` 有它。草案 `:86` 因此说「四家已完工的兄弟目录全是扁平」，而真实可比的是**五家扁平**（calorie／biscuit_accountant／home_manager／traffic／memo 自家），说法偏窄。

### 3. 「出口方向相反」的源码 claim —— **成立（行号 1 处不精确）**

```
Select-String -Path packages\skill-memo-ilife\src\cli\cmd_read.ts -Pattern 'openMemoDb|dispatch'
7:   import { openMemoDb, ... } from '../fetch/index.js';
33:  function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): unknown {
113: async function main() {
116:   const dbPath = preflight();
129:   const db = openMemoDb(join(dbPath, 'memo'));
130:   const data = dispatch(o.key, params, db);
```

`:113-130` 逐行读过，`:129` 在 `:130` 的 `dispatch` **之前**、且在 `try` 里**无条件**执行（`memoShapeFor` 已在 `:123` 先跑过，所以未知键是 exit 3 而非 4）——**草案 `:122` 完全成立**。

```
Select-String -Path packages\skill-bill\src\cli\cmd_read.ts -Pattern 'dispatchHelp\(|help\.lookup'
449:      case 'bill.help.lookup':            # 内部断言
451:        fail(1, '内部错误：bill.help.lookup 须走 dispatchHelp（开库之前）');
494:    const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;
503-510:  help?.deliver / deliverHtml(...)
```

`skill-bill/src/cli/cmd_read.ts:493-495`（注释＋分派＋envelope，在开库之前）——**成立**；`:449-451` 内部断言——**成立**；`:70-78` 头注释「缺省（不给任何参数）＝ 老实物同款 HELP 文件」在 `:71`——**成立**；`:88-111` 的 `mode`／`q` 互斥＋只认 `lookup`——**成立**。

**行号不精确一处**：草案 `:123`／`:171` 及票面 `t224-body.md:23`、`t229-body.md:13` 引的 `packages/skill-memo-ilife/src/fetch/db.ts:21-29`。实测：

```
19: export function openMemoDb(dir: string): MemoDb {
20:   if (typeof dir !== 'string' || dir.length === 0) throw new MemoFetchError('MEMO_DB_MISSING', …);
22:   try { st = statSync(dir); } catch { throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 目录不存在：' + dir); }
23:   if (!st.isDirectory()) throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 非目录：' + dir);
24:   try { accessSync(dir, constants.R_OK); }
25:   catch { throw new MemoFetchError('MEMO_DB_UNREADABLE', …); }
27: }
29: function parseNoteFile(path: string, name: string): MemoNote {   ← 已经与本断言无关
```

**实际行号**：函数 `:19-27`；「缺目录即抛」＝ **`:22`**（非目录 `:23`、不可读 `:24-25`）。同一处错误从地图 `:68` 抄到票面、再到决议、再到本草案，四次都没人复算——建议一次改净。

**本席另跑的真机探针**（读 `dist`，不写任何东西）：

```
$env:SKILLS_DB_PATH = "$env:TEMP\memo-probe-empty"
node packages\skill-memo-ilife\dist\cli\cmd_read.js memo.search
  → ERR 4: 取数失败：memo DB 目录不存在：…\memo-probe-empty\memo        exit=4
node packages\skill-memo-ilife\dist\cli\cmd_read.js memo.help.lookup
  → ERR 3: 未知联动 key：memo.help.lookup                              exit=3
```

⇒「今天没有库就看不了帮助」「`memo.help.lookup` 今天不存在」**双双成立**（`:124`／`:45`／`:173`）。

### 4. `envelope.ts` 命令表条数 —— **成立**

`packages/skill-memo-ilife/src/render/envelope.ts:5-16` 逐行读：`:6-15` 共 **10** 条（search／detail／create／update／remove／remind／wish／sync／batch／stats）⇒「现在 10 条，要变 11 条」**成立**；`:18-22` `memoShapeFor` 未知 key 即抛（`:19-20`）**成立**。

### 5. `combo` 侧「不登记」的论据 —— **结论可能可接受，但三条论据里两条不成立**

自己验的原始计数：

```
(Select-String -Path packages\base-combos\combos.yaml -Pattern 'bill\.' -AllMatches).Count   → 0
calorie\.  106 处    memo\.  20 处    chef\. 0    home\. 0（唯一命中是注释里的 render home.js）    schedule\. 0    cook\. 0
```

- `packages/base-combos/combos.yaml:506-551`（`combos:` 段）＋ `:578-614`（**`channels:` 段**）——两段**各 10 条**，共 **20 条登记**（`Read` 逐行确认：`:506` 起 `memo.search`…`:551` `memo.stats`；`:578` 起 `memo.search`…`:614` `memo.stats`）。⇒ 草案 `:65`／`:184`「**两块**今天登记了 `memo.*` 的 **10 条**」**表述不准**：是「10 个键 × 2 段」＝20 条投影。段名也不能混：`:556` 是 `channels:`，不是 `combos:` 的第二块。
- 「`combos.yaml` 全文 0 处 `bill.`」——**成立**（上面实测 0）。
- 「账单的 `bill.help.lookup` 完整可用」——**成立**（`skill-bill/src/cli/cmd_read.ts:494` ＋ 测试 `test/help-delivery-144.test.mjs:77-96`）。
- 「**唯一**登记过 HELP 的是卡路里 `calorie.help.lookup`」——**不成立**：`combos.yaml:111`／`present.ts:25` 的 **`calorie.help.center`** 也在表里，而它正是卡路里那条**出 HELP 文件**的命令（`packages/skill-calorie/src/cli/cmd_read.ts:818-827` 缺省支 → `renderHelpFileHtml` → `:827` 落 `calorie_html`）。所以「出 HELP 文件的命令不进共享表」这个先例**并不存在**；真先例是 **1 家登记（calorie.help.center／lookup）、1 家不登记（bill 全表 0 条）**。
- `PRESENT_KEYS` 的消费者：`packages/base-combos/src/index.ts:2-6`（import → 再导出 → `createRegistry`）**成立**，但「**只有**」**不成立**：还有 `test/combos-p8.test.mjs:11`、`test/combos-42.test.mjs:15`（`PRESENT_KEYS.includes`），以及 `tooling/check-combos.mjs`／`test/combos-help-80.test.mjs` 的键名门。
- 「面板不按它取数」——**成立，但要标出处**：`docs/research/t67-key-audit.md:23`「面板可达：今天只有 `calorie.view.home` 一个键被面板调用；`base-combos PRESENT_KEYS` 虽登记 77 键，但**面板不按它取数**」，同义句在 `:316`。草案 `:68` 引的是地图 `Out of scope`（`:135`），本身也对，但没把 t67 这条**直接证据**摆出来。

**我的判断（回答任务里的追问）**：`present.ts:104-113` 已含 memo 的 10 条、`:26` 有 `calorie.help.lookup`，**不足以推翻「不登记」，但足以推翻草案给出的理由**。理由三条：① 登记与否对目的地零影响——`PRESENT_KEYS` 只喂 `createRegistry` 的白名单与骨架 `comboEnvelope`，面板不读（t67 已测），HELP 文件交付完全不走它；② 草案的「先例一致」是**挑着看的**：同流水线里唯一「既在共享表、又要出 HELP 文件」的技能是卡路里，它**登记了**（`help.center` ＋ `help.lookup` 都在表里）；③ bill／chef／schedule 之所以 0 登记，是因为它们**整包都不在共享表**，不是「HELP 命令特意不登记」。所以正确的写法是换判据（例如「本键产物是文件、不进面板与跨技能共享面」），而不是拿一条被反例打穿的「先例一致」当结论。

### 6. `_N` 起步数 —— **老侧成立；`#237` 那半边不成立**

- 老备忘录**实测从 `_2` 起**：`memo_render.py:133-140`（`n = 2` 起递增，check-then-write）＋ 磁盘实物 `备忘录_HELP_20260810_093619_2/_3/_4.html`（无 `_1`）——**成立**。
- 「`#237` 建议共用件统一从 `_1` 起（照老家大厨 `align_08.py`）」——**不成立**。`gh api repos/FeatherHunter/ilife/issues/237 --jq .body` 全文 49 行，grep `_1`／`align` 的**唯一命中**是：

  ```
  23: | `succession`（**缺省**） | 自动 `_2`／`_3` 递补 | 三家 HELP 现在的行为 |
  ```

  且 `#237` 第三节标题是「能力清单（用户点名 ＋ 本票建议）」，内容是 `sanitize(stem)`／写后回读校验／可选开关／**不做**原子写——**通篇没有起步数**。
- `_1` 起步的真正出处是**大厨图 `#208`**：正文 `:129`（票 1 gist「裁定 **`_N` 从 1 起步**（照老家 `align_08.py:52-65`）」）、`:245`（采访区「定案一」：「通式 `_N`（**从 1 起步**）不变」）。⇒ 草案把**另一张图的裁定**错记成本票要消费的那张票的建议。
- **顺带查出的上游真矛盾**（比草案说的更严重，建议正式登记）：`#208` 定案一说大厨 `_N` 从 `_1` 起，`#237` 第二节说共用件缺省行为＝`_2`／`_3`＝「三家 HELP 现在的行为」——**这两句互相打架**，谁说了算没人写。走乙时这必须先找 `#237` 的负责人对齐。
- **这个变化对验收的影响（写清楚）**：目的地的通式（`map-220-body.md:3`）是 `备忘录_HELP_<YYYYMMDD_HHMMSS>.html`，**不含 `_N`**；`#233` 的验收原文只要求「产物落老目录 `memo_html/`，与老实物并排」（`#233` 正文第 4 行）。所以：**起 `_1` 还是 `_2` 都不破验收**，破的只是「与老实物逐字同形」这句措辞。真正受影响的是出口票/回归锁的**期望文件名**：若统一到 `_1`，memo 的第二次同秒交付会从 `_2` 变 `_1`，`#230` 的用例与 `#233` 的证据件要按新值写；若按 `#237` 现状维持 `_2`，则**一行都不用改**。草案「需在出口票里明写」方向对，但它推荐「跟共用件走 `_1`」——**与 `#237` 自己写的缺省行为相反**，这条推荐没有依据。

### 7. 格式与流程合规 —— **成立（一项措辞不成立）**

```
t224-decision-draft.md             bytes=25171   BOM=False  lines=248  CRLF=0  字面转义=0
t224-body.md                       bytes=6744    BOM=False  lines=60   CRLF=0  字面转义=0
t224-delivery-path-evidence.md     bytes=3969    BOM=False  lines=65   CRLF=0  字面转义=0
```

- 无 BOM、0 处字面反斜杠转义、全 LF——**三个文件全部合格**。
- `## 进度：60%` 在 `t224-body.md:29`，**独占一行**（`Select-String '^##\s*进度'` 只此一行）——合格；草案与证据件是报告类文件，本来不带进度节，不算违规。
- 段间留空行：草案最长连续非空块＝18 行，落在 `:168-186`，是**第五节 A 的 Markdown 表格**（表格本来连排）——合格。
- 线上 `#224` 与本地票面：**逐字节一致**（两边 sha256 同为 `88D9B781E4B66F2D43BB5EAFF7358F52F2933730D8F0C3669AADC95EAF1CEBBE`）——「已写回线上」**成立**，不用信它那句话，我自己比的。
- 越权检查：`git status --porcelain -- docs/skills/skill-memo-ilife` 只有 ` M t224-body.md` ＋ 三个未跟踪件（草案、证据、`t227-datasource-recon.md`）；**未 commit**（`git log` 最新是 `3da2559` 卡路里票，与 `#224` 无关）；`#224`／`#220`／`#229`／`#233` 全部仍 open；地图正文**未改**（本地 `map-220-body.md` 与线上 `#220` 逐字节相同）。Kill 掉这四条：**没有 close 任何 issue、没有动地图、没有 commit、没有改 `packages/`**（`packages/skill-memo-ilife/` 那两处未提交改动是票 12 装机线的：`package.json` 的 `files` 加 `SKILL.md`、`SKILL.md` 补 frontmatter —— 与本票无关，我一行没碰）。
- **唯一不成立的一句**：草案 `:4`「未动任何 issue」。本票票面本身已被写回 `#224`（线上正文与本地逐字节相同，内容含草案结论），所以按字面不成立；但**没有**动别的 issue、也没有关票，性质属措辞过头。

### 8. 推理跳步与自我矛盾 —— **自报三条半对半错，另有 4 处未自报**

自报三条（详见第四节）：①「同形」理由句——判对了；②`check-boundaries.mjs` 漂移——判对了；③`_N` 两套口径——**方向对、归属错**。

**未自报的跳步／未证假设（新发现）**：

1. **把「用户认可的地图文本」升格成「用户原话」**（`:76` 列头、`:78-82` 五处出处指向 `:3`／`:83`）。这是本题最容易蒙混的地方，也是最该点名的一处：地图自己的纪律写着「本图一切决策的源头在文末『用户原话采访区』；执行中与采访区冲突的，以采访区为准」（`:51`），草案引了这句当挡箭牌（`:74`），却把采访区之外的段落标成「原话」。
2. **把「同一来源读两遍」当「独立佐证」**（`:8`／`:86`／`:230`）：证据件的「证据一」＝`Destination` ＋ `Notes:83`，与草案第二节**同源**；只有它的磁盘实测（证据二／三）是独立测量。写「互为独立佐证」会让负责人以为有两个来源背书。
3. **把「未实测」写成「实测」的一处近亲**：`:185` 表里把「卡路里场景页的落盘机制（内部惯例，未成文）」标为 `:827`／`:845`——这两行我读了，确是两条 `resolveStemTarget(...)`；但草案据此说「无 `help/`」，而**卡路里自己那条 HELP 走的是 `calorie_html` 扁平**（与磁盘一致）。这处**成立**；真正的问题在 `:30`：`base-paint` 被冻结的断言引 `check-boundaries.mjs:12-16`，其中 `:13` 是 **link-core** 零依赖、`:15`／`:16` 才是 render——三行被并成一句「断言 base-render 零运行时依赖」，**引证与内容对不齐**（内容我复核为真）。
4. **「三家先例同形」与自己的「2 家」自相矛盾**（`:47` vs `:29`）：`#187`／`#190` 仍 open，`packages/skill-home/src` 无 `output.ts`、无 `helpPaths.ts`（我逐包查过：只有 `skill-calorie`／`skill-bill` 有）。居家是「同题待裁」，不是「已同判法」。
5. **一处「未证假设」**：`:29`「落盘管线在代码里的消费者今天实测 2 家」——我只验到「两家有落盘件」，**没有**验证两份实现是否同逻辑（草案也没给两处同逻辑的逐行对照）；这条严格说是「2 个文件存在」，不是「2 家同逻辑」。此点归复审员 A 的证据面，我只登记不判。

---

## 三、不成立的断言清单（草案怎么说 → 实际是什么 → 证据）

1. 「四条（第五节列六条）**已被用户原话定案**」→ 采访区里没有对应逐字原话；出处是 AI 写的 `Destination:3` 与 `Notes:83` → `map-220-body.md:3`／`:83`；采访区 `:137-171` 全文；用户对这几题的原话只有 `Q3=A`（`:159`）。
2. 「`help/` 那一层**不需要再问负责人**」→ 地图三处明文交回本票裁 → `map-220-body.md:38`／`:57`／`:126`；票面 `t224-body.md:17`、`t229-body.md:17` 同。
3. 「`#237` 票面第三节建议 `_N` 统一从 `_1` 起（照老家 `align_08.py`）」→ `#237` 无 `_1`、无 `align_08`；其表格写缺省 `succession`＝自动 `_2`／`_3` 递补；`_1` 出处是大厨图 `#208` → `gh api .../issues/237 --jq .body` 第 3／17／23／24-30 行；`#208` 正文 `:129`／`:245`。
4. 「**唯一**登记过 HELP 的是卡路里 `calorie.help.lookup`」→ `calorie.help.center`（出 HELP 文件的那条）同样登记 → `packages/base-combos/combos.yaml:111`；`packages/base-combos/src/present.ts:25`；`packages/skill-calorie/src/cli/cmd_read.ts:818-827`。
5. 「`PRESENT_KEYS` 的消费方**只有** `base-combos/src/index.ts:2-6`」→ 至少还有 `index.ts:4`、`test/combos-p8.test.mjs:11`、`test/combos-42.test.mjs:15`、`tooling/check-combos.mjs`、`test/combos-help-80.test.mjs` → 同文件行号。
6. 「与**三家**先例同形（账单／居家／卡路里同判法）」→ 居家 `#187`／`#190` 仍 open、`skill-home` 无落盘件；草案自己 `:29` 说只有 2 家 → `gh api .../issues/187`＝open、`/190`＝open；`Test-Path packages/skill-home/src/output.ts`＝False。
7. 「两块今天登记了 `memo.*` 的 **10 条**」→ 是 10 键 × 2 段（`combos:` 与 `channels:`），共 20 条投影；草案把 `:578-614` 也当 `combos` 段 → `combos.yaml:5`（`combos:`）、`:556`（`channels:`）、`:506-551`、`:578-614`。
8. 「`src/fetch/db.ts:21-29` 缺目录即抛」→ 函数是 `:19-27`，缺目录抛在 `:22`（`:23` 非目录、`:24-25` 不可读），`:29` 已是 `parseNoteFile` → `packages/skill-memo-ilife/src/fetch/db.ts`。
9. 「`package.json:23-25`（只有 `base-link-core`）」→ 依赖块是 `:24-25`（`:23` 是 `bin` 的收尾大括号） → `packages/skill-memo-ilife/package.json`。
10. 「`t1-bill-recipe.md:606-607`（甲／乙／丙三条路与代价）」→ 丙在 `:608`，整表 `:604-608` → `docs/skills/skill-chef/t1-bill-recipe.md`。
11. 「用户 2026-09-12 裁定…」的第 6 条出处 `:41` → 逐字原话在 `:62` → `map-220-body.md:41`（只有结论句）／`:62`（原话）。
12. 「`.db\memo_html` 190＋」→ 实测 207；且漏列第 6 张 `*_html`（`traffic_html`，4 文件、扁平） → 第 2 条的原始输出。
13. 「未动任何 issue」→ 本票票面已写回 `#224`（线上与本地逐字节相同） → 两边 sha256 `88D9B781…`。
14. 「并行会话…**独立**得出同一结论」→ 其「证据一」与草案第二节同源（都是 `Destination` ＋ `Notes:83`），只有磁盘实测独立 → `t224-delivery-path-evidence.md:17`。
15. 「`check-boundaries.mjs:12-16` 断言 base-render 零运行时依赖」→ 该区间里 `:13` 管的是 `base-link-core`，`:15-16` 才管 render（结论本身为真） → `tooling/check-boundaries.mjs:12-16`。

---

## 四、它自报的「事实不清」处理得对不对

1. **「同形」理由句自相矛盾** —— **判得对，但只对一半**。事实层面我复核全中：`#208:55` 的理由句确写「与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/`／`memo_html/`／`schedule_html/` 同形」，而这五个里**四个今天没有 `help/`**（磁盘实测），`#208:55` 同句确有「`help/` 子目录保留」；老 `CookHub/help/` 也确实在。草案把它列为「事实不清」并给出三条独立证据，处理方式正确。
   **但**：它用这条「事实不清」掩盖了本票真正的问题——`help/` 该不该加**是地图交回本票裁的题**（`map-220-body.md:126`），草案却在第二节写「不必再问」。也就是说：隔壁那句话说清了没有（事实不清）是一回事；本票该不该拿它当已定案，是另一回事，而草案把两件事混成一件。
2. **`check-boundaries.mjs` 行号漂移 `:37`→`:41`** —— **判对**。实测 `tooling/check-boundaries.mjs:41`＝`const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-memo-ilife'];`；`git diff --numstat` ＝ `8 4`（＝＋8／−4 行），与草案「`-4` ＋8 行」一致；`:37-38` 是注释（`#199` 起 skill-schedule 移出）。草案「未修改该文件」也与 `git status` 相符。
3. **`_N` 起步数两套口径** —— **判错一半，且推荐项无依据**。矛盾**真实存在**（我找到的是 `#208:245` 定案一「`_1` 起」 vs `#237:23`「`succession` 缺省＝`_2`／`_3`＝三家现在的行为」），但草案把 `_1` 那半边挂到 `#237` 名下（错、且引了不存在的「第三节建议」），并据此在 `:34` 给「选甲」加了一条**它其实不欠的代价**（「`saveHtmlFile` 一旦落地改成 `_1`，备忘录那份要再改一次」）。按 `#237` 的现行文本，走乙**根本不改 `_N` 起步数**，这条代价不成立。推荐「跟共用件走 `_1`」也与 `#237` 文本相反。
4. **「上游事实源的一处笔误」（`:236`）** —— **不是笔误，是凑数**。它说「票面 `:24` 写作 `src/render/envelope.ts`（对）…地图 Notes `:73` 把 `buildHelpLookup()` 的落点写成 `src/help/lookup.ts`（对）——两处都对」，随后却把标题写成「笔误」。我复核：`t224-body.md:24` 讲的是**命令表**（`envelope.ts:5-16`），`map-220-body.md:73` 讲的是**速查实现**（`src/help/lookup.ts`，实测该文件 42 行、`buildHelpLookup()` 在 `:30`），两者说的是不同文件、**都对**。这条既不是「事实不清」也不是「矛盾」，作为第六节第 4 条列出来属于抬高自省度。

---

## 五、给编排会话的整改清单

**必须改（5 条）**

1. **第二节的列头与结论重写**：把「用户原话（逐字）」改成三种来源分列——「用户原话（采访区，带行号）」「用户点选（问题页选项原文，带文件:行号）」「地图正文／Notes（AI 撰写，非原话）」。第 1／2／3／5 条归第二、三类；第 4 条（缺省＝HELP 文件）标为「地图口径 ＋ 用户 Q2『官方源』精神」，**不要**写「原话已定案」。第 6 条出处由 `:41` 改为 `:62`。
2. **`help/` 那条从「已定案、不必再问」改回「待裁」**：与 `map-220-body.md:38`／`:57`／`:126` 一致，把「落盘目录要不要加一层 `help/`」并入第三节提问稿（可作问 3，或明确写「本席建议不加，但按地图归本票裁」）。**在这一点纠正前不要关票**——一旦按「已定案」关票，等于替用户裁了地图点名要他裁的题。
3. **删掉 `#237` 那句 `_1` 的归属**：`:34`、`:215`、`:234` 三处改为「大厨图 `#208`（`:129`／`:245`）裁定 `_1` 起，而共用件票 `#237`（`:23`）写的是缺省 `_2`／`_3` 递补——**上游两句互相打架**，第一步先找 `#237` 对齐，再决定 memo 跟哪个数」。同时把 `:34` 里「选甲的代价：`_N` 会改一次」删掉或改成待定项。
4. **`combo` 侧的理由换掉**：删「唯一登记过 HELP 的是 `calorie.help.lookup`」「先例一致」两句；改成可核的判据，例如「本键产物是文件交付、不进面板也不进跨技能共享面（面板不读 `PRESENT_KEYS`，出处 `docs/research/t67-key-audit.md:23`／`:316`）；且共享表今天只有 calorie／memo 两家，登记与否对目的地零影响」。结论「不登记」可以留，理由必须换。
5. **行号一次改净**：`db.ts` 的 `:21-29` → `:19-27`（缺目录 `:22`），四处载体（地图 `:68`、`t221-resolution.md`、`t224-body.md:23`、`t229-body.md:13`、草案 `:123`／`:171`）同步；`combos.yaml:578-614` 注明是 `channels:` 段；`t1-bill-recipe.md:606-607` → `:604-608`；`#237` 引用统一写「票面第一／二／四节」。

**建议改（3 条）**

6. **`memo.help.lookup` 是否登记 `combos.yaml` 补一句「与卡路里 `calorie.help.center` 登记口径的差异说明」**：同一条流水线里，卡路里把出 HELP 文件的命令登记了、账单整包没登记，本票不登记属**取舍**而非**先例**——把这句话写进票面，后人不会拿它当规矩。
7. **「独立佐证」降级为「同源复核 ＋ 独立实测」**（`:8`／`:86`／`:230`）：把证据件的「证据一」明确标成「与本文第二节同源，不构成独立证据」，只把磁盘实测（六张兄弟目录 ＋ `_N` 实物）算独立。
8. **磁盘附录补齐**：`memo_html` 文件数写 207（不是 190＋），表里补 `traffic_html`（4 文件、扁平），并把「已完工的四家兄弟目录全扁平」改准为「五张扁平（calorie／biscuit_accountant／home_manager／traffic ＋ memo 自家），唯一带子目录的是 `schedule_html`」。

---

### 附：本报告的可复核性说明

- 本席**只读**：未改 `packages/`（`packages/skill-memo-ilife/**`、`skill-chef/**`、`skill-schedule/**`、`skill-calorie/**`、`pnpm-lock.yaml`、`tooling/check-boundaries.mjs` 一行未动）、未 commit、未 `git add`、未改／未关任何 issue（`#224`／`#220`／`#237`／`#229`／`#233` 复查仍 open）。本次唯一新建的文件是本报告。
- 未查到的：`#147` 的 issue 原文我没有直接调取，第 8.2 节的三条触发点是用仓内 `docs/skills/skill-chef/t1-bill-recipe.md:556-562`（该文件自称 verbatim）核的；草案所述「编排会话」的身份无法从仓内证实（只能证其文件时间戳 13:08 早于草案 13:09）。这两点不影响本报告任何结论的成立与否。
- 本报告所有 `文件:行号` 均以本工作树当前内容为准（`map-220-body.md` 与线上 `#220` 逐字节一致，sha256 `E4B214AC24CED186EFF526484538AA0D6BCEFC1CA8CAF4384E3690EF41A30A27`）。
