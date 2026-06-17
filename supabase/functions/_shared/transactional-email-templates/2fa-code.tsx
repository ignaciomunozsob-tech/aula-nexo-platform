import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  code?: string
}

const Email = ({ name, code = '000000' }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación NOVU: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>NOVU</Text>
        </Section>
        <Heading style={h1}>Código de verificación</Heading>
        <Text style={text}>Hola{name ? ` ${name}` : ''},</Text>
        <Text style={text}>
          Detectamos un inicio de sesión en tu cuenta de creador. Usa este código para verificar tu identidad:
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={muted}>
          ⏱️ Este código expira en <strong>30 minutos</strong>.
        </Text>
        <Text style={muted}>
          Si no intentaste iniciar sesión, ignora este correo o contacta a soporte.
        </Text>
        <Text style={footer}>Este es un correo automático de NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Código de verificación - NOVU',
  displayName: 'Código 2FA creador',
  previewData: { name: 'Ignacio', code: '482913' },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 24px',
}
const header: React.CSSProperties = { textAlign: 'left' as const, marginBottom: '24px' }
const brand: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: '#0a0a0a',
  margin: 0,
}
const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0a0a0a',
  margin: '0 0 24px 0',
}
const text: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#1a1a1a',
  margin: '0 0 16px 0',
}
const codeBox: React.CSSProperties = {
  backgroundColor: '#fcc70e',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const codeText: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '36px',
  fontWeight: 800,
  letterSpacing: '10px',
  color: '#0a0a0a',
  margin: 0,
}
const muted: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#666',
  margin: '0 0 12px 0',
}
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#999',
  textAlign: 'center' as const,
  marginTop: '32px',
}
