export type Dimension = 'dominance' | 'emotion' | 'boundary' | 'attraction' | 'stability';

/** 题目类型：五个计分维度，或测谎题 / 填充题 */
export type ItemKind = Dimension | 'lie' | 'filler';

/** 正向题直接计分，反向题按 6 - 答案 计分 */
export type Direction = 'forward' | 'reverse';

export type ScoreBand = 'high' | 'mid' | 'low';

/** 题量档位：快速 25 / 常规 50 / 详细 100 */
export type QuizMode = 'quick' | 'normal' | 'detail';

/** 五点量表：1 完全不符合 → 5 完全符合；情景题取其中 1~4 */
export type AnswerValue = 1 | 2 | 3 | 4 | 5;

/** 题型：情景四选一 / 五点量表 */
export type QuestionFormat = 'scenario' | 'likert';

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  key: OptionKey;
  text: string;
  /** 情景题分值：A=1 / B=2 / C=3 / D=4 */
  value: 1 | 2 | 3 | 4;
}

export interface Question {
  id: string;
  /** 试卷中的题号，从 1 开始 */
  index: number;
  text: string;
  kind: ItemKind;
  /** 情景题带四个选项，五点量表不带 */
  format: QuestionFormat;
  options?: QuestionOption[];
  direction: Direction;
  /** 计分权重：1 普通 / 1.5 高关联 / 0 不计分（测谎与填充） */
  weight: number;
  /** 测谎题配对 ID，同一对的两题在试卷中必须拉开距离 */
  liePairId?: string;
}

/** questionId -> 1~5 */
export type AnswerMap = Record<string, AnswerValue>;

export interface DimensionScore {
  key: Dimension;
  label: string;
  /** 百分制 0-100 */
  score: number;
  /** 加权原始分 */
  raw: number;
  /** 该维度理论最低分（全部作答且全部取最低分） */
  min: number;
  /** 该维度理论满分（全部作答且全部取最高分） */
  max: number;
  /** 该维度的试卷中是否包含高权重题 */
  hasHighWeight: boolean;
}

export interface IdentityTheme {
  /** 主强调色：雷达描边 / 进度条 / 关键数字 */
  accent: string;
  /** 半透明填充色：雷达区域 */
  accentSoft: string;
  accentDeep: string;
  titleColor: string;
  badgeColor: string;
  badgeBorder: string;
  tagText: string;
  tagBg: string;
  tagBorder: string;
  /** 头图上的渐变遮罩 */
  overlay: string;
  heroImage: string;
}

export interface IdentityConfig {
  /** 英文身份标识，如 Delta */
  code: string;
  /** 中文名，如 德尔塔 */
  cn: string;
  /** 主导维度：决定身份归属 */
  primary: Dimension;
  /** 主标题形容词池，取前两个拼成「A · B · Code」 */
  titleWords: string[];
  /** 按分数段给出的标签池 */
  tags: Record<ScoreBand, string[]>;
  /** 补足标签用的通用池 */
  tagsFallback: string[];
  pheromoneStatus: Record<ScoreBand, string[]>;
  temperament: string[];
  analysis: string[];
  relationship: string;
  danger: string;
  matchTarget: string;
  shareSentence: string;
  theme: IdentityTheme;
}

export interface QuizResult {
  dimensions: DimensionScore[];
  /** 雷达图数据，顶点顺序：支配感(上) → 情绪浓度(右) → 边界感(右下) → 吸引力(左下) → 稳定值(左) */
  radar: { label: string; score: number }[];
  identity: string;
  identityCn: string;
  title: string;
  tags: string[];
  /** 人群占比，字符串形式，如 "2.46" */
  populationRate: string;
  pheromoneStatus: string;
  temperament: string;
  analysis: string[];
  relationship: string;
  danger: string;
  matchTarget: string;
  shareSentence: string;
  theme: IdentityTheme;
  band: ScoreBand;
  /** 本次使用的题量档位 */
  mode: QuizMode;
  /** 测谎题判定的不一致次数 */
  inconsistentCount?: number;
  /** 不一致次数达到阈值，结果信度偏低 */
  reliabilityFlag?: boolean;
  finishedAt: number;
}

/** 一次完整的测试记录，仅保留结果，不保留原始选项 */
export interface HistoryEntry {
  id: string;
  at: number;
  result: QuizResult;
}

/** 云端 / 本地的用户档案 */
export interface UserRecord {
  username: string;
  updatedAt: number;
  /** 试卷结构版本，结构变更后旧进度自动作废 */
  paperVersion?: number;
  /** 当前题量档位 */
  mode: QuizMode;
  /** 未完成的答题进度；生成结果后置空 */
  progress: { answers: AnswerMap; currentIndex: number } | null;
  history: HistoryEntry[];
}

/** 后台列表项：只返回结果，不返回原始选项 */
export interface AdminUser extends UserRecord {
  answered?: number;
}
