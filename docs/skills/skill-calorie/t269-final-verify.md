# t269 · 运行时终验与漏改修补（执行证据）

> 票 #269（地图 #155 卡路里场景 02 饮食）。本文件是**运行时终验这一段**的新证据，以本票号命名，归属 `docs/skills/skill-calorie/`。
> 前一段（实现与静态预审）的证据见同目录 `t269-receipt-skeleton.md`（第一步影响清单／结构设计／超线报警／交付对账）与
> `t269-review-adversarial.md`（静态预审 PASS 90）；门禁运行条目的导出件是 `t269-gate-runs.md`。
> 用词照 `docs/agents/wording.md`；结构照 `docs/agents/structure.md`；门禁照 `docs/subagent-concurrency-protocol.md` §2／§3／§5。
> **本段零源码改动**：只改 3 个测试文件 ＋ 本目录证据件 ＋ `.changeset/`，另在草稿目录留可复跑脚本的副本。

## 判定：PASS（票面「完成的样子」四条逐条实跑）

| 票面「完成的样子」 | 机器读数 | 运行标识 |
|---|---|---|
| 13 条写命令逐条实跑 exit 0，产物为完整文档，附落盘路径与字节数 | `RESULT: RUN13 ok=13/13 doc=13/13` | `t269f-cli13-docs`（`t269f-cli13` 同读数） |
| 其余命令的产物逐 sha256 未变 | `RESULT-DIFF keys=46 diet13=13/13 changed=13/13 others_same=33/33 others_changed=0 fail=0` ＋ `RESULT: PASS` | `t269f-verify-docs`（`t269f-verify-2` 同读数） |
| `pnpm build` exit 0 | exit 0 | `t269f-build`；本段收口窗口内又重编三次（变异前后），见 `t269f-windowA` |
| 全包测试：本票红点转绿，且不新增红 | 28 → 28，本票 4 处红点全绿，窗口内他人新增 5 条（非本票，见第五节） | `t269f-full-before` ＋ `t269f-window2` |

## 一、13 条写命令逐条实跑（真出口 `packages/skill-calorie/dist/cli/cmd_read.js`）

命令：`node docs/skills/skill-calorie/t269-cli-run13.mjs`（需持锁；每条各自新建临时库与落盘目录，前置记录也用同一条真出口造）。
机器摘要行：`RESULT: RUN13 ok=13/13 doc=13/13`；日志 `.scratch/t269-final/cli13-docs.log`。

| 命令 | exit | 落盘绝对路径 | 字节 | 完整文档 |
|---|---|---|---|---|
| `calorie.diet.add` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.add\receipt.html` | 60963 | 是 |
| `calorie.diet.batch` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.batch\receipt.html` | 60712 | 是 |
| `calorie.diet.copy` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.copy\receipt.html` | 60660 | 是 |
| `calorie.diet.remove` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.remove\receipt.html` | 60801 | 是 |
| `calorie.diet.remove-by-date` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.remove-by-date\receipt.html` | 60446 | 是 |
| `calorie.diet.remove-by-range` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.remove-by-range\receipt.html` | 60531 | 是 |
| `calorie.diet.remove-by-type` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.remove-by-type\receipt.html` | 60462 | 是 |
| `calorie.diet.update` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.update\receipt.html` | 60648 | 是 |
| `calorie.diet.update-by-date` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.diet.update-by-date\receipt.html` | 60396 | 是 |
| `calorie.product.add` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.product.add\receipt.html` | 60962 | 是 |
| `calorie.product.update` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.product.update\receipt.html` | 60640 | 是 |
| `calorie.product.deprecate` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.product.deprecate\receipt.html` | 60997 | 是 |
| `calorie.water.log` | 0 | `D:\ilife\.scratch\t269-final\artifacts\calorie.water.log\receipt.html` | 60789 | 是 |

