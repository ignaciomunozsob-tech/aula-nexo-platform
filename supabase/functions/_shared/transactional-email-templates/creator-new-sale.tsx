import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props {
  creatorName?: string
  productTitle?: string
  buyerLabel?: string
  amountClp?: number
  commissionClp?: number
  communityFeeClp?: number
  netClp?: number
  reference?: string
  saleDate?: string
  financesUrl?: string
}

const fmt = (n?: number) => `$${(n ?? 0).toLocaleString('es-CL')} CLP`

const Email = ({
  creatorName = '',
  productTitle = '—',
  buyerLabel = '—',
  amountClp = 0,
  commissionClp = 0,
  communityFeeClp = 0,
  netClp = 0,
  reference = '',
  saleDate = '',
  financesUrl = 'https://soynovu.cl/creator-app/finances',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>🎉 Nueva venta en NOVU: {productTitle} · {fmt(amountClp)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>🎉 Nueva venta</Heading>
        <Text style={hi}>Hola{creatorName ? ` ${creatorName}` : ''}, tienes una nueva venta.</Text>

        <Section style={card}>
          <Text style={row}><strong>Producto:</strong> {productTitle}</Text>
          <Text style={row}><strong>Comprador:</strong> {buyerLabel}</Text>
          {reference && <Text style={row}><strong>Referencia:</strong> <span style={mono}>{reference}</span></Text>}
          {saleDate && <Text style={row}><strong>Fecha:</strong> {saleDate}</Text>}
        </Section>

        <Section style={breakdown}>
          <Text style={brkRow}><span>Monto bruto</span><strong>{fmt(amountClp)}</strong></Text>
          <Text style={brkRow}><span>Comisión NOVU (10%)</span><strong>-{fmt(commissionClp)}</strong></Text>
          {communityFeeClp > 0 && (
            <Text style={brkRow}><span>Comunidad</span><strong>-{fmt(communityFeeClp)}</strong></Text>
          )}
          <Hr style={hr} />
          <Text style={brkRowTotal}><span>Tu ganancia</span><strong>{fmt(netClp)}</strong></Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
          <Button href={financesUrl} style={btn}>Ver detalle en mi panel</Button>
        </Section>

        <Text style={footer}>— El equipo NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `🎉 Nueva venta — ${(d.productTitle as string) ?? ''} — ${fmt(d.amountClp as number)}`,
  displayName: 'Creador · nueva venta',
  previewData: {
    creatorName: 'María',
    productTitle: 'Curso de Marketing Digital',
    buyerLabel: 'cliente@example.cl',
    amountClp: 49990,
    commissionClp: 4999,
    communityFeeClp: 990,
    netClp: 44001,
    reference: 'NOV-2026-84729',
    saleDate: '13 de julio de 2026, 15:32',
    financesUrl: 'https://soynovu.cl/creator-app/finances',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brand: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#666', margin: '0 0 12px 0' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 8px 0' }
const hi: React.CSSProperties = { fontSize: '15px', color: '#333', margin: '0 0 20px 0' }
const card: React.CSSProperties = { backgroundColor: '#fafafa', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }
const row: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0' }
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px' }
const breakdown: React.CSSProperties = { backgroundColor: '#fffbe6', borderRadius: '12px', padding: '20px 24px' }
const brkRow: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0', display: 'flex', justifyContent: 'space-between' as const }
const brkRowTotal: React.CSSProperties = { fontSize: '17px', color: '#0a0a0a', margin: '8px 0 0 0', display: 'flex', justifyContent: 'space-between' as const, fontWeight: 700 }
const hr: React.CSSProperties = { borderColor: '#fcc70e', margin: '12px 0' }
const btn: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
