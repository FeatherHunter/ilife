# t407 第 3 轮返工 · 真 bug ＋ 排版共性 ＋ 已裁定五处 · 证据件

> 本窗（第 3 轮返工）只许改：`packages/skill-bill/src/shared/**`、`src/record/{collectBody,receiptBody,scene-undo,scene-borrow,scene-lend}.ts`、`test/**`，
> 外加重出 32 份产物与本件。`scene-photo.ts`／`scene-installment.ts`／`scene-plain.ts` 另有专窗，**一个字未碰**（`git status` 可查）。
> 量法与脚本落在 `.scratch\t407r3\`（真 Chrome 走 CDP，390 宽 iframe；该目录不入库）。

## 一、影响清单

改源码 8 件 ＋ 测试 3 件（LF 口径，只数 `\n`；非测试最大件 `scene-borrow.ts` 297 LF，超线 0 件）：

| 件 | LF | 这一窗改了什么 |
|---|---|---|
| `src/shared/candidatePick.ts` | 139 | **A**：空态模板串按整句收（不再加前缀）、句尾补句号、`；` 后那句并进「下一步」 |
| `src/shared/docPage.ts` | 86 | **B**：黑底说明块样式补丁（两栏等高 ＋ 行距），拼进 `sharedCssText`（与 D1 同一处同一条路） |
| `src/shared/typeBadge.ts` | 80 | **C-3**：唤醒词与口径拆两枚胶囊；口径不再重复方向词 |
| `src/shared/summaryRow.ts` | 102 | **C-2 支持**：`summaryRow(facts, { cards: false })`，让本型页只取方向胶囊与分类口径那两件 |
| `src/shared/outsideScan.ts` | 138 | **C-5**：明示卡删掉「参数名」整列（库列名不再上屏） |
| `src/record/scene-undo.ts` | 275 | **C-1**：回执退出口收掉第二组复制按钮（连 `RESTORE_COPY_ACTION` 一并删） |
| `src/record/scene-borrow.ts` | 297 | **C-2**：记借入-采集页必需项置顶 ＋ 可选项折叠成一行（只动这一刀） |
| `src/record/scene-lend.ts` | 281 | **C-4**：回执 toast 标题整串改净（`借贷标签流转：` → `标签流转：`） |
| `test/frozen-blocks.test.mjs` | 179 | A 的回归断言（新增 1 条用例，137 → 138） |
| `test/user-wording.test.mjs` | 140 | C-3 的断言改形状（两枚胶囊、口径不重抄方向词） |
| `test/record-write.test.mjs` | 368 | C-3 的两处 needle 改形状（测试件不在 350 告警范围） |

产物：`docs\skills\skill-bill\` 下 **32 份同名重出**（`t407-页-*.html` 30 份 ＋ `t407-代表-记支出-*.html` 2 份），
一律 CLI 真跑后整份落盘（`node .scratch\t407r3\gen32.mjs` → `ALL32_OK files=32`），无一处手打 HTML。

## 二、结构设计

### A 真 bug 的根因链（一处救三页）

```
场景件那句「这一格要的是…；拿不准就让助手先查…。」（hint，一整句）
  → candidatePick({ hint }) 把**整句**当名词短语交给 candidateEmpty 的 what
  → candidateEmpty 又加了一遍前缀：'这一格要的是' + what + '，列表里一条都没有。'
  → 页上同时出两处硬伤：「这一格要的是这一格要的是…」＋ 句尾「。，列表里一条都没有。」
