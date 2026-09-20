# 爱生活（dsh-life-pack）

DSH 设置弹窗里的「爱生活」卡：把六个技能（备忘录、卡路里、私家大厨、居家管家、作息管家、饼干记账）的**设置页**收进一排页签，另带**配置体检**与**更新区**。

One settings card for the iLife home-life suite: memo, calorie, chef, home, schedule and bill in a tab bar, with a read-only config health check and an update panel.

## 装

```sh
dsh plugin add dsh-life-pack                      # 只要这张卡
dsh plugin add dsh-life-pack dsh-calorie          # 卡 ＋ 某一个技能（一条命令两个包）
```

某个技能没装时，那一个页签的位置会变成**补装提示**，带上该条可直接复制的命令——不需要先装齐六个。

## 卡里有什么

| 区域 | 做什么 |
| --- | --- |
| 页签条 | 六个技能的设置页各自注册进「爱生活页签槽」；点谁切谁 |
| 配置体检 | 点一次，按家取数：顶部一行总账，每家一张表（每条：灯／标题／档／一句话／去哪修）。**只读**——不建目录、不改配置、不自动重置 |
| 更新区 | 七个包（它自己 ＋ 六家）检查更新、逐个安装；装完按事实给下一步（重启 DSH 生效／重试／重新检查） |
| 面板入口 | 右上角：检查更新、去仓库点 Star、反馈问题；底部一句「作者其他插件」 |

## 它不做什么

不 import 任何一个单品包，也不依赖它们——依赖方向是反的（单品硬依赖 `dsh-life-pack`）。总管只做导航与聚合：六家的页面各自注册进槽位，缺席就渲染补装提示，不轮询、不代管。

## 配置与数据

- 配置：`~/.ilife/<技能>.yaml`（六个技能各一份，在各自的设置页里改）
- 数据目录：默认 `~/.ilife/data`（可在各技能设置页里改；留空＝用默认）

## 链接

- 仓库与整套插件（六个单品同仓）：<https://github.com/FeatherHunter/ilife>
- 问题与建议：<https://github.com/FeatherHunter/ilife/issues>
- 许可：MIT
