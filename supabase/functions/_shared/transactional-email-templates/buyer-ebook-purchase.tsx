import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props {
  buyerName?: string
  productTitle?: string
  creatorName?: string
  accessUrl?: string
  isNewUser?: boolean
  accountEmail?: string
}

const Email = ({
  buyerName = '',
  productTitle = '—',
  creatorName = '',
  accessUrl = 'https://soynovu.cl/app/my-courses',
  isNewUser = false,
  accountEmail = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu ebook {productTitle} está listo</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>📚 Tu ebook está listo</Heading>
        <Text style={hi}>Hola{buyerName ? ` ${buyerName}` : ''}, gracias por tu compra.</Text>
        <Text style={p}>
          Compraste <strong>{productTitle}</strong>{creatorName ? <> de <strong>{creatorName}</strong></> : null}.
          Ingresa a tu panel para descargarlo.
        </Text>

        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button href={accessUrl} style={btn}>Descargar ebook</Button>
        </Section>

        {isNewUser && (
          <Section style={infoCard}>
            <Text style={infoTitle}>📩 Configura tu contraseña</Text>
            <Text style={infoText}>
              Te enviamos un correo aparte a <strong>{accountEmail}</strong> para que crees tu
              contraseña y accedas a tu ebook.
            </Text>
          </Section>
        )}

        <Text style={footer}>— El equipo NOVU</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d) => `📚 Tu ebook ${(d.productTitle as string) ?? ''} está listo`,
  displayName: 'Comprador · ebook',
  previewData: {
    buyerName: 'Camila',
    productTitle: 'Guía de Copywriting',
    creatorName: 'María Pérez',
    accessUrl: 'https://soynovu.cl/app/my-courses',
    isNewUser: false,
    accountEmail: '',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#0a0a0a', margin: '0 0 8px 0' }
const hi: React.CSSProperties = { fontSize: '15px', color: '#333', margin: '0 0 12px 0' }
const p: React.CSSProperties = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px 0', lineHeight: 1.5 }
const btn: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const infoCard: React.CSSProperties = { backgroundColor: '#fffbe6', borderRadius: '12px', padding: '16px 20px', marginTop: '8px' }
const infoTitle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 6px 0' }
const infoText: React.CSSProperties = { fontSize: '14px', color: '#333', margin: 0, lineHeight: 1.5 }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
