# #75 共享样式资产 · 落地证据（`buildStyleSheet`）

- 票：#75《base- 共享样式资产：token 转可注入 CSS 并随包发布》（图 #63）· 契约 §3.2／§6.2
- 冻结正本：`docs/base-paint-contract.md`（130 条）· 类型面：`packages/base-render/src/spec/style.ts`
- 实现落点：`packages/base-render/src/style.ts`（唯一产出者）＋ `src/index.ts:4` 追加出口
- 可复跑证据：`docs/research/t75-{publish,mutation,visual}-evidence.mjs`（＋ 同名 `.md` 输出快照）

> 口径：本文件所有数字均为**实测**；无法确证者集中列在 §7，**不写成「通过」**。

---

## 1. 契约条文逐条落地（doc 行号 = `docs/base-paint-contract.md`）

| 条文 | 要求 | 落地 | 证据 |
|---|---|---|---|
| doc:269-270 | 2 条 `pending` → `implemented`，签名值零改动 | `src/spec/index.ts:79-80` 仅 `status` 字段变动；契约 doc:269-270 同步；`test-d/contract-signatures.ts:219` `Absent→Present` ＋ `:220 _S09b` | `git show --stat d16529e`；签名测试 47/47 |
| doc:270 | `buildStyleSheet(input?)` 返回 `{css,tokens,prefix,version}` | `src/style.ts:…` `export const buildStyleSheet: BuildStyleSheet`，返回 `Object.freeze({…})` | `style.test.mjs` T1 |
| doc:273-289 | `:root` 的 11 个 token 逐值 | `rootBlock()` 由 `CSS_VAR_TOKENS` 循环生成（不自造表） | T4；**T18b** 产出 `:root` 块与契约 doc:276-288 **逐字节相等** |
| doc:291 | `--blue: #007aff` 不得改 | 逐值取自冻结常量；字面值由签名测试＋`test-d _S03` 双重钉死 | T5 |
| doc:292 | Q14 禁入零命中＋不得引入深色区 | 产出中 `--r-xl`／`--pink` 0 命中；无 `[data-theme`／`prefers-color-scheme: dark` | T5；视觉证据 `Q14a`／`Q14b` |
| doc:293 | 与 `STYLE_TOKENS` 并存、不互相覆盖 | `STYLE_TOKENS` 原样保留（9 键）；两套键集无交集 | T7 |
| doc:295 | 8 个 `CONTROL_STYLE_SECTIONS` 区、类名 `ilife-` 前缀 | `SECTION_BUILDERS` 覆盖闭集 8 区；类名逐条来自产出器实测 | T8／T9／T10／T11；`src/style.ts` 各区注释给 `file:line` |
| doc:295 | 样式唯一真相源；单品包禁自带样式常量 | 本票**只新增**，未删任何既有样式（裁定 D2／R8） | §6 记账 ① |
| doc:299 | `extraCss` 只许技能作用域覆盖块、不得改基座、不得新增 token 名、不得引入禁入项 | 基座 `:root` 恒在前、`extraCss` **末尾原样追加**；合规由调用方负责（裁定 D3，见 §6 记账 ⑤） | T14／T15／T16 |
| doc:300 | 不按技能名分支、同源 CSS | 连调逐字节相等；不同技能名只改末尾段，基座段逐字节恒定 | T14／T15 |
| doc:303 | 不得自造第二份 token 表／样式常量 | `src/style.ts` 零 token 名→值字面量；测试文件不写死逐值 | T18 |
| doc:307 | 资产形态 = 运行时字符串、随 `dist` 发布 | `buildStyleSheet().css` 为裸文本；`files: ["dist"]` 未改 | §3 发布面实证 19/19 |
| doc:308 | `style/tokens.css` 去留归 #75 | **保留不动**（裁定 R4／D2） | §6 记账 ② |
| doc:309 | 不得新增 `exports` 子路径 | `package.json` 未改（`exports` 仍只有 `"."`） | `git show --stat` 无 `package.json` |
| doc:926 | toast 样式并入共享样式区；`renderToast` 只产 HTML | `toast` 区在本产出中；`src/controls.ts` 本票**零改动** | `git show --stat`；T10 |
| doc:965 | 三资产唯一产出者闭环 | `sharedCssText` ← `buildStyleSheet().css` | T17（`fillTemplate` 联调不抛 `asset-missing`） |

