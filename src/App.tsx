import { Route, Routes } from 'react-router';
import Clientes from './paginas/manicure/Clientes';
import Entrar from './paginas/manicure/Entrar';
import Hoje from './paginas/manicure/Hoje';
import LayoutManicure from './paginas/manicure/LayoutManicure';
import Mais from './paginas/manicure/Mais';
import Semana from './paginas/manicure/Semana';
import Agendar from './paginas/publica/Agendar';

export default function App() {
  return (
    <Routes>
      <Route path="/agendar/:slug" element={<Agendar />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route element={<LayoutManicure />}>
        <Route index element={<Hoje />} />
        <Route path="semana" element={<Semana />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="mais" element={<Mais />} />
      </Route>
    </Routes>
  );
}
