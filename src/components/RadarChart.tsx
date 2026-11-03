interface RadarChartProps {
  /** 顶点顺序：支配感(上) → 情绪浓度(右) → 边界感(右下) → 吸引力(左下) → 稳定值(左) */
  indicators: { label: string; score: number }[];
  accent: string;
  accentSoft: string;
  accentDeep: string;
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 292;
const CENTER_X = 160;
const CENTER_Y = 146;
const RADIUS = 98;
const RINGS = [0.25, 0.5, 0.75, 1];

const pointAt = (index: number, total: number, ratio: number) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return {
    x: CENTER_X + Math.cos(angle) * RADIUS * ratio,
    y: CENTER_Y + Math.sin(angle) * RADIUS * ratio,
  };
};

/**
 * 轻量 SVG 雷达图：替代 ECharts，首屏不再加载图表库。
 */
export default function RadarChart({
  indicators,
  accent,
  accentSoft,
  accentDeep,
  className,
}: RadarChartProps) {
  const total = indicators.length;
  if (total === 0) return null;

  const ringPoints = (ratio: number) =>
    indicators.map((_, index) => {
      const { x, y } = pointAt(index, total, ratio);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

  const scorePoints = indicators.map((item, index) => {
    const { x, y } = pointAt(index, total, Math.max(0, Math.min(100, item.score)) / 100);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="五维得分雷达图"
    >
      {RINGS.map((ratio) => (
        <polygon
          key={ratio}
          points={ringPoints(ratio).join(' ')}
          fill="none"
          stroke="rgba(120, 110, 130, 0.16)"
          strokeWidth={1}
        />
      ))}

      {indicators.map((item, index) => {
        const { x, y } = pointAt(index, total, 1);
        return (
          <line
            key={`axis-${item.label}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={x}
            y2={y}
            stroke="rgba(120, 110, 130, 0.18)"
            strokeWidth={1}
          />
        );
      })}

      <polygon points={scorePoints.join(' ')} fill={accentSoft} stroke={accent} strokeWidth={2.5} />

      {indicators.map((item, index) => {
        const { x, y } = pointAt(index, total, Math.max(0, Math.min(100, item.score)) / 100);
        return (
          <circle
            key={`dot-${item.label}`}
            cx={x}
            cy={y}
            r={4}
            fill={accent}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        );
      })}

      {indicators.map((item, index) => {
        const { x, y } = pointAt(index, total, 1);
        const labelX = x + (x < CENTER_X - 4 ? -12 : x > CENTER_X + 4 ? 12 : 0);
        const labelY = y + (y > CENTER_Y + 4 ? 18 : y < CENTER_Y - 4 ? -10 : 6);
        const anchor = x < CENTER_X - 4 ? 'end' : x > CENTER_X + 4 ? 'start' : 'middle';
        const scoreY = labelY + (y < CENTER_Y - 4 ? -15 : 15);

        return (
          <g key={`label-${item.label}`} textAnchor={anchor}>
            <text x={labelX} y={labelY} fill="#6b6272" fontSize={12.5} fontWeight={500}>
              {item.label}
            </text>
            <text x={labelX} y={scoreY} fill={accentDeep} fontSize={13} fontWeight={700}>
              {item.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}