## 2. 门禁实测（变更后）

| 门 | 命令 | 结果 |
|---|---|---|
| 构建／类型 | `pnpm build`（`tsc -b`） | **exit 0** |
| 边界 | `node tooling/check-boundaries.mjs` | **PASS，exit 0**（7 条全 OK） |
| 快照 | `node tooling/write-snapshot.mjs --check` | **exit 0**（`0.1.0@2fc0b42170d9604a`） |
| 发布前置 | `pnpm publish:pre` | **PASS，exit 0** |
| 签名测试 | `node --test packages/base-render/test/contract-signatures.test.mjs` | **47/47** |
| #78 图表回归 | `node --test packages/base-render/test/charts.test.mjs` | **87/87**（`chartsCss` 加 `export` 未破坏 #78） |
| #75 新增行为测试 | `node --test packages/base-render/test/style.test.mjs` | **23/23** |
| 全量 | `pnpm test` | **失败集 delta = 空**（见下） |

**`pnpm test` 前后对比（判据 = 失败用例名集合逐名比对，协议 §5）**

| 项 | 变更前（`.scratch/t75/baseline-gates.log`） | 变更后（`.scratch/t75/after-test.log`） |
|---|---|---|
| tests | 819 | **842**（+23 = 本票 `style.test.mjs`） |
| suites | 112 | 115 |
| pass | 795 | **818** |
| fail | 24 | **24** |
| `✖` 名字集（去重） | 28 | 28 |
| **新增失败** | — | **0** |
| **消失失败** | — | **0** |

> 说明：`.scratch/t75/baseline-failing.txt` 冻结的是 **21 条 leaf 用例名**（去重后）；reporter 的 `fail 24`
> 另含 3 条父级 suite 行。两份日志用**同一提取规则**比对，`NEW`／`GONE` 均为空集。

## 3. 发布面实证（票面验收①「files 实证」）

**裁定 R1**：现成的 `pnpm publish:tarball`（`tooling/check-publish.mjs --tarball`）**只断言 6 skill ＋ 6 单品**，
`base-paint` 不在其列 → 不能作为验收① 的证据。故改用真打 tarball 取证：

```powershell
node docs/research/t75-publish-evidence.mjs    # RESULT: 19/19
```

- `npm pack --dry-run`：清单含 `dist/index.js`／`dist/style.js`／`dist/spec/style.js`／`dist/charts.js`，
  **不含** `style/`（`tokens.css` 不在 `files`），`total files: 69`（与基线一致，只增不减）；
- `npm pack --pack-destination <tmp>` → `tar -xzf` → 从**解包后的发布产物** `package/dist/index.js`
  `import()`：`buildStyleSheet` 为 function、四字段齐全且冻结、`tokens=11`、`prefix=ilife-`、
  `version===STYLE_VERSION`、`css` 含 `--blue: #007aff`、禁入项 0、无 `<style>` 包裹（**css = 16912 B**）。
- 注：`--pack-destination` 的临时目录用仓内 `.scratch/t75/`——Windows `tar`(bsdtar) 在含非 ASCII 的
  `%TEMP%` 路径下解包失败（实测 status=1），已写进脚本注释。
- `pnpm publish:plan`（契约 doc:973 字面点名）：**未跑通**（调 `npm view` 需 registry 网络）→ 见 §7。

## 4. 变异自证（6/6）

```powershell
node docs/research/t75-mutation-evidence.mjs   # RESULT: 6/6，还原后重跑 fail=0
```

| 变异 | 破坏什么 | 变红的用例 |
|---|---|---|
| M1 | 产出层硬编码错误 `--fg` 值 | T4（逐 token 逐值）、T18b（`:root` 与契约逐字节） |
| M2a | emptyState 根类名改坏 | T8（每区必须有真实规则） |
| M2b | 删 helpShell 区实现 | 模块导入即 fail-fast（闭集守卫）→ 整文件红 |
| M3 | `extraCss` 由末尾追加改前置 | T15（末尾追加）、T14（同源前缀） |
| M4 | charts 区不再复用 `chartsCss` | T12（逐字节复用）、T13（渐变计数） |
| M5 | errorReceipt 退回裸 `.ilife-error` | T21（类名撞车处置） |

