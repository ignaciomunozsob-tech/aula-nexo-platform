import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props {
  recipientName?: string
  productLabel?: string
  creatorName?: string
  reviewUrl?: string
}

const Email = ({ recipientName = '', productLabel = 'producto', creatorName = '', reviewUrl = 'https://soynovu.cl' }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Deja tu evaluación para que otras personas conozcan sobre su servicio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>¿Qué te pareció el {productLabel} de {creatorName}?</Heading>
        <Text style={hi}>Hola{recipientName ? ` ${recipientName}` : ''},</Text>
        <Text style={p}>Deja tu evaluación para que otras personas conozcan sobre su servicio.</Text>
        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button href={reviewUrl} style={btn}>Dejar evaluación</Button>
        </Section>
        <Text style={small}>Tu evaluación puede ser pública con tu nombre o anónima. Este enlace es personal y solo puede utilizarse una vez.</Text>
        <Text style={footer}>— El equipo NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `¿Qué te pareció el ${String(d.productLabel ?? 'producto').toUpperCase()} de ${String(d.creatorName ?? '').toUpperCase()}?`,
  displayName: 'Solicitud de evaluación',
  previewData: {
    recipientName: 'Camila',
    productLabel: 'curso',
    creatorName: 'María Pérez',
    reviewUrl: 'https://soynovu.cl/evaluar/demo',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 18px 0', lineHeight: 1.25 }
const hi: React.CSSProperties = { fontSize: '15px', color: '#333', margin: '0 0 12px 0' }
const p: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0', lineHeight: 1.5 }
const small: React.CSSProperties = { fontSize: '13px', color: '#666', lineHeight: 1.5, margin: '0' }
const btn: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
