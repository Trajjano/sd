// Tipos centrais do jogo. Nenhum tipo aqui depende de React.

export type CategoryId =
  | 'caos'
  | 'romance'
  | 'vergonha'
  | 'personalidade'
  | 'dinheiro'
  | 'festa'
  | 'segredos'
  | 'absurdo'
  | 'semlimites'
  | 'baixaria'
  | 'bar'
  | 'resenha';

export interface Category {
  id: CategoryId;
  name: string;
  /** Rótulo curto usado no adesivo da carta. */
  tag: string;
  description: string;
  /** Cor principal da categoria (fundo do adesivo). */
  color: string;
  /** Cor do texto sobre `color`. */
  ink: string;
  /** Categoria inteira só aparece com o conteúdo pesado ativado. */
  adult: boolean;
  /** Pacote que só entra com a opção "Só homens" (não aparece na grade). */
  menOnly?: boolean;
}

export interface Question {
  id: string;
  text: string;
  category: CategoryId;
  /** Pergunta mais pesada; só entra com o conteúdo pesado ativado. */
  heavy?: boolean;
}

export interface Player {
  id: string;
  name: string;
  /** Id do bonequinho (src/data/avatars.tsx). */
  avatar?: string;
}

export type GameMode = 'secret' | 'open' | 'survival';

export interface MatchConfig {
  players: Player[];
  rounds: number;
  categories: CategoryId[];
  includeHeavy: boolean;
  mode: GameMode;
  allowSelfVote: boolean;
  /** Grupo só de homens: mistura o pacote "Resenha dos caras" no baralho. */
  menOnly?: boolean;
  /** Modo bebida: mostra quem bebe a cada revelação. */
  drinking?: boolean;
}

export interface Vote {
  voterId: string;
  targetId: string;
  /** Justificativa opcional (aparece anônima na revelação). */
  comment?: string;
}

export interface VoteComment {
  targetId: string;
  text: string;
}

/** Contagem de votos por jogador (id -> votos). */
export type Tally = Record<string, number>;

export interface RoundResult {
  round: number;
  question: Question;
  mode: GameMode;
  tally: Tally;
  totalVotes: number;
  /** Todos os jogadores com o maior número de votos (mais de um = empate). */
  topIds: string[];
  topCount: number;
  isTie: boolean;
  /** Modo sobrevivência: quem saiu da disputa nesta rodada (null se empate). */
  eliminatedId: string | null;
  /** Candidatos que podiam receber votos nesta rodada. */
  candidateIds: string[];
  /** Justificativas anônimas (ordem alfabética, para não entregar quem votou). */
  comments?: VoteComment[];
}

export type MatchPhase =
  | 'question' // carta na mesa, todos leem
  | 'handoff' // tela de privacidade: passe o celular
  | 'voting' // jogador da vez escolhe em segredo
  | 'open-voting' // registro coletivo (votação aberta)
  | 'reveal' // revelação dos votos
  | 'finished';

export interface MatchState {
  id: string;
  config: MatchConfig;
  phase: MatchPhase;
  /** Rodada atual (1-based). */
  round: number;
  deck: Question[];
  deckIndex: number;
  question: Question;
  /** Votos da rodada atual (somente modo secreto/sobrevivência). */
  votes: Vote[];
  /** Ordem de votação da rodada atual. */
  voterOrder: string[];
  voterIndex: number;
  history: RoundResult[];
  /** Modo sobrevivência: quem ainda está na disputa. */
  survivors: string[];
  startedAt: number;
  finishedAt: number | null;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Permite votar em si mesmo (padrão: não). */
  allowSelfVote: boolean;
  /** 'system' respeita prefers-reduced-motion. */
  motion: 'system' | 'reduced' | 'full';
}

export interface SetupDraft {
  names: string[];
  rounds: number;
  categories: CategoryId[];
  includeHeavy: boolean;
  mode: GameMode;
  menOnly?: boolean;
  drinking?: boolean;
  /** Avatar de cada jogador, na mesma ordem de `names`. */
  avatars?: string[];
}

export interface PlayerLifetime {
  name: string;
  avatar?: string;
  matches: number;
  votesReceived: number;
  roundsOnTop: number;
  titles: number;
}

export interface LifetimeStats {
  matches: number;
  rounds: number;
  votes: number;
  ties: number;
  byMode: Record<GameMode, number>;
  /** Indexado pelo nome normalizado. */
  players: Record<string, PlayerLifetime>;
  lastPlayedAt: number | null;
}

export interface PlayerSummary {
  player: Player;
  votesReceived: number;
  roundsOnTop: number;
  bestRound: number;
  /** Rodada em que saiu da disputa (sobrevivência). */
  eliminatedInRound: number | null;
  rank: number;
}

export interface MatchSummary {
  roundsPlayed: number;
  totalVotes: number;
  ranking: PlayerSummary[];
  /** Mais votados da partida (mais de um = empate). */
  champions: string[];
  championVotes: number;
  ties: number;
  /** Modo sobrevivência: quem terminou na disputa. */
  survivors: string[];
  mode: GameMode;
}
