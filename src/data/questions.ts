import type { Dimension, OptionKey, Question, QuestionOption, QuizMode } from '@/types';
import { hashString, mulberry32, shuffle } from '@/utils/random';
import { SCENARIO_RAW } from './scenarioBank';

export type { QuizMode };

/**
 * 混合题型题库：
 * - 情景四选一：五个维度各 24 道（共 120 道），选项分值在题目内打乱顺序显式标注
 * - 五点量表：五个维度各 28 道（共 140 道），只占试卷的 15%~20%
 * - 6 组测谎题对（12 道，情景四选一）+ 8 道情景填充题，均不计分
 *
 * 每个档位的试卷以情景题为主；计分时按各自量表区间（情景 1~4、量表 1~5）归一化。
 * 抽题是确定性的：同一档位永远得到同一份试卷，因此刷新、换设备续答都不会串题。
 */

import { DIMENSIONS } from './dimensions';
import { MODE_CONFIG } from './modes';

export { DIMENSIONS, DIMENSION_DESC, DIMENSION_LABELS, RADAR_ORDER } from './dimensions';
export type { ModeConfig } from './modes';
export { DEFAULT_MODE, MODE_CONFIG, PAPER_VERSION, QUIZ_MODES } from './modes';

/** 五点量表 */
export const LIKERT_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string; short: string }[] = [
  { value: 1, label: '完全不符合', short: '完全不符' },
  { value: 2, label: '比较不符合', short: '不太符合' },
  { value: 3, label: '不确定', short: '一般' },
  { value: 4, label: '比较符合', short: '比较符合' },
  { value: 5, label: '完全符合', short: '完全符合' },
];

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
    format: 'likert',
    direction: direction === 'r' ? 'reverse' : 'forward',
    weight: weight ?? 1,
  }));
}

export const LIKERT_BANKS: Record<Dimension, Question[]> = {
  dominance: buildBank('dominance'),
  emotion: buildBank('emotion'),
  boundary: buildBank('boundary'),
  attraction: buildBank('attraction'),
  stability: buildBank('stability'),
};

const SCENARIO_PREFIX: Record<Dimension, string> = {
  dominance: 'ds',
  emotion: 'es',
  boundary: 'bs',
  attraction: 'as',
  stability: 'ss',
};

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

function buildScenarioOptions(raw: [string, 1 | 2 | 3 | 4][]): QuestionOption[] {
  return raw.map(([optionText, value], idx) => ({
    key: OPTION_KEYS[idx],
    text: optionText,
    value,
  }));
}

function buildScenarioBank(dimension: Dimension): Question[] {
  return SCENARIO_RAW[dimension].map(([text, options], i) => ({
    id: `${SCENARIO_PREFIX[dimension]}${String(i + 1).padStart(2, '0')}`,
    index: 0,
    text,
    kind: dimension,
    format: 'scenario',
    options: buildScenarioOptions(options),
    direction: 'forward',
    weight: 1,
  }));
}

export const SCENARIO_BANKS: Record<Dimension, Question[]> = {
  dominance: buildScenarioBank('dominance'),
  emotion: buildScenarioBank('emotion'),
  boundary: buildScenarioBank('boundary'),
  attraction: buildScenarioBank('attraction'),
  stability: buildScenarioBank('stability'),
};

/**
 * 测谎题对：两题在同一个特质上换不同场景提问，都是情景四选一。
 * 取值越大代表该特质越明显，因此同一对的两题作答分值相差 >= 2 记为一次矛盾。
 * 不计分，只在报告里用于信度提示。
 */
type LieScenario = [string, [string, 1 | 2 | 3 | 4][]];

const LIE_RAW: { id: string; a: LieScenario; b: LieScenario }[] = [
  {
    id: 'L1',
    a: [
      '你被朋友拉去一个都是陌生人的聚会。',
      [
        ['尽量待在熟人旁边', 1],
        ['礼貌打招呼，不多说话', 2],
        ['找一两个看起来好聊的人说话', 3],
        ['很快就能和几个人聊起来', 4],
      ],
    ],
    b: [
      '你需要在一个新群里做自我介绍。',
      [
        ['拖到最后再说', 1],
        ['简单说一句就结束', 2],
        ['正常介绍，回答问题', 3],
        ['借机把大家认识一遍', 4],
      ],
    ],
  },
  {
    id: 'L2',
    a: [
      '有人当面说你哪里做得不好。',
      [
        ['会难受很久', 1],
        ['表面接受，心里不舒服', 2],
        ['会问清楚具体问题', 3],
        ['能分开看待，继续做事', 4],
      ],
    ],
    b: [
      '你发的内容被人挑刺。',
      [
        ['会反复想这件事', 1],
        ['有点在意，但不会回应', 2],
        ['会说明自己的想法', 3],
        ['看过就算了，不影响自己', 4],
      ],
    ],
  },
  {
    id: 'L3',
    a: [
      '你接到一个从没做过的任务。',
      [
        ['凭感觉先做', 1],
        ['边做边想', 2],
        ['先列步骤再开始', 3],
        ['提前想清楚可能的坑', 4],
      ],
    ],
    b: [
      '你要安排一次出行。',
      [
        ['到了再说', 1],
        ['大概定个方向', 2],
        ['提前查好路线和时间', 3],
        ['把备用方案也准备好', 4],
      ],
    ],
  },
  {
    id: 'L4',
    a: [
      '小组作业没人愿意做汇总。',
      [
        ['等别人接', 1],
        ['被点到才做', 2],
        ['主动说自己来', 3],
        ['主动接手并安排分工', 4],
      ],
    ],
    b: [
      '公司活动需要有人统筹。',
      [
        ['尽量不参与', 1],
        ['分配到什么就做什么', 2],
        ['可以承担一部分', 3],
        ['会主动把整件事接过来', 4],
      ],
    ],
  },
  {
    id: 'L5',
    a: [
      '你要读完一份很长的资料。',
      [
        ['看几页就分心', 1],
        ['看得断断续续', 2],
        ['分几次看完', 3],
        ['一次专注看完', 4],
      ],
    ],
    b: [
      '你在做一件重复性工作。',
      [
        ['很快就烦', 1],
        ['做一会就想停', 2],
        ['能按节奏做完', 3],
        ['能长时间保持专注', 4],
      ],
    ],
  },
  {
    id: 'L6',
    a: [
      '你对未来一年的安排。',
      [
        ['没想过', 1],
        ['有个模糊方向', 2],
        ['有大致计划', 3],
        ['有清楚目标和步骤', 4],
      ],
    ],
    b: [
      '你的收支管理。',
      [
        ['基本不记', 1],
        ['大概知道花在哪', 2],
        ['会定期看账', 3],
        ['有预算和储蓄计划', 4],
      ],
    ],
  },
];

