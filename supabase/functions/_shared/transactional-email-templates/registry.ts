import type { ComponentType } from 'npm:react@18.3.1'
import { template as twoFaCode } from './2fa-code.tsx'
import { template as creatorWelcome } from './creator-welcome.tsx'
import { template as adminNewCreator } from './admin-new-creator.tsx'
import { template as adminNewSale } from './admin-new-sale.tsx'
import { template as eventRegistrationConfirmation } from './event-registration-confirmation.tsx'
import { template as creatorNewSale } from './creator-new-sale.tsx'

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: ComponentType<any>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: Record<string, unknown>) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  '2fa-code': twoFaCode,
  'creator-welcome': creatorWelcome,
  'admin-new-creator': adminNewCreator,
  'admin-new-sale': adminNewSale,
  'event-registration-confirmation': eventRegistrationConfirmation,
  'creator-new-sale': creatorNewSale,
}
