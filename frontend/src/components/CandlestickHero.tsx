'use client'

import { useEffect, useRef } from 'react'

interface Candle {
  open: number
  close: number
  high: number
  low: number
  x: number
}

export default function CandlestickHero() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, hovering: false })
  const animRef = useRef({ x: 0, y: 0, angle: 0 })
  const candlesRef = useRef<Candle[]>([])

  useEffect(() => {
    const chart = chartRef.current
    const mask = maskRef.current
    const hero = heroRef.current
    if (!chart || !mask || !hero) return

    const ctx = chart.getContext('2d') as CanvasRenderingContext2D
    const mctx = mask.getContext('2d') as CanvasRenderingContext2D

    function generateCandles(n: number, w: number, h: number) {
      const candles: Candle[] = []
      const cw = Math.floor(w / (n + 2))
      let price = 1800 + Math.random() * 200
      for (let i = 0; i < n; i++) {
        const open = price
        const change = (Math.random() - 0.47) * 40
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 20
        const low = Math.min(open, close) - Math.random() * 20
        price = close
        candles.push({ open, close, high, low, x: cw * (i + 1) + cw / 2 })
      }
      candlesRef.current = candles
    }

    function drawChart(w: number, h: number) {
      const candles = candlesRef.current
      if (candles.length === 0) return
      const prices = candles.flatMap(c => [c.high, c.low])
      const minP = Math.min(...prices)
      const maxP = Math.max(...prices)
      const range = maxP - minP
      const pad = 40
      const scaleY = (p: number) => pad + (1 - (p - minP) / range) * (h - pad * 2)
      ctx.clearRect(0, 0, w, h)
      const cw = Math.floor(w / (candles.length + 2))
      const bodyW = Math.max(4, cw * 0.55)
      candles.forEach(c => {
        const bull = c.close >= c.open
        const color = bull ? '#16db65' : '#ef4444'
        const oY = scaleY(c.open)
        const cY = scaleY(c.close)
        const hY = scaleY(c.high)
        const lY = scaleY(c.low)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(c.x, hY)
        ctx.lineTo(c.x, lY)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.fillRect(c.x - bodyW / 2, Math.min(oY, cY), bodyW, Math.max(2, Math.abs(oY - cY)))
      })
      ctx.strokeStyle = 'rgba(0,0,0,0.04)'
      ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(0, (h / 5) * i)
        ctx.lineTo(w, (h / 5) * i)
        ctx.stroke()
      }
    }

    function drawMask(mx: number, my: number, w: number, h: number) {
      mctx.clearRect(0, 0, w, h)
      mctx.fillStyle = '#ffffff'
      mctx.fillRect(0, 0, w, h)
      mctx.save()
      mctx.globalCompositeOperation = 'destination-out'
      const grad = mctx.createRadialGradient(mx, my, 0, mx, my, 160)
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(0.65, 'rgba(0,0,0,0.9)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      mctx.fillStyle = grad
      mctx.beginPath()
      mctx.arc(mx, my, 160, 0, Math.PI * 2)
      mctx.fill()
      mctx.restore()
    }

    function resize() {
      const w = hero!.offsetWidth
      const h = hero!.offsetHeight
      chart!.width = mask!.width = w
      chart!.height = mask!.height = h
      generateCandles(Math.floor(w / 18), w, h)
      drawChart(w, h)
    }

    let rafId: number

    function animate() {
      const w = hero!.offsetWidth
      const h = hero!.offsetHeight
      const anim = animRef.current
      const mouse = mouseRef.current
      if (mouse.hovering) {
        anim.x += (mouse.x - anim.x) * 0.12
        anim.y += (mouse.y - anim.y) * 0.12
      } else {
        anim.angle += 0.008
        anim.x += (w / 2 + Math.cos(anim.angle) * w * 0.32 - anim.x) * 0.05
        anim.y += (h / 2 + Math.sin(anim.angle * 0.7) * h * 0.28 - anim.y) * 0.05
      }
      drawMask(anim.x, anim.y, w, h)
      rafId = requestAnimationFrame(animate)
    }

    function onMouseMove(e: MouseEvent) {
      const rect = hero!.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    hero!.addEventListener('mousemove', onMouseMove)
    hero!.addEventListener('mouseenter', () => { mouseRef.current.hovering = true })
    hero!.addEventListener('mouseleave', () => { mouseRef.current.hovering = false })
    window.addEventListener('resize', resize)

    resize()
    animRef.current = { x: hero!.offsetWidth / 2, y: hero!.offsetHeight / 2, angle: 0 }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      ref={heroRef}
      className="relative w-full overflow-hidden cursor-crosshair"
      style={{ height: '92vh', minHeight: '600px' }}
    >
      <canvas ref={chartRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={maskRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none text-center px-6">

        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight mb-5 tracking-tight"
          style={{ color: '#111', fontFamily: 'Montserrat, sans-serif' }}
        >
          Naucz sie tradowac na poziomie profesjonalnym
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Kursy wideo, codzienne analizy rynku, dziennik transakcji i spolecznosc traderow.
        </p>
        <div className="flex gap-4 pointer-events-auto">
          <a href="/register" className="px-8 py-3.5 rounded-lg font-bold text-white text-sm" style={{ background: '#16db65' }}>
            Dolacz teraz
          </a>
          <a href="#features" className="px-8 py-3.5 rounded-lg font-semibold text-sm border hover:bg-gray-50" style={{ color: '#111', borderColor: '#ddd' }}>
            Zobacz kursy
          </a>
        </div>
      </div>
    </div>
  )
}
