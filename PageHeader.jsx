export default function PageHeader({ eyebrow="Cusachs Hub", title, description, actions }) {
  return <header className="page-header">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="header-actions">{actions}</div>}
  </header>;
}