```
同源三页＝`scene-collect.ts:169`（记收回）／`scene-repay.ts:169`（记偿还）／`scene-reimburse-done.ts:169`（报销到账）：
三件传的 `hint` 都进同一条模板，故**同一行号 1793 同时中招**。修在共用件 `candidatePick.ts` 一处，三页同时好（记退款那页同源，一并好）。
改法：`what` 按**整句**收——不加前缀、句尾缺句号补一个、`；` 缀的后一句挪进 `next`（正文只留「要的是哪一类」与「一条都没有」两句）。
这两处之外，`next` 那句「不拿最近一笔顶替…」原样保留（`frozen-blocks` 原断言仍绿）。

### B 黑底说明块的样式落点

- 块的真身＝公共层 `renderToast` 出的 `.ilife-toast`（**不是** KPI 卡，也不是复制块）：左栏＝标题（`…标签流转：这一笔打…`），右栏＝标签胶囊。
- 390 宽实测（改前）：`.ilife-toast-title-row` 是 `flex-wrap: wrap`，胶囊被挤到**第二行** →
  标题栏 35px、胶囊 20px，两栏各占一行（行高 65px＝35＋8＋20），整块既高又塌一边；标题行与说明之间只隔 2px（实测间距 0px）。
- 公共层样式不许动（`docs/skills/skill-bill/t406-base组件总表.md` 第 1.1 节），本页 body 之后也不许加样式块
  （机审「body 之后有样式块的页」与「内联 style」两列要保 0）。**唯一落点**＝本件拼 `sharedCssText` 那一处——
  与既有 `DESKTOP_CSS`（t407-D1）同一条路、同一位置；改后 head 样式表仍 32／32 逐字节同一份。
- 补丁内容：`.ilife-toast-title-row { flex-wrap: nowrap; align-items: stretch; margin-bottom: 6px }`（两栏**同一行**、拉到同高）＋
  标题 `line-height: 1.5`、说明 `line-height: 1.6` ＋ 胶囊改 `border-radius: 10px`（拉高后不再是挤扁的圆，而是与左栏同高的列标）。
  **文字内容、块序、复制载荷一处不动。**

## 三、A–C 逐条对账

| 条 | 上级要的 | 落点 | 结果 |
|---|---|---|---|
| A | 空态模板串重复 ＋ `。，` 粘连，修一处救三页 | `src/shared/candidatePick.ts`（`candidateEmpty`／`candidatePick`） | 三串负向 grep 全 0（见四·1）；三页同源修复；记退款页一并好 |
| B | 黑底说明块两栏等高、行距回到可读 | `src/shared/docPage.ts` 的 `TOAST_CSS` | 两栏 35/20 → **37.5/37.5 等高**；行距 17.5→18.75、17.05→17.6；标题与说明间距 0→6px；页高不增反减（见四·3） |
| C-1 | 撤销页第二组复制按钮收掉 | `src/record/scene-undo.ts` 的 `restoreExit` | DOM 实测 4 枚 → **2 枚＝1 组**（见四·2） |
| C-2 | 记借入-采集首屏密度：只动一刀，必需项置顶、可选项降级或折叠 | `src/record/scene-borrow.ts`（＋`summaryRow` 允许只取后两件） | 同形卡 8 → 4 张；卡组底 908→459px；行动点 2139→1835px（见四·4） |
| C-3 | 记支出徽标拆两枚 | `src/shared/typeBadge.ts` | `记支出　支出 金额取负数`（一枚）→ `记支出` ＋ `金额取负数`（两枚），全角空格串没了（见四·5） |
| C-4 | 记借出「借贷标签流转：」整串改净 | `src/record/scene-lend.ts:236` | toast 标题与采集页同一串：`标签流转：这一笔打 #借出 与 #未还`（见四·5） |
| C-5 | 拍账单-采集页「参数名」列把库列名印上屏（**追加**） | `src/shared/outsideScan.ts` 的 `escapeCard` | 表头 4 列 → 3 列（要素｜现在｜这一步谁办）；可见正文 `amount/category/time` 0 命中；该页 `pre` 口令原文块未动（见四·6） |

## 四、读数

### 1. A 的负向证据（32 份产物）

```
files=32  dup=0  punct=0
  · `这一格要的是这一格要的是` → 0 命中
  · `。，`                    → 0 命中
  · `<th>参数名</th>`         → 0 命中（C-5 另一侧）
```
（脚本：逐份 `Get-Content -Raw -Encoding utf8` 后正则判命中；改前这三串分别命中 3／3／1 份。）

### 2. 撤销页复制按钮（真 Chrome DOM 实测，390 宽 iframe）

| 页 | 改前 | 改后 |
|---|---|---|
| `t407-页-撤销-回执页.html` | copyBtn=**4** `[复制数据, 复制日志(灰), 复制数据, 复制日志]` | copyBtn=**2** `[复制数据, 复制日志]` |
| 对照（记偿还／报销到账-回执页） | 2 | 2 |