「完整文档」判据：以小写化后的文本同时含 `<!doctype html>` ＋ `charset` ＋ `<style` 三样（产物头两行逐字为
`<!doctype html>` 与 `<html lang="zh-CN">`，第三块是 `<head>` 里的 `<meta charset="utf-8">`）。
落盘文件是**真出口写出的那份**（`--html` 指到草稿目录的绝对路径），可直接双击打开。

## 二、其余命令的产物逐 sha256 未变（真 before ／ after 逐条比对）

命令：`node docs/skills/skill-calorie/t269-verify-final.mjs`（需持锁；脚本随证据入仓）。
一次跑 46 条会改数据库的命令（当刻命令册 `keys.ts` 的写侧全量），每条在**全新临时库**里跑一次真出口的写分支。

**「本票改动前」这一侧的取法（写清楚，别误读）**：本票的改动就是 `src/cli/write.ts` 里那一次
`?? dietReceiptDoc(...)` 的续接（见 `t269-receipt-skeleton.md` 的运行记录与 `t269-handover-276.md` 的插入点），
故「改动前」＝**同一棵树、同一份编译产物**，用加载钩子把 `dist/diet/receipt.js` 换成恒返回 `null` 的同名替身
（`t269-null-diet-hook.mjs` ＋ `t269-null-diet-stub.mjs`），也就是那一次续接未接线时的行为。
两侧除饮食那一条端口外逐字同源；改动前那一侧饮食 13 条自然落回原片段，其余命令走的就是原样放行的那条路。
sha256 归一：先把 `YYYY-MM-DD HH:MM:SS` 与只带时刻的 `HH:MM:SS` 换成 `<TS>`、把各条自带的临时目录串换成 `<DIR>`，
其余字节照原样参与哈希（明细件 `before.json` 与 `dump-*.html` 落 `.scratch/t269-verify/`）。

机器读数（`t269f-verify-docs`，日志 `.scratch/t269-final/verify-docs.log`）：

```text
RESULT-ONE mode=after  keys=46 cases=46 ok=46 fail=0 full=33 diet13_full=13/13
RESULT-ONE mode=before keys=46 cases=46 ok=46 fail=0 full=20 diet13_full=0/13
RESULT-DIFF keys=46 diet13=13/13 changed=13/13 others_same=33/33 others_changed=0 fail=0 before_fail=0
RESULT: PASS
```

逐条读法：饮食 13 条**改动前 0/13 是完整文档、改动后 13/13 是完整文档、13 条 sha 全部变化**；
其余 **33/33 条 sha 逐条未变**（这 33 条＝当刻 46 条写侧命令去掉饮食 13 条；票面写的「22 条」是 35 条命令册时代的数字，
按当刻命令册为准，取代关系在此写明）。三次跑里第一跑曾报 `others_changed=1`（`calorie.exercise.add`）——
查出是同一秒边界下**日志表里只有时刻**（`HH:MM:SS`）没被归一，补上那条归一规则后 33/33 稳定；现场留档
`.scratch/t269-final/ex2-fc.log` 与 `dump-*.html`，不是产物真变。

## 三、测试修补：把三处断言收窄到新形状（不是删断言，也不是放宽）

| 件 | 老断言 | 新断言（收窄） |
|---|---|---|
| `test/profile-doc-179.test.mjs` | 「其余会改数据库的命令仍是原回执片段」那张抽样表里含 `calorie.water.log`／`calorie.product.add`（两条都是本票切的饮食命令） | 两条移出片段表 → 进新条 `#269 饮食写命令已是完整文档`（`assertDocPage` ＋ 眉标／改动分项／写入去向／复制日志／字符量级五条）；片段表改抽 `calorie.goal.set`／`goal.water`／`body.measure-add`，**仍逐字钉** `startsWith('<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receipt">')` 且**仍钉**不得变成 `<!doctype html>` |
| `test/calorie-c43.test.mjs`（C6 写收据HTML结构化分项） | `assert.match(html, /<li>/)`（那是旧片段形态的特征） | 改成断新形状的结构：以 `<!doctype html>` 开头 ＋ 含 `charset="utf-8"` ＋ 分项落进结构化表格单元格（`/改动字段对照[\s\S]{0,600}?<td[^>]*>鸡胸<\/td>/`）；原 `assert.match(html, /鸡胸/)` 保留 |
| `test/delivery-83.test.mjs`（`#83 写键同样有 delivery` 与 `#83 ⑥ 相对 SKILLS_DB_PATH ＋ 写键`） | 两条都断 `delivery.template === 'receipt'` | 改断 `doc-shell` ＋ 产物以 `<!doctype html>` 开头（判定次序 DOCTYPE 先于 shape，本文件上面那条单元断言早已钉住该次序）；并**新增反面**：同一条用例里抽一条未切整页的命令（`calorie.goal.set`），断其 `template === 'receipt'` 且产物以 `<section class="ilife-page"` 开头 |

