# t156 · 新仓 HTML 盘点（卡路里场景 09 身材照片）

本轮只做**新仓侧事实**：把「场景 09 十页 HTML 是怎么装出来的」逐件点清，供新模板开发吸收（老技能侧由另席盘点，见 §七 末与 §八）。
全程只读源码与测试，未改任何源码、测试、生成物；未跑构建、未跑 CLI 端到端（树上他席在途脏文件多，见 §八）。
检出口：工作树 HEAD = `bee1451`（`git rev-parse HEAD`），`packages/skill-calorie/src/photo/**` 本轮 `git status --porcelain` **干净**（未被他人改动）。

## 一、页面装配链（新仓 HTML 的骨架）

**行数口径**：件内 LF 数（`readFileSync(f,'utf8').split('\n').length - 1`）；引用行号一律 `路径:行号`，取自本席读出时点。
**漂移提示**：`packages/skill-calorie/src/render/html.ts` 在本席盘点期间正被他席改动（`git status` 显示 ` M`）：本席两次读数分别为 636 与 645 行（LF），最终读数 **645 行 / 36007 字节**（mtime 09-14 13:17）；`docs/skills/skill-calorie/t341-页面形状.md:61` 记的「实测 680 行」是 09-14 13:34 之前的旧快照，**与今天不同数**。结论所引行号已逐条按内容核对，不依赖行号本身。

新仓产 HTML 的路子只有一条，四段接力：

