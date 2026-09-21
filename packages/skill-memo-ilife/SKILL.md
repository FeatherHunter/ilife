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

<!-- CALL-FORM-START -->

## 唯一出口：怎么跑

入口＝本技能包 `package.json` 里 `bin` 声明的那条：`dist/cli/cmd_read.js`。
`<技能基目录>`＝加载本技能时给出的 `Base directory for this skill: <路径>` 那一行。

1. 命令名解析得到时：`memo-cmd-read <key> [--params '<json>']`。
2. 解析不到时（`not recognized`／`command not found`）＝ PATH 上没有这条命令，下面这行照样跑得起来：
   `node <技能基目录>/dist/cli/cmd_read.js <key> [--params '<json>']`
3. 本目录里没有编译产物时：`npx -p skill-memo-ilife memo-cmd-read <key> [--params '<json>']`（上面第 2 行就够，不必再取一份）。

换走法的信号只有一个：命令名解析不到。其余报错照 stderr 的报文原样交给用户。
<!-- CALL-FORM-END -->

## 口径（M3）

- 顶层分类 4 种：备忘（默认）/心愿/打卡/情绪日记；子分类自由文本可空；子唤醒词自带顶层。
- 提醒四向：设置/查询/废弃（留笔记）/完成；真删须 confirm。
- 坏输入与缺失一律阻断，不返空数组冒充正常。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 首次使用 | memo.init | receipt | `memo-cmd-read memo.init` |
| 删备忘 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"id":"<id>"}'` |
| 按时间搜备忘 | memo.search | list | `memo-cmd-read memo.search --params '{"start":"2026-07-01","end":"2026-07-07"}'` |
| 查已提醒备忘 | memo.remind | list | `memo-cmd-read memo.remind --params '{"done":false}'` |
| 批量改分类 | memo.batch | receipt | `memo-cmd-read memo.batch` |
| 改子分类 | memo.update | receipt | `memo-cmd-read memo.update --params '{"id":"<id>"}'` |
| 搜备忘 | memo.search | list | `memo-cmd-read memo.search` |
| 查备忘 | memo.search | list | `memo-cmd-read memo.search` |
| 看备忘 | memo.detail | detail | `memo-cmd-read memo.detail --params '{"id":"<id>"}'` |
| 看提醒 | memo.remind | list | `memo-cmd-read memo.remind` |
| 查提醒 | memo.remind | list | `memo-cmd-read memo.remind` |
| 设提醒 | memo.reminder | receipt | `memo-cmd-read memo.reminder --params '{"remind_at":"2026-10-01 09:00"}'` |
| 记提醒 | memo.create | receipt | `memo-cmd-read memo.create --params '{"remindAt":"2026-10-01 09:00"}'` |
| 废弃提醒 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"mode":"abandon"}'` |
| 完成心愿 | memo.update | receipt | `memo-cmd-read memo.update --params '{"done":true}'` |
| 心愿排期 | memo.wish | list | `memo-cmd-read memo.wish` |
| 记一条 | memo.create | receipt | `memo-cmd-read memo.create` |
| 添加笔记 | memo.create | receipt | `memo-cmd-read memo.create` |
| 备忘录同步 | memo.sync | receipt | `memo-cmd-read memo.sync` |
| 记心愿 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"心愿"}'` |
| 记打卡 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"打卡"}'` |
| 记情绪日记 | memo.create | receipt | `memo-cmd-read memo.create --params '{"category":"情绪日记"}'` |
| 查心愿 | memo.wish | list | `memo-cmd-read memo.wish --params '{"category":"心愿"}'` |
| 查打卡 | memo.search | list | `memo-cmd-read memo.search --params '{"category":"打卡"}'` |
| 查情绪日记 | memo.search | list | `memo-cmd-read memo.search --params '{"category":"情绪日记"}'` |
| 改心愿 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"心愿","id":"<id>"}'` |
| 改打卡 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"打卡","id":"<id>"}'` |
| 改情绪日记 | memo.update | receipt | `memo-cmd-read memo.update --params '{"category":"情绪日记","id":"<id>"}'` |
| 删心愿 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"category":"心愿","id":"<id>"}'` |
| 删打卡 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"category":"打卡","id":"<id>"}'` |
| 删情绪日记 | memo.remove | receipt | `memo-cmd-read memo.remove --params '{"category":"情绪日记","id":"<id>"}'` |

