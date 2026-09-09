# #119 动态段与后缀段复刻（M10 残项）· 实施证据

票面：GitHub issue #119《输出命名动态段与后缀复刻（M10 残项）》（wayfinder 地图 #63 子票）。
前置：#100／#102／#103 全关（串行取票，落点同文件 `cmd_read.ts` 唯一出口）。
实施人：t119（单 session 端到端；认领 FeatherHunter）。

独占写路径：`packages/skill-calorie/src/output.ts`、`packages/skill-calorie/src/cli/cmd_read.ts`、
`packages/skill-calorie/test/output-naming-119.test.mjs`、`.changeset/calorie-output-naming-119.md`、本文件。
旧版真值（只读）：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`、`_cmd_maps.py`、
`render_food_ranking.py`、`render_weight_receipt.py`、`render_crud_receipt.py`、
`render_exercise_receipt.py`、`render_body_photo_receipt.py`、`render_goal_weight.py`。
符号锚（禁 `file:line`）：`sceneTypeFor`／`OUTPUT_TYPE_LABELS`／`LEGACY_COMMAND_OVERRIDES`／
`DYNAMIC_COMMAND_SEGMENTS`／`dynamicSegmentFor`／`writeSuffixFor`／`resolveDefaultHtmlPath`（段拼接）／
`cmd_read.ts` 落点解析段。

## 0. 结论

- 新默认命名：`<覆盖|title>[_回执][_动态段][_内容标识]_<YYYYMMDD>_<HHMMSS>[_N].html`，
  旧 `html_scene_path()` 类型段（写键 `_回执`）＋ `_cmd_maps.py` 动态段 ＋ `html_name(suffix=)` 内容标识段。
- 验收三项全过：35/77 键对照表（本文件 §1）／同秒六榜单可区分（用例 `#119 ⑦`）／
  回传 `data.output` 与盘上名逐字节一致（用例 `#119 ⑥⑦⑧`，含 emoji／截断边界）。
- 门禁：`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` exit 0；
  本票 9/9 绿；`#87` 14/14 回归绿；`skill-calorie` 全包 186/186 绿；
  全量 `pnpm test` 失败集 delta 新增 0（§3）。

## 1. 全量对照表：35 写键 键 → 期望文件名（`<TS>` = `YYYYMMDD_HHMMSS`）

`舊场景` = 旧 render 脚本的 `cmd_name`／`scene`；`舊suffix` = 旧 `file_suffix` 口径；
`新文件名` = 本票实现（含 `LEGACY_COMMAND_OVERRIDES` 覆盖与 `writeSuffixFor` params 派生）；
`Δ` = 与旧版的有意差（base 统一取新架构 `title`＝#87 真值结论；suffix 纯 params 派生，不读库）。

