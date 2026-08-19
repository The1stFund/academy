import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { entry } = await request.json()

    if (!entry) {
      return NextResponse.json({ error: 'Missing entry data' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Jestes AI mentorem tradingowym w THE1ST Academy. Analizujesz wpis z dziennika tradera stosujacego metode THE1ST opartą na strefach S/R z 30M/H1/H4, setupach zamkniecia swiecy 30M i ryzyku max 1%.

Wpis:
- Data: ${entry.trade_date} ${entry.trade_time}
- S/R: ${entry.sr_level || 'brak'}
- Setup: ${entry.setup || 'brak'}
- Wejscie: ${entry.entry || 'brak'}
- Wyjscie: ${entry.exit || 'brak'}
- Ryzyko: ${entry.risk_percent}%
- Emocje: ${entry.emotion_score}/10
- Wnioski: ${entry.notes || 'brak'}

Napisz analize w jezyku polskim (max 120 slow):
1. Zgodnosc z metodologia THE1ST
2. Komentarz do emocji
3. Jeden konkretny wniosek na nastepny trad`

    const result = await model.generateContent(prompt)
    const analysis = result.response.text()

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('AI analyze error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
