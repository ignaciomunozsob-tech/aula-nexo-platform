// Definitions for the fixed-block checkout page template.
export type BlockType =
  | 'hero'
  | 'video'
  | 'benefits'
  | 'testimonials'
  | 'guarantee'
  | 'faq'
  | 'countdown'
  | 'summary'
  | 'checkout_button';

export interface CheckoutBlock {
  id: string;
  type: BlockType;
  enabled: boolean;
  data: Record<string, any>;
}

export interface CheckoutTheme {
  primary: string;
  background: string;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Encabezado',
  video: 'Video',
  benefits: 'Beneficios',
  testimonials: 'Testimonios',
  guarantee: 'Garantía',
  faq: 'Preguntas frecuentes',
  countdown: 'Cuenta regresiva',
  summary: 'Resumen de compra',
  checkout_button: 'Botón de pago',
};

export const LOCKED_BLOCKS: BlockType[] = ['summary', 'checkout_button'];

export const DEFAULT_BLOCKS: CheckoutBlock[] = [
  {
    id: 'hero',
    type: 'hero',
    enabled: true,
    data: {
      title: 'Tu próxima gran inversión',
      subtitle: 'Acceso inmediato y para siempre.',
      imageUrl: '',
    },
  },
  {
    id: 'video',
    type: 'video',
    enabled: false,
    data: { url: '' },
  },
  {
    id: 'benefits',
    type: 'benefits',
    enabled: true,
    data: {
      title: 'Lo que incluye',
      items: ['Acceso de por vida', 'Comunidad privada', 'Soporte directo'],
    },
  },
  {
    id: 'testimonials',
    type: 'testimonials',
    enabled: false,
    data: {
      title: 'Lo que dicen los alumnos',
      items: [
        { name: 'María G.', text: 'Cambió mi forma de trabajar.', rating: 5 },
      ],
    },
  },
  {
    id: 'guarantee',
    type: 'guarantee',
    enabled: true,
    data: {
      title: 'Garantía de 7 días',
      text: 'Si no te convence, te devolvemos el 100%.',
    },
  },
  {
    id: 'faq',
    type: 'faq',
    enabled: false,
    data: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿Cuándo recibo el acceso?', a: 'Inmediatamente después del pago.' },
      ],
    },
  },
  {
    id: 'countdown',
    type: 'countdown',
    enabled: false,
    data: {
      title: 'Oferta termina pronto',
      endsAt: '',
    },
  },
  { id: 'summary', type: 'summary', enabled: true, data: {} },
  { id: 'checkout_button', type: 'checkout_button', enabled: true, data: { label: 'Comprar ahora' } },
];

export const DEFAULT_THEME: CheckoutTheme = {
  primary: '#004aad',
  background: '#ffffff',
};