1. **区块**＝`base-paint/blocks` 的 13 个渲染器（壳／KPI／表／图／列表／折叠／参数表单／复制区／提示区…，见 §二 末）；
2. **整页**＝`packages/skill-calorie/src/shared/docPage.ts:77` 的 `assembleDocPage`：区块 HTML ＋ 标题三件套 → 完整文档；
3. **样式**＝`docPage.ts:81` 的 `buildStyleSheet().css + '\n' + blocksCss()`，**不走 `extraCss`**（`extraCss` 不得重定义 token，见 `packages/base-render/src/spec/style.ts:52`）；
4. **包裹**＝`docPage.ts:95`／`:103` 的 `fillTemplate`：裸标记模板 ＋ 资产，填完 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CONTENT-->`。

注意：**`base-paint` 就是 `packages/base-render`**（包名别名），不是两份东西。

### 整页模板逐字（`docPage.ts:64-72` 的 `docShell`）

- `<!doctype html>` ＋ `<html lang="zh-CN">`（`:66`）
- `<meta charset="utf-8">`（`:67`）
- `<meta name="viewport" content="width=device-width,initial-scale=1">`（`:67`）
- `<title>` 走参数 `docTitle`（`:68`）
- 正文壳 `<div class="wrap ilife-page">`（`:69`）——`wrap` 类专为兼容既有 `--html` 断言而留（`:62` 注释）
- 图表页多一个 `<!--CHARTS-HELPERS-->` 槽（`:65`、`:70`），由 `charts: true` 触发（`:78`、`:84`）

### 装配的四处口径（值得吸收）

- **`eyebrow` 空串＝不写这一行**（`docPage.ts:99`）；**`subtitle` 空值＝不写**（`:100`）——可选位不是必填空串；
- **`metricsOf` 冻结口径：`null`／`undefined` 不进投影**（`docPage.ts:107-113`）——数字位恒为真数字，`stat` 形状天然过守卫；
- **B 线老 A 壳（给了 `metaLeft` 即走）**：`meta-bar`（左参数一行 ＋ 右「卡路里 · 分析」徽章）＋ H1 ＋ `sub` 结论行（`docPage.ts:85-95`）；补丁 CSS 只 `BLINE_CSS`（`:41-49`）；**身材照片域零使用**（全仓仅 `analysis/multiTrendPage.ts:288`、`render/trendDocs.ts:205`、`render/trendMiscPortDocs.ts:108` 三页在用）；
- **图表 helpers 与共享 helpers 分槽**（`docPage.ts:82`、`:84`）——照片域十页**全部 `charts: false`**（`galleryDoc.ts:98` 显式写死，另两页不传）。

## 二、共用件逐件（`packages/skill-calorie/src/shared/`）

| 件 | 行数 | 对外导出 | 各一句 | 身材照片域在用吗 |
|---|---|---|---|---|
| `docPage.ts` | 113 | 2：`assembleDocPage`（:77）、`metricsOf`（:107） | 区块 HTML＋标题三件套 → 完整文档；度量投影只收确定数字 | **1 处**：`photo/galleryDoc.ts:92`（另两向导页走它，但在 `render/wizardPortDocs.ts:66`／`:139`） |
| `copyArea.ts` | 187 | 5：`promptCopyArea`（:101）、`copyArea`（:116）、`dataCopyArea`（:162）、`copyLog`（:167）、`notice`（:178） | 复制区（prompt／数据／日志）＋复制日志六段＋静态提示块 | **3 处**：`galleryDoc.ts:83`、`wizardPortDocs.ts:58`／`:59`、`:125`／`:126`；**`notice`／`copyLog` 照片域零用** |
| `writeParts.ts` | 113 | 17 | 写命令回执底座：`R`／`out`／`receiptHtml`（:83）＋影响行数／写入字段摘要＋删除措辞 | **3 处**：`photo/store.ts:39`、`photo/manage.ts:25`／`:55`（都是片段出口，见 §六 1） |
| `receiptParts.ts` | 43 | 2：`statusCard`（:21）、`reconcileDisclosure`（:31） | 回执「状态」KPI 格 ＋ 页尾「对账信息」折叠区 | **零用**（照片回执没走整页路，故用不上） |
| `params.ts` | 180 | 20 | 参数读取 ＋ 时间窗口口径 | 用（`photo/store.ts:13`、`photo/manage.ts:13`、`gallery.ts:10`、`compare.ts:9`、`wizard.ts:11`） |
| `commandSpec.ts` | 66 | 8 | 命令声明的形状（`kind` 判别式／`ViewOut`／`WriteOut`） | 用（十条声明的类型底座） |
| `contentSuffix.ts` | 118 | 1：`writeSuffixFor`（:16） | 落盘文件名的内容标识段 | 不产页面，影响十页落盘名 |

### 三格式复制菜单（#247，用户裁定「恢复老仓原样」）

- **恒开**：`data` 位在场就出「复制数据 ▾ ＋ 纯文本／JSON／CSV」（`copyArea.ts:111-113`）；
- 三格式由 `formatsOf` 序列化（`copyArea.ts:146-159`），走 `buildDataText` 的 `format` 字段（`:154-156`）；
- 菜单三项提示**逐字取老仓**（`copyArea.ts:43-45`：纯文本「粘贴给 AI / 自己看」／JSON「结构化存档」／CSV「表格导入」）；
- 样式与形态全在 base-render（`copyArea.ts:22-24` 注释）；格式集 `COPY_FORMATS = ['text','json','csv']`（`packages/base-render/src/spec/text.ts:12`）。

### 折叠、脚本段与两张空表

- **折叠＝原生 `<details>/<summary>`**，交互纯 CSS（`packages/base-render/src/blocks.ts:490-510`）；
- **脚本段**＝`buildSharedHelpersJs()`（`docPage.ts:82`）：复制、toast、菜单委派；
- **版面无锚点导航**：`base-render/src` 全目录 grep `href="#`／`renderToc`／`renderAnchor` **零命中**；
- **无 `@media print`**：`base-render/src` 全目录 grep **零命中**——产物不可打印定制；
- **无图元件**：`base-render/src` grep `<img`／`figure`／`thumbnail`／`aspect-ratio`／`lightbox` **各零命中**。照片域今天所有图片呈现都是页面自己拼的（`galleryDoc.ts:27-39`、`render/html.ts:132-139`）。

## 三、身材照片域逐件（`packages/skill-calorie/src/photo/`，19 件）

