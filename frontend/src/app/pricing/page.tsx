import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faGraduationCap, faChartLine, faTrophy, faComments, faBook, faChevronLeft } from '@fortawesome/free-solid-svg-icons'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>

      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/the1stacademy_Logo_sygnet.svg" alt="Logo" style={{ width: '36px', height: '36px' }} />
          <span className="font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-black px-4 py-2">Zaloguj się</Link>
          <Link href="/register" className="text-sm font-bold text-white px-5 py-2.5 rounded-xl" style={{ background: '#16db65' }}>Dołącz teraz</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-8" style={{ color: '#888' }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: '11px' }} />
            Wróć do strony głównej
          </Link>
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#111' }}>Prosty i przejrzysty cennik</h1>
          <p className="text-lg" style={{ color: '#888' }}>Jeden plan – pełny dostęp do wszystkich funkcji platformy</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl p-8 border-2" style={{ borderColor: '#16db65' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Miesięczny</span>
                <h2 className="text-xl font-bold mt-3" style={{ color: '#111' }}>The1st Academy</h2>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold" style={{ color: '#111' }}>$100</span>
              <span className="text-lg font-medium" style={{ color: '#888' }}>/miesiąc</span>
            </div>
            <Link href="/checkout?plan=monthly" className="block w-full text-center text-white font-bold py-3.5 rounded-xl mb-6 transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
              Zacznij teraz
            </Link>
            <ul className="space-y-3">
              {[
                { icon: faGraduationCap, text: 'Wszystkie kursy tradingowe' },
                { icon: faChartLine, text: 'Codzienne analizy rynku' },
                { icon: faTrophy, text: 'Leaderboard traderów' },
                { icon: faComments, text: 'Dostęp do Discord' },
                { icon: faBook, text: 'Biblioteka ebooków' },
              ].map(f => (
                <li key={f.text} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#333' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#16db65', fontSize: '11px' }} />
                  </div>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-8 border-2" style={{ borderColor: '#111', background: '#111' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: 'rgba(22,219,101,0.15)' }}>Roczny – Oszczędzasz $89</span>
                <h2 className="text-xl font-bold mt-3 text-white">The1st Academy</h2>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-white">$1009</span>
              <span className="text-lg font-medium" style={{ color: '#666' }}>/rok</span>
            </div>
            <p className="text-sm mb-6" style={{ color: '#555' }}>$41.58/msc • Oszczędzasz $89 rocznie</p>
            <Link href="/checkout?plan=annual" className="block w-full text-center font-bold py-3.5 rounded-xl mb-6 transition-opacity hover:opacity-90" style={{ background: '#16db65', color: 'white' }}>
              Zacznij teraz
            </Link>
            <ul className="space-y-3">
              {[
                'Wszystkie kursy tradingowe',
                'Codzienne analizy rynku',
                'Leaderboard traderów',
                'Dostęp do Discord',
                'Biblioteka ebooków',
              ].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#aaa' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,219,101,0.15)' }}>
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#16db65', fontSize: '11px' }} />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#111' }}>Często zadawane pytania</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: 'Czy mogę anulować subskrypcję?', a: 'Tak, możesz anulować w dowolnym momencie. Dostęp trwa do końca opłaconego okresu.' },
              { q: 'Jak wygląda płatność?', a: 'Płatność odbywa się przez Stripe. Akceptujemy karty Visa, Mastercard i American Express.' },
              { q: 'Czy jest dostęp do wszystkich materiałów?', a: 'Tak – subskrypcja daje pełny dostęp do wszystkich kursów, analiz i funkcji platformy.' },
              { q: 'Czy mogę polecać znajomym?', a: 'Tak! Nasz program afiliacyjny pozwala zarabiać 25% prowizji od każdej poleconej subskrypcji.' },
            ].map(faq => (
              <div key={faq.q}>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: '#111' }}>{faq.q}</h3>
                <p className="text-sm" style={{ color: '#888' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/the1stacademy_Logo_sygnet.svg" alt="Logo" style={{ width: '24px', height: '24px' }} />
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