读数口径：`f.contentDocument.querySelectorAll('.ilife-copy-btn').length`（**真 DOM**，不是产物文本计数）。

### 3. B：黑底说明块（真 390，抽 2 页前后对比）

| 页 | 标题栏高 / 胶囊高 | 行高（标题／说明） | 标题与说明间距 | 块高 | 页高 |
|---|---|---|---|---|---|
| 记偿还-回执页 改前 | 35 / 20（胶囊另起一行） | 17.5 / 17.05 | 0 px | 210.33 | 1956 |
| 记偿还-回执页 改后 | **37.5 / 37.5** | 18.75 / 17.6 | 6 px | 192.66 | **1938（−18）** |
| 报销到账-回执页 改前 | 35 / 20（胶囊另起一行） | 17.5 / 17.05 | 0 px | 193.28 | 1939 |
| 报销到账-回执页 改后 | **56.25 / 56.25** | 18.75 / 17.6 | 6 px | 193.81 | 1940（＋1） |

自看结论：改后**两栏在同一行且等高**（数字逐位相等），行距与间距都回到可读；记偿还那页整页还短了 18px
（改前那 65px 的行高就是「栏高不齐」多出来的那一条）。截图自看：`.scratch\t407r3\w-baoxiao2.html`（390 宽 iframe）里那条黑块，
左栏三行标题与右栏「标签流转」列标同高，不再一边高一边矮。

### 4. C-2：记借入-采集页（真 390）

| 读数 | 改前 | 改后 |
|---|---|---|
| 同形 KPI 卡 | 8 张 | **4 张**（借入金额／分类／向谁借 ＋ 同人未还） |
| 卡组底（距页顶） | 908.14 px | **458.97 px** |
| 首个可点复制按钮（行动点） | 2139.31 px | **1834.67 px（−304.64）** |
| 页高 | 3170 | **2866（−304）** |

折叠法：账户／账本／时间三格并成**一行口径**（三格的标签、值与说明句都取自 `summaryCards`，不另抄字面量）；
页骨、块序、块数一处不变（仍是「网格＋一行口径＋摘要行那两件＋借贷口径行」）。

### 5. C-3 与 C-4（390 宽 DOM 读数）

| 读数 | 改前 | 改后 |
|---|---|---|
| 记偿还页 `.ilife-block-chip` | `["记偿还　分类按三级挂靠"]`（一枚，全角空格串） | `["记偿还","分类按三级挂靠"]`（两枚） |
| 记支出两页徽标 | `记支出　支出 金额取负数` | `记支出` ＋ `金额取负数` |
| 记借出-回执 toast 标题 | `借贷标签流转：这一笔打 #借出 与 #未还` | `标签流转：这一笔打 #借出 与 #未还` |

### 6. 可见正文里的库列名（C-5 的验收读数）

脚本 `.scratch\t407r3\scan-visible.mjs`：剔掉 `<script>`／`<style>`／`data-t="…"`／`<pre>…</pre>`／全部标签后，
在可见正文里搜 `amount|category|time|source_id|created_at|user_id|deleted_at|ledger|note|who|due|kind|params|total|periods|start_date`：

```
改前：PAGES=32 VISIBLE_HITS=1  →  t407-页-拍账单-采集页.html  visibleWords=amount,category,time
改后：PAGES=32 VISIBLE_HITS=0  →  32/32 满足「区外零库列名」
```
该页命令原文仍在复制载荷区（`bill-cmd-read` 等 9 处，全在 `pre`／`data-t`），**未动**。

### 7. 机审／编译／测试

| 判据 | 命令 | 改前 | 改后 |
|---|---|---|---|
| 编译 | `npx tsc -b packages/skill-bill --force` | EXIT 0，无诊断 | **EXIT 0，无诊断** |
| 测试 | `node --test "packages/skill-bill/test/*.test.mjs"` | 137 通过 / 0 失败 | **138 通过 / 0 失败**（＋1＝A 的回归断言） |
| 机审 | `node docs\skills\skill-bill\t407-v8-style-audit.mjs --dir docs/skills/skill-bill` | EXIT 0 全绿 | **EXIT 0 全绿**（32／32） |

机审补三条支撑读数：`共享样式表逐字节同一份的页：32／32`、`本页 body 之后有样式块的页：0 份`、`本页有内联 style 属性的页：0 份`
（B 的补丁走的是 `sharedCssText`，没破这三列）。

