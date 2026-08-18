import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { entry } = await request.json()

    if (!entry) {
      return NextResponse.json({ error: 'Missing entry data' }, { status: 400 })
    }

    const prompt = `Jesteś AI mentorem tradingowym w akademii THE1ST Academy. Analizujesz wpis z dziennika tradera stosującego metodologię THE1ST Method opartą na:
- Strefach wsparcia i oporu (S/R) z timeframe'ów 30M, H1, H4
- Setupach opartych na zamknięciu świecy 30M powyżej/poniżej strefy S/R
- Zarządzaniu ryzykiem: maksymalnie 1% kapitału per transakcja
- Kontroli emocji i dyscyplinie egzekucji planu

Oto wpis z dziennika tradera:
- Data: ${entry.trade_date}
- Godzina: ${entry.trade_time}
- Poziom S/R: ${entry.sr_level || 'nie podano'}
- Setup: ${entry.setup || 'nie podano'}
- Wejście: ${entry.entry || 'nie podano'}
- Wyjście: ${entry.exit || 'nie podano'}
- Ryzyko: ${entry.risk_percent}%
- Emocje (1-10): ${entry.emotion_score}/10
- Wnioski tradera: ${entry.notes || 'brak'}

Przygotuj krótką analizę (max 150 słów) w języku polskim zawierającą:
1. Ocenę zgodności z metodologią THE1ST (setup, ryzyko, S/R)
2. Komentarz do poziomu emocji
3. Jeden konkretny wniosek do wdrożenia w kolejnym tradzie

Bądź konkretny, konstruktywny i motywujący. Używaj języka profesjonalnego ale przystępnego.`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error?.message || 'Gemini API error' }, { status: 500 })
    }

    const data = await response.json()
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nie udało się wygenerować analizy.'

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('AI analyze error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