| 件 | 行数 | 对外导出 | 产出页面族 | 关键函数＋行号 |
|---|---|---|---|---|
| `commands.ts` | 32 | 1：`PHOTO_COMMANDS`（:21） | 不产页面（**命令事实权威源，10 键**） | 声明 `:22-31`；wakeWord 齐（`:23-31`） |
| `routes.ts` | 31 | 1：`PHOTO_ROUTES`（:10） | 不产页面（唤醒词路由） | 20 条（`wake` 10 条 :11-20 ＋ `new` 10 条 :21-30） |
| `index.ts` | 35 | 3：`PHOTO_COMMANDS`／`runPhotoView`（:20）／`runPhotoWrite`（:29） | 不产页面（域门） | `BY_KEY` 查表 `:17` |
| `dir.ts` | 22 | 2：`photoDir`（:12）／`photoDirOrThrow`（:20） | 不产页面 | 读侧容缺、写侧缺即抛 |
| `photo.ts` | 326 | 12 | 取数与视图数据（**不产 HTML**） | `toCard`（:31）、`buildGalleryData`（:80）、`buildCompareData`（:131）、`buildViewerData`（:160）、`buildGifTask`（:192）、三条回执（:245／:271／:295） |
| `photos.ts` | 239 | 15 | 取数与写库（不产 HTML） | `resolvePhotosDir`（:48）、`listPhotos`（:98，缺省 limit 100 `:119`）、`addPhotos`（:146，`cpSync` `:158`）、`deletePhoto`（:168）、`planGif`（:229） |
| `gallery.ts` | 38 | 2：`viewPhotoList`（:15）、`viewPhotoDetail`（:32） | 看身材照整页 ＋ 查详情片段 | 整页出口 `:28`；详情走 `renderViewerHtml` `:37` |
| `galleryDoc.ts` | 100 | 2：`buildPhotoListDoc`（:42）、`PHOTO_LIST_PAGE_MAX_BYTES`（:25） | **看身材照整页（唯一完整文档）** | KPI `:47-52`；内嵌照片块 `:53-56`；缺失明示 `:57-67`；明细表 `:68-82`；复制区 `:83-91`；整页 `:92-99` |
| `photoThumb.ts` | 61 | 3：`PHOTO_EMBED_MAX_BYTES`（:20）、`embedPhoto`（:37）、`embedPhotos`（:56） | 供 `galleryDoc` 用（内嵌字节） | MIME 表 `:10-17`；缺目录句 `:41`；缺文件句 `:47`；超大句 `:50`；data URI `:52` |
| `store.ts` | 40 | 1：`writePhotoAdd`（:18） | 存身材照回执（片段） | 校验 `:21-26`；写库 `:27`；回执 `:36-38`；出口 `:39` |
| `manage.ts` | 56 | 2：`writePhotoRemove`（:18）、`writePhotoTag`（:29） | 移除身材照／设置照片标签回执（片段） | 删：快照 `:21`→删 `:23`→出口 `:25`；标签三态 `op` `:32-52`；出口 `:55` |
| `compare.ts` | 34 | 2：`viewPhotoCompare`（:14）、`viewPhotoGif`（:26） | 对比页片段 ＋ GIF 页片段 | 出口 `:22`（`renderCompareHtml`）、`:33`（`renderGifHtml`） |
| `wizard.ts` | 33 | 2：`viewPhotoLogWizard`（:16）、`viewGifPlanner`（:25） | 身材照向导整页 ＋ GIF 规划器整页 | 视图＋整页 `:17-21`、`:27-32` |
| `gif.ts` | 273 | 3：`GIF_LIMITS`（:15）、`synthesizeGifFromPhotos`、`countGifFrames` | **零生产调用**（只测试引用） | 上限 `:15-21`；帧数下限 `:161-162`；体积上限 `:222-223`；落盘 `:226` |
| `help.ts` | 109 | 1：`viewPhotoHelpCenter`（:56） | 身材照HELP（片段）／V4 HELP 文件（整页）／速查台 | q 路径 `:64-75`（出口 `:72`）；缺省 HELP 文件 `:77-90`；速查台 `:91-108` |
| `helpLookup.ts` | 74 | 4 | 不产页面（10 键现找 ＋ 可执行一行式） | `buildPhotoHelp`（:52）、`lookupPhotoHelp`（:70） |
| `helpCenter.ts` | 485 | — | 全量速查台页（场景 02／10 也用） | ⚠️ **485 行，超包内 350 告警线，且不在台账**（见 §六 10） |
| `helpFile.ts` | 73 | — | 「卡路里help」V4 三级目录 HELP 文件（整页，299582 B） | `renderHelpFileHtml` |
| `helpPaths.ts` | 23 | — | 不产页面（HELP 落点名） | `HELP_HTML_DIR_NAME`（:18） |

