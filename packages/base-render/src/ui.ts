/** base-paint/ui：单品页自注册描述层（纯数据，无 DOM、无 host、无运行时依赖）。
 *
 * 归一原则：单品包调用 registerPage 自注册；总管只消费注册表，
 * 禁止 import 单品页组件（P7 #8 验收）。缺席走 pageOrReco 纯条件渲染，不轮询。
 */

export type PageKind = 'page' | 'reco';

export interface PageDescriptor {
  /** 所属技能，如 calorie。 */
  readonly skill: string;
  /** better-sidebar tab id，命名空间 ilife 星号，如 ilife:calorie。 */
  readonly slotId: string;
  /** tab 排序，70 段草案（P3 #4 实测前不定案）。 */
  readonly order: number;
  /** 展示标题。 */
  readonly title: string;
  /** page=单品实页，reco=推荐安装占位。 */
  readonly kind: PageKind;
}

/** 推荐安装占位描述子（缺席时渲染它，而非空白）。 */
export function recoDescriptor(skill: string, slotId: string, order: number, title: string): PageDescriptor {
  return { skill, slotId, order, title, kind: 'reco' };
}

export interface PageRegistry {
  /** 自注册；slotId 重复即抛（大声失败，不静默覆盖）。返回 disposer，幂等。 */
  registerPage(desc: PageDescriptor): () => void;
  /** 按 order 升序。 */
  pages(): PageDescriptor[];
  pageForSlot(slotId: string): PageDescriptor | undefined;
}

export function createPageRegistry(): PageRegistry {
  const bySlot = new Map<string, PageDescriptor>();
  return {
    registerPage(desc: PageDescriptor): () => void {
      if (bySlot.has(desc.slotId)) throw new Error('duplicate slotId: ' + desc.slotId);
      bySlot.set(desc.slotId, desc);
      let done = false;
      return () => {
        if (done) return;
        done = true;
        if (bySlot.get(desc.slotId) === desc) bySlot.delete(desc.slotId);
      };
    },
    pages(): PageDescriptor[] {
      return [...bySlot.values()].sort((a, b) => a.order - b.order);
    },
    pageForSlot(slotId: string): PageDescriptor | undefined {
      return bySlot.get(slotId);
    },
  };
}

/** 缺席纯条件渲染：有页用页，无页用 reco 占位。不轮询、不返空。 */
export function pageOrReco(reg: PageRegistry, reco: PageDescriptor): PageDescriptor {
  return reg.pageForSlot(reco.slotId) ?? reco;
}
