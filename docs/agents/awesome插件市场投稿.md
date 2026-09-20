# awesome 插件市场投稿：规则与用法

**读者**：任何要把 DSH 插件上架到 `awesome-dsh-plugin/awesome-dsh-plugin` 的项目里的 AI 或人。本文自包含——不读上游任何文档也能照它做完。

**用法**：把本文拷进你的项目，并把下面这行加进你那边的 `AGENTS.md`，以后的会话才找得到它：

> 上架 DSH 插件到 awesome 插件市场、或给已上架条目补截图／下载量／README 之前，读 `<本文路径>`。

**全文只用两个词**

- **上游**：列表仓 `awesome-dsh-plugin/awesome-dsh-plugin`。一个插件一个 YAML（`data/plugins/`），两个 README、站点、市场看的目录都由它生成。
- **自家仓**：你要上架的那个插件所在的仓库。**给上游只交一个 YAML；其余功能都在自家仓里做，不用再来提 PR。**

---

## 第一步 · 自家仓备齐

| 备什么 | 放在哪 | 备完长什么样 |
| --- | --- | --- |
| `dsh.bundle` manifest | 条目 `url` 指到的那一层 `package.json`（monorepo 就是那个子目录），`cordis.patch.yml` 摆在它旁边 | 那层 `package.json` 里有 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。**只声明 `dsh.client` 装不上，必被拒** |
| `dsh-plugin` topic | 自家仓的 GitHub topic | 仓库页能看到这个 topic |
| README | 自家仓。monorepo 先取被收录子目录的 README，没有才回落到仓根 | 详情页正文有内容——**没有 README 就没有正文**，只剩一行描述 |
| 截图 | 自家仓 `package.json` 旁的 `screenshots.json` | 详情页与市场里有图，顺序＝数组顺序。规则与坑见「截图」一行 |
| 已发 npm | 自家仓发版 | registry 上 `dist-tags.latest` 那一版 manifest 的 `repository` 小写包含 `<owner>/<repo>`。见「下载量」一行 |
| 预构建 tarball（可选） | 自家仓的 GitHub Release | `tarball:` 指向 GitHub 托管的 https `.tgz`。仓库无法从源码安装时，这一项必需 |

## 第二步 · 给上游交一个文件

路径与文件名都由条目 `url` 推出来，**不要自己起名**：

| 条目 `url` | 文件名 |
| --- | --- |
| `https://github.com/o/r` | `data/plugins/o__r.yml` |
| `https://github.com/o/r/tree/<默认分支>/packages/x` | `data/plugins/o__r--packages-x.yml`（`/` 换成 `-`） |

字段**只认**这五个，写别的键会被校验拒掉：

```yaml
url: https://github.com/o/r/tree/main/packages/x   # 与仓库／子目录逐字一致
name: o/r#x                                        # 列表里显示的链接文字；仓库根写 o/r
category: ui                                       # 22 选 1，取值见「分类」一行
description:
  en: 'One line, ends with a period.'              # 必填、单行
  zh: '一句话，以句号结尾。'                          # 可选；不写维护者会补
tarball: https://github.com/o/r/releases/download/v1.2.0/x-1.2.0.tgz   # 可选
```

三条会踩的坑：描述里含 `: `（冒号加空格）的那一行**必须加引号**，否则 YAML 解析失败（中文全角冒号无此问题）；`description` 的每个取值必须**单行**；文件名与 `url` 对不上会被校验拒。

**判据**：`data/plugins/` 下只多出这一个 `.yml`，且文件名与 `url` 逐字对得上。

## 第三步 · 自查、提 PR、等两道检查

**自查**（在上游仓的副本里，先 `npm ci`；把待投稿的 YAML 放进 `data/plugins/` 再跑）：

```sh
node --input-type=module -e "import {readEntries,validateEntries} from './scripts/lib/entries.mjs'; const p = validateEntries(readEntries()); console.log(p.length ? p.join('\n') : 'ok')"
```

**提 PR**：基线取上游 `main` 的最新提交，分支上只加那一个 YAML；标题 `Add <owner>/<repo>` 或 `Add <owner>/<repo>#<sub>`；正文照上游 PR 模板的 checklist 写。同一 PR 只动自己那一条——不碰别人的条目，不碰 `.github/`。

**等两道检查**：`check`（分叉新鲜度、文件形状、README 重生成、awesome-lint、站点构建）与 `Submission gate`（门槛，见下）。被打回一般是因为**描述与代码不符**：改那一行、推同一个分支即可，不用重开 PR。

**判据**：PR 的 Files changed 只有那一个 `.yml`；两道检查的结论都是 `success`。合并后 README／站点／市场自动重建——投稿分支不需要碰它们。

---

## 参考：功能清单（能拿到什么、在自家仓做什么）

