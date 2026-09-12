## Question

让「备忘录 help」**缺省就交付 HELP 文件**（照 `#144`／`#190`）：产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`，回执顶层给绝对路径。

- 落盘走票 4 定下的归属（自持最小管线或共用位）：`wx` 独占 ＋ `EEXIST` 递补，**不搬**卡路里的三态回退。
- 三支显式口径照 `#144`：`mode:"lookup"`（速查表分名文件）／`q`（只回命中不落盘）／`--html`（逐字覆盖写）。
- **命令名**：`memo.help.lookup`（照 `bill.help.lookup`／`home.help.lookup`；今天实测 `ERR 3: 未知联动 key`）。缺省分支要**在开库之前**分派。
- **不做**：老技能那条「覆盖技能根 `备忘录.html`」的固定名镜像（`#131`／`#143` 已裁「不写固定名镜像」）；老技能目录全程只读。
- **必报五步**：第一、二步先报用户点头（票 5 已做）；交付时报第五步对账。

**并入票 3（`#223`）的实测**（逐字出处见 `t223-template-contract.md`）：

- **「不建库」这条天然过关**：`openMemoDb(join(SKILLS_DB_PATH,'memo'))` 实测只有 stat／access（`src/fetch/db.ts:21-29`），无 mkdir、无 DDL；记账那个坑（`fetch/paths.ts:22` 的 `mkdirSync` 被 `cmd_read.ts:85` 判初始化时调到）**备忘录没有**。仍要在分派顺序上证一遍。
- ⚠️ **初始化口径要重定义**：新库是**目录** `<SKILLS_DB_PATH>/memo`，不是 `memo.db`；老家「DB 文件存在＝已初始化」在本机实测判错（0 字节空壳 `memo.db` 在、真目录不在）。归票 6 裁。
- `init_banner` 键常在、`hidden=已初始化`；标题／正文／复制按钮文案与老 6 步 prompt（`memo_init_setup`）已逐字录在报告 `memo_render.py:496-524`。
- 待裁项（已并入票 6）：`HELP_INITIALIZED` 逃生阀要不要保留；`contact` 补不补 `url`／邮箱。
- 落盘目录要不要加一层 `help/`（更近的兄弟图 `#197`／`#208` 都改判成 `<技能>_html/help/`，而老目录 `.db\memo_html\` 没有这一层）——归票 4。

完成判据：真跑一次 `memo-cmd-read memo.help.lookup` 拿到落盘文件与绝对路径回执，且跑完**不建库**。

**并入票 1（`#221`）的实测**：

- ⚠️ **本票的第一件事是改分派顺序**：`src/cli/cmd_read.ts:129` 现在**无条件 `openMemoDb`**（`src/fetch/db.ts:21-29` 缺目录即抛）⇒ 要照账单 `src/cli/cmd_read.ts:493-495`，把 `memo.help.lookup` **在开库之前**分派掉。
- `memo.help.lookup` 还要登记进 `src/render/envelope.ts:5-16` 的命令表（现在只有 10 条）。
- 落盘三块照抄的行号见票 8 的并入段（票 8 先落渲染，本票接出口）。

## 进度：0%

下一步：等票 4（决策）＋票 8（渲染接线）关票。