**还原后重跑 `style.test.mjs` fail=0**（脚本 `finally` 无条件还原，且自证还原有效）。

## 5. 视觉取证（代理证据，浏览器 computed 42/42）

```powershell
node docs/research/t75-visual-evidence.mjs    # RESULT: 42/42
```

- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe`（`--headless=new --dump-dom`）；
  **无浏览器 → 显式 `exit 1`**（抄 `.scratch/t90/browser/evidence.mjs:39-42`），未测量计 FAIL。
- 载体（裁定 R9）：`fillTemplate` **合成模板**（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell`
  内置壳（合成 `sceneData`）——6 个 calorie 模板第 7 行**预包裹** `<!--SHARED-CSS-->`，
  直接 `fillTemplate` 必抛 `marker-missing`（doc:962）。
- 关键实测：空态 `padding:48px 20px`／图标 `40px`＋`opacity:.5`／标题 `17px/600`／说明 `13px`（H-18）；
  命令板 `<pre>` `12px`／`line-height:18.6px`／`pre-wrap`／`overflow-x:auto`／圆角 `8px`（H-15）；
  列表首行 `border-top:0px`、后续 `1px`（H-11）；HELP 内容列 `960px` ＋ 内距 `32px 20px 80px`（H-09）；
  toast 窄屏 `left:12px/right:12px`（H-12）；按钮 `40px/12px/600`＋ghost 描边 `rgba(0,122,255,.38)`（B-11）；
  `--force-prefers-reduced-motion` 下 copy-btn 过渡 `0s`（H-20）；
  **R6 负控**：calorie 的 `ilife-error` 节点 computed `0px/rgba(0,0,0,0)/0px`（未被污染）。

## 6. 偏离记账（逐条，禁止默默略过）

1. **契约 doc:295「技能现有私有 CSS 串随 #75 删除」本票不执行**（裁定 D2／R8）。
   实测 `packages/skill-{bill,chef,home,schedule}/src/render/html.ts` 仍各自持有 `SHARED_CSS`
   （bill `:53`／chef `:68`／home `:59`／schedule `:62`）。理由：这 4 个技能**尚未依赖 base-paint**，
   删除即破坏其 HTML 输出；唯一能证明不回归的门 **#96 未建**。
   → **落点登记**：#96 门 → #108–#113 真迁移时删除。本票**技能包零改动**（`git show --stat` 可证）。
2. **`packages/base-render/style/tokens.css`（49 B）保留不动**（裁定 R4）。理由：契约 doc:308 明写
   「不是契约资产…契约不引用它」；它是 `--ilife-font` 的唯一落点；不在 `files`、不进 tarball
   （`npm pack --dry-run` 清单无 `style/`）；C-21 禁新增 token 名 → 不能塞进 `CSS_VAR_TOKENS`。
3. **charts CSS 双份注入**（裁定 R5④，登记为已知记账）：`buildChartsHelpersJs` 自注入
   `<style id="ilife-charts">`，本票 `sharedCssText` 的 `charts` 区也含同一份文本（**逐字节同源**，
   幂等、无命名空间分裂）。两者 `prefix` 语义一致，不构成第二真相源。
4. **页面壳／KPI／表格／回到顶部不归本票**（裁定 R7／施工单 B-D2a）：B1 的 H-06（`body` 字体栈）、
   H-03（页底≠卡面）、H-17（表格）、H-19（回到顶部）等**无闭集归属**，归 **#104**（B1 区块组件 owner）。
   本票**未**在 `extraCss` 里塞壳层样式（契约 doc:299-300 限死），也**未**扩闭集。
5. **`extraCss` 不做运行时校验**（裁定 D3，**与本 subagent 初始派单第 5 条冲突，以裁定为准**）：
   契约 §3.2／§6.2 既无 `StyleSheetError` 错误码、也未规定违规行为 → 不自造契约外错误形态。
   本票只保证：① 基座 `:root` 恒在前、`extraCss` 末尾**原样追加**；② 无 `extraCss` 时产出不含
   `--r-xl`／`--pink`；③ 合法技能作用域覆盖块逐字出现。**若将来要强制，须先补契约错误码。**
