export type Dimension = 'dominance' | 'emotion' | 'boundary' | 'attraction' | 'stability';

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type ScoreBand = 'high' | 'mid' | 'low';

export interface QuestionOption {
  key: OptionKey;
  text: string;
  /** 选项分值，固定为 A=1 / B=2 / C=3 / D=4（选项文本按该维度强度由低到高排列） */
  score: number;
}

export interface Question {
  id: string;
  /** 试卷中的题号，从 1 开始 */
  index: number;
  dimension: Dimension;
  text: string;
  options: QuestionOption[];
}

/** questionId -> 选项 */
export type AnswerMap = Record<string, OptionKey>;

export interface DimensionScore {
  key: Dimension;
  label: string;
  /** 百分制 0-100 */
  score: number;
  /** 原始分，20-80（20 题 × 1~4 分） */
  raw: number;
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
  finishedAt: number;
}
