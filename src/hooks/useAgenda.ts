import { useEffect, useState } from 'react';
import { inicioEm, somarDias, type Agendamento } from '../dominio/agenda';
import {
  observarAgendamento,
  observarAgendamentos,
  observarOcupados,
  observarOcupadosNoPeriodo,
} from '../servicos/agenda';

/**
 * Resultado guardado junto com a chave da consulta que o produziu: quando a
 * chave muda (outro dia, outro id), o resultado antigo não é mostrado.
 */
type Resultado<T> = { chave: string; dados: T; erro: boolean };

function derivar<T>(r: Resultado<T> | null, chave: string, vazio: T) {
  const atual = r?.chave === chave ? r : null;
  return { dados: atual?.dados ?? vazio, carregando: !atual, erro: atual?.erro ?? false };
}

const aoFalhar =
  <T>(chave: string, vazio: T, definir: (r: Resultado<T>) => void) =>
  (erro: Error) => {
    console.error(erro);
    definir({ chave, dados: vazio, erro: true });
  };

const SEM_AGENDAMENTOS: Agendamento[] = [];
const NENHUM_OCUPADO: ReadonlySet<string> = new Set();

/** Atendimentos de `dias` dias a partir de `primeiroDia` (AAAA-MM-DD). */
export function useAgendamentos(primeiroDia: string, dias: number) {
  const chave = `${primeiroDia}+${dias}`;
  const [r, setR] = useState<Resultado<Agendamento[]> | null>(null);

  useEffect(
    () =>
      observarAgendamentos(
        inicioEm(primeiroDia, '0000'),
        inicioEm(somarDias(primeiroDia, dias), '0000'),
        (dados) => setR({ chave, dados, erro: false }),
        aoFalhar(chave, SEM_AGENDAMENTOS, setR),
      ),
    [chave, primeiroDia, dias],
  );

  return derivar(r, chave, SEM_AGENDAMENTOS);
}

/** Um atendimento; `dados` é `null` se não existe (ou sem `id`). */
export function useAgendamento(id: string | undefined) {
  const chave = id ?? '';
  const [r, setR] = useState<Resultado<Agendamento | null> | null>(null);

  useEffect(() => {
    if (!chave) return;
    return observarAgendamento(
      chave,
      (dados) => setR({ chave, dados, erro: false }),
      aoFalhar(chave, null, setR),
    );
  }, [chave]);

  if (!chave) return { dados: null, carregando: false, erro: false };
  return derivar(r, chave, null);
}

/** Horas (HHmm) ocupadas no dia (AAAA-MM-DD). */
export function useOcupados(data: string) {
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(data);
  const [r, setR] = useState<Resultado<ReadonlySet<string>> | null>(null);

  useEffect(() => {
    if (!valida) return;
    return observarOcupados(
      data,
      (dados) => setR({ chave: data, dados, erro: false }),
      aoFalhar(data, NENHUM_OCUPADO, setR),
    );
  }, [data, valida]);

  if (!valida) return { dados: NENHUM_OCUPADO, carregando: false, erro: false };
  return derivar(r, data, NENHUM_OCUPADO);
}

const NENHUM_DIA: ReadonlyMap<string, ReadonlySet<string>> = new Map();

/**
 * Horas ocupadas por dia entre `de` e `ate` (AAAA-MM-DD). Sem período, não
 * consulta nada. Voltar a um mês visto há pouco custa só o que mudou nele
 * (o Firestore retoma a escuta).
 */
export function useOcupadosNoPeriodo(de: string, ate: string) {
  const chave = de && ate ? `${de}..${ate}` : '';
  const [r, setR] = useState<Resultado<ReadonlyMap<string, ReadonlySet<string>>> | null>(null);

  useEffect(() => {
    if (!chave) return;
    return observarOcupadosNoPeriodo(
      de,
      ate,
      (dados) => setR({ chave, dados, erro: false }),
      aoFalhar(chave, NENHUM_DIA, setR),
    );
  }, [chave, de, ate]);

  if (!chave) return { dados: NENHUM_DIA, carregando: false, erro: false };
  return derivar(r, chave, NENHUM_DIA);
}
