import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DIMENSIONS, DIMENSION_DESC, DIMENSION_LABELS } from '@/data/dimensions';
import { DEFAULT_MODE, PAPER_VERSION, QUIZ_MODES } from '@/data/modes';
import type { QuizMode } from '@/types';
import { countAnswered } from '@/utils/answers';
import { loadUser } from '@/utils/api';
import { useQuizStore } from '@/store/useQuizStore';
import { SparkIcon } from '@/components/Icons';

const NAME_PATTERN = /^[\w\u4e00-\u9fa5-]{2,16}$/;

export default function Home() {
  const navigate = useNavigate();
  const username = useQuizStore((state) => state.username);
  const mode = useQuizStore((state) => state.mode);
  const answers = useQuizStore((state) => state.answers);
  const history = useQuizStore((state) => state.history);
  const setMode = useQuizStore((state) => state.setMode);
  const hydrate = useQuizStore((state) => state.hydrate);
  const reset = useQuizStore((state) => state.reset);
  const switchUser = useQuizStore((state) => state.switchUser);

  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const modeConfig = QUIZ_MODES.find((item) => item.key === mode) ?? QUIZ_MODES[2];
  const done = countAnswered(answers, modeConfig.total);
  const hasProgress = done > 0;

  const handleMode = (next: QuizMode) => {
    if (next === mode) return;
    if (hasProgress && !window.confirm('切换题量会清空当前答题进度，确定切换吗？')) return;
    setMode(next);
  };

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

    const recordMode = record.mode ?? DEFAULT_MODE;
    const recordConfig = QUIZ_MODES.find((item) => item.key === recordMode) ?? QUIZ_MODES[2];
    const validProgress = record.paperVersion === PAPER_VERSION ? record.progress : null;
    const answered = validProgress ? countAnswered(validProgress.answers, recordConfig.total) : 0;
    if (answered > 0) navigate('/quiz');
    else if (record.history.length > 0) navigate('/me');
    else {
      reset();
      navigate('/quiz');
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[500px] flex-col px-5 pb-10 pt-12">
      <div className="fade-up flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-capsule border border-brand-purple/25 bg-white/60 px-3.5 py-1.5 text-[12px] font-semibold tracking-widest text-brand-violet backdrop-blur">
          <SparkIcon className="h-3.5 w-3.5" />
          信息素档案 · 自选题量
        </span>
      </div>

      <h1
        className="fade-up mt-5 text-center text-[30px] font-black leading-[1.32] tracking-wide text-ink-900"
        style={{ animationDelay: '80ms' }}
      >
        ABO性别身份
        <br />
        与信息素检测
      </h1>

      <p
        className="fade-up mt-3.5 text-center text-[13.5px] leading-[1.9] text-ink-500"
        style={{ animationDelay: '160ms' }}
      >
        选择题量，解析你的
        <br />
        支配感 · 情绪浓度 · 边界感 · 吸引力 · 稳定值
      </p>

      <div className="fade-up mt-6" style={{ animationDelay: '240ms' }}>
        <p className="mb-2.5 text-center text-[12px] font-medium tracking-wide text-ink-400">
          题量
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {QUIZ_MODES.map((item) => {
            const active = item.key === mode;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleMode(item.key)}
                className={`rounded-2xl border px-2 py-3 text-center transition-colors duration-200 ${
                  active
                    ? 'border-brand-violet/55 bg-brand-violet/[0.09] shadow-option'
                    : 'border-black/[0.07] bg-white/80 hover:border-brand-violet/30'
                }`}
              >
                <span
                  className={`block text-[14.5px] font-bold ${
                    active ? 'text-brand-violet' : 'text-ink-700'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`mt-0.5 block text-[12px] ${
                    active ? 'text-brand-violet/80' : 'text-ink-400'
                  }`}
                >
                  {item.total} 题 · 约 {item.minutes} 分钟
                </span>
              </button>
            );
          })}
        </div>
        {hasProgress && (
          <p className="mt-2 text-center text-[11.5px] text-ink-400">
            切换题量会清空当前进度
          </p>
        )}
      </div>

      <div className="fade-up card-glass mt-5 p-4" style={{ animationDelay: '300ms' }}>
        <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension} className="flex items-start gap-3">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-brand-violet to-brand-purple" />
              <div className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-ink-900">
                  {DIMENSION_LABELS[dimension]}
                </span>
                <span className="text-right text-[11.5px] leading-[1.6] text-ink-400">
                  {DIMENSION_DESC[dimension]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up mt-6 flex flex-col gap-3" style={{ animationDelay: '360ms' }}>
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
              {loading ? '读取中…' : `开始检测 · ${modeConfig.total} 题`}
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
              {hasProgress
                ? `继续检测（${done}/${modeConfig.total}）`
                : `开始检测 · ${modeConfig.total} 题`}
            </Link>

            <Link
              to="/me"
              className="rounded-capsule border border-white/80 bg-white/70 px-6 py-3.5 text-center text-[14px] font-semibold text-ink-700 backdrop-blur"
            >
              个人中心{history.length > 0 ? ` · 已有 ${history.length} 次记录` : ''}
            </Link>
          </>
        )}
      </div>

      <p
        className="fade-up mt-auto pt-7 text-center text-[11.5px] leading-relaxed text-ink-400"
        style={{ animationDelay: '440ms' }}
      >
        无标准答案
        <br />
        仅供娱乐与自我观察，不构成心理学诊断
      </p>
    </div>
  );
}
