import CandlestickHero from '@/components/CandlestickHero'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* NAV */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">The1st Academy</span>
          <Badge variant="secondary" className="text-xs">Trading</Badge>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-black">
            Zaloguj się
          </Link>
          <Link href="/register">
            <Button size="sm">Dołącz teraz</Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <CandlestickHero />

      {/* STATS */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Studentów' },
            { value: '50+', label: 'Godzin materiałów' },
            { value: '365', label: 'Analiz rocznie' },
            { value: '24/7', label: 'Dostęp do treści' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Co otrzymujesz</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🎓',
              title: 'Kursy tradingowe',
              desc: 'Kompleksowe kursy wideo od podstaw do zaawansowanych strategii. Ucz się we własnym tempie.',
            },
            {
              icon: '📊',
              title: 'Codzienne analizy',
              desc: 'Profesjonalne analizy rynku publikowane każdego dnia. Wideo + wykresy + komentarz eksperta.',
            },
            {
              icon: '📔',
              title: 'Dziennik transakcji',
              desc: 'Śledź swoje wyniki, analizuj błędy i poprawiaj strategię. Import z MT4/MT5.',
            },
            {
              icon: '🏆',
              title: 'Leaderboard',
              desc: 'Rywalizuj z innymi traderami. Sprawdź kto osiąga najlepsze wyniki ROI i win rate.',
            },
            {
              icon: '💬',
              title: 'Społeczność Discord',
              desc: 'Dołącz do ekskluzywnej grupy traderów. Dyskusje, sygnały i wsparcie 24/7.',
            },
            {
              icon: '📚',
              title: 'Biblioteka ebooków',
              desc: 'Dziesiątki materiałów PDF do pobrania. Strategie, psychologia tradingu i więcej.',
            },
          ].map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm">
              <CardHeader>
                <div className="text-3xl mb-2">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Prosty cennik</h2>
          <p className="text-center text-gray-500 mb-12">Jeden plan – pełny dostęp do wszystkiego</p>
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-black">
              <CardHeader className="text-center">
                <Badge className="mx-auto mb-2">Najpopularniejszy</Badge>
                <CardTitle className="text-2xl">The1st Academy</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">£49</span>
                  <span className="text-gray-500">/miesiąc</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">lub £499/rok (oszczędzasz £89)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {[
                    'Wszystkie kursy tradingowe',
                    'Codzienne analizy rynku',
                    'Dziennik transakcji',
                    'Leaderboard traderów',
                    'Dostęp do Discord',
                    'Biblioteka ebooków',
                    'Wsparcie 24/7',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500 font-bold">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full mt-4" size="lg">
                    Zacznij teraz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* LEADERBOARD PREVIEW */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Top traderzy</h2>
        <p className="text-center text-gray-500 mb-12">
          Dołącz i rywalizuj z najlepszymi
        </p>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left pb-3">#</th>
                    <th className="text-left pb-3">Trader</th>
                    <th className="text-right pb-3">ROI</th>
                    <th className="text-right pb-3">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: 'T***r', roi: '+142%', winRate: '78%' },
                    { rank: 2, name: 'M***k', roi: '+98%', winRate: '71%' },
                    { rank: 3, name: 'A***a', roi: '+87%', winRate: '69%' },
                    { rank: 4, name: '???', roi: '???', winRate: '???' },
                    { rank: 5, name: '???', roi: '???', winRate: '???' },
                  ].map((trader) => (
                    <tr key={trader.rank} className={`border-b last:border-0 ${trader.rank > 3 ? 'blur-sm' : ''}`}>
                      <td className="py-3 font-bold">
                        {trader.rank <= 3 ? ['🥇', '🥈', '🥉'][trader.rank - 1] : trader.rank}
                      </td>
                      <td className="py-3">{trader.name}</td>
                      <td className="py-3 text-right text-green-600 font-medium">{trader.roi}</td>
                      <td className="py-3 text-right">{trader.winRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-center mt-4">
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    Zaloguj się aby zobaczyć pełny ranking →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Gotowy żeby zacząć?</h2>
          <p className="text-gray-400 mb-8">
            Dołącz do setek traderów którzy już rozwijają swoje umiejętności
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Dołącz do The1st Academy →
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-6 py-8 max-w-6xl mx-auto text-center text-sm text-gray-400">
        <p>© 2026 The1st Academy Ltd. Wszelkie prawa zastrzeżone.</p>
        <div className="flex gap-6 justify-center mt-4">
          <Link href="/privacy" className="hover:text-black">Polityka prywatności</Link>
          <Link href="/terms" className="hover:text-black">Regulamin</Link>
          <Link href="/contact" className="hover:text-black">Kontakt</Link>
        </div>
      </footer>

    </div>
  )
}