**域内不产页面的件共 6 件**：`commands`／`routes`／`index`／`dir`／`photos`／`helpLookup`；**产 HTML 的件共 7 件**：`galleryDoc`／`gallery`／`store`／`manage`／`compare`／`wizard`／`help`（＋`photoThumb` 供料）。

## 四、场景 09 十页的版块结构（逐页，从装配函数与区块字符串读出）

### 4.1 五页「完整文档」（doctype 起、含样式段与脚本段）

| # | 唤醒词 | 命令键 | 装配函数 | 版块顺序（行号） |
|---|---|---|---|---|
| 1 | 看身材照 | `calorie.photo.list` | `photo/galleryDoc.ts:42` | KPI 四格「共／标签筛选／距上次拍照／内嵌 N/M」（`:47-52`）→ 内嵌照片块（每张 `figure` ＋ `figcaption`，`:27-39`、`:53-56`）→ 缺失明示行（`:57-67`）→ 明细表五列 ID／日期／标签／文件／状态（`:68-82`）→ `dataCopyArea('复制数据')`（`:83-91`）→ 整页（`:92-99`，`charts:false`） |
| 2 | 看身材照向导 | `calorie.view.photo-log-wizard` | `render/wizardPortDocs.ts:40` | KPI 两格「照片／tag」（`:42-45`）→ 折叠「常用 tag（8 个）」（`:46-49`）→ 参数表单三字段 srcPaths／tag／note（`:50-57`）→ prompt 预览＋复制指令（`:58`）→ `dataCopyArea`（`:59-64`）→ 整页（`:66-72`） |
| 3 | 看GIF规划器 | `calorie.view.gif-planner` | `render/wizardPortDocs.ts:116` | KPI 三格「已选／文件丢失／尺寸」（`:118-122`）→ 候选表六列（`:81-95`，空态句 `:78-80`）→ 参数表单十字段（`:99-113`）→ prompt 预览＋复制指令（`:125`）→ `dataCopyArea`（`:126-137`）→ 整页（`:139-145`） |
| 4 | 看身材照HELP（缺省支，无 `q`） | `calorie.help.center` | `photo/helpFile.ts` | V4 三级目录 HELP 文件（老实物同款壳）；落点 `calorie_html/卡路里_HELP_<TS>.html`，带复用窗口（`photo/help.ts:80-89`；`output.ts:197-212`） |
| 5 | 看身材照HELP（`mode` 支） | `calorie.help.center` | `photo/helpCenter.ts` | 全量速查台三态 `file`／`inline`／`text`（`photo/help.ts:91-108`） |

### 4.2 五页「片段」（**无 doctype、无样式段、无脚本段**）

| # | 唤醒词 | 命令键 | 产出函数 | 版块（行号） | 实测字节 |
|---|---|---|---|---|---|
| 6 | 存身材照 | `calorie.photo.add` | `photo/store.ts:39` → `writeParts.ts:83` | `h1` 场景名 ＋ `<b>` 摘要 ＋ `op=`/`id=` ＋ 逐条 `<ul>`（`writeParts.ts:85-88`） | **244** |
| 7 | 移除身材照 | `calorie.photo.remove` | `photo/manage.ts:25` | 同上（硬删除措辞来自 `photo/photo.ts:274`） | **317** |
| 8 | 设置照片标签 | `calorie.photo.tag` | `photo/manage.ts:55` | 同上（**不含 `tagDiff` 改前→改后**——`receiptHtml` 只印 items，不印 diff） | **225** |
| 9 | 查身材照详情 | `calorie.photo.detail` | `render/html.ts:180` | 照片卡（`<img src=文件名>` ＋ `figcaption`，`:132-139`）＋ 一行「上一张／下一张」纯数字（`:181-182`） | **680** |
| 10 | 对比身材照 | `calorie.photo.compare` | `render/html.ts:170` | KPI「间隔 N 天／按日期正倒序」＋ 同标签／跨标签警告行（`:172-175`）→ 两张照片卡并排（`:176`） | **1340** |
| — | 做身材照GIF | `calorie.photo.gif` | `render/html.ts:186` | KPI 三格「标签／照片数／照片 IDs」（`:187-190`）→ 一句 `GIF_PASSTHROUGH_NOTE`（`:191`，常量在 `photo/photo.ts:189`）→ 一句 `note`（`:192`） | **1154** |
| — | 看身材照HELP（`q` 支） | `calorie.help.center` | `render/html.ts:215` | 查询行「查询：… · 命中 N 条」（`:220`）＋ 每键一行「唤醒词＋键＋描述＋`<pre>` 命令＋复制按钮」（`:206-211`）＋ 页尾复制运行时脚本（`:221`） | **36339** |

