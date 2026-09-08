# #95 返修证据（A1 FAIL 76 / A2 FAIL 67 → 裁定返修）

返修票：GitHub issue #95《打包与模板装载：files／loader／publish 门》。
两路审查：**A1 FAIL 76（2 条 S1）／A2 FAIL 67** → 编排者裁定返修。
协议依据：`.scratch/t75/concurrency-protocol.md` §2.1（包管理器禁令 ＋ 路径守卫 ＋ 用完即清）、§3.1（提交纪律）。

判据出处（本文件每条结论都有可复跑命令；行号一律换成**符号锚**，避免漂移）：

| 文件 | 角色 |
| --- | --- |
| `tooling/check-publish.mjs` | 发布门 G1–G3 ＋ 新增 `--tmp-hygiene`；G3 结论按 scope 分支 |
| `packages/skill-calorie/src/render/templates.ts` | 运行时读盘 loader（`CALORIE_TEMPLATES`／`loadTemplate`） |
| `packages/skill-calorie/test/skill-t11.test.mjs` | loader 装载 ＋ `missing-data` 守卫 |
| `docs/research/t95-publish-evidence.mjs` | 打包实证 A/B/C ＋ `--mutate` ＋ `--guard-selftest` |
| `docs/research/t95-f1-attribution.mjs` | F1 的 2×2 归因实测 |
| `docs/research/t95-g3-honesty.mjs` | F1／F3／F4／F8／F9 的回归判据 |
| `docs/research/t95-rework-mutate.mjs` | 变异自证驱动（红 → 还原 sha256 相同 → 绿） |

---

## 1. 逐项：缺陷 → 修法 → 证据

### F1（S1 · A1-1）临时根退回仓库内 → 仓内 `npm install`

- **缺陷**：`tooling/check-publish.mjs` 在非 ASCII `%TEMP%` 时把 G3 临时根改到**仓库内** `.scratch/`，
  于是 `npm install <tgz>` 在 `D:\ilife` 内执行——违反协议 §2.1②，与 2026-09-09 全仓事故（共享根
  `node_modules/.bin` 被清空）**同一机制**。
- **修法**：`TMP_ROOT` 一律 `os.tmpdir()`（删掉「非 ASCII 退回仓内」分支）；只保留「给安装目录写最小
  `package.json`」这一必要动作；新增 `--tmp-hygiene` 守「临时根在仓外 ＋ 仓内无 `ilife-fresh-*`／
  `ilife-pack-*`／`ilife-g3-*` 残留」。
- **证据**：`node docs/research/t95-f1-attribution.mjs`（2×2 表，见下）；`--tmp-hygiene` PASS；
  变异 F1 见 §3。归因表（本机 `%TEMP%` = `C:\Users\辰辰洋洋\AppData\Local\Temp`，非 ASCII）：

  | cwd | 最小 package.json | npm install exit | node_modules 落盘 | templates 件数 |
  | --- | --- | --- | --- | --- |
  | 非 ASCII `%TEMP%` | 无 | 0 | false | 0 |
  | 非 ASCII `%TEMP%` | 有 | 0 | **true** | **6** |
  | ASCII 仓外根 | 无 | 4294963248（EPERM） | false | 0 |
  | ASCII 仓外根 | 有 | 0 | **true** | **6** |

  → **决定性变量是「安装目录缺最小 package.json」，不是 cwd 编码**（A1 的归因结论成立）。

### F2（S1 · A1-2）证据脚本 `rmSync(recursive, force)` 无路径守卫

- **缺陷**：`docs/research/t95-publish-evidence.mjs` 末尾直接 `rmSync(d, {recursive:true,force:true})`，
  且失败路径 `process.exit(1)` 跳过清理。
- **修法**：新增 `guardEv(p)`——目标必须在自己**独占临时根**（每次运行随机 `mkdtemp`）下，且不在
  `node_modules`／`packages`／`docs`／`test`／`tooling`／`.git` 之下；守卫失败**抛错**。清理统一走
  `cleanupAll()`，失败路径走 `bail()`（先清理再退出），并挂 `process.on('uncaughtException')`。
- **证据**：`node docs/research/t95-publish-evidence.mjs --guard-selftest` → 10 例（8 拦 2 放）全 OK；
  变异 F2 见 §3。

### F3（S2 · A1-2／A2-1）版本偏斜定性错 ＋ G3 绕过公开出口

