/** radar-profile · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderRadarProfile(input)`（产标记，零 DOM）／`radarProfileCss()`（样式段）／
 *  `RADAR_PROFILE_FORMS`（形态闭集：多边形雷达／极区扇图／展平成轴表）／`RADAR_PROFILE_CLASS` 与
 *  `radarProfileSlot()`（标记契约）／尺与地板常量（满分、达标缺省、轴数上下限、轴名上限、两处容器阈值）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderRadarProfile } from './render.js';
export type { RadarProfileAxis, RadarProfileBand, RadarProfileForm, RadarProfileInput, RadarProfileSlot } from './attrs.js';
export {
  RADAR_PROFILE_CLASS,
  RADAR_PROFILE_DEFAULT_GOAL,
  RADAR_PROFILE_FORMS,
  RADAR_PROFILE_MAX_AXES,
  RADAR_PROFILE_MAX_LABEL_CHARS,
  RADAR_PROFILE_MAX_PLOT_PX,
  RADAR_PROFILE_MAX_SCORE,
  RADAR_PROFILE_MIN_AXES,
  RADAR_PROFILE_MISSING,
  RADAR_PROFILE_NARROW_PX,
  RADAR_PROFILE_RADIUS,
  RADAR_PROFILE_RINGS,
  RADAR_PROFILE_SLOTS,
  RADAR_PROFILE_VIEW,
  RADAR_PROFILE_WIDE_PX,
  radarProfileSlot,
} from './attrs.js';
export { radarProfileCss } from './style.js';
