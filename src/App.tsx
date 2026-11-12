import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import PaginaNaoEncontrada from './paginas/PaginaNaoEncontrada';
import Clientes from './paginas/manicure/Clientes';
import Configuracoes from './paginas/manicure/Configuracoes';
import EditarAtendimento from './paginas/manicure/EditarAtendimento';
import EditarCliente from './paginas/manicure/EditarCliente';
import EditarServico from './paginas/manicure/EditarServico';
import Entrar from './paginas/manicure/Entrar';
import Hoje from './paginas/manicure/Hoje';
import ImportarClientes from './paginas/manicure/ImportarClientes';
import LayoutManicure from './paginas/manicure/LayoutManicure';
import Mais from './paginas/manicure/Mais';
import Servicos from './paginas/manicure/Servicos';
import Agendar from './paginas/publica/Agendar';

// O calendário (FullCalendar) só é baixado ao abrir a aba Agenda.
const Agenda = lazy(() => import('./paginas/manicure/Agenda'));

const carregandoAgenda = (
  <p role="status" className="p-6 text-center text-texto-suave">
    Carregando agenda…
  </p>
);

export default function App() {
  return (
    <Routes>
      <Route path="/agendar/:slug" element={<Agendar />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route element={<LayoutManicure />}>
        <Route index element={<Hoje />} />
        <Route
          path="agenda"
          element={
            <Suspense fallback={carregandoAgenda}>
              <Agenda />
            </Suspense>
          }
        />
        <Route path="semana" element={<Navigate to="/agenda" replace />} />
        <Route path="atendimentos/novo" element={<EditarAtendimento />} />
        <Route path="atendimentos/:id" element={<EditarAtendimento />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/nova" element={<EditarCliente />} />
        <Route path="clientes/importar" element={<ImportarClientes />} />
        <Route path="clientes/:id" element={<EditarCliente />} />
        <Route path="mais" element={<Mais />} />
        <Route path="mais/configuracoes" element={<Configuracoes />} />
        <Route path="mais/servicos" element={<Servicos />} />
        <Route path="mais/servicos/novo" element={<EditarServico />} />
        <Route path="mais/servicos/:id" element={<EditarServico />} />
      </Route>
      <Route path="*" element={<PaginaNaoEncontrada />} />
    </Routes>
  );
}
