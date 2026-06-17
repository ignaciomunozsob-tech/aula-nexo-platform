import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  productTitle?: string
  productType?: string
  creatorName?: string
  buyerEmail?: string
  amountClp?: number
  commissionClp?: number
  communityFeeClp?: number
  netClp?: number
  orderId?: string
}

const fmt = (n?: number) => `$${(n ?? 0).toLocaleString('es-CL')} CLP`

const Email = ({
  productTitle = '—', productType = '—', creatorName = '—', buyerEmail = '—',
  amountClp = 0, commissionClp = 0, communityFeeClp = 0, netClp = 0, orderId = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nueva venta en NOVU: {productTitle} · {fmt(amountClp)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NOVU · admin</Text>
        <Heading style={h1}>💰 Nueva venta</Heading>
        <Section style={card}>
          <Text style={row}><strong>Producto:</strong> {productTitle} ({productType})</Text>
          <Text style={row}><strong>Creador:</strong> {creatorName}</Text>
          <Text style={row}><strong>Comprador:</strong> {buyerEmail}</Text>
          {orderId && <Text style={row}><strong>Orden:</strong> {orderId}</Text>}
        </Section>
        <Section style={breakdown}>
          <Text style={brkRow}><span>Precio bruto</span><strong>{fmt(amountClp)}</strong></Text>
          <Text style={brkRow}><span>Comisión NOVU (10%)</span><strong>{fmt(commissionClp)}</strong></Text>
          {communityFeeClp > 0 && (
            <Text style={brkRow}><span>Add-on comunidad</span><strong>{fmt(communityFeeClp)}</strong></Text>
          )}
          <Hr style={hr} />
          <Text style={brkRowTotal}><span>Neto al creador</span><strong>{fmt(netClp)}</strong></Text>
        </Section>
        <Text style={footer}>Notificación automática · NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `Nueva venta NOVU: ${(d.productTitle as string) ?? ''} · ${fmt(d.amountClp as number)}`,
  displayName: 'Admin · nueva venta',
  previewData: {
    productTitle: 'Curso de Marketing Digital', productType: 'course',
    creatorName: 'María Pérez', buyerEmail: 'cliente@example.cl',
    amountClp: 49990, commissionClp: 4999, communityFeeClp: 990, netClp: 44001,
    orderId: 'abc-123',
  },
  to: 'ignacio@raffamarketing.cl',
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: "Inter, sans-serif", margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brand: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#666', margin: '0 0 16px 0' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 20px 0' }
const card: React.CSSProperties = { backgroundColor: '#fafafa', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }
const row: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0' }
const breakdown: React.CSSProperties = { backgroundColor: '#fffbe6', borderRadius: '12px', padding: '20px 24px' }
const brkRow: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0', display: 'flex', justifyContent: 'space-between' as const }
const brkRowTotal: React.CSSProperties = { fontSize: '17px', color: '#0a0a0a', margin: '8px 0 0 0', display: 'flex', justifyContent: 'space-between' as const, fontWeight: 700 }
const hr: React.CSSProperties = { borderColor: '#fcc70e', margin: '12px 0' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
