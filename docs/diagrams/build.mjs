// Generates the architecture diagrams referenced by README.md.
//
//   node docs/diagrams/build.mjs
//
// Every diagram is emitted twice (dark + light) so the README can swap them with a
// <picture> element that follows GitHub's colour mode. The SVGs are self-contained:
// system font stacks, no <style>, no scripts, no external references — GitHub renders
// README images through an <img> proxy, which strips anything else.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));

const THEMES = {
    dark: {
        bg: "#0d1117", node: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#8b949e",
        line: "#768390", band: "#ffffff",
        blue: "#58a6ff", green: "#3fb950", purple: "#bc8cff", orange: "#d29922", red: "#f85149",
        cyan: "#39c5cf", gray: "#8b949e", tint: 0.09, bandTint: 0.035,
    },
    light: {
        bg: "#ffffff", node: "#f6f8fa", border: "#d0d7de", text: "#1f2328", muted: "#59636e",
        line: "#6e7781", band: "#000000",
        blue: "#0969da", green: "#1a7f37", purple: "#8250df", orange: "#9a6700", red: "#cf222e",
        cyan: "#1b7c83", gray: "#59636e", tint: 0.07, bandTint: 0.03,
    },
};

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const blend = (bg, fg, a) => "#" + hex(bg).map((b, i) => Math.round(b * (1 - a) + hex(fg)[i] * a).toString(16).padStart(2, "0")).join("");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Rough glyph widths for label halos; only used to size invisible background boxes.
const textWidth = (s, size, mono) => s.length * size * (mono ? 0.64 : 0.56);

class Diagram {
    constructor(theme, { w, h, title, subtitle }) {
        this.t = theme; this.w = w; this.h = h;
        this.parts = []; this.markers = new Set();
        this.nodes = {};
        this.title = title; this.subtitle = subtitle;
    }
    color(name) { return this.t[name] ?? name; }
    add(s) { this.parts.push(s); }

    text(x, y, s, { size = 12, color = "text", weight = 400, anchor = "start", mono = false, opacity = 1 } = {}) {
        this.add(`<text x="${x}" y="${y}" font-family="${mono ? MONO : SANS}" font-size="${size}" font-weight="${weight}" fill="${this.color(color)}" text-anchor="${anchor}" fill-opacity="${opacity}">${esc(s)}</text>`);
    }

    /** Text with a background-coloured halo so it stays legible on top of a line. */
    label(x, y, lines, { size = 10.5, color = "muted", anchor = "middle", mono = true, lineHeight = 13, halo = this.t.bg } = {}) {
        lines = Array.isArray(lines) ? lines : [lines];
        const widest = Math.max(...lines.map((l) => textWidth(l, size, mono)));
        const top = y - size - (lines.length - 1) * lineHeight;
        const hx = anchor === "middle" ? x - widest / 2 : anchor === "end" ? x - widest : x;
        this.add(`<rect x="${hx - 3}" y="${top - 1}" width="${widest + 6}" height="${size + (lines.length - 1) * lineHeight + 5}" fill="${halo}" rx="2"/>`);
        lines.forEach((l, i) => this.text(x, y - (lines.length - 1 - i) * lineHeight, l, { size, color, anchor, mono }));
    }

    group(x, y, w, h, label, { color = "muted", foot } = {}) {
        this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${this.color(color)}" stroke-opacity="0.55" stroke-dasharray="6 5"/>`);
        this.label(x + 18, y + 22, label, { size: 11, color, anchor: "start", mono: false });
        if (foot) this.label(x + w - 18, y + h - 12, foot, { size: 10.5, color: "muted", anchor: "end", mono: true });
    }

