import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <main className='error-screen' role='alert'>
          <h1>Произошла ошибка</h1>
          <p>Не удалось отобразить игру. Перезагрузите страницу.</p>
          <button type='button' onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
