## Question

六家技能的「缺省落页 ＋ 回执」今天没有一条能常跑的判据：怎么把它写成一条对六家都生效、能自动判真假的命令？

## 目标

写 `tooling/check-delivery.mjs`：逐家（卡路里／作息／居家／备忘／饼干／大厨）在**隔离家目录**（临时 `USERPROFILE`／`HOME`）里跑一条命令，断言五件事——

1. stdout 顶层有 `delivery`；
2. `delivery.path` 是**绝对路径**；
3. 该路径的文件**存在**；
4. 文件字节数 ＝ `delivery.bytes`；
5. 内容是**整页**（含 `<html`）。

逐家打一行读数；任一家不合即 `exit 1`。自带 `--selftest`：喂一份没有 `delivery` 的 stdout ⇒ 必红；喂一份合格的 ⇒ 必绿。

**选例要求**：每家的探针命令必须是**空库上也退出 0** 的那条。已知成立的三条：饼干 `bill.record.today`、居家 `home.item.search`、作息 `schedule.record.today`。卡路里的读命令在空库上按「缺失阻断」退 4，要大厨／卡路里两家各自挑出一条空库可跑的命令（挑不出来时票面写明，并给出替代判据，例如预置最小样本数据）。

## 验收命令

```sh
# PowerShell：先把家目录指到临时目录
$env:USERPROFILE="<临时目录>"; $env:HOME="<临时目录>"
node tooling/check-delivery.mjs
```

写完之后**必须重现**这三行红（探针抓得住），随后各自修完转绿：

- 饼干：现在 `exit 0`、stdout 五字段 envelope、无 `delivery`、盘上无文件（2026-09-22 真跑）；
- 大厨：写出来是一个 `<section …>` 段、且不回 `delivery`（2026-09-22 真跑，空库被「缺失阻断」拦下，另行选例）；
- （备忘已核实不是缺口：`memo.stats` 随 #858 退役。）

自证：`node tooling/check-delivery.mjs --selftest` —— 假例必红、真例必绿，两行机器读数写进证据件。

## 不许动的东西

不改任何技能源码（本票只写探针）；不碰真实数据目录（一律隔离家目录）；不改 HELP 三支交付口径。

## 交付物路径

`tooling/check-delivery.mjs`（＋`--selftest` 两行读数）；逐家读数与选例说明落 `docs/agents/交付面-缺省落点对齐/` 下的证据件（文件名本票定）。

## 遗留出口

饼干那一行归本图〔饼干记账：非 HELP 命令缺省落点与回执〕；大厨那一行归本体图〔私家大厨本体图〕（#765，不在本图另建票）；探针要不要接进常驻门，见地图 Not yet specified。

## 进度：0%

下一步：先给六家各挑一条空库可跑的探针命令，再照 `tooling/` 下既有门脚本的体例写脚本与自证。
