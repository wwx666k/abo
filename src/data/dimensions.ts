import type { Dimension } from '@/types';

/**
 * 五维元信息的轻量模块：首页只依赖这里，避免把题库和报告文案带进首屏。
 */

export const DIMENSIONS: Dimension[] = [
  'dominance',
  'emotion',
  'boundary',
  'attraction',
  'stability',
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  dominance: '支配感',
  emotion: '情绪浓度',
  boundary: '边界感',
  attraction: '吸引力',
  stability: '稳定值',
};

export const DIMENSION_DESC: Record<Dimension, string> = {
  dominance: '你对局面的掌控欲与主导倾向',
  emotion: '你的情绪浓度与感受强度',
  boundary: '你与他人之间的边界强度',
  attraction: '你的吸引力与关系牵引力',
  stability: '你的稳定度与长期一致性',
};

/** 雷达图顶点顺序：支配感(上) → 情绪浓度(右) → 边界感(右下) → 吸引力(左下) → 稳定值(左) */
export const RADAR_ORDER: Dimension[] = [
  'dominance',
  'emotion',
  'boundary',
  'attraction',
  'stability',
];
