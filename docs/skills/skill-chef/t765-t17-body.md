## Question

7 张域票要真读写老库才能自证，而今天没有任何「安全地拿到一份可用数据」的通道：真实库在 `D:\2Study\StudyNotes\.db\chef_data.db`（294,912 B），而新技能缺省指向 `C:\Users\辰辰洋洋\.ilife\data\chef_data.db`（**不存在**）。每张票各自想办法复制库、各自改配置，就会重复劳动且互相踩。**这条运行面通道该长什么样？**

## 目标

1. 交一个**沙箱器械**：给定票号，把真实库复制到 `.scratch/t840/chef_data.db`（源只读、写只在副本），并把配置指向该副本（`db.dir`）；跑完不动真库。
2. 把**用户日常使用**这条路径接上：本机配置 `~/.ilife/chef.yaml` 的 `db.dir` 指到真实库所在目录，并给出**端到端读数**——读到你库里那道真实菜谱（菜名 ＋ 食材数 ＋ 步骤数），证明接得上老数据。
3. 写明规矩：**一份副本只归一张票**（并行票不得共用副本），真库全程只读。

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket 840 -- node docs/skills/skill-chef/t840-沙箱.mjs --ticket 840` → 打印 `副本=<路径> 字节=… 真库 mtime 未变` 且 exit 0
- 正例（端到端读数）：`node tooling/run-locked.mjs --ticket 840 -- node packages/skill-chef/dist/cli/cmd_read.js chef.recipe.view --params '{"name":"<库里那道菜>"}'` 返回真实字段（非空、非占位）
- 反例（必跑）：把沙箱指向真库路径（不复制）→ 器械必须拒绝并 exit 1

## 不许动的东西

- **真库只读**，任何写只发生在副本上。
- 不改 `packages/` 下任何源码（配置键的改动归票 1）。
- 不改老件（Python）；不动其它五个技能的配置。

## 交付物路径

- 器械与证据：`docs/skills/skill-chef/t840-沙箱.mjs`、`docs/skills/skill-chef/t840-运行面.md`（端到端读数 ＋ 真库只读证据 ＋ 本机配置值）
- 本机配置：`~/.ilife/chef.yaml` 的 `db.dir`（取值写进上面那份文档）

## 遗留出口

- 「把老库搬进缺省数据目录」是另一条可选路径：记录在文档里，不实施。
- 隔离通道 `ILIFE_CONFIG_DIR` 的最终裁定归 `#756`，本票只声明 `CHANNEL-PENDING-#756`。

## 进度：0%

下一步：先复制一份副本做只读探测，再落器械。
