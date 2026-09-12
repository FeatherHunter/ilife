# 票 #192 整改记录（F12）　只碰 3 个点名件＋本文件

## A① npm 事实订正（先取证）

实测：`npm view skill-home version` → `0.1.0`；`npm view skill-home time` → `"0.1.0": "2026-09-07T04:25:34.745Z"`；`npm view skill-home dist.tarball` → `https://registry.npmmirror.com/skill-home/-/skill-home-0.1.0.tgz`。
⇒ **审查为真**：0.1.0 已发布；原文「尚未发布到 npm」是假事实。根因＝依赖 `"base-link-core": "workspace:^0.1.0"` 未改写 ⇒ 新装必 `EUNSUPPORTEDPROTOCOL`。

- `SKILL.md:159`：删「尚未发布」，改「`skill-home@0.1.0` 已发布（2026-09-07，registry 在册），但依赖 workspace: 未改写 ⇒ 上面两条新装必失败、npm 报 EUNSUPPORTEDPROTOCOL；重发前一律走本仓构建产物」——照 `skill-calorie/SKILL.md:205` 同形同口径。
- `SKILL.md:165`：同源假前提「（未发布，见上）」→「命令不写版本号（重发前钉了也装不上；npm 现值 `0.1.0`）」。
- `test/skills-export-47.test.mjs`：:23-26 注释前提改为「已发布但 workspace: 未改写 ⇒ 新装必失败 ⇒ 不钉版本」；:63 注释、:66 断言消息（「未发布到 npm 的包」→「未钉版本号的包」）同源，一并订正。

## A② `_N` 递补措辞（SKILL.md:23）

「（同秒已有同名件时尾缀递补 `_N`）」在缺省支不成立 ⇒ 改「缺省（24 小时内）重复触发回同一路径、不新建——需要每次落新件时传 `--params '{"reuseHours":0}'`（此时同秒冲突才走 `_2` 递补）」。

## A③ 补复用窗口行（SKILL.md:27）

HELP 交付节「- 这两支互斥」后新增一条，措辞逐字照兄弟五家（bill:117／calorie:191／memo-ilife:65／schedule:93）「反复读不再涨目录（#245）：一天内只留一份…」，末句按票面补「`reuseHours` 给坏值（非数／负数）exit 2」。

## A④ 判新旧对象（SKILL.md:40）

原文写死 `~/.agents/skills/skill-home`（本机无此目录，只有 bill／chef／memo-ilife／calorie）⇒ 改通用口径：安装点用 `<技能目录>` 占位（常见形如 `~/.agents/skills/<技能名>`，该处无同名目录＝装到了别处），并点明「链接＝同一份；拷贝才谈新旧，只能比 `SKILL.md` 哈希」。

## B ④⑥ fail-closed（packages/skill-home/test/help-delivery-190.test.mjs）

- ④(:227／:236)：两支各先 `assert.ok(existsSync(htmlDirOf(<dir>)))`，再判「另一支产物不得出现」。
- ⑥(:286)：先 `assert.ok(existsSync(htmlDirOf(dir)))`，再断产物目录 `.db`＝0。（⑥ 的 lookup／q 两支计的是 `SKILLS_DB_PATH` 根目录，`mkdtempSync` 必在，非缺席式，未加。）
- 变异：`src/help/manifest.ts:18` `'home_manager_html'`→`'home_manager_htm1'` → `npx tsc -b --force` exit 0（`dist/help/manifest.js` 确为该值）→ `node --test test/help-delivery-190.test.mjs` ＝ tests 11／pass 3／**fail 8**：①、①b、③、③b、③c、**④**、⑤b、**⑥**（审查基线 6 红，④⑥ 当时全绿 ⇒ 缺口已闭）。
- ④ 红点 `:227`：`AssertionError: 缺省支产物目录须存在（目录不在＝跑错了落点，不能按缺席放行）：…\home_manager_html`；⑥ 红点 `:286`：`AssertionError: 产物目录须存在（目录不在＝「0 个 .db」是缺席式空绿）：…\home_manager_html`。
- 复原：sha256 变异前 `938E4F7E8DCC0DF28204E0B7AD37F9EA4AB57108FCDFBA501A63EB4C2609CDD9` → 复原后**逐字相同**；`git diff --stat -- packages/skill-home/src` 空；重建复跑 **11／11 绿**，`dist/help/manifest.js` 复验 `home_manager_html`。变异未留盘。

## 收尾／未做

- 导出用例 `node --test test/skills-export-47.test.mjs` → tests 5／pass 5／fail 0；门禁 `node tooling/check-boundaries.mjs` → `boundaries: PASS`。
- `SKILL.md` LF（CR 0／LF 165）、无 BOM（首 3 字节 `45,45,45`）、`HELP-AUTO-START`／`HELP-AUTO-END` 仍在。
- 未做与理由：用例件名 `help-delivery-190.test.mjs` 锁归 #191，**不改名**（避免无谓 churn，仅此登记）；未跑仓根 `pnpm build`／`pnpm test`；未重启 DSH；未 `git add`／`commit`；未碰 `src/**` 其它件、`packages/base-*`、`packages/base-combos`。