相关场景：memo.auth、memo.batch、memo.create、memo.detail、memo.help.lookup、memo.init、memo.remind、memo.reminder、memo.remove、memo.search、memo.stats、memo.sync、memo.update、memo.wish（14 联动，key 字符串 P8 落表时冻结）。
<!-- HELP-AUTO-END -->

## HELP 交付（说「备忘录 HELP」走这里，不分大小写）

- **缺省就是交付物**：`memo-cmd-read memo.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<库目录>/<产物目录>/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`（`<库目录>`＝配置文件 `~/.ilife/memo.yaml` 的 `db.dir`，空串＝数据目录 `~/.ilife/data/`；`<产物目录>`＝同文件的 `html.dir`，默认 `memo_html`，**扁平一段、不加 `help/` 一层**；8 域／13 二级组／30 场景，走仓内通用 help 模板）。stdout 的 `delivery.path` 是**绝对路径**、`delivery.bytes` 是文件字节数；回话就把这个路径给用户（回执即真相）。
  **完成标准**：`delivery.path` 指的那个文件真的存在、大小＝`delivery.bytes`、退出码 0——三条都核过才算交付，核不过就照实说失败。
- **反复读不再涨目录（#245）**：同一主体**一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；回执给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内若已有一份、而你刚改过 HELP 内容，那份旧产物**不会被自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。
- **要速查表才加参数**：`--params '{"mode":"lookup"}'` 落同目录 `备忘录_速查表_<YYYYMMDD_HHMMSS>.html`（28 条唤醒词一行一条：唤醒词／命令／形状／调用形／一句话）。与 HELP 文件**分名**，两份产物不撞车；这一支同样吃上面的复用窗口。
- **要现找才加参数**：`--params '{"q":"帮我搜备忘"}'` 只回命中条目（JSON），**不落盘**；要落盘再给 `--html`。`q` 与 `mode` 互斥，`mode` 只认 `lookup`，违反即退出码 2。
- **`--html <路径>`＝显式落点**：逐字用你给的路径、缺父目录自动建、**覆盖写**（不参与同一秒 `_N` 递补）。给 `--html` 时缺省那支落整页 HELP，`q`／`mode:"lookup"` 那两支落该次的分节页。
- **边界**：看 HELP **不开库、不建库**——跑完数据目录里仍没有 `memo.db`；这条命令只交页面与索引，不读也不写笔记内容。
- **与上一节的关系**：正文「联动速查」块是**构建期注入的索引**（`scripts/build-help.mjs` 从唤醒词表注入 SKILL.md，勿手改），给 AI 按唤醒词找命令；**HELP 文件是缺省交付物**，给用户打开看。两者同源（同一张唤醒词表）、不是一份东西；显式 `mode:"lookup"` 落的那份是索引的页面版（`备忘录_速查表`），也不是 HELP 文件。
- **入口只认一条**：「备忘录 HELP」（不分大小写，用户 2026-09-12 裁定）；其余唤醒词是场景别名，住上一节索引块，不另立 HELP 入口。

## 环境与出 scope

- 路径类取值一律读配置文件 `~/.ilife/memo.yaml`（**配置文件是唯一真相，环境变量不参与配置**）：库目录＝`db.dir`（空串＝数据目录 `~/.ilife/data/`，首次读时自动建）、库文件名＝`db.name`（默认 `memo.db`）、产物目录＝`html.dir`（默认 `memo_html`）、附件目录＝`media.dir`（默认 `media`）、飞书 CLI 路径＝`lark.cliPath`（**空串＝没有显式值，走本机自动探测**）、飞书扫码目录＝`lark.qrDir`（空串＝系统临时目录下的 `memo_feishu_qr`）、HELP 与速查表的主体名＝`files.help`／`files.lookup`。飞书同步另须 lark-cli 四门全绿。取值面与环境项见 docs/env.md。
- 出 scope：定时任务、面板、本技能外联动；Python 老家只读对照。
