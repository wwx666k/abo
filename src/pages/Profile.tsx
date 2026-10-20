import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MAX_HISTORY } from '@/utils/api';
import { useQuizStore } from '@/store/useQuizStore';
import { answeredCount } from '@/utils/calculateResult';
import { QUIZ_MODES } from '@/data/questions';

const modeLabel = (key?: string) => QUIZ_MODES.find((item) => item.key === key)?.label ?? '详细';

function formatTime(ts: number) {
  const date = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function Profile() {
  const navigate = useNavigate();
  const username = useQuizStore((state) => state.username);
  const mode = useQuizStore((state) => state.mode);
  const answers = useQuizStore((state) => state.answers);
  const history = useQuizStore((state) => state.history);
  const viewResult = useQuizStore((state) => state.viewResult);
  const reset = useQuizStore((state) => state.reset);
  const switchUser = useQuizStore((state) => state.switchUser);

  const done = answeredCount(answers, mode);
  const modeConfig = QUIZ_MODES.find((item) => item.key === mode) ?? QUIZ_MODES[2];

  if (!username) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-12 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black tracking-wide text-ink-900">个人中心</h1>
        <button
          type="button"
          onClick={() => {
            switchUser();
            navigate('/');
          }}
          className="rounded-capsule border border-white/80 bg-white/70 px-4 py-2 text-[12.5px] font-medium text-ink-700 backdrop-blur"
        >
          切换用户
        </button>
      </div>

      <div className="card-glass mt-5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-500">用户名</span>
          <span className="text-[15px] font-bold text-ink-900">{username}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-ink-500">已完成测试</span>
          <span className="text-[15px] font-bold text-brand-violet">{history.length} 次</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-ink-500">当前题量</span>
          <span className="text-[15px] font-bold text-ink-900">
            {modeConfig.label} · {modeConfig.total} 题
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-ink-500">当前进度</span>
          <span className="text-[15px] font-bold text-ink-900">
            {done} / {modeConfig.total}
          </span>
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
          测试记录最多保留 {MAX_HISTORY} 次，超出后会自动移除最早的一次。
        </p>

        <div className="mt-4 flex gap-3">
          {done > 0 && (
            <button
              type="button"
              onClick={() => navigate('/quiz')}
              className="flex-1 rounded-capsule border border-black/[0.08] bg-white px-4 py-3 text-[13.5px] font-semibold text-ink-700"
            >
              继续答题
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              reset();
              navigate('/quiz');
            }}
            className="flex-1 rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-4 py-3 text-[13.5px] font-bold text-white"
          >
            重新测试
          </button>
        </div>
      </div>

      <h2 className="section-title mt-7">历史报告</h2>

      {history.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-400">还没有测试记录，先去做一次检测吧。</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {history.map((entry, index) => (
            <motion.button
              key={entry.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
              onClick={() => {
                viewResult(entry);
                navigate('/result');
              }}
              className="card-surface flex w-full items-center gap-4 p-4 text-left"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-black"
                style={{
                  background: entry.result.theme.accentSoft,
                  color: entry.result.theme.accentDeep,
                }}
              >
                {entry.result.identity.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14.5px] font-bold text-ink-900">
                  {entry.result.title}
                </span>
                <span className="mt-0.5 text-[11.5px] text-ink-400">
                  {modeLabel(entry.result.mode)} · {formatTime(entry.at)} · 人群占比{' '}
                  {entry.result.populationRate}%
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-medium text-brand-violet">查看</span>
            </motion.button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-7 w-full rounded-capsule border border-white/80 bg-white/70 px-6 py-3.5 text-[14px] font-semibold text-ink-700 backdrop-blur"
      >
        返回首页
      </button>
    </div>
  );
}
