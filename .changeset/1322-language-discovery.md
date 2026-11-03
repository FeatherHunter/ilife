---
'base-entries': patch
'base-link-core': patch
'base-paint': patch
'dsh-bill-ilife': patch
'dsh-calorie': patch
'dsh-chef': patch
'dsh-home-ilife': patch
'dsh-life-pack': patch
'dsh-memo-ilife': patch
'dsh-schedule-ilife': patch
'skill-bill': patch
'skill-calorie': patch
'skill-chef': patch
'skill-home': patch
'skill-memo-ilife': patch
'skill-schedule': patch
---

#1322 加语言不改代码：词条清单与语言清单由生成器派生（US1）。

- 新增 `tooling/entry-languages.mjs`：扫描 `packages/*/src/entries/<lang>.ts`，校验语言标签形状（`LANGUAGE_TAG`）、跳过保留名，产出包→语言→文件清单；生成器与两道门共用这一份事实源。
- 新增 `tooling/gen-entry-catalogs.mjs`：每包生成 `src/entries/catalog.generated.ts`（静态 import 各语言表，导出 `ENTRY_TABLES`），并生成 `packages/base-link-core/src/config/languages.generated.ts` 的 `AVAILABLE_LANGUAGES`；`--check` 对账缺失/过期文件。加语言＝加词条文件＋`pnpm gen`，14 个包不再手写语言键。
- `packages/base-link-core/src/config/language.ts`：删手写 `['zh','en']`，改为 import 生成清单并 re-export；`LanguageTag` 从清单派生。
- 门禁：`tooling/i18n-langs.mjs` 的 `LANGUAGES` 改由同一扫描派生；`check-i18n-entries` 按包发现语言（只加了 ja 的包判 ja，其它包回退 zh，不误报缺表；新增第 ⑬ 条自证「单包第三语言」）；`check-i18n-keys` 未登记语言的语域按英文名册兜底。
- 评审加固：共享词条生成器（`tooling/gen-shared-copy.mjs`）的语言列改从 `tooling/shared-copy.json` 派生（原先又一处手写 `['zh','en']`）；排印门对未登记名册的语言显式报 `MISSING-REGISTER` 且不崩在读数行；key 残留门对未登记名册的第三语言列按「不得出现中文」保守判；词条读取对名册外语言且无词条文件的情况显式抛（不静默读成零张表）；缺词条门主输出新增 `COVERAGE` 行报语言×包覆盖，并新增第 ⑭ 条自证「判据包无表失明」。
- 验收：临时给 plugin-manager 加 `ja.ts` 后 `pnpm gen:check`、两道门、params 门、`tsc -b` 全通过（entries `ja=144 missing=0`、params `pairs=19414 mismatch=0`），删除后回到 `languages=zh+en`、`entries files=863 keys=19082 missing=0`、`keys residue=0`；中文产物快照与 master 一致。
