import { motion } from 'motion/react';
import { Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Button } from '../../components/buttons/Button';
import { ConfirmSheet } from '../../components/modals/Sheet';
import { CountUp } from '../../components/animations/Effects';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { SectionTitle } from '../../components/ui/Controls';
import { Screen, ScreenHeader } from '../../components/ui/Screen';
import { clearStats } from '../../services/storage';
import { emptyLifetimeStats } from '../../game/scoring/summary';

export function StatsScreen({ onBack, onStart, toast }: { onBack: () => void; onStart: () => void; toast: (m: string) => void }) {
  const { stats, store, setStats } = useApp();
  const [confirm, setConfirm] = useState(false);
  const players = Object.values(stats.players).sort(
    (a, b) => b.titles - a.titles || b.votesReceived - a.votesReceived || a.name.localeCompare(b.name),
  );

  return (
    <Screen className="safe-bottom">
      <ScreenHeader onBack={onBack} center={<span className="display text-[22px]">Estatísticas</span>} />

      {stats.matches === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
            animate={{ rotate: -6, scale: 1, opacity: 1 }}
            className="card-back card-shadow mb-6 h-36 w-28 rounded-2xl"
          />
          <h2 className="display text-[34px]">Ficha limpa</h2>
          <p className="mt-2 max-w-[28ch] text-[15px] text-white/55">Nenhuma partida terminada neste aparelho ainda. Bora sujar essa ficha.</p>
          <Button className="mt-6" icon={<Play />} onClick={onStart}>
            Começar partida
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { label: 'partidas', value: stats.matches },
              { label: 'rodadas', value: stats.rounds },
              { label: 'votos', value: stats.votes },
              { label: 'empates', value: stats.ties },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                <CountUp to={s.value} className="display block text-[40px] leading-none" />
                <span className="label mt-1 block text-white/50">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-white/45">
            Secreta {stats.byMode.secret} · Aberta {stats.byMode.open} · Sobrevivência {stats.byMode.survival}
          </p>

          <section className="mt-8 flex-1">
            <SectionTitle aside="títulos · votos">Hall da fama (ou da vergonha)</SectionTitle>
            <ol className="flex flex-col gap-2">
              {players.map((p, i) => (
                <motion.li
                  key={p.name + i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10"
                >
                  <span className="display w-6 text-center text-[20px] text-white/45">{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-extrabold">{p.name}</div>
                    <div className="text-[12px] text-white/50">
                      {p.matches} {p.matches === 1 ? 'partida' : 'partidas'} · {p.roundsOnTop} no topo
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display text-[22px] leading-none text-acid">{p.titles}</div>
                    <div className="text-[12px] text-white/50">{p.votesReceived} votos</div>
                  </div>
                </motion.li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-white/40">
              Título = mais votado da partida (ou sobrevivente, no modo sobrevivência). Jogadores são agrupados pelo nome.
            </p>
          </section>

          <Button variant="ghost" className="mt-6" block icon={<Trash2 />} onClick={() => setConfirm(true)}>
            Apagar estatísticas
          </Button>
        </>
      )}

      <ConfirmSheet
        open={confirm}
        title="Apagar tudo?"
        message="Isso remove o histórico de partidas deste aparelho. Não tem como desfazer."
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
