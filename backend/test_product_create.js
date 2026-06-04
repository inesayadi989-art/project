const http = require('http');
const querystring = require('querystring');

async function test() {
  // Step 1: Login
  console.log('Logging in...');
  const loginData = JSON.stringify({
    email: 'seller@souk.tn',
    password: 'seller123'
  });

  return new Promise((resolve) => {
    const loginReq = http.request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const loginRes = JSON.parse(data);
          console.log('Login status:', res.statusCode);
          console.log('Login response:', JSON.stringify(loginRes, null, 2));
          
          if (!loginRes.token) {
            console.log('No token received');
            resolve();
            return;
          }

          // Step 2: Create product
          console.log('\nCreating product...');
          const productData = querystring.stringify({
            name: 'Test Product',
            description: 'Test Description',
            price: '20',
            stock: '50',
            category_id: '1'
          });

          const createReq = http.request('http://localhost:5000/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Bearer ' + loginRes.token,
              'Content-Length': Buffer.byteLength(productData)
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('Create status:', res.statusCode);
              console.log('Create response:', data);
              resolve();
            });
          });

          createReq.on('error', (e) => {
            console.error('Create request error:', e);
            resolve();
          });

          createReq.write(productData);
          createReq.end();
        } catch (e) {
          console.error('Login parse error:', e);
          resolve();
        }
      });
    });

    loginReq.on('error', (e) => {
      console.error('Login request error:', e);
      resolve();
    });

    loginReq.write(loginData);
    loginReq.end();
  });
}

test();
