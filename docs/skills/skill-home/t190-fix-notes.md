# 票 #190 整改记录（F11，按 `review-t190-A.md` 第三、四节）

只碰 `packages/skill-home/src/cli/cmd_read.ts`、`packages/skill-home/AGENTS.md`、本文件。未碰 `SKILL.md`／`build-help.mjs`／`base-combos`／`base-render`／`skills-export-47` 用例；未 commit。

## D1 `q` 非字符串被静默当缺省支（已改）

- 改前 `const q = typeof params.q === 'string' ? params.q : undefined` ⇒ `{"q":123}` 掉进缺省支：exit 0 且白落一份 HELP 文件（老代码此入参零写盘副作用）。
- 改后 `q` 给了但非字符串 ⇒ `fail(2, '参数 q 须为字符串（收到 number）：q＝现找关键词')`（`cmd_read.ts:91-94`）。
- 实测 `--params '{"q":123}'` → **exit 2**、stdout 0B、stderr 人话、产物目录件数 `no-dir → no-dir`（未新增任何文件）。

## D2 参数面不对称（已改）

- 改前 `helpWindowOrFail(params)` 只在两个交付支里调用 ⇒ 同一个坏 `reuseHours` 因走哪支两副面孔（`q` 支 exit 0 静默忽略）。
- 改后换算抬到**三支分派之前单点跑**（`cmd_read.ts:97-98`），两支 `deliver` 直接用算好的 `reuseMs`。
- 实测三态一致，exit 2 且 stderr 逐字相同（`ERR 2: [base-paint] reuseHours 非法（"x"）：须为非负小时数`）：
  - `{"q":"查物品","reuseHours":"x"}` → 2（**改前 0**）
  - `{"reuseHours":"x"}` → 2
  - `{"mode":"lookup","reuseHours":"x"}` → 2

## 正例回归（未破）

- 缺省支（无参）→ exit 0、出 `居家管家_HELP_20260912_205300.html`、`delivery.path` 绝对、132318 字节、`data.total=91`。
- `{"mode":"lookup"}` → exit 0、出 `居家管家_速查表_20260912_205301.html`（与 HELP 分名）、12819 字节。
- `{"q":"查物品"}` → exit 0、stdout 496B、五键、**无 `delivery`**、`data.total=2`；库根 0 件（「看帮助」不建库）。

## D4 台账回填（已改）

- `AGENTS.md:10,11`：`cmd_read.ts` 741 行 → **818 行（超 468）**；`git diff HEAD --stat` 实测 **90 增／13 删**（净 ＋77）。归属说法保留「归票 7 #190 处置」，改成「本票已按其范围处置（只抽 help 一支），**更大范围重排另立票**」。

## D3 索引复核（只核，未改内容）

- `git ls-files -- packages/skill-home/src/help/` ⇒ 六个 ts 件 ＋ `scenarios.yaml`，含 `helpAssets.ts`／`scenarios.yaml`；生成器三件与锁用例亦为 `A`。
- `git status --short packages/skill-home` ⇒ 无 `??` 残留，无需补 add。
- 本票新改的两件按索引一致性 `git add`（`cmd_read.ts` 原 `MM`、`AGENTS.md` 原 `AM`——索引里仍是改前版本）；**未 commit**。

## 未做（编排方已裁）

- D5（`SKILL.md:3` 仍写「出一份速查列表」）＝票 9 #192「SKILL.md 说明面」的交付面，本票不碰 `SKILL.md`；D6（复用窗口无过期标记）留后续票，与 bill／calorie 同形，非本票新债。

## 自证（实际命令与实际输出）

- `Push-Location packages\skill-home; npx tsc -b; Pop-Location` → exit 0、无输出。
- `node tooling/check-boundaries.mjs` → `boundaries: PASS`（exit 0）。
- `node --test --test-reporter=tap packages/skill-home/test/*.test.mjs` → `# tests 37`／`# pass 37`／`# fail 0`（suites 6）、exit 0。`cmd_read.ts` 现 **818 行**（UTF-8 真实行数、LF、无 BOM）；改动前 staged 版 811 行。
