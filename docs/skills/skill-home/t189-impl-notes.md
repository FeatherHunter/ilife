# 票 #189 实施记录：渲染接线（5 项 ＋ 三块可选 → 通用 help 模板）

## 一、做了什么

- 新增 `packages/skill-home/src/help/helpFile.ts`（273 行，告警线 350 内）：两个出口、零 IO——
  `buildHomeHelpFileData(now, opts)` → 全量 HELP JSON；`renderHomeHelpHtml(data)` → 全页 HTML（直调 `base-paint/help-shell`）。
- 五张必填照票面：`skill_name`＝居家管家／`title`＝`居家管家 · 使用手册(HELP)`／`subtitle` 派生／`contact`＝老 `help_center.py:31-35` 三项（后两项 `url:true`＋`copy_all:true`）／`groups`＝资产派生（过滤后只读引用）。
- 三块可选：`meta_blocks` 两块（`help_summary`＝`subtitle` 同一字符串 ＋「骨架 73 条，联动 3 条已停用不列」；
  `help_wake_words`＝`WAKE_TABLE` 中 `key==='home.help.lookup'` 的 3 条）／`version='2.0'`／`init_banner`；**`recommendations` 不传**。
- `init_banner`：判「库文件存在」＝调用方传入的 `dbPath` ＋ 可注入判据 `opts.fileExists`（缺省 `existsSync`）；**不建库、不建目录**（不碰 `openHomeDb`、不碰自带 `mkdirSync` 的 `resolveDbPath()`）；判据抛异常／`dbPath` 缺位一律 fail-open（横幅照显）；键常在（实得键集 `title,subtitle,button_text,prompt,closable,hidden`），显隐只切 `hidden`。
- 接线：`package.json` 加 `"base-paint": "^0.3.0"`；`src/help/index.ts` 加两行转发（名字带 `Home`，与 `render/index.ts` 零重名，`tsc -b` 无歧义）；
  `tooling/check-boundaries.mjs` 摘掉 `SKILLS_BASE_FROZEN` 名单里的 `'skill-home'`。
- ⚠️ **就地修掉 `check-boundaries.mjs` 扫描正则的假命中**（否则新断言是空转，见第五节）。

## 二、实际命令与实际输出

| 命令 | 结果 |
|---|---|
| `pnpm install --filter skill-home --config.minimumReleaseAge=0` | Done in 1.4s；`node_modules/base-paint` → Junction `D:\ilife\packages\base-render` |
| `node ..\..\node_modules\typescript\lib\tsc.js -b --force`（在包内跑） | exit 0，无输出；`dist/help/helpFile.js`＋`.d.ts` 已生成（20:31:30） |
| `node tooling/check-boundaries.mjs` | exit 0；20 行 `OK` ＋ `boundaries: PASS` |
| `node --test packages/skill-home/test/help-assets.test.mjs` | tests 13／pass 13／fail 0（票 5 的锁仍全绿） |
| `node --test test/scaffold.test.mjs` | tests 2／pass 2（该用例 `execFileSync` 跑 `check-boundaries.mjs`，同样绿） |
| `node .scratch/home-t189/render-probe.mjs` | exit 0（真渲染，见第三节） |

`pnpm-lock.yaml` 被安装改动 **3 行**（`importers.packages/skill-home` 段新增 `base-paint: specifier ^0.3.0 → version link:../base-render`）——预期内。

## 三、真渲染一次（临时脚本，产物与正文都不进上下文）

脚本 `.scratch/home-t189/render-probe.mjs`（不入库）→ 产物 `.scratch/home-t189/out/居家管家_HELP.html`，`now` 钉死 `2026-09-12 20:45`。

