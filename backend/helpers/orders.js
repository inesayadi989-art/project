/**
 * Order helpers - Centralized order functions
 */

// Format order data
const formatOrder = (order) => {
  if (order.shipping_address && typeof order.shipping_address === 'string') {
    try {
      order.shipping_address = JSON.parse(order.shipping_address);
    } catch (e) {
      console.error('Error parsing shipping address:', e);
      order.shipping_address = {};
    }
  }

  if (order.shipping_address) {
    order.ship_full_name = order.shipping_address.full_name || '';
    order.ship_phone = order.shipping_address.phone || '';
    order.ship_address_line1 = order.shipping_address.address_line1 || '';
    order.ship_city = order.shipping_address.city || '';
    order.ship_governorate = order.shipping_address.governorate || '';
  }

  return order;
};

// Restore order stock
const restoreOrderStock = async (db, orderId) => {
  const [items] = await db.execute(
    'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );
  
  for (const item of items) {
    await db.execute(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [item.quantity, item.product_id]
    );
  }
};

// Settle order to store
const settleOrderToStore = async (db, order) => {
  // Implementation depends on business logic
  // This is a placeholder for the pattern
  return {
    settled: true,
    storeId: order.store_id
  };
};

module.exports = {
  formatOrder,
  restoreOrderStock,
  settleOrderToStore
};
