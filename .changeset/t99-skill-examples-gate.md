---
'skill-calorie': patch
---

#99（图 #63）SKILL.md 示例可执行门：`build-help.mjs` 补齐 #41 的 18 个 view 键示例（参数逐字取自 `cli-smoke-t41.test.mjs` 的 CASES），
`default` 由「静默返回无参命令」改为**抛错**（新键漏补示例即生成器失败），并新增 `renderSkillMd()` ＋ `isMain` 守卫（被 import 时不再重写受跟踪的 `SKILL.md`，消除 `pnpm test` 写盘路径）。
新增生成期门 `packages/skill-calorie/scripts/check-examples.mjs`（script `pnpm help:examples:check`，已接入 CI）：SKILL.md AUTO 块「例」列**逐行 spawn 真 CLI 断言 exit 0**，另断言产物新鲜／行数==组合键数且每键恰一行／`--params` 可 JSON.parse／envelope `key` 与行 key 一致；白名单为空，禁止删示例或放宽断言。
实测：示例 99/99 exit 0（修前 96/99），四门 exit 0，canonical `pnpm test` 失败集新增 0（白名单 diff 0 行），变异自证 5 处红→还原→绿（含 2 处 src 级）。证据：`docs/research/t99-examples-gate.md` ＋ `docs/research/t99-probe-examples.mjs`。
