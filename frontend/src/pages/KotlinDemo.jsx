import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, PageHeader, Spinner } from '../components/ui.jsx';

/** Shows the output of the Kotlin code from Experiments 5 and 6 (served by GET /api/demo/kotlin). */
export default function KotlinDemo() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/demo/kotlin').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Kotlin Lab" subtitle="Data types, collections, OOP, exception handling and map/filter/reduce — running inside the backend." />
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="kotlin-grid">
          {Object.entries(data).map(([section, lines]) => (
            <section key={section} className="panel">
              <h2>{section}</h2>
              <pre className="code">{lines.join('\n')}</pre>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