> 表 4.2 的字节数＝本席用 `dist/` 直调各产出函数、按 `Buffer.byteLength(html,'utf8')` 实测（输入：真库照片目录 `D:\2Study\StudyNotes\.db\CalorieHub` 的真实文件名与字节、19 张候选的 GIF 规划器视图、10 键 HELP 命中）。**未跑 CLI 落盘**，故不含落盘信封。

### 4.3 十页体积口径（照 `t341-页面形状.md` §体积上限）

- **文档壳基准**：`assembleDocPage({content:''})` 实测 **55109 字节**（样式表 ＋ helpers 脚本 ＋ 版面骨架）；`t341:18` 记的「文档壳约 60 KB」同量级。
- **同口径锚点**：看身材照 ＋ 2 张 1×1 小图 = **60840 字节**（`t341:18` 记 60798，差 42 字节系数据面差异）；身材照向导 = **59497**；GIF 规划器（19 张候选、不嵌图）= **67402**。
- **照片字节是唯一的大头**：base64 开销 4/3（`t341:19`）。`D:\2Study\StudyNotes\.db\CalorieHub` 实有 16 张图、共 14058630 字节，其中 4 张为 2.8–3.1 MB 原图。
- **实测（同一天、同一台机器、`dist/` 直调）**：

| 输入 | 照片原字节 | 页面字节 | 相对 1 MiB 上限 |
|---|---|---|---|
| 2 张小图 | 10 | 60840 | 远低于 |
| 1 张 2.99 MB 原图 | 3136723 | **4241906** | **超 4.0 倍** |
| 4 张 2.8–3.1 MB 原图 | 12127916 | **16233824** | **超 15.5 倍** |
| 全库 16 张 | 14058630 | **18822796** | **超 17.9 倍** |

- **结论**：`PHOTO_LIST_PAGE_MAX_BYTES = 1048576`（`galleryDoc.ts:25`）**只在测试里被引用**（`test/photo-shape-341.test.mjs:23`／`:77`／`:111`），渲染路径里没有任何强制、没有分页、没有缩略，真实数据一进门就破限（详见 §六 2、§六 3）。`galleryDoc.ts:22-24` 的注释已预告「超限即测试红」，但测试只用 1×1 小图，故**测试永不红**。

## 五、新仓优秀部分（相对老技能的长处，均有实据）

