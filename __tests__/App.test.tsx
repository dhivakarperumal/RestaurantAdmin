/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  const renderers: ReactTestRenderer.ReactTestRenderer[] = [];

  await ReactTestRenderer.act(() => {
    renderers.push(ReactTestRenderer.create(<App />));
  });

  const renderedScreen = JSON.stringify(renderers[0].toJSON());

  expect(renderedScreen).toContain('Restaurant Admin');
  expect(renderedScreen).toContain('Dashboard');
  expect(renderedScreen).toContain('Orders');
  expect(renderedScreen).toContain('Menu');
  expect(renderedScreen).toContain('Profile');
});
