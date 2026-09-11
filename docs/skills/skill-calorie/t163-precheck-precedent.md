# t163 现成预检确认页路子（证据收集）

> 任务书里写的 `src/render/...` 是包内相对路径，实际全在 `packages/skill-calorie/` 下（`src/render/wizardPort.ts` 等）。
> 每条结论后跟 `文件:行号` 或命令回显；没证据的标「推测」。

## 总表

| 项 | 结论 | 证据 |
| --- | --- | --- |
| 四条预检确认页命令 | `calorie.view.measure-wizard`／`calorie.view.composition-wizard`／`calorie.view.photo-log-wizard`／`calorie.view.gif-planner` | `src/triggers/routing.ts:670-674`；`src/cli/keys.ts:132-137` |
| envelope 形状 | 四条一律 `shape: 'stat'`；落盘 `delivery.mode="file"`、`delivery.template="doc-shell"` | 实跑 stdout（见 §3）；`keys.ts:134-137` |
| combos.yaml 镜像 | 有，四条 | `packages/base-combos/combos.yaml:306-325` |
| 数据从哪来 | **参数进 ＋ 数据库读，两者都有**；身材照页只走参数不读库 | `src/render/wizardPort.ts:115/194/279/394` |
| prompt 从哪来 | 页面层 `wizardPort.ts` 生成，挂视图 `prompt` 字段；围度／体脂是参数式，身材照／GIF 带命令段 | `wizardPort.ts:15-21,102-113,269-277` |
| **产物是不是完整文档** | **是完整文档**（doctype＋charset＋内联样式＋内联脚本＋`</html>`），不是片段 | 实跑落盘文件首尾（见 §3） |
| 测试怎么钉 | `test/wizard-86.test.mjs` 9 个 test；7 类可复用断言 | 见 §5 |
| 场景 07 最小改动 | **不新增会改数据库的命令**（三条已有）；新增 1 条页面命令；要动 6 个文件的计数断言 | 见 §6 |
| `output_type` 现状 | 三条写入词 `receipt`、`查档案` `result`；`process` 只有 6 条且都不在场景 07 | `src/triggers/scene-07-profile.ts:5-8`；实测见 §7 |
| `calorie.help.lookup` 取数字段 | **`main_prompt.cli`**，不是 `data_source` | `src/cli/cmd_read.ts:839-842`；`src/triggers/help-lookup.ts:131` |

---

## 1. 四条预检页命令

**哪四条**（`src/triggers/routing.ts:670-674`，位于 `NEW_KEY_ROUTES` 数组尾，上一行 670 有 `#86 · wizard 4 页复刻 D1 新拟入口` 注释）：

| 唤醒词 | 命令 | 场景 |
| --- | --- | --- |
| `看围度向导` | `calorie.view.measure-wizard` | 08 |
| `看体脂向导` | `calorie.view.composition-wizard` | 08 |
| `看身材照向导` | `calorie.view.photo-log-wizard` | 09 |
| `看GIF规划器` | `calorie.view.gif-planner` | 09 |

`gif-planner` 那条路由带 `--params '{"tag":"正面"}'`，其余三条无参（`routing.ts:671-674`）。

**`keys.ts` 里怎么登记**：`src/cli/keys.ts:132-137`，四行都长这样 ——
`'calorie.view.measure-wizard': { shape: 'stat' as EnvelopeShape, title: '围度向导' },`
注释 132-133 行写明「#86 · wizard 4 页复刻 D1（D2 只许追加：读 60→64，共 99；静态 HTML＋copyText，不碰 client 控件）」。四条都在 `CALORIE_COMBOS` 的 `as const` 收口前一行。

**envelope 什么形状**：`shape: 'stat'`。实跑 stdout（见 §3）：
```json
{"version":"0.1.0","skill":"calorie","shape":"stat","key":"calorie.view.measure-wizard",
 "data":{"metrics":{"filledCount":1,"hasRecent":1},"output":"…\\measure.html"},
 "delivery":{"mode":"file","path":"…\\measure.html","template":"doc-shell","bytes":55412}}
```

