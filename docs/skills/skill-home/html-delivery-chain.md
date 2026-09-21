# 数据页交付链（地图 #797 票 4 ＝ issue #801，链路落盘实施）

本票把需求 2 链路的最后一跳接上：数据与过程命令**缺省即落 HTML**，回执带绝对路径。
HELP 交付支三支（缺省／速查／`q`，#183 票 4／7／8 冻结）一字未动；页面模板一字未动。

## 交付记录

- `packages/skill-home/src/render/sceneNaming.ts`（新，约 230 行）：命名纯函数
  `resolveSceneStem(key, params) → "<命令中文名>_<场景 id>"`。69 行精确行逐字对照票 2
  附录 `scene-pages-contract.appendix.json` 的 `scenarios`（70 行减偏离 1 行，见下）；
  35 行宿主回退行覆盖运行时合法、附录无行的组合（见 §宿主回退表）；都定不了即抛
  `HomeRenderError(HOME_UNKNOWN_SCENE)`（fail-closed，出口走 exit 5）。
- `packages/skill-home/src/output.ts`（新，薄封装，照 `skill-bill/src/output.ts` 同形）：
  唯一交付入口 `deliverHtml({explicit, target, html})`。显式→覆盖写；缺省→独占递补；
  两者都给显式优先（只落一份、单回执）。时间戳／递补／回执形状由共用件钉死，本件不抄第二份。
- `packages/skill-home/src/cli/cmd_read.ts`（改约 20 行）：`help === null`（数据与过程命令，
  含备份四支）走默认交付＋顶层追加 `delivery`；HELP 键两处（`--html` 通用出口＋三支交付）逐字保留。
- `packages/skill-home/src/render/index.ts`（＋2 行转出）、`src/fetch/index.ts`（＋1 行转出
  `resolveHtmlDir`，与 `resolveDbDir` 同族）、`src/render/errors.ts`（错误码并集＋1 成员
  `HOME_UNKNOWN_SCENE`，无穷举匹配，不影响既有分支）。
- `packages/skill-home/SKILL.md`（1 行）：「输出位置」节的口径先行说明翻为已落地（含显式优先规则）。
- `packages/skill-home/test/html-delivery-801.test.mjs`（新，9 用例）：真 spawn 交付门
  （通式逐字／不互盖／宿主真链／显式优先／退出码矩阵／写失败 5／冻结回归）＋附录 69 行对账＋偏离锁定。
- `packages/skill-home/test/help-delivery-190.test.mjs`（改 1 处断言）：⑧ 末「其它 key 不追
  delivery」改为追 delivery＋显式优先（本票目标即改此语义，改动在此显式登记）。

## 链路（缺省／显式／HELP 三路）

- 缺省（数据与过程 20 键，含备份四支）：落 `<库目录>/home_manager_html/<命令中文名>_<场景 id>_<戳>.html`
  （库目录与子目录名走配置，`resolveHtmlDir` 唯一算式），回执 `delivery{mode:"file", path, bytes}` 顶层追加。
- 显式（`--html <路径>`，数据与过程键）：只落逐字路径一份，单回执指它；缺省目录不另落（照账单／卡路里先例）。
- HELP 键：缺省／速查／`q` 三支冻结（`--html` 在此键上仍是旧语义：写分节页、无 delivery 追加）。
- 早期支（config 三键／health 体检）：无 envelope，不落 HTML，保持现状。
- 退出码：正例 0；参数错 2；未知键 3；渲染／命名／落盘失败 5（stdout 空）；取数失败 4；预检 1。均有真 spawn 用例。

## 宿主回退表（附录外组合 → 70 行之一；理由＝同页族内行为一致）

| 调用 | 宿主 | 理由 |
|---|---|---|
| `home.tag.query` 无 kind／未知 kind | 4-1 管标签 | 缺省行为＝标签列表（`runTagQuery` 无 kind 即列全部） |
| `home.tag.query` kind=categories／category | 4-2 管分类 | 分支行为＝分类表 |
| `home.tag.write` op=merge（含缺省） | 4-1 管标签 | 合标签即管标签动作，同 `tag_manage` 族 |
| `home.item.add` photo=true（布尔形） | 1-2 拍物品 | 附录行是 `photo:"1"` 字符串形；布尔形同义，行为同为单条录入 |
| `home.item.detail` view=wall | 5-1 查看照片 | 与 photos 同分支 |
| `home.location.query` mode=suggest | SM2-3 收纳建议 | 真收纳建议分支（附录行误标 storage，见下偏离） |
| `home.location.query` mode=find | SM2-4 空间视图 | 用户已裁（找位置→SM2-4），同 `space_view` 族 |
| `home.location.query` mode=storage／manage／缺省／未知 | SM2-1 管位置 | 三者同走位置总览分支，同 `location_manage` 族唯一场景行 |
| `home.location.write` 缺省／未知 op | SM2-1 管位置 | 缺省与未知 op 同走 manage 流 |
| `home.trip.manage` mode=return | SM3-4 出行清单 | 归物品与带物品同族（契约已注双词场景印组合名） |
| `home.trip.manage` 缺省／未知 mode | SM3-4 出行清单 | 同走 pack 流 |
| `home.stats.overview` 缺省／未知 kind | SM4-1 统物品 | 同走 summary 流 |
| `home.stats.alert` 缺省／未知 kind | SM4-2 查闲置 | 同走 idle 流 |
| `home.shopping.query` 缺省／未知 kind | SM5-1 购物清单 | 同走 list 流 |
| `home.shopping.write` list-add／list-check／check（含缺省） | SM5-1 购物清单 | 同 `list` 族 |
| `home.shopping.write` missing-to-list | SM5-2 缺货检测 | 同 `missing` 族 |
| `home.shopping.write` stock-threshold／stock-set-threshold／stock-fix | SM5-4 囤货盘点 | 同 `stock` 族 |
| `home.shopping.write` express-confirm | SM5-3 查快递 | 同 `express` 族 |
| `home.care.query` 缺省（kind 默认为 borrow） | SM7-1 借用 | 缺省行为＝借用列表 |
| `home.care.query` kind=firstuse／first-use | SM8-1 首次使用 | 同 `first_use_wizard` 族查询面 |
| `home.care.query` kind=backup-list | SM8-3 备份导出 | 备份查询面，同族宿主 |
| `home.care.write` kind=borrow（任意 op） | SM7-1 借用 | 借出／借入／归还／催还同页（票面 SM7-1 即四操作） |
| `home.care.write` kind=member | SM7-2 家人档案 | 同族写面 |
| `home.care.write` kind=backup／export | SM8-3 备份导出 | 同族写面 |
| `home.care.write` kind=import-preview／import | SM8-4 导入恢复 | 同族写面 |