1. **完整文档壳、且唯一一份模板**：整页模板只在 `docPage.ts:64-72` 定义一次；#179 之前「这套模板与装配函数在 7 个 `*Docs.ts` 里各抄了一份」，收成一份（`docPage.ts:3-5`）。
2. **统一装配入口**：`packages/skill-calorie/src/` 下 **130 处 `assembleDocPage` 命中**（含身材照片 1 处 ＋ 两向导页）。但**照片域只有 1/10 页在册**——这是本域最大的欠账（§六 1）。
3. **三格式复制菜单恒开且与老仓逐字对齐**（`copyArea.ts:111-113`、`:43-45`、`:146-159`）。
4. **照片字节进页面这条险已过**：`photoThumb.ts:37-53` 做「扩展名定 MIME（`:32-34`）→ 读文件 → `data:<mime>;base64,…`」，**缺目录／缺文件／超大一律回缺失句、不抛**（`:41`／`:47`／`:50`），页面逐张明示（`galleryDoc.ts:57-67`）；测试钉住「删掉本体后页面含文件名＋缺失」（`test/photo-shape-341.test.mjs:90-103`）。
5. **缺失不牵连正常照片**：逐张独立成败（`photoThumb.ts:60`），测试断言「另一张仍内嵌 `data:image/`」（`test/photo-shape-341.test.mjs:101-102`）。
6. **结构断言与生成一致**：`test/doc-page-assert.mjs:12-20` 一条 `assertDocPage` 钉 doctype／charset／style／script／`ilife-page`／无残留标记六项。
7. **体积上限首定并落到测试**：`galleryDoc.ts:22-25`（常量）＋ 测试引用常量（`photo-shape-341.test.mjs:77`／`:111`）＋ 同步清单写进 `t341-页面形状.md:24-26`。
8. **两份向导页的「预填＋复制 prompt＋复制数据」闭环**：参数表单预填（`wizardPortDocs.ts:50-57`、`:99-113`）＋ prompt 预览与复制（`:58`、`:125`）＋ 三格式数据（`:59-64`、`:126-137`）；prompt 文本由 `render/wizardPort.ts:77-85`（身材照）与 GIF 侧同件复刻，写键口径与 `photo.add` 同形（`wizardPort.ts:18-19`）。
9. **取数与呈现分离**：`photo.ts` 只出视图数据、页面件只装配（`galleryDoc.ts` 头注 `:1-6`）；视图数据三条回执与整页解耦。
10. **照片目录两种口径单点定义**：读侧容缺／写侧缺即抛共用一个取值函数（`dir.ts:1-6`、`:12`、`:20`）。
11. **命令与路由可派生**：命令事实只住 `commands.ts:21`（10 键），路由一行一词 `routes.ts:10-30`（20 条），汇总位由 `pnpm gen` 派生。
12. **空态不留死按钮／截断不静默**（全仓口径）：复制区三样全没给时出「本页没有可复制的数据」且不出按钮（`copyArea.ts:40-41`、`:137-140`）；GIF 规划器空窗出空态句（`wizardPortDocs.ts:78-80`）。

## 六、可提升点（与融合直接相关，逐条带实据）

