import type { Category, CategoryId } from '../../types';

export const CATEGORIES: Category[] = [
  {
    id: 'caos',
    name: 'Caos entre amigos',
    tag: 'CAOS',
    description: 'Rolês que dão errado e gente que faz dar errado.',
    color: '#ff5a36',
    ink: '#190805',
    adult: false,
  },
  {
    id: 'romance',
    name: 'Relacionamentos e dates',
    tag: 'DATES',
    description: 'Crush, ex, vácuo e decisões péssimas.',
    color: '#ff4fa3',
    ink: '#1a0510',
    adult: false,
  },
  {
    id: 'vergonha',
    name: 'Vergonha alheia',
    tag: 'VERGONHA',
    description: 'Aquele momento que ninguém esquece.',
    color: '#ffd23f',
    ink: '#1a1403',
    adult: false,
  },
  {
    id: 'personalidade',
    name: 'Personalidade duvidosa',
    tag: 'DUVIDOSO',
    description: 'Manias, defeitos e traços questionáveis.',
    color: '#57d6ff',
    ink: '#03161d',
    adult: false,
  },
  {
    id: 'dinheiro',
    name: 'Dinheiro e ambição',
    tag: 'GRANA',
    description: 'Pix, golpe, sonho de rico e falência.',
    color: '#2fe39a',
    ink: '#03170e',
    adult: false,
  },
  {
    id: 'festa',
    name: 'Festas e ressaca',
    tag: 'RESSACA',
    description: 'O que acontece no rolê vira pergunta aqui.',
    color: '#b58cff',
    ink: '#12071f',
    adult: false,
  },
  {
    id: 'segredos',
    name: 'Segredos e mentiras',
    tag: 'SEGREDO',
    description: 'Ninguém aqui é tão inocente quanto parece.',
    color: '#6c5cff',
    ink: '#ffffff',
    adult: false,
  },
  {
    id: 'absurdo',
    name: 'Situações absurdas',
    tag: 'ABSURDO',
    description: 'Cenários impossíveis, respostas óbvias.',
    color: '#ffffff',
    ink: '#111014',
    adult: false,
  },
  {
    id: 'semlimites',
    name: 'Sem limites',
    tag: '+18',
    description: 'Adulto e provocativo. Só com o conteúdo pesado ligado.',
    color: '#ff1f3d',
    ink: '#ffffff',
    adult: true,
  },
  {
    id: 'baixaria',
    name: 'Baixaria total',
    tag: 'BAIXARIA',
    description: 'Palavrão e sacanagem sem filtro. Só +18 e só se a mesa topar.',
    color: '#111014',
    ink: '#ff4d5e',
    adult: true,
  },
  {
    id: 'bar',
    name: 'Mesa de bar',
    tag: 'SAIDEIRA',
    description: 'Chope, conta dividida e decisões ruins. Entra junto com o modo bebida.',
    color: '#ffb000',
    ink: '#1a1000',
    adult: false,
  },
  {
    id: 'resenha',
    name: 'Resenha dos caras',
    tag: 'RESENHA',
    description: 'Pelada, churrasco, academia e vacilo. Entra com a opção Só homens.',
    color: '#ff9f1c',
    ink: '#1a0e00',
    adult: false,
    menOnly: true,
  },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const cat = BY_ID.get(id);
  if (!cat) throw new Error(`Categoria desconhecida: ${id}`);
  return cat;
}

export const DEFAULT_CATEGORIES: CategoryId[] = CATEGORIES.filter((c) => !c.adult && !c.menOnly && c.id !== 'bar').map((c) => c.id);
/** Categorias adultas, ligadas junto com o conteúdo pesado. */
export const ADULT_CATEGORIES: CategoryId[] = CATEGORIES.filter((c) => c.adult).map((c) => c.id);

/** Categorias que aparecem na grade de escolha. */
export const PICKABLE_CATEGORIES = CATEGORIES.filter((c) => !c.menOnly);
export const MEN_PACK: CategoryId = 'resenha';
