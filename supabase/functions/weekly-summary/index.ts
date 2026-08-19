import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { weekly, entries } = await req.json()

    if (!weekly) {
      return new Response(JSON.stringify({ error: 'Missing weekly data' }), { status: 400 })
    }

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

Napisz podsumowanie tygodnia w jezyku polskim (max 200 slow):
1. Co poszlo dobrze
2. Glowny obszar do poprawy
3. Konkretne zadanie na nastepny tydzien`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1, maxOutputTokens: 1024 }
        })
      }
    )

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nie udalo sie wygenerowac podsumowania.'

    return new Response(JSON.stringify({ summary }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})
