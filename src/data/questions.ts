import type { Dimension, Question, QuizMode } from '@/types';
import { hashString, mulberry32, shuffle } from '@/utils/random';

export type { QuizMode };

/**
 * 题库基底参考 IPIP-NEO（大五人格）与 SDO（社会支配倾向）的经典条目结构改写：
 * - 五个维度各 28 道计分题（共 140 道），正向 / 反向混合
 * - 6 组测谎题对（12 道），不计分，只用于一致性校验
 * - 8 道填充题，不计分，用于稀释作答节奏
 * - 五点量表，反向题按 6 - 答案 计分，每题乘以权重后汇总
 *
 * 抽题是确定性的：同一档位永远得到同一份试卷，因此刷新、换设备续答都不会串题。
 */

export const DIMENSIONS: Dimension[] = ['dominance', 'emotion', 'boundary', 'attraction', 'stability'];

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
export const RADAR_ORDER: Dimension[] = ['dominance', 'emotion', 'boundary', 'attraction', 'stability'];

/** 五点量表 */
export const LIKERT_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string; short: string }[] = [
  { value: 1, label: '完全不符合', short: '完全不符' },
  { value: 2, label: '比较不符合', short: '不太符合' },
  { value: 3, label: '不确定', short: '一般' },
  { value: 4, label: '比较符合', short: '比较符合' },
  { value: 5, label: '完全符合', short: '完全符合' },
];

export interface ModeConfig {
  key: QuizMode;
  label: string;
  /** 每个维度抽取的计分题数 */
  perDim: number;
  total: number;
  minutes: number;
  /** 测谎题对数量（每对 2 题） */
  liePairs: number;
  /** 填充题数量 */
  fillers: number;
  /** 每个维度至少包含的高权重题数 */
  highPerDim: number;
  /** 仅这些维度保留高权重题；不填则全部维度生效 */
  highOnly?: Dimension[];
}

/**
 * 25 = 5×4 计分 + 2 组测谎(4) + 1 填充
 * 50 = 5×8 计分 + 4 组测谎(8) + 2 填充
 * 100 = 5×18 计分 + 5 组测谎(10)
 */
