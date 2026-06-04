const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIyLCJlbWFpbCI6InNlbGxlcjFAc291ay50biIsInJvbGUiOiJzZWxsZXIiLCJpYXQiOjE3ODAxNjgwMDEsImV4cCI6MTc4MDc3MjgwMX0.gx8O03DRnee_06sxqxGHykUuDrCEyDoagSE2621TE30';

(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/orders/seller/orders', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('status', response.status);
    console.log('ok', response.ok);
    const text = await response.text();
    console.log(text);
  } catch (error) {
    console.error('error', error);
  }
})();
