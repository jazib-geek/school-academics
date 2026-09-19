import api from './api'
import { normalizeWhatsAppPhone } from '../utils/whatsapp'

const BASE = '/api/campus/family-accounts'

export const getFamilyAccounts = async () => {
  const response = await api.get(BASE)
  return response.data?.data ?? []
}

export const changeFamilyAccountPassword = async (familyId, password) => {
  const response = await api.post(`${BASE}/${familyId}/change-password`, { password })
  return response.data
}

/** Build WhatsApp Web link with a default credentials message. */
export function buildFamilyCredentialsWhatsAppUrl({ familyId, password, fatherContact }) {
  const phone = normalizeWhatsAppPhone(fatherContact)
  if (!phone) return null

  const text = [
    'Assalam o Alaikum,',
    '',
    'Your Family Portal login details are:',
    `Family ID: ${familyId}`,
    `Password: ${password || ''}`,
    '',
    'Please keep these details private.',
  ].join('\n')

  // Prefer WhatsApp Web send URL when the user is already logged into web.whatsapp.com
  return `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
}