1. **十页里五页是「裸片段」**：`writeParts.ts:83-89` 的 `receiptHtml` 只出 `<section class="ilife-page">`，而 `deliverHtml` **原样落盘**（`output.ts:242-259`，无任何包裹）→ 存身材照／移除身材照／设置照片标签的回执文件在浏览器里**没有一行样式**（实测 225–317 字节）；查详情 680、对比 1340、GIF 1154、身材照HELP 36339（有结构、无样式）。**口径矛盾**：`data-slot="ilife:calorie:receipt"`／`class="ilife-page"` 声明了「这是一页」，但它不是一页。
2. **页级体积上限无强制**：`PHOTO_LIST_PAGE_MAX_BYTES` 仅测试引用，`buildPhotoListDoc`（`galleryDoc.ts:42-99`）全量内嵌、无分页、无截断明示；真实照片一进门即 4.24 MB–18.8 MB（§4.3 实测）。
3. **原图直嵌、无缩放**：`photoThumb.ts:49-52` 只判 4 MiB；老技能是「长边缩到 500／800 ＋ JPEG q75」再嵌（老 `scripts/render_body_photo_gif_planner.py:79-85`，被画廊／对比／回执复用）。**不补缩放，1 MiB 目标数学上不可能达成**（1 MiB ÷ 4/3 ≈ 786 KB，只容一张 700 KB 级照片，且不含壳）。
4. **没有缩略图落盘**：全仓无 `thumbnail` 相关实现；`t341:22` 给的超限策略「分页或缩略」今天一条都没落。
5. **无页内锚点、无打印样式、无图元件**：`base-render/src` 三处零命中（§二 末）；长页（全库 16 张的看身材照）只能靠滚动。
6. **GIF：页面与能力脱节**：结果页只出一句任务描述（`render/html.ts:186-194`、常量 `photo/photo.ts:189`）；而 `photo/gif.ts`（273 行）**真有 GIF 容器合成能力**（`GIF_LIMITS` `:15-21`、帧数下限 `:161`、体积上限 `:222`、落盘 `:226`），却**只被测试引用**（`test/photo-gif-capability-284.test.mjs:16`），零生产调用。它对真照片只出「实心占位帧」（`gif.ts:5-9` 自陈）。
7. **对比页／GIF 页／详情页没有复制区、没有数据来源行、没有口径句**：三页出口（`compare.ts:22`、`:33`、`gallery.ts:37`）都直接交 `render/html.ts` 的老件，既无 `dataCopyArea` 也无 `notice`（对照 `t154-体重页面-老新融合规范.md:137` 的「每页固定一行数据来源」）。
8. **详情页的「上一张／下一张」只是数字**：`render/html.ts:181-182` 印 `#id`，不是可点链接；老实物是带边界置灰的链接（老 `templates/body_photo_viewer.html:74-77`、`:132-144`）。另外 `buildViewerData` 的邻域按**首个标签**取（`photo.ts:164-167`），与老仓「同 tag 取邻张」不完全同口径。
9. **明细表上限不标截断**：`listPhotos` 缺省 `limit=100`（`photos.ts:119`），看身材照传 `limit:500`（`photo.ts:101`），而 KPI「共 N 张」用的是**截断后的行数**（`galleryDoc.ts:48` 的 `g.totalCount`＝`rows.length`，见 `photo.ts:114`）——超过 500 张时用户看到的是「共 500 张」，无「还有 M 张」字样（老实物有体积预算横幅 `templates/body_photo_gallery.html:143-151`）。
10. **包内告警线台账不完整**：`packages/skill-calorie/src/photo/helpCenter.ts` **实测 485 行**（LF），超包内 350 告警线，但 `packages/skill-calorie/AGENTS.md` 台账只列 `src/render/wizardPort.ts`（457）与 `scripts/gen-cli.mjs`（729），`scripts/check-warning-line.mjs:33-36` 的 `REQUIRED` 也只钉这两件 → **检查脚本对第三件超线件无感**。按包内规矩，超线即触发必报五步第四步：**已超线，需要根据规则进行重构。**超因：全量速查台的场景数据表 ＋ 三种交付形态渲染同处一件；本席不拆（只读）。
11. **两张老式渲染件已成死码**：`render/html.ts:141` 的 `renderPhotoReceiptHtml` 与 `:159` 的 `renderGalleryHtml` **生产零调用方**（grep 全仓只有 `test/render-t10.test.mjs:22`／`:56`／`:108` 与转出位 `render/index.ts:103`）；`html.ts` 又是超线件（645 行），删件比加件更值。
12. **文案口径**：`registry` 的 title 与唤醒词不同名（如 `commands.ts:24` 的 title「对比照片」对唤醒词「对比身材照」），且 `galleryDoc.ts` 的眉标仍写 `calorie.photo.list · 身材照片域`（`:95`）——「域」是内部词，对用户是噪音（对照 `t156-新仓HTML盘点.md:144` 同类问题）。

## 七、旧渲染层对照（只作对照，未改）

| 件 | 行数 | 对外导出 | 说明 |
|---|---|---|---|
| `packages/skill-calorie/src/render/html.ts` | 645 | 55 | 老式 `renderXxxHtml` 一族（**另一条老装配路**：`pageShell`（`:39`）＋ 内联 `token()` 样式，**不产完整文档**）。照片相关的 8 个：`photoCardHtml`（`:132`）、`renderPhotoReceiptHtml`（`:141`，死码）、`renderGalleryHtml`（`:159`，死码）、`renderCompareHtml`（`:170`，在用）、`renderViewerHtml`（`:180`，在用）、`renderGifHtml`（`:186`，在用）、`renderPhotoHelpHtml`（`:215`，在用）、`renderHelpLookupHtml`（`:225`，在用） |
| `packages/skill-calorie/src/render/wizardPort.ts` | 265 | 6 | 身材照／GIF 两页的视图数据与 prompt（**新家仍在用**）；457 行台账数系搬迁前口径，本轮实测 265 |
| `packages/skill-calorie/src/render/wizardPortDocs.ts` | 146 | 2 | 两页整页装配（**新家仍在用**，`photo/wizard.ts` 直接调） |
| `packages/skill-calorie/src/weight/plateDocs.ts` | 14 | 3 | 只剩三个 `DOC_*` 常量（#332 归位后），**体重域的鲜活样板是 `weight/figures.ts`／`history.ts`／`compare.ts`／`receipt.ts`／`review.ts`／`log.ts`／`volatility.ts`** |
| `packages/skill-calorie/src/body/bodyDocs.ts` | — | — | 场景 08 身体细节结果页（融合基准 `t395-融合基准.md` 的对象），照片域可照它的分区骨架 |

