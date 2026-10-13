/** #1280 · 生成期**候选项附注**的填充（值 → 候选项行右侧那行小字）。
 *
 *  为什么单独一件：这一支与 `helpFile.ts` 里的 `fillCandidates`（填候选）／`fillConfigValues`（填配置现值）
 *  是**三步各自独立的填充**，只是前两步先落了地；把第三步塞回装配件会把 `helpFile.ts` 顶过本包 350 行告警线
 *  （结构标准：超线的逻辑件要拆，拆按能力不按行数——这里恰好两件事都指向同一刀）。
 *
 *  **必须在 `fillCandidates` 之后跑**：附注是印在候选行上的，`options` 不在场就没地方印（见下面边界①）。
 */
import { WAKE_GROUPS } from '../triggers/wake-assets.js';

/** 把生成期读到的候选项附注填进被点名的槽位：`<场景 id>.<字段名>` → `{候选值: 小字}`。
 *  两条边界：① 这一格没有 `options`（没候选）⇒ 跳过；② 只 clone 真被改到的层（同 `fillCandidates`
 *  的省拷贝口径：场景／二级组／分组逐层判「有没有真改」，没改就仍只读引用原资产）。 */
export function fillNotes(
  groups: typeof WAKE_GROUPS,
  notes: Readonly<Record<string, Readonly<Record<string, string>>>>,
): typeof WAKE_GROUPS {
  if (Object.keys(notes).length === 0) return groups;
  let changed = false;
  const nextGroups = groups.map((group) => {
    const nextSubs = group.subgroups.map((sub) => {
      const nextScenes = sub.scenes.map((scene) => {
        const fields = scene.editable_fields;
        if (fields === undefined || !fields.some((f) => notes[scene.id + '.' + f.name] !== undefined)) return scene;
        changed = true;
        return {
          ...scene,
          editable_fields: fields.map((f) => {
            const map = notes[scene.id + '.' + f.name];
            if (map === undefined || f.options === undefined || Object.keys(map).length === 0) return f;
            return { ...f, notes: map };
          }),
        };
      });
      const sameScenes = nextScenes.every((s, i) => s === sub.scenes[i]);
      return sameScenes ? sub : { ...sub, scenes: nextScenes };
    });
    const sameSubs = nextSubs.every((s, i) => s === group.subgroups[i]);
    return sameSubs ? group : { ...group, subgroups: nextSubs };
  });
  return changed ? nextGroups : groups;
}
