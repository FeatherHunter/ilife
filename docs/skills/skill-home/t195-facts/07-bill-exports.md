# 饼干记账「照抄三件」的真实导出名与签名（源码实测）

范围：只读 `packages/skill-bill/src/render/helpPaths.ts`、`packages/skill-bill/src/output.ts`、`packages/skill-bill/src/render/helpFile.ts` 三件；
调用方与共用件的 `文件:行号` 由 `grep` 取得，均可复现。

## 1 三件各自的真实导出清单

### 1.1 `packages/skill-bill/src/render/helpPaths.ts`（20 行）

- `HELP_HTML_DIR_NAME`｜常量｜`'biscuit_accountant_html'`｜HELP 产物子目录名｜:16
- `LOOKUP_FILE_STEM`｜常量｜`'饼干记账_速查表'`｜「速查／现找」支的文件名主体｜:20
- 无 import、无函数、无类型；自述「零 IO、零逻辑」（:1）。

### 1.2 `packages/skill-bill/src/output.ts`（48 行）

- `deliverHtml`｜函数｜`(input: { explicit?: string; target?: HtmlLanding; html: string }) => HtmlDelivery`｜唯一交付入口｜:39
- `HtmlDelivery`｜类型别名｜`= HtmlReceipt`（共用件回执，不另立定义）｜交付结果形状｜:27
- `HtmlLanding`｜类型再导出｜`export type { HtmlLanding }` ＝ `{ dir: string; stem: string }`｜落点意图｜:31

### 1.3 `packages/skill-bill/src/render/helpFile.ts`（185 行，21 个导出）

常量（6）：`HELP_FILE_STEM` :24 ＝ `'饼干记账_HELP' as const`（**文件名主体住这里，不住 helpPaths.ts**）／`HELP_FILE_SKILL_NAME` :26 ＝ `'饼干记账'`／
`HELP_FILE_TITLE` :27 ＝ `'饼干记账 · 使用手册(HELP)'`／`HELP_FILE_VERSION` :29 ＝ `'2.0'`（技能数据世代，非 npm 包版本）／
`HELP_INIT_SCENE_ID` :31 ＝ `'setup_init_wizard'`／`HELP_CONTACT` :46 ＝ 冻结的联系三项对象 `{ items, copy_all: true }`。

接口（8）：`HelpContactItem` :33（`label`／`value`／`url?: true`）／`HelpContact` :40（`items`／`copy_all: true`）／`HelpMetaBlock` :59（`id`／`title`／`html`）／
`HelpInitBanner` :66（`title`／`subtitle`／`button_text`／`prompt`／`closable: true`／`hidden: boolean`）／`HelpFileOptions` :87（`initialized?: boolean`）／
`HelpIndexItem` :160（`id`／`icon`／`label`／`subgroupCount`／`sceneCount`）／`HelpIndex` :168（`items`／`total`／`sceneTotal`／`subgroupTotal`）／
`HelpFileData` :76（8 键，§4 逐字段）。

函数（7）：`formatHelpMinute` :93 `(now: Date) => string`／`deriveSummaryLine` :103 `(now?: Date) => string`／
`buildMetaBlocks` :109 `(summaryLine: string) => readonly HelpMetaBlock[]`／`buildInitBanner` :118 `(initialized: boolean) => HelpInitBanner`／
`buildHelpFileData` :136 `(now?: Date, opts?: HelpFileOptions) => HelpFileData`／`renderHelpFileHtml` :154 `(data: HelpFileData) => string`／
`buildHelpIndex` :175 `() => HelpIndex`。

汇总出口 `packages/skill-bill/src/render/index.ts`：值在 :8-12、类型在 :13、helpPaths 两常量在 :15。

## 2 命名与落点通式：常量的确切取值

- 通式 `〈文件名主体〉_<YYYYMMDD_HHMMSS>[_N].html`；实例逐字见 `cmd_read.ts:72`＝`饼干记账_HELP_<YYYYMMDD_HHMMSS>[_N].html`。
- 目录名常量 `HELP_HTML_DIR_NAME` ＝ `'biscuit_accountant_html'`（helpPaths.ts:16）；拼接点 `cmd_read.ts:104`／`:110` ＝ `join(resolve(dbDir), HELP_HTML_DIR_NAME)`。
- 文件名主体常量：HELP 支 `HELP_FILE_STEM` ＝ `'饼干记账_HELP'`（helpFile.ts:24）；速查表支 `LOOKUP_FILE_STEM` ＝ `'饼干记账_速查表'`（helpPaths.ts:20）。
- 时间戳格式 `YYYYMMDD_HHMMSS`（本地时间）：实现是共用件**私有** `formatStamp`（`base-render/src/output/saveHtml.ts:126`，年月日时分秒拼接，分隔符 `'_'` 在 :129）；本三件只留口径文字（helpPaths.ts:6-7，并自称唯一定义地在共用件 :7-8）。
- `_N` 递补：`nextCandidate`（saveHtml.ts:158）产出 `prefix + '_' + String(n + 1) + '.html'`（:165）⇒ 无 `_N` 时起点 `_2`（注释 :157）；上限 `SUCCESSION_LIMIT = 1000`（:84）；扩展名 `HTML_EXT = '.html'`（:78）。
- 独占语义来自共用件缺省态 `onExists:'succession'`（saveHtml.ts:55、:239）：`wx` 独占创建、**只**对 `EEXIST` 递补（:173），其余错误原样抛出（output.ts:14）。

