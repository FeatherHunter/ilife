## Question

照 #149 的做法写 `SKILL.md` 说明面：新增一节「HELP 交付」，写清

- 缺省行为就是交付物（对 AI 说「居家管家 帮助」会拿到文件）；
- 完成标准（文件存在且大小＝回执里的 bytes）；
- 要速查、要现找才加参数（参数名以票 4 的裁决为准）；
- 边界（哪些事这一节不管）。

落笔照 `writing-for-agents` 技能；用词照 `docs/agents/wording.md`（不说「壳」，说「help 模板」；`home.help.lookup` 这类叫「命令」）。顺带把这一节里出现的旧黑话清掉。

同时写明技能拷贝的新旧判别口径（`~/.agents/skills/<技能>` 是拷贝不是链接，判新旧只能靠 `SKILL.md` 的哈希）。

**顺带修一处**（票 1 `#184` 查出来）：`packages/skill-home/scripts/build-help.mjs:28` 注入速查块时**不保检出换行**（直接拼 `'\n'`）；bill 那份按检出换行写回（`packages/skill-bill/scripts/build-help.mjs:34-37`），照它改。

## 进度：100%

下一步：无阻塞——说明面四件＋审查订正全部完成。

**交付**：① 新增「HELP 交付」节（缺省＝落文件＋回执绝对路径；**完成判据＝文件存在且大小＝`delivery.bytes`**；速查／现找两支与互斥 `exit 2`；边界；不看库）；② frontmatter `description` 改对（原写「出一份速查列表」，与票 7 后的行为不符、会误导读技能目录的 AI）；③ 新增「装出来的那份怎么判新旧」（通用口径，不写死路径）；④ 补 `## 公共安装器运行时`（npm 取运行时二选一／本仓构建产物验证链路／`node>=22.13`），并把 `test/skills-export-47.test.mjs` 的 `PKGS` 扩到含居家（补上「居家 frontmatter 没有任何门对着」的缺口）；⑤ `scripts/build-help.mjs` 改为**按检出换行**写回（CRLF 探针注入前后 sha256 不变、LF 真件亦不变 ⇒ 幂等）。

**审查**：`review-t192-A.md` **整改后通过 80/100**，三条**文档与行为不符**已全部订正。其中一条是**外部事实错**：原文写「`skill-home` 尚未发布到 npm」是**假的**——npm 上确有 `0.1.0`（2026-09-07 发布），真阻塞是依赖 `"base-link-core": "workspace:^0.1.0"` 未改写 ⇒ 新装必报 `EUNSUPPORTEDPROTOCOL`；已按卡路里同形改成「**已发布待重发、发布前走本仓构建产物**」（导出用例注释与断言消息同口径，全文「尚未发布」0 命中）。另两条：`_N` 递补的措辞（缺省吃 24h 复用窗口、要每次落新件才传 `reuseHours:0`）与补 #245 复用窗口一行。

**实跑**：导出用例 **5/5**、`check-boundaries` **PASS**、`SKILL.md` LF／无 BOM／HELP 标记块仍在。