**超线报告（照包内规矩当场报）**：
- `src/render/html.ts`＝645 行 / 36007 字节（LF 口径，告警线 350）：**已超线，需要根据规则进行重构。**超因：T8／T9／T10＋体重／身体／计划等全域模板同处一件。拆法（本票不拆）：按域拆出 `photoHtml.ts`／`weightHtml.ts` 等，`html.ts` 只留 `pageShell`／`kpi`／`bar` 底座；照片域四页（详情／对比／GIF／HELP）正好是第一批可搬对象。**本席只读，未加一行。**
- `src/photo/helpCenter.ts`＝485 行：**已超线，需要根据规则进行重构**（见 §六 10；台账缺这件）。

## 八、覆盖与缺口

**覆盖**：装配链四段 ＋ `shared/` 七件 ＋ `photo/` 十九件 ＋ 旧渲染层四件 ＋ 页面外壳基座（`base-render` 的 `blocks.ts` 1153 行／`controls.ts` 1470 行／`style.ts` 1310 行／`spec/style.ts` 63 行／`spec/text.ts` 153 行／`spec/controls.ts` 390 行）＋ 结构断言与体积测试，逐件读源码核对，均带行号证据。

**缺口（本席未证或未做）**：
1. **未跑 CLI 端到端**：本席**未构建、未跑 `calorie-cmd-read` 落盘**；§4.2／§4.3 的字节数是「`dist/` 直调产出函数 ＋ `Buffer.byteLength`」的模块级实测，**不是**落盘文件字节（未含落盘信封与文件名）。落盘路径与信封由 `t341` 的十页 sha256 基线另行看守（`t341:35-52`）。
2. **未做视觉实测**：信息密度／版式结论来自 CSS 声明与区块字段面，**未在浏览器里量过**；「片段在浏览器里无样式」是从「无 `<style>`／无 `<link>`」推得，非肉眼所见。
3. **未逐页核老装配路与整页路是否逐字等价**（同 `t156-新仓HTML盘点.md:162` 的欠账）。
4. **老技能侧**：身材照片七张老模板的实物优点由另席盘点（本轮另席已交付：七张模板 219／168／144／242／596／120／285 行，共 9 件脚本 ＋ `公共组件` 注入层）；**老仓 `公共组件/assets/help_template.html` 未逐行盘点**（身材照 HELP 的真正载体），故老 HELP 页的版块与交互**未验证**。
5. **`photo/gif.ts` 的合成产物质量未验证**：本席只确认「零生产调用 ＋ 自陈实心占位帧」，未跑它、未看产物。
6. **真库只读访问**：本席只列了 `CALORIE_PHOTOS_DIR` 的目录与文件字节，未读库、未写真库；删孤儿等真库动作不属本席。
7. **未改任何源码／测试／生成物**（红线）；本席未落任何临时文件。

## 九、产物

- 本件：`docs/skills/skill-calorie/t156-新仓HTML盘点-身材照片.md`
- 机读索引：`docs/skills/skill-calorie/t156-新仓索引-身材照片.json`
- 融合建议（同批另件）：`docs/skills/skill-calorie/t156-融合设计-身材照片.md`
- 交接回执（过程件，不进版本库）：`.scratch/handoff/20260914-新技能09-现状与融合建议.md`