**落盘名长什么样**：`--output` 由调用方给绝对路径。测试里的约定是
`key.replace(/\./g, '_') + '.html'`（`test/wizard-86.test.mjs:228`）→ `calorie_view_measure-wizard.html`。CLI 自己把路径回在 `delivery.path`。

**`combos.yaml` 有没有镜像条目**：有。`packages/base-combos/combos.yaml:306-325` 四条，字段 `key/skill/shape/title/cmd`：
```yaml
  - key: calorie.view.measure-wizard
    skill: calorie
    shape: stat
    title: 围度向导
    cmd: skill-calorie
```
校验器 `tooling/check-combos.mjs`（构建／测试期跑）。`title` 与 `keys.ts` 逐条同值被钉死：`test/output-naming-87.test.mjs:124-137`。

**`SKILL.md` 命令表里怎么呈现**（AI 靠它知道跑哪条命令）：`packages/skill-calorie/SKILL.md` 里四行，列为 `唤醒词 | 命令 | shape | 可跑 CLI`：

| 行 | 内容 |
| --- | --- |
| 126 | `看体脂向导` → `calorie.view.composition-wizard` → `calorie-cmd-read calorie.view.composition-wizard` |
| 140 | `看GIF规划器` → `calorie.view.gif-planner` → 带 `--params '{"tag":"正面"}'` |
| 155 | `看围度向导` → `calorie.view.measure-wizard` → `calorie-cmd-read calorie.view.measure-wizard` |
| 159 | `看身材照向导` → `calorie.view.photo-log-wizard` → `calorie-cmd-read calorie.view.photo-log-wizard` |

另有 `SKILL.md:49-75` 的「**Wizard Verify 铁则（M6，v2.4.3 复刻）**」段落，分流表三行：`1 主动填`（没给数据→出空页）／`2 预填 verify ⭐`（给了数据→出预填页）／`3 直接录`（用户明说「直接录」→跳过页面直接调会改数据库的命令）。`SKILL.md:71` **仍写着「verify 页当前不存在（#86 在途）」**——已过期，交付票要改（推测）。

## 2. 数据从哪来

**两者都有**：参数供「用户将要写入的内容」做预填；数据库供「最近一次」做参照。页面层一律不自算，复用既有取数层（`wizardPort.ts:8-12` 注释）。

**围度页** `buildMeasureWizardView(db, raw)`（`wizardPort.ts:115-146`）
- 参数（`raw`）：`date`（缺省 `todayISO()`）／`note`／13 个 camel 字段 ——
  `chestCm waistCm abdomenCm hipCm shoulderCm leftThighCm rightThighCm leftCalfCm rightCalfCm leftArmCm rightArmCm leftForearmCm rightForearmCm`／`key`（透传忽略）
- camel → 字段名的镜像表 `WIZARD_MEASURE_CAMEL`（`wizardPort.ts:53-57`），与 `cli/write.ts MEASURE_CAMEL` 同集；未知参数抛 `fail(2) '不支持字段: '`（`wizardPort.ts:116-120`）
- 数据库：`listMeasurements(db, {days:36500, limit:1})` → `recent {date, values}`（`wizardPort.ts:133-143`），try/catch 包住，空库记 `null`
- 视图字段 `MeasureWizardView{ date, note, filled[{camel,snake,label,value}], filledCount, recent, prompt }`（`wizardPort.ts:93-100`）

**体脂页** `buildCompositionWizardView(db, raw)`（`wizardPort.ts:194-241`）
- 参数：`date/source/bodyFatPct/age/sex/note` ＋ 皮褶 7 点 `caliper_chest_mm caliper_abdominal_mm caliper_thigh_mm caliper_tricep_mm caliper_subscapular_mm caliper_suprailiac_mm caliper_midaxillary_mm`（`CALIPER_FIELDS`，`fetch/body.ts`）
- `source` 走中文别名归一 `SOURCE_ALIASES`（`wizardPort.ts:77-80`），非法抛 `参数 source 非法`
- 数据库：`listCompositions(db, {limit:1})` → recent

