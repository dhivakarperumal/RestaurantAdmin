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
  expect(renderedScreen).toContain('Welcome back');
  expect(renderedScreen).toContain('Email or phone number');
  expect(renderedScreen).toContain('Password');
  expect(renderedScreen).toContain('Sign in');
  expect(renderedScreen).toContain('Create account');
});
