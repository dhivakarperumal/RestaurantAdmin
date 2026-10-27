/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../api', () => ({
  isLoggedIn: jest.fn().mockResolvedValue(false),
  getStoredUser: jest.fn().mockResolvedValue(null),
  loginWithIdentifier: jest.fn(),
  logoutUser: jest.fn(),
  registerUser: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

import App from '../App';

test('renders correctly', async () => {
  const renderers: ReactTestRenderer.ReactTestRenderer[] = [];

  await ReactTestRenderer.act(async () => {
    renderers.push(ReactTestRenderer.create(<App />));
    await Promise.resolve();
  });

  const renderedScreen = JSON.stringify(renderers[0].toJSON());

  expect(renderedScreen).toContain('Buy Food logo');
  expect(renderedScreen).toContain('Restaurant Admin');
  expect(renderedScreen).toContain('Welcome Back!');
  expect(renderedScreen).toContain('Email or Username');
  expect(renderedScreen).toContain('Password');
  expect(renderedScreen).toContain('Sign in');
  expect(renderedScreen).toContain('Register');
});
