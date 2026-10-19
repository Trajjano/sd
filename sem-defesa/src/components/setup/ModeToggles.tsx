import { Flame, Mars, Wine } from 'lucide-react';
import { useState } from 'react';
import type { CategoryId } from '../../types';
import { ADULT_CATEGORIES } from '../../data/categories';
import { countQuestions } from '../../data/questions';
import { ConfirmSheet } from '../modals/Sheet';
import { Toggle } from '../ui/Controls';

/** Opção "Só homens": mistura o pacote Resenha dos caras às categorias escolhidas. */
export function MenOnlyToggle({ checked, includeHeavy, onChange }: { checked: boolean; includeHeavy: boolean; onChange: (v: boolean) => void }) {
  const n = countQuestions(['resenha'], includeHeavy);
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      label="Só homens"
      description={`Mistura ${n} perguntas de resenha dos caras (pelada, churrasco, academia…) às categorias escolhidas.`}
      icon={<Mars />}
    />
  );
}

/** Modo bebida: liga as regras de gole e a categoria Mesa de bar. */
export function DrinkingToggle({
  checked,
  categories,
  onChange,
}: {
  checked: boolean;
  categories: CategoryId[];
  onChange: (drinking: boolean, categories: CategoryId[]) => void;
}) {
  return (
    <Toggle
      checked={checked}
      onChange={(v) => onChange(v, v && !categories.includes('bar') ? [...categories, 'bar'] : categories)}
      label="Modo bebida"
      description="Mostra quem bebe a cada rodada e inclui perguntas de mesa de bar. Quem não bebe ou vai dirigir troca por água ou refri."
      icon={<Wine />}
    />
  );
}

/** Conteúdo +18: pede confirmação de que todos na mesa são maiores de idade. */
export function HeavyToggle({
  checked,
  categories,
  onChange,
}: {
  checked: boolean;
  categories: CategoryId[];
  onChange: (includeHeavy: boolean, categories: CategoryId[]) => void;
}) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <Toggle
        checked={checked}
        onChange={(v) => (v ? setAsk(true) : onChange(false, categories))}
        label="Conteúdo pesado (+18)"
        description="Libera perguntas ácidas, Sem limites e Baixaria total (com palavrão e sacanagem)."
        icon={<Flame />}
      />
      <ConfirmSheet
        open={ask}
        title="Só pra maiores"
        message="Esse conteúdo tem palavrão, sexo e baixaria pesada. Todo mundo na mesa tem 18 anos ou mais e topa?"
        confirmLabel="Todos têm 18+, liberar"
        cancelLabel="Deixa leve"
        onCancel={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false);
          onChange(true, [...new Set([...categories, ...ADULT_CATEGORIES])]);
        }}
      />
    </>
  );
}
