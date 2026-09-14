# t448 · 整页装配补 `printable` 透传位（公共层清障）

票面：#448（来源：#423 实施席回执的「未做」第 ① 条 ＋ 编排者裁定：先于其余页面族票落地）。

**判定：完成。** 四条门禁在本席改动上全绿（树级 `pnpm build` 另有别席在途件导致的红，见判据④末段）；判据①②③全绿；变异两行读数见下（变异必红、还原必绿）。

## 一、改动（逐条路径）

| 路径 | 改动 |
|---|---|
| `packages/skill-calorie/src/shared/docPage.ts` | `DocPageInput` 加**可选** `printable?: boolean`（113→121 LF）。A线把该位原样交给 `renderPageShell`；B线在版面根类名后接 ` ilife-page-printable`（不给／给假＝接空串，逐字回老路）。不加样式、不碰 `extraCss`；打印规则与类名的定义地仍在 `packages/base-render/src/blocks.ts`（未改）。 |
| `packages/skill-calorie/src/exercise/receipt.ts` | 删掉 `PAGE_SHELL_ROOT`／`PRINTABLE_ROOT`／`withPrintableRoot` 那处**装配后定点替换**（#423 临时手段），改传 `printable: true`；版式其余一行未动（348→336 LF）。 |
| `packages/skill-calorie/test/docpage-printable-448.test.mjs` | 新建（6 条用例：判据①②③ ＋ 三条负向面）。 |

依票面「遗留出口」全包搜过 `printable`：**除 `receipt.ts` 那处，没有第二处在装配后定点加类**，也没发现更深的装配缺口。

## 二、机器证据

### 判据① 老调用方零变（改前留档 vs 改后，逐字节）

改前留档：`.scratch/t448/cases-before/`（不进版本库，由改前 `pnpm build` 后的 dist 实跑取得）；改后同输入再跑一次比字节。

| 样本 | 改前 bytes | 改后 bytes | 改前／改后 sha256（同值） | 结构 sha（剔样式段／脚本段） |
|---|---|---|---|---|
| 回执族真产物（`buildExerciseReceiptDoc`） | 64942 | 64942 | `ddf5e8da…c7615166` | `f39a8fce…ccf17847` |
| A线整页（不给 `metaLeft`） | 58206 | 58206 | `e0e25840…e6c6d2015` | `305ff025…a0a3f7e` |
| B线整页（给 `metaLeft／badge／summary`） | 59028 | 59028 | `7e1710ab…a21c9d00` | `5b7c62db…988965ff` |

三件样本 `equal=true`（逐字节相同）；另测「不给该位」与「给假（`printable: false`）」逐字节相同（A线／B线都成立）。
金标结构 sha 已钉进测试（判据读 `dist/`），改前留档不在场时只跑金标、打 `T448-SKIP`。

### 判据② 给真才加类

| 样本（`printable: true`） | bytes | sha256 | 版面根 | `class="…"` 命中 | 标记面命中 |
|---|---|---|---|---|---|
| 回执族真产物 | 64942 | `ddf5e8da…` | `<section class="ilife-block ilife-block-page-shell ilife-page-printable">` | 1 | 1 |
| A线整页 | 58227 | `e9985009…` | 同上 | 1 | 1 |
| B线整页 | 59049 | `1ff45a7b…` | 同上 | 1 | 1 |

- 「别处零次」按**标记面**判（剔掉样式段／脚本段）：给真＝1，不给＝0。
- 全文档里 `ilife-page-printable` 出现 4 次＝标记面 1 次 ＋ 样式段里 3 处常驻规则（`.ilife-page-printable{page:printable}` 等，`base-render` #420 已定案：规则常驻、不给位的页不命中）。
- 给与不给两态**样式段逐字节相同**（`styleText` 相等）⇒ 没有新增 CSS、没有碰 `extraCss`；产物恒等于「老路产物 ＋ 根上一个类名」（逐字节等式）。

