window.__iis_game_boot_ok = true;
      window.IISLeaderboard = window.IISLeaderboard || {
        submit: async () => ({ ok: true }),
      };
      const CONFIG = {
        title: "AeroFront: Flight Simulator",
        genre: "flight-simulation-3d",
        slug: "game-62b09fd76be2",
        mode: "flight_sim_3d",
        cameraModel: "chase",
        locomotionModel: "flight",
        interactionModel: "navigation",
        worldTopology: "airspace",
        progressionModel: "objective_chain",
        profileId: "cp-8efa689882f6",
        moduleSignature: "53ab66e08d268aec74c6",
        modulePlan: "scene_world,camera_stack,controller_stack,combat_stack,progression_stack,feedback_stack,hud_stack",
        rqcVersion: "rqc-1",
      };

      const runtimeModules = {};
runtimeModules.scene_world = {
  buildWorld(state) {
    state.worldObjects = [];
    for (let i = 0; i < 22; i++) {
      state.worldObjects.push({
        kind: i % 5 === 0 ? "interactive" : "environment",
        x: (Math.random() - 0.5) * 22,
        y: 0,
        z: 15 + (i * 8),
        radius: 0.7 + Math.random() * 0.8,
      });
    }
  },
};
runtimeModules.camera_stack = {
  createPerspective(fovRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRad / 2);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0,
    ];
  },
  project(state, p) {
    const depth = Math.max(1.2, p.z - state.camera.z);
    const scale = state.camera.focal / depth;
    return {
      x: state.viewport.w * 0.5 + (p.x - state.camera.x) * scale,
      y: state.viewport.h * 0.62 - (p.y - state.camera.y) * scale,
      s: scale,
      depth,
    };
  },
};
runtimeModules.controller_stack = {
  update(state, dt) {
    const axisX = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
    const axisY = (state.input.up ? 1 : 0) - (state.input.down ? 1 : 0);
    const sprint = state.input.sprint ? 1.5 : 1.0;
    const accel = 8.4 * sprint;
    state.player.vx += (axisX * accel - state.player.vx * 3.8) * dt;
    state.player.vz += (axisY * accel - state.player.vz * 3.8) * dt;
    state.player.x += state.player.vx * dt;
    state.player.z += state.player.vz * dt;
    state.player.x = Math.max(-10, Math.min(10, state.player.x));
    state.player.z = Math.max(1.5, Math.min(42, state.player.z));
    if (state.input.toggleMode) {
      state.player.mode = state.player.mode === "precision" ? "aggressive" : "precision";
      state.input.toggleMode = false;
    }
  },
};
runtimeModules.combat_stack = {
  update(state, dt) {
    state.player.attackCooldown = Math.max(0, state.player.attackCooldown - dt);
    if (state.input.attack && state.player.attackCooldown <= 0) {
      state.player.attackCooldown = 0.24;
      state.projectiles.push({
        x: state.player.x,
        y: 0.2,
        z: state.player.z + 1.2,
        vx: 0,
        vz: 18,
        ttl: 1.6,
      });
      state.feedback.hitPulse = 1;
    }
    for (const bullet of state.projectiles) {
      bullet.x += bullet.vx * dt;
      bullet.z += bullet.vz * dt;
      bullet.ttl -= dt;
    }
    state.projectiles = state.projectiles.filter((bullet) => bullet.ttl > 0);
  },
};
runtimeModules.progression_stack = {
  update(state, dt) {
    state.progress.time += dt;
    state.progress.waveTimer += dt;
    if (state.progress.waveTimer >= state.progress.spawnCadence) {
      state.progress.waveTimer = 0;
      state.enemies.push({
        x: (Math.random() - 0.5) * 18,
        y: 0,
        z: 30 + Math.random() * 20,
        hp: 2 + Math.floor(state.progress.wave * 0.5),
        speed: 2.2 + (state.progress.wave * 0.18),
        kind: state.progress.wave % 4 === 0 ? "elite" : "enemy",
      });
      if (state.progress.wave % 3 === 0) {
        state.interactives.push({
          x: (Math.random() - 0.5) * 16,
          y: 0,
          z: 14 + Math.random() * 14,
          reward: 25,
        });
      }
      state.progress.wave += 1;
    }
  },
};
runtimeModules.feedback_stack = {
  update(state, dt) {
    state.feedback.hitPulse = Math.max(0, state.feedback.hitPulse - dt * 2.8);
    state.feedback.damagePulse = Math.max(0, state.feedback.damagePulse - dt * 1.8);
    state.feedback.cameraShake = Math.max(0, state.feedback.cameraShake - dt * 2.4);
  },
  emitDamage(state) {
    state.feedback.damagePulse = 1;
    state.feedback.cameraShake = 0.6;
  },
};
runtimeModules.hud_stack = {
  render(state, scoreEl, timerEl, hpEl, objectiveEl) {
    scoreEl.textContent = `Score: ${Math.floor(state.score)} · Combo x${state.player.combo.toFixed(1)}`;
    timerEl.textContent = `Time: ${Math.max(0, state.timeLeft).toFixed(1)}s`;
    hpEl.textContent = `HP: ${Math.max(0, state.hp)}`;
    objectiveEl.textContent = state.progress.objective;
  },
};
runtimeModules.flight_physics = { enabled: true };
runtimeModules.camera_fx = { enabled: true };

      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d", { alpha: false });
      const overlay = document.getElementById("overlay");
      const overlayText = document.getElementById("overlay-text");
      const scoreEl = document.getElementById("score");
      const timerEl = document.getElementById("timer");
      const hpEl = document.getElementById("hp");
      const objectiveEl = document.getElementById("objective");
      const restartBtn = document.getElementById("restart-btn");
      const glCanvas = document.createElement("canvas");
      glCanvas.width = canvas.width;
      glCanvas.height = canvas.height;
      const gl = glCanvas.getContext("webgl", { antialias: true });

      const state = {
        running: true,
        score: 0,
        hp: 3,
        timeLeft: 90,
        runtimeSec: 0,
        lastTs: 0,
        viewport: { w: canvas.width, h: canvas.height },
        input: {
          left: false, right: false, up: false, down: false,
          attack: false, sprint: false, interact: false, altAction: false,
          toggleMode: false,
        },
        player: {
          x: 0, y: 0, z: 4, vx: 0, vz: 0, combo: 1, attackCooldown: 0, mode: "precision",
        },
        camera: {
          x: 0, y: 2.2, z: -2.8, focal: 760,
        },
        feedback: {
          hitPulse: 0, damagePulse: 0, cameraShake: 0,
        },
        progress: {
          wave: 1,
          waveTimer: 0,
          spawnCadence: 1.35,
          objective: "Engage hostiles and secure interactives",
          time: 0,
        },
        enemies: [],
        projectiles: [],
        interactives: [],
        worldObjects: [],
        statusMachine: "explore",
      };

      function drawWebglBackdrop(t) {
        if (!gl) return;
        const r = 0.03 + Math.sin(t * 0.00025) * 0.02;
        const g = 0.06 + Math.cos(t * 0.0002) * 0.015;
        const b = 0.12 + Math.sin(t * 0.0003) * 0.025;
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(r, g, b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
      }

      function setInputFromKey(key, pressed) {
        if (key === "a" || key === "arrowleft") state.input.left = pressed;
        if (key === "d" || key === "arrowright") state.input.right = pressed;
        if (key === "w" || key === "arrowup") state.input.up = pressed;
        if (key === "s" || key === "arrowdown") state.input.down = pressed;
        if (key === " ") state.input.attack = pressed;
        if (key === "shift") state.input.sprint = pressed;
        if (key === "e") state.input.interact = pressed;
        if (key === "q" && pressed) state.input.toggleMode = true;
      }

      document.addEventListener("keydown", (event) => {
        if (!state.running && (event.key === "r" || event.key === "R")) {
          restartGame();
          return;
        }
        setInputFromKey(event.key.toLowerCase(), true);
      });
      document.addEventListener("keyup", (event) => {
        setInputFromKey(event.key.toLowerCase(), false);
      });
      restartBtn.addEventListener("click", restartGame);

      window.addEventListener("message", (event) => {
        const data = event.data || {};
        if (data.type === "iis:recover:start" && !state.running && state.runtimeSec < 8.0) {
          restartGame();
        }
      });

      function restartGame() {
        state.running = true;
        state.score = 0;
        state.hp = 3;
        state.timeLeft = 90;
        state.runtimeSec = 0;
        state.lastTs = 0;
        state.player.x = 0;
        state.player.z = 4;
        state.player.vx = 0;
        state.player.vz = 0;
        state.player.combo = 1;
        state.progress.wave = 1;
        state.progress.waveTimer = 0;
        state.progress.time = 0;
        state.progress.objective = "Engage hostiles and secure interactives";
        state.enemies = [];
        state.projectiles = [];
        state.interactives = [];
        runtimeModules.scene_world?.buildWorld(state);
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
      }

      function damagePlayer(amount) {
        state.hp = Math.max(0, state.hp - amount);
        runtimeModules.feedback_stack?.emitDamage(state);
      }

      function updateStatusMachine() {
        if (!state.running) {
          state.statusMachine = "recover";
          return;
        }
        if (state.feedback.damagePulse > 0.45) {
          state.statusMachine = "combat";
          return;
        }
        if (state.input.sprint) {
          state.statusMachine = "dash";
          return;
        }
        state.statusMachine = "explore";
      }

      function updateEnemies(dt) {
        for (const enemy of state.enemies) {
          const dx = state.player.x - enemy.x;
          const dz = state.player.z - enemy.z;
          const dist = Math.max(0.001, Math.hypot(dx, dz));
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.z += (dz / dist) * enemy.speed * dt;
          if (dist < 1.15) {
            damagePlayer(enemy.kind === "elite" ? 1.2 : 0.5);
          }
        }
      }

      function resolveProjectiles() {
        for (const bullet of state.projectiles) {
          for (const enemy of state.enemies) {
            if (enemy.hp <= 0) continue;
            const dx = enemy.x - bullet.x;
            const dz = enemy.z - bullet.z;
            if ((dx * dx + dz * dz) < 1.1) {
              enemy.hp -= 1;
              state.score += enemy.kind === "elite" ? 50 : 20;
              state.player.combo = Math.min(8, state.player.combo + 0.15);
              state.feedback.hitPulse = 1;
              bullet.ttl = 0;
            }
          }
        }
        state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
      }

      function resolveInteractives() {
        for (const item of state.interactives) {
          const dx = item.x - state.player.x;
          const dz = item.z - state.player.z;
          if ((dx * dx + dz * dz) < 1.2) {
            state.score += item.reward;
            state.timeLeft = Math.min(120, state.timeLeft + 3);
            item.taken = true;
          }
        }
        state.interactives = state.interactives.filter((item) => !item.taken);
      }

      function drawObject(point, kind, scale = 1) {
        const projected = runtimeModules.camera_stack.project(state, point);
        const radius = Math.max(2, 16 * projected.s * scale);
        if (projected.x < -60 || projected.x > canvas.width + 60) return;
        if (projected.y < -60 || projected.y > canvas.height + 60) return;
        ctx.save();
        ctx.translate(projected.x, projected.y);
        if (kind === "enemy") {
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-radius * 0.55, -radius * 0.65, radius * 1.1, radius * 1.3);
        } else if (kind === "elite") {
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.moveTo(0, -radius);
          ctx.lineTo(radius * 0.95, radius * 0.35);
          ctx.lineTo(-radius * 0.95, radius * 0.35);
          ctx.closePath();
          ctx.fill();
        } else if (kind === "interactive") {
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === "player") {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(-radius * 0.42, -radius * 0.72, radius * 0.84, radius * 1.44);
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(-radius * 0.2, -radius * 0.8, radius * 0.4, radius * 0.26);
        } else {
          ctx.fillStyle = "#334155";
          ctx.fillRect(-radius * 0.5, -radius * 0.5, radius, radius);
        }
        ctx.restore();
      }

      function drawGround() {
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
          const z = 4 + i * 3.2;
          const p0 = runtimeModules.camera_stack.project(state, { x: -12, y: 0, z });
          const p1 = runtimeModules.camera_stack.project(state, { x: 12, y: 0, z });
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const x = -11 + i * 2;
          const p0 = runtimeModules.camera_stack.project(state, { x, y: 0, z: 4 });
          const p1 = runtimeModules.camera_stack.project(state, { x, y: 0, z: 52 });
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      function renderFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGround();
        for (const obj of state.worldObjects) drawObject(obj, obj.kind, 0.8);
        for (const item of state.interactives) drawObject(item, "interactive", 1.0);
        for (const enemy of state.enemies) drawObject(enemy, enemy.kind, 1.1);
        for (const bullet of state.projectiles) drawObject(bullet, "interactive", 0.5);
        drawObject({ x: state.player.x, y: 0, z: state.player.z }, "player", 1.2);

        if (state.feedback.hitPulse > 0.01) {
          ctx.fillStyle = `rgba(34, 211, 238, ${state.feedback.hitPulse * 0.18})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (state.feedback.damagePulse > 0.01) {
          ctx.fillStyle = `rgba(239, 68, 68, ${state.feedback.damagePulse * 0.2})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      function endGame() {
        state.running = false;
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        overlayText.textContent = `최종 점수 ${Math.floor(state.score)} · 상태 ${state.statusMachine}`;
      }

      function step(ts) {
        if (!state.lastTs) state.lastTs = ts;
        const dt = Math.min(0.05, Math.max(0.001, (ts - state.lastTs) / 1000));
        state.lastTs = ts;

        drawWebglBackdrop(ts);

        if (state.running) {
          state.runtimeSec += dt;
          state.timeLeft = Math.max(0, state.timeLeft - dt);
          runtimeModules.controller_stack.update(state, dt);
          runtimeModules.combat_stack.update(state, dt);
          runtimeModules.progression_stack.update(state, dt);
          updateEnemies(dt);
          resolveProjectiles();
          resolveInteractives();
          runtimeModules.feedback_stack.update(state, dt);
          updateStatusMachine();
          if (state.hp <= 0 || state.timeLeft <= 0) {
            endGame();
          }
        }

        renderFrame();
        runtimeModules.hud_stack.render(state, scoreEl, timerEl, hpEl, objectiveEl);
        requestAnimationFrame(step);
      }

      runtimeModules.scene_world?.buildWorld(state);
      requestAnimationFrame(step);