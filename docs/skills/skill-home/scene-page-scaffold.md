# 场景页脚手架（地图 #797 票 8，issue #805）

11 张域票开工第一步就是跑它，**不许手抄样板**：

```sh
node packages/skill-home/scripts/new-scene-page.mjs <域> <页族>  # 单族（幂等，同输入同输出）
node packages/skill-home/scripts/new-scene-page.mjs --all        # 一次生成全部在役页族（46 族）
node packages/skill-home/scripts/new-scene-page.mjs --check      # 只比对（不一致 exit 1 并点名）
node packages/skill-home/scripts/new-scene-page.mjs --list       # 列出 46 族
```

## 为什么是脚手架而不是样板

两席对抗式审查的结论（A-P1-8）：「照抄样板」是软拷贝——第三个 HITL 门把并发饿死，
11 张票各抄一份迟早走散。本票把同形收敛成机器：形状只由生成器说一次，
域票只填内容、不再造文件。

## 事实源与产出

事实源只有一处：契约附录 `docs/skills/skill-home/scene-pages-contract.appendix.json`
（46 族／70 场景／必需块／写集）。生成器每次全量重写，不做增量合并，
手改产出下次即被覆盖。

产出（一族两文件＋一张登记表，共 93 个文件）：

- `templates/<域>/<族>.html`（16 行壳，三标记 `SHARED-CSS／SHARED-HELPERS／CONTENT` 各恰 1 次，
  与既有 21 模板同形；子目录不干扰 `loadTemplate` 的平铺装载）；
- `src/<域>/pages/<族>.ts`（装配入口 `renderFamilyPage`、空态与异常态位、
  数据形状声明 `PAGE_META`、必需块原文 `REQUIRED_BLOCKS`；对外恰 4 个导出）；
- `scripts/lib/page-blocks.mjs`（生成物：族→必需块登记，
  `blocksFor` 未知族抛错、`familiesOf` 按域列族，供票 6 结构判据件转录消费）。

页模块只走渲染门（`../../render/index.js` 的 `fillTemplate／renderEnvelopeHtml／escapeHtml`）
与模板自读（相对自身路径），不碰共用件与派生件（归票 3）。

## 装配契约测试

`packages/skill-home/test/scaffold.test.mjs`（46 族逐族，不断只跑 lint）：

- 真命令链：每族跑附录代表场景的（命令，预设）＋必需槽位（种子 3 件物品＋购物＋家人＋盘点＋备份），
  exit 0 才算过；导入恢复走预告＋确认两步；
- 块位齐：四组 `data-block` 与每块原文（转义后）在位，壳标记无残留；
- 三方对账：页模块／登记表／附录逐族 `deepEqual`，两层解析现场复核。

验收命令：

```sh
node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/scaffold.test.mjs
```

读数：48/48 绿（2 门＋46 族），约 5 秒。

## 变异自证（两行读数）

- 反例：删 `src/items/pages/detail.ts` 的 `sectionOf('status', …)` 一行并重建，
  `items/detail` 变红并点名 `缺块组：status`（tests 1／fail 1）；
- 正例：跑 `new-scene-page.mjs items detail` 恢复并重建，全量回到 48/48 绿。

## 遗留出口：仍需人裁形状的页族

骨架覆盖全部 46 族的形与槽位；内容 composer 仍归域票。按附录 `pageType`，
24 个「混合」族的信息密度最高（册子写 27 是含联动与 legacy 的旧口径，附录实测 24），
域票填内容时须人逐族定主次与折叠（mode 分流已在附录，视觉主次未定）：
`receipt`、`tag_manage`、`category_manage`、`photos`、`inventory_diff`、
`location_manage`、`suggest_storage`、`outfit_picker`、`wardrobe_analyze`、
`travel_trip`、`trip_outfit_plan`、`idle`、`expiring`、`list`、`missing`、
`express`、`stock`、`purchase_records`、`warranty`、`certificates`、`accounts`、
`family_borrow`、`family_members`、`health_report`。
这批不进契约补丁流（族边界不动），只在域票内逐页留视觉复核记录。

## 给下游的硬约束

- 域票只改自己那几族的两文件＋自己的测试说明；改形状先回写契约走补丁流，不私自放宽；
- 登记表只许生成器写，票 6 转录时只加 `pages[]` 条目；
- 发版注意：`packages/skill-home/package.json` 的 `files` 目前只含 `templates/*.html`
  （子目录不在内），归票 3／发版票顺手补，本票不碰（共用位归票 3）。
