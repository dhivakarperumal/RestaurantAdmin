import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import RegisterPage from '../src/Auth/RegisterPage';

async function renderRegisterPage(onRegister: jest.Mock = jest.fn()) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <RegisterPage onRegister={onRegister} onShowLogin={jest.fn()} />,
    );
  });
  return { renderer: renderer!, onRegister };
}

async function enter(
  renderer: ReactTestRenderer.ReactTestRenderer,
  placeholder: string,
  value: string,
) {
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder }).props.onChangeText(value);
  });
}

test('submits valid registration details to the auth handler', async () => {
  const { renderer, onRegister } = await renderRegisterPage(
    jest.fn().mockResolvedValue(undefined),
  );

  await enter(renderer, 'Your name', 'Maya Rivera');
  await enter(renderer, 'you@example.com', 'maya@example.com');
  await enter(renderer, 'Your phone number', '5551234567');
  await enter(renderer, 'Create a password', 'secret123');
  await enter(renderer, 'Enter your password again', 'secret123');

  const submitButton = renderer.root.findByProps({
    accessibilityLabel: 'Create account',
  });
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onPress();
  });

  expect(onRegister).toHaveBeenCalledWith({
    username: 'Maya Rivera',
    email: 'maya@example.com',
    phone: '5551234567',
    password: 'secret123',
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('You are signed in');
});

test('rejects mismatched confirmation without calling the auth handler', async () => {
  const { renderer, onRegister } = await renderRegisterPage();

  await enter(renderer, 'Your name', 'Maya Rivera');
  await enter(renderer, 'you@example.com', 'maya@example.com');
  await enter(renderer, 'Your phone number', '5551234567');
  await enter(renderer, 'Create a password', 'secret123');
  await enter(renderer, 'Enter your password again', 'not-the-same');

  const submitButton = renderer.root.findByProps({
    accessibilityLabel: 'Create account',
  });
  await ReactTestRenderer.act(() => submitButton.props.onPress());

  expect(onRegister).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Passwords do not match');
});
