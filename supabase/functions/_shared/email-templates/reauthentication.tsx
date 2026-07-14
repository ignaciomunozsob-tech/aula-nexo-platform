/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Img,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { LOGO_URL } from './brand.ts'

interface ReauthEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación NOVU</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>Código de verificación</Heading>
        <Text style={text}>
          Usa este código para confirmar la acción en tu cuenta NOVU. Expira en pocos minutos.
        </Text>
        <Text style={codeBox}>{token}</Text>
        <Text style={footer}>
          Si no solicitaste este código, ignora este correo y revisa la seguridad de tu cuenta.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const codeBox = {
  display: 'inline-block',
  backgroundColor: '#fcc70e',
  color: '#1a1600',
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.3em',
  padding: '16px 24px',
  borderRadius: '14px',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#8a8a8a', margin: '32px 0 0', lineHeight: '1.5' }

const logo = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
