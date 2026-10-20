import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DIMENSIONS, DIMENSION_DESC, DIMENSION_LABELS, TOTAL_QUESTIONS } from '@/data/questions';
import { answeredCount } from '@/utils/calculateResult';
import { loadUser } from '@/utils/api';
import { useQuizStore } from '@/store/useQuizStore';
import { SparkIcon } from '@/components/Icons';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
};

const NAME_PATTERN = /^[\w\u4e00-\u9fa5-]{2,16}$/;

export default function Home() {
  const navigate = useNavigate();
  const username = useQuizStore((state) => state.username);
  const answers = useQuizStore((state) => state.answers);
  const history = useQuizStore((state) => state.history);
  const hydrate = useQuizStore((state) => state.hydrate);
  const reset = useQuizStore((state) => state.reset);
  const switchUser = useQuizStore((state) => state.switchUser);

  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const done = answeredCount(answers);
  const hasProgress = done > 0;

  const handleEnter = async () => {
    const name = nameInput.trim();
    if (!NAME_PATTERN.test(name)) {
      setError('用户名需 2-16 位，支持中英文、数字、下划线和短横线');
      return;
    }
    setError('');
    setLoading(true);
    const record = await loadUser(name);
    hydrate(record);
    setLoading(false);

    const answered = record.progress ? Object.keys(record.progress.answers).length : 0;
    if (answered > 0) navigate('/quiz');
    else if (record.history.length > 0) navigate('/me');
    else {
      reset();
      navigate('/quiz');
    }
  };

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
        {!username ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleEnter();
            }}
            className="flex flex-col gap-3"
          >
            <input
              value={nameInput}
              onChange={(event) => {
                setNameInput(event.target.value);
                if (error) setError('');
              }}
              placeholder="输入用户名"
              maxLength={16}
              className="w-full rounded-capsule border border-black/[0.08] bg-white/85 px-5 py-3.5 text-center text-[15px] text-ink-900 outline-none backdrop-blur transition-colors focus:border-brand-violet/60"
            />
            {error && <p className="text-center text-[12px] text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-6 py-4 text-center text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.75)] active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? '读取中…' : '开始检测'}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-capsule border border-white/80 bg-white/70 px-5 py-3 backdrop-blur">
              <span className="text-[13px] text-ink-500">
                当前用户 <span className="font-semibold text-ink-900">{username}</span>
              </span>
              <button
                type="button"
                onClick={switchUser}
                className="text-[12.5px] font-medium text-brand-violet"
              >
                切换
              </button>
            </div>

            <Link
              to="/quiz"
              className="rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-6 py-4 text-center text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.75)] active:scale-[0.99]"
            >
              {hasProgress ? `继续检测（${done}/${TOTAL_QUESTIONS}）` : '开始检测'}
            </Link>

            <Link
              to="/me"
              className="rounded-capsule border border-white/80 bg-white/70 px-6 py-3.5 text-center text-[14px] font-semibold text-ink-700 backdrop-blur"
            >
              个人中心{history.length > 0 ? ` · 已有 ${history.length} 次记录` : ''}
            </Link>
          </>
        )}
      </motion.div>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        className="mt-auto pt-8 text-center text-[11.5px] leading-relaxed text-ink-400"
      >
        约 6 分钟 · 无标准答案
        <br />
        仅供娱乐与自我观察，不构成心理学诊断
      </motion.p>
    </div>
  );
}
