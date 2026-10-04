import { Header } from "@/components/Header";
import { MAX_SQUAD } from "@/lib/formations";
import { RULES } from "@/lib/scoring";

export const metadata = { title: "Cómo se puntúa" };

export default function RulesPage() {
  const rows: [string, string][] = [
    ["Jugar menos de 60 minutos", `+${RULES.playedUnder60}`],
    ["Jugar 60 minutos o más", `+${RULES.played60}`],
    ["Gol de portero/a", `+${RULES.goal.POR}`],
    ["Gol de defensa", `+${RULES.goal.DEF}`],
    ["Gol de centrocampista", `+${RULES.goal.MED}`],
    ["Gol de delantero/a", `+${RULES.goal.DEL}`],
    ["Portería a cero (portero/a, 60'+)", `+${RULES.cleanSheet.POR}`],
    ["Portería a cero (defensa, 60'+)", `+${RULES.cleanSheet.DEF}`],
    ["Portería a cero (centrocampista, 60'+)", `+${RULES.cleanSheet.MED}`],
    ["Cada 2 goles encajados (POR y DEF)", `${RULES.per2Conceded}`],
    ["Victoria del equipo", `+${RULES.win}`],
    ["Empate del equipo", `+${RULES.draw}`],
    ["Penalti parado", `+${RULES.penSaved}`],
    ["Penalti fallado", `${RULES.penMissed}`],
    ["Tarjeta amarilla", `${RULES.yellow}`],
    ["Tarjeta roja (o doble amarilla)", `${RULES.red}`],
    ["Gol en propia puerta", `${RULES.ownGoal}`],
    ["Capitán/a", "x2"],
  ];
  return (
    <>
      <Header title="Cómo se puntúa" back="/" />
      <main className="space-y-4 px-4 pt-4 text-sm">
        <p className="text-muted">Los puntos salen de las actas oficiales de cada partido: minutos, goles, tarjetas y resultado.</p>
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-border px-4 py-2.5 last:border-0">
              <span>{k}</span>
              <b className={v.startsWith("-") ? "text-bad" : "text-good"}>{v}</b>
            </li>
          ))}
        </ul>
        <h2 className="section-title">Mercado</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Al entrar en una liga recibes 11 jugadores al azar y dinero en efectivo.</li>
          <li>Cada día a las 8:00 se cierra el mercado: gana la puja más alta y salen jugadores nuevos.</li>
          <li>Puedes vender al instante por el valor de mercado o subastar a tus rivales.</li>
          <li>Cada jugador/a solo puede estar en un equipo por liga. Máximo {MAX_SQUAD} en plantilla.</li>
          <li>El valor sube o baja según los puntos de cada partido.</li>
        </ul>
        <h2 className="section-title">Alineación</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mezcla jugadores y jugadoras de todos los equipos +18 del club.</li>
          <li>La alineación se cierra al empezar la jornada. Si no la cambias, se mantiene la anterior.</li>
          <li>Solo puntúan los titulares.</li>
        </ul>
        <p className="pb-4 text-xs text-muted">Por cumplimiento normativo, solo participan jugadores mayores de edad, y para jugar hay que tener 18 años o más.</p>
      </main>
    </>
  );
}
