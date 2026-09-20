## Question

验收要两样东西：① 双端验收墙（手机 390 宽／桌面 1280 宽，按域成对）② 一张链路总览页（每行：序｜域｜场景标题｜prompt｜唤醒词｜命令｜绝对产物路径，点即跳转打开）。仓里两样都有先例，但都不能直接拿：墙要看 `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs`（四模式一体），链路总览要看 `docs/skills/skill-calorie/t268-链路总览.build.mjs`（骨架值钱，数据与文案绑死场景 04）。

## 目标

在 `docs/skills/skill-home/` 落两个生成器（照抄 ＋ 按居家重写）：
① 墙生成器四模式（造册／出墙／出索引／`--check`），双端成对、列数与缩放照仓规 §6.3，内建链接自检 **`dropped` 与 `dead` 一起判**、**禁 `loading="lazy"`**、补字节校验；
② 链路总览页生成器：行内既印**绝对路径文本**也把该文本做成 `file:///` **可点链接**，含「复制路径」与 `<noscript>` 绝对路径兜底。
两份都要能拿一份**假清单**跑通（不依赖真页面先存在），页面与产物必须落**同一目录**（本机视觉工具只吃工作区内文件）；清单里的文件名规则**与票 21 的裁决逐字相同**（不许两处各算一次名称）。

## 验收命令

正例：`node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<样例> <样例>手机墙.html` → 打「N 格；链接 M 条；缺失 0 -> 可发」且 **exit 0**；
反例：在清单里故意写一个不存在的文件名再跑 → **exit 1 且点名那份**（走过才算过）。

## 不许动的东西

不改卡路里／记账那两份原件；生成器不许对某一域硬编码（域与清单必须来自参数）；清单 JSON 不带 BOM。

## 交付物路径

`docs/skills/skill-home/gen-scene-wall.mjs` ＋ `gen-chain-page.mjs`（入仓，带批名或票号）；说明 `docs/skills/skill-home/wall-and-chain-page.md`。

## 遗留出口

清单字段契约（`seq`／`kind`／`wake`／`file`／`check`…）与命名规则若与 #183 已定的落点值冲突，当场补票，不在脚本里私改。
