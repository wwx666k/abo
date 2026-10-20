import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const STEPS = ['正在解析信息素基因...', '正在匹配灵魂标签...', '正在生成信息素档案...'];
const STEP_MS = 1000;
const TOTAL_MS = STEP_MS * STEPS.length;

interface LoadingOverlayProps {
  visible: boolean;
  onDone: () => void;
}

export default function LoadingOverlay({ visible, onDone }: LoadingOverlayProps) {
  const [step, setStep] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    const timers = STEPS.map((_, i) => window.setTimeout(() => setStep(i), i * STEP_MS));
    const finish = window.setTimeout(() => onDoneRef.current(), TOTAL_MS);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(finish);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
      style={{
        background:
          'radial-gradient(circle at 50% 36%, #3d1e63 0%, #1b1030 55%, #100a1c 100%)',
      }}
    >
      {/* 旋转光环 */}
      <div className="relative flex h-[128px] w-[128px] items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(168,85,247,0) 0%, #a855f7 45%, #f0abfc 70%, rgba(240,171,252,0) 100%)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-[14px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.42) 0%, rgba(168,85,247,0) 70%)',
          }}
          animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="h-3 w-3 rounded-full bg-[#f0abfc]"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 22px 4px rgba(240,171,252,0.55)' }}
        />
      </div>

      {/* 依次渐变显示的文字 */}
      <div className="mt-10 flex w-full max-w-[320px] flex-col items-center gap-3">
        {STEPS.map((text, i) => (
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: i === step ? 1 : i < step ? 0.32 : 0,
              y: 0,
              scale: i === step ? 1 : 0.98,
            }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`text-center text-[15px] tracking-wide ${
              i === step ? 'text-gradient font-semibold' : 'text-white/70'
            }`}
          >
            {text}
          </motion.p>
        ))}
      </div>

      {/* 进度线 */}
      <div className="mt-8 h-[2px] w-[180px] overflow-hidden rounded-capsule bg-white/12">
        <motion.div
          className="h-full rounded-capsule"
          style={{ background: 'linear-gradient(90deg, #a855f7 0%, #f0abfc 100%)' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: TOTAL_MS / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
