import type { Dimension, QuizMode } from '@/types';

/**
 * 题量与试卷结构的轻量配置：
 * 独立成文件，让首页只加载几十行配置，不必带上整套题库与报告文案。
 */

export interface ModeConfig {
  key: QuizMode;
  label: string;
  /** 每个维度抽取的计分题总数（情景 + 量表） */
  perDim: number;
  /** 每个维度抽取的情景四选一题数 */
  scenarioPerDim: number;
  /** 每个维度抽取的五点量表题数 */
  likertPerDim: number;
  total: number;
  minutes: number;
  /** 测谎题对数量（每对 2 题） */
  liePairs: number;
  /** 填充题数量 */
  fillers: number;
  /** 每个维度至少包含的高权重量表题数 */
  highPerDim: number;
  /** 仅这些维度保留高权重题；不填则全部维度生效 */
  highOnly?: Dimension[];
}

/**
 * 25 = 5×(3 情景 + 1 量表) + 2 组测谎(4) + 1 填充   → 量表 20%
 * 50 = 5×(6 情景 + 2 量表) + 4 组测谎(8) + 2 填充   → 量表 20%
 * 100 = 5×(15 情景 + 3 量表) + 5 组测谎(10)          → 量表 15%
 */
export const QUIZ_MODES: ModeConfig[] = [
  {
    key: 'quick',
    label: '快速',
    perDim: 4,
    scenarioPerDim: 3,
    likertPerDim: 1,
    total: 25,
    minutes: 2,
    liePairs: 2,
    fillers: 1,
    highPerDim: 1,
    highOnly: ['dominance', 'boundary'],
  },
  {
    key: 'normal',
    label: '常规',
    perDim: 8,
    scenarioPerDim: 6,
    likertPerDim: 2,
    total: 50,
    minutes: 5,
    liePairs: 4,
    fillers: 2,
    highPerDim: 1,
  },
  {
    key: 'detail',
    label: '详细',
    perDim: 18,
    scenarioPerDim: 15,
    likertPerDim: 3,
    total: 100,
    minutes: 12,
    liePairs: 5,
    fillers: 0,
    highPerDim: 2,
  },
];

export const MODE_CONFIG: Record<QuizMode, ModeConfig> = {
  quick: QUIZ_MODES[0],
  normal: QUIZ_MODES[1],
  detail: QUIZ_MODES[2],
};

export const DEFAULT_MODE: QuizMode = 'detail';

/** 试卷结构版本：题型或配额调整时递增，用于作废旧进度 */
export const PAPER_VERSION = 3;