const buildSpecialQuestion = (
  id: string,
  kind: 'lie' | 'filler',
  [text, options]: LieScenario,
  liePairId?: string,
): Question => ({
  id,
  index: 0,
  text,
  kind,
  format: 'scenario',
  options: buildScenarioOptions(options),
  direction: 'forward',
  weight: 0,
  ...(liePairId ? { liePairId } : {}),
});

export const LIE_PAIRS: Question[][] = LIE_RAW.map(({ id, a, b }) => [
  buildSpecialQuestion(`${id}A`, 'lie', a, id),
  buildSpecialQuestion(`${id}B`, 'lie', b, id),
]);

const FILLER_RAW: LieScenario[] = [
  [
    '早上起床后你通常先做什么。',
    [
      ['先看手机', 1],
      ['先洗漱', 2],
      ['先喝一杯水', 3],
      ['先拉开窗帘', 4],
    ],
  ],
  [
    '你出门前的习惯。',
    [
      ['直接走', 1],
      ['看一眼手机和钥匙', 2],
      ['检查一遍包', 3],
      ['按固定清单过一遍', 4],
    ],
  ],
  [
    '你点外卖的时候。',
    [
      ['随便点一家', 1],
      ['看评分', 2],
      ['挑自己常吃的', 3],
      ['会对比几家的评价和价格', 4],
    ],
  ],
  [
    '你走路的时候。',
    [
      ['什么都不听', 1],
      ['听歌', 2],
      ['听播客', 3],
      ['想事情', 4],
    ],
  ],
  [
    '你整理房间的频率。',
    [
      ['几乎不整理', 1],
      ['想起来才整理', 2],
      ['每周固定整理', 3],
      ['用完就归位', 4],
    ],
  ],
  [
    '你买衣服的时候。',
    [
      ['看到就买', 1],
      ['试了再说', 2],
      ['会先想搭配', 3],
      ['会等打折再买', 4],
    ],
  ],
  [
    '你手机里存得最多的是。',
    [
      ['照片', 1],
      ['聊天记录', 2],
      ['截图', 3],
      ['备忘录', 4],
    ],
  ],
  [
    '天气转凉你会。',
    [
      ['照常穿', 1],
      ['加一件外套', 2],
      ['提前看天气预报', 3],
      ['把换季衣服都整理出来', 4],
    ],
  ],
];

export const FILLERS: Question[] = FILLER_RAW.map((raw, i) =>
  buildSpecialQuestion(`f${String(i + 1).padStart(2, '0')}`, 'filler', raw),
);

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
    const scenarioPool = SCENARIO_BANKS[dimension];
    const likertPool = LIKERT_BANKS[dimension];
    const highQuota = cfg.highOnly && !cfg.highOnly.includes(dimension) ? 0 : cfg.highPerDim;
    const highPool = likertPool.filter((q) => q.weight > 1);
    const plainPool = likertPool.filter((q) => q.weight === 1);

    if (scenarioPool.length < cfg.scenarioPerDim) {
      throw new Error(
        `[${mode}] ${dimension} 情景题不足：需要 ${cfg.scenarioPerDim} 题，实际 ${scenarioPool.length} 题`,
      );
    }
    if (likertPool.length < cfg.likertPerDim) {
      throw new Error(
        `[${mode}] ${dimension} 量表题不足：需要 ${cfg.likertPerDim} 题，实际 ${likertPool.length} 题`,
      );
    }
    if (highPool.length < highQuota) {
      throw new Error(
        `[${mode}] ${dimension} 高权重题不足：需要 ${highQuota} 题，实际 ${highPool.length} 题`,
      );
    }
    if (plainPool.length < cfg.likertPerDim - highQuota) {
      throw new Error(
        `[${mode}] ${dimension} 普通题不足：需要 ${cfg.likertPerDim - highQuota} 题，实际 ${plainPool.length} 题`,
      );
    }

    scored.push(...shuffle(scenarioPool, rng).slice(0, cfg.scenarioPerDim));
    scored.push(...shuffle(highPool, rng).slice(0, highQuota));
    scored.push(...shuffle(plainPool, rng).slice(0, cfg.likertPerDim - highQuota));
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
