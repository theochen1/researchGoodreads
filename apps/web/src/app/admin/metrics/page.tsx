import { analyticsEventNames } from "@cairn/shared";
import { getBetaMetrics } from "@/lib/server/beta-metrics";

export default async function AdminMetricsPage() {
  const metrics = await getBetaMetrics();

  return (
    <div className="stack">
      <section className="metrics-grid">
        {metrics.metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="account-label">{metric.label}</div>
            <strong>{metric.value.toLocaleString()}</strong>
            <p>{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="surface">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Analytics event</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {analyticsEventNames.map((eventName) => (
                <tr key={eventName}>
                  <td>{eventName}</td>
                  <td>{metrics.eventCounts[eventName].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="page-subtitle">Generated {metrics.generatedAt}</p>
    </div>
  );
}
