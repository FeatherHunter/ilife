---
'skill-calorie': patch
---

#82（map #63）**SKILL.md 门面重写**：单行 `description` 收进旧版 **69 项触发词**（逐字同序，499 字符）＋ **「卡路里HELP」入口**；`HELP-AUTO` 块**逐字零改**（块外改写）。

- **`description`（模型侧触发面）**：`「卡路里HELP」→calorie.help.center 出完整速查台；唯一出口 calorie-cmd-read。触发词：<旧 frontmatter 69 项逐字>`。改前 62 字符、**零触发词**；改后 499 字符，恰好压进 DSH 宿主目录 **500 字符**截断预算（`dsh-tool-skill` `DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH=500`）——不触发截断，且 `卡路里HELP`＋命令位于第 1–30 字符，即使截断也必然可见。
- **触发词核实**：旧 frontmatter 69 项**全在新 SoT**（434 唯一词／436 条）且**全被路由层命中**（exec 60／non-exec 9）；逐字同序由探针元素级比对（`69/69 相等`）。
- **「卡路里HELP」入口三处**：`description` ＋ 门面首屏一行 ＋ `## HELP 现找与「卡路里HELP」速查台` 节（`calorie-cmd-read calorie.help.center`，缺省 `mode=file` 出完整 HTML 速查台 436 场景／54 子功能／10 分组；`inline`／`text` 另两态；`q`＋`mode` 互斥 exit 2）。
- **同步 #91 交接的过时口径**：旧文「`calorie.help.center`（全量 10 键…）」改为「**照片 10 键走 `q`**（不是 `mode`）」＋新增速查台首条；#91 交接第 ③ 项闭环。
- **门面精简（块外）**：首屏加 3 条指针（`卡路里HELP` 入口／配置型写词先按 M6 分流／唤醒词表位置）；「公共安装器运行时」段落的 HTML 落点行去重为指针（单一来源＝「唯一出口（T11）」节）。
- **`routing.ts` 零改动**：`卡路里HELP` 不在 SoT／不在路由层；新增词条必红 `calorie-routing-81.test.mjs` 冻结计数（436／434／56／341／95），属 #81 冻结面 → 本票只做 `description` 侧触发 ＋ 正文命令（编排者 2026-09-09 书面确认口径）。
- **验收③自证**：持锁重跑 `build-help.mjs` 后整文件 `git hash-object` **前=后=`7433560f…`**；块内／块外前缀／块外后缀三段逐字相等。
- **门禁**：`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre`／`help:examples:check`（99/99）**逐条 exit 0**；canonical `pnpm test` 1 轮 → t101 delta **新增=0**（base 34 → after 29，消失 5 全为基线抖动侧）；白名单 diff 0 行。
- **未含**：`routing.ts` 的确定性入口（另票，动 #81 冻结面）／M6 节位置调整（D-2，S3）／`HELP-AUTO` 块内 `help.center` 代表词（`REPR` 归 #99）。
- **证据**：`docs/research/t82-skill-facade.md` ＋ 探针 `.scratch/t82/{verify-triggers,check-description,check-acceptance3,check-integrity}.mjs`。