其余未知（未知 ticket kind、未知 shopping/tag/inventory/warranty/cert/account op 等）由各能力
`fail(2)`／`fail(1)` 在取数层拦下，走不到命名（无 delivery、stdout 空，用例锁定）。

## 偏离与票 2 补丁流提案

附录 SM2-3 行 preset `{mode:"storage"}` 与运行时不符：运行时 `storage` 走位置总览
（`src/space/location.ts:33` 的 manage/storage 共枝），真收纳建议是 `mode:"suggest"`。
本件不收附录该行，`suggest → SM2-3`、`storage → SM2-1（宿主）`，对账测试把该偏离显式锁定。
**提案请票 2**：附录 SM2-3 行 preset 改为 `{mode:"suggest"}`（或增补 runtime 别名表）；
本实现先行，测试锁定，契约回写后对账（照票 3 §5 补丁流先例）。

## 决策对抗式审查（每条：反方 → 为何仍达成目标）

1. **宿主归宿（附录外组合不发明新名）**。反方：宿主名与行为不完全同义（如查询挂写场景名），
   是“白谎”。正方：文件名三职责是唯一＋可辨＋稳定，宿主行三者全满足；发明新名违反票面禁令，
   且会与票 2 命名仲裁打架。目标是“70 场景可区分、不互盖”，宿主归宿达成且零新增裁决。
2. **`--html` 显式优先、只落一份**。反方：用户给了 `--html` 可能仍想要缺省留档，少落一份是丢信息。
   正方：三家（账单／卡路里／备忘）先例一致是显式优先；落两份则单回执指哪一份说不清，
   反而破坏“落点一律以回执为准”。目标是链路确定性，单回执达成。
3. **备份四支纳入默认交付**。反方：export 已写数据文件，再落 HTML 是重复。
   正方：HTML 是回执页（做了什么、落在哪），与数据文件不是同一物；排除它们会在链路上留
   “有的命令有回执、有的没有”的特例，域票与收口票要为特例写分支。统一规则达成“条条有路径”。
4. **config／health 不落 HTML**。反方：统一规则应无例外。反反方：这两支无 envelope（ shapes 之外），
   硬套 `delivery` 要伪造 envelope，违反“回执只追加、既有字段一字不改”。目标是数据与过程命令，
   配置与体检本就不在目标内，不碰即达成。
5. **SKILL.md 翻 1 行＋190 测试改 1 处断言**。反方：超交付物路径（`src/**`＋证据），是范围蔓延。
   正方：不翻 SKILL 则文档留一句假话（“实施随票 4 落地”已过期）；不改 190 断言则全量红。
   两处改动都在本票语义内且显式登记，偏差为零（见 §交付记录）。

## 变异自证（两行读数）

- 变异 A（改坏落点值：`src/output.ts` 落点 `dir + '-mut'`）→ 红 **2** 条（① 通式逐字、⑤b 写失败占位，均点名落点值）；
  改回后全绿。
- 变异 B（删掉交付段：`cmd_read.ts` 默认分支不赋值 `delivery`）→ 红 **5** 条（①②③④⑤b，全指交付缺席）；
  改回后全绿。
- 恢复后验收：`node tooling/run-locked.mjs --ticket 801 --max-wait-ms 600000 -- node --test 'packages/skill-home/test/*.test.mjs'`
  → **172/172** exit 0（含本票 9 用例；注：`node --test <目录>` 在本机按模块加载报错，
  故用 glob 同文件集，读数等价）。

## 遗留出口

HELP 支互斥口径未动（无需回写票 2／票 8、未补票）；页面模板未动；生产产物目录未碰。
票 2 补丁流提案 1 条（上 §偏离），待契约回写后对账。