| 功能 | 出现在哪 | 在自家仓做什么 | 限制与坑 |
| --- | --- | --- | --- |
| **下载量 ↓** | 站点卡片、排序项「下载量」，**而且站点默认排序就是它** | 发 npm，并让包的 `repository` 指回被收录的仓库：`{"type":"git","url":"git+https://github.com/o/r.git","directory":"packages/x"}` | 改 `repository` **必须发一个新版本**（npm 不允许重发同版本号）。口径是 npm 最近 **30 个完整 UTC 日**的合计。**没有下载量的条目在默认视图里排最后**——不只是少个数字 |
| **截图** | 详情页、市场详情页（AppStore 式） | 自家仓 `package.json` 旁放 `screenshots.json`：数组，1–8 张，**顺序＝展示顺序** | 相对路径**不许出插件目录**（不许以 `/` 开头、不许含 `..`）；绝对 URL 只收 GitHub 托管；中文文件名没问题（上游按路径段 `encodeURIComponent`）；死图会被丢弃。**改截图推自家仓即可，不用再提 PR** |
| **README 正文** | 详情页正文、市场说明区 | 自家仓放 README（子目录优先，回落仓根） | 截断 48 KB；相对链接与图片会被改写成绝对 GitHub URL |
| **星标 ★** | 站点卡片、分类页；排序项「Star 数」 | 不用做，上游按**仓库**采集 | 按仓库算、不按包；快照兜底，抓取失败保留上一次 |
| **收录日期／近 7 天新增** | 排序项「最新收录」、筛选「近 7 天新增」 | 不用做，上游从 README 的 git 历史推 | 合并后一周内会被「近 7 天新增」筛出来——**免费曝光窗口**，首发文案与截图安排在合并前后 |
| **可从 npm 安装**（筛选） | 站点筛选开关 | 同「下载量」的前半 | 判定只看 npm 包与仓库的关联 |
| **预构建 tarball** | 市场的安装入口 | 条目加 `tarball:` | 必须 GitHub Release 托管的 https `.tgz`。`.../releases/latest/download/<名>` 的**文件名是照字面取的**：带版本号的话，下次发版就 404（要么文件名不带版本，要么钉住 release tag） |
| **更新说明** | 市场里的「你装的这版之后改了什么」 | 想有确切文案就发 GitHub Release 并写 notes | 上游自动抓「最新 release notes ＋ 最近 8 条提交」，不发 Release 也能用（退化成「最近提交」） |
| **目录给别的工具用** | 会话内找插件（`dsh-find-plugin`）、各桌面壳内嵌的市场 | 不用做 | 上游把 `plugins.json` 发成 npm 包 `dsh-plugin-catalog`；更新说明发成 `dsh-plugin-updates` |
| **徽章** | 自家 README | 嵌入上游的 `badge.svg`、`count.json`（shields.io 端点）与 `awesome.re` 徽章 | 徽章既能涨星，也自证已收录 |
| **主题 Tab** | `dsh-market` 的主题页 | 分类选 `theme` | 只有主题／皮肤类才占这个分类；一键装／切／卸都在那里 |
| **官方包依赖** | 用户安装时的依赖解析 | 官方 `@deepseek-ai/*` 写进 `peerDependencies`，范围带**显式预发布分支** | 例：`>=0.0.1-rc.1 <0.1.0 \|\| >=0.1.0-rc.1 <0.2.0-0`。看起来宽的范围（`>=0.0.1-rc.1 <0.2.0`）会静默排除所有 `0.1.0-*` 预发布版，用户撞 `ERESOLVE` |
| **分类** | 列表分区、站点分类页 | `category` 22 选 1：`agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun` | 挑贴合插件实际做法的那个；选偏了维护者会改，**不会因为分类被打回** |

## 参考：收录门槛与打回原因

| 门槛 | 判据 |
| --- | --- |
| 可安装 | 条目 `url` 指到的那层 `package.json` 声明 `dsh.bundle`，`cordis.patch.yml` 在旁边 |
| 仓库年龄 | 仓库创建满 **1 天**（按仓库判；差一点就等，CI 每 6 小时自己重跑，不必重开 PR） |
| 仓库状态 | 未归档、不是 DSH 本体 |
| topic | 仓库有 `dsh-plugin` |
| 一 PR 条目数 | **最多 3 条**。同作者多个插件要「挑」，不是全投 |
| 不是纯聚合包 | 内容只有一份依赖清单的聚合包**不单独收录**（收插件，不收聚合包）。自己带行为——合配置、给设置面、运行时协调各部分——按普通插件审 |
| 描述属实 | 维护者会**读自家仓**，把描述里每条声明对着代码核（写「46 个工具、六大领域」就要真有）。**夸大是让好插件被打回的主要原因**；描述也不要营销词 |
| 文件形状 | 落在 `data/plugins/` 下**一层深**、扩展名 `.yml`；否则会被**静默跳过**（列表里什么都不出现，别的检查照样绿） |
| 别碰 `.github/` | 改 `.github/` 的 PR 会被判成旧分叉分支 |

## 参考：上架之后

- 上游每周扫一遍衰减，**只标记不删**：仓库 404／已归档／6 个月没推／条目子目录消失／`dsh.bundle` 找不到了 → 汇总进一个跟踪 issue，删不删由人定。
- 两个 README 由数据生成，**双语必须一致**，否则上游拒绝构建（宁可报错，不静默掉条）。
- 想改条目里的描述或分类：改自己那一个 YAML 再提 PR；**截图、README、npm 新版本都不用提 PR**。

## 上游原文与实例

- 收录规则原文：`https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md`
- 条目实例（照抄格式最快）：上游仓 `data/plugins/`（4000+ 个 YAML）
- 站点：`https://awesome-dsh-plugin.com/`（中文 `/zh/`）
- 机器可读目录：npm 包 `dsh-plugin-catalog`；更新说明：npm 包 `dsh-plugin-updates`
