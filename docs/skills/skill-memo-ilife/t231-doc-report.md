# #231 「SKILL.md 说明面」交付报告

**结论一句话**：`SKILL.md` 说明面已成文（缺省即交付物＋完成标准／要速查要现找才加参数／`--html` 语义／边界／速查块与 HELP 的关系），**与真跑逐条对得上**（真跑证据见 §3／§4）；同批把 `skills-provider.test.mjs` 那条反向断言翻成正向（9/9 绿），两件旧账查清（注入**不保**检出换行；关系两句已同时写进正文）。

- 权威源：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`（裁决 1／2／3／19／20 与本票直接相关）。
- 票面：`docs/skills/skill-memo-ilife/t231-body.md`。
- 真跑环境：`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`；构建＝**只本包** `npx tsc --build packages/skill-memo-ilife/tsconfig.json`（exit=0，未跑仓根构建）。

---

## 1 交付物（改动清单）

| 文件 | 改了什么 | 换行 |
|---|---|---|
| `packages/skill-memo-ilife/SKILL.md` | 正文：`快速开始` 加 1 行 HELP 入口；`<!-- HELP-AUTO-END -->` 与 `## 环境与出 scope` 之间插入新节 `## HELP 交付（说「备忘录 HELP」走这里，不分大小写）`（7 条，L61-70） | 全文 **LF**：改前 4424 B／CRLF=0／LF=63 → 改后 6809 B／**CRLF=0**／LF=75（`git diff --stat`：`17 insertions(+), 1 deletion(-)`） |
| `packages/plugin-memo-ilife/test/skills-provider.test.mjs` | ① `:106` 的条件断言翻成**无条件正向**（`assert.ok(def.content.includes('memo.help.lookup'))`）＋补一条不被注入块白捡的同伴断言（缺省产物名通式）；② 删掉已无调用点的兜底函数 `skillsHelpCommandExists()`；③ 文件头注释补这把锁 | 未变（原样） |
| `docs/skills/skill-memo-ilife/t231-doc-report.md` | 本报告 | — |
| `docs/skills/skill-memo-ilife/t231-body.md` | 进度写 100%（票面） | — |

**没动的**：frontmatter（首 4 行，归票 12，逐字未碰）；`<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->` 之间**一个字符都没改**（生成物，归生成器）。用词自检：新正文「壳」**0** 次；「键」在本包 `SKILL.md` 只剩 2 次、都是「关键**词**」（L3／L12，非黑话用法）。

---

## 2 说明面正文（新增节的落定原样）

```md
## HELP 交付（说「备忘录 HELP」走这里，不分大小写）

- **缺省就是交付物**：`memo-cmd-read memo.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`（扁平落 `memo_html/`，不加 `help/` 一层；8 域／13 二级组／30 场景，走仓内通用 help 模板）。stdout 的 `delivery.path` 是**绝对路径**、`delivery.bytes` 是文件字节数；回话就把这个路径给用户（回执即真相）。同一秒撞名自动递补 `_2`（再撞给 `_3`）。
  **完成标准**：`delivery.path` 指的那个文件真的存在、大小＝`delivery.bytes`、退出码 0——三条都核过才算交付，核不过就照实说失败。
- **要速查表才加参数**：`--params '{"mode":"lookup"}'` 落同目录 `备忘录_速查表_<YYYYMMDD_HHMMSS>.html`（28 条唤醒词一行一条：唤醒词／命令／形状／调用形／一句话）。与 HELP 文件**分名**，两份产物不撞车。
- **要现找才加参数**：`--params '{"q":"帮我搜备忘"}'` 只回命中条目（JSON），**不落盘**；要落盘再给 `--html`。`q` 与 `mode` 互斥，`mode` 只认 `lookup`，违反即退出码 2。
- **`--html <路径>`＝显式落点**：逐字用你给的路径、缺父目录自动建、**覆盖写**（不参与同一秒 `_N` 递补）。给 `--html` 时缺省那支落整页 HELP，`q`／`mode:"lookup"` 那两支落该次的分节页。
- **边界**：看 HELP **不开库、不建库**——跑完 `<SKILLS_DB_PATH>/memo` 仍不存在；这条命令只交页面与索引，不读也不写笔记内容。
- **与上一节的关系**：正文「联动速查」块是**构建期注入的索引**（`scripts/build-help.mjs` 从唤醒词表注入 SKILL.md，勿手改），给 AI 按唤醒词找命令；**HELP 文件是缺省交付物**，给用户打开看。两者同源（同一张唤醒词表）、不是一份东西；显式 `mode:"lookup"` 落的那份是索引的页面版（`备忘录_速查表`），也不是 HELP 文件。
- **入口只认一条**：「备忘录 HELP」（不分大小写，用户 2026-09-12 裁定）；其余唤醒词是场景别名，住上一节索引块，不另立 HELP 入口。
```

