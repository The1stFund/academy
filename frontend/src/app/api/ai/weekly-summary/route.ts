import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { weekly, entries } = await request.json()

    if (!weekly) {
      return NextResponse.json({ error: 'Missing weekly data' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const entriesSummary = entries && entries.length > 0
      ? entries.map((e: any) => `- ${e.trade_date} ${e.trade_time}: ${e.setup || 'brak'}, ryzyko: ${e.risk_percent}%, emocje: ${e.emotion_score}/10`).join('\n')
      : 'Brak wpisow w tym tygodniu'

    const prompt = `Jestes AI mentorem tradingowym w THE1ST Academy. Analizujesz tygodniowa autoanalze studenta.

Wpisy z tygodnia:
${entriesSummary}

Autoanaliza studenta:
- Transakcje zgodne z planem: ${weekly.trades_with_plan}
- Emocje: ${weekly.emotion_notes || 'brak'}
- S/R: ${weekly.sr_notes || 'brak'}
- Wnioski: ${weekly.general_notes || 'brak'}

Napisz podsumowanie tygodnia w jezyku polskim (max 150 slow):
1. Co poszlo dobrze
2. Glowny obszar do poprawy
3. Konkretne zadanie na nastepny tydzien`

    const result = await model.generateContent(prompt)
    const summary = result.response.text()

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('AI weekly error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
