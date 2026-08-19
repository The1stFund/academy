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
    const { entry } = await req.json()

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Missing entry data' }), { status: 400 })
    }

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

Napisz analize w jezyku polskim (max 150 slow):
1. Zgodnosc z metodologia THE1ST
2. Komentarz do emocji
3. Jeden konkretny wniosek na nastepny trad`

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
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nie udalo sie wygenerowac analizy.'

    return new Response(JSON.stringify({ analysis }), {
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