`快速开始` 代码块另加一行（照记账 `SKILL.md:13` 的形状）：

```sh
memo-cmd-read memo.help.lookup                      # 说「备忘录 HELP」（不分大小写）：缺省就落一份 HELP 文件
```

---

## 3 真跑原始输出（逐条）

### 3.1 缺省（票面点名的那一条）

```
$env:SKILLS_DB_PATH = "D:\2Study\StudyNotes\.db"
node packages/skill-memo-ilife/dist/cli/cmd_read.js memo.help.lookup
```
```
exit=0
{"version":"0.1.0","skill":"memo","shape":"list","key":"memo.help.lookup","data":{"items":[{"id":"memo","icon":"📝","label":"备忘类","subgroupCount":2,"sceneCount":6},{"id":"search","icon":"🔍","label":"查找类","subgroupCount":3,"sceneCount":7},{"id":"remind","icon":"⏰","label":"提醒类","subgroupCount":2,"sceneCount":4},{"id":"wish","icon":"🎯","label":"心愿类","subgroupCount":2,"sceneCount":5},{"id":"checkin","icon":"✅","label":"打卡类","subgroupCount":1,"sceneCount":3},{"id":"mood","icon":"💭","label":"情绪类","subgroupCount":1,"sceneCount":3},{"id":"sync","icon":"🔄","label":"同步类","subgroupCount":1,"sceneCount":1},{"id":"init","icon":"🚀","label":"初始化类","subgroupCount":1,"sceneCount":1}],"total":8,"subgroupTotal":13,"sceneTotal":30,"version":"1.3.0","mode":"file"},"delivery":{"mode":"file","path":"D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260912_133947.html","bytes":130885}}
== POST: .db\memo exists? = False
== POST: memo_html newest 3 ==
备忘录_HELP_20260912_133947.html  130885 bytes  2026/9/12 13:39:47
备忘录_HELP_20260912_133708.html  130885 bytes  2026/9/12 13:37:08
备忘录_HELP_20260820_162453.html  55053 bytes  2026/8/20 16:24:53
```

