# #193 整改子代理 F1：工作记录（草稿）

## A 席要点（review-t193-A.md，88 分，通过＋2 条整改）
- A1：`.dsh-module-fallback\node_modules\skill-home` 与 `.agents\skills\skill-home` 写进同一段回滚说明（或标注票 11 范围）；§7 缺的探针脚本补齐或删「可复跑」。
- A2：对齐引用（#150 vs #143）；补一句：本地 `t193-body.md` 已被他人改为「进度：100%」，未发布 GitHub（`gh issue view 193` 仍 OPEN）。
- A §3.2：§5 清单与工作树不一致（漏 `t193-body.md`，`??` 应为 `A `）；§2.3「两次逐字段相同」是弱证据（realpath 落同一地址，证明不了安装态那一跳）。
- A §3.1：`.dsh-module-fallback\node_modules\skill-home` 当前不存在 → 实测（B 已证兄弟 5/5 有）。

## B 席要点（review-t193-B.md，77 分，整改后通过）
- B §3 反例 1：`src/index.ts:32` 条件抛改无条件吞错 → 7 条仍全绿 ⇒「他错重抛」零锁（用例 5 只断言不抛＋warn≥1）。
- B §7.1：7 条锁不进任何门（`package.json:45` test 只跑 smoke.test.mjs）。
- B §4：报告「会打红提供方」不成立（提供方正则接受中文名）；真凭据＝宿主 `dsh-skill/lib/index.js:17` `SKILL_NAME` 正则 ＋ `:454` 抛；`test/skills-export-47.test.mjs:21` `PKGS=['skill-calorie']` 今天不含 skill-home。
- B §6：用词纪律——报告 9 处「装机」、报告 2 处＋body 1 处「落地（＝实施）」。
- B §7：② 升为确定项（兄弟 5/5 有、home 独缺、链接目标已存在）；③ `~/.agents/skills` 降为备选（schedule 不在其中也已装齐）。
- B §7.4：索引里混别家件（chef 两文档已 staged 等）→ 报告补分区提交提醒。
- B §6 五步：第一／二步无（0 评论；map-183-body.md:22 有编排句可部分豁免）；第四步不触发（本包无 AGENTS.md、无告警线数字）；第五步只近似。