- **字节数 132318**；**页面标题 `<title>`＝`居家管家 · 使用手册(HELP)`**（与期望相符）；
- **分组数 8**（`items,space,outfit,stats,express,receipt,family,setup`；`link` 不在内）；**场景条目数 70**；
- `help-data` 段 `JSON.parse` **成功**：`skill_name=居家管家`、`subtitle=8 功能域 · 70 场景 · 版本 2.0 · 更新于 2026-09-12 20:45`、
  `groups=8`、`meta_blocks=help_summary,help_wake_words`、`version=2.0`、`recommendations` 键不存在；
- link 三条登记位 `link_overview/link_calorie/link_accounting` 均未上页；HTML 中「联动功能」零命中；
- 横幅四例：文件在 `hidden=true`／文件不在 `false`／判据抛异常 `false`／未传 `dbPath` `false`；真 `existsSync` 判据未建出任何目录；
- 同一 `now` 两次渲染**逐字节一致**（纯函数自证）。

## 四、`deprecated` 分组过滤怎么实现

`listedGroups()`：`HELP_GROUPS.filter((g) => g.deprecated !== true)`（只读引用、不 clone），过滤后为空即抛 `HOME_BAD_PAYLOAD`；
所有派生（`subtitle` 的域数／场景数、`meta_blocks[0]` 的注记、横幅 prompt 场景查找）一律吃**过滤后**的那份 ⇒ 主数 70 是数出来的，不写死。
注记行只在「骨架 > 实际列出」时渲染（`countNoteLine`）；骨架数取自同一份 `HELP_GROUPS` 的全量数（73），差值即「联动 3 条」。

## 五、门禁摘名：有没有空转 ＋ 怎么处理（编排方要求必须交代）

1. **会空转**：摘名后 `SKILLS_BASE_FROZEN = []`，原 `for` 与 `SRC_SCAN` 两条断言 0 命中、照样打印 PASS。
2. **补了等效断言**：新增 `MIGRATED_HELP_CONSUMERS`（**含被摘名的 `skill-home`**，编排方指出后补入），逐家断言「依赖闭包含 `base-paint`」＋「源码真的 import base-*」；另加一条兜底断言钉死 `src/help/helpFile.ts` 本身命中。实测 20 行 `OK`，含 `skill-home 已迁移消费方：源码真的 import base-*（实得 1 文件）`。
3. **负例实测**（隔离副本 `.scratch/home-t189/negtest.mjs`，不碰真仓）：删依赖 → exit 1；断掉 import → exit 1（`FAIL: … 源码真的 import base-*（实得 0 文件）`）⇒ **断言可红，不是装饰**。
4. **顺带修掉扫描器假命中**（原式无词边界＋可跨行）：注释里的 `pnpm --filter base-paint gen:help-shell` 被当成 `import 'base-paint…'` 命中；改成「逐行取引号里的模块标识符再逐字比较」（`base-paint-x` 不再误判）后，居家从「假命中 1」变「真命中 1」，负例才可能红。行为面兜底另见 `pnpm snapshot:html:check`（未在本票跑）。

## 六、未做与理由

- 未写 `manifest.ts`／`output.ts`／未改 `src/cli/cmd_read.ts`（属票 7）：本件**不读** `SKILLS_DB_PATH`，`dbPath` 与存在判据由调用方传；`resolveDbPath()` 自带 `mkdirSync`，判初始化不得直接用它——留给票 7 出口层。
- 未碰 `SKILL.md`（票 9）／`scripts/build-help.mjs`／生成物／模板源；未跑仓根 `pnpm build`／`pnpm test`。
- **「口径区写一行」落点存疑（留编排方拍板）**：A 路载荷里只有 `meta_blocks` 装得下说明文字，故该行落在 `meta_blocks[0].html` 第二段 `<p>`（两块 id 与 8 个分组 id 零碰撞 ⇒ 不上页，只作页面外消费）。若要求它在**页面上可见**，需另开渲染位（改公共层模板，出本图）。
- 票面取值表写「副标题 73 场景」，与裁决 §13／票面第 33 行「按实际列出派生 70」冲突：按后者（裁决优先）实现，副标题现为 **70**。
