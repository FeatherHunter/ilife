---
name: skill-memo-ilife
description: "「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP 文件（老骨架 8 域／13 二级组／30 场景，走仓内通用 help 模板）；唯一出口 memo-cmd-read。触发词：备忘录 HELP（不分大小写）。文件 DB 笔记：按关键词／时间／分类／子分类搜与看、记一条、改一条、删一条（真删须 confirm）、批量改分类、提醒（设／查／废弃／完成）、心愿排期、统计、飞书同步。"
---
# 备忘录（memo）SKILL

文件 DB 笔记：增删改查、分类、心愿排期、提醒路由、飞书同步。唯一出口 `memo-cmd-read <memo.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
memo-cmd-read memo.search --params '{"q":"关键词"}'
memo-cmd-read memo.create --params '{"title":"买奶","category":"备忘"}'
memo-cmd-read memo.remind
memo-cmd-read memo.help.lookup                      # 说「备忘录 HELP」（不分大小写）：缺省就落一份 HELP 文件
```

## 口径（M3）

- 顶层分类 4 种：备忘（默认）/心愿/打卡/情绪日记；子分类自由文本可空；子唤醒词自带顶层。
- 提醒四向：设置/查询/废弃（留笔记）/完成；真删须 confirm。
- 坏输入与缺失一律阻断，不返空数组冒充正常。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 按时间搜备忘 | memo.search | list | `memo-cmd-read memo.search --params '{"timeRange":"2026-09"}'` |
| 查已提醒备忘 | memo.remind | list | `memo-cmd-read memo.remind --params '{"done":false}'` |
| 批量改分类 | memo.batch | receipt | `memo-cmd-read memo.batch` |
| 改子分类 | memo.update | receipt | `memo-cmd-read memo.update --params '{"id":"<id>"}'` |
| 搜备忘 | memo.search | list | `memo-cmd-read memo.search` |
| 查备忘 | memo.search | list | `memo-cmd-read memo.search` |
| 看备忘 | memo.detail | detail | `memo-cmd-read memo.detail --params '{"id":"<id>"}'` |
| 看提醒 | memo.remind | list | `memo-cmd-read memo.remind` |
| 查提醒 | memo.remind | list | `memo-cmd-read memo.remind` |
| 设提醒 | memo.create | receipt | `memo-cmd-read memo.create --params '{"remindAt":"2026-10-01"}'` |
| 记提醒 | memo.create | receipt | `memo-cmd-read memo.create --params '{"remindAt":"2026-10-01"}'` |
| 废弃提醒 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"mode":"abandon"}'` |
| 完成心愿 | memo.update | receipt | `memo-cmd-read memo.update --params '{"done":true}'` |
| 心愿排期 | memo.wish | list | `memo-cmd-read memo.wish` |
| 记一条 | memo.create | receipt | `memo-cmd-read memo.create` |
| 添加笔记 | memo.create | receipt | `memo-cmd-read memo.create` |
| 记心愿 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"心愿"}'` |
| 记打卡 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"打卡"}'` |
| 记情绪日记 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"情绪日记"}'` |
| 查心愿 | memo.wish | list | `memo-cmd-read memo.wish --params '{"category":"心愿"}'` |
| 查打卡 | memo.search | list | `memo-cmd-read memo.search --params '{"category":"打卡"}'` |
| 查情绪日记 | memo.search | list | `memo-cmd-read memo.search --params '{"category":"情绪日记"}'` |
| 改心愿 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"心愿","id":"<id>"}'` |
| 改打卡 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"打卡","id":"<id>"}'` |
| 改情绪日记 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"情绪日记","id":"<id>"}'` |
| 删心愿 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"心愿","id":"<id>"}'` |
| 删打卡 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"打卡","id":"<id>"}'` |
| 删情绪日记 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"情绪日记","id":"<id>"}'` |

相关场景：memo.batch、memo.create、memo.detail、memo.help.lookup、memo.remind、memo.remove、memo.search、memo.stats、memo.sync、memo.update、memo.wish（11 联动，key 字符串 P8 落表时冻结）。
<!-- HELP-AUTO-END -->

## HELP 交付（说「备忘录 HELP」走这里，不分大小写）

- **缺省就是交付物**：`memo-cmd-read memo.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`（扁平落 `memo_html/`，不加 `help/` 一层；8 域／13 二级组／30 场景，走仓内通用 help 模板）。stdout 的 `delivery.path` 是**绝对路径**、`delivery.bytes` 是文件字节数；回话就把这个路径给用户（回执即真相）。同一秒撞名自动递补 `_2`（再撞给 `_3`）。
  **完成标准**：`delivery.path` 指的那个文件真的存在、大小＝`delivery.bytes`、退出码 0——三条都核过才算交付，核不过就照实说失败。
- **要速查表才加参数**：`--params '{"mode":"lookup"}'` 落同目录 `备忘录_速查表_<YYYYMMDD_HHMMSS>.html`（28 条唤醒词一行一条：唤醒词／命令／形状／调用形／一句话）。与 HELP 文件**分名**，两份产物不撞车。
- **要现找才加参数**：`--params '{"q":"帮我搜备忘"}'` 只回命中条目（JSON），**不落盘**；要落盘再给 `--html`。`q` 与 `mode` 互斥，`mode` 只认 `lookup`，违反即退出码 2。
- **`--html <路径>`＝显式落点**：逐字用你给的路径、缺父目录自动建、**覆盖写**（不参与同一秒 `_N` 递补）。给 `--html` 时缺省那支落整页 HELP，`q`／`mode:"lookup"` 那两支落该次的分节页。
- **边界**：看 HELP **不开库、不建库**——跑完 `<SKILLS_DB_PATH>/memo` 仍不存在；这条命令只交页面与索引，不读也不写笔记内容。
- **与上一节的关系**：正文「联动速查」块是**构建期注入的索引**（`scripts/build-help.mjs` 从唤醒词表注入 SKILL.md，勿手改），给 AI 按唤醒词找命令；**HELP 文件是缺省交付物**，给用户打开看。两者同源（同一张唤醒词表）、不是一份东西；显式 `mode:"lookup"` 落的那份是索引的页面版（`备忘录_速查表`），也不是 HELP 文件。
- **入口只认一条**：「备忘录 HELP」（不分大小写，用户 2026-09-12 裁定）；其余唤醒词是场景别名，住上一节索引块，不另立 HELP 入口。

## 环境与出 scope

- SKILLS_DB_PATH（必设）+ lark-cli（同步须四门全绿），见 docs/env.md。
- 出 scope：定时任务、面板、本技能外联动；Python 老家只读对照。