三处的口径变更说明都写进了各自用例的注释（有用例名逐字照抄，含老件既有用词）。
票据级读数：`t269f-targeted-final` → `tests=29 pass=28 fail=1`，唯一那条红是**他席**的
`profile-doc-179.test.mjs:160 :: #239 四张页接上「复制日志」…`（见第五节）。

## 四、变异自证（源码级两处方向各一；红／还原一致两行机器读数）

命令：`node docs/skills/skill-calorie/t269-mutation-battery.mjs`（需持锁；改的是本票自己的件
`packages/skill-calorie/src/diet/receipt.ts`，收尾逐文件还原＋重编＋复跑）。

- **M1「漏一条」**：把 `calorie.water.log` 从饮食具名命令集里拿掉 → 本票新写的整页断言必红。
  `MUT M1 applied=1 dist_changed=1 fail=4 red_hit=1`（红的四条里含 `#269 饮食写命令已是完整文档` 与两条 `#83`）。
- **M2「多一条」**：把一个**不在 13 条里**的写命令（`calorie.goal.set`）加进同一命令集 → 反面断言必红。
  `MUT M2 applied=1 dist_changed=1 fail=3 red_hit=1`（红的里面含 `#179 其余会改数据库的命令仍是原回执片段` 与 `#83 写键同样有 delivery`）。
- **还原一致**：`RESTORED src_sha_match=1 dist_clean=1 final_fail=1`（源码 sha256 与变异前逐字一致、编译产物回到未变异形态、
  三个测试件只剩他席那一条红）。

两处都先校验**编译产物真的跟着变了**（`dist_changed=1`）才算数：只看裸命令名不行——`writtenDetailOf()` 里
还有一处 `key === 'calorie.water.log'`，去掉集合项也不会消失（第一轮就是被它误判成「产物没变」，现场
`.scratch/t269-final/mutation.log` MARK 行 `EXIT=1` ＋ `SKIP-FULL-AFTER`；改看命令集那一行后重跑得上面读数）。

## 五、全包测试前后对照（本票红点转绿 ＋ 不新增红）

| 轮次 | 运行标识 | tests | pass | fail |
|---|---|---|---|---|
| 修补前（本席自测基线） | `t269f-full-before` | 1608 | 1580 | 28 |
| 修补后 | `t269f-window2`（窗口内跑 `pnpm test`） | 1616 | 1588 | 28 |

比对口径＝**用例名**（本票改的三个测试件会让其后用例行号整体位移，按 `文件:行` 比会把同一条既算转绿又算新增红；实测踩过，已改成按名比）。
命令：`node docs/skills/skill-calorie/t269-compare-full.mjs .scratch/t269-final/full-before.log .scratch/t269-final/full-after.log`（只读两份日志），
读数（日志 `.scratch/t269-final/compare-final.log`）：

