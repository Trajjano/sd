import { Beer } from 'lucide-react';
import { countQuestions } from '../../data/questions';
import { Toggle } from '../ui/Controls';

/** Opção "Só homens": mistura o pacote Resenha dos caras nas categorias escolhidas. */
export function MenOnlyToggle({ checked, includeHeavy, onChange }: { checked: boolean; includeHeavy: boolean; onChange: (v: boolean) => void }) {
  const n = countQuestions(['resenha'], includeHeavy);
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      label="Só homens"
      description={`Mistura ${n} perguntas de resenha dos caras (pelada, churrasco, academia…) às categorias escolhidas.`}
      icon={<Beer />}
    />
  );
}
