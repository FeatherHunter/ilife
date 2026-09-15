# #273 门禁运行条目（抄自 `.scratch/locks/gate-runs.log`，只抄 `ticket=273`）

> 每行 `GATE-RUN runId=<标识> cmd=<命令>` 是本票证据里**声称跑过**的每一次运行；标识从运行记录对应行逐字抄录（只领 `exit=0` 的条目当门禁证据）。

- `START ticket=273 runId=7a1b81f9-b0a9-48b9-9a92-23951a68b196 cmd="pwsh -NoProfile -File .scratch/t273/01-baseline.ps1" waitedMs=20018 pid=41772 at=2026-09-15T05:25:32.596Z`
- `RUN ticket=273 runId=7a1b81f9-b0a9-48b9-9a92-23951a68b196 cmd="pwsh -NoProfile -File .scratch/t273/01-baseline.ps1" waitedMs=20018 exit=0 pid=41772 at=2026-09-15T05:26:05.492Z`
- `START ticket=273 runId=3c8089dd-6505-478d-b532-169b9ad42159 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=1 pid=44848 at=2026-09-15T05:27:31.663Z`
- `RUN ticket=273 runId=3c8089dd-6505-478d-b532-169b9ad42159 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=1 exit=0 pid=44848 at=2026-09-15T05:27:38.717Z`
- `START ticket=273 runId=f688a00f-cebf-4265-bfdf-0262d65b3268 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=60034 pid=34304 at=2026-09-15T05:29:31.039Z`
- `RUN ticket=273 runId=f688a00f-cebf-4265-bfdf-0262d65b3268 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=60034 exit=0 pid=34304 at=2026-09-15T05:29:37.234Z`
- `START ticket=273 runId=5ec6f4c5-4ebf-4202-b00b-6b0c9d33da4e cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=30024 pid=29816 at=2026-09-15T05:30:30.662Z`
- `RUN ticket=273 runId=5ec6f4c5-4ebf-4202-b00b-6b0c9d33da4e cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=30024 exit=0 pid=29816 at=2026-09-15T05:30:36.969Z`
- `START ticket=273 runId=f27db99c-7206-47ba-99fc-8fab1a1736b1 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=90110 pid=12312 at=2026-09-15T05:32:41.288Z`
- `RUN ticket=273 runId=f27db99c-7206-47ba-99fc-8fab1a1736b1 cmd="pwsh -NoProfile -File .scratch/t273/02-build.ps1" waitedMs=90110 exit=0 pid=12312 at=2026-09-15T05:32:47.572Z`
- `START ticket=273 runId=0af5e42f-9881-4767-ae87-2083b92c99f5 cmd="pwsh -NoProfile -File .scratch/t273/03-commit.ps1" waitedMs=170145 pid=45532 at=2026-09-15T05:36:13.657Z`
- `RUN ticket=273 runId=0af5e42f-9881-4767-ae87-2083b92c99f5 cmd="pwsh -NoProfile -File .scratch/t273/03-commit.ps1" waitedMs=170145 exit=0 pid=45532 at=2026-09-15T05:36:15.513Z`
- `START ticket=273 runId=94fbbebe-f1a5-494c-8143-300d07db6f9f cmd="pwsh -NoProfile -File .scratch/t273/07-windowS.ps1" waitedMs=100087 pid=40748 at=2026-09-15T06:09:27.326Z`
- `RUN ticket=273 runId=94fbbebe-f1a5-494c-8143-300d07db6f9f cmd="pwsh -NoProfile -File .scratch/t273/07-windowS.ps1" waitedMs=100087 exit=0 pid=40748 at=2026-09-15T06:09:54.384Z`
- `START ticket=273 runId=d6d78eb1-abfe-46bd-9140-a67c3e470c69 cmd="pwsh -NoProfile -File .scratch/t273/08-final.ps1" waitedMs=90089 pid=42316 at=2026-09-15T06:17:46.530Z`
- `RUN ticket=273 runId=d6d78eb1-abfe-46bd-9140-a67c3e470c69 cmd="pwsh -NoProfile -File .scratch/t273/08-final.ps1" waitedMs=90089 exit=0 pid=42316 at=2026-09-15T06:23:59.879Z`
- `START ticket=273 runId=52d2f953-d924-4876-89fd-38f8eddda9e4 cmd="pwsh -NoProfile -File .scratch/t273/09-windowG.ps1" waitedMs=210200 pid=32212 at=2026-09-15T06:25:38.833Z`