export const QUIZ_MODES: ModeConfig[] = [
  {
    key: 'quick',
    label: '快速',
    perDim: 4,
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

/** [题干, 'f' 正向 / 'r' 反向, 权重（缺省 1）] */
type Raw = [string, 'f' | 'r', number?];

const DOMINANCE: Raw[] = [
  ['我天生就适合做领导者。', 'f', 1.5],
  ['一群人做决定时，我更希望最后拍板的人是我。', 'f', 1.5],
  ['我不介意为了达成目标去影响甚至施压别人。', 'f', 1.5],
  ['在关系里，我需要掌握节奏和主动权。', 'f', 1.5],
  ['看到有人犹豫不决，我会直接替他把决定做了。', 'f', 1.5],
  ['我很难接受别人替我安排我的人生。', 'f', 1.5],
  ['我享受别人听我指挥的感觉。', 'f', 1.5],
  ['如果规则挡了我的路，我会想办法绕过去。', 'f', 1.5],
  ['我更在意赢，而不是被所有人喜欢。', 'f', 1.5],
  ['面对比我强势的人，我会想压过他，而不是配合他。', 'f', 1.5],
  ['我习惯等别人先开口。', 'r'],
  ['别人替我做决定时，我会觉得轻松。', 'r'],
  ['讨论中我常常顺着别人的意见走。', 'r'],
  ['我不太喜欢站在人群中心。', 'r'],
  ['只要事情能推进，谁主导我无所谓。', 'r'],
  ['我很少主动要求什么。', 'r'],
  ['我通常会先观察一阵，再决定要不要表态。', 'f'],
  ['需要有人负责时，我愿意站出来。', 'f'],
  ['我表达意见时比较直接。', 'f'],
  ['我不喜欢被安排，但多数时候会忍下来。', 'f'],
  ['别人打断我说话，我会当场纠正。', 'f'],
  ['我在冲突里很少退让。', 'f'],
  ['我讨厌被人指挥，但也不会正面冲突。', 'f'],
  ['我对「被需要」的渴望超过「被服从」。', 'r'],
  ['我宁愿当幕后那个人。', 'r'],
  ['需要有人拍板时，我通常是那个人。', 'f'],
  ['我会为了让局面可控而提前布局。', 'f'],
  ['别人的情绪不太能左右我的决定。', 'f'],
];

const EMOTION: Raw[] = [
  ['我的情绪来得又快又猛。', 'f', 1.5],
  ['一件小事就能让我情绪起伏一整天。', 'f', 1.5],
  ['我喜欢那种心跳加速、几乎失控的感觉。', 'f', 1.5],
  ['我会因为一段音乐突然难过。', 'f', 1.5],
  ['我很容易对某个人产生强烈的依赖感。', 'f', 1.5],
  ['我的喜欢和讨厌都非常极端。', 'f', 1.5],
  ['我很少有大起大落的情绪。', 'r'],
  ['别人情绪激动时，我通常很冷静。', 'r'],
  ['我不太容易被电影或音乐打动。', 'r'],
  ['我倾向于把感受藏在心里。', 'r'],
  ['我很少因为小事心烦。', 'r'],
  ['我习惯用理性压住情绪。', 'r'],
  ['我会有莫名其妙低落的时刻。', 'f'],
  ['我容易被别人的情绪传染。', 'f'],
  ['我心里戏很多。', 'f'],
  ['我会反复回想别人说过的一句话。', 'f'],
  ['我喜欢浓烈的东西：味道、颜色、关系。', 'f'],
  ['我对不咸不淡的关系没有兴趣。', 'f'],
  ['我很少在别人面前崩溃。', 'r'],
  ['我需要独处来消化情绪。', 'f'],
  ['我会因为一句无心的话记很久。', 'f'],
  ['我的开心也很容易满出来。', 'f'],
  ['我对稳定的渴望超过对刺激的渴望。', 'r'],
  ['我很少主动表达喜欢。', 'r'],
  ['我做决定时更多靠感觉。', 'f'],
  ['我容易在深夜情绪泛滥。', 'f'],
  ['我对别人的痛苦共情得很深。', 'f'],
  ['我常被人说太敏感。', 'f'],
];

const BOUNDARY: Raw[] = [
  ['我的东西，没有我的允许谁都不能碰。', 'f', 1.5],
  ['别人未经同意替我做决定，我会立刻翻脸。', 'f', 1.5],
  ['我非常清楚哪些事是我的事、哪些不是。', 'f', 1.5],
  ['我不接受任何人用「为你好」来干涉我。', 'f', 1.5],
  ['再亲近的人也不能随便翻我的手机。', 'f', 1.5],
  ['我会明确告诉别人，这不在我能接受的范围里。', 'f', 1.5],
  ['我宁愿被讨厌，也不愿被越界。', 'f', 1.5],
  ['我需要一块谁都不能进入的私人空间。', 'f', 1.5],
  ['我很难拒绝别人的请求。', 'r'],
  ['别人难过时，我会放下自己的事去陪。', 'r'],
  ['我常常因为不好意思而答应不想做的事。', 'r'],
  ['我会为了不让气氛尴尬而委屈自己。', 'r'],
  ['别人问我私事，我基本都会说。', 'r'],
  ['我很少对人设防。', 'r'],
  ['我会先照顾别人的感受，再考虑自己。', 'r'],
  ['我不太会说「不」。', 'r'],
  ['我可以和很熟的人共享一切。', 'r'],
  ['别人开玩笑踩到我，我一般笑笑就过去了。', 'r'],
  ['我需要独处来恢复能量。', 'f'],
  ['关系变太近时，我会下意识后退。', 'f'],
  ['我对「被黏着」感到不适。', 'f'],
  ['我会把工作和生活分得很开。', 'f'],
  ['我不喜欢别人过问我的计划。', 'f'],
  ['我可以对一个人好，但不代表我属于他。', 'f'],
  ['我会先划清界限，再谈感情。', 'f'],
  ['我很少主动分享自己的私事。', 'f'],
  ['我不介意别人知道我的行踪。', 'r'],
  ['我愿意为重要的人打破自己的规则。', 'r'],
];

const ATTRACTION: Raw[] = [
  ['我走进一个房间时，会有人注意到我。', 'f', 1.5],
  ['我很清楚自己身上有让人靠近的东西。', 'f', 1.5],
  ['我擅长让别人对我产生兴趣。', 'f', 1.5],
  ['我享受被注视的感觉。', 'f', 1.5],
  ['我很容易让人对我上头。', 'f', 1.5],
  ['我知道怎么用一个眼神改变气氛。', 'f', 1.5],
  ['我在人群里通常是透明的那一个。', 'r'],
  ['我不太会主动吸引别人的注意。', 'r'],
  ['被夸外貌时我会不自在。', 'r'],
  ['我不觉得自己有魅力。', 'r'],
  ['我很少收到别人的主动示好。', 'r'],
  ['我不擅长暧昧。', 'r'],
  ['我说话时别人会认真听。', 'f'],
  ['我常常被人主动搭话。', 'f'],
  ['我对自己的外形有把握。', 'f'],
  ['我能感觉到别人在看我。', 'f'],
  ['我在陌生场合也能很快被记住。', 'f'],
  ['我身上有种说不清的距离感，反而让人想靠近。', 'f'],
  ['我更在意相处舒服，而不是有没有吸引力。', 'r'],
  ['我不喜欢成为焦点。', 'r'],
  ['我会精心打理自己的外表。', 'f'],
  ['我能在很短时间内判断谁对我有意思。', 'f'],
  ['我很少刻意经营自己的形象。', 'r'],
  ['别人说我「很有味道」。', 'f'],
  ['我在关系里更常是被追的那一方。', 'f'],
  ['我不太会表达好感，容易错过。', 'r'],
  ['我笑起来很有感染力。', 'f'],
  ['我更喜欢安静地待在角落。', 'r'],
];

const STABILITY: Raw[] = [
  ['不管发生什么，我都能保持自己的节奏。', 'f', 1.5],
  ['我答应的事，几乎不会变。', 'f', 1.5],
  ['我的情绪很少影响我的判断。', 'f', 1.5],
  ['我做的长期决定，很少反悔。', 'f', 1.5],
  ['在混乱里我反而更冷静。', 'f', 1.5],
  ['我对自己的选择有持续的信念。', 'f', 1.5],
  ['我经常改变主意。', 'r'],
  ['我的计划常常坚持不到最后。', 'r'],
  ['我很容易被新东西吸引，然后放弃旧的。', 'r'],
  ['我的状态起伏很大。', 'r'],
  ['我很难长期维持一个习惯。', 'r'],
  ['我常在事后后悔自己的决定。', 'r'],
  ['我做事之前会想清楚后果。', 'f'],
  ['我更喜欢稳定、可预期的生活。', 'f'],
  ['我很少因为一时冲动做决定。', 'f'],
  ['我能把一件无聊的事做很久。', 'f'],
  ['我对承诺看得很重。', 'f'],
  ['我情绪上来时也能刹住车。', 'f'],
  ['我需要不断的新鲜感。', 'r'],
  ['我常常同时开很多头，然后都放下。', 'r'],
  ['我一旦决定，就不太听劝。', 'f'],
  ['我会定期复盘自己的状态。', 'f'],
  ['我在压力下容易乱。', 'r'],
  ['我的作息比较规律。', 'f'],
  ['我很少临时放别人鸽子。', 'f'],
  ['我喜欢随性，讨厌被计划绑住。', 'r'],
  ['我能等，哪怕结果很久才来。', 'f'],
  ['我对「以后」没有太多打算。', 'r'],
];

const RAW_BANKS: Record<Dimension, Raw[]> = {
  dominance: DOMINANCE,
  emotion: EMOTION,
  boundary: BOUNDARY,
  attraction: ATTRACTION,
  stability: STABILITY,
};

const PREFIX: Record<Dimension, string> = {
  dominance: 'd',
  emotion: 'e',
  boundary: 'b',
  attraction: 'a',
  stability: 's',
};

function buildBank(dimension: Dimension): Question[] {
  return RAW_BANKS[dimension].map(([text, direction, weight], i) => ({
    id: `${PREFIX[dimension]}${String(i + 1).padStart(2, '0')}`,
    index: 0,
    text,
    kind: dimension,
    direction: direction === 'r' ? 'reverse' : 'forward',
    weight: weight ?? 1,
  }));
}

export const BANKS: Record<Dimension, Question[]> = {
  dominance: buildBank('dominance'),
  emotion: buildBank('emotion'),
  boundary: buildBank('boundary'),
  attraction: buildBank('attraction'),
  stability: buildBank('stability'),
};

/** 测谎题对：A 为正向表述，B 为反向表述，两题语义相反 */
const LIE_RAW: { id: string; a: string; b: string }[] = [
  { id: 'L1', a: '我在陌生人面前也能很快放松下来。', b: '面对陌生人，我总是紧张到不知道说什么。' },
  { id: 'L2', a: '我很少因为别人的评价而影响心情。', b: '别人一句负面评价能让我难受很久。' },
  { id: 'L3', a: '我做事之前通常会把计划想清楚。', b: '我经常冲动行事，事后才想后果。' },
  { id: 'L4', a: '我习惯主动承担团队里的事务。', b: '团队里的事，我一般都躲着不做。' },
  { id: 'L5', a: '我能长时间专注在同一件事上。', b: '我很难把注意力放在一件事上超过十分钟。' },
  { id: 'L6', a: '我对自己的生活有明确的规划。', b: '我基本走一步看一步，没什么计划。' },
];

export const LIE_PAIRS: Question[][] = LIE_RAW.map(({ id, a, b }) => [
  {
    id: `${id}A`,
    index: 0,
    text: a,
    kind: 'lie',
    direction: 'forward',
    weight: 0,
    liePairId: id,
  },
  {
    id: `${id}B`,
    index: 0,
    text: b,
    kind: 'lie',
    direction: 'reverse',
    weight: 0,
    liePairId: id,
  },
]);

const FILLER_TEXT = [
  '我更喜欢早上起床后先喝一杯水。',
  '我会在手机里存很多截图。',
  '我出门前通常会检查一遍有没有带钥匙。',
  '我喜欢走路时听点什么。',
  '我对天气变化比较敏感。',
  '我会把没看完的剧先存起来。',
  '我偶尔会整理房间来放空。',
  '我买东西前会先看评价。',
];

export const FILLERS: Question[] = FILLER_TEXT.map((text, i) => ({
  id: `f${String(i + 1).padStart(2, '0')}`,
  index: 0,
  text,
  kind: 'filler',
  direction: 'forward',
  weight: 0,
}));

const PAPER_SEED = 20261021;

/** 测谎题位置：均匀铺开并加轻微抖动，保证同一对两题至少相隔 5 题 */
function placeLiePositions(total: number, count: number, rng: () => number): number[] {
  if (count === 0) return [];
  if (count === 1) return [Math.floor(total / 2)];

  const base = Array.from({ length: count }, (_, i) => Math.round((i * (total - 1)) / (count - 1)));
  const jittered = base
    .map((pos) => Math.min(total - 1, Math.max(0, pos + Math.floor(rng() * 5) - 2)))
    .sort((a, b) => a - b);

  const distinct = new Set(jittered).size === count;
  const spaced = jittered.every((pos, i) => i === 0 || pos - jittered[i - 1] >= 5);
  return distinct && spaced ? jittered : base;
}

function buildPaper(mode: QuizMode): Question[] {
  const cfg = MODE_CONFIG[mode];
  const rng = mulberry32(hashString(`paper:${mode}:${PAPER_SEED}`));
  const scored: Question[] = [];

  DIMENSIONS.forEach((dimension) => {
    const bank = BANKS[dimension];
    const highQuota = cfg.highOnly && !cfg.highOnly.includes(dimension) ? 0 : cfg.highPerDim;
    const highPool = bank.filter((q) => q.weight > 1);
    const plainPool = bank.filter((q) => q.weight === 1);

    if (bank.length < cfg.perDim) {
      throw new Error(`[${mode}] ${dimension} 题库不足：需要 ${cfg.perDim} 题，实际 ${bank.length} 题`);
    }
    if (highPool.length < highQuota) {
      throw new Error(
        `[${mode}] ${dimension} 高权重题不足：需要 ${highQuota} 题，实际 ${highPool.length} 题`,
      );
    }
    if (plainPool.length < cfg.perDim - highQuota) {
      throw new Error(
        `[${mode}] ${dimension} 普通题不足：需要 ${cfg.perDim - highQuota} 题，实际 ${plainPool.length} 题`,
      );
    }

    scored.push(...shuffle(highPool, rng).slice(0, highQuota));
    scored.push(...shuffle(plainPool, rng).slice(0, cfg.perDim - highQuota));
  });

  const pairs = shuffle(LIE_PAIRS, rng).slice(0, cfg.liePairs);
  if (pairs.length < cfg.liePairs) {
    throw new Error(`[${mode}] 测谎题对不足：需要 ${cfg.liePairs} 组，实际 ${pairs.length} 组`);
  }
  const lieItems = pairs.flat();

  const fillers = shuffle(FILLERS, rng).slice(0, cfg.fillers);
  if (fillers.length < cfg.fillers) {
    throw new Error(`[${mode}] 填充题不足：需要 ${cfg.fillers} 题，实际 ${fillers.length} 题`);
  }

  if (scored.length + lieItems.length + fillers.length !== cfg.total) {
    throw new Error(
      `[${mode}] 题量与配置不一致：${scored.length + lieItems.length + fillers.length} != ${cfg.total}`,
    );
  }

  const others = shuffle([...scored, ...fillers], rng);
  const liePositions = placeLiePositions(cfg.total, lieItems.length, rng);

  const slots: (Question | null)[] = new Array(cfg.total).fill(null);
  liePositions.forEach((pos, i) => {
    slots[pos] = lieItems[i];
  });

  let cursor = 0;
  for (let i = 0; i < cfg.total; i += 1) {
    if (!slots[i]) {
      slots[i] = others[cursor];
      cursor += 1;
    }
  }

  return slots.map((question, i) => ({ ...(question as Question), index: i + 1 }));
}

export const QUESTIONS_BY_MODE: Record<QuizMode, Question[]> = {
  quick: buildPaper('quick'),
  normal: buildPaper('normal'),
  detail: buildPaper('detail'),
};

function indexQuestions(bank: Question[]): Record<string, Question> {
  return bank.reduce<Record<string, Question>>((acc, question) => {
    acc[question.id] = question;
    return acc;
  }, {});
}

export const QUESTION_MAP_BY_MODE: Record<QuizMode, Record<string, Question>> = {
  quick: indexQuestions(QUESTIONS_BY_MODE.quick),
  normal: indexQuestions(QUESTIONS_BY_MODE.normal),
  detail: indexQuestions(QUESTIONS_BY_MODE.detail),
};

export const questions: Question[] = QUESTIONS_BY_MODE.detail;
export const questionMap: Record<string, Question> = QUESTION_MAP_BY_MODE.detail;
