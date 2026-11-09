import { Route, Routes } from 'react-router';
import Hoje from './paginas/manicure/Hoje';
import Agendar from './paginas/publica/Agendar';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hoje />} />
      <Route path="/agendar/:slug" element={<Agendar />} />
    </Routes>
  );
}
