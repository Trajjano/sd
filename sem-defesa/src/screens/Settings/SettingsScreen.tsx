import { Sparkles, Trash2, UserRoundX, Vibrate, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { Settings } from '../../types';
import { useApp } from '../../app/AppContext';
import { BRAND } from '../../app/brand';
import { Button } from '../../components/buttons/Button';
import { ConfirmSheet } from '../../components/modals/Sheet';
import { SectionTitle, Toggle } from '../../components/ui/Controls';
import { Screen, ScreenHeader } from '../../components/ui/Screen';
import { clearStats } from '../../services/storage';
import { emptyLifetimeStats } from '../../game/scoring/summary';

const MOTION_OPTIONS: { id: Settings['motion']; label: string }[] = [
  { id: 'system', label: 'Do sistema' },
  { id: 'full', label: 'Completas' },
  { id: 'reduced', label: 'Reduzidas' },
];

export function SettingsScreen({ onBack, toast }: { onBack: () => void; toast: (msg: string) => void }) {
  const { settings, updateSettings, store, setStats, sfx } = useApp();
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen className="safe-bottom">
      <ScreenHeader onBack={onBack} center={<span className="display text-[22px]">Configurações</span>} />

      <section className="mt-5 flex flex-col gap-2">
        <SectionTitle>Jogo</SectionTitle>
        <Toggle
          checked={settings.sound}
          onChange={(sound) => updateSettings({ sound })}
          label="Efeitos sonoros"
          description="Sons de carta, seleção e revelação."
          icon={<Volume2 />}
        />
        <Toggle
          checked={settings.haptics}
          onChange={(haptics) => updateSettings({ haptics })}
          label="Vibração"
          description="Pequenas vibrações em celulares compatíveis."
          icon={<Vibrate />}
        />
        <Toggle
          checked={settings.allowSelfVote}
          onChange={(allowSelfVote) => updateSettings({ allowSelfVote })}
          label="Pode votar em si mesmo"
          description="Vale para votação secreta e sobrevivência."
          icon={<UserRoundX />}
        />
      </section>

      <section className="mt-8">
        <SectionTitle>Animações</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-inset ring-white/10" role="radiogroup" aria-label="Animações">
          {MOTION_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={settings.motion === o.id}
              onClick={() => {
                sfx('select', 6);
                updateSettings({ motion: o.id });
              }}
              className={`min-h-[46px] rounded-xl text-[14px] font-extrabold transition-colors ${
                settings.motion === o.id ? 'bg-acid text-ink' : 'text-white/70 active:bg-white/10'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-start gap-2 text-[13px] text-white/50">
          <Sparkles className="mt-0.5 size-4 shrink-0" /> "Do sistema" respeita a opção de movimento reduzido do celular.
        </p>
      </section>

      <section className="mt-8">
        <SectionTitle>Dados</SectionTitle>
        <p className="mb-3 text-[14px] leading-snug text-white/55">
          Tudo fica salvo só neste aparelho: configurações, nomes da última partida e estatísticas. Nada é enviado para servidores.
        </p>
        <Button variant="secondary" block icon={<Trash2 />} onClick={() => setConfirm(true)}>
          Apagar estatísticas
        </Button>
      </section>

      <section className="mt-8 mb-4 rounded-2xl bg-white/[0.03] p-4 text-[13px] leading-relaxed text-white/45 ring-1 ring-inset ring-white/5">
        <strong className="text-white/70">{BRAND.name}</strong> é um jogo presencial para um único aparelho. O voto secreto é
        escondido pelo fluxo da tela, mas não é um sistema de segurança contra quem inspecionar o celular. Versão {__APP_VERSION__}.
      </section>

      <ConfirmSheet
        open={confirm}
        title="Apagar tudo?"
        message="As estatísticas acumuladas de todas as partidas serão apagadas deste aparelho. Não tem como desfazer."
        confirmLabel="Apagar estatísticas"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          clearStats(store);
          setStats(emptyLifetimeStats());
          setConfirm(false);
          toast('Estatísticas apagadas.');
        }}
      />
    </Screen>
  );
}