- **缺陷**：安装态 `import('skill-calorie/render')` 因 registry `base-paint` 缺 `ACTION_ID_ATTR` **真崩**
  （不是「假红」）；G3 改走 `dist/render/templates.js` 深路径只是**绕过**公开出口，却没有任何记账。
- **修法**：① 文档定性改「真崩」并给复现命令（`t95-packaging-and-template-loading.md` §7.3）；
  ② G3 打印**如实记账**行「公开出口断言（安装态 `import(<skill>/render)`）**未跑**——受 registry
  base-paint 版本偏斜阻塞，待 base-paint 发版后补」，并附探针 NOTE 记录**当时的真实结果**；
  **本票不发布 base-paint**（归框架图）。
- **证据**：G3 实测输出（`.scratch/t95-fix/gate-g3.txt`）：

  ```
  NOTE: skill-calorie 公开出口 import('skill-calorie/render') 抛（版本偏斜 → 真崩，非本票红）：
        The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'
  NOTE: 公开出口断言（安装态 import(<skill>/render)）**未跑**——受 registry base-paint 版本偏斜阻塞，
        待 base-paint 发版后补（#95 F3 记账）
  ```

  变异 F3 见 §3。

### F4（S2）G3 掏空契约断言却仍打印绿灯

- **缺陷**：`--only skill-calorie` 下 `CONTRACT = {}`，契约循环一次不跑，却仍打印
  「G3 安装态断言全绿／cliPath 解析 + 契约键打通」。
- **修法**：结论按 scope 分支，模板断言与契约断言**分别**给结论；无契约键时打印
  「契约断言 未跑（本 scope 不含插件包，无 cliPath／契约键可断）」。G3 内部同样打印
  「模板 N/M 包逐件装载全绿；契约 未跑（本 scope 无契约键）」。
- **证据**：G3 输出（上）；回归判据 `node docs/research/t95-g3-honesty.mjs`（含负向断言
  「不得出现『契约键打通』『断言全绿』」）；变异 F4 见 §3。

### F5（S2）证据文档 file:line 漂移

- **缺陷**：`t95-packaging-and-template-loading.md` §1 引 `check-publish.mjs:36`／`:38-41`／`:84-93`，
  实为 `:44`／`:46-48`／`:90-100`（返修后文件更长，行号只会更漂）。
- **修法**：全文改**符号锚**：`WITH_TEMPLATES`／`TEMPLATE_NAMES`（常量）、`gateTarball()`／`gateFreshTmp()`
  （函数）、`files` 字段、`CALORIE_TEMPLATES`／`loadTemplate`。
- **证据**：`docs/research/t95-rework-mutate.mjs` 的 F5 静态检查（符号存在 ＋ 旧行号锚已消失）；
  §1 表格本身。

### F6（S2）`docs/calorie-dual-path-acceptance.md` 已成假陈述

- **缺陷**：「`dist/render` 零运行时读盘／HTML 一律以代码提供，不依赖固定模板文件」——本票新增读盘
  loader 且模板随包发，该行已成假。
- **修法**：就地同步该行（仅本票相关那一行）：标明 #95 后的状态（`src/render/templates.ts` 是运行时读盘
  loader；6 模板随包发并由 publish 门在安装态逐件断言可读），以及**未接线部分与占位符改造归 #107**
  （`docs/base-paint-contract.md` §4.4／§6.1）。
- **证据**：变异驱动的 F6 静态检查（旧句消失 ＋ 新句含 `loader` 与 `#107`）。

### F7（S3 · A1-1）`missing-data` 分支零守卫

- **缺陷**：变异 M3（`catch` → `return ''`）后 build／skill-t11／G3 **三绿**。
- **修法**：`test/skill-t11.test.mjs` 新增「loader 缺文件抛 `missing-data`（不返空）」：把 `dist/render/`
  的 `templates.js`＋`errors.js` 复制成一份**安装布局副本**（不含 `templates/`），断言装载抛
  `missing-data`，再补上文件断言成功（正例对照）。不碰仓库内真实模板文件（并发安全），`rmSync` 带守卫。
- **证据**：变异 F7 见 §3（红：`missing-data` 断言失败；还原后 7/7 绿）。

### F8（S3 · A1-2）G3 对「少发几件」失明

