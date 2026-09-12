# t195 · 先例事实：同类交付的形状

只读两处：`docs/skills/skill-calorie/t179-180-structure-design.md`（下称「卡路里先例」）、`packages/skill-chef/src/help/`（另一会话未提交工作区，只记形状）。行号＝各文件当前位置。

## 一、卡路里先例

### a) 技能级落点（如 `help-lookup`）违不违反铁律四

- 判据一句话：铁律四管的是**能力目录名取自 HELP 一级分组**；「技能级查找入口」不属于任何一个能力，故不受铁律四管，落点另行处置。
- `t179-180-structure-design.md:96` 原话要点：「`src/triggers/help-lookup.ts` 该不该挪：**不挪**。它不是 10 个能力里任何一件——它装的是技能级查找入口（唯一出口是 `src/cli/cmd_read.ts:839-852` 的 `calorie.help.lookup`），铁律四的『能力目录名取自一级分组』管不到它；今天住 `triggers/` 是整包按工种分目录的存量问题，一起留给重排那张票。」
- 同处给的搬迁代价（`:96`）：源码 2 处、测试 2 个文件、`docs/research/` 下 4 个证据脚本、外加一类文档里的行号全部失效。
- `:32`：起名只许取 HELP 的现成说法（铁律四）不变；「代码目录一律用英文名」是用户裁定，**压在这条之上**，`docs/agents/structure.md:44-49` 待同批改。

### b) 目录名取自 HELP 一级分组

- `:11` 目录树：`packages/skill-calorie/src/profile/` ← 目录名＝能力名（HELP 一级分组「基础信息」）。
- `:25` 映射表一行一处：一级分组「基础信息」→ `src/profile/`，依据是**仓内既有说法**：`src/triggers/scene-07-profile.ts:5` 的 key 前缀 `profile_*`、`src/cli/keys.ts:44-46` 的命令名 `calorie.profile.*` 与 `:107` 的 `calorie.view.profile`。
- `:21`＋`:30`：英文名一律照仓内既有说法取、**不自创**；中英两边是同一批子功能，一一对上，能力目录名 `profile` 与四条命令的 `profile` 段一致。
- `:13-14`＋`:26-28`：文件名同法取自该组下一级子功能（`setup.ts`／`update.ts`／`view.ts`）。
- `:32`＋`:122`：英文名这条与第六节点头绑在一起；本仓 `packages/` 今天 0 个非 ASCII 目录名／文件名。

### c) 共用件条款怎么用

- `:72` 放哪：`packages/skill-calorie/src/shared/docPage.ts`（与能力目录并列的共用位）；理由＝「`src/` 下第一层必须是能力名」，放 `src/` 根会多一个非能力名条目，且 `shared/` 里不许出现任何能力名（`structure.md:67`）；明确不放进待重排的 `src/render/`。
- `:74` 门槛条款原话：「**谁引用（写得出哪两个能力在用）**：**`profile`（HELP 说法「基础信息」）**（新页与回执页，`profile/*.ts`）与**身体细节／身材照片**（`src/render/wizardPortDocs.ts` 那四页：记围度／记体脂／记身材照／GIF）」。7 个文件全改完后饮食／运动／分析也一并引用它。
- `:45` 该共用件对外 4 件：`assembleDocPage`／`promptCopyArea`／`dataCopyArea`／`metricsOf`（≤5）。
- `:76` 引用面必须改到位：只加共用件、旧 7 处不改，定义就从 7 处变 8 处，正是铁律二禁止的。
- `:102`＋`:104` 点头句与两个触发条件：新建目录层级、碰三个以上能力（实测 5 个）——`structure.md:88`。

## 二、skill-chef `src/help/` 的形状清单

文件树（6 件，全 `.ts`、无子目录、目录内无资产文件）：

```
packages/skill-chef/src/help/
├─ index.ts        6 行  只转发
├─ manifest.ts    25 行  三个落点常量（零逻辑、零 IO）
├─ lookup.ts      49 行  速查（WAKE_TABLE 唯一上游）
├─ sceneData.ts  185 行  内容资产（机器生成、禁手改）
├─ helpFile.ts   273 行  渲染接线（纯函数 ＋ 只读探针）
└─ output.ts      47 行  唯一落盘点（唯一碰 fs 的 help 件）
```

每件导出：

- `index.ts:1-6`：只转发，不自造第二套（`buildHelpLookup`／`lookupWake`／`HelpHit`／`CHEF_SCENES`／`buildChefSceneData`／`buildChefHelpFileData`／`buildChefHelpDelivery`／`renderChefHelpHtml`／`formatHelpMinute`／`buildChefLookupLanding`／`deliverChefHelp`／`ChefHtmlDelivery`／`HtmlLanding`）。
- `manifest.ts:18/21/25`：`HELP_DIR_SEGMENTS = ['cook_html','help']`、`HELP_FILE_STEM = '私家大厨_HELP'`、`LOOKUP_FILE_STEM = '私家大厨_速查表'`。
- `lookup.ts:5/28/38`：`interface HelpHit`（5 字段）、`buildHelpLookup(): HelpHit[]`、`lookupWake(hits: HelpHit[], word: string): HelpHit[]`。
- `sceneData.ts:40/178`：`CHEF_SCENES: readonly SceneGroup[]`、`buildChefSceneData(): SceneData`（有意只给 2 个导出，`:30`）。
- `helpFile.ts:114/153/206/254/271`：`formatHelpMinute`、`buildChefHelpFileData`、`renderChefHelpHtml`、`buildChefHelpDelivery`、`buildChefLookupLanding`（共 5 个，≤5）。
- `output.ts:29/32/35`：`type ChefHtmlDelivery`（＝共用件回执别名）、转发 `type HtmlLanding`、`deliverChefHelp`。

