# 票 #191 对抗审查（A 席）：CLI 级交付锁

**裁决：通过 95/100**（A 覆盖 40/40 ｜ B 强度 31/35 ｜ C 纪律 24/25）

## 一、我自己的变异（独立取点，未照抄实施者两处）

- 取点：`packages/skill-home/src/help/manifest.ts:18`，`HELP_HTML_DIR_NAME` 由 `'home_manager_html'` 改一字为 `'home_manager_htm1'`。
- 实测：`npx tsc -b --force` → exit 0；`node --test test/help-delivery-190.test.mjs` → **tests 11／pass 5／fail 6**，红＝**①、①b、③、③b、③c、⑤b**。
- 代表输出：`落 <SKILLS_DB_PATH>/home_manager_html/` → `+ 'home_manager_htm1'` / `- 'home_manager_html'`；⑤b `actual: 0, expected: 5`（占位文件写在 `home_manager_html`，实写去了 `htm1`）。
- 复原后 sha256 ＝ `938E4F7E8DCC0DF28204E0B7AD37F9EA4AB57108FCDFBA501A63EB4C2609CDD9`，与变异前逐字节一致；重建后复跑 **11/11 绿**，`dist/help/manifest.js` 复验＝`home_manager_html`。
- 期间无他人改动痕迹：`src/cli/cmd_read.ts` sha 全程 `086287D7…A9C7` 不变；manifest 复原 sha 与实施记录两次变异所报值吻合。

## 二、变异顺带暴露的强度缺口（扣 B 4 分）

1. ④、⑥ 的「不得出现另一支产物／`.db` 数＝0」是**缺席式断言**：我这处落点目录名变异下 **④⑥ 仍全绿**（目录不存在 ⇒ `.some()` false、`dbCountOf` 0）。真名兜底只靠 ①:104-105。建议 ④⑥ 先断言目录存在再判缺席（fail-closed）。
2. ②:140-141 的前后缀期望 import 自共享层 `base-paint/help-shell`（＝仓内 `packages/base-render`）——不是被测包实现，**非循环**；但模板与期望同源，只锁「产物出自共享壳」这层语义。
3. 载荷阈值偏松：①:116 `data.total >= 88`（实测 91）、②:147 `groups.length > 0`；SKILL 说明面的 9 域／73 场景口径未锁（票 9 范围，可接受）。

## 三、非循环验收：通过

落点三值在用例内**写死逐字**（`test/help-delivery-190.test.mjs:30-36`＝`home_manager_html`／`居家管家_HELP`／`居家管家_速查表`）；整件 grep `manifest|dist/` 只命中注释（:4／:12／:14／:29），**无** `dist/help/manifest.js` 之类 import ⇒ 期望值不从被测代码读；时间戳由用例自带 `localStamp`(:85) 独立算。

## 四、票面覆盖面逐条（全覆盖，无缺口）

- 覆盖面1 文件名通式逐字＋父目录 → ①(:97-117)；同秒 `_2` 递补 → ③b(:187-206)
- 覆盖面2 共享模板前后缀逐字 → ②(:133-152)；覆盖面3 同秒并发 6 次独占 → ③(:154-185)
- 覆盖面4 两支互不串 → ④(:224-243)；覆盖面5 退出码矩阵 → ⑤(:245-267)＋⑤b(:269-277)
- 判据「改落点值 ⇒ 至少一条红」→ 我这处变异 6 红已独立成立；「删交付段」半支仍只有实施记录背书
- 票7 `q` 支无 `delivery`＋载荷命中命令 → ①b(:119-131)
- 票7 互斥／非法 `mode`／坏 `reuseHours`／非串 `q` ⇒ 2（三支一致）→ ⑤(:249-267)
- 票7 写失败 ⇒ 5 且 stdout 空 → ⑤b(:269-277)
- 票7 复用窗口回同一路径、`reuseHours:0` 落新件 → ③c(:208-222)
- 票7 产物目录 `.db` 数＝0 → ⑥(:279-294)；`delivery` 顶层只追加（五键序不变）→ ①b(:122-124)
- 票7 `--html` 仍出分节页 → ⑧(:296-313)

## 五、接线与越界

- 接线：`packages/skill-home/package.json` 的 `test` 串已加新件（原两件保留）；仓根 `package.json:13` test glob 含 `packages/skill-home/test/*.test.mjs`；`.github/workflows/ci.yml` 先 `pnpm build` 后 `pnpm test` ⇒ CI 以新鲜 `dist` 跑到。`node tooling/check-boundaries.mjs` → `boundaries: PASS`。
- 越界：`git diff --quiet -- packages/skill-home/src` → exit 0（无未暂存残留）；`git status --short packages/skill-home/src` **非空**，但 7 条全是已暂存的票 #190 交付件（`A`/`M`），非变异残渣。未改源码（变异按字节复原＋验 sha）、未 `git add`／`commit`、未跑仓根 `pnpm build`／`pnpm test`。
- 小瑕：用例件名用 `help-delivery-190.test.mjs`（票面「归票订正」把交付锁判给 #191）；实施记录写 314 行，实测 313 行（LF 计数 313、无 BOM、末尾有换行）。

## 六、打分

A 覆盖 40/40（12 条逐条有锁）｜B 强度 31/35（变异 6 红、非循环；扣 ④⑥ 缺席式断言 2、② 同源模板 1、阈值松 1）｜C 纪律 24/25（越界零；扣件名归属 1）＝ **95 → 通过**
