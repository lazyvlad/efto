// The dungeon's board and combat rules, without anything drawn (dungeon/battle.js plays them).
//
// The board is three rows of twelve cells, side on, the party's side on the left. A fighter steps
// to any of the eight cells around it; distance is counted in such steps (the larger of the
// column and row differences). One fighter to a cell.

export const COLS = 12;
export const ROWS = 3;

// How long between a fighter's turns, from its speed: speed 5 acts every 1.5 seconds, speed 3
// every 2.5, speed 6 every 1.25
export function actionInterval(speed) {
    return 7.5 / Math.max(1, speed);
}

export function distance(a, b) {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

export function onBoard(col, row) {
    return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

// Damage as Heroes 3 counts it: a roll of the attacker's damage, raised 5% for each point its
// attack is above the defender's defense (to four times at most), or lowered 2.5% for each point
// below (to 30% at least)
export function damageRoll(attacker, defender, rng = Math.random, { times = 1, ignoresDefense = false } = {}) {
    const [low, high] = attacker.damage;
    const base = low + Math.floor(rng() * (high - low + 1));
    const gap = attacker.attack - (ignoresDefense ? attacker.attack : defender.defense);
    const factor = gap >= 0 ? Math.min(4, 1 + 0.05 * gap) : Math.max(0.3, 1 - 0.025 * -gap);
    return Math.max(1, Math.round(base * factor * times));
}

// The cells a fighter can reach in up to "steps" steps, around the others, with the path to each
// (a breadth-first walk: every path is a shortest one)
export function reachable(from, steps, blocked) {
    const key = (col, row) => col * 10 + row;
    const paths = new Map([[key(from.col, from.row), []]]);
    let edge = [{ col: from.col, row: from.row, path: [] }];
    for (let step = 0; step < steps && edge.length; step++) {
        const next = [];
        for (const cell of edge) {
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                const col = cell.col + dc, row = cell.row + dr;
                if (!onBoard(col, row) || paths.has(key(col, row)) || blocked(col, row)) continue;
                const path = [...cell.path, { col, row }];
                paths.set(key(col, row), path);
                next.push({ col, row, path });
            }
        }
        edge = next;
    }
    return [...paths.values()];
}

// The path, at most "steps" long, that brings a fighter nearest to a goal: the cell that scores
// lowest (score(col, row)), the shorter walk breaking ties. An empty path: stay.
export function bestStep(from, steps, blocked, score) {
    let best = { path: [], value: score(from.col, from.row) };
    for (const path of reachable(from, steps, blocked)) {
        if (!path.length) continue;
        const end = path[path.length - 1];
        const value = score(end.col, end.row);
        if (value < best.value - 1e-9 || (Math.abs(value - best.value) < 1e-9 && path.length < best.path.length && best.path.length)) {
            best = { path, value };
        }
    }
    return best.path;
}

// The path to a cell beside a target (to fight it hand to hand), or as near as the steps allow.
// The true distance is walked around the others (a long way round counts as long), so a fighter
// boxed in by its own side does not stand still pretending to be close.
export function pathToward(from, target, steps, blocked) {
    const far = walkDistances(target, blocked, from);
    return bestStep(from, steps, blocked, (col, row) => {
        const d = Math.max(Math.abs(col - target.col), Math.abs(row - target.row));
        if (d === 0) return Infinity;
        const around = far.get(col * 10 + row);
        return (around === undefined ? 50 : around) + (d === 1 ? -0.5 : 0);
    });
}

// Steps from every cell to the cells around a target, walking around the others ("mover" itself
// does not block)
function walkDistances(target, blocked, mover) {
    const key = (col, row) => col * 10 + row;
    const seen = new Map();
    let edge = [];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const col = target.col + dc, row = target.row + dr;
        if (!onBoard(col, row) || (blocked(col, row) && !(col === mover.col && row === mover.row))) continue;
        seen.set(key(col, row), 1);
        edge.push({ col, row });
    }
    for (let d = 2; edge.length; d++) {
        const next = [];
        for (const cell of edge) {
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                const col = cell.col + dc, row = cell.row + dr;
                if (!onBoard(col, row) || seen.has(key(col, row)) || (col === target.col && row === target.row)) continue;
                if (blocked(col, row) && !(col === mover.col && row === mover.row)) continue;
                seen.set(key(col, row), d);
                next.push({ col, row });
            }
        }
        edge = next;
    }
    return seen;
}

// The path, at most "steps" long, toward the nearest of some goal cells (walking around the
// others; distances measured as walked). Empty: already on one, or no way nearer.
export function pathToAny(from, goals, steps, blocked) {
    const key = (col, row) => col * 10 + row;
    const far = new Map();
    let edge = goals.filter(g => onBoard(g.col, g.row)).map(g => ({ ...g }));
    for (const g of edge) far.set(key(g.col, g.row), 0);
    for (let d = 1; edge.length; d++) {
        const next = [];
        for (const cell of edge) {
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                const col = cell.col + dc, row = cell.row + dr;
                if (!onBoard(col, row) || far.has(key(col, row))) continue;
                if (blocked(col, row) && !(col === from.col && row === from.row)) continue;
                far.set(key(col, row), d);
                next.push({ col, row });
            }
        }
        edge = next;
    }
    return bestStep(from, steps, blocked, (col, row) => far.get(key(col, row)) ?? 99);
}