- **缺陷**：变异 M4（`files` 只发 1 件模板）→ G2 红、**G3 PASS**（G3 只遍历磁盘上发现的文件）。
- **修法**：G3 以 `TEMPLATE_NAMES` 的**应发清单**逐件比对：`miss` 非空即红（`bad += miss.length`），
  另有未登记模板只打 NOTE；装载循环也改为遍历应发清单。
- **证据**：变异 F8 见 §3（红：`FAIL: skill-calorie 安装态少发模板 5 件（应 6 件）：…`）。

### F9（S3 · A2-3）临时根不清理 ＋ 遗留 8.1MB

- **缺陷**：G3 的 `packDir`／`inst` 只在成功路径隐式消失（失败即 `return` 留下）；证据脚本失败路径
  `process.exit(1)` 同样跳过清理；实施者曾留下 `.scratch/ilife-fresh-*`／`ilife-pack-*`（编排者已代为清理）。
- **修法**：`gateFreshTmp()` 整体 `try { … } finally { rmTmp(inst); rmTmp(packDir); }`（`rmTmp` 带守卫）；
  G3 内部 DB 临时目录也登记后清理；证据脚本 `bail()`／`cleanupAll()`；新增 `--tmp-hygiene` 回归守卫。
- **证据**：变异 F9 见 §3（删掉 `finally` 清理 → 新增残留目录被检出）。

---

## 2. 门禁与失败集 delta（持 `gate.lock` 串行）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `pnpm build` | exit 0 |
| 边界 | `pnpm boundaries` | exit 0 |
| 快照 | `pnpm snapshot:check` | exit 0 |
| 发布（pre） | `pnpm publish:pre` | exit 0 |
| 打包清单 | `node tooling/check-publish.mjs --tarball --only skill-calorie` | PASS（exit 0） |
| 安装态 | `node tooling/check-publish.mjs --fresh-tmp --only skill-calorie` | PASS（exit 0） |
| 临时根卫生 | `node tooling/check-publish.mjs --tmp-hygiene` | PASS（exit 0） |
| G3 诚实性 | `node docs/research/t95-g3-honesty.mjs` | PASS（exit 0） |
| 单测 | `node --test packages/skill-calorie/test/skill-t11.test.mjs` | 7/7 绿（exit 0） |
| 打包实证 | `node docs/research/t95-publish-evidence.mjs` / `--mutate` / `--guard-selftest` | PASS／被抓住／PASS |
| 归因 | `node docs/research/t95-f1-attribution.mjs` | PASS |
| 全量 | `pnpm test` | 见 §2.1（delta，非 #95 路径单列） |

### 2.1 全量 `pnpm test` delta

见 `docs/research/t95-test-delta.mjs` 与 `.scratch/t95-fix/test-delta-*.txt`（冻结基线
`.scratch/t75/baseline-failing.txt`）。**本票路径新增失败 0 条**：`skill-t11` 7/7 绿；
其余失败逐条落到在飞票（#87 CLI 出口／#101 写链／#98 SKILL.md），本票不碰这些文件。

---

## 3. 变异自证（红 → 还原 sha256 相同 → 绿）

驱动：`node docs/research/t95-rework-mutate.mjs`（持 `gate.lock`；每个变异前记 sha256，还原后复核相同再跑绿）。

| 项 | 变异 | 变异态（期望红） | 还原后（期望绿） | sha256 前后一致 |
| --- | --- | --- | --- | --- |
| F1 | `TMP_ROOT = join(root, '.scratch')`（退回仓库内） | 红 ✅ `--tmp-hygiene` exit 1 ＋「临时根落在仓库内」 | 绿 ✅ exit 0 | 一致 ✅ |
| F2 | `guardEv` 改成 `return resolve(p)`（去守卫） | 红 ✅ `--guard-selftest` exit 1 ＋ `FAIL(guard)` | 绿 ✅ exit 0（10 例全 OK） | 一致 ✅ |
| F3 | 删掉「公开出口断言…**未跑**」记账行 | 红 ✅ `t95-g3-honesty` exit 1 ＋「公开出口断言未如实记账」 | 绿 ✅ exit 0 | 一致 ✅ |
| F4 | G3 结论改回无条件 `ok('G3 安装态 cliPath 解析 + 契约键打通')` | 红 ✅ `t95-g3-honesty` exit 1 ＋「契约断言未标注『未跑』」 | 绿 ✅ exit 0 | 一致 ✅ |
| F7 | `loadTemplate` 的 `catch` 改成 `return ''` | 红 ✅ `skill-t11` exit 1 ＋缺件断言红（`missing-data`） | 绿 ✅ 7/7 | 一致 ✅ |
| F8 | `package.json` 的 `files` 只发 `templates/help.html` | 红 ✅ G3 exit 1 ＋「安装态少发模板 5 件（应 6 件）」 | 绿 ✅ exit 0 | 一致 ✅ |
| F9 | 删掉 `gateFreshTmp` 的 `finally` 清理 | 红 ✅ G3 后新增残留 2 个（`%TMP%\ilife-fresh-*`、`%TMP%\ilife-pack-*`） | 绿 ✅ 新增残留 0 | 一致 ✅ |
| F5 | 静态：符号锚存在性 ＋ 禁「文件名:行号」引用 | — | ✅ 缺符号 0 个、带行号引用 0 处 | — |
| F6 | 静态：旧假陈述已删 ＋ 新陈述含 `loader`／`#107` | — | ✅ 旧句 0 处、新句齐 | — |

