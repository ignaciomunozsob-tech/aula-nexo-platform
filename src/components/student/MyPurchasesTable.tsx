import { Link } from 'react-router-dom';
import { BookOpen, Calendar, FileText, CalendarDays, ExternalLink } from 'lucide-react';
import type { PaidOrder } from '@/hooks/useStudentLibrary';

const typeLabel: Record<string, string> = {
  course: 'Curso',
  event: 'Evento',
  ebook: 'E-book',
  community: 'Comunidad',
  session: 'Sesión 1:1',
};

const typeIcon: Record<string, React.ReactNode> = {
  course: <BookOpen className="h-4 w-4 text-primary" />,
  event: <Calendar className="h-4 w-4 text-primary" />,
  ebook: <FileText className="h-4 w-4 text-primary" />,
  session: <CalendarDays className="h-4 w-4 text-primary" />,
};

const clp = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function MyPurchasesTable({
  orders,
  titles,
}: {
  orders: PaidOrder[];
  titles?: Record<string, string>;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr className="text-left text-muted-foreground">
            <th className="p-4 font-medium">Producto</th>
            <th className="p-4 font-medium">Tipo</th>
            <th className="p-4 font-medium">Referencia</th>
            <th className="p-4 font-medium">Monto</th>
            <th className="p-4 font-medium">Fecha</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0">
              <td className="p-4 font-medium">
                <span className="flex items-center gap-2 flex-wrap">
                  {typeIcon[o.product_type]}
                  {titles?.[o.product_id] || 'Producto'}
                </span>

              </td>
              <td className="p-4 text-muted-foreground">{typeLabel[o.product_type] || o.product_type}</td>

              <td className="p-4 font-mono text-xs text-muted-foreground">{o.reference || '—'}</td>
              <td className="p-4">{clp(o.amount_clp)}</td>
              <td className="p-4 text-muted-foreground">
                {new Date(o.paid_at || o.created_at).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="p-4 text-right">
                {o.reference && (
                  <Link
                    to={`/compra-confirmada/${o.reference}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Ver detalle
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
