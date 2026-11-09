import { useParams } from 'react-router';

export default function Agendar() {
  const { slug } = useParams();
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-semibold text-marca">Agendar horário</h1>
      <p className="mt-2">Página pública de {slug}</p>
    </main>
  );
}
