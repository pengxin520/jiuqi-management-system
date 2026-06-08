<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  name: "ParticleBackground"
});

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  drift: number;
};

const particleCanvasRef = ref<HTMLCanvasElement>();

const pointer = {
  x: null as number | null,
  y: null as number | null,
  active: false
};

const particlePalette = [
  "rgba(190, 138, 88, 0.34)",
  "rgba(210, 159, 104, 0.3)",
  "rgba(160, 133, 111, 0.28)",
  "rgba(222, 178, 128, 0.26)"
];

let particles: Particle[] = [];
let particleCtx: CanvasRenderingContext2D | null = null;
let particleFrameId = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let canvasPixelRatio = 1;

const getParticleCount = () => {
  const area = window.innerWidth * window.innerHeight;
  return Math.max(42, Math.min(78, Math.floor(area / 16000)));
};

const createParticle = (x?: number, y?: number): Particle => {
  const speed = 0.18 + Math.random() * 0.42;
  const angle = Math.random() * Math.PI * 2;

  return {
    x: x ?? Math.random() * canvasWidth,
    y: y ?? Math.random() * canvasHeight,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1.2 + Math.random() * 2,
    color: particlePalette[Math.floor(Math.random() * particlePalette.length)],
    drift: Math.random() * Math.PI * 2
  };
};

const resizeParticleCanvas = () => {
  const canvas = particleCanvasRef.value;
  if (!canvas || !particleCtx) return;

  canvasPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  canvas.width = Math.floor(canvasWidth * canvasPixelRatio);
  canvas.height = Math.floor(canvasHeight * canvasPixelRatio);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  particleCtx.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);

  const targetCount = getParticleCount();
  if (particles.length < targetCount) {
    for (let i = particles.length; i < targetCount; i += 1) {
      particles.push(createParticle());
    }
  } else {
    particles = particles.slice(0, targetCount);
  }
};

const drawParticle = (particle: Particle) => {
  if (!particleCtx) return;

  particleCtx.beginPath();
  particleCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  particleCtx.fillStyle = particle.color;
  particleCtx.fill();
};

const drawParticleLine = (
  a: Pick<Particle, "x" | "y">,
  b: Pick<Particle, "x" | "y">,
  maxDistance: number,
  baseAlpha: number
) => {
  if (!particleCtx) return;

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > maxDistance) return;

  const alpha = (1 - distance / maxDistance) * baseAlpha;
  particleCtx.beginPath();
  particleCtx.moveTo(a.x, a.y);
  particleCtx.lineTo(b.x, b.y);
  particleCtx.strokeStyle = `rgba(184, 129, 76, ${alpha})`;
  particleCtx.lineWidth = 0.7;
  particleCtx.stroke();
};

const applyPointerPull = (particle: Particle) => {
  if (!pointer.active || pointer.x === null || pointer.y === null) return;

  const dx = pointer.x - particle.x;
  const dy = pointer.y - particle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = 150;

  if (distance < radius && distance > 1) {
    const force = (1 - distance / radius) * 0.018;
    particle.vx += (dx / distance) * force;
    particle.vy += (dy / distance) * force;
  }

  particle.vx *= 0.995;
  particle.vy *= 0.995;
};

const updateParticle = (particle: Particle) => {
  particle.drift += 0.006;
  particle.x += particle.vx + Math.cos(particle.drift) * 0.05;
  particle.y += particle.vy + Math.sin(particle.drift) * 0.05;

  if (particle.x < -20) particle.x = canvasWidth + 20;
  if (particle.x > canvasWidth + 20) particle.x = -20;
  if (particle.y < -20) particle.y = canvasHeight + 20;
  if (particle.y > canvasHeight + 20) particle.y = -20;
};

const drawPointerLinks = () => {
  if (!pointer.active || pointer.x === null || pointer.y === null) return;

  const virtualParticle = { x: pointer.x, y: pointer.y };
  for (const particle of particles) {
    drawParticleLine(particle, virtualParticle, 150, 0.22);
  }
};

const renderParticles = () => {
  if (!particleCtx) return;

  particleCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      drawParticleLine(particles[i], particles[j], 135, 0.12);
    }
  }

  drawPointerLinks();

  for (const particle of particles) {
    applyPointerPull(particle);
    updateParticle(particle);
    drawParticle(particle);
  }

  particleFrameId = window.requestAnimationFrame(renderParticles);
};

const handleParticlePointerMove = (event: PointerEvent) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
};

const handleParticlePointerLeave = () => {
  pointer.active = false;
};

const handleParticleClick = (event: MouseEvent) => {
  const additions = Math.min(
    4,
    Math.max(2, Math.floor(particles.length * 0.05))
  );

  for (let i = 0; i < additions; i += 1) {
    const offsetX = (Math.random() - 0.5) * 34;
    const offsetY = (Math.random() - 0.5) * 34;
    particles.push(
      createParticle(event.clientX + offsetX, event.clientY + offsetY)
    );
  }

  const maxParticles = getParticleCount() + 18;
  if (particles.length > maxParticles) {
    particles.splice(0, particles.length - maxParticles);
  }
};

onMounted(() => {
  const canvas = particleCanvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  particleCtx = ctx;
  resizeParticleCanvas();
  renderParticles();

  window.addEventListener("resize", resizeParticleCanvas);
  window.addEventListener("pointermove", handleParticlePointerMove);
  window.addEventListener("pointerleave", handleParticlePointerLeave);
  window.addEventListener("click", handleParticleClick);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeParticleCanvas);
  window.removeEventListener("pointermove", handleParticlePointerMove);
  window.removeEventListener("pointerleave", handleParticlePointerLeave);
  window.removeEventListener("click", handleParticleClick);
  window.cancelAnimationFrame(particleFrameId);

  particles = [];
  particleCtx = null;
  pointer.x = null;
  pointer.y = null;
  pointer.active = false;
});
</script>

<template>
  <div class="particle-background" aria-hidden="true">
    <canvas ref="particleCanvasRef" class="particle-background__canvas" />
    <div class="particle-background__glow" />
  </div>
</template>

<style scoped>
.particle-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.particle-background__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.particle-background__glow {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 48%),
      transparent 24%,
      transparent 76%,
      rgb(255 248 238 / 40%)
    ),
    linear-gradient(
      180deg,
      rgb(255 250 242 / 28%),
      transparent 34%,
      rgb(255 236 214 / 24%)
    );
}
</style>
