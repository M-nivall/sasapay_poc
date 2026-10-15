require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requestPayment } = require('./sasapay');
const store = require('./store');

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// Start a payment
app.post('/api/pay', async (req, res) => {
  try {
    let phone = String(req.body.phone || '').replace(/\D/g, '');
    const amount = req.body.amount;

    // Normalise 07XXXXXXXX / 7XXXXXXXX -> 2547XXXXXXXX
    if (/^0\d{9}$/.test(phone)) phone = '254' + phone.slice(1);
    else if (/^[17]\d{8}$/.test(phone)) phone = '254' + phone;

    if (!/^254[17]\d{8}$/.test(phone)) {
      return res.status(422).json({ error: 'Enter a valid Kenyan phone number' });
    }
    if (isNaN(Number(amount)) || Number(amount) < 1) {
      return res.status(422).json({ error: 'Amount must be at least 1' });
    }

    const reference = 'POC' + Date.now() + Math.floor(Math.random() * 900 + 100);
    const amountStr = Number(amount).toFixed(2);

    const result = await requestPayment({ phone, amount: amountStr, reference });

    store.save(reference, {
      reference,
      phone,
      amount: amountStr,
      status: 'PENDING',
      checkoutRequestId: result.CheckoutRequestID || null,
      initResponse: result,
      createdAt: new Date().toISOString(),
    });

    res.json({ reference, sasapay: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SasaPay calls this when the customer pays or cancels
app.post('/api/callback', (req, res) => {
  const body = req.body || {};
  store.logCallback(body);

  const ref = body.BillRefNumber || body.AccountReference;
  if (ref && store.get(ref)) {
    const ok = String(body.ResultCode) === '0';
    store.save(ref, {
      status: ok ? 'SUCCESS' : 'FAILED',
      resultMsg: body.ResultDesc || '',
      receipt: body.TransID || null,
      callback: body,
      updatedAt: new Date().toISOString(),
    });
  }
  res.json({ status: 'received' });
});

// Frontend polls this
app.get('/api/status', (req, res) => {
  const tx = store.get(String(req.query.ref || ''));
  if (!tx) return res.status(404).json({ error: 'Not found' });
  res.json({
    reference: tx.reference,
    status: tx.status,
    amount: tx.amount,
    receipt: tx.receipt || null,
    message: tx.resultMsg || null,
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Node backend on http://localhost:${PORT}`));
