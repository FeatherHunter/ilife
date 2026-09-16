RUN ticket=648 runId=477b1c60-6f91-4c5c-8f9e-4f9e1d8455eb cmd="node .scratch/t648/render.mjs .scratch/t648/before" waitedMs=0 exit=0
RUN ticket=648 runId=98ae528e-cbba-4045-b5f0-7ebd5645f0c9 cmd="node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t648/before --widths 390,512,820,1440 --label t648-before --json .scratch/t648/before-measure.json" waitedMs=0 exit=0
RUN ticket=648 runId=cba053c5-1968-4c73-9734-52e01dc368e2 cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie --force" waitedMs=1 exit=0
RUN ticket=648 runId=d2e1920c-5418-4451-ba57-3212fe57d184 cmd="node .scratch/t648/render.mjs .scratch/t648/after" waitedMs=0 exit=0
RUN ticket=648 runId=c679d637-ecb4-4a3c-be87-3ca8075be491 cmd="node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t648/after --widths 390,512,820,1440 --label t648-after --json .scratch/t648/after-measure.json" waitedMs=0 exit=0
RUN ticket=648 runId=158a0921-3faa-42d0-9d0a-7aa1c65ba387 cmd="node .scratch/t648/shot.mjs .scratch/t648/before .scratch/t648/shots-before 看营养结构,饮食复盘（本月）,看饮食总览 390,1440" waitedMs=0 exit=2
RUN ticket=648 runId=3b869a7a-b411-49b5-92e9-57f2c9e23cc1 cmd="node .scratch/t648/gates.mjs" waitedMs=1 exit=1
RUN ticket=648 runId=0dc2a064-2c15-44e5-ad9d-878139ab3dd0 cmd="node .scratch/t648/gates.mjs" waitedMs=0 exit=1
RUN ticket=648 runId=f96e0875-482b-4a52-9af9-d1db0ffade97 cmd="node .scratch/t648/mut.mjs" waitedMs=0 exit=0
RUN ticket=648 runId=c2c7aa7c-1588-4a66-8661-83652047168b cmd="node .scratch/t648/shot.mjs .scratch/t648/after .scratch/t648/shots-after 看营养结构,饮食复盘（本月）,看饮食总览 390,1440" waitedMs=0 exit=0
RUN ticket=648 runId=b8a5d879-64e9-4ff9-b1b5-25aaba96f17c cmd="node .scratch/t648/render-neigh.mjs .scratch/t648/neigh" waitedMs=0 exit=0
RUN ticket=648 runId=cd94cfe4-c2c7-4671-a925-d4f9c39e173c cmd="node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t648/neigh --widths 390,512,820,1440 --label t648-neigh --json .scratch/t648/neigh-measure.json" waitedMs=1 exit=0
RUN ticket=648 runId=d7d8069f-042b-4371-a662-7f2349e09a69 cmd="node .scratch/t648/gates.mjs" waitedMs=1 exit=1
RUN ticket=648 runId=8b6a2654-2d88-4c48-9c36-919a27f4f590 cmd="node .scratch/t648/render.mjs .scratch/t648/final" waitedMs=1 exit=0