    node(id, { x, y, w, h, title, sub = [], color = "blue", tag, dashed = false, mono = true, align = "start" }) {
        this.nodes[id] = { x, y, w, h };
        const c = this.color(color);
        this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${this.t.node}" stroke="${this.t.border}"/>`);
        this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}" fill-opacity="${this.t.tint}" stroke="${c}" stroke-opacity="0.75"${dashed ? ' stroke-dasharray="5 4"' : ""}/>`);
        const tx = align === "middle" ? x + w / 2 : x + 16;
        if (align !== "middle") this.add(`<rect x="${x + 16}" y="${y + 15}" width="8" height="8" rx="2" fill="${c}"/>`);
        this.text(align === "middle" ? tx : tx + 14, y + 23, title, { size: 13, weight: 600, anchor: align });
        sub.forEach((line, i) => this.text(tx, y + 43 + i * 15, line, { size: 10.5, color: "muted", mono, anchor: align }));
        if (tag) {
            const tc = this.color("cyan");
            const tw = textWidth(tag, 10, true) + 16;
            const tx0 = x + w - tw - 12, ty = y + h - 26;
            this.add(`<rect x="${tx0}" y="${ty}" width="${tw}" height="18" rx="9" fill="${tc}" fill-opacity="0.14" stroke="${tc}" stroke-opacity="0.55"/>`);
            this.text(tx0 + 8, ty + 12.5, tag, { size: 10, mono: true, color: tc });
        }
    }

    /** Anchor point on a node's side; `t` is the 0..1 position along that side. */
    at(id, side, t = 0.5) {
        const n = this.nodes[id];
        if (!n) throw new Error(`unknown node ${id}`);
        switch (side) {
            case "top": return [n.x + n.w * t, n.y];
            case "bottom": return [n.x + n.w * t, n.y + n.h];
            case "left": return [n.x, n.y + n.h * t];
            case "right": return [n.x + n.w, n.y + n.h * t];
        }
        throw new Error(side);
    }

    marker(c) {
        const id = `arrow-${c.replace("#", "")}`;
        this.markers.add(`<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`);
        return id;
    }

    /** Orthogonal polyline through `pts`; the head lands on the last point. */
    edge(pts, { color = "line", dashed = false, width = 1.5, head = true, halo = false, both = false } = {}) {
        const c = this.color(color);
        const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
        if (halo) this.add(`<path d="${d}" fill="none" stroke="${this.t.bg}" stroke-width="${width + 5}" stroke-linejoin="round"/>`);
        const m = head ? ` marker-end="url(#${this.marker(c)})"` : "";
        const ms = both ? ` marker-start="url(#${this.marker(c)})"` : "";
        this.add(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${width}" stroke-linejoin="round"${dashed ? ' stroke-dasharray="5 4"' : ""}${m}${ms}/>`);
    }

    legend(x, y, items) {
        let cx = x;
        for (const [color, name] of items) {
            this.add(`<rect x="${cx}" y="${y - 8}" width="9" height="9" rx="2" fill="${this.color(color)}"/>`);
            this.text(cx + 15, y, name, { size: 10.5, color: "muted" });
            cx += 15 + textWidth(name, 10.5, false) + 22;
        }
    }

    render() {
        const head = [];
        head.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img" aria-label="${esc(this.title)}">`);
        head.push(`<defs>${[...this.markers].join("")}</defs>`);
        head.push(`<rect width="${this.w}" height="${this.h}" fill="${this.t.bg}"/>`);
        const title = [];
        if (this.title) title.push(`<text x="30" y="36" font-family="${SANS}" font-size="16" font-weight="600" fill="${this.t.text}">${esc(this.title)}</text>`);
        if (this.subtitle) title.push(`<text x="30" y="56" font-family="${SANS}" font-size="11.5" fill="${this.t.muted}">${esc(this.subtitle)}</text>`);
        return [...head, ...title, ...this.parts, "</svg>"].join("\n");
    }
}