**身材照页** `buildPhotoLogWizardView(raw)`（`wizardPort.ts:279-290`）——**纯参数，不读数据库**（`wizardPort.ts:10` 注释：老家 `render_body_photo_log_wizard.py` 无数据源）
- 参数：`srcPaths`（数组，至多 20 张）／`tag`（至多 20 字）／`note`；别名 `srcPath`
- 标签候选 `PHOTO_LOG_TAGS`（`wizardPort.ts:246`）

**GIF 框选器** `buildGifPlannerView(db, params, dir)`（`wizardPort.ts:394-456`）
- 参数：`tag/duration/loop/width/height/watermark/transition/output/crops`（crops 是每张 4 个数字坐标）
- 数据库：`listPhotos(tag, 365 天窗)`，文件只做文件名引用，永不内嵌二进制（`wizardPort.ts:11-12`）

## 3. 页面怎么装配 ／ 产物是完整文档还是片段 ← 最关键

**装配路径**（`src/render/wizardPortDocs.ts`）：
`build*WizardDoc(v)` → `assemble()`（49-61）→ `renderPageShell({title,eyebrow,subtitle,content})` 填 `<!--CONTENT-->` → `fillTemplate({template: DOC_SHELL, assets:{sharedCssText, sharedHelpersJs}, content})` → `.html`

- `DOC_SHELL`（`wizardPortDocs.ts:41-45`）是**整篇模板**，不是片段：
  ```
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>卡路里·配置向导</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n' +
  '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n</body>\n</html>'
  ```
- `assemble` 的两个资产（`wizardPortDocs.ts:56-60`）：
  - `sharedCssText = buildStyleSheet().css + '\n' + blocksCss()`（共享样式 ＋ 12 区区块样式；`wizardPortDocs.ts:4` 注释说「不走 extraCss」）
  - `sharedHelpersJs = buildSharedHelpersJs()`（共享复制双通道 ＋ toast ＋ 委派 ＋ 回顶）
- 区块全部来自 `base-paint/blocks`（`wizardPortDocs.ts:13-23`）：`renderPageShell`／`renderKpiGrid`／`renderDisclosure`／`renderParamForm`／`renderPreBlock`／`renderCopyBlock`／`renderDataTable`／`renderEmptyBlock`

**实跑证据（我跑的，非推测）**：
```
node packages/skill-calorie/dist/cli/cmd_read.js calorie.view.measure-wizard \
  --params '{"waistCm":80,"date":"2026-09-07","note":"早上空腹"}' --output <tmp>\measure.html
```
- `exit 0`；stdout 即上文那个 envelope
- `--output` 文件存在，**54043 字符 / 55412 字节**
- **首 380 字符逐字**：`<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>卡路里·配置向导</title>\n<style>/* base-paint 共享样式资产 · ilife-base · v0.1.0 */…`
- **尾 160 字符逐字**：`…if (document.body) boot();\n  else document.addEventListener("DOMContentLoaded", boot);\n}());</script>\n</body>\n</html>`
- 页内有 `<style>`（真）与 `<script>`（真）；残留 `<!--` 标记：无
- 直接调 `dispatch('calorie.view.measure-wizard', {…}, db)` 返回的 `html` 同样以 `<!doctype html>` 开头

**结论：产物是完整文档，不是片段。** 「能打开」的验收口径可以写「拿绝对路径直接双击能开、有样式、有复制按钮」，不需要再套页面模板。

测试也钉了这一条：`test/wizard-86.test.mjs:54-58` 的 `assertDoc` = `startsWith('<!doctype html>')` ＋ 无 `<!--` ＋ 含 `ilife-page` ＋ 含 `<style>` ＋ 含 `<script>`。

## 4. prompt 与复制区

**prompt 从哪来**：页面层 `wizardPort.ts` 里由 `build*WizardPrompt(...)` 逐字生成，写进视图的 `prompt` 字段（`MeasureWizardView.prompt`、`CompositionWizardView.prompt`、`PhotoLogWizardView.prompt`、`GifPlannerView.prompt`）。

