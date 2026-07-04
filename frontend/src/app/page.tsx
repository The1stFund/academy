import CandlestickHero from '@/components/CandlestickHero'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faBolt, faUsers, faArrowRight } from '@fortawesome/free-solid-svg-icons'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>

      {/* NAV */}
      <nav className="border-b px-4 md:px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/the1stacademy_Logo_sygnet.svg" alt="The1st Academy" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <span className="text-base md:text-lg font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#problem" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Strategia</a>
          <a href="#hand-trader" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Hand Trader</a>
          <a href="#spolecznosc" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Społeczność</a>
          <a href="#cennik" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Cennik</a>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/login" className="text-xs md:text-sm font-semibold text-gray-700 hover:text-black px-3 md:px-4 py-2 transition-colors">
            Zaloguj się
          </Link>
          <Link href="/checkout?plan=monthly" className="text-xs md:text-sm font-bold text-white px-4 md:px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap" style={{ background: '#16db65' }}>
            Dołącz teraz
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <CandlestickHero />

      {/* PROBLEM */}
      <section id="problem" className="py-16 md:py-24 border-y" style={{ background: '#f8f9fa' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Dlaczego większość przegrywa</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4" style={{ color: '#111' }}>Nie dlatego, że nie potrafią analizować wykresów.</h2>
          <p className="text-base md:text-lg mb-10 md:mb-12" style={{ color: '#555' }}>
            Problemem najczęściej nie jest wiedza.<br />
            Problemem jest brak prostego systemu, którego można konsekwentnie przestrzegać.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
            {[
              'Uczą się zbyt skomplikowanych strategii',
              'Otwierają zbyt wiele pozycji jednocześnie',
              'Zamykają zysk zbyt wcześnie',
              'Pozwalają rosnąć stratom',
              'Podejmują decyzje pod wpływem emocji',
              'Nie mają planu na każdą sytuację',
            ].map(item => (
              <div key={item} className="flex items-start gap-3 bg-white rounded-xl p-4 border">
                <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: '#f87171' }}>✕</span>
                <span className="text-sm font-medium" style={{ color: '#444' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE1ST METHOD */}
      <section className="py-16 md:py-24 max-w-5xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Nasza odpowiedź</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4" style={{ color: '#111' }}>THE1ST Method</h2>
            <p className="text-base md:text-lg mb-4" style={{ color: '#555' }}>
              Nasza metodologia została zaprojektowana z jednym celem: maksymalnie uprościć proces podejmowania decyzji.
            </p>
            <p className="text-sm md:text-base mb-8" style={{ color: '#777' }}>
              Nie uczymy kilkunastu strategii. Nie pokazujemy setek wskaźników. Uczymy jednej, sprawdzonej metodologii, którą możesz stosować każdego dnia.
            </p>
            <div className="space-y-3">
              {['Jedna prosta metodologia', 'Mniej zmiennych = większa powtarzalność', 'Powtarzalność = fundament profesjonalnego tradingu'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <span className="font-bold flex-shrink-0" style={{ color: '#16db65' }}>✓</span>
                  <span className="text-sm font-semibold" style={{ color: '#333' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-6 md:p-8" style={{ background: '#111' }}>
            <p className="text-xl md:text-2xl font-bold text-white italic leading-relaxed">
              "Im mniej zmiennych.<br />
              Tym większa powtarzalność.<br />
              A powtarzalność jest fundamentem profesjonalnego tradingu."
            </p>
            <p className="mt-6 text-sm font-bold" style={{ color: '#16db65' }}>— THE1ST Method</p>
          </div>
        </div>
      </section>

      {/* HAND TRADER */}
      <section id="hand-trader" className="py-16 md:py-24" style={{ background: '#f8f9fa' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border-2 p-6 md:p-8" style={{ borderColor: '#16db65', background: 'white' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16db65' }}>
                    <FontAwesomeIcon icon={faBolt} style={{ color: '#111', fontSize: '14px' }} />
                  </div>
                  <span className="font-bold text-base md:text-lg" style={{ color: '#111' }}>Hand Trader</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full ml-auto whitespace-nowrap" style={{ color: '#16db65', background: '#f0fdf4' }}>Autorskie narzędzie</span>
                </div>
                <div className="space-y-3">
                  {[
                    'Zarządzanie pozycją zgodnie z planem',
                    'Ograniczenie impulsywnych decyzji',
                    'Automatyczny Stop Loss i Take Profit',
                    'Częściowe zamykanie pozycji',
                    'Blokada po przekroczeniu limitu ryzyka',
                    'Wsparcie parametrów kont fundowanych',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="font-bold flex-shrink-0 text-sm" style={{ color: '#16db65' }}>✓</span>
                      <span className="text-sm font-medium" style={{ color: '#333' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Nasza technologia</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4" style={{ color: '#111' }}>Twoja największa przewaga nie polega na lepszym wejściu.</h2>
              <p className="text-base md:text-lg mb-4" style={{ color: '#555' }}>Polega na lepszym wyjściu.</p>
              <p className="text-sm md:text-base mb-6" style={{ color: '#777' }}>
                To właśnie przy zarządzaniu otwartą pozycją emocje kosztują najwięcej. Kiedy zamknąć stratę? Kiedy realizować zysk? Czy trzymać pozycję?
              </p>
              <p className="text-sm md:text-base mb-6" style={{ color: '#777' }}>
                Dlatego stworzyliśmy <strong style={{ color: '#111' }}>Hand Trader</strong> — narzędzie, które pomaga realizować Twój plan zgodnie z wcześniej określonymi założeniami. Trader nadal podejmuje decyzje. Hand Trader pomaga je egzekwować.
              </p>
              <div className="rounded-xl p-4 border-l-4" style={{ background: 'white', borderColor: '#16db65' }}>
                <p className="text-sm font-medium" style={{ color: '#555' }}>
                  Hand Trader działa jako Expert Advisor na platformach MT4/MT5 i jest dostępny wyłącznie dla aktywnych subskrybentów.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROP FIRMS */}
      <section className="py-16 md:py-20 max-w-4xl mx-auto px-4 md:px-6 text-center">
        <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Konta fundowane</span>
        <h2 className="text-2xl md:text-3xl font-bold mt-6 mb-4" style={{ color: '#111' }}>Droga do kont fundowanych</h2>
        <p className="text-base md:text-lg mb-4" style={{ color: '#555' }}>
          Jednym z celów wielu naszych kursantów jest uzyskanie dostępu do kapitału firm prop tradingowych.
        </p>
        <p className="text-sm md:text-base" style={{ color: '#777' }}>
          Hand Trader pomaga utrzymywać dyscyplinę zgodnie z ustalonymi limitami ryzyka i zasadami zarządzania kapitałem — co ułatwia przygotowanie do wyzwań na kontach fundowanych.
        </p>
      </section>

      {/* SPOLECZNOSC */}
      <section id="spolecznosc" className="py-16 md:py-24 border-y" style={{ background: '#111' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: 'rgba(22,219,101,0.1)' }}>Nie uczysz się sam</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4 text-white">Rozwijasz się razem z ludźmi,<br className="hidden md:block" /> którzy mają ten sam cel.</h2>
            <p className="text-base md:text-lg" style={{ color: '#888' }}>Trading potrafi być samotny. Dlatego budujemy społeczność, która rośnie razem.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: faChartLine, title: 'Codzienne analizy', desc: 'Profesjonalne analizy rynku publikowane każdego dnia. Wideo + komentarz trenera.' },
              { icon: faUsers, title: 'Społeczność traderów', desc: 'Ekskluzywna grupa na Discordzie. Wymiana doświadczeń, wsparcie i dyskusje.' },
              { icon: faGraduationCap, title: 'Stały rozwój', desc: 'Sesje edukacyjne, aktualizacje materiałów i wsparcie trenera na każdym etapie.' },
            ].map(item => (
              <div key={item.title} className="rounded-2xl p-5 md:p-6" style={{ background: '#1a1a1a' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(22,219,101,0.1)' }}>
                  <FontAwesomeIcon icon={item.icon} style={{ color: '#16db65', fontSize: '16px' }} />
                </div>
                <h3 className="font-bold text-base mb-2 text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#888' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CO OTRZYMUJESZ */}
      <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Pełna oferta</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4" style={{ color: '#111' }}>Co otrzymujesz?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Autorską metodologię THE1ST Method',
            'Prosty system podejmowania decyzji',
            'Hand Trader (EA na MT4/MT5)',
            'Zarządzanie pozycją i ryzykiem',
            'Przygotowanie do kont fundowanych',
            'Społeczność traderów na Discordzie',
            'Codzienne analizy rynku',
            'Aktualizacje materiałów',
            'Wsparcie trenerów',
            'Biblioteka materiałów edukacyjnych',
          ].map(item => (
            <div key={item} className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: '#f0f0f0' }}>
              <span className="font-bold flex-shrink-0" style={{ color: '#16db65' }}>✓</span>
              <span className="text-sm font-semibold" style={{ color: '#333' }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CENNIK */}
      <section id="cennik" className="py-16 md:py-24" style={{ background: '#f8f9fa' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-12">
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: '#16db65', background: '#f0fdf4' }}>Cennik</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-4" style={{ color: '#111' }}>Jeden plan. Pełny ekosystem.</h2>
            <p className="text-gray-500 text-sm md:text-base">Dostęp do wszystkiego — metodologii, Hand Tradera, analiz i społeczności.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border-2 p-6 md:p-8 text-center" style={{ borderColor: '#e5e5e5' }}>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#111' }}>Miesięczny</h3>
              <div className="my-5 md:my-6">
                <span className="text-4xl md:text-5xl font-bold" style={{ color: '#111' }}>$100</span>
                <span className="text-gray-400 font-medium">/msc</span>
              </div>
              <Link href="/checkout?plan=monthly" className="block w-full text-center font-bold py-3.5 rounded-xl transition-opacity hover:opacity-90 border-2" style={{ borderColor: '#16db65', color: '#16db65' }}>
                Wybierz plan
              </Link>
            </div>
            <div className="bg-white rounded-2xl border-2 p-6 md:p-8 text-center relative overflow-hidden" style={{ borderColor: '#16db65' }}>
              <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#16db65', color: '#111' }}>Oszczędzasz $301</div>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#111' }}>Roczny</h3>
              <div className="my-5 md:my-6">
                <span className="text-4xl md:text-5xl font-bold" style={{ color: '#111' }}>$899</span>
                <span className="text-gray-400 font-medium">/rok</span>
              </div>
              <Link href="/checkout?plan=annual" className="block w-full text-center text-white font-bold py-3.5 rounded-xl transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
                Wybierz plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24" style={{ background: '#111' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Zacznij budować umiejętności,<br className="hidden md:block" /> które zostaną z Tobą na lata.</h2>
          <p className="text-base md:text-lg mb-8 md:mb-10" style={{ color: '#888' }}>
            Dołącz do THE1ST Academy i poznaj system, który łączy edukację, technologię i społeczność w jednym miejscu.
          </p>
          <Link href="/checkout?plan=monthly" className="inline-flex items-center gap-3 font-bold py-4 px-8 md:px-10 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
            Dołącz teraz
            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '14px' }} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-4 md:px-6 py-8 md:py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/the1stacademy_Logo_sygnet.svg" alt="The1st Academy" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span className="text-sm font-bold">THE 1ST ACADEMY</span>
          </div>
          <p className="text-xs text-gray-400 text-center">© 2026 The1st Academy Ltd. Wszelkie prawa zastrzeżone.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-black">Polityka prywatności</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-black">Regulamin</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
