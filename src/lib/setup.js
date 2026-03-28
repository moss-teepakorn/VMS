import { supabase } from './supabase'

const DEFAULT_SETUP = {
  villageName: 'The Greenfield',
  appLineMain: 'Village Management',
  appLineTail: 'System',
  version: 'v12.3',
  address: 'Gusto Suksawat 26 -1',
  loginCircleLogoUrl: '',
  bankName: '',
  bankAccountNo: '',
  bankAccountName: '',
}

let setupCache = null

function toSetup(row) {
  const villageName = row?.village_name?.trim() || DEFAULT_SETUP.villageName
  const address = row?.juristic_address?.trim() || row?.juristic_name?.trim() || DEFAULT_SETUP.address
  const fromLocalLogo = String(localStorage.getItem('vms-login-circle-logo-url') || '').trim()
  const loginCircleLogoUrl = String(row?.village_logo_url || fromLocalLogo || '').trim()
  return {
    ...DEFAULT_SETUP,
    villageName,
    address,
    loginCircleLogoUrl,
    bankName: row?.bank_name?.trim() || DEFAULT_SETUP.bankName,
    bankAccountNo: row?.bank_account_no?.trim() || DEFAULT_SETUP.bankAccountNo,
    bankAccountName: row?.bank_account_name?.trim() || DEFAULT_SETUP.bankAccountName,
  }
}

export async function getSetupConfig({ forceRefresh = false } = {}) {
  if (!forceRefresh && setupCache) return setupCache

  const fromLocal = localStorage.getItem('vms-setup-village-name')
  const fromLocalLogo = localStorage.getItem('vms-login-circle-logo-url')

  try {
    const { data: systemData, error: systemError } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!systemError && systemData) {
      setupCache = toSetup(systemData)
      localStorage.setItem('vms-setup-village-name', setupCache.villageName)
      if (setupCache.loginCircleLogoUrl) {
        localStorage.setItem('vms-login-circle-logo-url', setupCache.loginCircleLogoUrl)
      }
      return setupCache
    }

    const { data: publicData, error: publicError } = await supabase
      .from('public_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!publicError && publicData) {
      setupCache = toSetup(publicData)
      localStorage.setItem('vms-setup-village-name', setupCache.villageName)
      if (setupCache.loginCircleLogoUrl) {
        localStorage.setItem('vms-login-circle-logo-url', setupCache.loginCircleLogoUrl)
      }
      return setupCache
    }
  } catch (error) {
    console.warn('getSetupConfig fallback:', error)
  }

  setupCache = {
    ...DEFAULT_SETUP,
    villageName: fromLocal || DEFAULT_SETUP.villageName,
    loginCircleLogoUrl: fromLocalLogo || DEFAULT_SETUP.loginCircleLogoUrl,
  }
  return setupCache
}

export function buildDocumentTitle(villageName) {
  return `${villageName} — Village Management System`
}

export function applyDocumentTitle(villageName) {
  document.title = buildDocumentTitle(villageName)
}
