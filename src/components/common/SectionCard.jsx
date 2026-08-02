export default function SectionCard({ title, icon, children, actions }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><i className={`fa-solid ${icon}`} /> {title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}
