import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as echarts from 'echarts/core'
import { graphic } from 'echarts/core'
import type { ComposeOption } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { TimeSeriesPoint } from '../../utils/chartSeries'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer,
])

export type ChartRenderType = 'area' | 'line' | 'bar'

export interface TimeSeriesChartHandle {
  resetZoom: () => void
  resize: () => void
  setZoomSelect: (active: boolean) => void
}

interface TimeSeriesChartProps {
  points: TimeSeriesPoint[]
  color: string
  unit: string
  seriesName: string
  theme: 'light' | 'dark'
  chartType: ChartRenderType
  yMax?: number
  zoomSelect?: boolean
  onZoomSelectEnd?: () => void
}

type ECOption = ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
  | ToolboxComponentOption
>

const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '')
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const n = parseInt(normalized, 16)
  if (!Number.isFinite(n)) return `rgba(251, 191, 36, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const staticOption = (): ECOption => ({
  animation: false,
  toolbox: {
    show: true,
    top: -40,
    itemSize: 0,
    feature: {
      dataZoom: { yAxisIndex: 'none', filterMode: 'none' },
    },
  },
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: 0,
      filterMode: 'none',
      zoomOnMouseWheel: 'ctrl',
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      preventDefaultMouseMove: true,
    },
  ],
})

const buildSeriesOption = ({
  points,
  color,
  unit,
  seriesName,
  theme,
  chartType,
  yMax,
}: TimeSeriesChartProps): ECOption => {
  const isLight = theme === 'light'
  const axisColor = isLight ? '#6b7280' : '#9ca3af'
  const gridColor = isLight ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 191, 36, 0.12)'
  const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(17, 24, 39, 0.95)'
  const tooltipBorder = isLight ? 'rgba(251, 146, 60, 0.4)' : 'rgba(251, 191, 36, 0.3)'
  const tooltipTitle = isLight ? '#b45309' : '#fbbf24'
  const pointerColor = isLight ? 'rgba(245, 158, 11, 0.55)' : 'rgba(251, 191, 36, 0.5)'
  const data = points.map((p) => [p.t, p.v] as [number, number])

  const series: LineSeriesOption | BarSeriesOption =
    chartType === 'bar'
      ? {
          type: 'bar',
          name: seriesName,
          data,
          barMaxWidth: 8,
          itemStyle: { color, borderRadius: [2, 2, 0, 0], opacity: 0.85 },
          emphasis: { disabled: true },
        }
      : {
          type: 'line',
          name: seriesName,
          data,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 1.5, color },
          itemStyle: { color },
          areaStyle:
            chartType === 'area'
              ? { color: new graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: hexToRgba(color, 0.18) },
                  { offset: 1, color: hexToRgba(color, 0.02) },
                ]) }
              : undefined,
          emphasis: { disabled: true },
        }

  return {
    grid: { top: 12, right: 12, left: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      borderWidth: 1,
      borderColor: tooltipBorder,
      backgroundColor: tooltipBg,
      extraCssText: 'backdrop-filter:blur(8px);border-radius:8px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);',
      axisPointer: {
        type: 'cross',
        snap: true,
        lineStyle: { color: pointerColor, type: 'dashed', width: 1 },
        crossStyle: { color: pointerColor, type: 'dashed', width: 1 },
        label: {
          backgroundColor: isLight ? '#d97706' : '#fbbf24',
          color: isLight ? '#fff' : '#111827',
          fontSize: 11,
        },
      },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params
        if (!item || !Array.isArray(item.value)) return ''
        const [ts, value] = item.value as [number, number]
        const label = new Date(ts).toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        return `<div style="color:${tooltipTitle};font-size:12px;margin-bottom:4px">${label}</div>
          <div style="display:flex;align-items:center;gap:6px;color:${tooltipTitle};font-size:12px">
            <span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></span>
            ${seriesName}: ${value}${unit}
          </div>`
      },
    },
    xAxis: {
      type: 'time',
      boundaryGap: chartType === 'bar',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: axisColor, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax && yMax > 0 ? yMax : undefined,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: gridColor, type: 'dashed', width: 1 } },
      axisLabel: { color: axisColor, fontSize: 11 },
    },
    series: [series],
  }
}

const safeResize = (chart: ReturnType<typeof echarts.init>, el: HTMLElement) => {
  if (chart.isDisposed()) return
  const { width, height } = el.getBoundingClientRect()
  if (width < 1 || height < 1) return
  chart.resize()
}

export const TimeSeriesChart = forwardRef<TimeSeriesChartHandle, TimeSeriesChartProps>(
  function TimeSeriesChart(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)
    const onZoomSelectEndRef = useRef(props.onZoomSelectEnd)
    onZoomSelectEndRef.current = props.onZoomSelectEnd
    const { points, color, unit, seriesName, theme, chartType, yMax, zoomSelect } = props

    useImperativeHandle(ref, () => ({
      resetZoom: () => {
        chartRef.current?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
      },
      resize: () => {
        const el = containerRef.current
        const chart = chartRef.current
        if (!el || !chart) return
        safeResize(chart, el)
      },
      setZoomSelect: (active: boolean) => {
        chartRef.current?.dispatchAction({
          type: 'takeGlobalCursor',
          key: 'dataZoomSelect',
          dataZoomSelectActive: active,
        })
      },
    }))

    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      const chart = echarts.init(el, undefined, { renderer: 'canvas' })
      chartRef.current = chart
      chart.setOption(staticOption())
      chart.on('globalcursortaken', (params: { key?: string }) => {
        if (params?.key !== 'dataZoomSelect') {
          onZoomSelectEndRef.current?.()
        }
      })

      const observer = new ResizeObserver(() => safeResize(chart, el))
      observer.observe(el)

      return () => {
        observer.disconnect()
        chart.dispose()
        chartRef.current = null
      }
    }, [])

    useEffect(() => {
      const chart = chartRef.current
      if (!chart || chart.isDisposed()) return
      chart.setOption(
        buildSeriesOption({ points, color, unit, seriesName, theme, chartType, yMax }),
        { notMerge: false, replaceMerge: ['series'] }
      )
      if (zoomSelect) {
        chart.dispatchAction({
          type: 'takeGlobalCursor',
          key: 'dataZoomSelect',
          dataZoomSelectActive: true,
        })
      }
    }, [points, color, unit, seriesName, theme, chartType, yMax, zoomSelect])

    return (
      <div
        ref={containerRef}
        className="system-chart-canvas"
        data-testid="chart"
        role="img"
        aria-label={`${seriesName} chart`}
      />
    )
  }
)
