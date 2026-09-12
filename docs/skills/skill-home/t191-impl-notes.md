# 票 #191 实施记录：锁 · CLI 级用例（真 spawn 出口）

## 一、做了什么

- 新增 `packages/skill-home/test/help-delivery-190.test.mjs`（314 行／**11 用例**）：**只经真 spawn**（`dist/cli/cmd_read.js` ＋ 临时 `SKILLS_DB_PATH`），不直接调模块。落点值／名字通式在用例里**写死逐字**（**不**从 `dist/help/manifest.js` 取）——否则改实现点会同时改期望值，锁变成同义反复、变异自证也测不出来。
- 覆盖（票面逐条）：① 名字通式逐字（`居家管家_HELP`／`home_manager_html`／`YYYYMMDD_HHMMSS`，本地时区窗口 ±2s）＋ 同秒 `_2` 递补（先占位本体名逼出）；①b `delivery` 顶层只追加（键序 `version,skill,shape,key,data,delivery`）＋ `q` 支无 `delivery`；② 壳层锁（`<title>` 逐字 ＋ `HELP_SHELL_PREFIX/SUFFIX` 前后缀逐字 ＋ `help-data` 载荷）；③ 同秒并发 6 次（`reuseHours:0`）六个互异落点、槽位从本体起连续；③c 复用窗口回同一路径、`reuseHours:0` 落新件；④ 两支互不串（缺省目录无速查表件／`mode:"lookup"` 目录无 HELP 件）；⑤ 退出码矩阵（正例 0；`q`+`mode`／非法 `mode`／坏 `reuseHours`（非数、负数）／非字符串 `q`（数、数组）⇒ 2，stdout 恒空、stderr 带 `ERR <code>`）；⑤b 落点被同名**文件**占位 ⇒ 5 且 stdout 空；⑥ `.db` 数＝0（根目录＋产物目录，三支各验）；⑧ `--html <路径>` 仍出分节页（含非 help 键对照）。
- `packages/skill-home/package.json` 的 `test` 串加进新件（保留既有两件）：`node --test test/help-assets.test.mjs test/help-delivery-190.test.mjs ../../test/scaffold.test.mjs`。仓根 test glob 已含 `packages/skill-home/test/*.test.mjs`，CI 会跑到。

## 二、实际命令与实际输出

| 命令 | 结果 |
|---|---|
| `npx tsc -b --force`（`packages/skill-home` 内） | exit 0、无输出 |
| `node --test packages/skill-home/test/*.test.mjs` | **tests 48／pass 48／fail 0**（suites 6；本票前为 37——＋11） |
| `node --test test/help-delivery-190.test.mjs`（包内，连跑 4 轮） | 11／11 绿 ×4（无抖动） |
| `node tooling/check-boundaries.mjs` | `boundaries: PASS` |

## 三、变异自证（两次红 ＋ `tsc -b --force` 复原后全绿）

| # | 变异 | 红点 | 复原 |
|---|---|---|---|
| ① | 把 `src/cli/cmd_read.ts` 的交付段（原 `:797-805`）整块注释掉 → `tsc -b --force` exit 0（无 `noUnusedLocals`，编译得出来） | **11 用例 10 红**：①（`delivery.path` 取不到）、①b（键序 actual 五键 ≠ 期望六键 `…,delivery`）、②、③、③b、③c、④、⑤b（**exit 5 → actual 0**）、⑥、⑧。留绿＝⑤（正例仍 0、参数错仍 2） | sha256 `086287D7…A9C7` **回原值** → `tsc -b --force` → 11/11 绿 |
| ② | `src/help/manifest.ts:21` 落点值改一字：`'居家管家_HELP'` → `'居家管家_HELQ'` | **11 用例 5 红**：①（`文件名通式逐字：居家管家_HELQ_20260912_205940.html`）、③b、③c、④、⑧ | sha256 `938E4F7E…9CDD9` **回原值** → `tsc -b --force` → 11/11 绿（`dist/help/manifest.js` 复验＝`居家管家_HELP`） |

**判据落地**：删掉交付段 ⇒ 10 条红；改落点值 ⇒ 5 条红。工作区 `git diff -- packages/skill-home/src/{cli/cmd_read.ts,help/manifest.ts}` **为空**（改动没留在盘上）。

## 四、纪律对账

- 只碰：`test/help-delivery-190.test.mjs`（新件）、`package.json`（test 串一行）、本文件。**`src/**` 零残留**（sha 逐件回原值 ＋ diff 空）。
- 未碰 `SKILL.md`／`scripts/build-help.mjs`／`packages/base-*`／`packages/base-combos`；未跑仓根 `pnpm build`／`pnpm test`；未重启 DSH；未 commit。探针在 `.scratch/home-t191/`（gitignore）。

## 五、旁证、偏差与未做到项

- **并行施工**：验证期间观察到另一作业在临时改 `src/help/manifest.ts`（`dist` 里一度出现 `居家管家_HELQ`，我这边复跑出现假红）——已按纪律**干净重建后复验**，非本票改动、未在盘上残留。
- **旁系红**：`test/scaffold.test.mjs` 曾红（快照 `0.1.0@3505369b…` ≠ 工作区 `0.1.0@ba40de0c…`），成因＝`packages/base-combos/{combos.yaml,src/present.ts}` 的工作区改动（非本票）；该侧重写 `skill.snapshot.json` 后 `--check` → OK。快照 sha 输入不含本票任何文件，可证与本票无关。
- **实测偏差（按实测锁，未自作主张）**：`--html` 支在本包是「写分节页 ＋ 缺省交付照落 HELP 件」的双产物（`main` 单点写 `--html`，未短路交付支）；对账 ① `data.groups` 实为 8 域／70 场景（SKILL 说明面的「9 域／73 场景」口径不同）；`data.total＝91` 按 `>=88` 松锁，免得锁死内容资产（票 9 在动）。
- **未做到项**：无票面遗漏。`--html` 与「缺省交付」的双产物语义对齐按票面（#187 §32／本票「不属本票」）**不做**。
