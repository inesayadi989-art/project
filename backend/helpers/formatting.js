/**
 * Formatting helpers - Centralized formatting functions
 */

// Build full image URL
const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
};

// Format product response
const formatProduct = (product, req) => {
  return {
    ...product,
    image_url: buildImageUrl(req, product.image_url)
  };
};

// Format order response
const formatOrder = (order, items = []) => {
  return {
    ...order,
    items: items || []
  };
};

module.exports = {
  buildImageUrl,
  formatProduct,
  formatOrder
};
