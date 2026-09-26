import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children before an error', () => {
    const boundary = new ErrorBoundary({ children: 'Игра' });

    expect(boundary.render()).toBe('Игра');
  });

  it('shows a recovery screen after an error', () => {
    const boundary = new ErrorBoundary({ children: 'Игра' });
    boundary.state = ErrorBoundary.getDerivedStateFromError();

    const markup = renderToStaticMarkup(boundary.render());

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Произошла ошибка');
    expect(markup).toContain('Перезагрузить страницу');
    expect(markup).not.toContain('Игра');
  });
});
