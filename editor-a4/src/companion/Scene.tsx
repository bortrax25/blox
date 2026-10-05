import { useEffect, useState } from "react";

// Escena en pixel art: cada sprite es un dibujo ASCII ('#' = píxel lleno).
// El escritor teclea mientras tú tecleas y se duerme si dejas de escribir.

type Sprite = string[];

const LAMP: Sprite = [
  "...##.....",
  "..#..#....",
  ".#....#...",
  "#......#..",
  ".######...",
  "....#.....",
  "...#......",
  "..#.......",
  "..#.......",
  "..#.......",
  "...#......",
  "....#.....",
  "....#.....",
  "...#......",
  "..#.......",
  "..#.......",
  ".####.....",
  "######....",
];

const TYPEWRITER: Sprite = [
  "..######..",
  ".#......#.",
  "##########",
  "#.#.#.#.##",
  "##########",
  ".#......#.",
];

const PAPER: Sprite = ["####", "#..#", "#..#", "#..#"];

const DESK: Sprite = [
  "##############",
  ".#..........#.",
  ".#..........#.",
  ".#..........#.",
  ".#..........#.",
  ".#..........#.",
  ".#..........#.",
];

const WRITER_HEAD = (asleep: boolean): Sprite => [
  "...########...",
  "..#........#..",
  "..#........#..",
  asleep ? "..#.##.##...#." : "..#.#..#....#.",
  "..#........#..",
  "..#........#..",
  "...########...",
];

const WRITER_BODY: Sprite = [
  ".....#..#.....",
  "....#....#....",
  "...#......#...",
  "...#......#...",
  "...#......#...",
  "..########.#..",
  "..#......#.#..",
  "..#......#....",
  "..#......#....",
];

// Brazo hacia el teclado: dos posiciones que se alternan al teclear.
const ARM_DOWN: Sprite = ["...#", "..#.", "##..", "#..."];
const ARM_UP: Sprite = ["...#", "###.", "#...", "...."];

const ARMCHAIR: Sprite = [
  "....########....",
  "...#........#...",
  "...#........#...",
  ".###........###.",
  "#..#........#..#",
  "#..##########..#",
  "#..............#",
  "################",
  ".#............#.",
  ".#............#.",
];

const Z: Sprite = ["###", "..#", ".#.", "#..", "###"];

// Ventana en arco con cielo punteado y árboles.
function windowSprite(): Sprite {
  const w = 14;
  const h = 18;
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const arch = y < 3 ? Math.abs(x - 6.5) > 6.5 - [4, 2, 1][y] : false;
      const edge =
        (y === 0 && !arch && Math.abs(x - 6.5) <= 3) ||
        (y > 0 && y < 3 && Math.abs(Math.abs(x - 6.5) - (6.5 - [4, 2, 1][y])) < 1) ||
        (y >= 3 && (x === 0 || x === w - 1)) ||
        y >= h - 2;
      const tree = y >= 9 && y < h - 3 && [4, 9].some((cx) => Math.abs(x - cx) <= (y - 9) / 2);
      const sky = y >= 1 && y < 8 && (x + y) % 2 === 0 && (y < 5 || (x + y) % 4 === 0);
      row += arch ? "." : edge || tree || sky ? "#" : ".";
    }
    rows.push(row);
  }
  return rows;
}

// Librero: marco, tres repisas y lomos de libros.
function shelfSprite(): Sprite {
  const w = 14;
  const h = 28;
  const shelves = [0, 9, 18, 27];
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const frame = x === 0 || x === w - 1 || shelves.includes(y);
      const book = !frame && y % 9 > 2 && (x % 2 === 1 || (y % 9 > 5 && x > 7 && (x + y) % 2 === 0));
      row += frame || book ? "#" : ".";
    }
    rows.push(row);
  }
  return rows;
}

const WINDOW = windowSprite();
const SHELF = shelfSprite();

function Pixels({ sprite, x, y }: { sprite: Sprite; x: number; y: number }) {
  const rects: React.ReactElement[] = [];
  sprite.forEach((row, dy) => {
    for (const run of row.matchAll(/#+/g)) {
      rects.push(
        <rect key={`${dy}-${run.index}`} x={x + run.index} y={y + dy} width={run[0].length} height={1} />,
      );
    }
  });
  return <>{rects}</>;
}

export type Activity = "typing" | "idle" | "sleeping";

export function Scene({ activity }: { activity: Activity }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (activity !== "typing") return;
    const id = window.setInterval(() => setFrame((f) => f + 1), 140);
    return () => window.clearInterval(id);
  }, [activity]);

  const typing = activity === "typing";
  const asleep = activity === "sleeping";
  const armUp = typing && frame % 2 === 0;

  return (
    <svg className="companion-scene" viewBox="0 0 72 42" shapeRendering="crispEdges" aria-hidden>
      <g fill="currentColor">
        <Pixels sprite={LAMP} x={13} y={22} />
        <Pixels sprite={DESK} x={22} y={33} />
        <Pixels sprite={TYPEWRITER} x={24} y={27} />
        <Pixels sprite={PAPER} x={27} y={typing ? 22 + (frame % 3) : 23} />
        <Pixels sprite={WRITER_HEAD(asleep)} x={33} y={24} />
        <Pixels sprite={WRITER_BODY} x={33} y={31} />
        <Pixels sprite={armUp ? ARM_UP : ARM_DOWN} x={33} y={29} />
        <Pixels sprite={WINDOW} x={50} y={6} />
        <Pixels sprite={ARMCHAIR} x={50} y={30} />
        <Pixels sprite={SHELF} x={67} y={12} />
        <rect x={0} y={40} width={72} height={1} />
        {asleep && (
          <g className="companion-zzz">
            <Pixels sprite={Z} x={44} y={18} />
            <Pixels sprite={Z} x={46} y={12} />
          </g>
        )}
      </g>
    </svg>
  );
}