资产放哪：内容资产＝`src/help/sceneData.ts` 本身，与代码同目录（不是单独 `assets/`）。件头 `:1-17`：机器生成、**禁手改**，生成器 `packages/skill-chef/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘），三把 sha256 摘要锁；事实源（老载荷 JSON／`src/policy/wakewords.ts` 的 `WAKE_TABLE`／`docs/skills/skill-chef/t2-content-reconcile.md` §七）全程只读。页面模板**不自持**：恒在 `packages/base-render/assets/help-template.html`，要改源得跑 `pnpm --filter base-paint gen:help-shell`（`helpFile.ts:1-6`）；渲染走共享层 `base-paint/help-shell`（`:58`）。速查页不在此渲染，由出口拿信封走本技能 `templates/help.html`（`:13-14`、`:269-270`）。

渲染入口签名（只记形状）：

- `renderChefHelpHtml(data: ReturnType<typeof buildChefHelpFileData>): string`（`helpFile.ts:206`，内部调 `renderHelpShellHtml`）。
- `buildChefHelpFileData(now: Date, opts: ChefHelpFileOptions = {}): { skill_name; title; subtitle; contact; groups; version; init_banner }`（`:153`；纯函数零 IO，返回类型内联、不另开导出）。
- `buildChefHelpDelivery(dbPath: string, now: Date): { html; target: {dir; stem}; index }`（`:254`）。
- `buildChefLookupLanding(dbPath: string): { dir; stem }`（`:271`，不渲染页面）。
- `deliverChefHelp(input: { explicit?: string; target?: HtmlLanding; html: string }): ChefHtmlDelivery`（`output.ts:35`；`explicit` 覆盖写／`target` 独占创建＋同秒递补，两者都给时 `explicit` 优先）。
- 初始化状态只由 `existsSync(dbPath)` 判（`helpFile.ts:125-127`），判定出异常当未初始化；全程不建目录、不开 SQLite（`:31-37`）。

## 三、两条先例互相矛盾／不一致处

1. **技能级落点住哪**：卡路里 `:96` 判「不挪」（留在 `triggers/`，连同整包重排留票）；chef 的实做是给同类东西单开一个**非能力名**目录 `src/help/` 并住 `src/` 第一层——只在「技能级落点不受铁律四管」这条豁免下成立。
2. **共用件归谁**：卡路里把整页装配共用件放**包内** `src/shared/`（`:72`）；chef 把模板与「命名＋落盘」收进**公共层包** `base-paint`（`helpFile.ts:4-6`、`output.ts:3-5`，维护者 2026-09-12 裁决 8）。同性质东西落了两家。
3. **内容资产落点**：chef 把生成资产当源码放功能目录内（`src/help/sceneData.ts`）；卡路里那份把页面模板放在包内 `templates/`（六件，被 `packages/skill-calorie/test/skill-t11.test.mjs:55-69` 钉住清单，`:85` 列「本次不动」）。
4. **350 行告警线与口径**：卡路里 `:123` 仍在待裁，并记「这条数字没写在包内自己的地方（`packages/skill-calorie/` 下无 `AGENTS.md`）」；chef 已落 `packages/skill-chef/AGENTS.md`（350 ＋ LF 口径）。同一条规矩两个落地状态。

## 四、这些先例对居家的直接约束（只列约束）

1. 能力目录名必须取 HELP 一级分组，并写成英文；英文名须在仓内既有说法里找到出处，不得自创（`:21`、`:25-32`、`:122`）。
2. 新建目录层级只准是能力名；共用件要与能力目录并列（`src/shared/`，里面不出现任何能力名），不许塞进按工种分的旧目录（`:72`）。
3. 技能级落点（HELP 查询入口一类）不受铁律四约束，但两先例做法相反，居家必须先裁定落点再动手（`:96` 对 `src/help/`）。
4. 建共用件前必须写得出「哪两个能力在用」，并写出点头句、核对两个触发条件（新建目录层级／碰三个以上能力）（`:74`、`:102`、`:104`）。
5. 落盘与命名（时间戳、同秒递补、绝不静默覆盖）只许引用共用件，包内不得有第二份实现；HELP 页面渲染只许走共享模板，包内不得自持页面副本（`manifest.ts:7-10`、`output.ts:3-5`、`helpFile.ts:4-6`）。
6. 资产若机器生成：件头须标「禁手改」、写明生成器入口与 `--check`、给摘要锁；事实源只读（`sceneData.ts:1-17`）。
7. HELP 页不得建库：初始化状态只由 `existsSync(dbPath)` 判，判定出异常当未初始化（`helpFile.ts:31-37`、`:125-127`）。
8. 每件对外件数 ≤5（铁律五）；`index.ts` 只转发、不自造第二套（`helpFile.ts` 5 个、`sceneData.ts` 2 个、卡路里 3/1/2/4 与共用件 4：`:45`、`:52`）。
9. 居家包内必须先有自己的告警线数字＋数法（chef：350 ＋ LF；卡路里缺），照抄前先定数并落进 `packages/skill-home/AGENTS.md`（`:123` 的缺口）。
10. 资产落点两说不并存：`src/help/*.ts` 内联生成 与 包内 `templates/*.html` 不迁（`:85`），居家只能选一处并接受其测试钉法。
