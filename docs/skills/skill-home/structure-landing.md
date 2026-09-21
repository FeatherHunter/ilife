# 结构落地迁移对账（地图 #797 票 3 ＝ issue #800，机器实施）

本票把「11 张域票按域根隔离」的前提机器造出来：通用分派口＋目录扫描生成器＋
派生件入仓＋21 条命令按域搬＋测试 glob＋唤醒词层落地＋页族解析＋SKILL 说明面。
键名与出参形状冻结（搬前／搬后读数逐条一致，见 §2）。

## 1. 键→能力归属（20 业务键，`home.help.lookup` 为技能级入口不进能力目录）

| 能力 | 键 | 页族写集（域票地盘，本票不动 `pages/`） |
|---|---|---|
| items | item.search/detail/add/update、tag.query/write、inventory.round/records（8） | add_form 等 19 族 |
| space | location.query/write（2） | location_manage 等 4 族 |
| outfit | outfit.pick、trip.manage（2） | outfit_picker 等 5 族 |
| stats | stats.overview/alert（2） | overview 等 4 族 |
| express | shopping.query/write（2） | list 等 4 族 |
| receipt | ticket.query/write（2） | purchase_records 等 4 族 |
| family | care.query/write（2，借用＋家人＋开始使用 4 场景同走这两键） | family_borrow、family_members |
| setup | 空声明（care 键家在 family，setup 4 场景经 kind 预设到达） | first_use_wizard 等 4 族 |
| link | 登记位（不建目录） | — |

子功能文件名取命令后缀（search/detail/add…，照卡路里 `log.ts`／`edit.ts` 先例）；
能力目录名取 HELP 一级分组（铁律四）；每能力门转出恰 2 个（声明＋路由）。

## 2. 搬前／搬后一致读数（21 键，键名与出参形状不变）

- 键集合：`HOME_KEYS`（20）＋技能级 `home.help.lookup`＝21，与旧 `HOME_KEY_SHAPES` 逐字同集。
- 出参形状：读 4 形（list/detail/receipt/stat）逐键同旧表；写一律 receipt。
- 行为证据：`test/cli.test.mjs`（21 键真 spawn 全票）＋`test/render.test.mjs`
  （21 键 envelope 全票）＋`test/policy.test.mjs` 全绿（搬后跑分见 §6）。

## 3. 派生件与生成器（命令登记纪律三成立要件）

- 生成器 `scripts/gen-cli.mjs`（扫 `src/<能力>/{commands,routes}.ts` 文本，fail-closed，
  不读 dist 故无「改了没重建」假绿）：产出 `src/cli/keys.ts`／`src/cli/registry.ts`／
  `src/policy/routes.generated.ts`，三件入仓，`pnpm gen:check` 逐字节比对（CI 真跑，
  见仓根 `package.json` 与 `.github/workflows/ci.yml`）。
- `src/cli/cmd_read.ts` 888→211 行：21 个 case 换成 `REGISTRY[key]` 查表；
  help／backup 开库前通道原样保留；`fail`／`note`／`asInt` 搬进共用位
  `src/shared/`（8 能力共用， fail.ts 不出现任何能力名）。
- `src/policy/wakewords.ts` 不再手写词表（运行期适配＋最长匹配保留）；
  `src/render/envelope.ts` 的形状表改从派生件消费（函数体逐字未动）。

## 4. 唤醒词层落地（票 22 规格实施，42 变体分层）

- `scenarios.yaml` 42 条变体逐条打 `route:` 标记（true 30／false 12，判定表住
  `scripts/mark-variant-routes.mjs`，一次性脚本）：无槽位唯一命中才进确定性路由
  （如帮我记一下、数数这里），含指代／省略／模糊留 AI（如钥匙固定放哪来着、
  那个啥在哪、这个收进来）。
- 借出／借入／归还／催还 4 词新登记（宿主 SM7-1，prompt 操作含四者）。
- 推位置／找位置补 `needs`（路由层即报缺槽位，exit 2 同档，话更明白）。
- 3 条 `(HTML)` 兼容词保持路由现状：废弃条件（默认全量落 HTML）是票 4 的实施，
  本票不擅自废弃，待票 4 后复裁（测试 `PENDING_DEPRECATED` 锁定）。
- audit-wakewords.mjs 更新为四向（主词 74／路由 125／变体 42＝进表 30＋非路由 12），
  已转绿（FAIL→PASS 即「唤醒词层补完」的机器读数）。

## 5. 页族解析与对照（票 2 契约 L1 实施）

- `src/render/pageFamilies.ts`：`(key, preset) → 46 族`（`templateFor` 旧 1:1 原样保留）。
- 125 行对照（词→场景→key→页族）由 `test/wake-family-gates.test.mjs` 逐行跑，
  缺一行即红；附录 70 场景自匹配 70/70（防走散）。
- 附录外补齐 8 处（附录场景未覆盖 write-op 侧：shopping.write 的 op 分流、
  care 双键的 kind 分流、tag.query 的 kind 分流）→ **票 2 补丁流提案**：
  请票 2 把上述分流补进附录（本实现先行，测试锁定，契约回写后对账）。
- 单审退回 2 词：推位置／找位置的宿主 SM2-1 复核未通过（管位置 prompt 只有
  查看／新建／改名／合并／删除／规范化，无推荐／查找语义），路由保持现状，
  待用户重裁（测试 `REJUDGE` 锁定，未确认不 close 本票）。

## 6. 门禁读数（本票验收命令，三条 exit 0）

- `tsc -b packages/skill-home`：exit 0。
- `pnpm --filter skill-home test`：65/65（新增 wake-family-gates 23 项；另 cli／
  policy／render／fetch／skill／config-695／t794 手工全跑，21 键真链一致）。
- `pnpm gen:check`（仓根，含居家）：exit 0。
- 全量 `pnpm test`（`check-real-home-untouched --run`）：见收尾跑分。
- 负向证据（改坏一句即红）：把 family 借出 key 改错→`gen:check` exit 1 点名文件；
  重生成＋重建后门测试 `借出登记 → home.care.write` 变红点名用例；恢复后全绿。
  （2026-09-21 现场实测，回复后派生件与源码一致。）

## 7. 遗留出口（偏差为零才算完）

- `src/fetch/db.ts` 434 行超告警线 84：归属另立票（包内 AGENTS 台账原判），本票不动。
- `src/cli/cmd_read.ts` 退出超线台账（211 行）。
- 推位置／找位置待用户重裁（§5）；3 条 `(HTML)` 待票 4 后复裁（§4）；
  SKILL「缺省即落 HTML」口径先行、默认落盘实施随票 4（§8）。
- 票 2 补丁流提案（附录补 write-op 分流，§5）；契约文件与附录本身归票 2，
  本票只消费不提交（工作区内未跟踪文件不动）。

## 8. SKILL 说明面（票面⑨）

`SKILL.md` 新增「输出位置」一节：链路「唤醒词 → 命令 → 落盘 HTML 绝对路径」
逐字写清（缺省即落 HTML、回执 `delivery.path` 绝对路径、产物落点、用户点开方式、
完成判据＝文件存在且大小＝`delivery.bytes`）；速查表由构建期重注为 125 行。