### 8. 手机端真 390 复量（抽 2 份＋连测 10 页）

量法守红线：**不用 `--window-size=390`**；外层页固定 390 宽，目标页整份放进 `width:390px` 的 iframe（srcdoc），CDP 走真 Chrome 截/读内层文档。
逐页读数（10 页全部同一组，无横向溢出）：

```
innerVW=390  innerDocW=390  innerScrollW=390  →  doc=vw，SCROLL=OK
```
抽两份明细：`t407-页-记偿还-回执页.html` 页高 1938；`t407-页-报销到账-回执页.html` 页高 1940。

## 五、变异自证

**变异（一条）**：把 A 的成品改回旧模板——`candidatePick.ts` 里 `text: want + '列表里一条都没有。'` 改成
`text: '这一格要的是' + want + '列表里一条都没有。'`。

```
npx tsc -b packages/skill-bill --force   → EXIT 0（编译不拦，护栏在断言）
node --test packages/skill-bill/test/frozen-blocks.test.mjs
  → EXIT 1：tests 13 / pass 12 / fail 1
  ✖ 空态模板串不重复、标点不粘连（一处救三页）
      AssertionError: 模板串不得重复
```
**还原 ＋ 三自证**：

```
（1）git diff --stat -- packages/skill-bill        → 空（0 行）
（2）git status --porcelain -- packages/skill-bill → 空（0 行）
（3）sha256(candidatePick.ts) 变异前 C5CC69C3…81BE8 ＝ 还原后 C5CC69C3…81BE8
还原后 npx tsc -b packages/skill-bill --force → EXIT 0；全量测试 → 138 / 0
```

## 六、对账偏差

1. **7 页里有 3 页没有黑底说明块**：实测 `t407-页-改记录-回执页.html`、`t407-页-撤销-回执页.html`、`t407-页-拍账单-回执页.html`
   正文里**没有 `.ilife-toast` 元素**（只有另 4 页有：报销到账／记偿还／记借出／记退款，各 1 条）。
   B 的补丁对这 3 页是无操作——它们分数下跌若真如归纳所说同源，则判据里那一处不是黑底块。已按裁定照改黑底块，此处如实报差。
2. **记借出／记借入那两页的原话是「标签卡…两卡不等高」**（KPI 卡），不是黑底块；B 这一刀没碰 KPI 卡（裁定只点了黑底块）。
3. **报销到账那页左栏由 2 行变 3 行**：`nowrap` 后标题栏不再独占整行宽度，行数 +1，两栏等高但左栏更「重」；
   该页页高持平（1939→1940）。这是「两栏等高」的直接代价，一并披露。
4. **A 顺带挪了一句**：hint 里 `；` 后的「拿不准就让助手先查…」由正文挪进「下一步」那一格（正文不再串两句）。
   上级只点了「模板串与标点」两处，这一处是我多修的一点（理由：同一句里的 `；` 串也是评审列的「符号串」形状）。
5. **`借贷走标签流转：` 那句没动**（`scene-lend.ts:176`）：它和 `scene-borrow.ts:175` 是同一句跨页措辞，
   与被点名的 toast 标题「`借贷标签流转：`」不是同一串（也多一个「走」字）；只改一半会拆散两页的对称，故留。若要一并改，请裁定。
6. **记借出-采集页的 8 张同形卡没动**：C-2 的裁定只点了记借入（「只动一刀」），记借出的同名形状照旧留着。
7. **本页 body 之后的样式块／内联 style 仍是 0 份**：B 的样式走 head 那份共享表，未破机审那两列（读数见四·7）。

## 交棒

- 源码四节（A／B／C-1～C-5）已分四次提交（`f5f703d` Ａ、`3730610` Ｂ、`2dae06f` Ｃ、`2d2cb9a` Ｂ补），产物与证据件见下一次提交；
  `packages/skill-bill` 工作区已清（`git diff --stat`／`git status --porcelain` 两处都空）。
- 未 push（上级未允许，红线亦未开）。
- 待裁定两件：①「`借贷走标签流转：`」是否也改（见偏差 5）；②7 页里那 3 页无黑底块的真实扣分处要不要另开窗查（见偏差 1）。
