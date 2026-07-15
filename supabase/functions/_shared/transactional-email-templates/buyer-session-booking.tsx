import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props {
  attendeeName?: string
  sessionTitle?: string
  creatorName?: string
  dateFormatted?: string
  timeFormatted?: string
  durationMin?: number
  meetUrl?: string
  icsUrl?: string
}

const Email = ({
  attendeeName = '',
  sessionTitle = '—',
  creatorName = '',
  dateFormatted = '',
  timeFormatted = '',
  durationMin = 30,
  meetUrl = '',
  icsUrl = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu sesión con {creatorName} está confirmada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>📅 Tu sesión está confirmada</Heading>
        <Text style={hi}>Hola{attendeeName ? ` ${attendeeName}` : ''}, tu reserva quedó confirmada.</Text>

        <Section style={card}>
          <Text style={row}><strong>Sesión:</strong> {sessionTitle}</Text>
          {creatorName && <Text style={row}><strong>Con:</strong> {creatorName}</Text>}
          {dateFormatted && <Text style={row}><strong>Fecha:</strong> {dateFormatted}</Text>}
          {timeFormatted && <Text style={row}><strong>Hora:</strong> {timeFormatted}</Text>}
          <Text style={row}><strong>Duración:</strong> {durationMin} min</Text>
        </Section>

        {meetUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
            <Button href={meetUrl} style={btn}>Unirme a Google Meet</Button>
          </Section>
        )}
        {icsUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '8px 0' }}>
            <Button href={icsUrl} style={btnAlt}>Añadir a mi calendario</Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={p}>Si necesitas cancelar o reagendar, responde este correo.</Text>
        <Text style={footer}>— El equipo NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `Tu sesión con ${(d.creatorName as string) ?? 'tu creador'} está confirmada`,
  displayName: 'Comprador · sesión 1:1',
  previewData: {
    attendeeName: 'Camila',
    sessionTitle: 'Mentoría de negocio',
    creatorName: 'María Pérez',
    dateFormatted: 'lunes, 22 de julio de 2026',
    timeFormatted: '10:00 hrs',
    durationMin: 45,
    meetUrl: 'https://meet.google.com/xyz-abc',
    icsUrl: 'https://soynovu.cl/booking/success?token=abc',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 8px 0' }
const hi: React.CSSProperties = { fontSize: '15px', color: '#333', margin: '0 0 20px 0' }
const p: React.CSSProperties = { fontSize: '14px', color: '#555', margin: '12px 0 0 0', lineHeight: 1.5 }
const card: React.CSSProperties = { backgroundColor: '#fafafa', borderRadius: '12px', padding: '20px 24px' }
const row: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0' }
const btn: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const btnAlt: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0a0a0a', padding: '12px 24px', borderRadius: '10px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', border: '1px solid #e5e5e5' }
const hr: React.CSSProperties = { borderColor: '#eee', margin: '24px 0 8px' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '24px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