四条都核到：**退出码 0**／`delivery.path` 是**绝对路径**（`D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_<YYYYMMDD_HHMMSS>.html`）／该文件**真的出现在** `memo_html\`（130885 B）／跑完 **`.db\memo` 仍不存在**（不建库）。

### 3.2 `mode:"lookup"`（速查支产物名与件数）

```
node … cmd_read.js memo.help.lookup --params '{"mode":"lookup"}'
exitB=0
…（28 条 items，逐条含 id/title/category/shape/desc，此处只摘首尾）…
{"id":"搜备忘","title":"memo-cmd-read memo.search",…},{"id":"删情绪日记","title":"memo-cmd-read memo.update --params '{\"category\":\"情绪日记\",\"id\":\"<id>\"}'",…}
…"total":28,"mode":"lookup"},"delivery":{"mode":"file","path":"D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_速查表_20260912_133955.html","bytes":6476}}
备忘录_速查表_20260912_133955.html  6476 bytes
```
⇒ 主体 `备忘录_速查表`、与 HELP **分名**、落**同目录扁平**（裁决 2）。

### 3.3 `q`＝只回命中、零落盘

```
### C2 q=帮我搜备忘（命中 1 条）
{"version":"0.1.0","skill":"memo","shape":"list","key":"memo.help.lookup","data":{"items":[{"id":"搜备忘","title":"memo-cmd-read memo.search","category":"memo.search","shape":"list","desc":"搜笔记（关键词/CJK 子串，可按分类过滤）"}],"total":1,"mode":"lookup","query":"帮我搜备忘"}}
exitC2=0
```
另在临时库真跑（先起一份缺省产物，再跑 q，数文件）：
```
q 前落盘件数=1  q 后=1  （相等即零落盘）
q 回执里有没有 delivery 字段 = False
q exit=0
```

### 3.4 参数边界

```
### D q+mode
ERR 2: 参数 q 与 mode 互斥：q＝现找，mode＝速查表产物
exitD=2
### E mode=file
ERR 2: mode 非法（file）：本键只认 lookup
exitE=2
```

### 3.5 `--html`＝显式落点：逐字、覆盖写、建父目录

```
explicit run1 exit=0 path=C:\\Users\\辰辰洋洋\\AppData\\Local\\Temp\\t231-overwrite.html
explicit run2 exit=0 path=C:\\Users\\辰辰洋洋\\AppData\\Local\\Temp\\t231-overwrite.html
== 覆盖写：同目录有没有 _2 兄弟 ==
t231-overwrite.html  130885
== --html 指向不存在的多级父目录 ==
{"version":"0.1.0",…"delivery":{"mode":"file","path":"C:\\…\\Temp\\t231-db2\\a\\b\\c\\out.html","bytes":130885}}
exit=0 存在=True 大小=130885
```
分节/整页之别（同一参数、不同支）：
```
缺省 + --html          → 130885 B（整页 HELP）
mode:lookup + --html   → 6476 B （速查表分节页）
q + --html             → 231 B  （该次命中的分节页）
```

### 3.6 `_N` 递补：临时库里同秒连跑三次（真跑复现，不靠推断）

```
run1 exit=0 path=C:\\Users\\辰辰洋洋\\AppData\\Local\\Temp\\t231-db\\memo_html\\备忘录_HELP_20260912_134210.html
run2 exit=0 path=C:\\Users\\辰辰洋洋\\AppData\\Local\\Temp\\t231-db\\memo_html\\备忘录_HELP_20260912_134210_2.html
run3 exit=0 path=C:\\Users\\辰辰洋洋\\AppData\\Local\\Temp\\t231-db\\memo_html\\备忘录_HELP_20260912_134210_3.html
备忘录_HELP_20260912_134210.html    130885 bytes
备忘录_HELP_20260912_134210_2.html  130885 bytes
备忘录_HELP_20260912_134210_3.html  130885 bytes
== 临时库根有没有被建 memo 库目录 = False
== 临时库根内容 == memo_html
```
⇒ **从 `_2` 起**（裁决 3 硬条件 2）**真跑复现**；且临时库根只长出 `memo_html\`，**没有** `memo` 库目录。

### 3.7 产物确实是仓内通用 help 模板（「走仓内通用 help 模板」这句的证据）

```
含 help-data 注入点 = True          模板里有 help-data = True / 产物里有 = True
含 '备忘录 · 使用手册' = True        模板里有 INIT_BANNER = True / 产物里有 = True
含 <html = True                     模板里有 CONTACT = True / 产物里有 = True
（对照件：packages/base-render/assets/help-template.html）
```

### 3.8 落地件披露（动了用户真库目录的只有两件）

本席真跑在 `D:\2Study\StudyNotes\.db\memo_html\` 新建 **2 件**：`备忘录_HELP_20260912_133947.html`、`备忘录_速查表_20260912_133955.html`。同分钟另三件（`…133708`／`…133959`／`…134016`）**非本席所出**（并行会话的复核跑）。`.db` 根目录清单里**没有** `memo`（只有 `MemoHub`）。

---

## 4 逐条对照表（完成判据：说明面每条 → 真跑证据）

| # | 说明面写的 | 真跑／源码证据 | 判 |
|---|---|---|---|
| 1 | 说「备忘录 HELP」（不分大小写）→ `memo-cmd-read memo.help.lookup`，入口只认 1 条 | 命令真跑 exit=0（§3.1）；入口口径＝用户 2026-09-12 原话（`t231-body.md:14`）；正文只出现这一条 HELP 入口，未铺老侧 9 变体 | ✅ |
| 2 | 缺省＝交付物，落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html` | 回执 `delivery.path` 逐字同形（§3.1）；目录里真有该件 | ✅ |
| 3 | **扁平**落 `memo_html/`，不加 `help/` 一层（裁决 1） | 路径无 `help` 段；`Test-Path …\memo_html\help` = **False**；§3.1 落件与 208 件老实物并排 | ✅ |
| 4 | 8 域／13 二级组／30 场景 | 回执载荷 `total:8`、`subgroupTotal:13`、`sceneTotal:30`、`version:"1.3.0"`（§3.1） | ✅ |
| 5 | 走仓内通用 help 模板 | 产物含模板注入点与模板渲染出的标题（§3.7） | ✅ |
| 6 | `delivery.path`＝绝对路径、`delivery.bytes`＝文件字节数 | 回执 `D:\…\备忘录_HELP_20260912_133947.html`；`Get-Item` 实测 130885＝`bytes:130885` | ✅ |
| 7 | **完成标准**：文件存在＋大小＝bytes＋退出码 0 | 三条逐条核过（exit=0／Test-Path True／长度相等），§3.1 | ✅ |
| 8 | 同一秒撞名递补 `_2`（再撞 `_3`） | 临时库同秒三连跑：无后缀／`_2`／`_3`（§3.6） | ✅ |
| 9 | 要速查表才加参数：`mode:"lookup"` → `备忘录_速查表_<stamp>.html`，28 条 | 回执 `…\备忘录_速查表_20260912_133955.html`，`total:28`，6476 B（§3.2） | ✅ |
| 10 | 与 HELP 文件分名、不撞车 | 两份主体不同（`备忘录_HELP` / `备忘录_速查表`），同目录并存 | ✅ |
| 11 | 要现找才加参数：`q` 只回命中、**不落盘** | 命中 1 条返回；回执**无 `delivery`**；q 前后目录件数 1→1（§3.3） | ✅ |
| 12 | `q` 与 `mode` 互斥、`mode` 只认 `lookup`，违反即 exit 2 | 两条 `ERR 2` 原始输出（§3.4） | ✅ |
| 13 | `--html` 逐字用给定路径 | 两次调用回执都是 `%TEMP%\t231-overwrite.html`（§3.5） | ✅ |
| 14 | `--html` 缺父目录自动建 | `…\t231-db2\a\b\c\out.html` 不存在 → exit=0 且文件落成（§3.5） | ✅ |
| 15 | `--html` 覆盖写、不参与 `_N` 递补 | 同路径写两次，无 `_2` 兄弟（§3.5） | ✅ |
| 16 | 给 `--html` 时：缺省支落整页 HELP，`q`／`lookup` 支落该次分节页 | 130885 B（整页）／231 B／6476 B（§3.5） | ✅ |
| 17 | 边界：看 HELP **不开库、不建库**，跑完 `<db>/memo` 仍不存在 | 真实库跑完 `Test-Path .db\memo`=False；临时库跑完根下只有 `memo_html\`（§3.1／§3.6） | ✅ |
| 18 | 边界：只交页面与索引，不读也不写笔记内容 | 三支都在**开库之前**分派（`src/cli/cmd_read.ts` 的 `dispatchHelp`，`openMemoDb` 不参与）；临时库无库文件 | ✅ |
| 19 | 「正文『联动速查』块是**构建期注入的索引**」 | 该块由 `scripts/build-help.mjs` 生成、被 `test/skill.test.mjs:28-34` 与生成器逐字比对（3/3 绿）；本票未手改块内一字 | ✅ |
| 20 | 「**HELP 文件是缺省交付物**」（与 19 两句同时在场） | 两句同在第 69 行同一条目内（§2） | ✅ |

> 没有一条需要写「待 #229」——#229 已交工，本票的真跑核对在它落地之后完成（命令与说明面同批在场）。

---

## 5 票面点名的两件旧账

### 旧账 1：`scripts/build-help.mjs` 的注入**保不保住检出换行**？——**不保**（与居家同病，与记账不同）

- **代码证据**：`packages/skill-memo-ilife/scripts/build-help.mjs:29` 逐字
  `const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);`
  ——`'\n'` 是**写死**的，全文**没有** `eol` 探测分支。对照 `packages/skill-bill/scripts/build-help.mjs:34-37`：
  ```js
  // 换行保持：CRLF 检出仍写 CRLF（Windows CI 检出），LF 保持 LF；只重写标记块，不碰其余换行。
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const block = buildHelpBlock().split('\n').join(eol);
  const next = text.slice(0, si + START.length) + eol + block + eol + text.slice(ei);
  ```
- **真跑证据（不改仓内真件：把包拷到 `%TEMP%\t231-nl`，把 `SKILL.md` 造成 CRLF 检出，再跑**未改一字的**那份 `build-help.mjs`）**：
  ```
  == 实验前（CRLF 检出模拟）: bytes=4487 CRLF=63 bareLF=0
  跑 build-help.mjs → exit=0
  HELP 已注入：C:\Users\…\Temp\t231-nl\SKILL.md
  == 实验后: bytes=4454 CRLF=30 bareLF=33
  == 对照：本仓真件（LF 检出）: bytes=4424 CRLF=0 bareLF=63
  ```
  ⇒ CRLF 检出上跑一次注入，文件变成**混合换行**（注入块 33 行是 LF、其余 30 行仍是 CRLF）——正是记账 `:34-37` 要防的那件事。
- **同族盘点**（`Select-String '\r\n'`）：`skill-bill` = **保**／`base-combos` = **保**；`skill-memo-ilife`、`skill-home`（票面 `:28`）、`skill-calorie`、`skill-chef` = **不保**。
- **今天为何没炸**：本仓 `git config core.autocrlf=false`，且 `.gitattributes` 只钉了 `packages/base-render/assets/help-template.html text eol=crlf`，**没有** `*.md` 规则 ⇒ 本机检出是 LF，注入写 LF＝无变化（真件改前改后 CRLF 都是 0）。
- **定性与归属建议**：是**真缺陷、当前不触发**；四家同形，宜与 `skill-home`／`skill-calorie`／`skill-chef` 一并修（一行 `eol` 探测，照 bill `:34-37`）。**本票未修**——票面只要求「查」，且改它属注入器面，不属说明面。

### 旧账 2：构建期注入的速查表 与 新的 HELP 交付是什么关系？——**同源两物**，说明面已两句同时写清

- **关系定案**：`<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->` 之间那块是**构建期注入的索引**（`scripts/build-help.mjs` 从唤醒词表生成、写进 `SKILL.md`，给 **AI** 按唤醒词找命令，禁手改）；`memo.help.lookup` **缺省**落的那份 `备忘录_HELP_<stamp>.html` 是**缺省交付物**（给**用户**打开看的整页）。两者同源（同一张唤醒词表），**不是一个东西**；`mode:"lookup"` 落的 `备忘录_速查表` 是**索引的页面版**，也不是 HELP 文件。
- **说明面落点**：`SKILL.md:69` 一条里「构建期注入的索引」与「HELP 文件是缺省交付物」**两句同时在场**（§2），并顺手把第三个同名物（`备忘录_速查表`）区分开——今天正文里「速查」一词指两样东西，不点破会误读。
- **旁证**：块与生成器的逐字一致由 `packages/skill-memo-ilife/test/skill.test.mjs:28-34` 钉住（真跑 3/3 绿，见 §6.2）。

---

## 6 同批改的测试（`skills-provider.test.mjs`）

### 6.1 翻正向的落定（`:95-101`）

```js
    // `memo.help.lookup`：#229 已把命令建进技能（`dist/render/envelope.js` 实测有它），#231 已把说明面写成文，
    // 故本条按票面交接项翻成**无条件正向断言**（旧的条件断言＝「正文不含它或命令存在」，翻向后不再需要）。
    assert.ok(def.content.includes('memo.help.lookup'), '正文须含 HELP 那条命令 memo.help.lookup（#231 说明面）');
    // ⭐ 上一条能被构建期注入块「相关场景：…」白捡（那块里本来就列了 memo.help.lookup），
    // 故再钉一条只认说明面正文的：缺省产物名通式（裁决 1，扁平落 memo_html/、不加 help/ 一层）。
    assert.ok(def.content.includes('备忘录_HELP_<YYYYMMDD_HHMMSS>.html'),
      '正文须写明缺省交付物名通式 备忘录_HELP_<YYYYMMDD_HHMMSS>.html（#231：缺省即交付物）');
