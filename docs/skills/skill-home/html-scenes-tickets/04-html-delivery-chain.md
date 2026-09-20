## Question

需求 2 的链路「prompt → 唤醒词 → 命令 → HTML 绝对路径」今天断在最后一跳：常规跑一条命令只回 stdout 的 JSON，只有 `--html`（`cmd_read.ts:850-859`）或 HELP 交付（`:860-868`）才物化成文件。要定成「数据与过程命令**默认落 HTML** ＋ 回执给绝对路径」。

## 目标

数据与过程命令缺省即落 HTML：落点与命名走共用件 `base-paint/save-html`（居家自持只留落点值），沿用老规范 `<根>/home_manager_html/<命令中文名>_<YYYYMMDD_HHMMSS>.html`；回执带 `delivery.path` 绝对路径，且声明字节 ＝ 磁盘真实字节；`--html` 显式支与缺省支的关系、坏参退出码、写失败退出码都有用例；**改坏落点值／删掉交付段必须变红**（变异自证两行读数入交付记录）。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> -- node --test packages/skill-home/test` —— exit 0；变异自证两行读数（改坏 → 红条数；改回 → 绿条数）写进 `docs/skills/skill-home/html-delivery-chain.md`。

## 不许动的东西

不动 HELP 交付支既有契约（#183 票 4／7／8 冻结的三支：缺省／速查／`q`）；不动页面模板；不碰生产产物目录。

## 交付物路径

`packages/skill-home/src/**`（输出层与 CLI）；证据 `docs/skills/skill-home/html-delivery-chain.md`。

## 遗留出口

与 HELP 支的互斥口径若必须改，回写票 2／票 8 并当场补票，不自行放宽。
