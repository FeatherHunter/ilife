## Question

饼干记账的 15 条非 HELP 命令，怎么做到「原样调用就落一份整页并回 `delivery`」？

## 目标

给 `packages/skill-bill/src/cli/cmd_read.ts` 的交付段补**缺省落点**：非 HELP 命令不再只有给了 `--html` 才落页，而是**总是落一份整页**（`--html` 退化成显式覆盖写），stdout 顶层回 `delivery{mode,path,bytes}`。落点的目录与文件名主体**逐字照**〔饼干记账页面产物的落点与命名〕的定稿，命名只在一处定义。

判据（照 #843）：不给 `--html` 与给 `--html` 是**同一份正文**，差别只在落点；页面产物与 HELP 产物互不覆盖。

## 验收命令

```sh
# PowerShell：先把家目录指到临时目录
$env:USERPROFILE="<临时目录>"; $env:HOME="<临时目录>"
node packages/skill-bill/dist/cli/cmd_read.js bill.record.today
```

**现在（2026-09-22 真跑）**：`exit 0`、stdout 只有五字段 envelope、**无 `delivery`**、盘上无文件 → 假。

**修完**：stdout 顶层 `delivery{mode:"file",path:<绝对路径>,bytes:<n>}`；该文件存在、大小 ＝ `bytes`、含 `<html` → 真。

```sh
node tooling/check-delivery.mjs     # 饼干那一行由红转绿（探针票先落地）
```

变异自证：把落点通式改坏一处（例如去掉文件名主体）→ 必须变红；改回 → 必须变绿，两行机器读数写进证据件。

## 不许动的东西

- 页面外观与页内内容（快照／指纹件不改，本票只改「落哪、叫什么」）；
- HELP 三支交付口径（#144 冻结：缺省／速查／现找）；
- `--html` 仍是显式覆盖写；
- 命名规则不许写两份。

## 交付物路径

`packages/skill-bill/src/cli/cmd_read.ts` ＋ 落点通式件（家由定稿票定）＋ 同族 `test/` 用例 ＋ `SKILL.md` 说明面（若定稿票裁到）＋ `docs/skills/skill-bill/` 证据件。

## 遗留出口

命名定稿归本图〔饼干记账页面产物的落点与命名〕（阻塞本票）；探针归本图〔交付面探针：六家技能缺省落点与回执的常驻判据〕（阻塞本票）。

## 进度：0%

下一步：等定稿票与探针票落地。
