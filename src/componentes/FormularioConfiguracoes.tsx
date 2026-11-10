import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import {
  ANTECEDENCIAS_MIN,
  DIAS_SEMANA,
  esquemaConfiguracoes,
  formatarAntecedencia,
  gerarSlug,
  HORAS_EXPEDIENTE,
  INTERVALOS_MIN,
  JANELAS_DIAS,
  type CamposConfiguracoes,
  type DadosConfiguracoes,
} from '../dominio/configuracoes';
import { formatarDuracao } from '../dominio/servicos';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  inicial: CamposConfiguracoes;
  aoEnviar: (dados: DadosConfiguracoes) => void;
  aoCancelar: () => void;
};

const ESTILO_GRUPO = 'flex flex-col gap-5 rounded-lg border border-borda bg-superficie p-4';
const ESTILO_TITULO = 'text-lg font-semibold';

export default function FormularioConfiguracoes({ inicial, aoEnviar, aoCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CamposConfiguracoes, unknown, DadosConfiguracoes>({
    resolver: zodResolver(esquemaConfiguracoes),
    defaultValues: inicial,
  });

  const dias = useWatch({ control, name: 'dias' });
  const slug = useWatch({ control, name: 'slug' });

  // sugere o link a partir do nome, se ainda não houver um
  const nome = register('nome', {
    onBlur: () => {
      if (!getValues('slug')) setValue('slug', gerarSlug(getValues('nome')));
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-6">
      <fieldset className={ESTILO_GRUPO}>
        <legend className={ESTILO_TITULO}>Seu espaço</legend>
        <Campo
          id="nome"
          rotulo="Nome do espaço"
          dica="Ex.: Espaço Juju"
          erro={errors.nome?.message}
        >
          {(a) => <input {...a} {...nome} type="text" className={ESTILO_CAMPO} />}
        </Campo>
        <Campo
          id="whatsapp"
          rotulo="Seu WhatsApp"
          dica="As clientes avisam você por este número."
          erro={errors.whatsapp?.message}
        >
          {(a) => (
            <input
              {...a}
              {...register('whatsapp')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={ESTILO_CAMPO}
            />
          )}
        </Campo>
        <Campo
          id="endereco"
          rotulo="Endereço (opcional)"
          dica="Vai no lembrete para a cliente."
          erro={errors.endereco?.message}
        >
          {(a) => <textarea {...a} {...register('endereco')} rows={2} className={ESTILO_CAMPO} />}
        </Campo>
        <Campo
          id="slug"
          rotulo="Link da página de agendamento"
          dica={`Seu link: ${window.location.host}/agendar/${slug || 'seu-espaco'}`}
          erro={errors.slug?.message}
        >
          {(a) => (
            <input
              {...a}
              {...register('slug')}
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={ESTILO_CAMPO}
            />
          )}
        </Campo>
      </fieldset>

      <fieldset className={ESTILO_GRUPO}>
        <legend className={ESTILO_TITULO}>Horário de atendimento</legend>
        <p className="text-texto-suave">
          As clientes só veem horários dentro destas faixas. Você ainda pode marcar encaixes fora
          delas.
        </p>
        {DIAS_SEMANA.map((rotulo, i) => {
          const erroFim = errors.dias?.[i]?.fim?.message;
          return (
            <fieldset key={rotulo} className="flex flex-col gap-3 border-t border-borda pt-4">
              <legend className="sr-only">{rotulo}</legend>
              <label htmlFor={`dia-${i}`} className="flex min-h-11 items-center gap-3">
                <input
                  id={`dia-${i}`}
                  type="checkbox"
                  {...register(`dias.${i}.aberto`)}
                  className="size-6 shrink-0 accent-marca"
                />
                <span className="font-medium">{rotulo}</span>
              </label>
              {dias[i]?.aberto ? (
                <div className="grid grid-cols-2 gap-3">
                  <Campo id={`dia-${i}-ini`} rotulo={`Início (${rotulo.toLowerCase()})`}>
                    {(a) => (
                      <select {...a} {...register(`dias.${i}.ini`)} className={ESTILO_CAMPO}>
                        {HORAS_EXPEDIENTE.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                  <Campo
                    id={`dia-${i}-fim`}
                    rotulo={`Fim (${rotulo.toLowerCase()})`}
                    erro={erroFim}
                  >
                    {(a) => (
                      <select {...a} {...register(`dias.${i}.fim`)} className={ESTILO_CAMPO}>
                        {HORAS_EXPEDIENTE.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                </div>
              ) : (
                <p className="text-texto-suave">Sem atendimento.</p>
              )}
            </fieldset>
          );
        })}
      </fieldset>

      <fieldset className={ESTILO_GRUPO}>
        <legend className={ESTILO_TITULO}>Agendamento</legend>
        <Campo
          id="intervalo"
          rotulo="Intervalo depois de cada atendimento"
          dica="Tempo livre para limpar e organizar antes da próxima cliente."
          erro={errors.intervaloMin?.message}
        >
          {(a) => (
            <select {...a} {...register('intervaloMin')} className={ESTILO_CAMPO}>
              {INTERVALOS_MIN.map((m) => (
                <option key={m} value={String(m)}>
                  {m === 0 ? 'Sem intervalo' : formatarDuracao(m)}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          id="antecedencia"
          rotulo="Antecedência mínima para a cliente pedir"
          dica="Ex.: com 2 h, às 10h a cliente só vê horários a partir das 12h."
          erro={errors.antecedenciaMin?.message}
        >
          {(a) => (
            <select {...a} {...register('antecedenciaMin')} className={ESTILO_CAMPO}>
              {ANTECEDENCIAS_MIN.map((m) => (
                <option key={m} value={String(m)}>
                  {formatarAntecedencia(m)}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          id="janela"
          rotulo="Até quantos dias à frente a cliente pode pedir"
          erro={errors.janelaDias?.message}
        >
          {(a) => (
            <select {...a} {...register('janelaDias')} className={ESTILO_CAMPO}>
              {JANELAS_DIAS.map((d) => (
                <option key={d} value={String(d)}>
                  {d} dias
                </option>
              ))}
            </select>
          )}
        </Campo>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={isSubmitting}>
          Salvar configurações
        </Botao>
        <Botao variante="secundario" onClick={aoCancelar}>
          Voltar sem salvar
        </Botao>
      </div>
    </form>
  );
}