/** Sequence-diagram helper on top of Diagram. */
class Seq {
    constructor(d, lanes, { top = 80, headerH = 40 }) {
        this.d = d; this.lanes = {}; this.y = top + headerH + 24; this.top = top; this.headerH = headerH;
        this.bands = []; this.back = [];
        this.haloColor = blend(d.t.bg, d.t.band, d.t.bandTint);
        for (const l of lanes) {
            this.lanes[l.id] = l;
            d.node(`lane-${l.id}`, { x: l.x - l.w / 2, y: top, w: l.w, h: headerH, title: l.title, color: l.color, align: "middle" });
        }
    }
    x(id) { return this.lanes[id].x; }
    lifelines(bottom) {
        for (const l of Object.values(this.lanes)) {
            this.back.push(`<line x1="${l.x}" y1="${this.top + this.headerH}" x2="${l.x}" y2="${bottom}" stroke="${this.d.color(l.color)}" stroke-opacity="0.4" stroke-dasharray="3 5"/>`);
        }
    }
    /** Full-width phase band. Call `band()` again (or `end()`) to close the previous one. */
    band(label) {
        if (this.open) this.closeBand();
        this.open = { label, y: this.y - 12 };
        this.y += 14;
    }
    closeBand() {
        const b = this.open; if (!b) return;
        const t = this.d.t;
        this.bands.push(`<rect x="24" y="${b.y}" width="${this.d.w - 48}" height="${this.y - b.y - 4}" rx="8" fill="${t.band}" fill-opacity="${t.bandTint}"/>`);
        this.d.text(36, b.y + 15, b.label, { size: 11, weight: 600, color: "text" });
        this.open = null;
    }
    msg(from, to, lines, { dashed = false, color = "line" } = {}) {
        lines = Array.isArray(lines) ? lines : [lines];
        const x1 = this.x(from), x2 = this.x(to);
        const y = this.y + (lines.length - 1) * 13 + 14;
        this.d.label((x1 + x2) / 2, y - 6, lines, { size: 10.5, color: dashed ? "muted" : "text", mono: true, halo: this.haloColor });
        this.d.edge([[x1, y], [x2, y]], { dashed, color, halo: false, width: 1.4 });
        this.d.add(`<circle cx="${x1}" cy="${y}" r="2.5" fill="${this.d.color(color)}"/>`);
        this.y = y + 16;
    }
    /** A note anchored to one lane (self-processing, timers, local effects). */
    note(lane, lines, { color = "muted", side = "right", w } = {}) {
        lines = Array.isArray(lines) ? lines : [lines];
        const width = w ?? Math.max(...lines.map((l) => textWidth(l, 10.5, true))) + 20;
        const h = 12 + lines.length * 13;
        const x = side === "right" ? this.x(lane) + 10 : this.x(lane) - 10 - width;
        const c = this.d.color(color);
        this.d.add(`<rect x="${x}" y="${this.y}" width="${width}" height="${h}" rx="6" fill="${this.d.t.node}" stroke="${c}" stroke-opacity="0.6"/>`);
        this.d.add(`<rect x="${x}" y="${this.y}" width="${width}" height="${h}" rx="6" fill="${c}" fill-opacity="0.08"/>`);
        lines.forEach((l, i) => this.d.text(x + 10, this.y + 15 + i * 13, l, { size: 10.5, mono: true, color: "text" }));
        this.y += h + 10;
    }
    gap(px = 8) { this.y += px; }
    /** Closes the last band and moves bands + lifelines behind every other element. */
    end() {
        this.closeBand();
        this.lifelines(this.y);
        this.d.parts.unshift(...this.bands, ...this.back);
        return this.y;
    }
}

