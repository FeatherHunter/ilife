/** 装配唯一 owner（归一 render）：better-sidebar 槽位注册只许住这里。 */
export function mountInjector(slots: string[]): string[] {
  return [...new Set(slots)];
}