```text
RESULT: FULL-BEFORE tests=1608 pass=1580 fail=28
RESULT: FULL-AFTER  tests=1616 pass=1588 fail=28
CLEARED(5) C6 写收据HTML结构化分项 ／ #83 写键同样有 delivery（receipt 产物族） ／
           #83 ⑥ 相对 SKILLS_DB_PATH ＋ 写键：exit 0（库已写入不得报失败）＋ receipt 落盘 ／
           #342 看今日／昨日运动路由指新命令且实跑是记录页（order 150／151 已搬） ／
           #179 其余会改数据库的命令仍是原回执片段（没被一刀切换页）
ADDED(5)   什么都不给（连 7 点都没有）→ 一次把 7 点／age／sex 全报齐，零新增行 ／
           #110 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档 ／
           #110 组合分析落差闭合：KPI＋双轴＋散点回归＋延迟＋分层＋明细＋复制 ／
           #110 多配对同键直出：weight_deficit 分桶节＋custom 窗（子集→同质） ／
           #110 命名底座可用：组合分析动态段落点＋回传一致＋产物为全文档
ADDED-MINE(0) (无)
TARGET-RED-BEFORE=1 TARGET-GREEN-AFTER=1
RESULT-ATTRIBUTABLE: PASS（本票四处红点转绿 ＋ 本票声明的件上零新增红）
RESULT: FAIL（严格口径：新增红集合须为空）
```

两条判定并列写清，不掩盖：**严格口径**（新增红集合必须为空）当刻是 FAIL——共享工作区里他席的在途件在这两跑之间
又长出了五条红；**归属口径**（本票声明的三个件）是 PASS。本票要证的是后者：四条红点转绿、自己声明的件上零新增红。
五条新增红**不在本票范围**，依据是三条硬事实：① 五个用例分别住 `test/t358-missing-ask.test.mjs` 与
`test/trend-homogeneity-110.test.mjs`——都不在本票声明的三个测试件里；② 本段**零源码改动**（只有 3 个测试文件），
不可能影响别的用例；③ 它们的断言内容与本票无关（`缺参数 age…`／`缺 noResidue`），且这两条线的在途件正是
`?? test/t358-missing-ask.test.mjs`、`?? src/analysis/multiTrend.ts`、`?? src/analysis/multiTrendPage.ts`
（`git status` 当刻可见，均未进版本库）。他席如按票自行修好，本票不认领也不代改。

## 六、D1–D4 整改（静态预审记的四个 S3）

- **D1**（sha 转录错一行）：已改。`t269-receipt-skeleton.md` 第 48 行 `calorie.diet.remove-by-range` 的前 12 位
  由 `af51e4d0e1d5` 改成 `af3ad404bb25`（原件 `after2.json` 值）。
- **D2**（行数口径失准）：已改。该件三处「142 行」改成 **151 行**（LF 口径），告警线结论不变（151 ＜ 350）。
- **D3**（`.scratch/` 在忽略清单、仓外不可复核）：已消。终验的可复跑脚本与摘要行全部**入仓**
  （本文件第七节列的 7 个 `.mjs`），锁目录的运行条目按协议 §2.3 第 4 条导出到受版本控制的 `t269-gate-runs.md`。
- **D4**（新增行用词「键」）：证据件与交接件里的四处已改成「命令」／「命令集」（`t269-receipt-skeleton.md` 两处、
  `t269-handover-276.md` 一处；另一处在 `src/diet/receipt.ts:29` 与 `src/cli/write.ts:67` 的**源码注释**上，
  不在本段声明的路径里，留给下一次触碰那两个文件的一方顺手改，本段不碰源码）。

## 七、门禁对账（声明与运行记录一对一）

导出件 `t269-gate-runs.md`（本文件同一票同一目录）。本次窗口声明如下（标识从 `.scratch/locks/gate-runs.log` 逐行抄录）：

