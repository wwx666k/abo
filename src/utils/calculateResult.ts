import {
  DIMENSIONS,
  DIMENSION_LABELS,
  OPTION_SCORE,
  QUESTIONS_PER_DIMENSION,
  TOTAL_QUESTIONS,
  questionMap,
} from '@/data/questions';
import { IDENTITY_BY_DIMENSION, IDENTITIES, resolveBand } from '@/data/identities';
import { hashString, mulberry32, pickMany, pickOne, randomFloat } from '@/utils/random';
import type { AnswerMap, Dimension, DimensionScore, OptionKey, QuizResult } from '@/types';

const MIN_RAW = QUESTIONS_PER_DIMENSION * 1;
const MAX_RAW = QUESTIONS_PER_DIMENSION * 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 每题分值：A=1 / B=2 / C=3 / D=4 */
export function scoreOf(key: OptionKey): number {
  return OPTION_SCORE[key];
}

/** 已作答数量 */
export function answeredCount(answers: AnswerMap): number {
  return Object.keys(answers).length;
}

/** 是否已答完全部 100 题 */
export function isComplete(answers: AnswerMap): boolean {
  return answeredCount(answers) >= TOTAL_QUESTIONS;
}

/** 把原始分（20-80）映射为百分制（0-100） */
export function toPercent(raw: number): number {
  return clamp(Math.round(((raw - MIN_RAW) / (MAX_RAW - MIN_RAW)) * 100), 0, 100);
}

/** 汇总五维得分 */
export function scoreDimensions(answers: AnswerMap): DimensionScore[] {
  const raw: Record<Dimension, number> = {
    dominance: 0,
    emotion: 0,
    boundary: 0,
    attraction: 0,
    stability: 0,
  };

  Object.keys(answers).forEach((id) => {
    const question = questionMap[id];
    if (!question) return;
    const score = OPTION_SCORE[answers[id]];
    if (typeof score !== 'number') return;
    raw[question.dimension] += score;
  });

  return DIMENSIONS.map((key) => {
    const value = raw[key];
    return { key, label: DIMENSION_LABELS[key], score: toPercent(value), raw: value };
  });
}

/** 由答案生成稳定种子：同一份答案永远得到同一份报告 */
function buildSeed(answers: AnswerMap): string {
  return Object.keys(answers)
    .sort()
    .map((id) => `${id}:${answers[id]}`)
    .join('|');
}

/** 按主导维度的分数段 + 种子随机，组合出 5 个标签 */
function pickTags(identityCode: string, band: ReturnType<typeof resolveBand>, rng: () => number): string[] {
  const identity = IDENTITIES[identityCode];
  const fromBand = pickMany(identity.tags[band], 5, rng);
  if (fromBand.length >= 5) return fromBand;
  const rest = pickMany(
    identity.tagsFallback.filter((tag) => !fromBand.includes(tag)),
    5 - fromBand.length,
    rng,
  );
  return [...fromBand, ...rest];
}

function fillTemplate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => ctx[key] ?? '');
}

/**
 * 核心算法：答案 -> 五维分数 -> 身份 / 标签 / 信息素 / 人群占比 -> 完整报告
 */
export function calculateResult(answers: AnswerMap): QuizResult {
  const dimensions = scoreDimensions(answers);
  const rng = mulberry32(hashString(buildSeed(answers)));

  // 主导维度：分数最高者；同分时按固定维度顺序决胜，保证结果稳定
  const ranked = [...dimensions].sort(
    (a, b) => b.score - a.score || DIMENSIONS.indexOf(a.key) - DIMENSIONS.indexOf(b.key),
  );
  const top = ranked[0];

  const identity = IDENTITIES[IDENTITY_BY_DIMENSION[top.key]];
  const band = resolveBand(top.score);

  const tags = pickTags(identity.code, band, rng);
  const [firstWord, secondWord] = pickMany(identity.titleWords, 2, rng);
  const title = `${firstWord} · ${secondWord} · ${identity.code}`;
  const pheromoneStatus = pickOne(identity.pheromoneStatus[band], rng);
  const temperament = pickOne(identity.temperament, rng);
  const populationRate = randomFloat(0.1, 4.99, rng).toFixed(2);

  const ctx: Record<string, string> = {
    title,
    code: identity.code,
    cn: identity.cn,
    status: pheromoneStatus,
    temperament,
  };

  return {
    dimensions,
    radar: dimensions.map((item) => ({ label: item.label, score: item.score })),
    identity: identity.code,
    identityCn: identity.cn,
    title,
    tags,
    populationRate,
    pheromoneStatus,
    temperament,
    analysis: identity.analysis.map((paragraph) => fillTemplate(paragraph, ctx)),
    relationship: fillTemplate(identity.relationship, ctx),
    danger: fillTemplate(identity.danger, ctx),
    matchTarget: fillTemplate(identity.matchTarget, ctx),
    shareSentence: fillTemplate(identity.shareSentence, ctx),
    theme: identity.theme,
    band,
    finishedAt: Date.now(),
  };
}

/** 最高维度（用于结果页副标题文案） */
export function topDimension(dimensions: DimensionScore[]): DimensionScore {
  return [...dimensions].sort(
    (a, b) => b.score - a.score || DIMENSIONS.indexOf(a.key) - DIMENSIONS.indexOf(b.key),
  )[0];
}
