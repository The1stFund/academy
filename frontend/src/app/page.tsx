import CandlestickHero from '@/components/CandlestickHero'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>

      {/* NAV */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="#16db65" opacity="0.15"/>
            <polygon points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" fill="none" stroke="#16db65" strokeWidth="3"/>
            <polygon points="50,30 70,40 70,60 50,70 30,60 30,40" fill="#16db65"/>
          </svg>
          <span className="text-lg font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Kursy</Link>
          <Link href="#analysis" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Analizy</Link>
          <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Cennik</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-black px-4 py-2 transition-colors">
            Zaloguj się
          </Link>
          <Link href="/register" className="text-sm font-bold text-white px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
            Dołącz teraz
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <CandlestickHero />

      {/* STATS */}
      <section className="border-y py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Aktywnych studentów' },
            { value: '50h+', label: 'Materiałów wideo' },
            { value: '365', label: 'Analiz rocznie' },
            { value: '24/7', label: 'Dostęp do treści' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold" style={{ color: '#111' }}>{stat.value}</p>
              <p className="text-sm mt-1 font-medium" style={{ color: '#888' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Co oferujemy</span>
          <h2 className="text-4xl font-bold mt-4 mb-4" style={{ color: '#111' }}>Wszystko czego potrzebujesz</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Kompleksowa platforma dla traderów – od nauki po codzienną praktykę</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎓', title: 'Kursy tradingowe', desc: 'Kompleksowe kursy wideo od podstaw do zaawansowanych strategii. Ucz się we własnym tempie.' },
            { icon: '📊', title: 'Codzienne analizy', desc: 'Profesjonalne analizy rynku publikowane każdego dnia. Wideo + wykresy + komentarz eksperta.' },
            { icon: '📔', title: 'Dziennik transakcji', desc: 'Śledź swoje wyniki i analizuj błędy. Automatyczny import z MT4/MT5.' },
            { icon: '🏆', title: 'Leaderboard', desc: 'Rywalizuj z innymi traderami. Sprawdź kto osiąga najlepsze wyniki ROI.' },
            { icon: '💬', title: 'Społeczność Discord', desc: 'Ekskluzywna grupa traderów. Dyskusje, sygnały i wsparcie 24/7.' },
            { icon: '📚', title: 'Biblioteka ebooków', desc: 'Dziesiątki materiałów PDF do pobrania. Strategie i psychologia tradingu.' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border hover:border-gray-300 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-bold mb-2" style={{ color: '#111' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#888' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEADERBOARD PREVIEW */}
      <section id="analysis" className="py-24" style={{ background: '#f8f9fa' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Ranking</span>
            <h2 className="text-4xl font-bold mt-4 mb-4" style={{ color: '#111' }}>Top traderzy</h2>
            <p className="text-gray-500">Dołącz i rywalizuj z najlepszymi</p>
          </div>
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: '#111' }}>Leaderboard – Maj 2026</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Live</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ background: '#f8f9fa' }}>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">#</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">Trader</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-400">ROI</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-400">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: '🥇', name: 'T***r', roi: '+142%', wr: '78%', blur: false },
                  { rank: '🥈', name: 'M***k', roi: '+98%', wr: '71%', blur: false },
                  { rank: '🥉', name: 'A***a', roi: '+87%', wr: '69%', blur: false },
                  { rank: '4', name: '●●●', roi: '●●●', wr: '●●●', blur: true },
                  { rank: '5', name: '●●●', roi: '●●●', wr: '●●●', blur: true },
                ].map((t, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ filter: t.blur ? 'blur(4px)' : 'none' }}>
                    <td className="px-6 py-4 text-lg">{t.rank}</td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#111' }}>{t.name}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#16db65' }}>{t.roi}</td>
                    <td className="px-6 py-4 text-right text-sm" style={{ color: '#888' }}>{t.wr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 text-center border-t">
              <Link href="/register" className="text-sm font-bold" style={{ color: '#16db65' }}>
                Zaloguj się aby zobaczyć pełny ranking →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Cennik</span>
          <h2 className="text-4xl font-bold mt-4 mb-4" style={{ color: '#111' }}>Prosty cennik</h2>
          <p className="text-gray-500">Jeden plan – pełny dostęp do wszystkiego</p>
        </div>
        <div className="max-w-sm mx-auto">
          <div className="rounded-2xl border-2 p-8 text-center" style={{ borderColor: '#16db65' }}>
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 inline-block" style={{ color: '#16db65', background: '#f0fdf4' }}>Najpopularniejszy</span>
            <h3 className="text-2xl font-bold mt-2 mb-1" style={{ color: '#111' }}>The1st Academy</h3>
            <div className="my-6">
              <span className="text-5xl font-bold" style={{ color: '#111' }}>£49</span>
              <span className="text-gray-400 font-medium">/miesiąc</span>
            </div>
            <p className="text-sm text-gray-400 mb-8">lub £499/rok – oszczędzasz £89</p>
            <ul className="text-left space-y-3 mb-8">
              {['Wszystkie kursy tradingowe', 'Codzienne analizy rynku', 'Dziennik transakcji + MT4/MT5', 'Leaderboard traderów', 'Dostęp do Discord', 'Biblioteka ebooków'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#333' }}>
                  <span className="font-bold" style={{ color: '#16db65' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block w-full text-center text-white font-bold py-3.5 rounded-xl transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
              Zacznij teraz
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: '#111' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Gotowy żeby zacząć?</h2>
          <p className="mb-10 font-medium" style={{ color: '#888' }}>Dołącz do setek traderów którzy już rozwijają swoje umiejętności</p>
          <Link href="/register" className="inline-block font-bold py-4 px-10 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
            Dołącz do The1st Academy →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
              <polygon points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" fill="none" stroke="#16db65" strokeWidth="4"/>
              <polygon points="50,30 70,40 70,60 50,70 30,60 30,40" fill="#16db65"/>
            </svg>
            <span className="text-sm font-bold">THE 1ST ACADEMY</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 The1st Academy Ltd. Wszelkie prawa zastrzeżone.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-black">Polityka prywatności</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-black">Regulamin</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
