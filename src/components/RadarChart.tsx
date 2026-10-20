import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { RadarChart as RadarSeries } from 'echarts/charts';
import { RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([RadarSeries, RadarComponent, CanvasRenderer]);

interface RadarChartProps {
  /** 顶点顺序：支配感(上) → 情绪浓度(右) → 边界感(右下) → 吸引力(左下) → 稳定值(左) */
  indicators: { label: string; score: number }[];
  accent: string;
  accentSoft: string;
  accentDeep: string;
  className?: string;
}

export default function RadarChart({
  indicators,
  accent,
  accentSoft,
  accentDeep,
  className,
}: RadarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  const option = useMemo<EChartsCoreOption>(
    () => ({
      animationDuration: 900,
      animationEasing: 'cubicOut',
      radar: {
        center: ['50%', '54%'],
        radius: '62%',
        splitNumber: 4,
        indicator: indicators.map((item) => ({ name: item.label, max: 100 })),
        axisName: {
          color: '#6b6272',
          fontSize: 13,
          fontWeight: 500,
        },
        axisLine: { lineStyle: { color: 'rgba(120, 110, 130, 0.18)' } },
        splitLine: { lineStyle: { color: 'rgba(120, 110, 130, 0.16)' } },
        splitArea: { show: false },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color: accent },
          itemStyle: { color: accent, borderColor: '#ffffff', borderWidth: 1.5 },
          areaStyle: { color: accentSoft },
          emphasis: { lineStyle: { width: 3 } },
          label: {
            show: true,
            color: accentDeep,
            fontSize: 13,
            fontWeight: 'bold',
          },
          data: [{ value: indicators.map((item) => item.score) }],
        },
      ],
    }),
    [indicators, accent, accentSoft, accentDeep],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={containerRef} className={className} />;
}