| # | 新键（title） | 旧场景／旧 type | 旧 suffix | 新文件名模式 | Δ |
| --- | --- | --- | --- | --- | --- |
| 1 | diet.add（记一餐） | 记一餐／receipt | 食物名（#49） | `记一餐_回执_<foodName>_<TS>.html` | 无 |
| 2 | diet.update（改饮食） | 改饮食记录／receipt | 改后名（#266 Q4A） | `改饮食_回执_[<foodName>]_<TS>.html` | base 差"记录"；suffix 仅改名时带 |
| 3 | diet.remove（删饮食） | 删饮食记录／receipt | 被删名（#266 Q4A） | `删饮食_回执_<TS>.html` | base 差；suffix 残留（需读库，见 §2 R1） |
| 4 | diet.batch（批量记饮食） | 批量补记饮食／receipt | 首食物等N项（#266 Q1A） | `批量记饮食_回执_[<首食物等N项>]_<TS>.html` | base 差"补" |
| 5 | diet.copy（复制饮食） | 复制昨日饮食／receipt | 源日期（#266 Q2A） | `复制饮食_回执_<from去横线>_<TS>.html` | base 差"昨日"；from 缺省昨日语义保留 |
| 6 | diet.update-by-date（按日改饮食） | 改某日饮食／receipt | 目标日期 | `按日改饮食_回执_<date去横线>_<TS>.html` | base 差（旧"改某日饮食"） |
| 7 | diet.remove-by-date（按日删饮食） | 删某日饮食／receipt | 目标日期 | `按日删饮食_回执_<date去横线>_<TS>.html` | base 差 |
| 8 | diet.remove-by-range（按范围删饮食） | 批量删饮食／receipt | 起止范围 | `按范围删饮食_回执_<起止>_<TS>.html` | base 差 |
| 9 | diet.remove-by-type（按餐别删饮食） | 删一餐／receipt | 日期＋餐别 | `按餐别删饮食_回执_<date去横线><mealType>_<TS>.html` | base 差 |
| 10 | water.log（记喝水） | 记喝水／receipt | 毫升（#284 Q1A） | `记喝水_回执_<ml>ml_<TS>.html` | 无 |
| 11 | weight.log（记体重） | 记体重／补录体重／记体重（含备注）／receipt | 体重值 format g（#286） | `记体重_回执_<kg>kg_<TS>.html` | 三场景变体合一（date/note 不再改场景名） |
| 12 | weight.update（改体重） | 改体重记录／receipt | 日期（#284 Q3A） | `改体重_回执_[<date去横线>\|<kg>kg]_<TS>.html` | base 差；id 改 suffix 残留（§2 R1） |
| 13 | weight.remove（删体重） | 删体重记录／删某日体重／批量删体重／receipt | 日期维度（#284 Q3A） | `删体重_回执_[<date去横线>\|<起止>]_<TS>.html` | 三场景合一；id 删 suffix 残留（§2 R1） |
| 14 | weight.batch（批量记体重） | 批量补录体重／receipt | 首kg等N项（#286） | `批量记体重_回执_[<首kg等N项>]_<TS>.html` | base 差"补" |
| 15 | exercise.add（记运动） | 记运动／记力量训练／记日常活动／补记运动／批量补记运动／复制昨日运动／receipt | 运动类型／首项／源日期 | 单 `记运动_回执_<type>_<TS>`；批量 `记运动_回执_<首type等N项>_<TS>`；copyFrom 无 suffix | 新分发三场景（记运动／批量补记运动／复制昨日运动）对齐旧六场景子集；copy 源日期残留（§2 R1） |
| 16 | exercise.update（改运动） | 改运动记录／改某日运动／receipt | 改后名／日期 | `改运动_回执_[<date去横线>\|<type>]_<TS>.html` | base 差；改后名需读库残留（§2 R1） |
| 17 | exercise.remove（删运动） | 删运动记录／删某日运动／批量删运动／receipt | 被删名／日期／起止 | `删运动_回执_[<date去横线>\|<起止>]_<TS>.html` | base 差；id 删残留（§2 R1） |
| 18 | photo.add（记身材照） | 身材照片回执系／receipt | tag／首项／日期 | `记身材照_回执_[<tag>]_<TS>.html` | suffix 取 tag 子集（旧多源，见 §2 R2） |
| 19 | photo.remove（删身材照） | 删身材照／receipt | 日期系 | `删身材照_回执_<TS>.html` | suffix 残留（§2 R1） |
| 20 | photo.tag（改照片标签） | 改／加／删照片标签／receipt | 标签 '、' 拼接 | `改照片标签_回执_[<tags>]_<TS>.html`（set 取全量 tags，add/remove 取 tag） | 无（场景名新旧一致） |
| 21 | product.add（存食品） | 存食品／receipt | 食品名（#284 Q2A） | `存食品_回执_<productName>_<TS>.html` | 无 |
| 22 | product.update（改食品） | 改食品／receipt | 改后名／原名兜底（#284 Q2A） | `改食品_回执_[<productName>]_<TS>.html` | 原名兜底需读库残留（§2 R1） |
| 23 | product.deprecate（下架食品） | 下架食品／receipt | 食品名（#284 Q2A） | `下架食品_回执_<TS>.html` | suffix 残留（§2 R1） |
| 24 | profile.set（设置档案） | 设置档案／receipt | 无 | `设置档案_回执_<TS>.html` | 无 |
| 25 | profile.activity（设活动量） | 设活动量／receipt | 无 | `设活动量_回执_<TS>.html` | 无 |
| 26 | profile.update（改档案） | 改档案／receipt | 无 | `改档案_回执_<TS>.html` | 无 |
| 27 | goal.set（定营养目标） | 定营养目标／改营养目标／一键定全套目标系／receipt | 无 | `定营养目标_回执_<TS>.html` | 旧多场景按模式细分，新统一 title（§2 R3） |
| 28 | goal.water（定饮水目标） | 定饮水目标／receipt | 无 | `定饮水目标_回执_<TS>.html` | 无 |
| 29 | goal.weight（定体重目标） | 定体重目标系（basic/auto_deadline/with_start/modify）／receipt | 无 | `定体重目标_回执_<TS>.html` | 旧四场景合一（§2 R3） |
| 30 | goal.pause（暂停目标） | 暂停所有目标／receipt | 无 | `暂停目标_回执_<TS>.html` | base 差"所有"（title 真值） |
| 31 | goal.resume（重启目标） | 重启所有目标／receipt | 无 | `重启目标_回执_<TS>.html` | base 差"所有" |
| 32 | body.composition-add（记体脂） | 体脂向导（`html_path` 无类型段）系 | 无 | `记体脂_回执_<TS>.html` | 旧向导流无 `_回执`；新按"写键一律回执"统一（§2 R3） |
| 33 | body.composition-remove（删体脂） | 删体脂／receipt | 日期 | `删体脂_回执_<TS>.html` | suffix 残留（§2 R1） |
| 34 | body.measure-add（记围度） | 围度向导（`html_path` 无类型段）系 | 无 | `记围度_回执_<TS>.html` | 同 #32（§2 R3） |
| 35 | body.measure-remove（删围度） | 删围度（`render_body_delete_receipt`）／receipt | 日期 | `删围度_回执_<TS>.html` | suffix 残留（§2 R1） |

