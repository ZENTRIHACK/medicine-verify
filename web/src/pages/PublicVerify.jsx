import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { strings, statusText, statusClass, eventLabel, ocrText, alertText } from '../lib/lexicon';

function displayValue(value) {
  if (value == null || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

const FIELD_LABELS = {
  productName: 'Product name',
  batchNo: 'Batch number',
  expiry: 'Expiry',
  quantity: 'Quantity',
  id: 'Actor ID',
  name: 'Name',
  role: 'Role',
  place: 'Place'
};

function fieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

export default function PublicVerify() {
  const { serial } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRecord(null);
    setOcrResult(null);
    api.verifySerial(serial)
      .then((result) => { if (active) setRecord(result); })
      .catch(() => { if (active) setError('Unable to load verification details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [serial]);

  async function handleOcrUpload(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setError('');
    setOcrResult(null);
    try {
      setOcrResult(await api.verifyOcr(file, serial));
    } catch {
      setError('Unable to process the uploaded image.');
    } finally {
      setOcrLoading(false);
      input.value = '';
    }
  }

  if (loading) return <main className="page-container"><p>Loading…</p></main>;

  const status = record?.status;
  const bannerClass = statusClass(status);

  return (
    <main className="page-container">
      {error && <div className="alert alert--flag" role="alert">{error}</div>}
      {record && (
        <>
          <div className={`status-banner status-banner--${bannerClass}`} role="status">
            {statusText(status)}
          </div>
          <section className="card">
            <h1>Product details</h1>
            {record.product ? (
              <dl className="details-list">
                {Object.entries(record.product).map(([key, value]) => (
                  <div className="details-row" key={key}>
                    <dt>{fieldLabel(key)}</dt>
                    <dd>{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>No product details available.</p>
            )}
          </section>
          <section className="card">
            <h2>Current Holder</h2>
            {record.currentHolder ? (
              <dl className="details-list">
                {Object.entries(record.currentHolder).map(([key, value]) => (
                  <div className="details-row" key={key}>
                    <dt>{fieldLabel(key)}</dt>
                    <dd>{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>No current holder information.</p>
            )}
          </section>
          <section className="card">
            <h2>Custody Trail</h2>
            {record.trail?.length ? (
              <ol className="trail-list">
                {record.trail.map((entry, index) => (
                  <li className="trail-item" key={`${entry.at || 'event'}-${index}`}>
                    <strong>{eventLabel(entry.type)}</strong>
                    <span>Actor: {displayValue(entry.actorName)}</span>
                    <span>Place: {displayValue(entry.place)}</span>
                    <time>{displayValue(entry.at)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No custody events recorded.</p>
            )}
          </section>
          {record.flags?.length > 0 && (
            <section className="card">
              <h2>Flags</h2>
              <ul className="flag-list">
                {record.flags.map((flag, index) => (
                  <li className="alert alert--flag" key={index}>{alertText(flag)}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="card">
            <h2>Image check</h2>
            <label htmlFor="ocr-image">Choose or capture a product image</label>
            <input id="ocr-image" type="file" accept="image/*" capture="environment" onChange={handleOcrUpload} />
            {ocrLoading && <p>Processing image…</p>}
            {ocrResult && (
              <div className="ocr-result">
                <p>{ocrText(ocrResult.match)}</p>
                {ocrResult.differences?.length > 0 && (
                  <ul>
                    {ocrResult.differences.map((difference, index) => (
                      <li key={index}>
                        {difference && typeof difference === 'object'
                          ? displayValue(difference.message ?? difference.field ?? difference)
                          : displayValue(difference)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {!record && !error && <p>{strings.status.unknown}</p>}
      <p className="disclaimer">{strings.disclaimer}</p>
    </main>
  );
}
