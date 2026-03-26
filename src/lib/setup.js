import { supabase } from './supabase'

const DEFAULT_SETUP = {
  villageName: 'The Greenfield',
  appLineMain: 'Village Management',
  appLineTail: 'System',
  version: 'v12.3',
  address: 'Gusto Suksawat 26 -1',
}

let setupCache = null

function toSetup(row) {
  const villageName = row?.village_name?.trim() || DEFAULT_SETUP.villageName
  const address = row?.juristic_name?.trim() || DEFAULT_SETUP.address
  return {
    ...DEFAULT_SETUP,
    villageName,
    address,
  }
}

export async function getSetupConfig({ forceRefresh = false } = {}) {
  if (!forceRefresh && setupCache) return setupCache

  const fromLocal = localStorage.getItem('vms-setup-village-name')

  try {
    const { data: publicData, error: publicError } = await supabase
      .from('public_config')
      .select('village_name, juristic_name')
      .limit(1)
      .maybeSingle()

    if (!publicError && publicData) {
      setupCache = toSetup(publicData)
      localStorage.setItem('vms-setup-village-name', setupCache.villageName)
      return setupCache
    }

    const { data: systemData, error: systemError } = await supabase
      .from('system_config')
      .select('village_name, juristic_name')
      .limit(1)
      .maybeSingle()

    if (!systemError && systemData) {
      setupCache = toSetup(systemData)
      localStorage.setItem('vms-setup-village-name', setupCache.villageName)
      return setupCache
    }
  } catch (error) {
    console.warn('getSetupConfig fallback:', error)
  }

  setupCache = {
    ...DEFAULT_SETUP,
    villageName: fromLocal || DEFAULT_SETUP.villageName,
  }
  return setupCache
}

export function buildDocumentTitle(villageName) {
  return `${villageName} — Village Management System`
}

export function applyDocumentTitle(villageName) {
  document.title = buildDocumentTitle(villageName)
}