// ---------------------------------------------------------------------------------
// 1. System architecture
// ---------------------------------------------------------------------------------
function architecture(t) {
    const d = new Diagram(t, {
        w: 1000, h: 836,
        title: "System architecture",
        subtitle: "Production topology on a single host. Every arrow is a real network hop; labels name the protocol or the data that crosses it.",
    });
    const CORE = "@gradientbattle/core";

    d.node("browser", { x: 400, y: 72, w: 200, h: 76, title: "Browser", color: "gray", sub: ["React 19 · Plotly.js", "WebSocket client"] });
    d.node("github", { x: 770, y: 72, w: 200, h: 76, title: "GitHub", color: "gray", sub: ["OAuth identity provider"] });

    d.group(30, 166, 940, 610, "docker compose · production · gradientbattle.com",
        { foot: "one image · ghcr.io/lui2303/gradientbattle:sha-<git sha> · runs web, battle, sweep and migrate" });

    d.node("caddy", { x: 420, y: 200, w: 160, h: 80, title: "Caddy 2", color: "green", sub: [":443 · automatic TLS", "security headers", "request body ≤ 1 MB"] });
    d.node("battle", {
        x: 80, y: 322, w: 220, h: 140, title: "battle · WebSocket", color: "blue", tag: CORE,
        sub: [":3001 · node:http + ws", "matchmaking · ready-up", "random game generation", "auth on upgrade: session JWE", "shared AUTH_SECRET"],
    });
    d.node("web", {
        x: 480, y: 322, w: 220, h: 140, title: "web · Next.js 16", color: "blue", tag: CORE,
        sub: [":3000 · App Router + routes", "NextAuth v5 · JWT sessions", "deny-by-default proxy.ts", "Prisma 7 · Redis rate limits"],
    });
    d.node("redis", { x: 390, y: 500, w: 220, h: 84, title: "Redis 7", color: "purple", sub: ["matchmaking ZSET", "battle:{id} hashes · ready", "submission + rate counters"] });
    d.node("sweep", { x: 750, y: 500, w: 210, h: 84, title: "sweep · backstop", color: "orange", sub: ["shell loop, every 30 s", "evaluates battles no client", "asked to evaluate"] });
    d.node("postgres", { x: 390, y: 660, w: 220, h: 84, title: "PostgreSQL 17", color: "purple", sub: ["Prisma 7 (pg adapter)", "User · Battle · BattleRun", "Run · Account · Session"] });
    d.node("migrate", { x: 40, y: 660, w: 180, h: 84, title: "migrate · one-shot", color: "orange", sub: ["prisma migrate deploy", "must exit 0 before web", "is allowed to start"] });

    // Browser -> Caddy (the only public ingress)
    d.edge([d.at("browser", "bottom"), d.at("caddy", "top")], { color: "green", width: 2 });
    d.label(508, 178, ["HTTPS  ·  WSS /ws"], { anchor: "start", color: "text" });

    // OAuth: browser is redirected to GitHub, GitHub calls back into web
    d.edge([d.at("browser", "right"), d.at("github", "left")], { dashed: true, color: "gray" });
    d.label(685, 104, ["OAuth authorize redirect"], { color: "muted" });
    d.edge([[870, 148], [870, 254], [740, 254], [740, 364], [700, 364]], { dashed: true, color: "gray" });
    d.label(748, 306, ["OAuth callback", "code → token"], { anchor: "start", color: "muted" });

    // Caddy routes by path
    d.edge([[460, 280], [460, 302], [190, 302], [190, 322]], { color: "green" });
    d.label(325, 297, ["/ws  →  battle:3001"], { color: "text" });
    d.edge([[540, 280], [540, 302], [590, 302], [590, 322]], { color: "green" });
    d.label(602, 308, ["/*  →  web:3000"], { anchor: "start", color: "text" });

    // battle -> web: server-to-server, never through Caddy
    d.edge([d.at("battle", "right"), d.at("web", "left")], { color: "blue" });
    d.label(390, 380, ["HTTP GET /evaluate"], { color: "text" });
    d.label(390, 404, ["Bearer service token"], { color: "muted" });

    // battle -> redis / postgres
    d.edge([[270, 462], [270, 481], [450, 481], [450, 500]], { color: "purple" });
    d.label(360, 476, ["ZSET queue · battle:{id}"], { color: "text" });
    d.edge([[230, 462], [230, 702], [390, 702]], { color: "purple" });
    d.label(238, 610, ["SELECT elo", "battle.create"], { anchor: "start", color: "text" });

    // web -> redis / postgres
    d.edge([[520, 462], [520, 500]], { color: "purple" });
    d.label(528, 486, ["rate limit · submissions"], { anchor: "start", color: "text" });
    d.edge([[692, 462], [692, 720], [610, 720]], { color: "purple" });
    d.label(700, 632, ["Prisma: runs, battles,", "users, elo"], { anchor: "start", color: "text" });

    // sweep -> web / postgres
    d.edge([[855, 500], [855, 424], [700, 424]], { color: "orange" });
    d.label(780, 418, ["evaluate stale battles"], { color: "text" });
    d.edge([[900, 584], [900, 736], [610, 736]], { color: "orange" });
    d.label(892, 666, ["find battles with", "endsAt < now − 2 s"], { anchor: "end", color: "text" });

    // migrate -> postgres
    d.edge([[220, 720], [390, 720]], { color: "orange" });
    d.label(305, 714, ["prisma migrate deploy"], { color: "text" });

    d.legend(30, 812, [["green", "edge"], ["blue", "application"], ["purple", "state"], ["orange", "operational jobs"], ["gray", "external"], ["cyan", "shared TypeScript package: optimizers, objectives, simulation engine"]]);
    return d.render();
}

