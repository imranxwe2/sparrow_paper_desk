import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { generateCandles } from '../lib/mockMarket'

function calculateSMA(data: any[], period: number) {
  const smaData = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue
    let sum = 0
    for (let j = 0; j < period; j++) sum += data[i - j].close
    smaData.push({ time: data[i].time, value: sum / period })
  }
  return smaData
}

function calculateRSI(data: any[], period: number) {
  if (data.length <= period) return []
  const rsiData = []
  let gains = 0, losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period
      avgLoss = (avgLoss * (period - 1)) / period
    } else {
      avgGain = (avgGain * (period - 1)) / period
      avgLoss = (avgLoss * (period - 1) - diff) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs))
    rsiData.push({ time: data[i].time, value: rsi })
  }
  return rsiData
}

export function CandleChart({ symbol, currentTick }: { symbol: string; currentTick: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const smaRef = useRef<ISeriesApi<"Line"> | null>(null)
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null)

  const [showSMA, setShowSMA] = useState(false)
  const [showRSI, setShowRSI] = useState(false)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' } as any,
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#f4f4f5' },
        horzLines: { color: '#f4f4f5' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e4e4e7',
      },
      rightPriceScale: {
        borderColor: '#e4e4e7',
        autoScale: true,
      },
      leftPriceScale: {
        visible: showRSI,
        borderColor: '#e4e4e7',
      },
      crosshair: { mode: 1 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    })
    
    chartRef.current = chart

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    smaRef.current = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      visible: showSMA,
    })

    rsiRef.current = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      priceScaleId: 'left',
      crosshairMarkerVisible: false,
      visible: showRSI,
    })

    chart.priceScale('left').applyOptions({
      autoScale: false,
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol]) 

  useEffect(() => {
    if (smaRef.current) smaRef.current.applyOptions({ visible: showSMA })
    if (rsiRef.current) {
      rsiRef.current.applyOptions({ visible: showRSI })
      chartRef.current?.applyOptions({ leftPriceScale: { visible: showRSI } })
    }
  }, [showSMA, showRSI])

  useEffect(() => {
    if (!seriesRef.current) return

    const rawData = generateCandles(symbol, currentTick, 15, 120)
    const formattedData = rawData.map(d => ({ ...d, time: d.time as Time }))
    
    seriesRef.current.setData(formattedData)
    
    if (smaRef.current) {
      smaRef.current.setData(calculateSMA(formattedData, 10))
    }
    if (rsiRef.current) {
      rsiRef.current.setData(calculateRSI(formattedData, 14))
    }
  }, [symbol, currentTick])

  return (
    <div className="flex w-full h-full flex-col relative group">
      <div className="absolute top-2 left-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setShowSMA(!showSMA)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border shadow-sm transition ${showSMA ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-sparrow-200 text-sparrow-600 hover:border-sparrow-300'}`}
        >
          SMA (10)
        </button>
        <button 
          onClick={() => setShowRSI(!showRSI)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border shadow-sm transition ${showRSI ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-sparrow-200 text-sparrow-600 hover:border-sparrow-300'}`}
        >
          RSI (14)
        </button>
      </div>
      <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden relative">
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
