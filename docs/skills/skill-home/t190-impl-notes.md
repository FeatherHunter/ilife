# 票 #190 实施记录：出口与命名落盘（缺省＝HELP 文件，速查走显式 `mode`）

## 一、做了什么

- 新增 `src/help/manifest.ts`（26 行）：三个**落点值**——`HELP_HTML_DIR_NAME='home_manager_html'`／`HELP_FILE_STEM='居家管家_HELP'`／`LOOKUP_FILE_STEM='居家管家_速查表'`；只出值、不出函数（铁律五）。时间戳通式／`_N` 递补／独占写／复用窗口一概不住这里（唯一定义地＝共用件 `base-render/src/output/saveHtml.ts`）。
- 新增 `src/help/output.ts`（75 行）：薄封装 `deliverHomeHelp({explicit?,targetDir,stem,html,reuseMs?})` → `HtmlReceipt{mode,path,bytes}`（别名 `HomeHtmlDelivery`）。出口裁决＝`explicit` 优先且**覆盖写**、缺省走 `succession`（独占 `wx` ＋ `EEXIST` 递补）、带 `reuseMs` 走共用件复用窗口。写失败抛 `HomeRenderError('HOME_HTML_TOO_LARGE')`（既有错误类与码，不新增），**不降级**。
- 改 `src/help/index.ts`：只转发 `deliverHomeHelp` ＋ `type HomeHtmlDelivery`（常量不转发，收小导出面）。
- 改 `src/cli/cmd_read.ts`：新增 `dispatchHelp(params)`，`main` 里 `key==='home.help.lookup'` 走它（**开库之前**），其余 20 键照旧 `dispatch`；`dispatch` 里那个 `case` 改成「走到这里即路由坏了」的 `fail(1)`。三支冻结：缺省＝落 HELP 文件；`mode:"lookup"`＝速查表产物（分名）；`q` 支语义一字不动。`mode`＋`q` 互斥、非法 `mode` → `fail(2)`（照 bill `:116-117` 逐字）。**`--html` 支行为原样保留**（写 envelope 分节页；按 #187 §32「HELP 交付不走它」），只把那段三行渲染抽成 `sectionHtml()` 供速查支共用。路径只读取：`resolveDbDir()`（纯取 `SKILLS_DB_PATH`，不 `mkdirSync`）＋ `DB_FILENAME`，再传 `buildHomeHelpFileData(now,{dbPath})`——**不调**自带 `mkdirSync` 的 `resolveDbPath()`。

## 二、实际命令与实际输出

| 命令 | 结果 |
|---|---|
| `npx tsc -b`（`packages/skill-home` 内） | exit 0、无输出；`dist/help/manifest.js`／`output.js` 已生成 |
| `node tooling/check-boundaries.mjs` | `boundaries: PASS`；`skill-home 源码真的 import base-*（实得 3 文件）` |
| `node --test packages/skill-home/test/*.test.mjs` | tests 37／pass 37／fail 0（suites 6） |
| `node --test packages/skill-home/test/cli.test.mjs` | tests 7／pass 7／fail 0 |

## 三、端到端（`SKILLS_DB_PATH`＝临时目录；`node dist/cli/cmd_read.js …`）

1. **落点**＝`<tmp>\home_manager_html\居家管家_HELP_20260912_204405.html`，文件存在（PASS）；
2. **绝对路径** PASS；`bytes=132318` ＝实际 `statSync().size`；产物 `<title>=居家管家 · 使用手册(HELP)`、含 `help-data`；
3. 载荷 **`data.items=91`／`data.total=91`**（≥88 PASS）；顶层键 `version,skill,shape,key,data,delivery`（delivery 只追加）；`delivery` 键＝`mode,path,bytes`；
4. 产物目录 **`.db` 数＝0**（tmp 根亦 0），该目录只那一个 HELP 文件；
5. `mode:"lookup"` → `居家管家_速查表_20260912_204406.html`（与 HELP **分名**），`items=91`／`total=91`；
6. **复用**：窗口内再跑缺省 → **回同一路径**（`…_204405.html`），目录文件数仍 2（未新建）；`reuseHours:0` → 新件 `…_204406.html`。

另测：`q` 支无 `delivery` 且命中 `home.item.search`；`mode`＋`q` → exit 2；非法 `mode` → exit 2；写失败（落点被同名文件占位）→ **exit 5、stdout 空**（真失败不降级）；坏 `reuseHours` → exit 2。

## 四、超线报警（第四步）

`src/cli/cmd_read.ts` 现 **812 行**（LF 实测；改动前 741，本票 ＋71），超告警线 350 达 462 —— **已超线，需要根据规则进行重构。**
本票只搬票面要求的那一支（help 分派抬到开库前 ＋ 交付装配），`dispatch()` 未搬（票面写明「更大范围抽件不属本图，整包重排另立票」）。
拆法（供另立票）：① 本票新增的 `dispatchHelp`（约 45 行）整块搬 `src/help/dispatch.ts`；② 按域拆分派（物品／标签／盘点／位置／穿搭／统计／购物／票据／家人／HELP）；③ `parseArgs` 与 envelope 打印各一件。`manifest.ts`／`output.ts` 均在 350 内（26／75）。

## 五、第五步 · 交付对账

实际碰到：`packages/skill-home/src/help/{manifest.ts,output.ts,index.ts}`、`packages/skill-home/src/cli/cmd_read.ts` ＋ 本文件；探针在 `.scratch/home-t190/`（gitignore，不入库）。第一步清单逐行有着落，**偏差＝0**：未碰 `SKILL.md`／`scripts/build-help.mjs`／`base-combos`／`base-render`／`src/fetch/paths.ts`（只读用其出口）。

## 六、未做与理由

- **combo 登记**（`base-combos/combos.yaml` ＋ `gen-present` ＋ `build-help` 补锁）不在本票：见另一位在做的 `docs/skills/skill-home/t190-combo-notes.md`。
- 未跑仓根 `pnpm build`／`pnpm test`；未 commit（只 `git add` 自己的四个源码件）。
- `--html` 与 `mode:"lookup"` **未合一**：按 #187 §32「本图不动它、票 7 不得顺手砍；HELP 交付不走它」——合一须改票面写明理由，本票不做；`deliverHomeHelp` 保留 `explicit` 一支（两态与共用件对齐），今天出口不喂它。
