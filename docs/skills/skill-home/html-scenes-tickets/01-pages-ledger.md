## Question

老技能用 49 个页面模板承载 73 条场景；新技能此刻只有 21 张 16 行骨架（正文由 `renderEnvelopeHtml()` 统一生成）。要把 70 条场景（73 减去联动 3 条）按 9 个域做成真页面，先得有一份**册子**回答两件事：哪几条场景共用同一页（页族归属），每一页该有哪些字段／操作／空态／状态词。

## 目标

逐件读老技能 `templates/` 下被 `references/scenarios.yaml` 引用的 49 个模板，＋`features/*.md` 里对应的流程说明，产出册子：每族一行，含
① 老模板相对路径（含字节数与行数）
② 服务哪些场景 id（从 `src/help/scenarios.yaml` 的 `html.template` 反查）
③ 页面类型（查看／采集＋回执／选择／向导／混合）
④ 信息结构清单：字段、可执行操作、空态与异常态、状态词表
⑤ 一句「这一格该确认什么」（给验收墙的格子标签用）
读不完就按域拆成后续票并如实标注，**不许编造**（查不到的写「未查到（查了什么、在哪查）」）。

## 验收命令

`(Select-String -Path docs\skills\skill-home\pages-ledger.md -Pattern '^\| `templates/').Count` —— 读数 **≥40** 即绿；并跑册子自带的核对命令，确认每族的老模板路径在老技能盘上都存在（缺一即红）。

## 不许动的东西

老技能目录只读（一行不改）；`packages/skill-home/src/help/scenarios.yaml` 不改；任何源码不改。

## 交付物路径

`docs/skills/skill-home/pages-ledger.md`（UTF-8 无 BOM、真实换行）。

## 遗留出口

册子里发现的「老实现与 yaml 不一致」（例如老技能 11 条写类场景不落 HTML、18 个 legacy 平铺模板）逐条列出，交票 2 与对应域票认领。