**两类口径**（`wizardPort.ts:15-21` 注释）：
- **参数式**（围度／体脂）：`buildMeasureWizardPrompt`（102-113）产出
  `请帮我记录围度到卡路里\n\n参数:\n- 日期:2026-09-07\n- 围度(1 项 / 共 13):\n  上身: 腰围 80cm`
  ——**没有命令段**，老家即无，复制给 AI 后由 AI 自己调会改数据库的命令。空表时返回 `// 请至少填 1 个围度（13 项分 3 组，至少 1 项）`。
- **参数＋命令段**（身材照／GIF）：`buildPhotoLogWizardPrompt`（269-277）产出参数段后再加一段逐字如下（三层引用号只是这里为了不打断 markdown 代码围栏，源文件里是三个反引号）：

  命令: ／ 围栏 `bash` ／ `calorie-cmd-read calorie.photo.add --params '{…}'` ／ 围栏收口 ／ `完成后返回写库回执。`

  空表时返回 `// 请先填照片文件路径（srcPaths，至多 20 张）`；缺 tag 时返回 `// 请填 tag（建议：正面/背面/侧面，同一类用同一 tag）`。

**页面把复制区摆在哪**（`wizardPortDocs.ts`）：
- `promptCopy(prompt)`（78-80）= `renderPreBlock({ label: '复制 prompt（必走）', command: prompt })` ＋ `copyActionHtml(prompt)`
- `copyActionHtml` 来自 `src/render/copy.ts`，走共享双通道运行时（`navigator.clipboard` 优先、失败落 `execCommand` 兜底），页面内**零内联 JS**
- 另有 `copyBlock`（72-75）出「复制数据」块，投影 envelope 的 stat metrics（`buildDataText`）

**「确认后该跑哪条命令」摆在哪**：只以「复制 prompt（必走）」那个预格式块出现。命令文本写在 prompt 正文里（身材照／GIF），或完全不给命令（围度／体脂）。页面**不绑定命令**——确认后跑哪条由 AI 依 prompt 与技能约定自己选。表单是静态 `renderParamForm`（label＋input，无 select，零 JS），注释 9-10 行说明行为归宿主。

## 5. 测试怎么钉

`test/wizard-86.test.mjs`（249 行，9 个 test）。可复用断言模式：

1. **结构**（54-58）：`assertDoc(html, what)` —— doctype／无 `<!--`／`ilife-page`／`<style>`／`<script>`
2. **词→命令一致**（68-82）：`routesFor(word)` 取首个 exec，`hit.key === key`；`hit.cli` 以 `'calorie-cmd-read ' + key` 开头；`CALORIE_COMBOS[key]` 存在且 `shape === 'stat'`
3. **视图校验**（100-101、142、145、163、195-196）：未知参数 `assert.throws(..., /不支持字段/)`；非法取值抛对应文案（`/非法/`、`/source 非法/`、`/至多 20/`、`/transition/`、`/x2>x1/`）
4. **字段口径防漂移**（107-119）：`WIZARD_MEASURE_CAMEL` 与 `fetch/body.ts MEASUREMENT_FIELDS` 同集；`CALIPER_FIELDS.length === 7`
5. **空库不抛**（202-209）：四条命令在空库均可开页
6. **CLI 端到端落盘**（215-239）：`spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params), '--output', outPath], {env:{SKILLS_DB_PATH:dir}})` → `status === 0`、envelope `key`／`shape`、读出文件含 `data-action-id` 与 `data-t=`、`existsSync(outPath)`
7. **复制只走共享双通道**（241-250）：无 `onclick`、无 `window.copyText(`、有 `data-action-id`

**落盘名模式**：`key.replace(/\./g, '_') + '.html'`（228）。
**关于绝对路径**：测试**没有**断言绝对路径——`--output` 是测试自己传的 tmp 路径，`existsSync` 只验证落了盘。绝对路径回执由 CLI 的 `delivery.path` 给出（实跑见 §3，回显 `C:\\Users\\…\\Temp\\t163-wChjDC\\measure.html`）。

## 6. 落到场景 07 的最小改动集

**场景 07 现状**（`src/triggers/scene-07-profile.ts`，4 条词）：

