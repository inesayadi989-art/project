const fs = require('fs');

(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller@souk.tn', password: 'seller123' }),
    });
    const loginBody = await loginRes.text();
    console.log('LOGIN_STATUS', loginRes.status);
    console.log('LOGIN_BODY', loginBody);
    if (!loginRes.ok) return;
    const token = JSON.parse(loginBody).token;

    const form = new FormData();
    form.append('store_id', '1');
    form.append('category_id', '37');
    form.append('name', 'test product');
    form.append('description', 'desc');
    form.append('price', '20');
    form.append('stock', '50');
    form.append('compare_price', '0');
    form.append('tags[]', 'test');

    const createRes = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const createBody = await createRes.text();
    console.log('CREATE_STATUS', createRes.status);
    console.log('CREATE_BODY', createBody);
  } catch (err) {
    console.error('ERR', err);
  }
})();
