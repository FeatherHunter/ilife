Part of #797

## 背景（#817 收口现场实测，前因后果）

#817 跑完 70 条场景端到端后实测到一处断口：`home-cmd-read` 的缺省落盘走的是
`templateFor(key)`（21 张平铺模板）＋`renderEnvelopeHtml()`，而 46 个页族的模板
（`templates/<域>/<族>.html`）与装配件（`src/<域>/pages/<族>.ts` 的 `renderFamilyPage`）
在**运行期没有任何调用点**（`src/render/pageFamilies.ts` 的两层解析只被测试引用）。

实测读数：`home-cmd-read home.item.search --params '{}'` → `delivery.path` 指的那份 HTML
**922 字节、无 `data-block=`**（旧分节页）；同一条场景的族页是 **4,967 字节**。

后果：地图 #797 的 Destination 第一句「在 DSH 里说出一句居家管家唤醒词 → 拿到**那份页面**的
绝对路径」只完成一半 —— 70 张场景页存在，但唤醒词打不到它们。

前因：票 4（#801 落盘）先于票 8（#805 页族骨架）与 11 张域票落地，两截各自完好，
中间这一步**没有任何票拥有**。按地图「变更协议」当场补票。

执行：本票由 #817 收口当场执行（维护者裁「A · 本图收口当场修」），完成后关闭本票，
并在 `docs/skills/skill-home/scene-pages-closeout.md` 登记证据。

## 目标

① 数据与过程命令（20 键；HELP 键三支冻结不动）缺省落盘改落**族页**：
`resolvePageFamily(key, params)` → 按域装入 `dist/<域>/pages/<族>.js` → `renderFamilyPage(env)`；
② 解析不到族（`UNKNOWN_FAMILY`）或族页装入／渲染失败 → 降级现有的 21 模板分节页，
并在 stderr 记一条 note（不静默、不改退出码）；
③ `--html <路径>` 显式出口与缺省出口**同一份内容**（显式优先、单回执的既有语义不动）；
④ `packages/skill-home/package.json` 的 `files` 补族页模板子目录
（现只含 `templates/*.html`，子目录不发版 ⇒ 装上读不到模板）。

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- pnpm --filter skill-home test` → exit 0；
② 真链抽查：隔离家目录跑若干场景，`delivery.path` 指的文件含 `data-block=`（＝族页）
且大小 ＝ 回执里的 `delivery.bytes`；
③ `pnpm gen:check` → exit 0（派生件与源码一致）；
④ 负向证据：把某族模板临时改名，重跑该场景 → 落回分节页、stderr 有降级 note、退出码仍 0；
改回后重跑恢复族页。

## 不许动的东西

21 张旧平铺模板与 `renderEnvelopeHtml()`（留作降级路径，一字不改）；
HELP 键三支（缺省／速查／q）及它自己的 `--html` 语义；命令键名与出参形状；
判据件与生成器的规则（要改回写票 6／票 7）；生产库与生产产物目录。

## 交付物路径

代码：`packages/skill-home/src/cli/cmd_read.ts`、`packages/skill-home/src/render/**`（新增一件）、
`packages/skill-home/package.json`、`packages/skill-home/test/**`（新增用例）；
文档与证据：`docs/skills/skill-home/`。

## 遗留出口

页族装入是动态路径：若某域的族名与目录不一致（契约附录 `families[].domain` 与落盘目录走散），
由新增用例扫盘对账，发现即回写票 2。

## 进度：100%

已交付并关闭（提交 `5a20e18e`）。判据由独立席位于 2026-09-22 在 HEAD `5f14debc` 逐条复跑成立：

- ① 包内测试：全量级 `node --test packages/skill-home/test/*.test.mjs` → **312/312**（含本票新增 11 例）；票面原命令 `pnpm --filter skill-home test` → 75/75 exit 0（该脚本只覆盖 5 个文件；本票用例在仓根 `pnpm test` 那道门的 glob 内真跑）。
- ② 真链抽查：隔离家目录按契约附录 70 条场景逐条跑，exit 0 的 **39 条全部落盘即族页 39/39**（含 `data-block=`、盘上字节 ＝ 回执 `delivery.bytes`）；其余 31 条要多前置实体 id／主密钥／必填参数，属抽查范围外。
- ③ `pnpm gen:check` → exit 0。
- ④ 负向证据：`templates/items/search_list.html` 临时改名 → 降级 21 模板分节页（无 `data-block=`）、stderr 有降级 note、退出码仍 0；改回后重跑恢复族页。

下一步：无（收口票 #817 会把本票读数带进终审包）。复核器入仓：`docs/skills/skill-home/t872-复核.mjs`（跑法 `node docs/skills/skill-home/t872-复核.mjs`）。
