import "@fontsource/old-standard-tt/400.css";
import "@fontsource/old-standard-tt/400-italic.css";
import "@fontsource/old-standard-tt/700.css";
import "./companion.css";
import { useState } from "react";
import { Confetti } from "./Confetti";
import { Scene } from "./Scene";
import { formatSoles, RATE_PER_HOUR, useCompanion, type TimerMode } from "./useCompanion";

const GOALS = [250, 500, 1000, 3000];

type Props = {
  words: number;
  lastTypedAt: number;
  docTitle: string;
  onPublish: () => Promise<void>;
};

const formatTime = (ms: number) => {
  const min = Math.floor(ms / 60_000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};

export function Companion({ words, lastTypedAt, docTitle, onPublish }: Props) {
  const c = useCompanion(words, lastTypedAt);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [projectInput, setProjectInput] = useState("");
  const title = c.timerMode === 2 && c.projectName ? c.projectName : docTitle;
  const askProject = c.timerMode === 2 && c.projectName === null;

  const publish = async () => {
    setBusy(true);
    try {
      await c.publish(title, onPublish);
    } catch (error) {
      console.error("No se pudo publicar", error);
      window.alert("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (c.minimized) {
    return (
      <button type="button" className="companion companion-mini" onClick={() => c.setMinimized(false)}>
        <span>{formatSoles(c.totalEarned)}</span>
        <span>
          {c.words} / {c.goal} · {c.progress}%
        </span>
      </button>
    );
  }

  const openMenu = () => {
    setMenuOpen((open) => !open);
    c.clearBadge();
  };
  const chooseMode = (mode: TimerMode) => {
    c.setTimerMode(mode);
    setMenuOpen(false);
  };

  return (
    <aside className="companion" aria-label="Compañero de escritura">
      <header className="companion-head">
        <div>
          <div className="companion-caption">Saldo</div>
          <div className="companion-money">{formatSoles(c.totalEarned)}</div>
        </div>
        <div className="companion-actions">
          <button type="button" className="companion-btn companion-publish" onClick={publish} disabled={busy}>
            {busy ? "…" : "Publicar"}
          </button>
          <button type="button" className="companion-btn companion-menu" onClick={openMenu} aria-label="Menú">
            ≡{c.badge > 0 && <span className="companion-badge">{c.badge}</span>}
          </button>
        </div>
      </header>

      <div className="companion-title" title={title}>
        Modo {c.timerMode} · {title}
      </div>
      <div className="companion-words">
        <em>{c.words}</em> / {c.goal} palabras
      </div>
      <div
        className="companion-bar"
        role="progressbar"
        aria-valuenow={c.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la meta"
      >
        <span style={{ width: `${c.progress}%` }} />
      </div>
      <div className="companion-stats">
        <span>{c.progress} %</span>
        <span>
          {formatSoles(c.earnings)} · {formatTime(c.workedMs)}
        </span>
      </div>

      <Scene activity={c.activity} />

      {menuOpen && (
        <div className="companion-panel">
          <p className="companion-label">Cómo se cuenta el tiempo ({formatSoles(RATE_PER_HOUR)}/hora)</p>
          <div className="companion-row">
            <button type="button" className="companion-btn" aria-pressed={c.timerMode === 1} onClick={() => chooseMode(1)}>
              Modo 1
            </button>
            <button type="button" className="companion-btn" aria-pressed={c.timerMode === 2} onClick={() => chooseMode(2)}>
              Modo 2
            </button>
          </div>
          <p className="companion-hint">
            {c.timerMode === 1 ? "Modo 1: solo mientras escribes." : "Modo 2: por proyecto, todo el tiempo."}
          </p>
          <p className="companion-label">Meta de palabras</p>
          <div className="companion-row">
            {GOALS.map((g) => (
              <button key={g} type="button" className="companion-btn" aria-pressed={c.goal === g} onClick={() => c.setGoal(g)}>
                {g}
              </button>
            ))}
            <input
              className="companion-input companion-goal"
              type="number"
              min={1}
              defaultValue={GOALS.includes(c.goal) ? "" : c.goal}
              placeholder="Otra"
              onChange={(e) => e.target.valueAsNumber > 0 && c.setGoal(e.target.valueAsNumber)}
            />
          </div>
          <div className="companion-row">
            <button type="button" className="companion-btn" onClick={() => setMenuOpen(false)}>
              Listo
            </button>
            <button type="button" className="companion-btn" onClick={() => c.setMinimized(true)}>
              Minimizar
            </button>
          </div>
        </div>
      )}

      {askProject && !menuOpen && !c.celebration && (
        <form
          className="companion-dialog"
          onSubmit={(e) => {
            e.preventDefault();
            c.startProject(projectInput);
            setProjectInput("");
          }}
        >
          <p>¿Cómo se llama el proyecto?</p>
          <input
            className="companion-input"
            autoFocus
            value={projectInput}
            onChange={(e) => setProjectInput(e.target.value)}
            placeholder="Nombre del proyecto"
          />
          <button type="submit" className="companion-btn companion-primary">
            Iniciar
          </button>
        </form>
      )}

      {c.showComplete && !askProject && !menuOpen && !c.celebration && (
        <div className="companion-dialog">
          <p>
            <em>{title}</em>: ¡el manuscrito está completo!
          </p>
          <button type="button" className="companion-btn companion-primary" onClick={publish} disabled={busy}>
            {busy ? "…" : "Publicar"}
          </button>
          <button type="button" className="companion-close" onClick={c.dismissComplete} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}

      {c.celebration && (
        <>
          <Confetti />
          <div className="companion-dialog">
            <button type="button" className="companion-close" onClick={c.closeCelebration} aria-label="Cerrar">
              ×
            </button>
            <p>
              <em>{c.celebration.title}</em> ganó {formatSoles(c.celebration.earned)}!
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
