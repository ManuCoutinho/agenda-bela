import Botao from '../../componentes/Botao';
import { rotuloDia, rotuloHora } from '../../dominio/agenda';
import { useConflitosDeHora } from '../../hooks/useMigracoes';
import { dispensarConflitosDeHora } from '../../servicos/migracoes';

/** I05: horários que caíram na mesma hora quando as travas passaram a ser de 1 h. */
export default function AjusteHorarios() {
  const conflitos = useConflitosDeHora();
  if (conflitos.length === 0) return null;
  return (
    <section
      aria-labelledby="titulo-ajuste"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
    >
      <h2 id="titulo-ajuste" className="text-secao font-medium">
        Confira estes horários
      </h2>
      <p>
        Agora a agenda anda de hora em hora. Estes horários ficaram na mesma hora; se precisar,
        remarque um deles:
      </p>
      <ul className="flex flex-col gap-2">
        {conflitos.map((c) => (
          <li key={c.trava}>
            <span className="font-medium first-letter:uppercase">
              {rotuloDia(c.trava.slice(0, 10))}, {rotuloHora(c.trava.slice(11))}:
            </span>{' '}
            {c.rotulos.join(' e ')}
          </li>
        ))}
      </ul>
      <Botao variante="secundario" onClick={dispensarConflitosDeHora}>
        Entendi
      </Botao>
    </section>
  );
}
