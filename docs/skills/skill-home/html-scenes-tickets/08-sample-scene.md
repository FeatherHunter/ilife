## Question

v2 稿用「样板票」当门：先做一条场景端到端，其余 10 张照抄它。两席对抗式审查判它违反第一性原理（A-P1-8 指出它是第三个 HITL 门、把并发饿死）——**「照抄样板」是软拷贝，会走散；该换成机器可复制的脚手架**。本票由原「样板」票改制（沿用同一张 issue）。

## 目标

① `packages/skill-home/scripts/new-scene-page.mjs <域> <页族>`：按票 2 的契约生成一套同形骨架——`templates/<域>/<族>.html`（带契约要求的共用标记）＋ `src/<域>/pages/<族>.ts`（装配入口、空态与异常态位、数据形状声明）。
② 装配契约测试 `test/scaffold.test.mjs`：生成的骨架必须**能被真命令链渲染**（不是只跑 lint），必须带齐契约要求的块位。
③ 用生成器**实际生成一条真页族的骨架并渲染出产物**（哪一族由票 2 定），证明形状走得通；产物不必进墙，但必须**能在浏览器打开**。
④ 说明文档写清：11 张域票开工第一步就是跑它，**不许手抄**。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/scaffold.test.mjs` —— exit 0；且**变异自证**：把骨架里的一个契约块位删掉 → 用例变红、改回变绿（两行读数写进 `docs/skills/skill-home/scene-page-scaffold.md`）。

## 不许动的东西

不改共用件与派生件（归票 3）；不动其它域的页族文件；不碰生产库与生产产物目录。

## 交付物路径

`packages/skill-home/scripts/new-scene-page.mjs`、`packages/skill-home/scripts/lib/scene-page-scaffold.mjs`、`packages/skill-home/test/scaffold.test.mjs`、`docs/skills/skill-home/scene-page-scaffold.md`、`.scratch/scaffold/`。

## 遗留出口

契约覆盖不到、仍需人裁形状的页族（册子表一里「混合」那 27 族尤其要看）逐条列出，回写票 2 的页族归属表。