```

删掉的是已无调用点的兜底函数 `skillsHelpCommandExists()`（旧条件断言的后半段），以及它头顶「今天不存在（实测 `ERR 3`）」的过期注释。**为什么要多钉一条**：翻正向那条**只认 `memo.help.lookup` 字符串**，而注入块第 58 行的「相关场景：…、memo.help.lookup、…」本来就含它 ⇒ 单靠它，说明面一个字不写也绿。变异自证（把本票新增的 `## HELP 交付` 整节删掉后逐条判）：

```
变异后（删掉本票新增的 HELP 交付节）:
  含 'memo.help.lookup'                       = True     ← 白捡，确实挡不住
  含 '备忘录_HELP_<YYYYMMDD_HHMMSS>.html'      = False    ← 同伴断言在变异体上判红
  含 '<!-- HELP-AUTO-START -->'                = True
真件（未变异）:
  含 '备忘录_HELP_<YYYYMMDD_HHMMSS>.html'      = True
```

### 6.2 原始输出（两条相关测试都真跑）

```
cd packages/plugin-memo-ilife; node --test test/skills-provider.test.mjs
▶ #232 打包技能提供方（备忘录线）
  ✔ inject 声明 skills（用了就声明） (0.4862ms)
  ✔ apply 注册且仅注册一个提供方 (0.2079ms)
  ✔ list 给出唯一的 skill-memo-ilife 摘要（bundled/600/单份 SKILL.md） (4.1341ms)
  ✔ get 给全文（frontmatter 后正文，含唯一出口），过期候选失效 (1.9949ms)
  ✔ 重装配时提供方重名退让（抛 already registered 不炸，且 warn 留痕） (0.4248ms)
  ✔ 说明面与速查表口径：速查块覆盖全部唤醒词，简介说明主路 (2.2487ms)
  ✔ 打包清单带 SKILL.md（安装态提供方能读到说明面） (0.3917ms)
  ✔ SKILL_NAME 常量与 SKILL.md frontmatter 实测值逐字一致（不硬编码第二份名） (0.3514ms)
  ✔ name 正则与宿主逐字同值（比宿主宽一格会塌全机技能目录） (0.2246ms)
✔ #232 打包技能提供方（备忘录线） (11.412ms)
ℹ tests 9  ℹ suites 1  ℹ pass 9  ℹ fail 0  ℹ cancelled 0
exit=0
```
```
cd packages/skill-memo-ilife; node --test test/skill.test.mjs
▶ memo SKILL 与 HELP
  ✔ SKILL 含出口/口径/标记块 (0.887ms)
  ✔ 速查：短语全可路由且 key 对得上 (0.55ms)
  ✔ 互联区新鲜（构建期注入可复现） (0.2467ms)
✔ memo SKILL 与 HELP (2.6558ms)
ℹ tests 3  ℹ pass 3  ℹ fail 0
exit=0
```

