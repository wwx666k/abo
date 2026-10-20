import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DIMENSIONS, DIMENSION_DESC, DIMENSION_LABELS, TOTAL_QUESTIONS } from '@/data/questions';
import { answeredCount, isComplete } from '@/utils/calculateResult';
import { useQuizStore } from '@/store/useQuizStore';
import { SparkIcon } from '@/components/Icons';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
};

export default function Home() {
  const answers = useQuizStore((state) => state.answers);
  const result = useQuizStore((state) => state.result);
  const done = answeredCount(answers);
  const complete = isComplete(answers);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[500px] flex-col px-5 pb-10 pt-14">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="flex justify-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-capsule border border-brand-purple/25 bg-white/60 px-3.5 py-1.5 text-[12px] font-semibold tracking-widest text-brand-violet backdrop-blur">
          <SparkIcon className="h-3.5 w-3.5" />
          信息素档案 · {TOTAL_QUESTIONS} 题
        </span>
      </motion.div>

      <motion.h1
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
        className="mt-6 text-center text-[30px] font-black leading-[1.32] tracking-wide text-ink-900"
      >
        ABO性别身份
        <br />
        与信息素检测
      </motion.h1>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.16, ease: 'easeOut' }}
        className="mt-4 text-center text-[13.5px] leading-[1.9] text-ink-500"
      >
        用 {TOTAL_QUESTIONS} 道情境题，解析你的
        <br />
        支配感 · 情绪浓度 · 边界感 · 吸引力 · 稳定值
      </motion.p>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.24, ease: 'easeOut' }}
        className="card-glass mt-9 p-5"
      >
        <div className="flex flex-col gap-4">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension} className="flex items-start gap-3">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-brand-violet to-brand-purple" />
              <div className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-ink-900">
                  {DIMENSION_LABELS[dimension]}
                </span>
                <span className="text-right text-[12px] leading-[1.6] text-ink-400">
                  {DIMENSION_DESC[dimension]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.32, ease: 'easeOut' }}
        className="mt-8 flex flex-col gap-3"
      >
        <Link
          to="/quiz"
          className="rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-6 py-4 text-center text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.75)] active:scale-[0.99]"
        >
          {done > 0 && !complete ? `继续检测（${done}/${TOTAL_QUESTIONS}）` : '开始检测'}
        </Link>

        {result && (
          <Link
            to="/result"
            className="rounded-capsule border border-white/80 bg-white/70 px-6 py-3.5 text-center text-[14px] font-semibold text-ink-700 backdrop-blur"
          >
            查看上次报告 · {result.identity}
          </Link>
        )}

        {complete && !result && (
          <p className="text-center text-[12px] text-ink-400">
            题目已答完，进入答题页点击提交即可生成报告
          </p>
        )}
      </motion.div>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        className="mt-auto pt-8 text-center text-[11.5px] leading-relaxed text-ink-400"
      >
        约 6 分钟 · 无标准答案 · 结果仅保存在本机
        <br />
        仅供娱乐与自我观察，不构成心理学诊断
      </motion.p>
    </div>
  );
}
