export default function App() {
  const originalHtmlUrl =
    import.meta.env.VITE_ORIGINAL_HTML_URL || `${import.meta.env.BASE_URL}original-index.html`;
  const iframeUrl = new URL(originalHtmlUrl, window.location.href);
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost && new URLSearchParams(window.location.search).get('sem-login') === '1') {
    iframeUrl.searchParams.set('sem-login', '1');
  }

  return (
    <div className="app-shell">
      <iframe
        className="app-iframe"
        src={iframeUrl.toString()}
        title="Agenda Dinâmica"
      />
    </div>
  );
}
