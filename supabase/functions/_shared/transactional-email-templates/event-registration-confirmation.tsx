import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  attendeeName?: string
  eventTitle?: string
  eventDateFormatted?: string
  eventTimeFormatted?: string
  durationMin?: number
  eventType?: 'online' | 'in_person'
  meetingUrl?: string
  location?: string
  creatorName?: string
  redirectUrl?: string
  isNewUser?: boolean
  accountEmail?: string
  setPasswordUrl?: string
}

const Email = ({
  attendeeName,
  eventTitle = 'tu evento',
  eventDateFormatted = '',
  eventTimeFormatted = '',
  durationMin = 60,
  eventType = 'online',
  meetingUrl = '',
  location = '',
  creatorName = '',
  redirectUrl = '',
  isNewUser = false,
  accountEmail = '',
  setPasswordUrl = 'https://soynovu.cl/forgot-password',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirmada tu inscripción a {eventTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NOVU</Text>
        <Heading style={h1}>¡Estás inscrito{attendeeName ? `, ${attendeeName}` : ''}!</Heading>
        <Text style={text}>
          Confirmamos tu inscripción a <strong>{eventTitle}</strong>
          {creatorName ? <> con <strong>{creatorName}</strong></> : null}.
        </Text>

        <Section style={blocks}>
          <Section style={block}>
            <Text style={blockLabel}>Fecha</Text>
            <Text style={blockValue}>{eventDateFormatted || '—'}</Text>
          </Section>
          <Section style={block}>
            <Text style={blockLabel}>Hora</Text>
            <Text style={blockValue}>{eventTimeFormatted || '—'}</Text>
          </Section>
          <Section style={block}>
            <Text style={blockLabel}>Duración</Text>
            <Text style={blockValue}>{durationMin} min</Text>
          </Section>
        </Section>

        {eventType === 'online' ? (
          <Section style={accessCard}>
            <Text style={accessTitle}>🎥 Evento online</Text>
            {meetingUrl ? (
              <>
                <Text style={text}>Únete a la reunión desde este enlace:</Text>
                <Section style={ctaBox}>
                  <Button href={meetingUrl} style={ctaButton}>Unirme a la reunión</Button>
                </Section>
                <Text style={muted}>{meetingUrl}</Text>
              </>
            ) : (
              <Text style={muted}>El creador enviará el link de acceso antes del evento.</Text>
            )}
          </Section>
        ) : (
          <Section style={accessCard}>
            <Text style={accessTitle}>📍 Evento presencial</Text>
            {location ? (
              <>
                <Text style={text}><strong>Dirección:</strong> {location}</Text>
                <Section style={ctaBox}>
                  <Button
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                    style={ctaButton}
                  >
                    Ver en Google Maps
                  </Button>
                </Section>
              </>
            ) : (
              <Text style={muted}>El creador confirmará la dirección antes del evento.</Text>
            )}
          </Section>
        )}

        {redirectUrl ? (
          <Section style={ctaBox}>
            <Button href={redirectUrl} style={ctaSecondary}>Continuar</Button>
          </Section>
        ) : null}

        {isNewUser ? (
          <Section style={accountCard}>
            <Text style={accountTitle}>👤 Crea tu contraseña en NOVU</Text>
            <Text style={text}>
              Registramos tu inscripción con el correo{' '}
              <strong>{accountEmail || 'que nos indicaste'}</strong>. Para acceder a tu cuenta, revisar
              tus compras y volver a entrar al evento cuando quieras, define una contraseña:
            </Text>
            <Section style={ctaBox}>
              <Button href={setPasswordUrl} style={ctaButton}>Crear mi contraseña</Button>
            </Section>
            <Text style={muted}>
              1. Haz clic en el botón. 2. Ingresa tu correo. 3. Recibirás un enlace para elegir una contraseña.
              Después podrás iniciar sesión en <strong>soynovu.cl</strong> con tu correo y tu nueva contraseña.
            </Text>
          </Section>
        ) : null}

        <Text style={muted}>
          Guarda este correo — contiene la información de acceso a tu evento.
        </Text>
        <Text style={footer}>NOVU — Vende lo que sabes</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `Inscripción confirmada: ${(d.eventTitle as string) ?? 'tu evento'}`,
  displayName: 'Confirmación de inscripción a evento',
  previewData: {
    attendeeName: 'María',
    eventTitle: 'Masterclass de Fotografía',
    eventDateFormatted: 'sábado 15 de marzo de 2026',
    eventTimeFormatted: '19:00 hrs',
    durationMin: 90,
    eventType: 'online',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    creatorName: 'Ignacio Muñoz',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brand: React.CSSProperties = { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#0a0a0a', margin: '0 0 24px 0' }
const h1: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 16px 0', lineHeight: 1.3 }
const text: React.CSSProperties = { fontSize: '16px', lineHeight: 1.6, color: '#1a1a1a', margin: '0 0 16px 0' }
const blocks: React.CSSProperties = { display: 'table', width: '100%', margin: '20px 0', borderSpacing: '8px 0' }
const block: React.CSSProperties = { display: 'table-cell', width: '33%', backgroundColor: '#fafafa', borderRadius: '12px', padding: '16px', textAlign: 'center' as const, border: '1px solid #eee' }
const blockLabel: React.CSSProperties = { fontSize: '12px', color: '#666', textTransform: 'uppercase' as const, margin: '0 0 6px 0', fontWeight: 600, letterSpacing: '0.5px' }
const blockValue: React.CSSProperties = { fontSize: '15px', color: '#0a0a0a', margin: 0, fontWeight: 700 }
const accessCard: React.CSSProperties = { backgroundColor: '#fffbe6', border: '1px solid #fcc70e', borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }
const accessTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 8px 0' }
const ctaBox: React.CSSProperties = { textAlign: 'center' as const, margin: '20px 0 12px 0' }
const ctaButton: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', fontWeight: 700, fontSize: '16px', padding: '14px 28px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block' }
const ctaSecondary: React.CSSProperties = { backgroundColor: '#0a0a0a', color: '#ffffff', fontWeight: 700, fontSize: '15px', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block' }
const muted: React.CSSProperties = { fontSize: '13px', lineHeight: 1.6, color: '#666', margin: '12px 0 0 0' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