6. **`version` 取值 = `STYLE_VERSION`**（裁定 D1）：契约 doc:268 只冻结类型、**未规定取值**（契约空白）；
   本票裁定取 `'0.1.0'`（语义为「样式表版本」、已被 `test-d:119 _B17` 锁、与 B8 同值、零新增符号），
   `style.test.mjs` T6 断言 `o.version === STYLE_VERSION` 防后人改字面量。**禁止**从 `package.json` 读。
7. **toast 视觉取浅色**：旧层 toast 是深色毛玻璃（`base.js:75`，施工单 B §1.1 逐值转录）；B1 标杆为
   浅色单主色体系 → 本票取浅色（`--card` 卡面 ＋ `--shadow`），属**有意偏离**，与 Q14 禁深色区一致。
8. **零渐变唯一例外**：`chartsCss` 的 `.ilife-charts-legend-swatch-dashed` 用
   `repeating-linear-gradient`（#78 冻结产出，本票**必须复用不得重述**）→ 视觉尺 H-04 的
   「`linear-gradient` 命中 0」在本产出上**不成立**。T13 精确断言「**非 charts 段**零渐变 ＋ charts 段恰 1 处」，
   证据脚本 `H-04` 同口径。
9. **`pnpm publish:plan` 未跑**：契约 doc:973 称「`pnpm publish:plan` 的 tarball 含契约资产」，
   实测该命令只打印发布计划（`tooling/publish-chain.mjs:5` 自述）、调 `npm view` 需 registry 网络
   → **契约措辞待校正**；验收① 以 §3 的真打 tarball 为准。

## 7. 未做／未确证（显式标注）

| 项 | 状态 | 说明 |
|---|---|---|
| 技能模板注入后的**真实**视觉回归 | **未做** | #96 per-skill HTML 快照门仓内**不存在**；6 个 calorie 模板预包裹 `<!--SHARED-CSS-->` → 须先由 #107 改造模板。本票只给**代理证据**（§5），票面／台账**不写成「通过」** |
| `pnpm publish:plan` | **未跑** | 需 registry 网络（见 §6 记账 9） |
| `extraCss` 违规的**强制**失败路径 | **未做**（裁定 D3 明确不做） | 见 §6 记账 5 |
| `:focus-visible` 覆盖 HELP 的 `tab-input` | **部分** | 单选 input 视觉隐藏、其 `label` 非 `focus-within` 祖先，纯 CSS 无法给 label 加环（需 `:has()` 反选，代价高）；按钮类控件已全覆盖（视觉证据 `H-20a` ＋ 浏览器 `:focus-visible` 规则命中 ≥1） |
| `ACTION_BAR_DEFAULTS.evenRowPairs` 的语义 | **已消费** | 落成 `grid-template-columns: repeat(evenRowPairs, …)`（浏览器实测 2 列）；「偶数列对」的旧层精确语义未在契约定义，按施工单 B §1.2 取 grid 2 列 |
| 旧 `base.css` 的 `.hm-*` 全量重写 | **未做**（裁定 R8） | 本票只新增；删除随各技能迁移票 |

## 8. 自评风险 top3

1. **`charts` 区进 `sharedCssText` 属契约未直接讨论的合成**（施工单 B §附录「未确证项②」）。
   契约 §3.2 的闭集含 `charts`，§3.5 又声明「各有唯一产出者」→ 本票按「复用同一份文本」落地并记账；
   若契约后续裁定「charts 不入共享样式表」，则 `SECTION_BUILDERS.charts` 单点删除即可（T8/T12/T13 会同步变红）。
2. **视觉规格的「唯一真相源」是 `docs/visual-spec-help.md`（#105 冻结）**，本票据其逐值实现；
   该尺的 H-04／H-06／H-09／H-17／H-19 部分条目按裁定 R7 归 #104 → 本票的视觉验收只覆盖 8 区，
   **与「与 B1 标杆一致」的整页口径存在范围差**（已在 §6 记账 4 写明）。
3. **并发工作区**：`packages/base-render/dist/` 为共享产物，本票的变异脚本会在其上短暂施加变异
   （`finally` 无条件还原 ＋ 还原后自证 fail=0）；若并发票同时跑 `pnpm build`，可能出现瞬时竞争。
   协议已用目录锁串行化 build／test／git。