// ---------------------------------------------------------------------------------
// 2. Ranked battle sequence
// ---------------------------------------------------------------------------------
function battleFlow(t) {
    const d = new Diagram(t, {
        w: 1000, h: 1200,
        title: "Ranked battle — end to end",
        subtitle: "Two players, four phases. Redis holds the live state, Postgres the durable record; the WebSocket server relays, schedules and delegates.",
    });
    const s = new Seq(d, [
        { id: "a", x: 68, w: 96, title: "Player A", color: "gray" },
        { id: "b", x: 180, w: 96, title: "Player B", color: "gray" },
        { id: "ws", x: 330, w: 130, title: "battle (WS)", color: "blue" },
        { id: "redis", x: 500, w: 100, title: "Redis", color: "purple" },
        { id: "api", x: 660, w: 120, title: "web API", color: "blue" },
        { id: "pg", x: 860, w: 110, title: "Postgres", color: "purple" },
    ], { top: 80 });

    s.band("1 · Matchmaking — Elo-banded queue");
    s.msg("a", "ws", "FIND_OPPONENT");
    s.msg("ws", "redis", ["ZRANGEBYSCORE queue", "[elo−800, elo+800] → none"]);
    s.msg("ws", "redis", "ZADD queue elo user:A");
    s.msg("ws", "a", "ENQUEUED", { dashed: true });
    s.msg("b", "ws", "FIND_OPPONENT");
    s.msg("ws", "redis", ["ZRANGEBYSCORE → user:A", "ZREM queue user:A"]);
    s.msg("ws", "redis", ["MULTI · HSET battle:{id}", "state=PLAYERS_READY_0", "SET user:A/B → {id}", "EXPIRE 143 s · EXEC"]);
    s.msg("ws", "a", "FOUND_OPPONENT {B, elo}", { dashed: true });
    s.msg("ws", "b", "FOUND_OPPONENT {A, elo}", { dashed: true });
    s.note("ws", ["setTimeout 20 s: if state is still", "PLAYERS_READY_* → ABORT both, clean up"], { color: "orange" });

    s.band("2 · Ready-up — both players must confirm within 20 s");
    s.msg("a", "ws", "READY");
    s.msg("ws", "redis", ["SET ready:A 1 NX EX 20", "HSET state=PLAYERS_READY_1"]);
    s.msg("b", "ws", "READY");
    s.msg("ws", "redis", ["SET ready:B 1 NX", "HGETALL → PLAYERS_READY_1"]);
    s.note("ws", ["generateRankedGame(): random optimizer subset,", "params + starting points pinned at random"], { color: "blue" });
    s.msg("ws", "redis", ["HSET state=RUNNING · game", "gameEndsAt = now + 120 s"]);
    s.msg("ws", "pg", "battle.create {id, RUNNING, game, endsAt}");
    s.msg("ws", "a", "RUNNING {battleID}", { dashed: true });
    s.msg("ws", "b", "RUNNING {battleID}", { dashed: true });
    s.note("a", ["router.push(/battle/{id}) → SYNC → hydrate", "state, game, remainingMs, submissions"], { color: "gray" });

    s.band("3 · Running — 120 s, at most k submissions per player");
    s.msg("a", "api", "POST /api/battle/{id}/run  {optimizer}");
    s.note("api", ["session owns this battle? · optimizer", "matches the pinned game? · in range?"], { color: "blue" });
    s.msg("api", "redis", ["INCR battle:{id}:", "submissions:A → 429 if > k"]);
    s.note("api", ["pinned fields ← server values", "SimulationEngine × 100 steps"], { color: "blue" });
    s.msg("api", "pg", ["battleRun.create", "{optimizers, lastIterate, bestRun}"]);
    s.msg("api", "a", "201 {traces[100][1], submissionCount}", { dashed: true });
    s.note("a", ["Plotly replays one step per frame;", "Player B does the same in parallel"], { color: "gray" });

    s.band("4 · Evaluation — client-triggered, idempotent, swept as a backstop");
    s.msg("a", "ws", ["EVALUATE  (countdown hit 0;", "retried with exponential backoff)"]);
    s.note("ws", ["gameEndsAt already passed? else ignore"], { color: "orange" });
    s.msg("ws", "api", ["GET /api/battle/{id}/evaluate", "Authorization: Bearer <service token>"]);
    s.note("api", ["already evaluated? → stored result", "else: best run per player → winner"], { color: "blue" });
    s.msg("api", "pg", ["$transaction:", "updateMany status → evaluated", "(only one caller claims it)", "Elo update for both players", "store deltas + Elo before"]);
    s.msg("api", "ws", "{winnerId, winningRunId, eloDeltas}", { dashed: true });
    s.msg("ws", "redis", ["HSET state=BATTLE_ENDED", "EXPIRE battle + user keys 120 s"]);
    s.msg("ws", "a", "BATTLE_RESULT", { dashed: true });
    s.msg("ws", "b", "BATTLE_RESULT", { dashed: true });
    s.note("a", ["router.refresh() → server renders", "BattleSummary from Postgres"], { color: "gray" });
    s.note("api", ["sweep, every 30 s: GET /evaluate for every", "battle with status ≠ evaluated and", "endsAt < now − 2 s. A repeat call returns", "the stored result — settlement is idempotent."], { color: "orange" });
    d.h = s.end() + 16;
    return d.render();
}

