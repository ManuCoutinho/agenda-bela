import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import {
  esquemaBloqueio,
  HORAS_BLOQUEIO,
  type CamposBloqueio,
  type DadosBloqueio,
} from '../dominio/bloqueios';
import { DIAS_SEMANA } from '../dominio/configuracoes';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  inicial: CamposBloqueio;
  aoEnviar: (dados: DadosBloqueio) => Promise<void> | void;
  aoCancelar: () => void;
  erroEnvio?: string;
};

const TIPOS = [
  { valor: 'pontual', rotulo: 'Só um dia', dica: 'Ex.: dentista, folga' },
  { valor: 'recorrente', rotulo: 'Toda semana', dica: 'Ex.: terapia, curso' },
] as const;

export default function FormularioBloqueio({ inicial, aoEnviar, aoCancelar, erroEnvio }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CamposBloqueio, unknown, DadosBloqueio>({
    resolver: zodResolver(esquemaBloqueio),
    defaultValues: inicial,
  });
  const tipo = useWatch({ control, name: 'tipo' });

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Repetir</legend>
        {TIPOS.map((t) => (
          <label key={t.valor} className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              value={t.valor}
              {...register('tipo')}
              className="size-6 shrink-0 accent-marca"
            />
            <span>
              {t.rotulo} <span className="text-texto-suave">({t.dica})</span>
            </span>
          </label>
        ))}
      </fieldset>

      {tipo === 'pontual' ? (
        <Campo id="data" rotulo="Dia" erro={errors.data?.message}>
          {(a) => <input {...a} {...register('data')} type="date" className={ESTILO_CAMPO} />}
        </Campo>
      ) : (
        <Campo id="dia" rotulo="Dia da semana" erro={errors.dia?.message}>
          {(a) => (
            <select {...a} {...register('dia')} className={ESTILO_CAMPO}>
              {DIAS_SEMANA.map((nome, i) => (
                <option key={nome} value={String(i)}>
                  {nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Campo id="ini" rotulo="Das" erro={errors.ini?.message}>
          {(a) => (
            <select {...a} {...register('ini')} className={ESTILO_CAMPO}>
              {HORAS_BLOQUEIO.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo id="fim" rotulo="Até" erro={errors.fim?.message}>
          {(a) => (
            <select {...a} {...register('fim')} className={ESTILO_CAMPO}>
              {HORAS_BLOQUEIO.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </div>

      <Campo
        id="descricao"
        rotulo="Descrição (opcional)"
        dica="Só você vê. As clientes veem apenas que o horário não está livre."
        erro={errors.descricao?.message}
      >
        {(a) => <input {...a} {...register('descricao')} type="text" className={ESTILO_CAMPO} />}
      </Campo>

      {erroEnvio && (
        <p role="alert" className="text-erro">
          {erroEnvio}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar bloqueio'}
        </Botao>
        <Botao variante="secundario" onClick={aoCancelar}>
          Voltar sem salvar
        </Botao>
      </div>
    </form>
  );
}
