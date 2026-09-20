# skill-schedule 包内规矩

（本包＝`packages/skill-schedule`；上层通用规矩见仓根 `AGENTS.md` 与 `docs/agents/structure.md`。本文件现只记发布一条；行数告警线数字待维护者定，不在此先编数。）

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-schedule@0.3.0`（硬前提 `base-paint@0.3.6` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-schedule-ilife/scripts/wizard-publish.sh` —— 发 `dsh-schedule-ilife@0.3.1`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-schedule/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-schedule-ilife/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
