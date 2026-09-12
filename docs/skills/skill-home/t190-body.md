## Question

照 #144 的做法，把「居家管家 帮助」这条命令的**缺省交付物**做出来：

- 真跑能拿到文件：缺省分支 → `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<stamp>.html`（目录／文件名／时间戳通式以票 4 的裁决为准）；
- 顶层回执带绝对路径（`delivery{mode,path,bytes}` 这一类）；
- 落盘走独占写（`wx` ＋ `EEXIST` 递补），不做「先判存再写」；
- 该命令在**开库之前**分派（跑完不建 `.db`）；
- 速查支走显式参数（参数名与产物名以票 4 的裁决为准）。

**要把「看帮助不许把库建出来」摆正**（票 1 `#184` 查出来的现状，照 bill 的做法）：

- 今天 `home.help.lookup` 是 `dispatch` 里的一个 `case`（`packages/skill-home/src/cli/cmd_read.ts:674-678`），而 `dispatch` 第一行就 `resolveDbPath()` ＋ `openHomeDb(...)`（`:54-56`）→ `new DatabaseSync` ＋ `CREATE TABLE IF NOT EXISTS`（`src/fetch/db.ts:54-70`）；
- bill 是把它抬到开库之前（`packages/skill-bill/src/cli/cmd_read.ts:69-111` 的 `dispatchHelp`、`:493-495` 的路由），初始化状态用「DB 文件是否存在」判（`:84-86`），用例断言产物目录里 0 个 `.db`；
- 注意居家的 `src/fetch/paths.ts:20-23` 的 `resolveDbPath` **自己会 `mkdirSync`**——照抄前先把这条摆正，否则「判初始化」这一步就把目录建出来了。

**结构按新代码架构规则**（用户 Q8=(a)）：第一步「影响清单」与第二步「结构设计」先报用户点头；被碰到的旧件就地摆正；交付时报第五步「交付对账」；超告警线当场报「已超线，需要根据规则进行重构。」。

## 进度：0%

下一步：等票 4（管线归属＋缺省口径）＋票 6（渲染接线）关票。
