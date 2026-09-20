## Question

功能做完后，两处「登记面」会停在旧状态：① `packages/skill-chef/scripts/build-help.mjs:2,22-27` 把 `WAKE_TABLE` 快照进 `SKILL.md` 的标记块——票 2 补了 13 条老组名（37→50 条），但没有任何票重跑这份快照，DSH 里 AI 读到的仍是旧的 37 词表；② HELP 页有 **14 张卡**的 `status: '【待开发】'`（`src/help/sceneData.ts:84,87,90,99,110,113,144,145,150,153,156,161,169,172`），功能做完后没有任何票把它们翻成可用。**这两处怎么同步、怎么判对？**

## 目标

1. 重跑 `build-help.mjs`，让 `SKILL.md` 的唤醒词表与命令表和 `WAKE_TABLE`（50 条）**一致**。
2. 把 14 张卡的 `status` 从 `'【待开发】'` 改成空串（可用），并确认 HELP 页渲染出正确状态。
3. 写一条**一致性判据**（可跑、可红）：`SKILL.md` 快照 ＝ `WAKE_TABLE`；HELP 资产 status ＝ 各卡真实实现状态。

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- node docs/skills/skill-chef/t18-登记面对账.mjs` → 打印 `SKILL.md 词 50／HELP 待开发 0／不一致 0` 且 exit 0
- 反例（必跑）：手工从 `SKILL.md` 快照里删一条词 → 同一条命令必须 exit 1 并点名

## 不许动的东西

- 不改老件；不改 `WAKE_TABLE` 的语义（该表归票 2）。
- 不改 HELP 页契约（`base-paint/help-shell`）与 help 模板。
- 不改任何命令的对外行为。
- `SKILL.md` **只许改 HELP 标记块**（快照区）；其余说明面文字要改须另立票。

## 交付物路径

- 代码与资产：`packages/skill-chef/SKILL.md`（快照区）、`packages/skill-chef/src/help/sceneData.ts`（生成物，经生成器重出）、`packages/skill-chef/scripts/gen-help-assets.mjs`（若需改声明表）
- 器械与证据：`docs/skills/skill-chef/t18-登记面对账.mjs`、`docs/skills/skill-chef/t18-登记面.md`

## 遗留出口

- 若要顺带重写 `SKILL.md` 的其余说明面（用词、结构）→ 另立票。

## 进度：0%

下一步：等 7 张域票全关，再重跑快照并翻状态徽章。
