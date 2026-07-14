import * as React from 'npm:react@18.3.1'
import {
  Body, Img, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL } from './brand.ts'

interface Props { name?: string }

const Email = ({ name }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Bienvenido a NOVU — empieza a vender tu conocimiento hoy.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NOVU" width="56" height="56" style={logo} />
        <Heading style={h1}>¡Bienvenido a NOVU{name ? `, ${name}` : ''}!</Heading>
        <Text style={text}>
          Tu cuenta de creador ya está activa. NOVU es <strong>gratis</strong>: sólo cobramos 10% por venta.
        </Text>
        <Text style={text}>Para empezar a vender, completa estos 3 pasos:</Text>
        <Section style={steps}>
          <Text style={step}><strong>1.</strong> Completa tu perfil público.</Text>
          <Text style={step}><strong>2.</strong> Conecta tu cuenta de MercadoPago para recibir pagos.</Text>
          <Text style={step}><strong>3.</strong> Crea tu primer producto (curso, ebook, evento o sesión 1:1).</Text>
        </Section>
        <Section style={ctaBox}>
          <Button href="https://soynovu.cl/creator-app" style={ctaButton}>
            Ir a mi panel
          </Button>
        </Section>
        <Text style={muted}>
          ¿Necesitas ayuda? Escríbenos por WhatsApp al +56 9 3372 8004.
        </Text>
        <Text style={footer}>NOVU — Vende lo que sabes</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '¡Bienvenido a NOVU! 🎉',
  displayName: 'Bienvenida creador',
  previewData: { name: 'Ignacio' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brand: React.CSSProperties = { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#0a0a0a', margin: '0 0 24px 0' }
const h1: React.CSSProperties = { fontSize: '26px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 20px 0', lineHeight: 1.3 }
const text: React.CSSProperties = { fontSize: '16px', lineHeight: 1.6, color: '#1a1a1a', margin: '0 0 16px 0' }
const steps: React.CSSProperties = { backgroundColor: '#fafafa', borderRadius: '12px', padding: '20px 24px', margin: '20px 0' }
const step: React.CSSProperties = { fontSize: '15px', lineHeight: 1.7, color: '#1a1a1a', margin: '0 0 8px 0' }
const ctaBox: React.CSSProperties = { textAlign: 'center' as const, margin: '32px 0 24px 0' }
const ctaButton: React.CSSProperties = { backgroundColor: '#fcc70e', color: '#0a0a0a', fontWeight: 700, fontSize: '16px', padding: '14px 28px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block' }
const muted: React.CSSProperties = { fontSize: '14px', lineHeight: 1.6, color: '#666', margin: '24px 0 0 0' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#999', textAlign: 'center' as const, marginTop: '32px' }
const logo: React.CSSProperties = { display: 'block', margin: '0 0 24px 0', borderRadius: '12px' }
