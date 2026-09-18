# t698 四家老技能：取值与自检调查

调查对象：`D:\2Study\StudyNotes\SKILLS\私家大厨`、`备忘录`、`居家管家`、`作息管家`。
调查方式：只读。未修改四个目录内任何文件，未执行其中任何脚本或命令，未做任何 git 操作。结论一律带「文件路径:行号」；查不到的明写「查不到」。

新仓一侧的对照件：`docs/research/t692-six-skill-paths-survey.md`（六家路径类配置全量调查，下文简称 t692）。

---

## 一、老技能现成的自检清单（能不能照抄）

### 1.1 私家大厨 — 11 条

| 技能 | 检查项 | 判据 | 不合格时的话 | 出处 |
|---|---|---|---|---|
| 私家大厨 | 环境检测 `check`（OS/WSL、Python 版本、pyyaml、DB 路径与表数、输出根解析、输出目录可写、env 现状） | `EXPECTED_TABLES = 17`；`"db_initialized": tables >= EXPECTED_TABLES`；pyyaml 缺失时 `missing.append("pyyaml")` | 不打印任何话，只填 JSON 字段 `output_root_error`（错误原文来自 `output_config.py:29-32`）与 `missing`；`"status"` 恒为 `"ok"`，故 `check` **恒 exit 0**，不合格不会以退出码体现 | `scripts/开始使用/cli.py:31,49-50`、`scripts/开始使用/ops.py:20,76-116` |
| 私家大厨 | 输出根目录解析失败 | env 链 `SKILLS_DATA_DIR` > `CHEF_OUTPUT_DIR`（`scripts/output_config.py:15,37-41`）都没有，且平台不是 Windows、也没有 `/mnt/d` 挂载 | `RuntimeError`，逐字：「CHEF_OUTPUT_DIR / SKILLS_DATA_DIR 未设置,且未检测到 Windows 或 WSL 的 D 盘挂载。请设置环境变量(如 CHEF_OUTPUT_DIR=D:/CookHub)后重试。」 | `scripts/output_config.py:29-32` |
| 私家大厨 | DB 路径解析失败 | env `SKILLS_DB_PATH` 未设，且平台不是 Windows、也没有 `/mnt/d` 挂载 | `RuntimeError`，逐字：「SKILLS_DB_PATH 未设置，且 D: 盘未挂载到 /mnt/d/。请检查 WSL automount 配置或设置 SKILLS_DB_PATH 环境变量。」 | `scripts/db_config.py:36-39` |
| 私家大厨 | 输出目录可写探针 | 建目录 + 写 `.write_probe_<pid>` + 删除；`OSError` 即不可写 | 不单独报错，结果进 `output_dir_writable`（`false`） | `scripts/开始使用/ops.py:40-49,108` |
| 私家大厨 | DB 表数只读探测 | 只读 URI 打开，数 `sqlite_master` 里非 `sqlite_%` 的表 | 文件不存在或 `OperationalError` → 返回 `0`（静默） | `scripts/开始使用/ops.py:57-71` |
| 私家大厨 | 建库幂等 | DB 文件已存在即跳过；不存在才建空库并置 WAL | 新建时打印「📁 已创建空 DB: {db_path}」；结尾打印「✅ 数据库初始化完成！」 | `scripts/init_db.py:18-34,44,356` |
| 私家大厨 | WAL 模式 | `PRAGMA journal_mode` 回读等于 `wal` | 任何异常被吞，返回 `false`（静默降级） | `scripts/db_config.py:175-188` |
| 私家大厨 | 体检（数据质量报告） | 每道菜 5 个维度，每项 20 分、满分 100：食材 ≥3 得 20（≥1 得 10）、步骤 ≥3 得 20（≥1 得 10）、贴士 ≥1 得 20、技法 ≥1 得 20、有背景得 20；≥80 完整 / ≥40 部分 / 其余待补，按分倒序 | 失败时只打印「❌ recipe_manager.list 失败:…」或「未找到任何菜谱」然后 `return`，**exit 0 静默降级**；成功打印「✅ 报告已生成: {out_path}」 | `scripts/data_quality_report.py:114-124,167,172,188-193,202` |
| 私家大厨 | 环境变量持久化引导 | 已设置的变量不重复生成命令；全部已设置则 `configured=true`；Windows 给 `setx`、其他给 `export` 追加 `~/.bashrc` | 无失败态 | `scripts/开始使用/ops.py:150-179` |
| 私家大厨 | 测试环境前置 | fixture 同时把 `CHEF_OUTPUT_DIR` 与 `SKILLS_DB_PATH` 指到 tmp | 无 | `tests/conftest.py:16-29` |
| 私家大厨 | `import` 零副作用 | `test_imports.py` 断言 `cli.py check` 不建库目录 | `assert "EXISTS=False"`、`assert leftovers == []` | `tests/test_imports.py:87,108` |

**另有一份静态清单，但没有任何代码读它**：`references/scenarios.yaml:883-897` 有 `self_check:` 14 项（s01..s06 为 `true`，s07..s14 为 `pending`）；全仓在 `.py` 里搜 `self_check` 零命中。

### 1.2 备忘录 — 14 条，全部集中在飞书一侧与测试前置