// ---------------------------------------------------------------------------------
// 3. Simulation pipeline (free play + battle submissions)
// ---------------------------------------------------------------------------------
function simulation(t) {
    const d = new Diagram(t, {
        w: 1000, h: 560,
        title: "Simulation pipeline",
        subtitle: "The server computes every trajectory once; the browser only replays it. A result never comes from the client.",
    });
    d.node("ui", { x: 30, y: 86, w: 280, h: 124, title: "Optimizer setup", color: "gray", sub: ["up to 5 AlgorithmSelectCards", "algorithm · lr · β · starting point", "objective: Quadratic | Matyas", "Start → mode.run()"] });
    d.node("api", { x: 360, y: 86, w: 300, h: 124, title: "POST /api/run_optimizers", color: "blue", sub: ["Redis rate limit: 80 req / 5 min / IP", "paramRangeError() on every optimizer", "steps ≤ 100 · optimizers ≤ 5", "optimizerFactory() · functionFactory()"] });
    d.node("engine", { x: 710, y: 86, w: 260, h: 124, title: "SimulationEngine", color: "cyan", tag: "@gradientbattle/core", sub: ["Iterable<Point[]>: one point per", "optimizer per step, in lockstep", "bestRun = first ‖x‖₂ < 10⁻³"] });

    d.node("plot", { x: 30, y: 290, w: 280, h: 104, title: "Plotly replay", color: "gray", sub: ["extendTraces: one step per frame", "contour · ‖x‖₂ · f(x) · leaderboard", "50–2000 ms per step (slider)"] });
    d.node("traces", { x: 360, y: 290, w: 300, h: 104, title: "traces: Point[steps][optimizers]", color: "cyan", dashed: true, sub: ["computed once on the server,", "replayed in the browser"] });
    d.node("pg", { x: 710, y: 290, w: 260, h: 104, title: "Postgres · Run row", color: "purple", sub: ["optimizers · steps · funcName", "lastIterate · bestRun"] });

    d.node("battle", {
        x: 30, y: 440, w: 940, h: 84, title: "Battle mode · POST /api/battle/:id/run — same engine and validation, plus", color: "blue",
        sub: ["the session must own the battle · the optimizer must match the server-pinned game · fixed starting points and",
              "disabled parameters are overwritten with the server's values · Redis INCR caps submissions at k · the row is a BattleRun"],
    });

    d.edge([d.at("ui", "right"), d.at("api", "left")], { color: "line" });
    d.label(335, 142, ["JSON"], { color: "text" });
    d.edge([d.at("api", "right"), d.at("engine", "left")], { color: "line" });
    d.label(685, 142, ["build"], { color: "text" });
    d.edge([[840, 210], [840, 290]], { color: "purple" });
    d.label(848, 254, ["prisma.run.create"], { anchor: "start", color: "text" });
    d.edge([[760, 210], [760, 250], [510, 250], [510, 290]], { color: "cyan" });
    d.label(635, 244, ["Array.from(engine): steps × n points"], { color: "text" });
    d.edge([d.at("traces", "left"), d.at("plot", "right")], { color: "line" });
    d.label(335, 336, ["replay"], { color: "text" });

    d.legend(30, 548, [["gray", "browser"], ["blue", "Next.js route handler"], ["cyan", "@gradientbattle/core"], ["purple", "PostgreSQL"]]);
    return d.render();
}

