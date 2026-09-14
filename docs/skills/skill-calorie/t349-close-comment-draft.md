# #349 关票评论稿（待用户签字后用）

> 用法：`gh issue comment 349 --body-file <本文件>`，然后 `gh issue close 349`。
> 若用户对第 3 条（撤销语义）答「要可逆」，则本稿不改、改用另一条路线：本票不关，另开可逆票并引用。

## 正文

用户已就两条关前确认项答复，记录如下。

### 一、撤销语义：硬删除，接受

票面目标写「撤销语义以可逆、有回执为准」，实际实现为**硬删除**：删某天与撤销整份计划均不可恢复（实现见 `packages/skill-calorie/src/workout/write.ts` 的删链注释与根 `test/scene05-write-mutate.test.mjs` 的 `exit 4` 断言）。用户裁定**接受**「硬删除＋写入前确认」这一口径；**「可逆撤销」另开票立项**，不在本票返工。

### 二、测试口径：以根 `test/` 为准

票面「验收命令」写的是 `packages/skill-calorie/test/scene05-write-mutate.test.mjs`，**该路径不存在**（已实测确认）。实际的三支测试都在**根 `test/`**：

```
test/scene05-read.test.mjs            66 行
test/scene05-write-create.test.mjs    92 行
test/scene05-write-mutate.test.mjs    93 行
```

用户裁定**验收以根 `test/` 为准**，票面路径笔误不改票面原文，以本评论为准。

### 三、判据复跑

（关票时按当刻实跑读数填；下面是要填的两行）

- `node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs`：待填（期望 `tests 3 / pass 3 / fail 0`）
- 变异红／还原一致两行读数：待填

关票。遗留项（可逆撤销立项）已在正文第一节写明。