## 3 落盘点 `deliverHtml`（output.ts:39）

- `explicit` 路（`--html <路径>`）：`resolve(explicit)` → `saveHtmlFile({ dir: dirname(abs), file: basename(abs), html, onExists: 'overwrite' })`（:41-42）⇒ 覆盖写、不带时间戳、不递补。
- `target` 路：`saveHtmlFile({ dir: target.dir, stem: target.stem, html })`（:47）⇒ 共用件缺省 `succession` ⇒ `wx` 独占创建 ＋ 撞名 `_N` 递补。
- 两者都给时 `explicit` 优先（:40 先判）；`target` 缺位即抛 `new Error('[skill-bill] deliverHtml 缺落点（…）')`（:45）。
- 回执形态 `HtmlDelivery` ＝ 共用件 `HtmlReceipt` 对象 `{ mode: 'file'; path: string; bytes: number }`（saveHtml.ts:71-74），`path` **恒绝对**（output.ts:16-17）。
- 调用方拿到它做什么（`cmd_read.ts`）：:492 `let delivery: HtmlDelivery | undefined`；:508／:510 赋值；:523-524 `{ ...env, delivery }` **顶层追加**进 envelope（既有五字段一字不改）后 JSON 单行写 stdout；落盘失败＝退出码 5（:3）。

## 4 `helpFile.ts` 里 `base-paint/help-shell` 的 import 与喂入字段

import 原文（helpFile.ts:19）：

```ts
import { renderHelpShellHtml } from 'base-paint/help-shell';
```

喂入：`renderHelpFileHtml(data)`（:154）直调 `renderHelpShellHtml(data)`（:155）；`data` 由 `buildHelpFileData(now, { initialized })`（:136-151）组装（左＝键，右＝取值来源）：

- `skill_name` ← `HELP_FILE_SKILL_NAME`（:142）
- `title` ← `HELP_FILE_TITLE`（:143）
- `subtitle` ← `summaryLine` ＝ `deriveSummaryLine(now)`（:140／:144）＝ `N 功能域 · M 场景 · 版本 2.0 · 更新于 YYYY-MM-DD HH:MM`（:104-105）
- `contact` ← `HELP_CONTACT`（:145）
- `groups` ← `WAKE_GROUPS`（只读引用不 clone，:146；类型 `typeof WAKE_GROUPS`，:81）
- `meta_blocks` ← `buildMetaBlocks(summaryLine)`（:147）＝ 两块 `help_summary`（:111）＋ `help_wake_words`（:112）
- `version` ← `HELP_FILE_VERSION`（:148）
- `init_banner` ← `buildInitBanner(opts.initialized === true)`（:149）＝ `{ title, subtitle, button_text, prompt ← SCENE_BY_ID['setup_init_wizard'].prompt_template, closable: true, hidden }`（:119-132，缺 prompt 抛 `BillRenderError`）
- 全件零 IO：`now` 显式传入（:135），初始化状态由调用方传入（:17、:88）。

## 5 依赖（逐件）

- `helpPaths.ts`：**无 import**（零依赖，纯常量）。
- `output.ts`：`node:path`（`basename`／`dirname`／`resolve`，:23）；`base-paint/save-html`（`saveHtmlFile`／`HtmlLanding`／`HtmlReceipt`，:24）。
- `helpFile.ts`：`base-paint/help-shell`（`renderHelpShellHtml`，:19）；`../triggers/wake-assets.js`（`HELP_WAKE_WORDS`／`SCENE_BY_ID`／`WAKE_ASSETS`／`WAKE_GROUPS`，:20）；`./errors.js`（`BillRenderError`，:21）。
- `base-paint` 是 skill-bill 的包依赖（`packages/skill-bill/package.json:26`＝`"base-paint": "^0.3.0"`）；其 `save-html` 实现落在 `packages/base-render/src/output/saveHtml.ts`。
- 照抄边界：`help-shell` 与 `save-html` **都不在这三件里**；照抄后新件仍须能解析 `base-paint/*`（否则落盘与渲染两个口子都要另配替代），另需 `../triggers/wake-assets.js`（内容资产）与 `./errors.js`。

## 6 行数（实测）

`helpPaths.ts` 20 行／`output.ts` 48 行／`helpFile.ts` 185 行，合计 **253 行**；三件均 LF 换行、无 CRLF、无 BOM（`ReadAllLines` 与 LF 计数一致：20／48／185）。
