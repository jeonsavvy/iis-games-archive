window.__iis_game_boot_ok = true;
      window.IISLeaderboard = window.IISLeaderboard || {
        submit: async () => ({ ok: true }),
      };
      const CONFIG = {
        title: "자동차 조종 시뮬레이터 Infinite",
        genre: "arcade",
        slug: "game-9acc1acf8e12",
        mode: "request_faithful_generic",
        cameraModel: "third_person",
        locomotionModel: "on_foot",
        interactionModel: "action",
        worldTopology: "arena",
        progressionModel: "objective_chain",
        profileId: "cp-ce3cb002b001",
        moduleSignature: "24937fa919737ab9eda8",
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
    const locomotion = state.runtimeProfile.locomotionModel;
    if (locomotion === "flight") {
      const pitchInput = (state.input.pitchUp ? 1 : 0) - (state.input.pitchDown ? 1 : 0);
      const rollInput = (state.input.rollRight ? 1 : 0) - (state.input.rollLeft ? 1 : 0);
      const yawInput = (state.input.yawRight ? 1 : 0) - (state.input.yawLeft ? 1 : 0);
      const throttleInput = (state.input.throttleUp ? 1 : 0) - (state.input.throttleDown ? 1 : 0);
      state.flight.throttle = Math.max(0.35, Math.min(1.85, state.flight.throttle + throttleInput * dt * 0.65));
      state.flight.pitch = Math.max(-1.2, Math.min(1.2, state.flight.pitch + pitchInput * dt * 2.1));
      state.flight.roll = Math.max(-1.3, Math.min(1.3, state.flight.roll + rollInput * dt * 2.2));
      state.flight.yaw += yawInput * dt * 1.6;
      state.player.vx += (Math.sin(state.flight.yaw) * state.flight.throttle * 12 - state.player.vx * 1.8) * dt;
      state.player.vy += (state.flight.pitch * state.flight.throttle * 8 - state.player.vy * 2.2) * dt;
      state.player.vz = Math.max(6, (state.flight.speedBase + (state.flight.throttle * 22)) * (state.input.sprint ? 1.15 : 1.0));
      state.player.x += state.player.vx * dt;
      state.player.y += state.player.vy * dt;
      state.player.z += state.player.vz * dt;
      state.player.x = Math.max(-16, Math.min(16, state.player.x));
      state.player.y = Math.max(-4.5, Math.min(9.5, state.player.y));
      return;
    }

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
    if (state.runtimeProfile.interactionModel === "navigation") {
      return;
    }
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
    if (state.runtimeProfile.locomotionModel === "flight") {
      if (state.progress.waveTimer >= 1.15) {
        state.progress.waveTimer = 0;
        state.checkpoints.push({
          x: (Math.random() - 0.5) * 18,
          y: -1.2 + Math.random() * 8.2,
          z: state.player.z + 30 + Math.random() * 22,
          radius: 1.4 + Math.random() * 1.2,
          reward: 45,
          kind: "checkpoint",
        });
      }
      state.checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.z > state.player.z - 6);
      for (const checkpoint of state.checkpoints) {
        const dx = checkpoint.x - state.player.x;
        const dy = checkpoint.y - state.player.y;
        const dz = checkpoint.z - state.player.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq <= (checkpoint.radius * checkpoint.radius) * 1.3) {
          checkpoint.passed = true;
          state.score += checkpoint.reward;
          state.timeLeft = Math.min(120, state.timeLeft + 1.8);
          state.progress.objective = "Waypoints linked. Keep stable vector.";
        }
      }
      state.checkpoints = state.checkpoints.filter((checkpoint) => !checkpoint.passed);
      return;
    }
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
    hpEl.textContent = state.runtimeProfile.locomotionModel === "flight"
      ? `Stability: ${Math.max(0, Math.round(state.flight.throttle * 100))}%`
      : `HP: ${Math.max(0, state.hp)}`;
    objectiveEl.textContent = state.progress.objective;
  },
};

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
          pitchUp: false, pitchDown: false, rollLeft: false, rollRight: false,
          yawLeft: false, yawRight: false, throttleUp: false, throttleDown: false,
          toggleMode: false,
        },
        runtimeProfile: {
          cameraModel: CONFIG.cameraModel,
          locomotionModel: CONFIG.locomotionModel,
          interactionModel: CONFIG.interactionModel,
        },
        player: {
          x: 0, y: 0, z: 4, vx: 0, vy: 0, vz: 0, combo: 1, attackCooldown: 0, mode: "precision",
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
        checkpoints: [],
        worldObjects: [],
        statusMachine: "explore",
        flight: {
          throttle: 0.85,
          pitch: 0,
          roll: 0,
          yaw: 0,
          speedBase: 11,
        },
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
        if (key === "w") state.input.pitchUp = pressed;
        if (key === "s") state.input.pitchDown = pressed;
        if (key === "a") state.input.rollLeft = pressed;
        if (key === "d") state.input.rollRight = pressed;
        if (key === "q") state.input.yawLeft = pressed;
        if (key === "e") state.input.yawRight = pressed;
        if (key === "arrowup") state.input.throttleUp = pressed;
        if (key === "arrowdown") state.input.throttleDown = pressed;
        if (key === " ") state.input.attack = pressed;
        if (key === "shift") state.input.sprint = pressed;
        if (key === "e") state.input.interact = pressed;
        if (key === "c" && pressed) state.input.toggleMode = true;
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
        state.player.vy = 0;
        state.player.vz = 0;
        state.player.combo = 1;
        state.progress.wave = 1;
        state.progress.waveTimer = 0;
        state.progress.time = 0;
        state.progress.objective = "Engage hostiles and secure interactives";
        state.enemies = [];
        state.projectiles = [];
        state.interactives = [];
        state.checkpoints = [];
        state.flight.throttle = 0.85;
        state.flight.pitch = 0;
        state.flight.roll = 0;
        state.flight.yaw = 0;
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
        if (state.runtimeProfile.locomotionModel === "flight" || state.runtimeProfile.locomotionModel === "vehicle") {
          return;
        }
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
        } else if (kind === "checkpoint") {
          ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
          ctx.lineWidth = Math.max(2, radius * 0.15);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
          ctx.stroke();
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
        if (state.runtimeProfile.locomotionModel === "flight") {
          ctx.save();
          const horizonY = canvas.height * 0.58;
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, "rgba(30, 64, 175, 0.35)");
          gradient.addColorStop(0.58, "rgba(15, 23, 42, 0.12)");
          gradient.addColorStop(1, "rgba(2, 6, 23, 0.75)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "rgba(125, 211, 252, 0.28)";
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          ctx.lineTo(canvas.width, horizonY);
          ctx.stroke();
          ctx.restore();
          return;
        }
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
        for (const checkpoint of state.checkpoints) drawObject(checkpoint, "checkpoint", 1.0);
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