实测输出：`.scratch/t95-fix/mutate-rework.txt`（F1–F4／F7–F9 一轮）＋ `mutate-rework-2.txt`（F7 详情措辞修正 ＋ F5／F6 静态）。

> 说明：F9 的「红」不是脚本退出码变红（清理与否不影响 G3 结论），而是**残留目录被检出**——这正是
> 「用完即清」缺口的直接证据；变异态下 `ilife-fresh-*`／`ilife-pack-*` 落在 `os.tmpdir()`（**仓外**），
> 也再次印证 F1 的临时根位置正确。

---

## 4. 未修 / 需转票

1. **registry `base-paint` 版本偏斜（本票不修，建议转票）**——准确措辞：
   > **转票：发布 `base-paint` 以消除安装态公开出口崩溃。**
   > 现象：安装 `skill-calorie@0.1.1` 后 `import('skill-calorie/render')` 抛
   > `SyntaxError: The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'`
   > （registry 上的 `base-paint@0.1.0` 落后工作区，缺 `ACTION_ID_ATTR` 等导出）→ 安装态**整包不可用**（真崩，非假红）。
   > 影响：`tooling/check-publish.mjs --fresh-tmp` 只能断言模板资产（走 `dist/render/templates.js` 深路径），
   > **公开出口断言记「未跑」**；所有「安装态整包可用」类断言同样无法落地。
   > 范围：发布 `base-paint` 新版本 ＋ 把 `skill-calorie`（及其余 5 对）依赖范围抬到新版；归**框架图**。
   > 完成后：把 G3 的「公开出口断言」从「未跑」改为**真断言**（`await import('<skill>/render')` 必须成功）。
2. **`html.ts` 未接线（不在本票写权限内）**：`render/pageShell` 仍自建 HTML 壳，未消费 loader
   （#87 占 `src/cli/cmd_read.ts`、#101 占 `src/cli/write.ts`／`src/render/photo.ts`）。
3. **6 模板占位符改造 ＋ 并入 HELP 重建 → #107**（`docs/base-paint-contract.md` §4.4／§6.1）：模板目前只有
   `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`，无 `<!--INJECT-DATA-->`、无自带容器，属契约外遗留资产。
4. **全量 13 包 fresh 未跑**：本票范围为卡路里线（`--only skill-calorie`）；全量 `publish:fresh` 含 registry
   拉取，由 CI 覆盖。

---

## 5. 复跑（照抄即可）

```sh
pnpm build
node docs/research/t95-f1-attribution.mjs                     # F1 归因（2×2）
node docs/research/t95-publish-evidence.mjs                   # A/B/C 打包实证
node docs/research/t95-publish-evidence.mjs --mutate          # files 变异态（B/C 红）
node docs/research/t95-publish-evidence.mjs --guard-selftest  # F2 守卫有牙
node tooling/check-publish.mjs --tarball --only skill-calorie
node tooling/check-publish.mjs --fresh-tmp --only skill-calorie
node tooling/check-publish.mjs --tmp-hygiene                  # F1/F9
node docs/research/t95-g3-honesty.mjs                         # F1/F3/F4/F8/F9
node --test packages/skill-calorie/test/skill-t11.test.mjs     # F7
node docs/research/t95-rework-mutate.mjs                      # §3 变异自证（持锁）
```
