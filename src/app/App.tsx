import { Game } from '@app/game';
import { initGameLoopEvents } from '@features/game-loop';

function App() {
  initGameLoopEvents();

  return <Game />;
}

export default App;