### 判据③ 回执族零变（13 条写词）

跑法照 #423：`node packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs`（产物落 `.scratch/t423/out/`）。
产物含**写入时刻**，两次裸跑必然字字不同（实测 26/26 全不同、字节数全同），故比对时用冻结时钟件
`.scratch/t448/freeze-date.cjs`（`NODE_OPTIONS=--require …`，只钉 `Date.now`／`new Date()` 读数），改前／改后各跑一次：

- **13 条写词 ＋ 13 条 seed 共 26 件产物：`same=26 diff=0`**（逐字节相同）。
- 抽样 5 条 sha256（改前 ＝ 改后）：

| 产物 | bytes | sha256 |
|---|---|---|
| `01-add`（记运动） | 66473 | `edad7ec1490fbec637bfe41fefb9b36229c30f7525d0663f43799d836a26a249` |
| `07-batch`（批量补记运动） | 67573 | `cc7435edaeace3640b4957043eaba857975f944277d13ccd897a99396249e626` |
| `09-update`（改运动记录） | 64840 | `47ea183fb9fc3e5d2b5646a4b68d3c7489c7eec97867702ffe20b6c7186217d9` |
| `13-remove-range`（批量删运动） | 68311 | `1d68c9c00741d17cc1396c86f74434af8478cf6c07d19fa34d40e5fef52222ae` |
| `14-copy-2`（零变更复制） | 64058 | `be94ff4794019452ef93948299468bce138e69386196cf51835f4748a8c998f6` |

- 等价替换另在测试内逐字节钉住：`assembleDocPage({printable: true})` 的产物 ≡ 「老锚点字符串替换」后的产物。

### 判据④ 四条门禁（各在包装器内跑，读数行＝`RESULT: ticket=448 runId=…`）

本票最终源码字节：`docPage.ts` sha256 `36794886629e26a7ad9374efd9b177fa2a6a4c613bd45dc8ee7865cb583d6de1`、
`receipt.ts` sha256 `c3eb40ce3edb173b7d21e2f76b4a255b38f22d865c5a6607821cc47d74f21ef9`。

| 门禁 | 退出码 | runId | 说明 |
|---|---|---|---|
| `pnpm build` | 0 | `4f238aca-c635-47ae-a121-773094d91871`、`1289f83b-9ffd-49f7-adf3-def303adb88d` | 两次都在本票最终源码字节上通过（后者＝变异还原后的复跑） |
| `node packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs` | 0 | `c82b2f31-e83d-461e-bc3a-7744373822e7` | 最终树上复跑 |
| `node --test packages/skill-calorie/test/exercise-receipt-264.test.mjs` | 0 | `30d07aa9-8fdc-4d94-922b-dcc20966a104` | 最终树上复跑 |
| `node --test packages/skill-calorie/test/doc-page-assert.mjs` | 0 | `ffe1926c-a5a0-4813-bad7-042cb1ad2537` | 最终树上复跑 |
| （本票新测试）`node --test …/docpage-printable-448.test.mjs` | 0 | `f3f445af-97d4-4f97-b049-3ed6c6abf444` | 最终树上复跑 |

**树级读数的一句话说明（要报给编排者）**：本票工作期间，`pnpm build` 在本席最终源码字节上通过过两次；
其后三次复跑（runId `cbb60f41-…`／`5cddc1e9-…`／`a5539828-…`）都 **exit 2**，报错件**全是别席未跟踪的在途新件**
（`packages/skill-calorie/src/analysis/reportDoc.ts`、`reportPlate.ts`，另一张分析域票的在途件），
逐条核对过错误清单：**没有 `shared/docPage.ts` 与 `exercise/receipt.ts` 任何一行**。
即：本票的四条门禁在本席改动上全绿；树级 `pnpm build` 的当前红色来自别席在途件，与本票无关，也不在本票写集内。

