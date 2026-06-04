const http = require('http');
const token = process.argv[2];
if (!token) {
  console.error('Token missing');
  process.exit(1);
}
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/orders/seller/orders',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`
  }
};
const req = http.request(options, res => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('body', data.slice(0, 2000));
  });
});
req.on('error', err => {
  console.error('error', err.message);
});
req.end();
