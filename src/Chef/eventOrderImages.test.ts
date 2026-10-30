import {
  getEventDishImageUrl,
  getFoodImageUrl,
} from './eventOrderImages';

const apiBaseUrl = 'https://restaurant.qtechx.com/api';

describe('event order dish image resolution', () => {
  it('prefers the event item product_image over empty food image fields', () => {
    expect(
      getEventDishImageUrl(
        {
          food_images: [],
          product_image: '/uploads/foods/paneer.jpg',
        },
        apiBaseUrl,
      ),
    ).toBe('https://restaurant.qtechx.com/uploads/foods/paneer.jpg');
  });

  it('reads JSON-encoded image arrays and object URL values', () => {
    expect(
      getEventDishImageUrl(
        { product_image: '[{"url":"uploads/foods/rice.jpg"}]' },
        apiBaseUrl,
      ),
    ).toBe('https://restaurant.qtechx.com/uploads/foods/rice.jpg');
  });

  it('replaces localhost URLs with the configured backend host', () => {
    expect(
      getEventDishImageUrl(
        { product_image: 'http://localhost:5000/uploads/foods/curry.jpg' },
        apiBaseUrl,
      ),
    ).toBe('https://restaurant.qtechx.com/uploads/foods/curry.jpg');
  });

  it('encodes spaces in relative image paths', () => {
    expect(
      getEventDishImageUrl(
        { product_image: '/uploads/foods/paneer butter.jpg' },
        apiBaseUrl,
      ),
    ).toBe('https://restaurant.qtechx.com/uploads/foods/paneer%20butter.jpg');
  });

  it('resolves current food images from the food API response', () => {
    expect(
      getFoodImageUrl(
        { food_images: ['uploads/foods/ice-cream.jpg'] },
        apiBaseUrl,
      ),
    ).toBe('https://restaurant.qtechx.com/uploads/foods/ice-cream.jpg');
  });
});
