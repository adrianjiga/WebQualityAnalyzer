import { screen } from '@testing-library/dom';

test('jest-dom matcher works', () => {
  document.body.innerHTML = `<div data-testid="greeting">Hello</div>`;
  const div = screen.getByTestId('greeting');
  expect(div).toBeInTheDocument();
});
