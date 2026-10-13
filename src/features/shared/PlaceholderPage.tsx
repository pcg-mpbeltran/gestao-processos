import { Construction } from 'lucide-react'

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-content">
      <section className="page-heading"><div><span className="eyebrow">Próximo marco</span><h1>{title}</h1><p>{description}</p></div></section>
      <section className="panel placeholder-panel"><span><Construction size={28} /></span><h2>Módulo preparado para evolução</h2><p>A navegação e os contratos básicos já existem. A implementação funcional será feita no marco correspondente, em uma branch própria.</p></section>
    </div>
  )
}

