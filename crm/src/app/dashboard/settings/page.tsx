'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CommissionSetting = {
  id: string
  level: number
  role: string | null
  commission_percent: number
  max_total_percent: number
  is_active: boolean
}

const ROLE_LABELS: Record<string, string> = {
  standard: 'Afiliant (standard) – 25% domyślnie',
  promoter: 'Promotor – darmowy dostęp, wyższe prowizje',
  coordinator: 'Koordynator – prowizja z afiliantów i promotorów',
}

type PromoterSetting = {
  id: string
  promoter_commission_percent: number
  coordinator_commission_percent: number
  min_clients_monthly: number
  min_clients_total: number
  min_clients_period_months: number
}

export default function SettingsPage() {
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([])
  const [promoterSettings, setPromoterSettings] = useState<PromoterSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'commissions' | 'promoters' | 'discord'>('commissions')
  const [discordSettings, setDiscordSettings] = useState({
    webhook_url: '',
    bot_token: '',
    guild_id: '',
    subscriber_role_id: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadSettings()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadSettings() {
    const { data: commData } = await supabase
      .schema('affiliates')
      .from('commission_settings')
      .select('*')
      .order('level', { ascending: true })

    if (commData) setCommissionSettings(commData)

    const { data: promData } = await supabase
      .schema('affiliates')
      .from('promoter_settings')
      .select('*')
      .single()

    if (promData) setPromoterSettings(promData)

    setLoading(false)
  }

  async function saveCommissionSettings() {
    setSaving(true)
    for (const setting of commissionSettings) {
      await supabase
        .schema('affiliates')
        .from('commission_settings')
        .update({
          commission_percent: setting.commission_percent,
          max_total_percent: setting.max_total_percent,
          is_active: setting.is_active,
        })
        .eq('id', setting.id)
    }
    setSaving(false)
    alert('Ustawienia prowizji zapisane')
  }

  async function savePromoterSettings() {
    if (!promoterSettings) return
    setSaving(true)
    await supabase
      .schema('affiliates')
      .from('promoter_settings')
      .update({
        promoter_commission_percent: promoterSettings.promoter_commission_percent,
        coordinator_commission_percent: promoterSettings.coordinator_commission_percent,
        min_clients_monthly: promoterSettings.min_clients_monthly,
        min_clients_total: promoterSettings.min_clients_total,
        min_clients_period_months: promoterSettings.min_clients_period_months,
      })
      .eq('id', promoterSettings.id)
    setSaving(false)
    alert('Ustawienia promotorów zapisane')
  }

  function updateCommission(id: string, field: string, value: number | boolean) {
    setCommissionSettings(commissionSettings.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Ustawienia platformy</h1>
        </div>
      </header>

      <main className="p-6 space-y-6">

        <div className="flex gap-2 border-b">
          {(['commissions', 'promoters', 'discord'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              {tab === 'commissions' ? 'Prowizje afiliacyjne' :
               tab === 'promoters' ? 'System promotorów' : 'Discord'}
            </button>
          ))}
        </div>

        {activeTab === 'commissions' && (
          <Card>
            <CardHeader>
              <CardTitle>Prowizje afiliacyjne – 3 poziomy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                Suma prowizji na wszystkich poziomach nie powinna przekraczać maksymalnej wartości.
                Aktualnie: {commissionSettings.reduce((sum, s) => sum + s.commission_percent, 0)}%
                z max {commissionSettings[0]?.max_total_percent || 40}%
              </div>

              {commissionSettings.map((setting) => (
                <div key={setting.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium capitalize">{setting.role ? ROLE_LABELS[setting.role] || setting.role : `Poziom ${setting.level}`}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Rola: {setting.role || `poziom ${setting.level}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Aktywny</Label>
                      <input
                        type="checkbox"
                        checked={setting.is_active}
                        onChange={(e) => updateCommission(setting.id, 'is_active', e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prowizja (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={setting.commission_percent}
                          onChange={(e) => updateCommission(setting.id, 'commission_percent', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Maksymalna suma prowizji (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={setting.max_total_percent}
                          onChange={(e) => updateCommission(setting.id, 'max_total_percent', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={saveCommissionSettings} disabled={saving}>
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia prowizji'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'promoters' && promoterSettings && (
          <Card>
            <CardHeader>
              <CardTitle>System promotorów</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                Promotorzy otrzymują darmowy dostęp do platformy w zamian za pozyskiwanie klientów.
                Suma prowizji promotora i koordynatora = {
                  promoterSettings.promoter_commission_percent +
                  promoterSettings.coordinator_commission_percent
                }% (max 40%)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Prowizje</h3>
                  <div className="space-y-2">
                    <Label>Prowizja promotora (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={promoterSettings.promoter_commission_percent}
                        onChange={(e) => setPromoterSettings({
                          ...promoterSettings,
                          promoter_commission_percent: parseFloat(e.target.value) || 0
                        })}
                        className="w-32"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prowizja koordynatora (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={promoterSettings.coordinator_commission_percent}
                        onChange={(e) => setPromoterSettings({
                          ...promoterSettings,
                          coordinator_commission_percent: parseFloat(e.target.value) || 0
                        })}
                        className="w-32"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Warunki darmowego dostępu</h3>
                  <div className="space-y-2">
                    <Label>Min. klientów miesięcznie</Label>
                    <Input
                      type="number"
                      min="0"
                      value={promoterSettings.min_clients_monthly}
                      onChange={(e) => setPromoterSettings({
                        ...promoterSettings,
                        min_clients_monthly: parseInt(e.target.value) || 0
                      })}
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min. klientów łącznie (alternatywa)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={promoterSettings.min_clients_total}
                      onChange={(e) => setPromoterSettings({
                        ...promoterSettings,
                        min_clients_total: parseInt(e.target.value) || 0
                      })}
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Okres dla warunku łącznego (miesiące)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={promoterSettings.min_clients_period_months}
                      onChange={(e) => setPromoterSettings({
                        ...promoterSettings,
                        min_clients_period_months: parseInt(e.target.value) || 1
                      })}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={savePromoterSettings} disabled={saving}>
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia promotorów'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'discord' && (
          <Card>
            <CardHeader>
              <CardTitle>Integracja Discord</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-700">
                Po zakupie subskrypcji student automatycznie otrzyma rolę na Discordzie.
                Po anulowaniu rola zostanie odebrana.
              </div>
              <div className="space-y-2">
                <Label>Discord Bot Token</Label>
                <Input
                  type="password"
                  placeholder="Bot token z Discord Developer Portal"
                  value={discordSettings.bot_token}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, bot_token: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Guild ID (ID serwera)</Label>
                <Input
                  placeholder="np. 1234567890"
                  value={discordSettings.guild_id}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, guild_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ID roli subskrybenta</Label>
                <Input
                  placeholder="np. 9876543210"
                  value={discordSettings.subscriber_role_id}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, subscriber_role_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL (opcjonalnie – powiadomienia)</Label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordSettings.webhook_url}
                  onChange={(e) => setDiscordSettings({ ...discordSettings, webhook_url: e.target.value })}
                />
              </div>
              <Button disabled>
                Zapisz ustawienia Discord (wkrótce)
              </Button>
              <p className="text-xs text-gray-400">
                Integracja Discord zostanie aktywowana w kolejnym etapie budowy platformy.
              </p>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  )
}