| 唤醒词 | 现有命令 | `output_type` | 现有页面模板 |
| --- | --- | --- | --- |
| 设置档案 | `calorie.profile.set` | `receipt` | `templates/crud_receipt.html` |
| 设活动量 | `calorie.profile.activity` | `receipt` | `templates/crud_receipt.html` |
| 改档案 | `calorie.profile.update` | `receipt` | `templates/crud_receipt.html` |
| 查档案 | （老 python `render_crud_view.py`） | `result` | `templates/crud_view.html` |

**有没有现成命令可以直接复用** —— 有：
- **三条会改数据库的命令已经存在**：`src/cli/keys.ts:44-46`，都是 `receipt` 形。**不需要新增会改数据库的命令**；预检确认页只管「填表→复制 prompt」，写仍由这三条承接（与围度页同形：围度页的写由 `calorie.body.measure-add` 承接）。
- **`查档案` 有现成的查询命令**：`calorie.view.profile`（`keys.ts:107`，`cmd_read.ts:1014` → `buildProfileView(db)` ＋ `renderProfileHtml(v)`），路由里已有「看档案视图」`routing.ts:648`。结果型交付可改指向它。
- **装配件全是公共层**：`assemble`／`DOC_SHELL`／`fillTemplate`／`renderParamForm`／`renderPreBlock`／`copyActionHtml`，零新增。

**最小改动集**（按依赖顺序）：
1. `src/render/profilePort.ts`（新）：`buildProfileWizardView(db, raw)` ＋ `buildProfileWizardPrompt(...)` —— 照 `wizardPort.ts` 围度那一段（93-146）抄。参数 `heightCm/age/gender/activityLevel/note`；读档案表拿现值做「改前值」。未知参数抛 `fail(2) '不支持字段: '`。
2. `src/render/profilePortDocs.ts`（新）：`buildProfileWizardDoc(v)` —— 照 `wizardPortDocs.ts:133-151` 的 `buildMeasureWizardDoc` 抄（`assemble` ＋ `promptCopy` ＋ `copyBlock`）。
3. `src/cli/cmd_read.ts`：新增 1 个 case，照 545-551 行（取视图 → `nums(metrics)` → `{data:{metrics}, html}`）。
4. `src/cli/keys.ts`：追加 1 条 → `CALORIE_COMBOS` 由 99 变 100。
5. `src/triggers/routing.ts`：`NEW_KEY_ROUTES` 追加 1 条，照 671-674。
6. `packages/base-combos/combos.yaml`：镜像 1 条，照 306-310。
7. `SKILL.md`：命令表加 1 行；**改 71 行**那段过期的 fallback 说明。
8. 新测试 `test/wizard-profile-07.test.mjs`，照 §5 的 7 类断言抄。
9. **要动的被钉死的测试**：`Object.keys(CALORIE_COMBOS).length === 99` 硬钉在 **6 个文件** —— `cmd-read-t11.test.mjs:80`、`cmd-write-40.test.mjs:72`、`output-naming-119.test.mjs:56`、`output-naming-87.test.mjs:111`、`render-t41.test.mjs:71`、`skill-t11.test.mjs:52`。每加一条命令这些数字都要 +1。`output-naming-87.test.mjs:124-137` 还会逐条比对 `combos.yaml` 的 `title` 与 `keys.ts` 同值。`skill-t11.test.mjs:53` 要求每条命令都出现在 `SKILL.md` 里。

**1 条命令还是 3 条命令**：三条写入词可共用一个预检确认页（差别只在预填哪些字段）。3 条命令要多改 3 处计数、3 条 combos 镜像、3 行 `SKILL.md`。**建议先只加 1 条**（如 `calorie.view.profile-wizard`），三条唤醒词的路由都指向它，预填内容靠参数区分。

## 7. HELP 资产与查找路径

**`output_type` 现在对这几条词写的是什么**：`output_type` **不在** `wake-assets.ts` —— 它在 SoT 的 `scene-*.ts` 里，类型定义在 `src/triggers/types.ts:28,51`（`'process' | 'result' | 'receipt'`）。`wake-assets.ts` 里对应的字段叫 `types?: readonly WakeSceneType[]`，取值是中文 `'结果' | '回执' | '过程'`。两边实测一致：

