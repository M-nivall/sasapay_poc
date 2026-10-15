import { useState, useEffect, useRef } from 'react';

export default function App() {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tx, setTx] = useState(null); // { reference, status, receipt, message }
  const timer = useRef(null);

  // Poll the backend until the payment is no longer pending
  useEffect(() => {
    if (!tx || tx.status !== 'PENDING') return;

    let attempts = 0;
    timer.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/status?ref=${tx.reference}`);
        const data = await res.json();
        if (data.status && data.status !== 'PENDING') {
          setTx(data);
        } else if (attempts >= 40) {
          // ~2 minutes with no callback
          setTx({ ...tx, status: 'TIMEOUT', message: 'No response received' });
        }
      } catch {
        /* ignore, retry on next tick */
      }
    }, 3000);

    return () => clearInterval(timer.current);
  }, [tx?.reference, tx?.status]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTx(null);
    setLoading(true);
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setTx({ reference: data.reference, status: 'PENDING' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTx(null);
    setError('');
  }

  return (
    <div className="page">
      <div className="card">
        <h1>SasaPay POC</h1>
        <p className="sub">C2B payment request (sandbox)</p>

        {!tx && (
          <form onSubmit={handleSubmit}>
            <label>Phone number</label>
            <input
              type="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <label>Amount (KES)</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {error && <div className="alert error">{error}</div>}
            <button disabled={loading}>{loading ? 'Sending…' : 'Pay'}</button>
          </form>
        )}

        {tx?.status === 'PENDING' && (
          <div className="alert info">
            Check your phone and approve the payment…
            <small>Ref: {tx.reference}</small>
          </div>
        )}

        {tx?.status === 'SUCCESS' && (
          <div className="alert success">
            Payment successful{tx.receipt ? ` — receipt ${tx.receipt}` : ''}
            <small>Ref: {tx.reference}</small>
          </div>
        )}

        {(tx?.status === 'FAILED' || tx?.status === 'TIMEOUT') && (
          <div className="alert error">
            Payment {tx.status === 'FAILED' ? 'failed' : 'timed out'}
            {tx.message ? ` — ${tx.message}` : ''}
            <small>Ref: {tx.reference}</small>
          </div>
        )}

        {tx && tx.status !== 'PENDING' && (
          <button onClick={reset}>New payment</button>
        )}
      </div>
    </div>
  );
}