- `GATE-RUN runId=t269f-build cmd=cmd /c .scratch\t269-final\g1-build.cmd` → exit=0（`pnpm build`，门禁）
- `GATE-RUN runId=t269f-verify-docs cmd=cmd /c .scratch\t269-final\g11-windowA.cmd` → exit=0（窗口；内含下面三条 0 码步骤）
  - 窗口内步骤：`t269-mutation-battery.mjs` exit=0（`MARK-t269-final-mut-final`）、
    `t269-verify-final.mjs` exit=0（`RESULT: PASS`）、`t269-cli-run13.mjs` exit=0（`RUN13 ok=13/13 doc=13/13`）
  - 同窗口诊断步骤（非门禁，仅读数）：`targeted-final` exit=1（唯一红为他席 `#239`）、`pnpm gen:check` exit=0
    （读数逐字为 `GEN-CHECK PASS`，118 条命令；能力 10 个声明 118 条，未搬迁清单 0 条。工具输出原文里那一行用的是
    生成器既有措辞，本文件按用词纪律改写成「条命令」，非逐字引用）
- `GATE-RUN runId=t269f-cli13 cmd=cmd /c .scratch\t269-final\g7-cli13.cmd` → exit=0（13 条逐条实跑，门禁）
- `GATE-RUN runId=t269f-verify-2 cmd=cmd /c .scratch\t269-final\g4-verify.cmd` → exit=0（前后逐条比对，门禁）
- `GATE-RUN runId=t269f-targeted-before cmd=cmd /c .scratch\t269-final\g2-targeted.cmd` → exit=1（修补前靶向，诊断）
- `GATE-RUN runId=t269f-targeted-after cmd=cmd /c .scratch\t269-final\g9-targeted-after.cmd` → exit=1（修补后靶向，诊断；
  唯一红为他席 `#239`，本票四处已绿）
- `GATE-RUN runId=t269f-full-before cmd=cmd /c .scratch\t269-final\g8-full-before.cmd` → exit=1（全量基线，诊断）
- `GATE-RUN runId=t269f-window2 cmd=cmd /c .scratch\t269-final\g10-window.cmd` → exit=1（变异＋全量，诊断；窗口内变异段 exit=0）
- `GATE-RUN runId=t269f-windowB1 cmd=cmd /c .scratch\t269-final\g12-windowB1.cmd` → exit=0（窗口：前后对照复跑 ＋
  `git add` 后 `git diff --cached --name-only` 复核暂存集；两次命令码分别为 1 与 0，见 `compare-final.log`／`stage.log`）
- `GATE-RUN runId=t269f-commit cmd=cmd /c .scratch\t269-final\g13-commit.cmd` → 提交与推送那一次窗口（`git add` 点名 14 件 →
  `git diff --cached --name-only` 复核 → `git commit -F … -- <14 件>` → 回读提交范围 → `git push`）；条目见
  `t269-gate-runs.md` 追加段的末行
- `GATE-RUN runId=t269f-window cmd=cmd /c .scratch\t269-final\g10-window.cmd` → exit=20（第一轮变异自检判据写错，未跑全量，诊断）
- 另有 `t269f-probe-shapes`／`t269f-probe-exercise`／`t269f-ex2` 三条 exit=0 的探针运行（前两条为选断言锚点、第三条为定位上面那条时刻归一缺口）。
- 有一次靶向复跑被外层取消**且未抢到锁**，故运行记录里没有它的条目，本文件也不声明它（协议 §2.4 第 2／3 条：没有声明的运行不计入对账）。

## 八、未做项与下一手

- 他席那一条红（`test/profile-doc-179.test.mjs::#239 四张页接上「复制日志」…`，预审期在 `:157`、本段改件后位移到 `:160`）
  仍是红：现场是 `calorie.view.profile-wizard` 预检确认页上 `data-action-id` 出现**两颗** `ilife-copy-log`，
  根因在复制区（`src/shared/copyArea.ts` 一带有他席在途改动）。不在本票范围，本段不碰。
- 窗口内他人新增的五条红（`t358-missing-ask` 1 条、`trend-homogeneity-110` 4 条）按第五节归他席。
- D4 剩下的两处用词在**源码注释**里（`src/diet/receipt.ts:29`、`src/cli/write.ts:67`），本段声明的路径不含源码，未改。
- `calorie.product.import`（#276 新增的第 14 条饮食族写命令）当刻仍是原片段：它不在本票的 13 条里，
  归 #276 的页面票决定形状；本票只记录，不代改。