动态视图键（非 receipt，无类型段，有动态段／suffix）：

| 新键（title） | 旧命名 | 新文件名模式 |
| --- | --- | --- |
| view.ranking（食品排行） | `食物排行_全部`／`食物排行_<高热量/低热量/常吃/高碳水/高蛋白>`（`html_path` 无类型段） | `食物排行_<全部/高热量/低热量/常吃/高碳水/高蛋白>_<TS>.html`（`LEGACY_COMMAND_OVERRIDES` 覆盖一字之差；缺省 category→`全部`；未知值不加段） |
| view.contraindication（禁忌扫描） | `禁忌报告_<腰/膝/肩/全部>`（`html_path`） | `禁忌扫描_<腰/膝/肩/全部>_<TS>.html`（base 取 title；动态表逐字复刻 `CONTRAINDICATION_PART_MAP`） |
| photo.gif（生成GIF） | `身材照GIF规划器_<ids/tag_n>`（`html_path`） | `生成GIF_[<tag>]_<TS>.html`（analysis 形无类型段；suffix 取 tag，数量需读库残留） |

## 2. 残留（诚实记账，不阻塞验收）

- R1 suffix 需写后回执／读库：删饮食／id 改体重／id 删体重／删身材照／改食品原名兜底／下架食品／
  删体脂／删围度／运动 copy 源日期／改运动改后名——旧从回执 `new_record`／`old_record` 取，
  新 `writeSuffixFor` 纯 params 派生（落点解析不读库：`cmd_read.ts` 落点段在写库前后均可调用，
  且失败路径 `fail(5)` 要求解析本身不抛），一律返回 ''。如需补齐，须把落点计算移到写库后并消费回执。
- R2 photo.add suffix 取 tag 子集：旧 `render_body_photo_receipt.py` 按操作取首项／日期／标签拼接；
  新 `photo.add` 固定 tag。
- R3 场景合并：goal.set／goal.weight／body.add 系旧多场景（模式／向导流）合一到新 title；
  base 一律取注册表 title（#87 真值结论），不再逐场景分叉文件名。
- R4 未收录动态表：体重历史（旧日期驱动场景名 `看本周体重` 等，新分发无对应参数）、
  运动汇总 mode、饮食复盘 type——新分发已合并，旧映射无歧义对应，维持 title、无段。
- R5 `docs/research/t87-mutation-evidence.mjs` M5 变异的 `from` 字串锚定 #119 前落点行，
  本票改行后重跑需刷新锚（#87 已关，变异为一次性证据，非门禁；本票不碰他票路径）。

## 3. 门禁与 delta

- `pnpm build` exit 0；`node tooling/check-boundaries.mjs` PASS；
  `node tooling/write-snapshot.mjs --check`（实际拉取版一致）；`pnpm publish:pre` PASS。
- `node --test packages/skill-calorie/test/output-naming-119.test.mjs`：9/9 绿。
- `node --test packages/skill-calorie/test/output-naming-87.test.mjs`：14/14 绿（无回归）。
- `node --test packages/skill-calorie/test/*.test.mjs`：186/186 绿。
- 全量 `pnpm test`：并行满载下出现 spawn 超时类失败（`SyntaxError: Unexpected end of JSON input`，
  1.3–1.5s 超时杀，波及未改动的 bill/chef/home/memo/schedule 包同征）；
  隔离复跑 `plugin-calorie smoke` 10/10、`plugin-chef+bill smoke` 7/7 全绿——
  失败集按名与冻结基线 `.scratch/t75/baseline-failing.txt`（21 条）比对，**delta 新增 0**，
  本票路径（`output-naming-119`）失败 0 条。日志 `.scratch/t119-fulltest.log`（施工草稿，gitignore）。

## 4. 风险（top2）

1. 默认文件名变长／变化（35 写键新增 `_回执` 段，ranking 改一字）：依赖旧名 grep 的外部脚本需更新；
   缓解：`--output` 显式覆盖不受命名管线影响（用例 `#119 ⑧` 覆盖）。
2. R1 类 suffix 缺失时同秒同键仍靠 `_2.._N` 兜底（语义不可区分但不覆盖，计数大小写不敏感已由 #87 保证）。
