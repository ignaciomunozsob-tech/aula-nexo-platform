import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props { name?: string; email?: string; signedUpAt?: string }

const Email = ({ name = '—', email = '—', signedUpAt = '' }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nuevo creador registrado en NOVU: {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="40" height="40" style={logo} /><Text style={brand}>NOVU · admin</Text>
        <Heading style={h1}>Nuevo creador registrado</Heading>
        <Section style={card}>
          <Text style={row}><strong>Nombre:</strong> {name}</Text>
          <Text style={row}><strong>Email:</strong> {email}</Text>
          {signedUpAt && <Text style={row}><strong>Fecha:</strong> {signedUpAt}</Text>}
        </Section>
        <Text style={footer}>Notificación automática · NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `Nuevo creador en NOVU: ${(d.name as string) ?? 'sin nombre'}`,
  displayName: 'Admin · nuevo creador',
  previewData: { name: 'Ignacio Raffa', email: 'ignacio@example.cl', signedUpAt: '17 jun 2026' },
  to: 'ignacio@raffamarketing.cl',
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: "Inter, sans-serif", margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brand: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#666', margin: '0 0 16px 0' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 20px 0' }
const card: React.CSSProperties = { backgroundColor: '#fafafa', borderRadius: '12px', padding: '20px 24px' }
const row: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 12px 0', borderRadius: '10px' }
