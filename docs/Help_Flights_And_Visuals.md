## Eufloria-style Flights and Visuals – Tuning Guide (Shareable)

This document pinpoints the exact code controlling unit flight speed/duration, battle visuals, and planet power indicators across the frontend and backend. Share this file to get targeted help. All code blocks are clickable to jump to the right lines.

### Frontend: Flights timing and density

- Units-moved handler (creates flights; adjust duration and count)
```345:356:src/components/GameWorld.tsx
const count = Math.min(400, Math.max(40, Number(d.amount) || 80));
const dx = to[0]-from[0], dy = to[1]-from[1], dz = to[2]-from[2];
const dist = Math.max(0.001, Math.hypot(dx, dy, dz));
const dur = Math.max(Number(d.eta_ms) || 0, Math.min(12000, Math.max(3500, dist * 1200)));
const id = `${d.from_id}->${d.to_id}-${Date.now()}`;
setFlights(prev => [...prev, { id, start: performance.now(), durationMs: dur, from, to, count }]);
```

- Per-instance flight staggering and playback speed
```42:66:src/components/GameWorld.tsx
const offsets = useMemo(() => new Array(flight.count).fill(0).map(() => Math.random() * 500), [flight.count]);
...
const elapsed = (now - flight.start - offsets[i]) * Math.max(0.25, speed);
const t = Math.min(1, Math.max(0, elapsed / flight.durationMs));
```

- Optimistic flights when clicking UI buttons (client-side burst)
```866:880:src/components/GameWorld.tsx
window.dispatchEvent(new CustomEvent('units-moved', { detail: {
  from_id: fromId, to_id: selectedPlanet.id, amount: sendAmount,
  from_position: fromPos, to_position: toPos, eta_ms: 1400
}} as any));
```

```881:905:src/components/GameWorld.tsx
window.dispatchEvent(new CustomEvent('units-moved', { detail: {
  from_id: fromId, to_id: selectedPlanet.id, amount: Math.max(sendAmount, 80),
  from_position: fromPos, to_position: toPos, eta_ms: 1400
}} as any));
...
window.dispatchEvent(new CustomEvent('attack-result', { detail: {
  planetId: selectedPlanet.id,
  success: true,
  position: toPos
}} as any));
```

### Frontend: Continuous battle visuals at target

- Initial particle velocities and lifetime
```368:381:src/components/GameWorld.tsx
const vx = (dx / len) * (0.012 + Math.random() * 0.018);
const vy = (dy / len) * (0.012 + Math.random() * 0.018);
const vz = (dz / len) * (0.012 + Math.random() * 0.018);
particles.push({ x: from[0] + ox, y: from[1] + oy, z: from[2] + oz, vx, vy, vz, life: 2.0, maxLife: 2.0 });
```

- Battle update loop (movement/decay and spark lifetime)
```432:458:src/components/GameWorld.tsx
p.x += p.vx * 1000 * delta * speedMul;
...
p.life -= delta * 0.35 * speedMul;
...
s.life -= delta * speedMul;
```

### Frontend: Effect lifetimes (flashes, rings, beams)

```121:143:src/components/GameWorld.tsx
effectRef.current.life += delta * 1000 * Math.max(0.25, speed); // ms
if (effectRef.current.life > 900) {
  setActionEffect(null);
  effectRef.current.life = 0;
}
```

### Frontend: Planet power/defense visuals (galaxy view)

```739:784:src/components/GameWorld.tsx
const power = Math.max(0, Math.min(1, (p.defense ?? 0) / 10));
...
<ringGeometry args={[0.56, 0.56 + power * 0.6, 64]} />
...
<sphereGeometry args={[0.35 + power * 0.2, 16, 16]} />
```

### Frontend: Extra visual burst after attack_result

```476:501:src/context/GameContext.tsx
window.dispatchEvent(new CustomEvent('units-moved', { detail: {
  from_id: 'home', to_id: planetId, amount: 200,
  from_position: home || { x: 0, y: 0, z: 0 }, to_position: pos, eta_ms: 2800
}} as any));
```

### Frontend: Flight Colors (Friendly vs. Enemy)

- Flights are colored based on ownership. Friendly flights are green, and enemy flights are red.
```86:92:src/components/GameWorld.tsx
const flightColor = flight.owner === playerId ? "#66ff66" : "#ff6666";
...
<meshBasicMaterial color={flightColor} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
```

### Backend: Suggested ETA for movements

```323:333:python/leverage_service.py
await websocket.send_json({
    "type": "units_moved",
    "payload": {
        ...,
        "eta_ms": 1500
    }
})
```

## What to change to slow flights and add more visuals

- Increase minimum/maximum duration and distance multiplier
  - In `src/components/GameWorld.tsx` (lines 345–356):
    - Raise the inner Math.max floor from 3500 → 8000.
    - Raise the outer Math.min cap from 12000 → 20000.
    - Increase `dist * 1200` → `dist * 2000` (or higher) for distance scaling.

- Stagger more and slow animation clock
  - In `FlightMesh` (lines 42–66):
    - Increase offsets from `Math.random()*500` → `Math.random()*2000`.
    - Lower the speed floor `Math.max(0.25, speed)` → `Math.max(0.15, speed)`.

- Make optimistic UI flights slower
  - In `src/components/GameWorld.tsx` (lines 866–905): set `eta_ms` to 6000–10000.
  - In `src/context/GameContext.tsx` (lines 476–501): set `eta_ms` to 6000–10000, or remove the extra burst.

- Slow battle particles and lengthen life
  - In `src/components/GameWorld.tsx` (lines 368–381): lower velocity factors to ~0.006–0.012 and set life to 3.0–4.0.
  - In `src/components/GameWorld.tsx` (lines 432–458): reduce decay multipliers (e.g., 0.35 → 0.2; spark decay 1.0 → 0.7).

- Keep flashes/beams visible longer
  - In `src/components/GameWorld.tsx` (lines 121–143): raise cutoff from 900 → 1800–2200.

- Make planet power more obvious
  - In `src/components/GameWorld.tsx` (lines 739–784): increase ring thickness (outer radius diffs) and aura radius/opacity.

## Notes

- If you prefer server-driven pacing, also raise `eta_ms` in `python/leverage_service.py` (lines 323–333).
- For a global UX control, we can extract these numbers into a shared constants block to adjust from one place.


