import { useCallback, useEffect, useRef, useState } from "react";

// Estado del compañero: palabras, meta, reloj de trabajo y ganancias.
// El dinero sale de las horas trabajadas × la tarifa por hora.

export const RATE_PER_HOUR = 20; // soles
export const DEFAULT_GOAL = 500;
const IDLE_MS = 60_000; // modo 1: sin teclear 1 min, el reloj se pausa
const SLEEP_MS = 20_000; // el personaje se duerme tras 20 s sin teclear
const MAX_TICK_MS = 10 * 60_000; // saltos mayores (Mac dormido) no cuentan
const STORAGE_KEY = "blox:companion";

export type TimerMode = 1 | 2;

type Saved = {
  goal: number;
  timerMode: TimerMode;
  projectName: string | null; // modo 2: null = falta pedir el nombre
  workedMs: number; // del manuscrito actual
  totalEarned: number; // suma de lo publicado
  badge: number;
  completedGoal: number | null; // meta cuyo aviso ya se mostró
  minimized: boolean;
};

const DEFAULTS: Saved = {
  goal: DEFAULT_GOAL,
  timerMode: 1,
  projectName: null,
  workedMs: 0,
  totalEarned: 0,
  badge: 0,
  completedGoal: null,
  minimized: typeof window !== "undefined" && window.innerWidth <= 840,
};

function load(): Saved {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export const earningsFor = (ms: number) => (ms / 3_600_000) * RATE_PER_HOUR;

export const formatSoles = (soles: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(soles);

export function useCompanion(words: number, lastTypedAt: number) {
  const [state, setState] = useState<Saved>(load);
  const [now, setNow] = useState(() => Date.now());
  const [celebration, setCelebration] = useState<{ title: string; earned: number }>();
  const lastTypedRef = useRef(lastTypedAt);
  useEffect(() => {
    lastTypedRef.current = lastTypedAt;
  }, [lastTypedAt]);

  const update = useCallback((patch: Partial<Saved>) => setState((s) => ({ ...s, ...patch })), []);

  // Reloj: cada segundo suma el tiempo que corresponde según el modo.
  useEffect(() => {
    let prev = Date.now();
    const id = window.setInterval(() => {
      const t = Date.now();
      const delta = t - prev;
      prev = t;
      setNow(t);
      if (delta > MAX_TICK_MS) return;
      setState((s) => {
        const counting =
          s.timerMode === 1 ? t - lastTypedRef.current < IDLE_MS : s.projectName !== null;
        return counting ? { ...s, workedMs: s.workedMs + delta } : s;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin almacenamiento: el contador solo dura esta sesión.
    }
  }, [state]);

  const publish = useCallback(
    async (title: string, download: () => Promise<void>) => {
      await download();
      const earned = earningsFor(state.workedMs);
      setState((s) => ({
        ...s,
        totalEarned: s.totalEarned + earned,
        badge: s.badge + 1,
        workedMs: 0,
        completedGoal: s.goal,
        // En modo 2 publicar cierra el proyecto: el siguiente pide nombre nuevo.
        projectName: s.timerMode === 2 ? null : s.projectName,
      }));
      setCelebration({ title, earned });
    },
    [state.workedMs],
  );

  const idleMs = now - lastTypedAt;
  return {
    ...state,
    words,
    earnings: earningsFor(state.workedMs),
    progress: Math.min(100, Math.round((words / state.goal) * 100)),
    // Aviso de manuscrito completo: una vez por meta.
    showComplete: words >= state.goal && state.completedGoal !== state.goal,
    activity: idleMs < 1200 ? ("typing" as const) : idleMs > SLEEP_MS ? ("sleeping" as const) : ("idle" as const),
    celebration,
    closeCelebration: () => setCelebration(undefined),
    dismissComplete: () => update({ completedGoal: state.goal }),
    setGoal: (goal: number) => update({ goal: Math.max(1, Math.round(goal)) }),
    setTimerMode: (timerMode: TimerMode) =>
      update(timerMode === 2 ? { timerMode, projectName: null } : { timerMode }),
    // Un proyecto nuevo empieza su reloj desde cero.
    startProject: (name: string) => update({ projectName: name.trim() || "Proyecto", workedMs: 0 }),
    clearBadge: () => update({ badge: 0 }),
    setMinimized: (minimized: boolean) => update({ minimized }),
    publish,
  };
}

export type Companion = ReturnType<typeof useCompanion>;
