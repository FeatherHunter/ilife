# 附录 env 登记（P9 冻结；逐包 key 由迁移图补）

> **2026-09-19 #722 改写**：本文原先登记的是「环境变量承载配置」那一套（`SKILLS_DB_PATH` 全局必设 ＋ 五个写库哨兵 ＋ 各包的照片／飞书路径变量）。「配置的存与生效口径裁定」（#675）已把承载方式整个换掉——**每个技能一份 YAML 配置文件是唯一真相，环境变量不参与配置**，取值面由 #695（chef／home／memo／schedule）与 #718（calorie）落地。本文按当刻实况重写；**记账（skill-bill）的取值面尚未迁移**，它的那一套仍是实况，单列在下面。
>
> **环境变量现在只剩两个角色**（都不是配置）：① `ILIFE_CONFIG_DIR`——设定且非空即整体接管**配置目录**（默认 `~/.ilife/`，同时是测试隔离的口子）；② 运行期继承类（`NODE_OPTIONS`／`PATH` 一类），不由本技能定义。

## 一、六家的配置面（配置文件是唯一真相）

配置落点：`<配置目录>/<技能>.yaml`，配置目录默认 `~/.ilife/`（由 `os.homedir()` 派生，平台无关），`ILIFE_CONFIG_DIR` 可整体覆盖。数据目录默认 `<配置目录>/data/`，首次读时自动建。「重置为默认」先另存 `<配置目录>/<技能>.yaml.bak`。读写实现住 `base-link-core/src/config/`（#694）。

**取值通则**：配置项**空串＝按默认落点**，不是「没配就失败」——库目录空串即数据目录，产物目录空串即该家的默认目录名。故**没有任何一项是必设的**，缺配置不会 exit 1。

| 技能 | 配置文件 | 库目录／库文件名 | 产物目录 | 其余项 |
|---|---|---|---|---|
| 卡路里 | `~/.ilife/calorie.yaml` | `db.dir`（空＝数据目录）／`db.name`＝`calorie_data.db` | `html.dir`＝`calorie_html` | `photos.dir`（**空＝这一项还没配**：取数侧跳过「照片文件在不在」的校验、写侧阻断，不猜路径）、`photos.gifs`＝`gifs`、`xunji.*` 五项、`land.*` 三项 |
| 记账 | `~/.ilife/bill.yaml` | `db.dir`（空＝配置目录下 `data/`）／`db.name`＝`biscuit_accountant.db` | `html.dir`＝`biscuit_accountant_html` | `db.goals`＝`goals.json`、`backup.dir`（空＝库目录下 `backups`）／`backup.stem`＝`biscuit_`、`html.helpStem`／`html.quickRefStem` |
| 大厨 | `~/.ilife/chef.yaml` | `db.dir`（空＝数据目录）／`db.name`＝`chef_data.db` | `html.dir`＝`cook_html/help` | `files.help`／`files.lookup`＝`私家大厨_HELP`／`私家大厨_速查表` |
| 居家 | `~/.ilife/home.yaml` | `db.dir`（空＝数据目录）／`db.name`＝`home.db` | `html.dir`＝`home_manager_html` | `backup.dir`＝`backups`（相对库目录解）、`files.help`／`files.lookup`。**没有照片目录这项配置**（照片是记录里的一列） |
| 备忘录 | `~/.ilife/memo.yaml` | `db.dir`（空＝数据目录）／`db.name`＝`memo.db` | `html.dir`＝`memo_html`（扁平一段） | `media.dir`＝`media`（附件目录）、`lark.cliPath`（**飞书 CLI 路径：空＝走本机自动探测**）、`lark.qrDir`（空＝系统临时目录下 `memo_feishu_qr`）、`files.help`／`files.lookup` |
| 作息 | `~/.ilife/schedule.yaml` | `db.dir`（空＝数据目录）／`db.name`＝`schedule_data.db` | `html.dir`＝`schedule_html/help` | `lark.cliPath`（**空＝走本机自动探测**）、`files.help` |

设置页把这六份表分级呈现（常用项在页面上、其余进默认收起的「高级」组），保存即生效，不必重启宿主。

## 二、记账尚未迁移的那一套（当刻实况，见「遗留」）

`packages/skill-bill/src` 仍在读环境变量，故下面这些**还没有被上面的配置文件口径取代**：

| 变量 | 现在的作用 | 出处 |
|---|---|---|
| `SKILLS_DB_PATH` | 库目录解析的唯一入口；出口预检 | `src/fetch/paths.ts`、`src/cli/cmd_read.ts` |
| `BILL_FORCE_PROD` | 非 tmp 路径写库的隔离哨兵（`=1` 才放行） | `src/fetch/paths.ts` |
| `BILL_TODAY` | 「今天」的钉子（测试用） | `src/query/read.ts` |

## 三、其它环境项

| 范围 | 项 | 说明 | doctor 默认 | --strict |
|---|---|---|---|---|
| 全局 | `ILIFE_CONFIG_DIR` | 配置目录覆盖（**不是配置承载**，是位置口子；同时是测试隔离的口子） | 未设即用 `~/.ilife/`，不报 | 不判 |
| 作息／备忘录 | `lark-cli` | 飞书 CLI：存在＋登录＋写权限＋端到端。**路径这一项走配置文件的 `lark.cliPath`**，不再是环境变量 | 缺失 warn（仅存在性＋版本探测） | fail |
| 全仓 | `NODE_OPTIONS` | 运行期继承（测试的钉钟预载走它）；技能不定义、只透传 | 不判 | 不判 |

## 四、doctor 与测试隔离

- `tooling/skilllink.mjs` 的 doctor 仍按**旧口径**检查（全局 `SKILLS_DB_PATH` ＋ 逐包哨兵／目录变量），与上面第一、二节对不上——它自己的迁移**不在 #722 写集**，登记待认领，见 §五。
- 测试隔离（删掉五个写库哨兵之后的替代护栏）：测试一律用 `ILIFE_CONFIG_DIR` 指向临时目录，且**测试基座强制设置它、缺了直接报错**（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`）——把「忘了配」从静默写真实数据变成响亮失败。细则见 `packages/base-link-core/README.md` §隔离。

## 五、遗留（不在 #722 写集，登记待认领）

1. **记账的取值面尚未迁移**：`packages/skill-bill/src` 仍读 `SKILLS_DB_PATH`／`BILL_FORCE_PROD`／`BILL_TODAY`，故 `packages/skill-bill/SKILL.md:125` 的「`SKILLS_DB_PATH` 必设 ＋ `BILL_FORCE_PROD` 哨兵」**目前是与实况相符的老口径**，等它的取值面迁移票落地后一并改写（同 #695／#718 之于其余五家）。
2. **`tooling/skilllink.mjs` 的 doctor 按旧口径检查**：`checkDb()` 判 `SKILLS_DB_PATH`、`SKILL_CHECKS` 逐包判五个哨兵与三个目录变量，随上面第一、二节迁移之后一并重写。
3. **卡路里两处用户可见文案仍教人设已删变量**：`packages/skill-calorie/MIGRATE_ROLLBACK.md` 与 `packages/skill-calorie/scripts/migrate-calorie.mjs` 都写「dst 非 tmp 须 `CALORIE_FORCE_PROD=1`」，而该 opt-in 已删、守卫改成「非 tmp 一律拒」。
