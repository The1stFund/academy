// frontend/src/lib/emails.ts
const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM = 'The1st Academy <noreply@mail.the1st.academy>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://the1st.academy'

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
  return res.ok
}

export async function sendWelcomeEmail(email: string) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <div style="background:#111;padding:32px 40px;text-align:center">
      <p style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px">
        THE 1ST <span style="color:#16db65">ACADEMY</span>
      </p>
    </div>
    <div style="padding:40px">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#111">Witaj w THE1ST Academy! 👋</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6">
        Twoje konto zostało pomyślnie utworzone. Jesteś o jeden krok od dostępu do systemu, który zmieni sposób w jaki trejdujesz.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
        Aby uzyskać pełny dostęp do kursów, codziennych analiz i narzędzia Hand Trader, aktywuj subskrypcję.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#16db65;color:#111;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
          Aktywuj dostęp
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#aaa;line-height:1.6">
        Jeśli masz pytania, odpisz na tego emaila lub skontaktuj się z nami przez Discord.
      </p>
    </div>
    <div style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0">
      <p style="margin:0;font-size:12px;color:#aaa">© 2026 The1st Academy Ltd · <a href="${APP_URL}" style="color:#aaa">the1st.academy</a></p>
    </div>
  </div>
</body>
</html>`
  return sendEmail(email, 'Witaj w THE1ST Academy! 🚀', html)
}

export async function sendSubscriptionConfirmationEmail(email: string, plan: 'monthly' | 'annual') {
  const planName = plan === 'annual' ? 'Roczny ($899/rok)' : 'Miesięczny ($100/msc)'
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <div style="background:#111;padding:32px 40px;text-align:center">
      <p style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px">
        THE 1ST <span style="color:#16db65">ACADEMY</span>
      </p>
    </div>
    <div style="padding:40px">
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
        <p style="margin:0;font-size:32px">✅</p>
        <p style="margin:8px 0 0;font-size:16px;font-weight:800;color:#111">Subskrypcja aktywna!</p>
      </div>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111">Płatność potwierdzona</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6">
        Dziękujemy za zakup planu <strong>${planName}</strong>. Masz teraz pełny dostęp do THE1ST Academy.
      </p>
      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">Co masz teraz dostępne:</p>
        ${['Autorska metodologia THE1ST Method', 'Hand Trader (EA na MT4/MT5)', 'Codzienne analizy rynku', 'Społeczność traderów na Discordzie', 'Wsparcie trenerów'].map(item =>
          `<p style="margin:6px 0;font-size:14px;color:#333"><span style="color:#16db65;font-weight:700">✓</span> ${item}</p>`
        ).join('')}
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#16db65;color:#111;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
          Przejdź do platformy
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0">
      <p style="margin:0;font-size:12px;color:#aaa">© 2026 The1st Academy Ltd · <a href="${APP_URL}" style="color:#aaa">the1st.academy</a></p>
    </div>
  </div>
</body>
</html>`
  return sendEmail(email, '✅ Twoja subskrypcja THE1ST Academy jest aktywna', html)
}