### 判据⑤ 变异两行（都先 `pnpm build` 再跑；判据读 `dist/`）

- **行1（变异·不给该位 → 一律加类）**：`const printable = input.printable === true;` 改成
  `const printable = input.printable !== false;` → `pnpm build`（runId=`0c87a332-72d2-4f79-8e3d-74efe8bbde3f`）→
  新测试 **exit 1**（6 用例：pass 2／fail 4），点名读数：`a-line 的结构 sha 与改动前不同`（实测 `cf2d54f2…` ≠ 金标 `305ff025…`）、
  `a-line 与改前留档不是逐字节相同`、`不给该位却在标记面出现类名`。
- **行2（还原）**：写回原字节（`docPage.ts` 文件 sha256 复原 `36794886629e26a7ad9374efd9b177fa2a6a4c613bd45dc8ee7865cb583d6de1`）**并刷新 mtime** →
  `pnpm build`（runId=`1289f83b-9ffd-49f7-adf3-def303adb88d`）→ 新测试 **exit 0**，改前留档对照 `equal=true`。

### 判据⑥ 告警线台账

`node packages/skill-calorie/scripts/check-warning-line.mjs` → **exit 0**，
`RESULT: 50/50`，`PASS: 告警线台账齐全且与实况一致`
（成文当刻读数：台账 22 行；扫描面 278 件、超线 21 件、剔出生成物 3 件；挂号台账命中 2/2）。
注：这两组数字在本票工作期间随**别席**在途件（`src/analysis/reportPlate.ts` 等）与台账同步而变动，
不是本票改的；本票只是一路复跑留读数，两次都是绿。
本票改的两个件都在 350 线内（`docPage.ts` LF=121、`receipt.ts` LF=336），都不是台账件；
本票没有新增／删除扫描面内的件，故 `packages/skill-calorie/AGENTS.md` 台账**不需要同步**（保持原样即一致）。

## 三、复跑命令

```
node tooling/run-locked.mjs --ticket 448 -- pnpm build
node tooling/run-locked.mjs --ticket 448 -- node packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs
node tooling/run-locked.mjs --ticket 448 -- node --test packages/skill-calorie/test/exercise-receipt-264.test.mjs
node tooling/run-locked.mjs --ticket 448 -- node --test packages/skill-calorie/test/doc-page-assert.mjs
node --test packages/skill-calorie/test/docpage-printable-448.test.mjs
node packages/skill-calorie/scripts/check-warning-line.mjs
```

## 四、未做项（明说）

1. **别的域页面没接这个位**——本票只补公共层的透传位，不改任何页面族的调用；四张族票（记录级明细／汇总＋目标／分布＋力量＋有氧／趋势＋复盘）各自接。
2. **判据①的第二页取法**：票面写「回执族一条 ＋ 任一既有页」。既有页取的是**B线整页**（`metaLeft`／`badge`／`summary` 三字段，即分析域既有调用形状）＋A线整页两件样本；没有去调用别的域的真实构建函数——上下文纪律只许读票面、`docPage.ts`、`receipt.ts` 与 `blocks.ts` 的 `printable` 段，点名别的域的取数／装配件会越界。
3. **13 条写词的比对靠冻结时钟件**：产物带写入时刻，裸跑两次必然字字不同（26/26 不同、字节数全同），故「逐字节相同」只有在时钟钉住时才是可判的读数；冻结件与改前留档都在 `.scratch/t448/`，不进版本库。
4. `.scratch/t448/` 下的草稿件（改前留档、变异日志、冻结时钟件、取样脚本）不入库；样张与已关票证据件未碰；生成物未手改。
5. **树级 `pnpm build` 当前是红的，红在别席在途件**（`src/analysis/reportDoc.ts`／`reportPlate.ts` 两个未跟踪新件，含缺模块与只读类型两处报错）；本席没有越界去修别席的件，只在回执里点名，等编排者裁。
