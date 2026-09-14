---
"skill-calorie": patch
---

feat(445): 告警线门从 `REQUIRED` 硬清单扩成「扫描面＋台账逐件对账」——盘上多一个未挂号的超线件、或台账某行行数与实况不符，都必红（判据 ①②③ 沿 #354 原样，新增 ④ 台账解析源／⑤ 陈化逐行／⑥ 漏报逐件／⑦ 冻结挂号值未被改写）；**红门自带仓内修法**：`check-warning-line.mjs --sync`（落盘同步台账）与 `--sync --dry`（只演练、不落盘），只改台账块、断言全过才落盘、回读自证 `SYNC-VERIFY ok`，红条末段直接点名这条命令；**生成物按生成器自己的输出声明剔出扫描面与台账**（判据 ⑧：读 `scripts/gen-*.mjs` 的 `const OUT = join(SRC_DIR, …)` 与 `targets` 里的 `path: join(…)`，不手写名单；抽不到输出声明即红，带「勿手改」印记却没被认出即红）——`pnpm gen` 重跑 `src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts` 不再逼无关的票同步台账；`packages/skill-calorie/AGENTS.md` 台账改成「件／挂号值／当场实测／结论」四列并写明两种口径来历，当场对齐实况——扫描面 275 件、超线 20 件（`#354`／`#398` 在册只有三件，「其余均在 350 以内」的整句结论已改正为逐件口径）
