window.__iis_game_boot_ok = true;
      const CONFIG = {"mode": "arcade_generic", "title": "Archive Push: Final Verification", "genre": "arcade", "slug": "game-91af40d7b840", "accentColor": "#0EA5E9", "viewportWidth": 1280, "viewportHeight": 720, "safeAreaPadding": 24, "minFontSizePx": 14, "textOverflowPolicy": "ellipsis-clamp", "player_hp": 3, "player_speed": 300, "player_attack_cooldown": 0.4, "enemy_hp": 1, "enemy_speed_min": 120, "enemy_speed_max": 250, "enemy_spawn_rate": 0.8, "time_limit_sec": 90, "base_score_value": 50};
      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d");
      const overlay = document.getElementById("overlay");
      const overlayText = document.getElementById("overlay-text");
      const scoreEl = document.getElementById("score");
      const timerEl = document.getElementById("timer");
      const hpEl = document.getElementById("hp");
      const keys = new Set();

      const state = {
        running: true,
        score: 0,
        hp: CONFIG.player_hp || 3,
        timeLeft: CONFIG.time_limit_sec || 60,
        lastTime: 0,
        player: { x: canvas.width * 0.5, y: canvas.height * 0.8, w: 36, h: 56, vx: 0, vy: 0, lane: 1 },
        enemies: [],
        bullets: [],
        particles: [],
        spawnTimer: 0,
        enemyHp: CONFIG.enemy_hp || 1,
        attackCooldown: 0,
      };

      document.addEventListener("keydown", (e) => {
        keys.add(e.key);
        if (!state.running && (e.key === "r" || e.key === "R")) restartGame();
        if (CONFIG.mode === "arena_shooter" && e.code === "Space") {
          e.preventDefault();
          fireBullet();
        }
        if (CONFIG.mode === "duel_brawler" && e.code === "Space") {
          e.preventDefault();
          performAttack();
        }
      });
      document.addEventListener("keyup", (e) => keys.delete(e.key));
      document.getElementById("restart-btn").addEventListener("click", restartGame);

      function resetState() {
        state.running = true;
        state.score = 0;
        state.hp = CONFIG.player_hp || 3;
        state.timeLeft = CONFIG.time_limit_sec || 60;
        state.lastTime = 0;
        state.player = { x: canvas.width * 0.5, y: canvas.height * 0.8, w: 36, h: 56, vx: 0, vy: 0, lane: 1 };
        state.enemies = [];
        state.bullets = [];
        state.particles = [];
        state.spawnTimer = 0;
        state.enemyHp = CONFIG.enemy_hp || 1;
        state.attackCooldown = 0;
        overlay.classList.remove("show");
        updateHud();
      }

      function restartGame() { resetState(); }

      function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
      function rand(min, max) { return Math.random() * (max - min) + min; }
      function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }

      function spawnEnemy() {
        const spdMin = CONFIG.enemy_speed_min || 100;
        const spdMax = CONFIG.enemy_speed_max || 220;
        if (CONFIG.mode === "lane_dodge_racer") {
          const lanes = [0.28, 0.5, 0.72];
          const lane = Math.floor(Math.random() * lanes.length);
          state.enemies.push({ x: canvas.width * lanes[lane] - 18, y: -70, w: 36, h: 70, speed: rand(spdMin, spdMax) });
          return;
        }
        if (CONFIG.mode === "arena_shooter") {
          state.enemies.push({ x: rand(40, canvas.width - 80), y: -40, w: 30, h: 30, speed: rand(spdMin, spdMax), hp: CONFIG.enemy_hp || 1 });
          return;
        }
        if (CONFIG.mode === "duel_brawler") {
          if (state.enemies.length === 0) {
            state.enemies.push({ x: canvas.width * 0.5 + 120, y: canvas.height * 0.5, w: 46, h: 72, hp: state.enemyHp, speed: spdMin });
          }
          return;
        }
        state.enemies.push({ x: rand(40, canvas.width - 80), y: -40, w: 26, h: 26, speed: rand(spdMin, spdMax) });
      }

      function fireBullet() {
        if (!state.running) return;
        state.bullets.push({ x: state.player.x + state.player.w * 0.5 - 3, y: state.player.y, w: 6, h: 16, speed: 520 });
      }

      function performAttack() {
        if (!state.running || state.attackCooldown > 0) return;
        state.attackCooldown = CONFIG.player_attack_cooldown || 0.5;
        const enemy = state.enemies[0];
        if (!enemy) return;
        const dx = (enemy.x + enemy.w / 2) - (state.player.x + state.player.w / 2);
        const dy = (enemy.y + enemy.h / 2) - (state.player.y + state.player.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < 90) {
          enemy.hp -= 1;
          state.score += 45;
          burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#f59e0b", 10);
          if (enemy.hp <= 0) {
            state.score += 200;
            state.enemyHp += 3;
            state.enemies = [];
            burst(canvas.width / 2, canvas.height / 2, "#22c55e", 24);
          }
        }
      }

      function burst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
          state.particles.push({
            x, y, life: rand(0.2, 0.6), t: 0, color,
            vx: rand(-160, 160), vy: rand(-160, 160)
          });
        }
      }

      function update(dt) {
        if (!state.running) return;
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        state.spawnTimer += dt;
        state.attackCooldown = Math.max(0, state.attackCooldown - dt);
        const spawnRate = CONFIG.enemy_spawn_rate || 1.0;

        if (CONFIG.mode === "lane_dodge_racer") {
          const laneXs = [canvas.width * 0.28, canvas.width * 0.5, canvas.width * 0.72];
          if ((keys.has("ArrowLeft") || keys.has("a")) && state.player.lane > 0) { state.player.lane -= 1; keys.delete("ArrowLeft"); keys.delete("a"); }
          if ((keys.has("ArrowRight") || keys.has("d")) && state.player.lane < 2) { state.player.lane += 1; keys.delete("ArrowRight"); keys.delete("d"); }
          const targetX = laneXs[state.player.lane] - state.player.w / 2;
          state.player.x += (targetX - state.player.x) * Math.min(1, dt * 10);
          if (state.spawnTimer > spawnRate) { state.spawnTimer = 0; spawnEnemy(); }
          for (const e of state.enemies) e.y += e.speed * dt;
          for (const e of state.enemies) {
            if (rectsOverlap(state.player, e)) {
              state.hp -= 1;
              e.y = canvas.height + 100;
              burst(state.player.x + state.player.w/2, state.player.y + state.player.h/2, "#ef4444", 12);
            }
          }
          state.enemies = state.enemies.filter((e) => {
            const passed = e.y > canvas.height + 80;
            if (passed) state.score += (CONFIG.base_score_value || 10);
            return !passed;
          });
        } else if (CONFIG.mode === "arena_shooter") {
          const speed = CONFIG.player_speed || 260;
          state.player.vx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.spawnTimer > spawnRate) { state.spawnTimer = 0; spawnEnemy(); }
          for (const e of state.enemies) {
            e.y += e.speed * dt;
            if (e.y > canvas.height + 40) {
              e.y = canvas.height + 999;
              state.hp -= 1;
            }
            if (rectsOverlap(state.player, e)) {
              e.y = canvas.height + 999;
              state.hp -= 1;
              burst(state.player.x + state.player.w/2, state.player.y + state.player.h/2, "#ef4444", 14);
            }
          }
          for (const b of state.bullets) b.y -= b.speed * dt;
          for (const b of state.bullets) {
            for (const e of state.enemies) {
              if (e.y < canvas.height + 500 && rectsOverlap(b, e)) {
                e.y = canvas.height + 999;
                b.y = -999;
                state.score += (CONFIG.base_score_value || 10);
                burst(e.x + e.w/2, e.y + e.h/2, "#38bdf8", 8);
              }
            }
          }
          state.enemies = state.enemies.filter((e) => e.y < canvas.height + 120);
          state.bullets = state.bullets.filter((b) => b.y > -40);
        } else if (CONFIG.mode === "duel_brawler") {
          const speed = CONFIG.player_speed || 220;
          state.player.vx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.enemies.length === 0) spawnEnemy();
          for (const e of state.enemies) {
            const dx = state.player.x - e.x;
            const dy = state.player.y - e.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            e.x += (dx / len) * e.speed * dt;
            e.y += (dy / len) * e.speed * dt;
            if (rectsOverlap(state.player, e)) {
              state.hp -= 1;
              state.player.x = clamp(state.player.x - (dx / len) * 35, 20, canvas.width - state.player.w - 20);
              state.player.y = clamp(state.player.y - (dy / len) * 35, 60, canvas.height - state.player.h - 20);
              burst(state.player.x + state.player.w/2, state.player.y + state.player.h/2, "#ef4444", 10);
            }
          }
          state.score += dt * 8;
        } else {
          const speed = 240;
          state.player.vx = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.spawnTimer > 0.6) { state.spawnTimer = 0; spawnEnemy(); }
          for (const e of state.enemies) {
            e.y += e.speed * dt;
            if (rectsOverlap(state.player, e)) { state.hp -= 1; e.y = canvas.height + 999; }
          }
          state.enemies = state.enemies.filter((e) => e.y < canvas.height + 100);
          state.score += dt * 10;
        }

        for (const p of state.particles) {
          p.t += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        state.particles = state.particles.filter((p) => p.t < p.life);

        if (state.timeLeft <= 0 || state.hp <= 0) {
          endGame();
        }
        updateHud();
      }

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (CONFIG.mode === "lane_dodge_racer") {
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(canvas.width * 0.2, 0, canvas.width * 0.6, canvas.height);
          ctx.strokeStyle = "rgba(148,163,184,.35)";
          ctx.setLineDash([18, 26]);
          for (const x of [canvas.width * 0.4, canvas.width * 0.6]) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
          }
          ctx.setLineDash([]);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
          g.addColorStop(0, "#0a1020");
          g.addColorStop(1, "#070b16");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < 120; i++) {
            ctx.fillStyle = `rgba(148,163,184,${(i % 5) * 0.02})`;
            ctx.fillRect((i * 73) % canvas.width, (i * 41) % canvas.height, 2, 2);
          }
        }

        for (const e of state.enemies) {
          ctx.fillStyle = CONFIG.mode === "duel_brawler" ? "#b91c1c" : "#ef4444";
          ctx.shadowBlur = 14;
          ctx.shadowColor = "rgba(239,68,68,0.45)";
          ctx.fillRect(e.x, e.y, e.w, e.h);
        }
        for (const b of state.bullets) {
          ctx.fillStyle = "#38bdf8";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(56,189,248,0.55)";
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        for (const p of state.particles) {
          const a = 1 - p.t / p.life;
          ctx.fillStyle = p.color.replace(")", `, ${a})`).replace("rgb", "rgba");
          ctx.globalAlpha = a;
          ctx.fillRect(p.x, p.y, 3, 3);
          ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(79,124,255,0.5)";
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
        if (CONFIG.mode === "duel_brawler" && state.attackCooldown > 0) {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(state.player.x + state.player.w/2, state.player.y + state.player.h/2, 52, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      function updateHud() {
        scoreEl.textContent = `Score: ${Math.floor(state.score)}`;
        timerEl.textContent = `Time: ${state.timeLeft.toFixed(1)}`;
        hpEl.textContent = `HP: ${Math.max(0, state.hp)}`;
      }

      function endGame() {
        if (!state.running) return;
        state.running = false;
        overlayText.textContent = `최종 점수 ${Math.floor(state.score)} · 다시 시작하려면 R`;
        overlay.classList.add("show");
      }

      function frame(ts) {
        if (!state.lastTime) state.lastTime = ts;
        const dt = Math.min(0.05, (ts - state.lastTime) / 1000);
        state.lastTime = ts;
        update(dt);
        draw();
        requestAnimationFrame(frame);
      }

      async function submitScore(playerName, score, fingerprint) {
        const endpoint = window.__IIS_LEADERBOARD_ENDPOINT;
        const anonKey = window.__IIS_SUPABASE_ANON_KEY;
        const gameId = window.__IIS_GAME_ID;
        if (!endpoint || !anonKey || !gameId) return { status: "skipped", reason: "missing_env" };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              game_id: gameId,
              player_name: playerName,
              score,
              player_fingerprint: fingerprint,
            }),
            signal: controller.signal,
          });
          if (!response.ok) return { status: "error", reason: `http_${response.status}` };
          return { status: "ok" };
        } catch (error) {
          return { status: "error", reason: String(error) };
        } finally {
          clearTimeout(timeout);
        }
      }

      window.IISLeaderboard = { submitScore };
      resetState();
      requestAnimationFrame(frame);