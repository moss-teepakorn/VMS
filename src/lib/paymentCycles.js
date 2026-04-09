import { supabase } from './supabase'

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toIsoDate(value) {
  const date = String(value || '').trim()
  if (!date) return null
  return date
}

export async function getPaymentCycleConfigByYear(yearCE) {
  const targetYear = toNumber(yearCE, 0)
  if (!targetYear) return null

  const { data: config, error: configError } = await supabase
    .from('payment_cycle_configs')
    .select('*')
    .eq('year_ce', targetYear)
    .maybeSingle()

  if (configError) throw configError
  if (!config) return null

  const { data: periods, error: periodsError } = await supabase
    .from('payment_cycle_periods')
    .select('*')
    .eq('config_id', config.id)
    .order('seq_no', { ascending: true })

  if (periodsError) throw periodsError

  return {
    ...config,
    periods: periods || [],
  }
}

export async function savePaymentCycleConfig({ yearCE, frequency, periods, profileId = null }) {
  const targetYear = toNumber(yearCE, 0)
  if (!targetYear) throw new Error('ปีไม่ถูกต้อง')
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new Error('กรุณากำหนดรอบชำระอย่างน้อย 1 รายการ')
  }

  const payload = {
    year_ce: targetYear,
    frequency,
    is_active: true,
    updated_by_id: profileId || null,
    updated_at: new Date().toISOString(),
  }

  const { data: config, error: configError } = await supabase
    .from('payment_cycle_configs')
    .upsert([{ ...payload, created_by_id: profileId || null }], { onConflict: 'year_ce' })
    .select('*')
    .single()

  if (configError) throw configError

  const { error: deleteError } = await supabase
    .from('payment_cycle_periods')
    .delete()
    .eq('config_id', config.id)

  if (deleteError) throw deleteError

  const rows = periods.map((item, index) => ({
    config_id: config.id,
    seq_no: toNumber(item.seq_no, index + 1),
    period_label: String(item.period_label || `รอบที่ ${index + 1}`).trim(),
    start_date: toIsoDate(item.start_date),
    end_date: toIsoDate(item.end_date),
    due_date: toIsoDate(item.due_date),
    due_year_offset: toNumber(item.due_year_offset, 0),
    enable_penalty: Boolean(item.enable_penalty),
    penalty_start_date: item.enable_penalty ? toIsoDate(item.penalty_start_date) : null,
    penalty_year_offset: toNumber(item.penalty_year_offset, 0),
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('payment_cycle_periods')
    .insert(rows)

  if (insertError) throw insertError

  return getPaymentCycleConfigByYear(targetYear)
}
