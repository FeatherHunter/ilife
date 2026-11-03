---
'dsh-bill-ilife': patch
'dsh-calorie': patch
'dsh-chef': patch
'dsh-home-ilife': patch
'dsh-life-pack': patch
'dsh-memo-ilife': patch
'dsh-schedule-ilife': patch
---

#1325 印章章状态按语言生成：`seals.yaml` 双语源＋生成器产出中／英两套章文案。

- `seals.yaml`：每个文本叶子改为 `{ zh, en }` 双语映射（中文值一字不改；`tier`／`seed` 仍是标量）；六个插件的 `seals` 统一改块样式。加一门语言＝每个叶子补一列＋生成器 `LANGS` 加一项＋跑 `node tooling/gen-seals.mjs`。
- `tooling/gen-seals.mjs`：校验每条双语文本齐全且非空；设计语言生成件新增 `SealLanguage`、`TIER_TEXT_BY_LANG`／`SECTION_LABEL_BY_LANG`／`SEAL_LABEL_BY_LANG`／`CLOSE_LABEL_BY_LANG`（并保留四个中文扁平别名）；六份章状态生成件改 `sealStates(product, language: 'zh' | 'en' = 'zh')`，中文分支与改动前逐字节相同。
- `dsh-life-pack`：新增 `src/seal-language.ts`（`sealLanguageOf` 从宿主 locale 服务快照/`getLocale` 取 `zh`／`en`，服务缺席或未知值回缺省中文）并从 `config-panel-api` 导出；`ConfigPanel`／`PanelBody`／`SealStamp`／`SealScroll`／`SealScrollDialog`／卷轴纸张方案全线透传 `language`，段标题分隔符英文用 `:`、中文仍 `：`，档位 tooltip 与「收卷」按语言取。
- 六个面板 `client.ts`：注册面板时 `const language = sealLanguageOf(getService('locale'))`，传给 `ConfigPanel` 的 `language` 与 `sealStates(SLOT_TITLE, language)`；中文宿主（当前桌面缺省）渲染与改动前一致。
- 验收：`node tooling/gen-seals.mjs` 幂等；`pnpm gen:check` 绿；`tsc -b` exit 0；seal 相关 4 测试件 50/50、面板/产物相关 11 件 117/119（2 件 pixel seam 依赖 gitignored `.scratch/1155-real-panel-prototype.html`，属既有环境缺口）；`node tooling/check-i18n-keys.mjs` `files=863 literals=102521 residue=0`。新增 `seal-states-1325` 断言默认中文逐字不变、`en` 三枚章英文不混中文。