// ---------------------------------------------------------------------------------
// 4. CI/CD and deployment
// ---------------------------------------------------------------------------------
function deploy(t) {
    const d = new Diagram(t, {
        w: 1000, h: 530,
        title: "Build, ship, run",
        subtitle: "One image per commit. The server never builds; it pulls a SHA-tagged image and lets compose health checks order the start-up.",
    });
    d.group(30, 80, 470, 400, "GitHub Actions · .github/workflows/ci.yml", { color: "muted" });
    d.node("push", { x: 45, y: 120, w: 120, h: 56, title: "push / PR", color: "gray", sub: ["branch main"] });
    d.node("build", { x: 195, y: 110, w: 290, h: 118, title: "build job", color: "blue", sub: ["pnpm install --frozen-lockfile", "prisma generate · eslint · tsc --noEmit", "vitest · next build"] });
    d.node("image", { x: 195, y: 290, w: 290, h: 132, title: "image job · main only", color: "blue", sub: ["docker buildx + GHA layer cache", "build-args: GIT_SHA and the public", "WS URL (inlined into the client bundle)", "tags: sha-<short> + latest"] });
    d.node("ghcr", { x: 40, y: 310, w: 130, h: 92, title: "GHCR", color: "purple", sub: ["ghcr.io/", "lui2303/", "gradientbattle"] });

    d.edge([d.at("push", "right"), d.at("build", "left", 0.33)], { color: "line" });
    d.edge([d.at("build", "bottom"), d.at("image", "top")], { color: "line" });
    d.label(348, 262, ["needs: build"], { color: "text" });
    d.edge([d.at("image", "left", 0.5), d.at("ghcr", "right", 0.5)], { color: "purple" });
    d.label(182, 350, ["push"], { color: "text" });

    d.group(530, 80, 440, 400, "Server · docker-compose.prod.yaml", { color: "muted" });
    d.node("deploy", { x: 560, y: 110, w: 380, h: 72, title: "./deploy.sh [sha-<short> | latest]", color: "orange", sub: ["docker compose pull → up -d", "poll battle /health ≤ 60 s, print its revision"] });
    const chain = [
        ["postgres", "postgres · redis — healthy: pg_isready · redis-cli ping", "purple"],
        ["migrate", "migrate — prisma migrate deploy, exit 0", "orange"],
        ["web", "web — healthy: GET /login", "blue"],
        ["battle", "battle (+ sweep) — healthy: GET /health", "blue"],
        ["caddy", "caddy — TLS + reverse proxy, last", "green"],
    ];
    let y = 212;
    for (const [id, title, color] of chain) {
        d.node(id, { x: 560, y, w: 380, h: 38, title, color });
        y += 54;
    }
    for (let i = 0; i < chain.length - 1; i++) {
        d.edge([d.at(chain[i][0], "bottom", 0.5), d.at(chain[i + 1][0], "top", 0.5)], { color: "line" });
    }
    d.label(760, 202, ["depends_on"], { anchor: "start", color: "muted" });
    d.edge([d.at("deploy", "bottom"), d.at("postgres", "top")], { color: "orange" });

    d.edge([d.at("ghcr", "bottom", 0.5), [105, 455], [515, 455], [515, 146], d.at("deploy", "left", 0.5)], { color: "purple" });
    d.label(330, 449, ["docker compose pull  ghcr.io/…:${TAG}"], { color: "text" });

    d.label(500, 510, ["Rollback: ./deploy.sh sha-<previous>.  New code never serves before migrate has exited 0."], { color: "muted", anchor: "middle" });
    return d.render();
}

const DIAGRAMS = { architecture, "battle-flow": battleFlow, "simulation-pipeline": simulation, "deploy-pipeline": deploy };

for (const [name, fn] of Object.entries(DIAGRAMS)) {
    for (const [theme, palette] of Object.entries(THEMES)) {
        const file = join(OUT, `${name}-${theme}.svg`);
        writeFileSync(file, fn(palette));
        console.log("wrote", file);
    }
}
