# 备忘录（memo）SKILL

文件 DB 笔记：增删改查、分类、心愿排期、提醒路由、飞书同步。唯一出口 `memo-cmd-read <memo.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
memo-cmd-read memo.search --params '{"q":"关键词"}'
memo-cmd-read memo.create --params '{"title":"买奶","category":"备忘"}'
memo-cmd-read memo.remind
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

相关场景：memo.batch、memo.create、memo.detail、memo.remind、memo.remove、memo.search、memo.stats、memo.sync、memo.update、memo.wish（10 联动，key 字符串 P8 落表时冻结）。
<!-- HELP-AUTO-END -->

## 环境与出 scope

- SKILLS_DB_PATH（必设）+ lark-cli（同步须四门全绿），见 docs/env.md。
- 出 scope：定时任务、面板、本技能外联动；Python 老家只读对照。
