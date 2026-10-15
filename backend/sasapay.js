require('dotenv').config();

const BASE = process.env.SASAPAY_BASE_URL;
let cached = { token: null, expiresAt: 0 };

async function call(method, path, body, headers) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid response from SasaPay: ' + text);
  }
}

async function getToken() {
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;

  const basic = Buffer.from(
    `${process.env.SASAPAY_CLIENT_ID}:${process.env.SASAPAY_CLIENT_SECRET}`
  ).toString('base64');

  const data = await call(
    'GET',
    '/auth/token/?grant_type=client_credentials',
    null,
    { Authorization: `Basic ${basic}` }
  );
  if (!data.access_token) throw new Error('SasaPay auth failed: ' + JSON.stringify(data));

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
  };
  return cached.token;
}

async function requestPayment({ phone, amount, reference }) {
  const token = await getToken();
  return call(
    'POST',
    '/payments/request-payment/',
    {
      MerchantCode: process.env.SASAPAY_MERCHANT_CODE,
      NetworkCode: '63902', // M-PESA
      Currency: 'KES',
      Amount: amount,
      PhoneNumber: phone,
      AccountReference: reference,
      TransactionDesc: 'POC payment',
      CallBackURL: process.env.CALLBACK_URL,
    },
    { Authorization: `Bearer ${token}` }
  );
}

module.exports = { getToken, requestPayment };
