import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import api from '../api';
import Cuisine from '../src/Admin/Screens/Cuisine';

jest.mock('../api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://restaurant.qtechx.com/api',
  default: {
    get: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

async function renderCuisine() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Cuisine onAddCuisine={jest.fn()} onBack={jest.fn()} />,
    );
    await Promise.resolve();
  });
  return renderer!;
}

test('loads and displays all cuisines from the API response', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: {
      success: true,
      data: [
        {
          cuisine_id: 'CUS001',
          cuisine_name: 'South Indian',
          description: 'Dosa, idli, and more',
          status: 'Active',
          featured: true,
        },
        {
          cuisine_id: 'CUS002',
          cuisine_name: 'Thai',
          status: 'Inactive',
        },
      ],
    },
  });
  const renderer = await renderCuisine();
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  const text = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(text).toContain('All Cuisines');
  expect(text).toContain('South Indian');
  expect(text).toContain('Thai');
  expect(text).toContain('Featured');
  expect(api.get).toHaveBeenCalledWith(
    '/cuisines',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  ReactTestRenderer.act(() => renderer.unmount());
});

test('retries a 304 response with a fresh cache key', async () => {
  const get = api.get as jest.Mock;
  get
    .mockRejectedValueOnce({ status: 304, message: 'Server error' })
    .mockResolvedValueOnce({
      data: { success: true, data: [{ cuisine_name: 'Mexican' }] },
    });

  const renderer = await renderCuisine();
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[1][0]).toBe('/cuisines');
  expect(get.mock.calls[1][1].params._refresh).toEqual(expect.any(Number));
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Mexican'),
  ).toBe(true);
  ReactTestRenderer.act(() => renderer.unmount());
});

test('opens the dedicated cuisine form from the cuisines page', async () => {
  const onAddCuisine = jest.fn();
  (api.get as jest.Mock).mockResolvedValue({
    data: { success: true, data: [] },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Cuisine onAddCuisine={onAddCuisine} onBack={jest.fn()} />,
    );
    await Promise.resolve();
  });
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Add cuisine' })
      .props.onPress();
  });

  expect(onAddCuisine).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => renderer!.unmount());
});
