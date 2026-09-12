# 审票 #190 对抗式复核（审查员 A）

**裁决：通过（≥85）。总分 86/100 ＝ A 36 ＋ B 32 ＋ C 18。**
证伪方式：不读结论、自己把端到端重跑一遍。临时库＝`D:\ilife\.scratch\t190-A-probe\db`（复核后已删）；未改任何源码、未 `git add`／commit、未跑仓根 `pnpm build`／`pnpm test`。

## 一、七项逐项结果（命令 ＋ 实际输出）

**1 包内类型检查** `Push-Location packages\skill-home; npx tsc -b; Pop-Location` → **exit 0、无输出**；`dist\help\manifest.js`／`output.js` 已生成（2026/9/12 20:43:50）。✓

**2 端到端真跑（缺省支）** `node dist\cli\cmd_read.js home.help.lookup` → **exit 0**：
- 落点 `…\db\home_manager_html\居家管家_HELP_20260912_204653.html`，文件**存在**；主体 `居家管家_HELP` ＋ `YYYYMMDD_HHMMSS` ＋ 扩展名 `.html`，父目录 `home_manager_html` 逐字合规。✓
- `delivery.path` **绝对**（`isAbsolute=true`）；`delivery.bytes=132318` ＝ 实际 `statSync().size=132318`。✓
- 产物 `<title>=居家管家 · 使用手册(HELP)`，含 `<script id="help-data">`。✓
- `data.items=91`／`data.total=91`（≥88）；顶层键 `version,skill,shape,key,data,delivery`——既有五键序不变、`delivery` **只追加**。✓
- **产物目录 `.db` 数 ＝ 0**（自己 `readdirSync` 数：该目录只有那 1 个 `.html`；`SKILLS_DB_PATH` 根亦 0、只有 `home_manager_html`）⇒「看帮助」确实没建库。✓
- **可打开**：头 200 字节 `<!DOCTYPE html>…<style>`、尾 200 字节 `…</script></body></html>`；全页 `<link>` **0** 个、`<script src>` **0** 个、`src|href=http(s)://` **0** 处（3 个 `<script>` 全内联）。✓

**3 速查支** `--params '{"mode":"lookup"}'` → `居家管家_速查表_20260912_204736.html`（与 HELP **分名**）、路径绝对、`bytes=12819`＝实际 size、`items/total=91/91`、仍带 `delivery`。✓

**4 冻结支** `{"q":"查物品"}` → exit 0、**无 `delivery`**、五键、data 命中 `home.item.search`（与 `git diff HEAD` 里被删的三行逐字同式）；`{"mode":"lookup","q":"…"}` → **exit 2**、stdout 0 字节；`{"mode":"scan"}` → **exit 2**。✓

**5 复用窗口** 窗口内再跑缺省 → 回**同一路径** `…_204653.html`、目录未增件；`{"reuseHours":0}` → 新件 `…_204735.html`。✓

**6 失败面** 把 `<库>\home_manager_html` 用**同名普通文件**占位 → **exit 5**、**stdout 0 字节**、stderr `ERR 5: [skill-home] HELP 落盘失败：…（EEXIST）`，不降级、不留残件；速查支同形。✓

**7 `--html` 支没被砍** `--html D:\…\html-branch.html` → exit 0，写出 `<title>居家管家 HELP` 的**分节页**（12819 字节）。✓

## 二、与实施记录对不上的数字（只一处）

- 记录 §四「`cmd_read.ts` 现 **812 行**（改动前 741，本票 ＋71）」→ 实测 **811 行**（`git diff HEAD --stat` ＝ 83 增／13 删，净 **＋70**；前值 741 正确）。差 1，不改「超告警线 350」的结论。另：`node --test packages/skill-home/test/*.test.mjs` ＝ tests 37／pass 37／fail 0（suites 6）、`cli.test.mjs` 7/7、`node tooling/check-boundaries.mjs` → `boundaries: PASS`（exit 0）＋「skill-home 源码真的 import base-*（实得 3 文件）」——**逐字复现**。
- 其余 13 项数字（132318／91／37／7／exit 5／分名／复用同路径）全部复现，**未发现夸大**。

## 三、缺陷（各附命令 ＋ 实际输出）

- **D1 类型错静默落盘**：`--params '{"q":123}'` → `exit=0  keys=…,data,delivery  delivery=居家管家_HELP_20260912_204735.html`。老代码此入参只回全量列表、**零写盘副作用**；类型错的 `q` 现在被当「缺省支」，既没报错也没命中清单，白落一份文件。
- **D2 参数面不对称**：`{"q":"查物品","reuseHours":"x"}` → **exit 0**（坏参被忽略）；`{"reuseHours":"x"}` 与 `{"mode":"lookup","reuseHours":"x"}` → **exit 2**。同一坏参因走哪支两副面孔（`helpWindowOrFail` 只在交付两处调用）。
- **D3 索引缺件（提交即断）**：`git ls-files -- packages/skill-home/src/help/` 只有 `helpFile.ts,index.ts,lookup.ts,manifest.ts,output.ts`；工作区另有 `helpAssets.ts`／`scenarios.yaml`（git status `??`），而**已 stage 的 `helpFile.ts:53` 正 import `./helpAssets.js`** ⇒ 按当前索引提交，#190 的包 `tsc -b` 起不来。
- **D4 台账未回填**：`packages/skill-home/AGENTS.md:10,11` 仍写「`src/cli/cmd_read.ts`（741 行）…归票 7 #190 处置」；本票已把它改到 811 行，数字须更新。
- **D5 触发面描述仍旧口径**：`SKILL.md:3` 仍写「出一份居家管家速查列表」，未提「缺省落一份 HELP 文件」（兄弟同期票已改：`packages/skill-bill/SKILL.md:3`「缺省落一份老技能同款 HELP 文件」）。
- **D6 复用窗口无过期标记**：24h 内（`HELP_REUSE_DEFAULT_HOURS=24`，`saveHtml.ts:69`）内容变更后仍回旧页，用户无从分辨新旧。

## 四、必须整改项

1. **D3（最高优先）**：提交前先 `git add packages/skill-home/src/help/helpAssets.ts packages/skill-home/src/help/scenarios.yaml`（及 `scripts/gen-help-assets.mjs`），否则包构建断。
2. **D1**：`q` 给了非字符串应 `fail(2)`，不得静默转缺省支落盘。
3. **D2**：把 `helpWindowOrFail(params)` 抬到三支分派之前，参数校验单点。
4. **D4／D5**：回填台账行数；`SKILL.md:3` 描述改成「缺省落一份 HELP 文件 ＋ 绝对路径」。D6 可留待后续票（与 bill／calorie 同形，非本票新债）。

## 五、打分

- **A 目标达成 36/40**：缺省真出文件 ＋ 绝对路径 ＋ 可打开，端到端成立；扣 4＝D5 触发面文档仍写旧行为。
- **B 证据真实性 32/35**：14 项数字 13 项逐字复现；扣 3＝行数 812／＋71 与实测 811／＋70 不符（无夸大项）。
- **C 风险与失效面 18/25**：exit 5 不降级、绝对路径、只读不建库、无外部引用都真；扣 7＝D1／D2／D3／D6。
- **合计 86/100 ⇒ 通过**（按第四节改完更稳）。
