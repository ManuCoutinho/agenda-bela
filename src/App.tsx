import { Route, Routes } from 'react-router';
import Clientes from './paginas/manicure/Clientes';
import EditarAtendimento from './paginas/manicure/EditarAtendimento';
import EditarCliente from './paginas/manicure/EditarCliente';
import EditarServico from './paginas/manicure/EditarServico';
import Entrar from './paginas/manicure/Entrar';
import Hoje from './paginas/manicure/Hoje';
import LayoutManicure from './paginas/manicure/LayoutManicure';
import Mais from './paginas/manicure/Mais';
import Semana from './paginas/manicure/Semana';
import Servicos from './paginas/manicure/Servicos';
import Agendar from './paginas/publica/Agendar';

export default function App() {
  return (
    <Routes>
      <Route path="/agendar/:slug" element={<Agendar />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route element={<LayoutManicure />}>
        <Route index element={<Hoje />} />
        <Route path="semana" element={<Semana />} />
        <Route path="atendimentos/novo" element={<EditarAtendimento />} />
        <Route path="atendimentos/:id" element={<EditarAtendimento />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/nova" element={<EditarCliente />} />
        <Route path="clientes/:id" element={<EditarCliente />} />
        <Route path="mais" element={<Mais />} />
        <Route path="mais/servicos" element={<Servicos />} />
        <Route path="mais/servicos/novo" element={<EditarServico />} />
        <Route path="mais/servicos/:id" element={<EditarServico />} />
      </Route>
    </Routes>
  );
}
