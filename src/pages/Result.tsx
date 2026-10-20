import type { CSSProperties, ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import RadarChart from '@/components/RadarChart';
import { AlertIcon, HeartIcon, QuoteIcon, UsersIcon } from '@/components/Icons';
import { QUIZ_MODES } from '@/data/questions';
import { useQuizStore } from '@/store/useQuizStore';

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  accent: string;
  delay: number;
  children: ReactNode;
  highlight?: boolean;
}

function InfoCard({ icon, title, accent, delay, children, highlight }: InfoCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="card-surface mt-4 p-5"
      style={highlight ? { border: `1px solid ${accent}33` } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center" style={{ color: accent }}>
          {icon}
        </span>
        <h2 className="text-[17px] font-bold tracking-wide text-ink-900">{title}</h2>
      </div>
      <div className="mt-3.5">{children}</div>
    </motion.section>
  );
}

export default function Result() {
  const result = useQuizStore((state) => state.result);
  const reset = useQuizStore((state) => state.reset);
  const navigate = useNavigate();

  if (!result) {
    return <Navigate to="/" replace />;
  }

  const theme = result.theme;
  const themeVars = {
    '--accent': theme.accent,
    '--accent-soft': theme.accentSoft,
    '--accent-deep': theme.accentDeep,
    '--title-color': theme.titleColor,
    '--badge-color': theme.badgeColor,
    '--badge-border': theme.badgeBorder,
    '--tag-text': theme.tagText,
    '--tag-bg': theme.tagBg,
    '--tag-border': theme.tagBorder,
  } as CSSProperties;

  const handleRestart = () => {
    reset();
    navigate('/quiz');
  };

  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-12 pt-7" style={themeVars}>
      {/* 个人信息卡 */}
      <motion.section
        initial={{ opacity: 0, y: 68, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 170, damping: 20, mass: 0.9 }}
        className="relative overflow-hidden rounded-card bg-gradient-to-br from-[#f7e6f3] to-[#f8dcc6] shadow-card"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${theme.heroImage})` }}
        />
        <div className="absolute inset-0" style={{ background: theme.overlay }} />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className="rounded-capsule border px-3.5 py-1 text-[13px] font-semibold tracking-[0.08em]"
              style={{
                borderColor: theme.badgeBorder,
                color: theme.badgeColor,
                background: 'rgba(255, 255, 255, 0.34)',
              }}
            >
              {result.identity}
            </span>

            <div className="text-right">
              <p className="text-[12px] font-medium tracking-wide text-ink-500">人群占比</p>
              <p
                className="mt-0.5 text-[30px] font-black leading-none tracking-tight"
                style={{ color: theme.titleColor }}
              >
                {result.populationRate}%
              </p>
            </div>
          </div>

          <h1
            className="mt-3.5 text-[27px] font-black leading-[1.25] tracking-wide"
            style={{ color: theme.titleColor }}
          >
            {result.title}
          </h1>

          <div className="mt-3.5 space-y-1.5 text-[13px]">
            <p className="flex gap-1.5">
              <span className="shrink-0 text-ink-500">检测题量：</span>
              <span className="font-semibold text-ink-700">
                {QUIZ_MODES.find((item) => item.key === result.mode)?.label ?? '详细'} ·{' '}
                {QUIZ_MODES.find((item) => item.key === result.mode)?.total ?? 100} 题
              </span>
            </p>
            <p className="flex gap-1.5">
              <span className="shrink-0 text-ink-500">信息素状态：</span>
              <span className="font-semibold text-ink-700">{result.pheromoneStatus}</span>
            </p>
            <p className="flex gap-1.5">
              <span className="shrink-0 text-ink-500">气质识别：</span>
              <span className="font-semibold text-ink-700">{result.temperament}</span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-x-2 gap-y-2">
            {result.tags.map((tag) => (
              <span key={tag} className="capsule-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* 五维检测卡 */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.18, ease: 'easeOut' }}
        className="card-surface mt-4 p-5"
      >
        <h2 className="section-title">五维检测</h2>

        <RadarChart
          indicators={result.radar}
          accent={theme.accent}
          accentSoft={theme.accentSoft}
          accentDeep={theme.accentDeep}
          className="mt-1 h-[310px] w-full"
        />

        <div className="mt-1 h-px w-full bg-black/[0.06]" />

        <ul className="mt-5 flex flex-col gap-[18px]">
          {result.dimensions.map((item, i) => (
            <li key={item.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-medium text-ink-700">{item.label}</span>
                <span className="text-[16px] font-bold" style={{ color: theme.accent }}>
                  {item.score}
                </span>
              </div>
              <div className="bar-track mt-2">
                <motion.div
                  className="h-full rounded-capsule"
                  style={{ background: theme.accent }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 0.9, delay: 0.35 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* 人格分析 */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card-surface mt-4 p-5"
      >
        <h2 className="section-title">人格分析</h2>
        <div className="mt-4 flex flex-col gap-4">
          {result.analysis.map((paragraph) => (
            <p key={paragraph.slice(0, 12)} className="text-[14.5px] leading-[1.95] text-ink-700">
              {paragraph}
            </p>
          ))}
        </div>
      </motion.section>

      <InfoCard
        icon={<HeartIcon className="h-5 w-5" />}
        title="关系模式"
        accent={theme.accent}
        delay={0}
      >
        <p className="text-[14.5px] leading-[1.95] text-ink-700">{result.relationship}</p>
      </InfoCard>

      <InfoCard
        icon={<AlertIcon className="h-5 w-5" />}
        title="危险提示"
        accent={theme.accent}
        delay={0.06}
      >
        <p className="text-[14.5px] leading-[1.95] text-ink-700">{result.danger}</p>
      </InfoCard>

      <InfoCard
        icon={<UsersIcon className="h-5 w-5" />}
        title="适配对象"
        accent={theme.accent}
        delay={0.12}
      >
        <p className="text-[14.5px] leading-[1.95] text-ink-700">{result.matchTarget}</p>
      </InfoCard>

      <InfoCard
        icon={<QuoteIcon className="h-5 w-5" />}
        title="分享短句"
        accent={theme.accent}
        delay={0.18}
        highlight
      >
        <p
          className="text-[15px] font-semibold italic leading-[1.95]"
          style={{ color: theme.accent }}
        >
          {result.shareSentence}
        </p>
      </InfoCard>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/me')}
          className="flex-1 rounded-capsule border border-white/80 bg-white/70 px-4 py-3.5 text-[14px] font-semibold text-ink-700 backdrop-blur"
        >
          个人中心
        </button>
        <button
          type="button"
          onClick={handleRestart}
          className="flex-1 rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-4 py-3.5 text-[14px] font-bold text-white"
        >
          重新测试
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-3 w-full rounded-capsule border border-white/80 bg-white/70 px-4 py-3 text-[13.5px] font-medium text-ink-500 backdrop-blur"
      >
        返回首页
      </button>
    </div>
  );
}