| 唤醒词 | SoT `output_type` | `wake-assets.types` |
| --- | --- | --- |
| 设置档案 | `receipt` | `["回执"]` |
| 设活动量 | `receipt` | `["回执"]` |
| 改档案 | `receipt` | `["回执"]` |
| 查档案 | `result` | `["结果"]` |

→ **三条写入词现在都是回执型，不是过程型**。地图目标是「写类流程先出过程型 HTML」，这正是要改的地方。

**`process` 那 6 条分别是谁**（实测：436 条全量里 414 条有 `types`、22 条 legacy 无此字段；`types` 含 `过程` 的正好 6 条）：

| # | 资产 id | 唤醒词 |
| --- | --- | --- |
| 1 | `diet_scan_label` | 拍营养表记一餐 |
| 2 | `diet_scan_label_date` | 拍营养表补记一餐 |
| 3 | `food_batch_import` | 批量导入食品 |
| 4 | `plan_execute` | 落地训练 |
| 5 | `plan_execute_weekend` | 落地到本周末 |
| 6 | `plan_execute_month` | 落地到本月底 |

**`calorie.help.lookup` 回的是哪份字段** —— 取的是 **`main_prompt.cli`**，不是 `data_source`：
- `src/cli/cmd_read.ts:839-842`：`case 'calorie.help.lookup'` → `searchHelp(TRIGGERS, q)`
- `src/triggers/help-lookup.ts:131`：`cli: execCliFor(key, t.main_prompt.cli)`
- `buildHelpLookup` 同取 `main_prompt.cli`（`help-lookup.ts:38`）
- `execCliFor`（`help-lookup.ts:100-104`）：已是 `calorie-cmd-read calorie.` 开头就直接用；否则查 `HELP_EXEC_OVERRIDES`（74-98，23 条）；都没有就原样返回老命令。`profile_view` **不在**覆盖表里 → 原样返回老 python。
- 场景 07 的 `查档案` 里 `data_source` 与 `main_prompt.cli` **是同一串老 python 命令**（`scene-07-profile.ts:8`），所以红队实跑结果两边都能解释；但取数字段确凿是 `main_prompt.cli`。

**多少条词会受影响**（在进程内遍历 436 条 SoT 算出；**没有跑 436 次 CLI**）：
- 436 条唤醒词资产，434 个不同的唤醒词
- `main_prompt.cli` 不是 `calorie-cmd-read calorie.` 开头的：**376 条**
- 其中被 `HELP_EXEC_OVERRIDES` 换回可执行的：**23 条**
- 因此仍会回显老命令的：**353 条**
- 按唤醒词查：首命中可执行的 **94 个词**；首命中仍是老命令的 **340 个词**
- 场景 07 四条里只有 `查档案` 中招（另三条的 `main_prompt.cli` 已是 `calorie-cmd-read calorie.profile.*`）

## 不确定／待核实

- `SKILL.md:71` 那段 fallback 是否已由 #86 落地后回引 —— 我读到的是原样未改（**推测**交付票要动它）。
- `calorie.view.profile` 是否**完全**覆盖 `查档案` 的 `data_fields`（`height_cm/age/gender/activity_level/activity_factor/weight_kg/bmi/bmr/tdee`）—— 我只确认了 `buildProfileView(db)` 与 metrics 里的 `age/heightCm/hasGoal/latestWeightKg/calorieGoal`，**没逐字段核**（**推测**有缺，交付票需核）。
- 「prompt 里要求先问／先确认」那条老约定的新形态：页面 prompt 本身**不含**「先问我」字样（我读到的 `buildMeasureWizardPrompt` 只有参数段），是先问的时机改由 `SKILL.md` 的 M6 铁则承担 —— 需要交付票确认这个分工（**推测**）。

---

**本次留下的探针脚本**：`.scratch/t163-probe.mjs`（复现 §3 的实跑证据，可重跑）。