| 技能 | 检查项 | 判据 | 不合格时的话 | 出处 |
|---|---|---|---|---|
| 备忘录 | 飞书权限差集 `check`（唯一常驻诊断入口） | `missing = [s for s in REQUIRED_SCOPES if s not in granted]`（`REQUIRED_SCOPES` 5 项） | 差集非空 → `"status": "missing_scopes"`、`"verdict": "飞书权限未实测:先补齐缺失权限"`；全过 → `"飞书权限已实测"`；否则 → `"飞书权限实测未通过"`。**退出码恒 0**（`:980` 只 print，无 `sys.exit`） | `script/feishu_sync.py:51-59,807-828,927,955-979` |
| 备忘录 | 缺 CLI / 未登录 | — | `"status": "skipped"`，`"skipped_reason": "cli_not_available"` / `"not_logged_in"` | `script/feishu_sync.py:972,977` |
| 备忘录 | 飞书写权限真打验证（sentinel） | task 域 create → update → complete；calendar 域 create → update → delete；带前缀 `[备忘录测试]`，测完即清 | 失败项逐条进结果，`ok: false` + `error`；task 创建失败则短路，后续无对象可测 | `script/feishu_sync.py:62,831-869` |
| 备忘录 | open_id 可读性 | 从 `lark-cli auth status` 读 user open_id | `{"ok": False, "task_guid": None, "error": "无法从 lark-cli auth 读取 user open_id（请先 lark-cli auth login）"}` | `script/feishu_sync.py:319-320` |
| 备忘录 | 初始化报告页 `init-report` | 它**不是检查器**，只渲染报告页；检查项由 AI 自己算好填进 `--data` 的 JSON，契约 `{items:[{name,status(ok/warn/err),desc,action}], todos:[{title,steps}], verify:[…]}` | 坏 JSON → `{"error": "data 不是合法 JSON"}` 且 **returncode 仍为 0**（`tests/test_init_report.py:122` 明写 `assert r.returncode == 0  # CLI 不崩,返回 error status`） | `script/memo_cli.py:1669-1680,1776-1781` |
| 备忘录 | 场景资产校验 `validate_scenarios.py`（本技能唯一自带 CLI 与退出码的校验器） | 8 必填字段 / type 允许清单 / 禁用字段 / prompt 禁词 / `dependencies` 非空 / `scenario_id` 去重 | 通过打印「OK · scenarios.yaml 校验通过」；失败打印「FAILED:」+ 逐条 `  - {e}` + `sys.exit(1)` | `script/validate_scenarios.py:16-32,147-161` |
| 备忘录 | 模板静态检查 `template_lint.py` | 3 条静态 JS 规则；无 CLI、无退出码 | 逐条文本，例如「节点无明显 click handler (违反总纲 §04 原则 10 HTML 单工铁律:过程型 HTML 按钮必须有复制路径或 navigator.clipboard fallback)」 | `script/template_lint.py:6-14,259-261` |
| 备忘录 | `公共组件/` 资产存在性 | 需要 `injector.py`、`assets/base.js`、`assets/base.css`、`assets/help_template.html` | `RuntimeError`：「Base Skill 资产缺失: 找不到 公共组件/injector.py。请确认 公共组件/ 目录已安装(#268 Base 定稿入库)。」；js/css 缺失则是未捕获的 `FileNotFoundError` | `script/memo_render.py:28,36,82-87,95-96` |
| 备忘录 | `references/scenarios.yaml` 存在性 | 路径 `SKILL_DIR/references/scenarios.yaml` | `raise FileNotFoundError(f"场景资产缺失: {SCENARIOS_PATH}")`；无 pyyaml → `raise RuntimeError("缺少 pyyaml,运行 \`pip install pyyaml\`")` | `script/memo_render.py:37,474-479` |
| 备忘录 | 首次使用流程（由 AI 手工执行，不是脚本） | Python ≥3.10（三重探测：PATH → `C:\Python3*` / `%LOCALAPPDATA%\Programs\Python\Python3*` → `winget list Python`，全部找不到才算没装）；SQLite+FTS5；飞书 CLI `@larksuite/cli` ≥1.0.59；环境变量与数据位置；数据库建表 | 「任何一步失败 → 报告页标 err/warn + 在「待办指引」给具体下一步,不静默跳过」 | `SKILL.md:322-441`（尤其 `:331-332,342,347-354,355,357,418-421`） |
| 备忘录 | 测试环境前置 | session autouse fixture 固定 `HELP_INITIALIZED=1`；`env_with_tmp_db` 返回 `{"SKILLS_DB_PATH": <tmp>, "PATH": "/usr/bin:/bin"}` | 无断言 | `tests/conftest.py:11-12,15-23,33-39` |
| 备忘录 | DB 目录 fallback 三分支（测试断言） | Windows → `D:/.db`；Linux 且 `/mnt/d` 存在 → `/mnt/d/.db`；纯 Linux → `~/.local/share/memo` | 断言逐字：「纯 Linux fallback 应为 ~/.local/share/memo,实际 {p}」、「fallback 目录应已创建」 | `tests/test_db_fallback.py:17,43-45` |
| 备忘录 | 「四状态」fallback（**注意：是 HTML 模板渲染态，不是环境检查**） | `success / empty / missing_data / error`（`offline` 已删） | 「{tpl} 缺 emptyState 空态处理(#299 Base 控件)」、「{tpl} 含 'offline' 字样(应已删)」 | `tests/test_4_state_fallback.py:3-8,29-31,50,56` |
| 备忘录 | 仓库结构体检（7 项） | SKILL.md frontmatter / README.md / pytest.ini / `docs/adr/0001..0007` / AGENTS.md 关键词 | 「SKILL.md 缺 YAML frontmatter(--- ... ---)」、「README.md 不存在」、「pytest.ini 不存在」 | `tests/test_skill_structure.py:34,62-63,66,69,86` |

**查不到**：任何名为 `doctor` / `selfcheck` / `--check` 的入口。`script/memo_cli.py` 的子命令表（`:1544-1697`）内没有 `init`，也没有 `--check`；全仓搜 `--check|selfcheck|health|doctor` 只命中文档与测试注释。

### 1.3 居家管家 — 19 条

| 技能 | 检查项 | 判据 | 不合格时的话 | 出处 |
|---|---|---|---|---|
| 居家管家 | 环境检测 `check` | OS（WSL 判定：`WSL_DISTRO_NAME` 存在，或 `/proc/version` 含 `microsoft`）、Python 版本与位数、`db_path`、`db_exists`、DB 目录可写、照片目录可写、三个 env 的现值 | 不打印话，只填 payload：`dirs_writable.db_dir` / `dirs_writable.photos_dir` 为 `false`；env 未设置回填字面量 `"(未设置,走默认)"`。**`status` 恒为 `"ok"`，不能拿它当通过/失败判据** | `scripts/开始使用/cli.py:34,70-71`、`scripts/开始使用/ops.py:32-77`（`"status": "ok"` 在 `:65`） |
| 居家管家 | 初始化状态 `init-status` | DB 文件是否存在 + `categories` 表行数 | 三态，逐字：无库 → `"stage": "未初始化", "detail": "数据库不存在"`；库在但分类空 → `"stage": "库已建,分类未种子化", "detail": "categories 表为空"`；否则 `"stage": "已初始化", "detail": "库存在 + {count} 个分类节点"` | `scripts/开始使用/ops.py:82-94`、`SKILL.md:725` |
| 居家管家 | 建库+分类种子 `init` | 幂等：`init_db()` 建表 + 读 `references/seed_categories.yaml` 导入分类树；分类已有则跳过 | 跳过时 `"skipped": "categories 已有 {existing} 条,跳过种子导入(幂等)"`；种子文件缺失 → `{"error": "seed_file_missing", "reason": "种子文件不存在: {seed_file}", "suggest": "检查 references/seed_categories.yaml 是否随技能分发"}`；种子无 `categories` → `{"error": "seed_empty", "reason": "种子文件无 categories"}` | `scripts/开始使用/ops.py:97,118,126-128,135` |
| 居家管家 | 主密钥首次设置 `account init-master` | `len(master_key) < 8` 即不合格 | `{"success": False, "message": "密钥至少 8 个字符"}`；通过则「Master key 已设置(首次初始化)」；重复 init 打印「✗ master key 已存在;改用 --action set-master 走密钥变更流程」 | `scripts/票据凭证/cli.py:414`、`scripts/accounts.py:109,117,123`、`scripts/home_manager/home_manager.py:579` |
| 居家管家 | 主密钥文件定位 | 四级：`SKILLS_DB_PATH/.master.key` > `skill_dir/.master.key` > 任一父目录 `.db/.master.key` > `skill_dir/.db/.master.key` | 目录被 `mkdir(parents=True, exist_ok=True)` 静默创建；文件不存在 → `is_master_key_set()` 返回 `False`、`verify_master_key()` 返回 `False` | `scripts/accounts.py:32-56,82-84,88-89` |
| 居家管家 | 写路径硬规则校验（v1 公共层） | 5 项：`has_name` / `has_category_id` / `location_depth_ok` / `tags_ok`（`len(tags) >= 10`）/ `remark_ok` | 逐字：「缺少物品名称」「缺少 category_id」「位置必须至少两级」「tag 数量 {n} < 10」「备注不能为空」；调用方打印「✗ 录入失败：位置必须至少两级（含'/'分隔）」后 `return 1` | `scripts/home_manager/validators.py:18,44-61`、`scripts/home_manager/item_ops.py:167-189` |
| 居家管家 | 写路径硬规则校验（v2 域内） | 6 项：`has_name` / `has_category`（查 `categories` 且 `is_active=1`）/ `location_ok` / `price_ok` / `date_ok` / `tags_ok`（`len(tags) <= 30`） | 逐字：「还缺:名称」「还缺:分类」「位置必须至少两级(含'/'),如 卧室/衣柜」「价格必须是 ≥0 的数字(当前 {price!r})」「日期必须是 YYYY-MM-DD 格式」「标签最多 30 个」；返回 `"还缺:" + "/".join(missing)` 或 `"校验不过:" + "/".join(missing)` | `scripts/物品/validators.py:20,40-60,77-79`、`scripts/物品/ops.py:146-150` |
| 居家管家 | 状态机流转校验 | 合法状态 12 项 | 逐字：`"非法状态「{target}」,可选: {…}"`、`"已废弃物品不可流转到「{target}」(仅可恢复为 {…})"`、`"丢失物品「{current}」需先恢复为「在家」,再流转到「{target}」"` | `scripts/物品/validators.py:107-108,112,120,125,128` |
| 居家管家 | 照片路径前置校验（同一规则写了两遍） | 照片必须在照片目录下 | v1：`ValueError`「照片路径必须放在环境变量目录下\n  要求路径以: {photos_dir}\n  当前路径:   {photo}\n  请先将图片复制到 {photos_dir} 后再传入」；v2：`return False, f"照片路径必须放在 {photos_dir} 下,当前 {photo}", None` | `scripts/home_manager/item_ops.py:114-122`、`scripts/物品/ops.py:170-173` |
| 居家管家 | 依赖预检 | 缺 pyyaml 即非零退出 | `except ImportError: sys.exit("缺少 pyyaml: pip install pyyaml")`（字符串参数 → 退出码 1）；另一处硬依赖 `cryptography` 在 `import` 期直接崩 | `scripts/场景合并.py:19-21`、`scripts/accounts.py:18`、`scripts/home_manager/home_manager.py:37` |
| 居家管家 | 数据库结构断言（测试） | 4 张核心表齐全 + 外键已启用 | `assert not missing, f"缺失核心表: {missing}"`；`assert result[0] == 1, "外键未启用, item_locations.item_id 可能悬空"` | `tests/test_db_schema.py:11-18,55-58` |
| 居家管家 | 输出目录契约断言（测试） | `$SKILLS_DB_PATH/home_manager_html` | `assert out_path.parent == tmp_path / "home_manager_html"` | `tests/test_render.py:278` |
| 居家管家 | 首次使用 6 步 | ①环境检测 ②路径确认（**必须征求用户确认，不静默**）③建库+建分类（幂等）④状态确认 ⑤渲染向导 ⑥完成 | 失败 → `emit_error` 错误回执 HTML（步骤/原因/建议）+ 一键重试 | `SKILL.md:720-727`、`:791-792` |
| 居家管家 | `lint` 数据健康检查（8 项） | 1 无标签物品 2 无位置物品 3 状态时效（快递中 >7 天 / 旅游中 >30 天 / 维修中 >30 天 / 借用中 >30 天）4 单级位置（路径不含 `/`）5 无照片物品 6 未录价格 7 无购买或过期日期 8 相似位置未合并；每项 `{key,title,severity(high/mid/low),count,samples,fix_prompt}`；`healthy = issues_total == 0` | 输出 = 环境信息头部 + 8 检查项（问题/涉及数/严重度）+ 勾选复制修复引导；处理原则逐字「**只建议不自动改**：AI 不得直接修改数据,只能复制对应场景 prompt 引导用户」 | `SKILL.md:688-712`、`scripts/开始使用/ops.py:215-368,373-384` |
| 居家管家 | 备份历史 | `backup-list [--keep-n N]`：备份文件/大小/时间/距上次备份天数 | — | `SKILL.md:731` |
| 居家管家 | commit 前 fail mode 自检清单 | 软规则（无代码强制）；AI 在涉及 12 唤醒词的 commit 前必须自检，未过不得 commit | — | `SKILL.md:630-634` |
| 居家管家 | 测试环境前置 | session fixture 把 `SKILLS_DB_PATH` 指向 `tmp_path_factory` 并 `importlib.reload(home_manager.db)`；只断言 8 个顶级分类种子已插 | 无断言消息；teardown 恢复 env 并再 reload | `tests/conftest.py:17-21,24-52` |
| 居家管家 | 真实库隔离 | docstring 逐字「不再直连生产库」「全量 pytest 与生产库物理隔离,消除跨进程竞态」 | — | `tests/conftest.py:28-31` |
| 居家管家 | HELP 页初始化横幅的数据源 | `_is_initialized()` 查 `home_manager.db` 的 `_find_db_path(...)` 算出的库文件是否存在；`HELP_INITIALIZED` 可覆盖 | 无 | `scripts/help_center.py:38,44-49` |

**`scripts/` 下的 `_*.py` 全部是一次性脚本，不是自检设施**（不要在写新面板时当判据）：`_final_self_audit.py`（硬编码 `DB = r"D:\2Study\StudyNotes\.db\home.db"`，逐个关键词打印 `✓`/`✗`，无退出码、无阈值，还 `subprocess.run` 调别的技能脚本 `:53`）、`_check_1026_1027.py`、`_check_kitchen_freezer.py`、`_add_sam_items.py`、`_finalize_water_jia.py`、`_fix_remarks_v2.py`、`_process_water_jia_and_fix_remarks.py`、`_update_egg_to_fridge.py`、`_update_jimmy_dean.py`、`_update_jimmy_dean_back.py`——全部硬编码生产库或照片路径，无失败判据。

**查不到**：`scripts/` 与 `references/` 里搜 `doctor` / `self_check` / `selfcheck` / `preflight` / `体检` 零命中；「环境检测」只出现在 `scripts/开始使用/ops.py:2,29,33`、`scripts/开始使用/cli.py:2,34`、`tests/test_开始使用.py:3,34,37,614`。

### 1.4 作息管家 — 22 条，四家里唯一带完整「检查项 → 报告页」管线的

| 技能 | 检查项 | 判据 | 不合格时的话 | 出处 |
|---|---|---|---|---|
| 作息管家 | 环境检测 `check` | OS / Python ≥3.7（`(int(major),int(minor)) >= (3,7)`）/ 数据目录可写 / DB 表数 `db_ready = tables >= EXPECTED_TABLES`（`EXPECTED_TABLES = 4`）/ `category_whitelist.yaml` 存在 / 飞书三档 | 结构化 JSON，`items` 三态 `ok`/`warn`/`err` | `scripts/setup_scenarios.py:12-17,63,139-172,218-256` |
| 作息管家 | 报告页 item「Python 可运行」 | `python_ok` | `err`，desc 形如「3.9.13 (64bit) (需 ≥3.7)」 | `scripts/setup_scenarios.py:146-150,223-224` |
| 作息管家 | 报告页 item「数据位置可写」 | `_dir_writable(db_dir)`：建目录 + 写 `.write_probe_<pid>` + 删 | `err`，action 逐字「检查目录权限后重试」 | `scripts/setup_scenarios.py:97-106,162,225-226` |
| 作息管家 | 报告页 item「数据库已建」 | 只读 URI 数 `sqlite_master` 里非 `sqlite_%` 的表；`db_ready = tables >= 4` | `warn`，desc「{tables}/4 表 · {db_path}」，action「待建库(开始初始化)」 | `scripts/setup_scenarios.py:80-94,166,227-229` |
| 作息管家 | 报告页 item「分类白名单就绪」（老技能原文用「白名单」，本仓口径写「允许清单」；此处保留原文以便对照） | `WHITELIST_PATH = SKILL_DIR / "category_whitelist.yaml"` 存在 | `err`，action 逐字「缺失 category_whitelist.yaml,请检查技能目录完整性」 | `scripts/setup_scenarios.py:58,167-168,230-231` |
| 作息管家 | 飞书三档探测 | ① lark-cli 在 PATH 或候选路径表 ② `lark-cli auth status` user/bot 至少一个 ready ③ 日历可写（`+agenda` 拉到议程或 dry-run `+create` 不报无权限） | `full` → 飞书联动 `ok`「飞书同步已配置(lark-cli 已授权,日历可写),配合飞书效果最好」；`partial` → `fail`「飞书同步配置不完整(lark-cli 已装但未授权或日历不可写)」action「说「配置飞书」补全授权」；`missing` → `skip`「飞书同步未配置(强烈建议配置 · 配合飞书效果最好;不配则飞书同步不可用)」action「说「配置飞书」补装」 | `scripts/feishu_sync.py:44-60,78-97,126,204,222-277`、`scripts/setup_scenarios.py:122-136,181-192` |
| 作息管家 | 飞书探测唤醒词 | `python scripts/feishu_sync.py`（self-check 模式） | `full` → 询问是否同步；`partial` → 跳过并提示 `lark-cli auth login`；`missing` → 跳过并给一行安装命令 | `SKILL.md:1192-1211` |
| 作息管家 | 首次使用 6 步 | `check` → 路径确认（**默认即确认，不静默**）→ `init` → `status` → `render-first-use` → 完成 | 报告页 = 6 步 + 飞书强引导；`stage` 四态 `error` / `need_init` / `already` / …，各有逐字 `hint` 与 `next_act.prompt` | `SKILL.md:281-283,536`、`scripts/setup_scenarios.py:19-21,259-299` |
| 作息管家 | 输出目录不存在 | 所有命令「目录不存在时报错退出」，错误文案带字段名 + 当前值 + 期望值 + 修复建议 | 逐字：「HTML 输出目录不存在: 字段 record_dir(派生自环境变量 SKILLS_DB_PATH),当前值 $SKILLS_DB_PATH/schedule_html/record,期望 SKILLS_DB_PATH/schedule_html/record/ 存在,建议: mkdir -p $SKILLS_DB_PATH/schedule_html/record 或检查 SKILLS_DB_PATH 环境变量」 | `references/CLI命令.md:305-311` |
| 作息管家 | `check` 整命令异常 | 异常兜底 | `{"status": "error", "error": "check_failed", "reason": …, "suggest": "检查运行环境后重试"}` 并 `sys.exit(1)`。**注意 `_check_env()` 本身恒返回 `"status": "ok"`**，结论只在各字段里 | `scripts/setup_scenarios.py:171,418-425` |
| 作息管家 | 建库 `init` | 幂等：全部 `CREATE TABLE IF NOT EXISTS`；建 `schedule_records` / `daily_summary` / `schedule_plans_legacy_2026_06_29`，并把旧 `schedule_plans` 改名后立即建新版 | 成功打印「✓ 数据库初始化完成」；**无失败判据**（唯一失败形态是 `mkdir` 抛 `OSError`） | `scripts/schedule_cli.py:653-655`、`scripts/schedule_db.py:103-193` |
| 作息管家 | 同步粒度校验（`block_count`，写进规范的前置+后置） | 区间内消息总数 → 最少 block 数 = `ceil(总数/5)`；对比 `schedule_records` 实际条数；`actual_count >= required_min` 才算过 | 原文：「Block 数量不足：当前 {messages_per_block} 条消息/1个block 规则，区间共 {total_messages} 条消息，最少需要 {required_min} 个 block，实际只有 {actual_count} 个。请将活动拆分得更细致，每{messages_per_block}条消息一个block。」 | `scripts/block_count.py:33-51,54-112`、`references/同步流程.md:77-103` |
| 作息管家 | 迁移脚本前置探测（**无自动调用点，只能人工跑**） | plan 迁移按 4 种 schema 场景分支；categories 迁移先判库存在 | plan：「→ schedule_plans 表既不是旧 schema 也不是新 schema，字段：… → 请人工检查后重跑。」；categories：「✗ DB not found: {DB_PATH}」+ `return 1` | `scripts/migrate_plan_to_events.py:145-213`、`scripts/migrate_categories.py:140-143` |
| 作息管家 | 分类允许清单加载 | `category_whitelist.yaml` 存在时取并集（不覆盖）；**文件不存在或 YAML 损坏即静默回落到内置 `DEFAULT_WHITELIST`** | 无任何提示；`check` 只判文件是否存在 | `scripts/validators.py:22,25-34,44-71` |
| 作息管家 | 飞书 CLI 异常文案 | — | `FileNotFoundError("未找到 lark-cli，请先安装（npm i -g lark-cli）")`——**这条文案教的正是本技能禁止清单里的僵尸包**（见 §三 3.4） | `scripts/feishu_sync.py:149-151` |
| 作息管家 | 公共组件资产 | 需要 `公共组件/injector.py` 与 `assets/base.js` | `raise RuntimeError("Base Skill 资产缺失: 找不到 公共组件/injector.py。请确认 公共组件/ 目录已安装")`；`help_render` 找不到 base 资产时**静默返回空串** | `scripts/schedule_html_render.py:329-333`、`scripts/help_render.py:51-64` |
| 作息管家 | 模板与内联资源 | `templates/` 下模板文件；`_record_styles.css` / `_record_engine.js` / `_copy_prompt_helper.js` 按模板里的 `<link>`／`<script>` 才读 | 模板缺失 → `FileNotFoundError(f"模板不存在: {template_path}")`，被 `render_and_write` 收成 `{"status":"error","message":"渲染失败: …"}`；内联资源缺失 → 裸 `FileNotFoundError`，**无兜底** | `scripts/schedule_html_render.py:291-292,302-317,3275-3282` |
| 作息管家 | 场景资产 | `references/scenarios.yaml` | 缺失 → `load_scenarios()` 返回 `([], "场景资产不存在: {path}")`，**不抛异常**；缺 PyYAML → `"缺少 PyYAML 依赖(运行: pip install pyyaml)"`；字段缺 → `"第 {i+1} 条场景缺字段: {missing}"` | `scripts/help_render.py:44,108-135` |
| 作息管家 | 飞书可用度（面板可直接取） | `is_feishu_available()` 的 `tier` / `cli_path` / `last_error` | 写库路径上不可用时打印「ℹ️ 飞书能力不可用或未授权——本批事件仅写入本地数据库。」后 `return`，**不阻塞、退出码 0** | `scripts/feishu_sync.py:93-101,103-104`、`scripts/schedule_cli.py:832-847,856-862` |
| 作息管家 | 测试环境前置（写成硬规矩） | docstring 逐字：「禁止: 无 SKILLS_DB_PATH 直接跑 CLI(会落 D:/.db win / ~/.local/share/schedule-guardian/db linux)」 | — | `tests/conftest.py:5-11,64-93`；同文 `references/操作规范.md:47-51` |
| 作息管家 | 契约门（测试） | 跑 `../技能互联/check_public_contract.py`，`returncode != 0` 即红 | 断言失败即红 | `tests/test_contract_gate.py:19-29` |
| 作息管家 | 模板占位符契约（测试） | 19 个模板各含 3 个占位符、每个恰 1 次 | 断言失败即红 | `tests/test_base_pipeline.py:5,31-36` |

**查不到**：`scripts/` 下没有 `doctor` / `selfcheck` / `self_check` / `体检` / `preflight` / `--check` 的设施；这些词只命中一次注释 `scripts/feishu_sync.py:1041`（`# 自检：直接 python feishu_sync.py 时打印探测结果`）。`scripts/validators.py:44-71` 与 `PUBLIC_DOMAINS.py` **都不含自检代码**。

---

## 二、四家取值对照表

列＝项名 / 老技能取值与出处 / 缺了会怎样 / 能不能直接当新面板的检查项（能／要改／不能 ＋ 一句理由）

### 2.1 私家大厨

| 项名 | 老技能取值与出处 | 缺了会怎样 | 能不能直接当新面板的检查项 |
|---|---|---|---|
| 数据目录 | env `SKILLS_DB_PATH`（`scripts/db_config.py:48-50`）；未设则走 `_fallback_db_dir()`（`:29-35`） | Windows 静默用 `D:/.db`；非 Windows 且有 `/mnt/d` → `/mnt/d/.db`；**两者都不成立**才抛 `RuntimeError`（`:36-39`）；纯路径解析不建目录（`:41-52`），建目录下沉到写连接（`:56-58,87`） | 要改：老技能在 Windows 恒有兜底、缺 env 永不报错，新仓是 `SKILLS_DB_PATH` 未设即 `fail(1)`（t692 §一 大厨行，`packages/skill-chef/src/fetch/paths.ts:11-16`）；判据要按新仓口径写成「设了没有 / 目录在不在 / 能不能写」 |
| 库文件 | 常量 `chef_data.db`（`scripts/db_config.py:22`），`DB_PATH = _find_db_path(SKILL_DIR, DB_FILENAME)`（`:54`） | 只读 check 报 `db_exists=false`、`db_tables=0` 但不抛错（`scripts/开始使用/ops.py:92-105`）；写连接由 SQLite 隐式建空库（`scripts/db_config.py:85-91`）；备份时抛 `FileNotFoundError(f"数据库文件不存在: {src}")`（`scripts/db.py:69-70`） | 要改：新仓库名是代码常量、不可配（t692 §3.3），面板只能显示不能改；检查项应为「文件在不在 + 17 表齐全」 |
| HTML 产物目录 | env 链 `SKILLS_DATA_DIR` > `CHEF_OUTPUT_DIR`（`scripts/output_config.py:15,37-41`）→ 平台兜底 `D:/CookHub`（`:18,24-25`）/ `/mnt/d/CookHub`（`:19,26-28`） | 非 Windows 且无 `/mnt/d` → `RuntimeError`（`scripts/output_config.py:29-32`）；Windows 静默用 `D:/CookHub` | 要改：新仓产物目录是常量 `cook_html/help`、不可配（t692 §一 大厨行），且老技能这里一个 env 同时兼作 DB 兜底语境，口径不能照抄 |
| 输出子目录（14 个） | 按产物类型固定：`录入/`、`recipes/`、`cooking/`、`shopping/`、`list/`、`timeline/`、`dashboard/`、`派生/`、`quality/`、`batch_edit/`、`backup/`、`help/`、`setup/`、`修改/`（`SKILL.md:260-275`） | `get_output_dir(sub)` 自动 `mkdir(parents=True)`（`scripts/output_config.py:44-48`） | 不能：老技能按产物类型散成 14 个固定子目录名，新仓只有 HELP 与速查两支，不属可配项 |
| 产物文件名主体 | `<主体>_<YYYYMMDD_HHMMSS>` + `_N` 防覆盖（`scripts/align_08.py:53-65`）；唯一例外 `recipes/<recipe_slug>.html`（`SKILL.md:264`） | `_N` 自增，永不覆盖（`SKILL.md:277` 自称 HELP 那支还是单次覆盖，与实现不符，见 §三） | 能：产物命名规则可直接当检查项（查「同名是否被覆盖」） |
| 照片（三个目录） | `PHOTO_DIRS = ["photos", "source_photos", "work_photos"]`（`scripts/export_backup.py:42`）；`DIRS = {"photo": "photos", "source": "source_photos", "work": "work_photos"}`（`scripts/photo_utils.py:73`） | 存在才打包，缺则计数 0 继续（`scripts/export_backup.py:56-62`） | 要改：新仓只有记录里的一列 `photo_url`，且是 `chef://` 前缀加相对路径（`scripts/photo_utils.py:42,58,95-97`、t692 §2.3），没有「照片目录」这项配置 |
| 图片命名空间前缀 | `CHEF_OUTPUT_DIR_PREFIX` 默认 `chef://`（`SKILL.md:254`）；实现里硬编码 `_CHEF_PREFIX = "chef://"`（`scripts/photo_utils.py:42`） | 无「缺」的状态——代码不读这个 env，只用常量 | 不能：`SKILL.md` 登了但实现不读（见 §三） |
| 场景资产 | `references/scenarios.yaml`（`scripts/render_help.py:32`）；写入口 `scripts/场景合并.py:25-26,29-30`（`DEFAULT_SCENES_DIR = SKILL_DIR / "scenes"`） | 缺 → `print(f"❌ 场景资产加载失败: {e}", file=sys.stderr)` + `return False` → `sys.exit(0 if ok else 1)` | 能：老技能有明确的退出码与文案，可照抄判据 |
| 包内模板目录 | `<包根>/templates`，分域子目录 `派生|修改|历史|录入|开始使用|搜索筛选/`（`scripts/render_quality_report.py:16`、`render_batch_edit.py:34`、`export_backup.py:39`、`render_help.py:35`） | 模板缺失分三类行为：抛 `FileNotFoundError`（`render_batch_edit.py:165-166` 等）／`stderr` + 非零（`render_help.py:169-171,271-272`）／静默 `return` | 不能：包内固定，按 t692 §一 的口径不上设置页 |
| 外部 CLI | **查不到**。`(?i)lark\|feishu` 在 `.py` 里零命中；只有 `scripts/import_orchestrator.py:14` 的一句注释「飞书 webhook(以后)」 | — | 不能：没有可检查的外部 CLI |
| Python 依赖 pyyaml | `scripts/开始使用/ops.py:83,95-96` 检测 `yaml` 模块；`:131-134` 给安装命令 `{sys.executable} -m pip install --user pyyaml` | 缺失 → 进 `missing`；`render_help.py` 顶层 import 会 `ImportError` | 不能：新仓是 TypeScript，没有这个依赖 |
| PATH 上的 `python3` | `"python3"` 字面量起子进程：`data_quality_report.py:31,46,163`、`render_data.py:51`、`render_batch_edit.py:39,48`（其余用 `sys.executable`） | PATH 上没有 `python3`（Windows 常见）→ 子进程起不来，命令崩 | 不能：新仓不是 Python 线 |

### 2.2 备忘录

| 项名 | 老技能取值与出处 | 缺了会怎样 | 能不能直接当新面板的检查项 |
|---|---|---|---|
| 数据目录 | env `SKILLS_DB_PATH` → `Path(env)/memo.db`（`script/memo_cli.py:50-52`）；未设则 `_fallback_db_dir()`（`:54-56`） | 三分支全自动创建、**不报错**：Windows → `D:/.db`（`:38-39`）；Linux 且 `/mnt/d` 存在 → `/mnt/d/.db`（`:40-42`）；纯 Linux → `~/.local/share/memo` 且 `mkdir(parents=True)`（`:43-45`） | 能，但要加一列：老技能会把实际来源（env 还是 fallback 哪一支）一起报出来，新面板应显示「当前生效值 + 来源」（新仓 `SKILLS_DB_PATH` 未设即 `fail(1)`，见 t692 §一 备忘行） |
| 库文件 | `DB_FILENAME = "memo.db"`（`script/memo_cli.py:29`）；`DB_PATH` 是模块级常量、import 时求值一次（`:59`） | `get_conn()` 直接 `sqlite3.connect(DB_PATH, timeout=10)`（`:68`），SQLite **静默新建空文件**；首条 SQL 才抛 `no such table`，被 `search_notes` 兜住 → 打印 `{"status": "error", "message": "no such table: notes"}` 并 `sys.exit(1)`（`:78-80,252-253`） | 要改：新仓打开前先 `stat`，文件不在抛 `MEMO_DB_MISSING`、绝不建空库（t692 §一 备忘行，`packages/skill-memo-ilife/src/fetch/db.ts:6,61-66`）；老技能「静默建空库」正是新面板要暴露的失败态 |
| HTML 产物目录 | `DB_PATH.parent / f"{SKILL_HTML_NAME}_html"`，`SKILL_HTML_NAME = "memo"`（`script/memo_render.py:25,114-121`）；即 `SKILL.md:96` 写的 `<SKILLS_DB_PATH>/memo_html/` | `:130` `out_dir.mkdir(parents=True, exist_ok=True)` 自动创建 | 要改：新仓是常量 `memo_html`、不可配（t692 §一 备忘行） |
| 产物文件名规则 | `f"{name}_{ts}.html"`，`ts = %Y%m%d_%H%M%S`；同秒冲突追加 `_2` / `_3`（`script/memo_render.py:131-140`） | 无 | 要改：`name` 实为中文显示名（`memo_render.py:197` 传 `"备忘录查询"`、`:447` 传 `"备忘录_初始化报告"`），与 `SKILL.md:106,109` 说的「CLI 子命令名」不符 |
| HELP 三副本 | 时间戳副本 + 技能根 `备忘录.html`（**永远写**，`script/memo_render.py:626`）+ 可选 `--output`（`:634-641`，`:636` 自动建父目录） | 无 | 能 |
| 附件前缀 | env `MEMO_MEDIA_DIR`，缺省 `media`（`script/memo_cli.py:107-110`）；**只做字符串前缀匹配**（`:112-116`），不解析成目录、不创建、不检查存在 | 无任何错误；默认值相对**进程 cwd** | 要改：新仓同名变量也只作前缀、不校验文件在不在（t692 §一 备忘行，`packages/skill-memo-ilife/src/policy/crud.ts:29-34`）；面板要给它做一项，得先裁定「填目录还是填前缀」 |
| 技能根 `output/` 目录 | **代码不引用**（全仓搜 `output/` 只命中 `tests/test_render.py:5` docstring 与 `tests/test_payloads.py:120` 注释） | 无影响 | 不能：是人工分析简报目录（含 `.trash/`），与运行无关 |
| 包内模板目录 | 6 个模板路径常量（`script/memo_render.py:30-35`），`:468` 直接 `read_text` | `FileNotFoundError` **未被捕获**（`script/memo_cli.py:1772-1783` 只 catch `JSONDecodeError`）→ traceback + 非零退出 | 不能：包内固定 |
| 场景资产 | `SCENARIOS_PATH = SKILL_DIR/"references"/"scenarios.yaml"`（`script/memo_render.py:37`） | `raise FileNotFoundError(f"场景资产缺失: {SCENARIOS_PATH}")`；无 pyyaml → `raise RuntimeError("缺少 pyyaml,…")`（`:474-479`） | 能 |
| 兄弟目录 `公共组件/` | `BASE_SKILL_DIR = SKILL_DIR.parent / "公共组件"`（`script/memo_render.py:28`），需 `injector.py`、`assets/base.js`、`assets/base.css`、`assets/help_template.html` | `RuntimeError`「Base Skill 资产缺失: 找不到 公共组件/injector.py。请确认 公共组件/ 目录已安装(#268 Base 定稿入库)。」（`:83-87`）；js/css 缺失是裸 `FileNotFoundError` | 能：这是「包内固定但会缺」的一项，判据与文案现成 |
| 外部 CLI：飞书 | Windows `%APPDATA%` + `/npm/lark-cli.cmd`（`script/feishu_sync.py:131-134`）→ `where lark-cli`（`:137`）；POSIX `which lark-cli`（`:152-153`）→ `/usr/local/bin/lark-cli`、`/usr/bin/lark-cli`（`:162-164`）；TTL 缓存 300 s（`:168-169`） | `is_feishu_available()` 返回 `False`（`:186`），**不抛异常**；缺 CLI 时本地写库照常成功（`script/memo_cli.py:153-156` 只在 `category=="心愿"` 且可用时联动），反向同步返回 `{"errors": ["feishu CLI not available"]}`（`script/feishu_sync.py:579-584`） | 能：新仓同形（`LARK_CLI_PATH` → `%APPDATA%` 兜底 → `where` 探测，t692 §一 备忘行），三档判据可照抄 |
| 外部 CLI：授权助手 | `scripts/feishu_auth_helper.py:29` 把 `LARK_CLI = "lark-cli"` 假定在 PATH（**不做路径探测**，与 `feishu_sync._find_lark_cli` 逻辑不一致）；QR 目录 `Path(tempfile.gettempdir())/"memo_feishu_qr"`（`:32`） | `raise RuntimeError(f"lark-cli config init 失败:\n{result.stderr}\nstdout: {result.stdout}")`（`:69`）；版本太老 → `raise RuntimeError("lark-cli 版本太老,不支持 --no-wait。…")`（`:64-68`）；QR 失败 → `raise RuntimeError(f"生成 QR 失败:…")`（`:101`） | 要改：抛异常但无退出码口径，且 PATH 假设未校验 |
| 飞书权限清单 | `REQUIRED_SCOPES` 5 项（`script/feishu_sync.py:51-59`）；sentinel 前缀 `[备忘录测试]`（`:62`） | `check` 输出 `required` / `granted` / `missing` / `app_scopes` / `sentinel_write_test` | 能：这是四家里最完整的「配的值现在通不通」判据，含真打验证 |
| 调度参数 | `CRON_INTERVAL_MINUTES = 5` / `ADVANCE_TRIGGER_MINUTES = 10` / `GRACE_PERIOD_MULTIPLIER = 2`（`script/memo_cli.py:24-27`），**模块级常量、无 `os.environ`** | 不可配置，无失败路径 | 要改：`SKILL.md:1027,1032-1033` 说这三个可配，实际硬编码（见 §三） |
| 提醒调度器 | `env["SKILLS_DB_PATH"] = str(DB_PATH.parent)`（`script/reminder_scheduler.py:14`）；命令硬编码 `["python3", cli_path, "due"]`（`:16`） | 无 `python3` → `FileNotFoundError` 被 `except Exception as e: print(f"提醒检查失败: {e}")` 吞掉，**退出码仍 0**（`:28-29`）；无提醒打印 `NO_REPLY`（`:27`） | 能：检查项 =「`python3` 可用 + `due` 命令跑得起来」，这两条现在都没有判据 |
| 备份 | **查不到**（全仓搜 `backup` 无实现） | — | 不能 |

### 2.3 居家管家

| 项名 | 老技能取值与出处 | 缺了会怎样 | 能不能直接当新面板的检查项 |
|---|---|---|---|
| 数据目录 | env `SKILLS_DB_PATH`（`scripts/home_manager/db.py:28-34`）；未设则 `_fallback_db_dir()`（`:14-24`） | Windows → `D:/.db`；非 Windows 且有 `/mnt/d` → `/mnt/d/.db`；**都不成立**才抛 `RuntimeError`，逐字「SKILLS_DB_PATH 未设置，且 D: 盘未挂载到 /mnt/d/。请检查 WSL automount 配置或设置 SKILLS_DB_PATH 环境变量。」（`:21-24`）。命中 env 时 `p.parent.mkdir(parents=True, exist_ok=True)`（`:33`） | 要改：老技能 Windows 恒有兜底，新仓 `SKILLS_DB_PATH` 未设即 `fail(1)`（t692 §一 居家行） |
| 库文件 | 常量 `home.db`（`scripts/home_manager/db.py:11`），`DB_PATH`（`:41`） | 不存在时 `init_db()` 建库建表 | 要改：新仓库名是代码常量、不可配 |
| HTML 产物根 | env 链 `SKILLS_DATA_DIR` > `SKILLS_DB_PATH` > fallback（`scripts/render/__init__.py:117-127`） | 都不成立 → `RuntimeError`，逐字「SKILLS_DATA_DIR 未设置,且 D: 盘未挂载到 /mnt/d/。请设置 SKILLS_DATA_DIR 或 SKILLS_DB_PATH 环境变量。」（`:111-114`） | 要改：**这是四家里最该报的一项**——DB 根只认 `SKILLS_DB_PATH`（`db.py:28`），HTML 根却先认 `SKILLS_DATA_DIR`（`render/__init__.py:121-126`）；两值不一致时产物与库分离，面板必须并排显示 |
| HTML 产物子目录 | `<根>/home_manager_html/<command_cn>_<YYYYMMDD>_<HHMMSS>.html`（`SKILL.md:383,387`）；`command_cn` 由静态映射表给（`SKILL.md:391-413`，22 个模板名） | `out_dir.mkdir(parents=True, exist_ok=True)`（`scripts/render/__init__.py:138`） | 要改：新仓是常量 `home_manager_html`、不可配（t692 §一 居家行） |
| 照片目录 | 三层：env `HOME_PHOTOS_DIR`（**仅当 `p.is_dir()` 为真才采用**，`scripts/home_manager/db.py:47-50`）→ 逐级上级目录里的 `photos`（`:51-54`）→ 技能目录 `photos`（`:55`） | env 指向不存在或非目录 → **静默回落到下一层**，不报错 | 要改：新仓没有照片目录这项配置（照片按记录存一列，t692 §2.4）；且老技能这条的「静默回落」正是新面板要暴露的失败态 |
| 种子分类 | `SEED_FILE = SKILL_DIR / "references" / "seed_categories.yaml"`（`scripts/开始使用/ops.py:24`）；文件 143 行，声明 8 顶级 + 52 二级 = 60 节点（`references/seed_categories.yaml:1`）；8 个顶级分类（`tests/conftest.py:17-21`） | 缺失 → `seed_file_missing`（见 §一 1.3 建库行）；建分类时读种子失败 | 能：老技能给了逐字错误码与建议，可直接当检查项的文案来源 |
| 分类数据 | 8 个顶级分类由 `init` 幂等插入；`lint` 第 1/2/8 项都依赖分类与位置表 | — | 不能：这是数据体检项，不是配置项 |
| 备份目录 | `BACKUP_DIR_NAME = "backups"`，落 `<DB 目录>/backups`；`BACKUP_KEEP_N = 5`（`scripts/开始使用/ops.py:25-26,434-437`） | 目录不存在 → `mkdir(parents=True, exist_ok=True)` 静默创建；备份失败 → `{"status": "error", "error": "backup_failed", "reason": str(e), "suggest": "检查数据库/照片目录可读性后重试"}`（`:447-452`） | 能：**老技能有真实现**——`backup_payload()` 打包 db+照片（`scripts/开始使用/ops.py:440-462`，`:534-537` 用 `zipfile` 写 `photos/`），还有 `import_undo_payload()` 做覆盖前二次备份（`:465-474`）。新仓居家只回回执、没有落点（t692 §四第 6 条，`packages/skill-home/src/cli/cmd_read.ts:696-697,723-731`）；面板这一项要按老技能行为写判据，但实现得先在**新仓**补齐 |
| 包内模板目录 | `TEMPLATES_DIR = SKILL_DIR / "templates"`（`scripts/render/__init__.py:20-21`），实测 60 个 `.html`、含 9 个子目录 | 模板文件缺失 → `{"status":"error", "message": "模板不存在: {template_path}"}`（`:152-157`）；占位符数量不符 → `"模板 {name} 必须包含恰好 1 个 {DATA_PLACEHOLDER} 占位符，实际 {n} 个"`（`:167-172`） | 不能：包内固定 |
| 场景清单 | `references/scenarios.yaml`（`scripts/help_center.py:26`、`scripts/位置/scenes.py:10`、`scripts/票据凭证/payloads.py:19`、`scripts/场景合并.py:14`） | `help_center.py:62` 直接 `yaml.safe_load(...)`，**无 try/except** → `FileNotFoundError` 冒泡；`scripts/票据凭证/payloads.py:22-25` 同样无保护 | 能 |
| `scenes/` 目录 | `DEFAULT_SCENES_DIR = SKILL_DIR / "scenes"`（`scripts/场景合并.py:13`），实测 6 个片段（`SM1/SM2/SM3/SM5/SM6/SM8.yaml`） | 仅构建期使用（合并进总账），运行时不读 | 要改：运行时不依赖，面板不该把它列为运行前置 |
| `references/` 其余文档 | `categories.md`、`commands.md`、`database.md`、`statuses.md`、`scenarios.bak-250-*.yaml` | **代码不读**（只有两处注释提到） | 不能 |
| 外部 CLI | **查不到**（`scripts/` 与 `references/` 内搜 `lark`/`飞书`/`feishu` 零命中） | — | 不能 |
| 跨技能联动 | 不做进程调用，只生成待粘贴 prompt（`scripts/联动/ops.py:4-5,19-20`）；CLI 只有 3 个子命令 | — | 能（作为「没有外部依赖」这一事实的检查项） |
| 自身解释器调用 | `subprocess.run([sys.executable, …/home_manager.py, "help", "--output", str(TEMP)])`，`TEMP = Path("/tmp")/"__居家管家_help_generated.html"`（`scripts/build_manual.py:19,28-34`） | 子进程非零 → 打印「✗ HELP HTML 生成失败:\n{stderr}」+ `sys.exit(r.returncode)`（`:35-37`） | 要改：`/tmp` 在 Windows 会解析到当前盘根，不是可移植值 |
| Python 依赖 | `cryptography` 硬依赖（`scripts/accounts.py:18`）；`pyyaml` 硬依赖（`scripts/help_center.py:21`、`scripts/位置/scenes.py:6`、`scripts/开始使用/ops.py:15`） | 缺 `cryptography` → `ImportError` 在 `scripts/home_manager/home_manager.py:37` 的 import 期直接崩；缺 `pyyaml` 同样在 import 期崩（`scripts/场景合并.py:19-21` 有 `sys.exit` 兜底，其余三处没有） | 不能：新仓是 TypeScript |
| 主密钥文件 | 四级定位见 §一 1.3 | 目录静默创建；文件不存在 → `False` | 能：这是真路径值，可当检查项 |
| 技能根 `.db/` | 无任何代码把它当数据目录（代码的 fallback 是盘根 `D:/.db`）；实测只含 1 个历史产物 `__sync_test_help.html`，**不含数据库** | — | 不能：概念重复且与代码不符，面板只该暴露 `SKILLS_DB_PATH` 一个概念 |
| 技能根 `.bak/`、`.notes/`、`output/` | `.bak/` 只有 1 个分类表 SQL 转储；`.notes/` 33 个设计稿与截图；`output/`（被 `.gitignore:16` 忽略）实测约 1400 个文件，`CONTEXT.md:38` 还把它列为运行产物 | **无任何代码写 `output/`**（所有写路径都走 `_auto_output_path`，`scripts/render/__init__.py:130-147`） | 不能：都是历史遗留目录，不是配置项 |
| 第三处 DB 路径（不一致） | `scripts/cleanup_test_items.py:24` `DB_PATH = Path(__file__).parent.parent / ".db" / "home.db"`——指向**技能目录内** `.db/` | 实测该路径无文件 | 要改：遗留 fallback，面板不该把它当有效位置 |
| `config-home-manager.ts` | 技能根 619 行，声明式常量 `export const HomeManagerConfig = {...}`（`:16`）；`meta.dbFiles: ["home.db"]`（`:24`，**只有文件名没有目录**）；5 张表（`:29-105`）；14 条 queries（`:109-355`）；10 条 actions（`:358-495`）；12 条 views（`:498-618`） | **不校验**——文件内无任何 `if`／`throw`／`validate` 逻辑，只是数据字面量 | 要改：可作表/字段/视图清单的参考，但三处已过时——文件头 `:5-13` 自述「⚠️ 已过时警告(2026-07-03)」「DB_SCHEMA 仍只列 4 张表…缺 categories 表」「维护策略:暂不维护,等需要 SkillBoard 重新接入时整体重写」；`add-item` 的 `category` 仍 `required: true`（`:367`）；`config-home-manager.ts:60` 的状态选项只有 11 个，实际有 12 个（`scripts/物品/validators.py:107-108`） |

### 2.4 作息管家

| 项名 | 老技能取值与出处 | 缺了会怎样 | 能不能直接当新面板的检查项 |
|---|---|---|---|
| 数据目录 | env `SKILLS_DB_PATH`（`scripts/schedule_db.py:72-77`）→ 平台 fallback：Windows `D:/.db`；其他平台 `~/.local/share/schedule-guardian/db`（`:66-70`） | **不报错**：`base.mkdir(parents=True, exist_ok=True)` 后直接用（`:76`） | 要改：老技能在任何平台都有兜底且自动建目录，新仓 `SKILLS_DB_PATH` 未设即 `fail(1)`（t692 §一 作息行） |
| 库文件 | 常量 `schedule_data.db`（`scripts/schedule_db.py:63`），`DB_PATH = DB_DIR / DB_FILENAME`（`:80`） | 不存在时 `get_connection()` 直接 `sqlite3.connect` 建空库（`:89-94`）；`init` 命令另建表 | 要改：新仓库名是代码常量、不可配 |
| 第二份库（语录库） | `DR_FILENAME = "daily_recorder.db"`（`scripts/schedule_db.py:64`），`DR_DB_PATH = DB_DIR / DR_FILENAME`（`:81`），`get_dr_connection()`（`:96-100`） | `get_dr_connection()` **不检查存在性**；`block_count` 与 `prepare-messages` 读 `user_messages` 表 → 库缺失或空库时抛 `sqlite3.OperationalError: no such table: user_messages`（`scripts/block_count.py:44-48`、`scripts/schedule_db.py:234-240`） | 要改：**实测有位置冲突**——`D:\2Study\StudyNotes\SKILLS\daily_recorder.db` 存在，但按默认链代码算出的路径是 `D:\.db\daily_recorder.db`，两者不是同一文件；面板实施前要先裁定「语录库该用哪一个路径」 |
| HTML 产物目录 | 产物硬绑 `SKILLS_DB_PATH/schedule_html/...`（`SKILL.md:918`、`references/CLI命令.md:212,222`）；`--out` 在文档里被写「不支持」（`SKILL.md:995`）但实现**四处解析它**（`scripts/schedule_cli.py:1610,1658`、`scripts/help_render.py:481`、`scripts/setup_scenarios.py:433`） | 目录不存在时**大多静默 `mkdir`**（`scripts/schedule_html_render.py:428`），只有 `render-record-report` 显式报错退出（`scripts/schedule_cli.py:2274-2282`），逐字文案见 §一「输出目录不存在」一行 | 要改：新仓是常量 `schedule_html/help`（t692 §一 作息行）；且老技能「不静默创建」这句与实现相反，判据不能照抄文档 |
| 包资产目录 `SKILLS_BASE_DIR` | `SKILLS_BASE_DIR` 只作测试隔离 fallback，且仅当 `公共组件/assets/base.js` 不在时才用（`scripts/schedule_html_render.py:35-39`、`scripts/help_render.py:55`） | 真实仓库路径优先，env 不生效 | 不能：这是测试隔离变量、不是给人配的旋钮；面板不该出现这一项 |
| 分类允许清单 | `category_whitelist.yaml`，技能根（`scripts/setup_scenarios.py:58`、`scripts/validators.py:22`）；优先级 `category_whitelist.yaml > DEFAULT_WHITELIST`（`validators.py:47`），存在时取**并集**不覆盖（`:62-70`，注释「避免 YAML 删了某个二级导致校验失败」）。实际文件只有 2 行：`日常:` + `- 园艺`（`category_whitelist.yaml:1-2`） | 文件缺失 → 报告页 item `err`，action 逐字「缺失 category_whitelist.yaml,请检查技能目录完整性」（`scripts/setup_scenarios.py:230-231`）；文件损坏 → `load_whitelist()` **静默**回落内置 `DEFAULT_WHITELIST`（`scripts/validators.py:44-71`）；与库内历史分类矛盾时**无任何校验** | 能（判「文件在不在」与 action 文案可直接照抄）；要改（「清单与库内分类是否一致」这条代码里没有现成实现，得新写） |
| 外部 CLI：飞书 | 候选路径表 10 余条（`scripts/feishu_sync.py:44-60`，含 `%APPDATA%\npm\lark-cli.cmd`、`/opt/homebrew/bin/lark-cli`、`$HOME/.npm-global/bin/lark-cli` 等）+ `shutil.which("lark-cli")`（`:126`）；子进程调用（`:140-191`） | 找不到 → `last_error = "未找到 lark-cli 命令"`（`:241`），`tier = missing` | 能 |
| 飞书授权与日历可写 | `lark-cli auth status` 看 user/bot 至少一个 ready（`scripts/feishu_sync.py:266`）；`_probe_calendar_writable`（`:204,273-277`） | 未授权或日历不可写 → `tier = partial` | 能 |
| 飞书日历标识 | 老技能**没有**具名常量，是函数默认参数 `calendar_id: str = "primary"`（`scripts/feishu_sync.py:293,344,378,402,583`）；新仓把它提成常量 `LARK_CALENDAR_ID`（`packages/skill-schedule/src/fetch/feishu.ts:16`） | — | 要改：是协议常量，不是路径类配置 |
| 写库隔离开关 | **老技能没有这项变量**（新仓有 `SCHEDULE_FORCE_PROD`，`packages/skill-schedule/src/fetch/paths.ts:26-27`） | — | 不能：老技能没有，别硬凑一行 |
| 包内模板目录 | `<技能根>/templates`（`scripts/schedule_html_render.py:29-31`、`scripts/help_render.py:45`、`scripts/setup_scenarios.py:57`） | 模板缺失 → `FileNotFoundError(f"模板不存在: {template_path}")`（`scripts/schedule_html_render.py:291-292`），被 `render_and_write` 收成 `{"status":"error","message":"渲染失败: …"}`（`:3275-3282`） | 不能：包内固定 |
| 模板内联资源 | `_record_styles.css` / `_record_engine.js` / `_copy_prompt_helper.js`——按模板里出现对应 `<link>`／`<script>` 才读（`scripts/schedule_html_render.py:302-317`） | 模板引用了但文件缺失 → `read_text` 抛 `FileNotFoundError`，**无兜底** | 不能：包内固定 |
| 兄弟目录 `公共组件/` | `BASE_SKILL_DIR = SKILL_DIR.parent / "公共组件"`；`assets/base.js` 不存在时才回落到 `SKILLS_BASE_DIR` 环境变量（`scripts/schedule_html_render.py:36-39`、`scripts/help_render.py:51-64`） | 缺 `injector.py` → `RuntimeError("Base Skill 资产缺失: 找不到 公共组件/injector.py。请确认 公共组件/ 目录已安装")`（`scripts/schedule_html_render.py:329-333`）；`help_render` 找不到 base 资产时**静默返回空串**（`scripts/help_render.py:64`） | 能：实测 `D:\2Study\StudyNotes\SKILLS\公共组件\injector.py` 与 `assets\base.js` 都在 |
| 场景资产 | `SCENARIOS_PATH`（`scripts/help_render.py:44`） | 缺失 → `load_scenarios()` 返回 `([], "场景资产不存在: {path}")`，**不抛异常**；缺 PyYAML → `"缺少 PyYAML 依赖(运行: pip install pyyaml)"`；字段缺 → `"第 {i+1} 条场景缺字段: {missing}"` | 能 |
| 域片段 `scenarios/*.yaml` | 只被合并器读（`scripts/update_scenarios.py:29-30`） | 不是运行时依赖 | 不能 |
| `references/*.md`（7 份） | **全仓 `.py` 零处读取**（只被 `SKILL.md`／`AGENTS.md` 引用） | 缺失不影响运行，只影响 AI 判断 | 不能 |
| `PUBLIC_DOMAINS.py` | 技能根文件，对外注册表（`:65-75`）+ `fetch_sleep(start, end)`（`:22-62`），固定 `date` / `sleep_min` 两个字段；主睡眠段口径 `category = '睡眠'` 或 `LIKE '%.睡眠'`（`:42,51`） | 本技能运行**零引用**它（只有 `tests/test_public_domains.py` 与外部 `../技能互联/check_public_contract.py` 关注）；DB 口径改了而这里没改 → `fetch_sleep` **静默返回空列表**（SQL 无匹配，无报错） | 要改：它是「对外供数口径」，与库内数据的一致性没有任何自动校验，要做得新写 |
| 技能根 `.db/`、`.notes/` | `.db/` 实测只有 1 个历史产物 `schedule_html/help/作息管家_HELP_20260730_101542.html`，**无数据库**；`.notes/` 只剩一次性脚本遗留物（`scripts/update_scenarios.py:4` 注释即写「替代 .notes/_gen_scenarios.py 一次性脚本」） | 运行时零引用 | 不能：概念重复且与代码不符（代码 fallback 是盘根 `D:/.db`，不是技能根 `.db`） |
| 测试截图目录 | `tests/screenshots/replay_e2e/`（5 张 PNG，由 `tests/test_replay_e2e.py:177-178,206` 自己建并写） | 缺失时测试自建 | 不能：是测试**输出**目录 |
| PATH 上的 `python3` | 文档与 `references/CLI命令.md` 一律写 `python3 scripts/schedule_cli.py …`（`:12,19,298`） | PATH 上没有 `python3` 时命令不可用 | 要改：新仓不走 Python，只作为「老技能为什么在 Windows 上会失败」的注记 |

---

## 三、SKILL.md 与实现对不上的地方

### 3.1 私家大厨

1. **`CHEF_OUTPUT_DIR_PREFIX` 文档登记、实现不读。** `SKILL.md:254` 把它列为环境变量（默认 `chef://`），但全仓只有 `SKILL.md:254` 与 `CHANGELOG.md:359,365` 两处提及，`.py` 里零读取；实现是硬编码常量 `_CHEF_PREFIX = "chef://"`（`scripts/photo_utils.py:42`）。
2. **声明了一条不存在的 env 优先级链。** `SKILL.md:279` 写「env 优先级：`$SKILLS_DATA_DIR` > `$SKILLS_DB_PATH` > Skill 自带 fallback」。实现里两者作用域不同：DB 只读 `SKILLS_DB_PATH`（`scripts/db_config.py:48`），`SKILLS_DATA_DIR` 只进输出根（`scripts/output_config.py:15`），而且输出根那条链的第二顺位是 `CHEF_OUTPUT_DIR`，不是 `SKILLS_DB_PATH`。
3. **`SKILL.md` 的「配置」表漏了真值源。** `SKILL.md:249-254` 只列 `CHEF_OUTPUT_DIR` 与 `CHEF_OUTPUT_DIR_PREFIX`，没有 `SKILLS_DB_PATH`（`scripts/db_config.py:48`）也没有 `SKILLS_DATA_DIR`（`scripts/output_config.py:15`）。
4. **「一键安装」让用户设的变量与向导实际持久化的一致吗——不一致。** `SKILL.md:307` 让 AI「设置环境变量 CHEF_OUTPUT_DIR」；4 步向导持久化的却是 `SKILLS_DB_PATH` + `SKILLS_DATA_DIR` 两个（`scripts/开始使用/ops.py:158-161`），`CHEF_OUTPUT_DIR` 在向导里只被**读**（`:112`），不被写。
5. **体检渲染器写错且自相矛盾。** `SKILL.md:272` 把体检渲染器写成 `render_quality_report.py`，但该文件无 CLI 参数解析、从 stdin 读 JSON（`scripts/render_quality_report.py:109-112`）；真正的入口是 `data_quality_report.py --html`（`scripts/data_quality_report.py:199-202`），而 `SKILL.md:29` 又写 `data_quality_report.py`。
6. **文档过期。** `SKILL.md:277` 写「`render_help.py` 当前实现是单次覆盖…Phase 1.7 待优化」，实际已用 `unique_output_path`（`scripts/render_help.py:216`）。
7. **实现有、`SKILL.md` 无。** 「首次使用」在 `scenes/开始使用.yaml:35`、`references/scenarios.yaml:778`、`scripts/render_开始使用.py:184`、`scripts/开始使用/cli.py:31-36` 都有，但 `SKILL.md` 里搜 `首次使用|开始使用` 零命中（39 个唤醒词清单未收录）。
8. **用而未记。** pyyaml 被 `scripts/render_help.py:24`、`scripts/场景合并.py:35,43`、`scripts/fat_simulate.py:15` 使用，`SKILL.md:201-202` 的依赖只写「Python 3.x + sqlite3（Python 内置）」；`_meta.json:7-9` 只声明 `python >=3.9`。
9. **同名不同物。** `references/commands.md:91-92` 的「健康检查」是 `recipe_manager.py lint <recipe_id>`（单菜字段检查，`scripts/recipe_manager.py:777,808` 打印「【{name} - 健康检查】」），与唤醒词「体检」（全库数据质量报告）不是一件事。
10. **场景资产里的模板字段已过期。** `scenes/数据管理.yaml:62`、`references/scenarios.yaml:809,884,903` 写 `数据管理/data_quality_report.html` 这类路径，实际文件在 `templates/` 根（`scripts/render_quality_report.py:16`、`render_batch_edit.py:34`、`export_backup.py:39`）；`templates/数据管理/` 目录不存在，也没有代码把该字段当路径解析。
11. **兜底目录硬编码不一致。** `scripts/cleanup_test_history.py:11` 的默认是 `D:/2Study/StudyNotes/.db`，与 `scripts/db_config.py:32` 的 `D:/.db` 不是同一个目录。

### 3.2 备忘录

1. **`MEMO_DB_PATH` 文档有、实现无。** `references/schema.md:109,114` 声明「数据库文件路径，默认 `memo.db`，相对于技能目录」，全仓只有这两处命中，代码从不读；而且 `script/memo_cli.py:48` 的 `skill_dir` 形参从未被使用，所以「相对于技能目录」在代码层面已不成立。
2. **三个 cron 参数都不可配，文档说可配。** `SKILL.md:1027` 与 `references/cron.md:9` 说「可配置 `MEMO_CRON_INTERVAL` 环境变量」，实现是硬编码 `5`（`script/memo_cli.py:24`）；`SKILL.md:1032-1033` 说的 `MEMO_ADVANCE_MINUTES`（10）与 `MEMO_GRACE_MULTIPLIER`（2）同样硬编码（`:25-27`）。
3. **默认值互相打架。** `references/schema.md:110` 说 `MEMO_CRON_INTERVAL` 默认 `2`，实现是 `5`（`script/memo_cli.py:24`）；`_meta.json:8` 说 `SKILLS_DB_PATH` 默认 `.db/`，实现是 `D:/.db` 或 `~/.local/share/memo`（`script/memo_cli.py:38-45`）。
4. **回退状态数错。** `SKILL.md:1139` 写「5 状态 fallback（正常 / 空 / 缺失 / 错误 / 离线）」，实际是 4 状态、`offline` 已删（`tests/test_4_state_fallback.py:27-31`、`docs/adr/0003-b-execution-fallback.md:14-17` 只列 4 个）。
5. **模板件数错。** `SKILL.md:115` 写「5 个 HTML 模板」，`templates/` 实际 6 个（`AGENTS.md:13` 也写 6 个）。
6. **命名里的主体写错。** `SKILL.md:106,109` 说命名用的 `command_name` 是 CLI 子命令名，实现传的是中文显示名（`script/memo_render.py:197` 传 `"备忘录查询"`、`:447` 传 `"备忘录_初始化报告"`）。
7. **FTS5 已不参与查询，却仍列为必装前置。** `SKILL.md:352-354` 把 SQLite+FTS5 列为必装并给检测命令，但查询已改为 LIKE 子串检索（`script/memo_cli.py:206-217`），`script/init.sql:19-22` 的注释自认「FTS5 已停用为关键词查询路径」。
8. **代码用了、文档没写：`公共组件/`。** `script/memo_render.py:28` 依赖技能目录的兄弟目录 `公共组件/`，`SKILL.md` 全文搜 `公共组件` 零命中，只有 `AGENTS.md:10` 提了一句。
9. **代码用了、文档没写：`HELP_INITIALIZED`。** `script/memo_render.py:489` 读它，但不在 `SKILL.md:444-447` 的环境变量表内，只在 `tests/conftest.py:19-23` 作测试固定用。
10. **代码用了、文档没写：`due --db` 覆盖参数与硬编码 `python3`。** `script/memo_cli.py:1760-1761` 的 `due --db` 文档未提；`script/reminder_scheduler.py:16` 硬编码 `["python3", cli_path, "due"]`，`SKILL.md:1056` 只说「执行 reminder_scheduler.py」。

### 3.3 居家管家

1. **声明了一条实现里两半不一致的 env 链。** `SKILL.md:380` 写「`$SKILLS_DATA_DIR` > `$SKILLS_DB_PATH` > Skill 自带 fallback」；实现里 HTML 输出根确实是这条链（`scripts/render/__init__.py:117-127`），但 DB 路径只读 `SKILLS_DB_PATH`（`scripts/home_manager/db.py:28`），从不读 `SKILLS_DATA_DIR`。两值不一致时，产物与库会落在不同目录。
2. **照片目录「可选」与「必须是已存在的目录」矛盾。** `SKILL.md:354-356` 把 `HOME_PHOTOS_DIR` 标为可选环境变量；实现只在 `p.is_dir()` 为真时才采用（`scripts/home_manager/db.py:49-50`），指向一个还不存在的目录会被**静默丢弃**。
3. **默认值描述不完整。** `SKILL.md:520` 写 `HOME_PHOTOS_DIR`「默认为技能目录/photos」，实现的三层顺序是「env → 逐级上级目录里的 `photos` → 技能目录 `photos`」（`scripts/home_manager/db.py:46-55`），技能目录那一层只是最后兜底。
4. **同一项在两个模块各读一遍。** 除 `home_manager/db.py:28` 外，`scripts/accounts.py:35` 与 `scripts/票据凭证/db.py:18` 各自再读一次 `SKILLS_DB_PATH`；面板只该暴露一项，但要确认三处取到同值。
5. **`output/` 目录的归属写错。** `CONTEXT.md:38` 把它列为运行产物，`scripts/home_manager/home_manager.py:103,144,202` 的帮助文本还写「不填写到 output/」，但**没有代码写该目录**——实际写 `<根>/home_manager_html/`（`scripts/render/__init__.py:130-147`）。
6. **fallback 落点与实际不符。** `CONTEXT.md:41` 写 fallback 落在 `D:\.db\home_manager_html\`；实测 `D:\.db` 不存在，产物实际在 `D:\2Study\StudyNotes\.db\home_manager_html\`。
7. **模板数过时。** `CONTEXT.md:35` 写「10 个 HTML 模板」，实测 60 个 `.html`。
8. **标签数下限只存在于 v1 写路径。** `SKILL.md:257` 与 `references/commands.md:44` 都写「add 硬约束要求 tags ≥10」；v2 写路径只拦 5 项、**不拦标签数**（`scripts/物品/ops.py:146-150`），`scripts/物品/validators.py:46` 只规定 `≤30`，且该值算出后未被 `add_item_v2` 使用。≥10 只在 v1 路径 `scripts/home_manager/item_ops.py:180-185` 生效。
9. **「位置必须至少两级」两条写路径口径不同。** `references/commands.md:37` 要求两级；v1 路径拦截（`scripts/home_manager/item_ops.py:173-177`），v2 路径只在填了位置时才校验（`scripts/物品/validators.py:43` 的 `"location_ok": (not location) or ("/" in location.strip("/"))`）——即**位置在 v2 可空**。
10. **`_meta.json:6` 声明 `python-iso8601` 是依赖**，全仓 `.py` 无 `iso8601` 匹配。
11. **`sm9-prefs` 子命令已删、文档还在。** `SKILL.md:299,677` 写子命令 `sm9-prefs` 与偏好文件 `$SKILLS_DB_PATH/link_prefs.json`；`scripts/联动/ops.py:8` 逐字写「删除联动偏好(三态频控/link_prefs.json/sm9-prefs)」，`scripts/联动/cli.py` 只剩 `sm9-overview` / `sm9-food` / `sm9-price`。
12. **`SKILL.md:530` 起「快速导航」指向 `features/*.md`**，而 `references/database.md`、`references/statuses.md`、`references/categories.md` 无任何代码引用。
13. **代码用了、文档没写：`HELP_INITIALIZED`**（`scripts/help_center.py:44-46`，`SKILL.md` 零命中）、**`WSL_DISTRO_NAME`**（`scripts/开始使用/ops.py:38`）、**`SKILLS_DATA_DIR` 用于 HTML 输出根**（`scripts/render/__init__.py:121`）——「安装与配置」节的「环境变量（可选）」只列了 2 个（`SKILL.md:354-356`），漏了 `SKILLS_DATA_DIR`，它只在 `SKILL.md:380` 的输出位置节出现。
14. **代码用了、文档没写：第三种 DB fallback。** `scripts/cleanup_test_items.py:24` 用 `skill_dir/.db/home.db`，文档只描述 `D:/.db`。
15. **对得上的项（列出以便区分）**：`SKILL.md:35-38` 声明的 `cryptography` 依赖（`scripts/accounts.py:18`）、`SKILL.md:694` 的 lint 模板（`scripts/开始使用/cli.py:40,76-83`）、`SKILL.md:699-706` 的 8 项（`scripts/开始使用/ops.py:232-356`）、`SKILL.md:722-725` 的 `check`/`init`/`init-status`（`scripts/开始使用/cli.py:34-38,70-75`）、`SKILL.md:46,342` 的场景唯一事实源（`scripts/help_center.py:26`）。**例外**：`SKILL.md:35-36` 声明的 Python ≥3.7 在代码里**没有任何运行时检查**（无 `sys.version_info` 判定）。

### 3.4 作息管家

1. **配置表漏了两个实现真读的变量。** `SKILL.md:261-263` 只列 `SKILLS_DB_PATH`；实现还读 `SKILLS_BASE_DIR`（`scripts/schedule_html_render.py:39`、`scripts/help_render.py:55`）与 `WSL_DISTRO_NAME`（`scripts/setup_scenarios.py:111`）。
2. **`SKILL.md` 教的安装命令正是本技能禁止清单里的僵尸包。** `SKILL.md:1211` 写 `missing` 档「不主动帮装,给一行 `npm i -g lark-cli` 用户自决」；实现给的是 `npm install -g @larksuite/cli` 加 `npx -y skills add https://open.feishu.cn --skill -y`（`scripts/setup_scenarios.py:206-210`），并在 `:210` 逐字警告「官方包是 @larksuite/cli(bin 名 lark-cli);npm 上 lark-cli 是僵尸包,严禁安装」。同一技能的两份文档还各有主张：`setup_scenarios.py:23-28` 把飞书从「可选」升为**强引导**，`SKILL.md:1211` 仍是「给一行命令，用户自决」。
3. **表数对不上。** `references/CLI命令.md:14` 说 `init`「创建 schedule_records、daily_summary、schedule_plans（新版）三表」；`scripts/setup_scenarios.py:61-63` 的判据是 `EXPECTED_TABLES = 4`，注释列的是四张表（多一张 `schedule_plans_legacy_2026_06_29`）。
4. **测试夹具的表与判据不同步。** `tests/conftest.py:22-61` 的 `SCHEMA_SQL` 只建 3 张表（`schedule_records`、`daily_summary`、`schedule_plans`），与 `EXPECTED_TABLES = 4` 不是同一套；这份夹具不喂 `setup_scenarios._check_env()`，所以 `db_ready` 那条判据没有测试守着。
5. **输出目录「不静默创建」与实现相反。** `SKILL.md:990` 写输出目录必须已存在、不静默创建；`_naming_path` 里就是 `base.mkdir(parents=True, exist_ok=True)`（`scripts/schedule_html_render.py:428`），只有 `render-record-report` 有显式前置硬检查（`scripts/schedule_cli.py:2274-2282`）。
6. **`--out` 口径自相矛盾且与实现相反。** `SKILL.md:995` 与 `references/CLI命令.md:212` 写「不支持 `--out`」，而 `SKILL.md:818,891` 自己又给了 `--out` 用法；实现四处解析它：`scripts/schedule_cli.py:1610,1658`、`scripts/help_render.py:481`、`scripts/setup_scenarios.py:433`。
7. **record 域文件名例子与实现不符。** `references/CLI命令.md:222`、`SKILL.md:812,818` 写 `$SKILLS_DB_PATH/schedule_html/record/2026-07-15_record_report.html`；实现是中文名 + 时间戳 `<中文 command>_<YYYYMMDD>_<HHMMSS>.html`（`scripts/schedule_html_render.py:393-396,429-440`，依据 `docs/adr/0002-strict-skill-spec.md:3,15-33`）。
8. **末段时刻口径三方矛盾。** `SKILL.md:1096-1097` 写末段 `time_end == "23:59"`、禁止 `24:00`；`references/数据库结构.md:68` 与 `references/操作规范.md:60` 又不同；代码校验要求必须传 `"24:00"`（`scripts/schedule_db.py:875-877`），写入时再规范化成 `23:59`（`:24-31,1185,1242`）。
9. **「无第三方依赖」与实现不符。** `SKILL.md:257` 写「无第三方依赖(仅用标准库 sqlite3、argparse、datetime)」，`SKILL.md:38` 的 metadata 也只声明 `python>=3.7`；但 `help_render.load_scenarios`（`scripts/help_render.py:117-119`）、`scripts/update_scenarios.py:95`、`scripts/validators.py:54` 都要 PyYAML，缺失时 help 渲染降级为「缺少 PyYAML 依赖(运行: pip install pyyaml)」。
10. **仓库结构计数过时。** `AGENTS.md:21,24,25,31` 写「73 场景 / 15 个 HTML 模板 / 11 个 pytest 测试文件 / 4 份 ADR」；实际 85 场景（`作息管家.html:658` 的 `scenario_count:85`）、19 个顶层模板（`tests/test_base_pipeline.py:5` 写「全部 19 模板」）、33 个 `test_*.py`、5 份 ADR（该行自称「4 份」与括号里列的 5 个编号也不一致）。
11. **迁移脚本写了、没有任何自动调用点。** `references/数据库结构.md:59` 说旧 `schedule_plans` 通过 `scripts/migrate_plan_to_events.py` 一次性迁移；脚本确实在且幂等（`:20-24`），但**没有注册 CLI 命令、没有自动调用点**，只能人工执行（`scripts/migrate_categories.py` 同）。
12. **`SKILL.md:1203` 少写一个条件。** 文档说 `auth status` 看 user/bot 至少一个 ready；实现还要求 `available is True`（`scripts/feishu_sync.py:264-265`）。
13. **函数名与文档不符。** `references/同步流程.md:194` 写 `feishu_available()`，实现名是 `is_feishu_available()`（`scripts/feishu_sync.py:222`）。
14. **`check` / `render-first-use` 的入口是间接的，文档没说明。** 两者不在 `main()` 的 `if/elif` 里，而是靠「未知命令」分支的域注册表发现（`scripts/schedule_cli.py:796-802,3179-3232`，注册表在 `scripts/setup_scenarios.py:456-459`）。唤醒词表里写 `SKILL.md:285,536` 的那两条命令可用，但走了这条间接路。
15. **`.gitignore:10` 把 `.env` 列为忽略项**，全仓无任何读取 `.env` 的代码。
16. **`AGENTS.md:15-27` 的「项目根关键文件」表漏项**：未列 `references/` 下 7 份文档、`scenarios/`、`tests/screenshots/`、`.notes`、`.db`、`.scratch`、`PUBLIC_DOMAINS.py`；其中 `PUBLIC_DOMAINS.py` 是技能根带契约的唯一对外接口文件，`SKILL.md` 与 `AGENTS.md` 都无一字说明。
17. **对得上的项**：`SKILL.md:265` 的 DB 查找顺序（`scripts/schedule_db.py:66-77`）、`SKILL.md:256` 的 Python ≥3.7（`scripts/setup_scenarios.py:148`）、`SKILL.md:428-436` 的唤醒词表与 `scripts/schedule_cli.py` 的分派、`SKILL.md:88` 的「飞书探测」三档（`scripts/feishu_sync.py:93-101,260-266`）。**查不到**：`docs/adr/` 里没有关于 UTC／时区的 ADR（对 `docs/adr/` 与全部 `.md` 搜 `UTC`、`时区`、`本地时间` 均无命中）——实际有两套时间来源并存：Python 侧全用本地时间（`scripts/schedule_html_render.py:429`、`scripts/setup_scenarios.py:67-72`），SQL 侧用 SQLite 的 `CURRENT_TIMESTAMP`（语义为 UTC，`scripts/schedule_db.py:123-124,145,478` 等），两者混存于同表不同列，无换算代码。

---

## 四、绕开的路径（禁区）

四个目录里，按文件名识别出的禁区只有一处：

| 路径 | 类型 | 处理 |
|---|---|---|
| `D:\2Study\StudyNotes\SKILLS\居家管家\.个人想法目录禁止看里面文件\` | 目录（内含 1 个文件 `对开源商用的SKILL理解.md`，**只列了文件名，未读内容**） | 整个目录未进入、未读取任何内容 |

另按同一口径保守跳过的路径（名字含 `禁止`／`不允许`／`笔记`／`想法`／`private`／`.git`／`.out-of-scope`／`.trash`）：

- `D:\2Study\StudyNotes\SKILLS\备忘录\.out-of-scope\`（目录及其中 `README.md`）
- `D:\2Study\StudyNotes\SKILLS\备忘录\output\.trash\`（目录及其中 `_run_init_report_20260802.py`）
- `D:\2Study\StudyNotes\SKILLS\居家管家\.out-of-scope\`、`.个人想法目录禁止看里面文件\`
- `D:\2Study\StudyNotes\SKILLS\作息管家\.out-of-scope\`、`.git\`（该目录下确有 `.git`，未进入、未做任何 git 操作）
- 各技能目录下的 `.pytest_cache/` 与全部 `__pycache__/*.pyc`（二进制缓存，不属调查面）

**查不到**：四个目录里没有出现 `AI不允许看的文件.md` 或 `.个人笔记不允许参考` 这类标记；私家大厨目录下也没有任何名称含上述字样的路径。

两点如实披露：

1. 调查中读到了两份 `.gitignore`（`私家大厨\.gitignore` 16 行、`备忘录\.gitignore`）——其文件名含子串 `.git`，按「路径段为 `.git`」的口径不属禁区；此处按最严格字面口径披露。
2. `D:\2Study\StudyNotes\` 这一级路径本身含「笔记」二字，但它是本次指定调查目标所在的目录，不作为禁区处理。

---

## 五、遗留

老技能与新仓四家行为不一致的地方（逐条给两边出处）：

1. **缺 env 时是否阻断：四家老技能全都不阻断，新仓四家全都阻断。** 老的会回落平台默认目录并自动建目录——私家大厨 `scripts/db_config.py:29-35`、备忘录 `script/memo_cli.py:54-56`、居家管家 `scripts/home_manager/db.py:14-24`、作息管家 `scripts/schedule_db.py:66-70`；新的四家 `SKILLS_DB_PATH` 未设即 `fail(1)`（t692 §一 四家行）。面板的检查项若照老技能写「有没有默认值」，会与实现相反。
2. **库文件缺失时的行为相反。** 老备忘录 `script/memo_cli.py:68` 直接 `sqlite3.connect` 让 SQLite 静默建空文件，错误要等首条 SQL 才暴露（`:78-80,252-253`）；新备忘录打开前先 `stat`，不在即抛 `MEMO_DB_MISSING`、绝不建空库（t692 §一 备忘行）。作息管家老侧同样是隐式建空库（`scripts/schedule_db.py:89-94`）。
3. **`SKILLS_DATA_DIR` 的语义在四家里不统一。** 私家大厨把它当输出根的第一顺位（`scripts/output_config.py:15`）；居家管家输出根同样先认它（`scripts/render/__init__.py:121-123`），但 DB 路径不认（`scripts/home_manager/db.py:28`）；备忘录与作息管家的实现里根本没有这个变量。新仓四家都没有它（t692 §3.1 六家同形表）。
4. **产物目录层数：老技能四家都要用户配一个输出根，新仓是库目录下的代码常量。** 大厨/作息是两级（老侧 `SKILL.md:260-275`、`references/CLI命令.md:212,222`；新侧 `cook_html/help`、`schedule_html/help`），居家/备忘是一级（新侧 `home_manager_html`、`memo_html`）。新仓这一项不可配（t692 §3.3「产物目录不可配」），面板只能显示。
5. **飞书能力：老技能只有备忘录与作息管家两家有，新仓也是这两家。** 但两家的**起步档口径相反**：老备忘录把飞书列为「默认安装 + 强烈建议配置」（`SKILL.md:355-360,393`），老作息管家的 `SKILL.md:1211` 还是「不主动帮装」而 `scripts/setup_scenarios.py:23-28` 已升为强引导——同一技能内两份说法并存。新仓两家都只是取数桥（t692 §3.1 飞书 CLI 行），没有这套引导。
6. **作息管家「看帮助」会建出数据目录，其余三家不建。** 新仓 `packages/skill-schedule/src/cli/cmd_read.ts:97` 走 `existsSync(resolveDbPath())`，而 `resolveDbPath()` 里第一步就是 `mkdirSync`（`packages/skill-schedule/src/fetch/paths.ts:20-23`）；对照居家 `skill-home/src/cli/cmd_read.ts:71-74` 明写不许走它。老作息侧同样是建目录口径（`scripts/schedule_db.py:76`）。t692 §四第 1 条已记过这条，本票复核结论不变。
7. **备忘「目录型库」两端都不存在。** 新仓只有注释这么说、实现查的是 `memo.db` 文件（t692 §四第 2 条）；老仓 `script/memo_cli.py:47-56` 也是文件口径，且 `references/schema.md:109,114` 那个 `MEMO_DB_PATH` 从未被读。任何按「目录型库」写预检的改动两边都会落空。
8. **居家「备份导出/导入恢复」：老仓有真实现，新仓只有壳。** 老仓：`_backup_dir()` 落 `<DB 目录>/backups`（`scripts/开始使用/ops.py:434-437`）、`backup_payload()` 打包 db+照片并按 `BACKUP_KEEP_N = 5` 裁旧（`:440-462`）、`import_undo_payload()` 覆盖前先二次备份（`:465-474`），失败文案逐字「检查数据库/照片目录可读性后重试」（`:447-452`）。新仓：只回一句回执（`packages/skill-home/src/cli/cmd_read.ts:696-697,723-731`，t692 §四第 6 条）。面板要给这一项，实现得先在**新仓**补齐。
9. **居家主密钥：老仓有明确判据，新仓没有这一项。** 老仓四级定位 `.master.key`（`scripts/accounts.py:32-56`），密钥短于 8 字符即「密钥至少 8 个字符」（`:117`）。新仓 `skill-home` 里没有主密钥概念（t692 六家表未列这一项）。要接得先裁定「新仓账号密码怎么存」。
10. **老技能的「体检」一词在四家里指向不同东西**：私家大厨指全库数据质量报告（`scripts/data_quality_report.py`）而 `references/commands.md:91-92` 的健康检查另有他指；居家管家指 `lint` 数据健康检查 8 项（`SKILL.md:688-706`）；备忘录没有「体检」唤醒词，最接近的是飞书 `check`；作息管家没有「体检」，对应的是「飞书探测」（`SKILL.md:1192`）与「首次使用」的环境检测。新面板若统一用一个词，需要重新起名而不是沿用老技能任一家的叫法。
11. **作息管家第二份库的位置与现存文件不是同一处。** 老仓 `D:\2Study\StudyNotes\SKILLS\daily_recorder.db` 存在，但按默认链算出的路径是 `D:\.db\daily_recorder.db`（`scripts/schedule_db.py:64,66-70,81`），两者不是同一文件；`get_dr_connection()`（`:96-100`）不检查存在性，缺库时 `block_count` 会抛 `no such table: user_messages`（`scripts/block_count.py:44-48`）。新仓作息没有这份第二库（t692 六家表未列）。面板要不要给这一项、给哪个路径，需要用户先裁定。
12. **居家管家 `SKILLS_DB_PATH` 文档写「可选」，实际是必填。** 代码的 fallback 是盘根 `D:\.db`（`scripts/home_manager/db.py:14-24`）；实测 `D:\.db` 不存在，而生产库与产物落在 `D:\2Study\StudyNotes\.db\`（`home.db` 1,724,416 B、`home_manager_html/` 均在位）——说明运行时**已经设了** `SKILLS_DB_PATH`。同一目录下还有一个 0 字节的僵尸 `D:\2Study\StudyNotes\.db\HomeHub\home.db`（无代码引用）。新仓是「未设即 `fail(1)`」（t692 §一 居家行），口径已经一致；面板要做的不是改语义，而是把这一项从「可选」改成「必填并校验已存在」，并把僵尸库列为可疑重复文件。
13. **四家老技能里，只有作息管家的自检能直接变成面板的「逐项判据」。** 它有现成的 `items[{name,status,desc,action}]` 契约（`scripts/setup_scenarios.py:30-36,218-256`），条目与文案都写全了；备忘录把这个契约留给 AI 自己填（`SKILL.md:427` 的 `init-report --data`），私家大厨与居家管家只给结构化字段、没有报告页条目。新面板若要有统一的检查项形状，**参照对象是作息管家的报告契约**，但第 2、3 条里那些用旧技能的「缺 env 就兜底」写法不能跟着搬。
