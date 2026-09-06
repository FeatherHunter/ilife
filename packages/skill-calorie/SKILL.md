# 卡路里（calorie）SKILL

饮食/体重/运动/身体/目标/照片/分析/复盘一期全量：13 表（终态 11 张持久表）+ 10 场景 436 唤醒词 + 取数/口径/渲染全 TS。唯一出口 `calorie-cmd-read <calorie.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'
calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'
calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'
calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'
```

## 唯一出口（T11）

- 二进制：`packages/skill-calorie/dist/cli/cmd_read.js`（bin `calorie-cmd-read`），纯 CLI 单轨，无面板/定时/外联动。
- 契约：P9 冻结 argv+JSON+exit；缺 key exit 2、未知 key exit 3、取数/缺失 exit 4、envelope/渲染/落盘 exit 5、预检 exit 1。
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；`--html` 显式落盘 utf8。
- 预检：engines>=22.13 + SKILLS_DB_PATH 必设（无默认值）；照片存在位需 CALORIE_PHOTOS_DIR，否则记 null 不断言。

## envelope 全字段

- 版本 `0.1.0`（与 link-core/render 同值，漂移单测钉死）；形状 6 种全字段校验，缺字段即抛，不返空数组冒充正常。
- `list` 须 `items[]`（`total?`）；`detail` 须 `item{}`；`stat` 须 `metrics{number}` 全有限 number；`receipt` 须 `ok/message`；`analysis` 须非空 `summary`；`fallback` 须 `reason/degraded:true`。
- 组合键 registry 合法点式（下划线→点）：`calorie.view.home` 等 24 键（见下表）；内部 `VIEW_KEYS` 下划线键仅渲染层复用，不直接登记。

## 口径（T7 + 精度 + 餐别）

- 餐别窗口跟 `fetch/diet.ts MEAL_WINDOWS`（15 点=下午茶，老家旧口径作废）；加餐=下午茶+夜宵；数列唯一源 T5 `buildSeries`，不自造 SUM。
- 缺口=消耗−摄入（正=缺口），消耗=TDEE+当日运动；KCAL_PER_KG=7700；目标完成带 80%~120%。
- 数值公约 round2 入库前收敛，`-141.6550000000002` 类泄漏由 `findLeaks/assertNoLeak` 拦截；模板不再做数学（bar 0~100 钳位为纯展示裁剪）。
- 缺失阻断不返空：空库/空窗/无目标一律 `missing-data`（调用方走 fallback，不静默空页）；坏输入 `bad-input`；精度泄漏 `precision-leak`。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 记身材照 | calorie.help.center | list | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 看今日主页 | calorie.help.lookup | list | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 查热量历史 | calorie.history | list | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 对比两张照片 | calorie.photo.compare | list | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 查身材照 | calorie.photo.detail | detail | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 做身材照GIF | calorie.photo.gif | analysis | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 看身材照 | calorie.photo.list | list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 看今日饮食概览 | calorie.today | list | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| 看体重 vs 摄入(最近 7 天) | calorie.view.combined | stat | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 看热量缺口 | calorie.view.deficit | stat | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日饮食概览 | calorie.view.diet | stat | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 今日复盘 | calorie.view.diet-review | stat | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日运动概览 | calorie.view.exercise | stat | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-07"}'` |
| 看今日目标进度 | calorie.view.goal | stat | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 定营养目标 | calorie.view.goal-config | stat | `calorie-cmd-read calorie.view.goal-config` |
| 看今日目标进度 | calorie.view.goal-progress | stat | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 定营养目标(自动算) | calorie.view.goal-recommend | stat | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |
| 看目标状态 | calorie.view.goal-status | stat | `calorie-cmd-read calorie.view.goal-status` |
| 定体重目标 | calorie.view.goal-weight | stat | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 看健康盘 | calorie.view.health | stat | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日主页 | calorie.view.home | stat | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 查食品库 | calorie.view.library | stat | `calorie-cmd-read calorie.view.library` |
| 查高热量排行 | calorie.view.ranking | stat | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 查食品 | calorie.view.search | stat | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |

相关场景：calorie.help.center、calorie.help.lookup、calorie.history、calorie.photo.compare、calorie.photo.detail、calorie.photo.gif、calorie.photo.list、calorie.today、calorie.view.combined、calorie.view.deficit、calorie.view.diet、calorie.view.diet-review、calorie.view.exercise、calorie.view.goal、calorie.view.goal-config、calorie.view.goal-progress、calorie.view.goal-recommend、calorie.view.goal-status、calorie.view.goal-weight、calorie.view.health、calorie.view.home、calorie.view.library、calorie.view.ranking、calorie.view.search（24 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。
身材照片 HELP 模块：@feather_wch/skill-calorie/dist/render/photo.js（gallery/compare/viewer/gif + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。
<!-- HELP-AUTO-END -->

## HELP 现找条目（含 T10 身体照片 HELP 模块）

- 通用唤醒词现找：`calorie.help.lookup --params '{"q":"<唤醒词/分类/描述子串>"}'`（436 唤醒词全量，10 场景，空串抛，不返全表冒充命中）。
- 身材照片 HELP：`calorie.help.center`（全量 10 键，顺序跟 SCENE_09_PHOTO SoT 序）/ `--params '{"q":"记身材照"}'` 现找；每条命中自带 `exec`（node 一行式，读 SKILLS_DB_PATH 库）+`legacyCli`（老家 python 原命令备查）；模块 `@feather_wch/skill-calorie/dist/render/photo.js`，函数须存在（单测逐条 import 断言）。
- 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64；GIF 只出任务描述不碰二进制。

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ CALORIE_PHOTOS_DIR（照片存在位校验用，缺则记 null）；真实 DB 禁迁，测试 tmp 隔离；老家只读对照。
- 出 scope（一期外）：面板（二期单 MAP）、定时任务、本技能外联动（router+作息/备忘/训记仅只读对照，不落本包）。
