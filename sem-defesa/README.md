# SEM DEFESA

> Seus amigos te conhecem. Esse é o problema.

Party game de votação entre amigos para celular, de 3 a 12 pessoas: uma carta aparece, cada um escolhe em segredo quem mais combina com ela e os votos são revelados com animação.

Dá pra jogar de dois jeitos:
- **Um celular só**: o aparelho passa de mão em mão. Funciona offline, sem servidor.
- **Cada um no seu celular** (online): uma pessoa cria a sala e os outros entram por código ou QR code. Usa Supabase.

Webapp mobile-first, instalável (PWA). Sem conta, sem anúncios. **Para publicar, veja [DEPLOY.md](DEPLOY.md).**

## Rodar

Requer Node 20+ (testado com Node 22).

```bash
npm install        # instala dependências
npm run dev        # modo desenvolvimento (abre na rede local, dá pra testar no celular)
npm test           # testes automatizados (Vitest), incluindo o SQL do modo online
npm run servidor:local  # servidor de teste do modo online (sem Supabase)
npm run build      # build de produção em dist/
npm run preview    # serve o build de produção (necessário para testar PWA/offline)
```

Para testar no celular: rode `npm run dev` (ou `npm run build && npm run preview`) e abra no navegador do celular o endereço "Network" que aparece no terminal (mesma rede Wi-Fi). A instalação como app e o modo offline exigem HTTPS ou `localhost`, então funcionam de verdade depois de publicar em um host com HTTPS (Vercel, Netlify, GitHub Pages etc.).

Build alternativo em arquivo único (sem service worker): `ARTIFACT=1 npx vite build` → `dist-artifact/index.html`.

## Funcionalidades

- **Modo online**: sala com código de 5 letras e QR code, convite pelo WhatsApp (botão compartilhar), lobby ao vivo, anfitrião remove jogadores e muda regras, cada um vota no próprio celular, revelação ao mesmo tempo para todos, "jogar de novo" e "voltar à sala". Se alguém sair no meio, a rodada fecha com quem ficou; o anfitrião também pode encerrar a votação sem esperar. Votos ficam numa tabela que o navegador não consegue ler: só a contagem é publicada.
- **Só homens**: opção ao criar a sala (e na partida local) que intercala o pacote *Resenha dos caras* (26 perguntas) com as categorias escolhidas — uma carta da resenha a cada duas.
- **Três modos**
  - *Votação secreta*: tela de privacidade "Passe o celular para…", voto escondido, selo "Voto guardado" que cobre a escolha.
  - *Votação aberta*: todos apontam juntos, uma pessoa registra o placar (no máximo um voto por jogador).
  - *Sobrevivência social*: o mais votado sai da disputa (continua votando, não recebe mais votos). Empate não elimina. Termina quando sobra uma pessoa ou acabam as rodadas.
- **206 perguntas originais**: 9 categorias com 20 cada, mais o pacote Resenha dos caras (26), incluindo "Sem limites" (+18) e perguntas pesadas que só aparecem com o conteúdo pesado ligado. Cartas vistas recentemente vão pro fim do baralho.
- **Revelação**: suspense, cartas virando em 3D da menos votada para a mais votada, contadores animados, carimbo "Culpado" / "Empate" / "Queimado", confete, mensagens contextuais. Empates destacam todos os empatados, sem escolher vencedor.
- **Tela final**: mais votado (ou sobrevivente), ranking com posições compartilhadas em empate, títulos engraçados por jogador, resumo rodada a rodada, jogar de novo.
- **Persistência local**: configurações, última configuração de partida, estatísticas acumuladas (com botão para apagar) e partida em andamento (retoma após recarregar a página).
- **Sons** sintetizados com Web Audio (nada toca antes de uma interação), vibração em Android, suporte a `prefers-reduced-motion` + opção manual.
- **PWA**: manifesto, ícones, cache offline de todos os recursos (incluindo banco de perguntas e fontes) e aviso de nova versão.

## Estrutura

```
src/
  app/            App (navegação), contexto global, brand.ts (nome/slogan em um só lugar)
  components/     buttons, cards (frente, verso, flip 3D), modals, animations, ui
  screens/        Home, Setup, Gameplay, Reveal, Results, Settings, Stats, HowTo
  game/
    engine/       máquina de estados da partida (match.ts) e baralho (deck.ts)
    rules/        regras de votação, erros de regra, mensagens engraçadas
    scoring/      contagem, empates, resumo da partida, estatísticas acumuladas
    validation/   validação da configuração (3–12 jogadores, nomes, rodadas)
  data/
    categories/   categorias (nome, cor, se é adulta)
    questions/    um arquivo por categoria
  hooks/          useMatch (liga a engine à interface)
  online/         cliente Supabase, sessão do jogador, sincronização da sala
supabase/
  schema.sql      tabelas, permissões e regras do modo online (rodar no SQL Editor)
  schema.test.ts  testes do SQL num Postgres local (PGlite)
scripts/
  servidor-local.mjs  imita o Supabase localmente para testes
  services/       storage (localStorage), audio (Web Audio), haptics
  styles/         tokens de cor/tipografia (Tailwind v4 @theme) e texturas
  types/          tipos do jogo
```

A lógica do jogo (`src/game`) é pura e não importa React. Fases: `question → handoff ⇄ voting → reveal → question … → finished` (ou `question → open-voting → reveal` no modo aberto). Qualquer ação fora de fase lança `GameRuleError` e o estado não muda.

## Editar conteúdo

- **Trocar o nome do jogo**: `src/app/brand.ts` (e `name`/`short_name` do manifest em `vite.config.ts`, mais o `<title>` de `index.html`, se quiser no ícone instalado).
- **Adicionar/remover perguntas**: edite o arquivo da categoria em `src/data/questions/` — uma linha por pergunta, em `normal` ou `heavy`.
- **Nova categoria**: adicione o id em `CategoryId` (`src/types`), a entrada em `src/data/categories`, crie o arquivo de perguntas e inclua em `src/data/questions/index.ts`.

## Testes

40 testes. Os do SQL (`supabase/schema.test.ts`) rodam o `schema.sql` de verdade num Postgres local e conferem: criação e entrada em sala, nomes repetidos, só o anfitrião comanda, voto duplicado e em si mesmo bloqueados, navegador sem acesso a votos/segredos, rodadas, sobrevivência, saída no meio da partida e sala cheia. Os demais ( `src/game/game.test.ts` e `src/services/storage.test.ts`) cobrem: banco de perguntas, validação de jogadores, registro de votos, bloqueio de voto duplicado/fora da vez/em si mesmo, encerramento da votação, contagem, empates, progressão de rodadas, encerramento antecipado, reinício, votação aberta, sobrevivência, estatísticas e persistência.

## Limitações conhecidas

- No modo de um celular só, o voto secreto é protegido pelo fluxo da interface, não contra quem inspecionar o aparelho (a partida em andamento fica salva localmente). No online, os votos ficam protegidos no servidor.
- O modo online precisa de internet e não tem a votação aberta (lá todo mundo já vota no próprio celular).
- Entrar numa sala só é possível no lobby; quem chega depois espera o anfitrião "voltar à sala".
- Estatísticas agrupam jogadores pelo nome digitado.
- Vibração não funciona no iPhone (limitação do Safari).
