# t555 运行记录导出（对账源）

> 来源：`.scratch/locks/gate-runs.log` 中 `ticket=555` 条目，原样导出，供 §2.3 对账。
> 导出时刻：2026-09-16；导出后未再跑持锁命令，新增持锁操作需重新导出。

```text
START ticket=555 runId=1fafd0c2-d5d6-43a0-9d33-db588a619a34 cmd="gh issue view 555 --comments" waitedMs=1 pid=38328 at=2026-09-16T10:43:07.289Z
RUN ticket=555 runId=1fafd0c2-d5d6-43a0-9d33-db588a619a34 cmd="gh issue view 555 --comments" waitedMs=1 exit=0 pid=38328 at=2026-09-16T10:43:08.838Z
START ticket=555 runId=179c0c2d-d58b-4fb4-b382-1847ca41d955 cmd="gh issue view 555" waitedMs=0 pid=3044 at=2026-09-16T10:43:11.684Z
RUN ticket=555 runId=179c0c2d-d58b-4fb4-b382-1847ca41d955 cmd="gh issue view 555" waitedMs=0 exit=0 pid=3044 at=2026-09-16T10:43:13.248Z
START ticket=555 runId=0bc04183-1268-49f7-84c4-bec5f992737e cmd="pwsh -File .scratch/t555/do-green.ps1" waitedMs=1 pid=47912 at=2026-09-16T10:46:04.340Z
RUN ticket=555 runId=0bc04183-1268-49f7-84c4-bec5f992737e cmd="pwsh -File .scratch/t555/do-green.ps1" waitedMs=1 exit=0 pid=47912 at=2026-09-16T10:46:07.657Z
START ticket=555 runId=260908d7-c334-4ef0-b5ef-bddaac7f41f7 cmd="pwsh -File .scratch/t555/do-mutate.ps1" waitedMs=0 pid=12276 at=2026-09-16T10:46:26.727Z
RUN ticket=555 runId=260908d7-c334-4ef0-b5ef-bddaac7f41f7 cmd="pwsh -File .scratch/t555/do-mutate.ps1" waitedMs=0 exit=1 pid=12276 at=2026-09-16T10:46:30.441Z
START ticket=555 runId=93949a96-d59c-4dfb-a8d9-67622b25cc2b cmd="pwsh -File .scratch/t555/do-rebuild.ps1" waitedMs=10000 pid=44380 at=2026-09-16T10:47:02.348Z
RUN ticket=555 runId=93949a96-d59c-4dfb-a8d9-67622b25cc2b cmd="pwsh -File .scratch/t555/do-rebuild.ps1" waitedMs=10000 exit=0 pid=44380 at=2026-09-16T10:47:05.391Z
START ticket=555 runId=7c7f5e29-8582-4ea1-a98f-367546777433 cmd="pwsh -File .scratch/t555/do-mutate2.ps1" waitedMs=0 pid=72952 at=2026-09-16T10:47:17.443Z
RUN ticket=555 runId=7c7f5e29-8582-4ea1-a98f-367546777433 cmd="pwsh -File .scratch/t555/do-mutate2.ps1" waitedMs=0 exit=0 pid=72952 at=2026-09-16T10:47:23.126Z
START ticket=555 runId=421d2a50-06e1-4e06-bffe-1b28ab843fc0 cmd="pwsh -File .scratch/t555/do-diff.ps1" waitedMs=0 pid=47820 at=2026-09-16T10:47:55.808Z
RUN ticket=555 runId=421d2a50-06e1-4e06-bffe-1b28ab843fc0 cmd="pwsh -File .scratch/t555/do-diff.ps1" waitedMs=0 exit=0 pid=47820 at=2026-09-16T10:47:58.772Z
```

说明：

- `260908d7` 为第一次变异（绿段假红，已作废，由 `7c7f5e29` 取代）。
- `93949a96` 等锁 10 秒，持锁者为 ticket=441（活锁未抢回，符合协议）。
