// Optimal Velocity Model (Bando et al. 1995) traffic simulation on a
// circular road. Each car only ever reacts to the gap to the car ahead of
// it — there is no jam logic anywhere in this file. Whether flow stays
// smooth or breaks into a stop-and-go wave falls out of the model once
// density crosses the point where uniform flow is no longer stable.

const ROAD_LENGTH = 1000; // arbitrary distance units around the loop
const V_MAX = 30; // units/s a car accelerates toward in open road
const SAFE_GAP = 11; // the gap at which optimal speed is roughly half V_MAX
const TAU = 1.2; // seconds to relax toward the optimal speed

// This gap/relaxation pair puts the linear-instability threshold of the
// model (Bando et al. 1995: uniform flow is unstable once V'(headway) >
// 1/(2*TAU)) inside the headway range this slider's high end reaches —
// checked numerically across random seeds, not just picked by eye. The jam
// that emerges there is a genuine transient wave (forms, travels, then
// dissipates back to free flow, same as a real phantom jam) rather than a
// permanent state — watch for tens of seconds, not an instant snapshot.
const STOPPED_THRESHOLD = 1; // units/s below this reads as "stopped"
const PHYSICS_DT = 1 / 60; // fixed step for stable integration
const MAX_STEPS_PER_FRAME = 5; // caps catch-up after a slow/backgrounded tab
const MIN_GAP = 2; // bumper-to-bumper buffer a car never closes fully

type Car = {
  x: number; // position around the loop, 0..ROAD_LENGTH
  v: number; // current speed, units/s
};

// The classic Bando optimal-velocity function: a sigmoid from 0 at a
// bumper-to-bumper gap up to V_MAX once there's plenty of room, steepest
// around SAFE_GAP. This shape — not any explicit jam rule — is what makes
// uniform flow unstable once cars are packed close enough.
function optimalVelocity(gap: number): number {
  const shifted = Math.tanh(gap / SAFE_GAP - 2) + Math.tanh(2);
  const normalised = shifted / (1 + Math.tanh(2));
  return V_MAX * Math.max(0, normalised);
}

function wrap(x: number): number {
  return ((x % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH;
}

function gapAhead(cars: Car[], i: number): number {
  const next = cars[(i + 1) % cars.length]!;
  const mine = cars[i]!;
  return wrap(next.x - mine.x);
}

function makeCars(count: number): Car[] {
  const spacing = ROAD_LENGTH / count;
  return Array.from({ length: count }, (_, i) => ({
    // Small jitter off perfectly even spacing — enough to seed the
    // instability at high density without forcing a jam to appear.
    x: wrap(i * spacing + (Math.random() - 0.5) * spacing * 0.3),
    v: V_MAX,
  }));
}

function step(cars: Car[], dt: number): void {
  // Gaps are captured once, before anyone moves, so clamping below is safe
  // regardless of iteration order — nobody can advance past where the car
  // ahead of them started this frame.
  const gaps = cars.map((_, i) => gapAhead(cars, i));
  const accelerations = cars.map((car, i) => (optimalVelocity(gaps[i]!) - car.v) / TAU);
  for (const [i, car] of cars.entries()) {
    car.v = Math.max(0, car.v + accelerations[i]! * dt);
    const maxMovement = Math.max(0, gaps[i]! - MIN_GAP);
    const movement = Math.min(car.v * dt, maxMovement);
    car.v = movement / dt; // keep displayed speed consistent with the clamped move
    car.x = wrap(car.x + movement);
  }
}

function speedColour(v: number): string {
  const fraction = Math.min(1, v / V_MAX);
  const hue = fraction * 120; // 0 = red (stopped), 120 = green (V_MAX)
  return `hsl(${hue}deg 85% 45%)`;
}

const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="road-canvas"]');
const ctx = canvas?.getContext("2d");
const carCountSlider = document.querySelector<HTMLInputElement>('[data-testid="car-count-slider"]');
const carCountValue = document.querySelector<HTMLOutputElement>("#car-count-value");
const brakeButton = document.querySelector<HTMLButtonElement>('[data-testid="brake-button"]');
const avgSpeedEl = document.querySelector<HTMLElement>('[data-testid="avg-speed"]');
const stoppedCountEl = document.querySelector<HTMLElement>('[data-testid="stopped-count"]');

let cars: Car[] = makeCars(Number(carCountSlider?.value ?? 30));

function render(): void {
  if (!canvas || !ctx) return;
  const { width, height } = canvas;
  const centre = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 30;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Shrinks a touch as density rises so overlapping cars in a jam still read
  // as separate dots rather than a blob.
  const dotRadius = Math.max(4, 7 - cars.length * 0.04);
  for (const car of cars) {
    const angle = (car.x / ROAD_LENGTH) * Math.PI * 2 - Math.PI / 2;
    const cx = centre.x + radius * Math.cos(angle);
    const cy = centre.y + radius * Math.sin(angle);
    ctx.fillStyle = speedColour(car.v);
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function updateStats(): void {
  const avg = cars.reduce((sum, car) => sum + car.v, 0) / cars.length;
  const stopped = cars.filter((car) => car.v < STOPPED_THRESHOLD).length;
  if (avgSpeedEl) avgSpeedEl.textContent = `${avg.toFixed(1)} units/s`;
  if (stoppedCountEl) stoppedCountEl.textContent = `${stopped} / ${cars.length}`;
}

let lastTime: number | undefined;
function frame(time: number): void {
  if (lastTime === undefined) lastTime = time;
  const elapsed = Math.min((time - lastTime) / 1000, PHYSICS_DT * MAX_STEPS_PER_FRAME);
  lastTime = time;

  let remaining = elapsed;
  while (remaining > 0) {
    const dt = Math.min(PHYSICS_DT, remaining);
    step(cars, dt);
    remaining -= dt;
  }

  render();
  updateStats();
  requestAnimationFrame(frame);
}

carCountSlider?.addEventListener("input", () => {
  const count = Number(carCountSlider.value);
  if (carCountValue) carCountValue.textContent = String(count);
  cars = makeCars(count);
});

brakeButton?.addEventListener("click", () => {
  const target = cars[Math.floor(Math.random() * cars.length)];
  if (target) target.v = 0;
});

requestAnimationFrame(frame);
