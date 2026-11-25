# Agenda Bela

PWA de agenda para uma manicure: área dela (login Google) e página pública `/agendar/:slug` onde clientes pedem horário. Sem servidor próprio: Firebase (Auth, Firestore, Hosting) no plano Spark, sem Cloud Functions.

- Visão geral, como rodar e modelo de dados para quem chega: `README.md`.
- Plano, status e próximos passos: `docs/plano-execucao.md` (fora do Git, como todo o `docs/`). Fluxo kanban: leia a seção "Quadro (kanban)" antes de começar e siga a ordem de "A fazer". Pendências da usuária em `docs/pendencias.md`; roteiro do dia da entrega (26/11/2026) em `docs/roteiro-entrega.md`.
- Requisitos (RF/RNF/RN/HU), modelo de dados e decisões: _Guia técnico – Agenda Bela_ (documento externo; o plano resume).

## Comandos

Gerenciador: **pnpm** (não usar npm/yarn para dependências do projeto).

```bash
pnpm dev            # http://localhost:5173
pnpm lint
pnpm test           # domínio e telas (Vitest, jsdom)
pnpm test:regras    # firestore.rules no emulador (precisa de Java 21 e firebase CLI)
pnpm build
firebase deploy --only firestore   # regras: deploy manual, nunca pelo CI (gera antes com o UID do .env.local)
```

## Ambiente (WSL)

- Node via nvm; o Firebase CLI está instalado no Node 22.14.0. Em shells não interativos, rode `source ~/.nvm/nvm.sh && nvm use 22.14.0` antes de `pnpm`/`firebase`.
- Firebase CLI logado em `espacojuju.unhas@gmail.com`; projeto `agenda-bela-bb595` (`.firebaserc`).
- `.env.local` (fora do Git) já tem a configuração `VITE_FIREBASE_*` e o `UID_OWNER`. `VITE_USAR_EMULADOR=true` aponta o app para o emulador.
- UID da manicure fora do Git: `firestore.rules` tem o marcador `__UID_DA_MANICURE__`; `scripts/gerar-regras.mjs` gera `.firebase/firestore.rules` (predeploy do `firebase deploy`, `pnpm regras:gerar` antes de subir o emulador; `--teste` usa um UID fictício). Trocar a dona = trocar `UID_OWNER` e publicar.
- Pelo Windows (caminho `\\wsl.localhost\…`) o Git recusa o repositório por "dubious ownership": use `git -c safe.directory=* …` ou rode pelo WSL (`wsl.exe -d Ubuntu-24.04 -- bash -lc 'cd ~/www/agenda-bela && …'`).

## Git

- Commits assinados só pela usuária (identidade do `git config`): sem `Co-Authored-By` nem outra menção ao Claude em commits e PRs.
- Não usar `gh`. Git só pela CLI padrão; PR e merge pelo site do GitHub.
- Push por SSH (o `origin` tem `pushurl` `git@github.com:ManuCoutinho/agenda-bela.git`); o Claude envia a branch e entrega título/descrição do PR para a usuária abrir no site.
- `main` protegida: branch por história (`feat/rf02-clientes`), Conventional Commits citando o requisito (`feat(RF02): …`), PR com o check `verificar`.
- Confira a branch antes de todo commit: depois de um merge o repositório local costuma estar na `main` (já houve commit direto na `main` por isso).
- CI (`.github/workflows/ci.yml`): `verificar` (lint → test → test:regras → build) → `previa` em PR / `producao` na `main`.
- Lembretes (`.github/workflows/lembretes.yml`): cron 21:00 UTC (18h em SP) roda `scripts/lembretes.mjs` com `firebase-admin` e manda push FCM se houver atendimento amanhã.

## Arquitetura

Dependências só apontam para baixo:

1. `src/paginas/` – telas e rotas; não acessam o Firebase.
2. `src/componentes/` – visuais, recebem props, não buscam dados.
3. `src/hooks/` – ligam telas aos dados (`useAuth`, …).
4. `src/servicos/` – único lugar que importa `firebase/*`.
5. `src/dominio/` – regras puras, sem React nem Firebase.

Testes ao lado do arquivo (`.test.ts(x)`); testes de regras em `testes/regras/`.

