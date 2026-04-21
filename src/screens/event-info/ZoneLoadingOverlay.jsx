export default function ZoneLoadingOverlay() {
  return (
    <div className="is-zone-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="is-zone-loading-card" aria-hidden="true">
        <div className="is-zone-loading-dots" aria-hidden="true">
          <span className="is-zone-loading-dot" />
          <span className="is-zone-loading-dot" />
          <span className="is-zone-loading-dot" />
        </div>
      </div>
    </div>
  );
}
