# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies. **先把「真值从哪儿读出来」写进票面（一条命令／一条外部读数／一条带证据的结论）**；指不出读数的事写进文档，不建票。
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## 回退：GraphQL（REST 限流／命令缺失时）

`gh` 的 REST 额度会耗尽（`gh api rate_limit` 看 core 剩余）；GraphQL 配额独立，`gh api graphql` 能完成同样的事。**一次超时即换通道**，不在同一条路上反复重试（#1299 实测：工具读超时后继续重试，白等数分钟没有产出）。

```bash
# 改票面正文（长正文写文件，避免引号转义）
gh api graphql -f query='mutation($id:ID!,$body:String!){updateIssue(input:{id:$id,body:$body}){issue{number}}}' \
  -f id='<issue node id>' -F body=@.scratch/issue-body.md

# 评论（等价于 deck 的带评论）
gh api graphql -f query='mutation($id:ID!,$body:String!){addComment(input:{subjectId:$id,body:$body}){comment{id}}}' \
  -f id='<issue node id>' -F body=@.scratch/comment.md

# 关票
gh api graphql -f query='mutation($id:ID!){closeIssue(input:{issueId:$id}){issue{number state}}}' -f id='<issue node id>'

# 建 PR（head 用集成分支名，base 用长期分支名）
gh api graphql -f query='mutation($repo:ID!,$base:String!,$head:String!,$title:String!,$body:String!){createPullRequest(input:{repositoryId:$repo,baseRefName:$base,headRefName:$head,title:$title,body:$body}){pullRequest{number url}}}' \
  -f repo='<repositoryId>' -f base='master' -f head='<分支名>' -f title='…' -F body=@.scratch/pr-body.md
```

规矩：① 关票要**评论与关闭两个 mutation 都成功**才认关闭——GraphQL 没有「一次带 comment+close」的调用，任一失败即重跑缺失的那一步；② node id 用 `gh issue view <n> --json id` 取，别手抄；③ 写操作照旧遵守「确认才 close」。

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.