import { Game } from '@app/game';
import { ErrorBoundary } from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  );
}

export default App;
