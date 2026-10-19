// Owner-selected comparison outfit boards. Original files are unchanged.
export const starterProducts = Object.freeze([
  Object.freeze({ id: 'green-trench-details', name: 'Green trench · details', file: 'collage-green-trench-details.png', type: 'image/png', alt: 'Outfit collage: green leather trench, dark trousers, loafers, red sunglasses and earrings' }),
  Object.freeze({ id: 'green-trench-look', name: 'Green trench · full look', file: 'collage-green-trench-look.png', type: 'image/png', alt: 'Outfit collage with reference model, green trench, trousers and accessory close-ups' }),
  Object.freeze({ id: 'burgundy-trench', name: 'Burgundy trench & skirt', file: 'collage-burgundy-trench.png', type: 'image/png', alt: 'Outfit collage: burgundy trench jacket, black blouse and skirt, boots, scarf and sunglasses' }),
  Object.freeze({ id: 'navy-blazer', name: 'Navy blazer & argyle skirt', file: 'collage-navy-blazer.jpg', type: 'image/jpeg', alt: 'Outfit collage: navy blazer, white shirt, black and white argyle skirt and white leg warmers' }),
  Object.freeze({ id: 'leather-denim', name: 'Leather jacket & denim', file: 'collage-leather-denim.jpg', type: 'image/jpeg', alt: 'Outfit collage: black leather jacket, burgundy knit top and blue flared jeans' })
]);

export async function loadStarterProduct(id, base, request = fetch) {
  const item = starterProducts.find(product => product.id === id);
  if (!item) throw new Error('Unknown starter product.');
  const url = new URL('./samples/' + item.file, base);
  const response = await request(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Starter product could not be loaded. Please try selecting it again or add your own product.');
  if (response.headers.get('content-type')?.split(';')[0] !== item.type) throw new Error('Starter product is not a supported image.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error('Starter product image has an invalid size.');
  return new File([blob], item.name + (item.type === 'image/png' ? '.png' : '.jpg'), { type: item.type });
}
