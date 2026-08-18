import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { weekly, entries } = await request.json()

    if (!weekly) {
      return NextResponse.json({ error: 'Missing weekly data' }, { status: 400 })
    }

    const entriesSummary = entries && entries.length > 0
      ? entries.map((e: any) => `- ${e.trade_date} ${e.trade_time}: ${e.setup || 'brak setupu'}, wejście: ${e.entry || '-'}, ryzyko: ${e.risk_percent}%, emocje: ${e.emotion_score}/10`).join('\n')
      : 'Brak wpisów w tym tygodniu'

    const prompt = `Jesteś AI mentorem tradingowym w THE1ST Academy. Analizujesz tygodniową autoanalzę studenta stosującego metodologię THE1ST Method.

WPISY Z TEGO TYGODNIA:
${entriesSummary}

AUTOANALIZA STUDENTA:
- Transakcje zgodne z planem: ${weekly.trades_with_plan}
- Refleksja o emocjach: ${weekly.emotion_notes || 'brak'}
- Refleksja o poziomach S/R: ${weekly.sr_notes || 'brak'}
- Ogólne wnioski: ${weekly.general_notes || 'brak'}

Na podstawie powyższych danych przygotuj w języku polskim tygodniowe podsumowanie AI (max 200 słów) zawierające:
1. Ocenę tygodnia (co poszło dobrze)
2. Główny obszar do poprawy
3. Konkretne zadanie/focus na następny tydzień
4. Motywujące zakończenie

Bądź precyzyjny, oparty na danych ze wpisów i autoanalizy studenta.`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error?.message || 'Gemini API error' }, { status: 500 })
    }

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nie udało się wygenerować podsumowania.'

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('AI weekly summary error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
