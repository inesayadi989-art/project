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
          
          if (!loginRes.token) {
            console.log('No token received');
            resolve();
            return;
          }

          // Step 2: Create a product first
          console.log('\n--- Creating product ---');
          const createData = querystring.stringify({
            name: 'Test Product for Update',
            description: 'Original description',
            price: '20',
            stock: '50',
            category_id: '1'
          });

          const createReq = http.request('http://localhost:5000/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Bearer ' + loginRes.token,
              'Content-Length': Buffer.byteLength(createData)
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const createRes = JSON.parse(data);
                console.log('Create status:', res.statusCode);
                console.log('Create response:', JSON.stringify(createRes, null, 2));
                
                if (!createRes.productId) {
                  console.log('No productId received');
                  resolve();
                  return;
                }

                const productId = createRes.productId;

                // Step 3: Update the product
                console.log('\n--- Updating product ---');
                const updateData = querystring.stringify({
                  name: 'Updated Product Name',
                  description: 'Updated description',
                  price: '25',
                  stock: '100',
                  category_id: '1'
                });

                const updateReq = http.request(`http://localhost:5000/api/products/${productId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer ' + loginRes.token,
                    'Content-Length': Buffer.byteLength(updateData)
                  }
                }, (res) => {
                  let data = '';
                  res.on('data', chunk => data += chunk);
                  res.on('end', () => {
                    try {
                      const updateRes = JSON.parse(data);
                      console.log('Update status:', res.statusCode);
                      console.log('Update response:', JSON.stringify(updateRes, null, 2));

                      // Step 4: Delete the product
                      console.log('\n--- Deleting product ---');
                      const deleteReq = http.request(`http://localhost:5000/api/products/${productId}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': 'Bearer ' + loginRes.token
                        }
                      }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                          try {
                            const deleteRes = JSON.parse(data);
                            console.log('Delete status:', res.statusCode);
                            console.log('Delete response:', JSON.stringify(deleteRes, null, 2));
                            resolve();
                          } catch (e) {
                            console.log('Delete status:', res.statusCode);
                            console.log('Delete response:', data);
                            resolve();
                          }
                        });
                      });

                      deleteReq.on('error', (e) => {
                        console.error('Delete error:', e.message);
                        resolve();
                      });
                      deleteReq.end();
                    } catch (e) {
                      console.error('Parse error:', e);
                      resolve();
                    }
                  });
                });

                updateReq.on('error', (e) => {
                  console.error('Update error:', e.message);
                  resolve();
                });
                updateReq.write(updateData);
                updateReq.end();
              } catch (e) {
                console.error('Parse error:', e);
                resolve();
              }
            });
          });

          createReq.on('error', (e) => {
            console.error('Create error:', e.message);
            resolve();
          });
          createReq.write(createData);
          createReq.end();
        } catch (e) {
          console.error('Parse error:', e);
          resolve();
        }
      });
    });

    loginReq.on('error', (e) => {
      console.error('Login error:', e.message);
      resolve();
    });
    loginReq.write(loginData);
    loginReq.end();
  });
}

test();