> 注：包内 `npm test` 的整体红（快照过期）是本图之外的既有状态（裁决 18），本票未拿它当判据。

---

## 7 拿不准处／留给编排会话的

1. **frontmatter 的「备忘录HELP」（无空格）没动**——票面交接项 2 要本票「一并纠形为带空格形＋同步改 `skills-provider.test.mjs` 的 `startsWith`」，但**用户本轮口径优先**：frontmatter 归票 12、已改好、不许再动，且那句无空格是票 12 的处置（现 `skills-provider.test.mjs:123` 的 `startsWith('「备忘录HELP」')` 与 frontmatter 实测逐字一致，**绿**）。⇒ **两处口径打架，本席按用户口径执行，请编排会话裁**：若要收口，改动点＝frontmatter 第 3 行那句 ＋ 同步那条 `startsWith`（一处 2 行，本席未动）。
2. **同伴断言是自选动作**：票面只说「翻成正向断言」，本席额外加了「缺省产物名通式」那条（理由见 §6.1 的变异自证）。若判越界，删它仍是「翻了正向」，但那条正向断言会被注入块白捡。
3. **注入器换行缺陷未修**（旧账 1）：四家同形、当前不触发；修它要动 `scripts/build-help.mjs`（一行），本票按「查」的范围只出结论，**未改**。
4. **产物体积的口径**：说明面只写「`delivery.bytes` 是文件字节数」，未写具体 KB（130885 B）——体积随资产生长，写进说明面就是一份会过期的缓存，故不写。

## 8 纪律自查

- 构建：**只** `tsc --build packages/skill-memo-ilife/tsconfig.json`；**未跑**仓根 `tsc -b`／`pnpm -r build`／`pnpm -r test`。
- 暂存区：**一次都没碰**（无 `git add`／`restore --staged`／`reset`／`commit`）。
- 只读件：`packages/base-render/**` 未碰；`skill-chef`／`skill-calorie`／`skill-schedule`／`plugin-chef`／`pnpm-lock.yaml` 未碰。
- 未重启／未杀 `127.0.0.1:43120` 的 GUI；未 close 任何票；除 `#231` 票面外未动任何 issue。
- 仓库根无 `.scratch-*`（临时脚本与实验件一律在 `%TEMP%`：`t231-nl`／`t231-db`／`t231-db2`／`t231-*.html`；收工时已清理）。
- 未动 `SKILL.md` 的 frontmatter 与 `<!-- HELP-AUTO-* -->` 块内一字。