Dados no Firestore: `config/publico` (único com leitura pública: nome, slug, expediente, serviços, pausa, instagram, `mesesAbertos` AAAAMM), `config/pagamento` (chave Pix e % do sinal), `config/notificacoes` (tokens FCM), `config/acesso` (sonda de acesso no login), `config/migracoes` – esses só da dona; `clientes`, `agendamentos`, `bloqueios` (só dona); `pedidos` (visitante cria em lote com as travas; desde a 0.2.0 já `confirmado`, `pendente` só nos antigos; depois `aprovado|recusado|expirado`; `serieId` no horário fixo, `chave` do aparelho, `substitui` na remarcação); `travas` (uma por hora, `AAAA-MM-DD_HH00`; definitivas levam `pedidoId`; a remarcação as libera com `expiraEm` no passado); `series` (horário fixo, pedidos `${serieId}_${data}`); `portal/{chave}` (só `get`, cópia de "Meus horários" gravada pela dona); `solicitacoes` (cancelamento pedido pela cliente). A cliente só mexe num horário dela com 24 h ou mais: pelo portal ou pelo pedido com a mesma chave. O app da dona converte os pedidos confirmados (`useConversaoPedidos`, remarcações primeiro) com `aprovarPedido` em transação (`src/servicos/pedidos.ts`): confirma as travas, cria o agendamento (cliente nova com id `wa-<whatsapp>`) ou troca o horário do antigo, e põe o aviso na fila. A página pública não lê agendamentos (RNF07).

## Convenções

- Domínio em inglês (`Agendamento`, `travas`, `horariosLivres`); convenções do ecossistema em inglês (`use…`, `on…`).
- Datas: fuso `America/Sao_Paulo`, `date-fns` + `@date-fns/tz` com `ptBR`; IDs de trava `AAAA-MM-DD_HH00` (horários de hora em hora; travas antigas de :30 contam como a hora inteira).
- Calendário: visão de mês estilo celular em `src/componentes/Calendario.tsx`, a partir do Calendar do shadcn/ui (`react-day-picker`, MIT) com os tokens do tema; dias como `AAAA-MM-DD` (conversões e marcas por dia em `src/dominio/calendario.ts`). A aba Agenda é carregada sob demanda (`lazy`).
- Carregamento: `Carregando` (spinner, texto só para leitor de tela). FAB só com ícone (`rotulo` vira `aria-label`).
- Mensagens à usuária dizem o que fazer, sem códigos técnicos. Sem `console.log`.
- Acessibilidade: alvos ≥ 48 px (`min-h-12`, padrão do Android), texto ≥ 16 px (mesmo onde o Material usa 12–14), rótulo em todo campo, contraste 4,5:1.
- Visual de app Android (Material 3), 1 dp = 1 px CSS: tela = `BarraSuperior` (64 dp, seta de voltar) + conteúdo com 16 dp nas laterais + `Fab` para a ação principal + `BarraInferior` (80 dp); confirmações pelo snackbar `Aviso`. Use as classes de `src/componentes/estilos.ts` (`ESTILO_BOTAO`, `ESTILO_CAMPO` 56 dp, `ESTILO_LISTA`/`ESTILO_ITEM_LISTA`) e os ícones de `Icone.tsx`; espaçamento em múltiplos de 4/8 dp; tipografia `text-titulo`/`text-secao`; fonte do sistema (Roboto).
- Cores só pelos tokens do `@theme` em `src/index.css` (Happy Hues nº 7 com o rosa `#c9637b` do Espaço Juju): `moldura` (fundo do app e barra superior; sobre ela só texto `texto`), `marca`, `marca-escura`, `marca-suave`, `marca-decorativa` (pontos do calendário/enfeite, nunca texto), `fundo` (folha do conteúdo: `ESTILO_FOLHA`), `superficie`, `container` (barra de navegação), `texto`, `texto-suave`, `borda`, `borda-campo`, `erro` e os estados `marcado`, `livre`, `bloqueado`, `pendente`. O ESLint recusa a paleta padrão do Tailwind (`text-gray-700`, `bg-white`, `[#hex]`). Combinação nova de cores entra em `PARES` de `src/tema.test.ts`, que confere o contraste AA.
- Toda mudança em `firestore.rules` vem com teste em `testes/regras/`.
- Versões fixadas: TypeScript ~6.0 e ESLint 9 (typescript-eslint e jsx-a11y ainda não suportam TS 7 / ESLint 10).
- Vitest: em `beforeEach`, use chaves – uma função retornada vira rotina de limpeza.
