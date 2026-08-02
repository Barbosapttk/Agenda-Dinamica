export default function App() {
  const originalHtmlUrl =
    import.meta.env.VITE_ORIGINAL_HTML_URL || `${import.meta.env.BASE_URL}original-index.html`;

  return (
    <div className="app-shell">
      <iframe
        className="app-iframe"
        src={originalHtmlUrl}
        title="Agenda Dinâmica"
      />
    </div>
  );
}
