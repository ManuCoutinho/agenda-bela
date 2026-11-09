export type Faixa = { ini: string; fim: string }; // 'HH:mm'
export type Recorrente = { dia: number; ini: string; fim: string }; // 0 = domingo

export const PASSO = 30;

const min = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;

export const blocosNecessarios = (duracaoMin: number, intervaloMin: number) =>
  Math.ceil((duracaoMin + intervaloMin) / PASSO) * PASSO;

/** RN01, RN03 e RN04: horários de início livres no dia, em passos de 30 min. */
export function horariosLivres(p: {
  data: Date; // meia-noite do dia consultado
  duracaoMin: number;
  intervaloMin: number;
  expediente: Faixa[]; // faixas de trabalho desse dia da semana
  recorrentes: Recorrente[];
  ocupados: Set<string>; // 'HHmm' das travas ativas do dia
  agora: Date;
  antecedenciaMin: number;
}): string[] {
  const total = blocosNecessarios(p.duracaoMin, p.intervaloMin);
  const bloqueios = p.recorrentes.filter((r) => r.dia === p.data.getDay());
  const livres: string[] = [];
  for (const f of p.expediente) {
    for (let ini = min(f.ini); ini + p.duracaoMin <= min(f.fim); ini += PASSO) {
      const inicio = p.data.getTime() + ini * 60_000;
      if (inicio - p.agora.getTime() < p.antecedenciaMin * 60_000) continue;
      let ok = true;
      for (let t = ini; t < ini + total; t += PASSO) {
        if (p.ocupados.has(hhmm(t)) || bloqueios.some((b) => t >= min(b.ini) && t < min(b.fim))) {
          ok = false;
          break;
        }
      }
      if (ok) livres.push(hhmm(ini));
    }
  }
  return livres;
}
