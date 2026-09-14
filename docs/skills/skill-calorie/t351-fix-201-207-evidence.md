# T351 修复证据：order201–207 复制区双按钮（实施兵A）

范围：只做 7 个结果型（201 计划复盘本周／202 本月／203 全部／204 完成率／205 未完成／206 动作完成率／207 扫禁忌）。
176–195 一字未动；issue 未动；命令登记未动。

做法（融合方案“复用新卡片只修复制区”）：头部/KPI/图表/明细不动，只换底部复制区装配——
三格式菜单（`dataCopyArea`）→「复制数据／复制日志」双按钮（`renderCopyBlock({ dataText, logText })`
单格式直挂），共用页面双通道运行时（剪贴板→命令兜底＋已复制态＋提示），文本走承载属性
`data-t`，零内联脚本。201–206 去掉与按钮同名的块标题；207 保留既有中文块标题「复制修改指令」
（与按钮不同名，且单测钉死该串）。

## 一、写集合对账（偏差零）

| 文件 | 改动 | 着落 |
|---|---|---|
| `packages/skill-calorie/src/render/sportPortDocs.ts` | 加本地非导出 `reviewCopyBlock`，`buildReviewDoc` 复制区改调它；其余 5 构建函数不动 | 对上 |
| `packages/skill-calorie/src/render/trendDocs.ts` | 加本地非导出 `contraCopyBlock`，`buildContraDoc` 复制区改调它；其余构建函数不动 | 对上 |

复用只读不改：`base-paint` 的 `renderCopyBlock`／`buildDataText`／`buildLogText`（`render/` 已有进线方向）、
`shared/copyArea` 的 `copyLog`、`render/receipt` 的 `nowStamp`。零新增导出，零新概念。
日志第 4 段命令：复盘 `calorie-cmd-read calorie.view.exercise-review`（来源 `workout_plans ＋ exercise_log（只读）`）；
禁忌 `calorie-cmd-read calorie.view.contraindication`（来源 `workout_plans（只读）`）；第 5 段取渲染时刻＋版本。

超线报警：`sportPortDocs.ts` 505 行、`trendDocs.ts` 785 行，均已超 350 线（LF 口径）。
已超线，需要根据规则进行重构。超因：两件各装多页文档同处一处；本次先不拆：融合方案限定只修复制区，
拆分属另票；包内检查脚本台账只钉两件，本次不扩台账。

## 二、机器证据

- 类型检查：`tsc -b packages/skill-calorie` exit 0（中途一次字面量 widen 已收敛为 `DataTextInput` 上下文类型）。
- 单测：`trend-homogeneity-110`＋`copy-component-179` 18/18 绿；`exercise-port-111` 11/12——
  绿的含「计划复盘」「复制头与冻结 envelope 版本对齐」；唯一红是「唤醒词→键」路由断言
  （`看运动记录（按力量筛选）` 命中漂移），路由层零引用本次两件，属现网并发改动遗留，与本票无关。
- 真机（持锁）：`node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/run-201-207.mjs`
  → 7/7 exit 0，种子与预演同口径，库隔离在 `.scratch/t351-fix/dbs/`，明细见 `.scratch/t351-fix/detail.json`。
- 机检：`node .scratch/t351-fix/check-201-207.mjs` → ALL7 PASS（双冻结 id `ilife-copy-data`／`ilife-copy-log`，
  正文区零 `copy-menu`／`data-fmt`／`▾`，可见正文零裸字段名，零内联事件属性）。

## 三、逐份路径（双击可打开）

| order | 路径 | 字节 | 双按钮 | 无英文菜单 | 无明文泄漏 | 可打开 |
|---|---|---|---|---|---|---|
| 201 | `D:\ilife\.scratch\t351-fix\order201-result.html` | 63532 | 过 | 过 | 过 | 过 |
| 202 | `D:\ilife\.scratch\t351-fix\order202-result.html` | 64610 | 过 | 过 | 过 | 过 |
| 203 | `D:\ilife\.scratch\t351-fix\order203-result.html` | 65103 | 过 | 过 | 过 | 过 |
| 204 | `D:\ilife\.scratch\t351-fix\order204-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 205 | `D:\ilife\.scratch\t351-fix\order205-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 206 | `D:\ilife\.scratch\t351-fix\order206-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 207 | `D:\ilife\.scratch\t351-fix\order207-result.html` | 60643 | 过 | 过 | 过 | 过 |

注：`gh issue view 351 --comments` 实测评论数为 0（标题“卡路里场景 05：真机端到端＋肉眼终审”），无可读评论。

## 四、未做＋下一手

- 未做：176–195（归另兵）、路由漂移单测（归路由票）、两件超线拆分（另票）。
- 下一手：用户逐份双击上表 HTML 肉眼终审（壳、版式、中文、双按钮）；通过即收。

## 五、补丁兵补 id（data-action-id 不动，功能不动）

- 做法：两件本地复制块 `renderCopyBlock({...})` 后各加两行 `.replace`，把
  `data-action-id="ilife-copy-data"` 前补 `id="ilife-copy-data"`、
  `data-action-id="ilife-copy-log"` 前补 `id="ilife-copy-log"`；不碰 `base-paint`、
  不改文本/逻辑/运行时（委派仍读 `data-action-id`）。
- 类型检查：`npx tsc -b packages/skill-calorie` exit 0。
- 持锁重跑：`node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/run-201-207.mjs`
  → `{"total":7,"fails":[]}`；`node .scratch/t351-fix/check-201-207.mjs` → ALL7 PASS。
- 新鲜 7 份 grep（前导空格口径，避开 `data-action-id` 子串误计）：
  ` id="ilife-copy-data"` 7、` id="ilife-copy-log"` 7、
  `data-action-id="ilife-copy-data"` 7、`data-action-id="ilife-copy-log"` 7，
  即每份双 `id` 各一且与原 `data-action-id` 双通道并存。
