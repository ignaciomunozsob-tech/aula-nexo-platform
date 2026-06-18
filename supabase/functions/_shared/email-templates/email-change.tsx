/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  email?: string
  newEmail?: string
}

export const EmailChangeEmail = ({ confirmationUrl, email, newEmail }: EmailChangeProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de correo en NOVU</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirma tu nuevo correo</Heading>
        <Text style={text}>
          Estás cambiando tu correo de NOVU
          {email ? <> de <strong>{email}</strong></> : null}
          {newEmail ? <> a <strong>{newEmail}</strong></> : null}.
        </Text>
        <Text style={text}>Confirma el cambio haciendo clic en el botón:</Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar cambio
        </Button>
        <Text style={footer}>
          Si no fuiste tú, ignora este correo y tu cuenta no se modificará.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#fcc70e',
  color: '#1a1600',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '14px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#8a8a8a', margin: '32px 0 0', lineHeight: '1.5' }
