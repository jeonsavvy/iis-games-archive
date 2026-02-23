window.__iis_game_boot_ok = true;
      const CONFIG = {"mode": "webgl_three_runner", "title": "Neon Drift: Outrun Chain", "genre": "score-attack", "slug": "webgl-three-js-3d-outrun", "accentColor": "#0EA5E9", "viewportWidth": 1280, "viewportHeight": 720, "safeAreaPadding": 24, "minFontSizePx": 14, "textOverflowPolicy": "ellipsis-clamp", "assetPack": {"name": "webgl_neon_highway", "bg_top": "#111827", "bg_bottom": "#020617", "horizon": "#13233f", "track": "#080f1d", "hud_primary": "#e2e8f0", "hud_muted": "#93c5fd", "player_primary": "#22C55E", "player_secondary": "#0f172a", "enemy_primary": "#F8FAFC", "enemy_elite": "#f97316", "boost_color": "#22d3ee", "accent": "#0EA5E9", "particle": "#38bdf8", "sfx_profile": "synth_race", "sprite_profile": "neon"}, "player_hp": 1, "player_speed": 400, "player_attack_cooldown": 0.2, "enemy_hp": 1, "enemy_speed_min": 120, "enemy_speed_max": 250, "enemy_spawn_rate": 0.4, "time_limit_sec": 90, "base_score_value": 50};
      const ASSET = {
        name: "neon_arcade",
        bg_top: "#08122f",
        bg_bottom: "#050915",
        horizon: "#0f172a",
        track: "#111827",
        hud_primary: "#e2e8f0",
        hud_muted: "#93c5fd",
        player_primary: "#38bdf8",
        player_secondary: "#0f172a",
        enemy_primary: "#ef4444",
        enemy_elite: "#f97316",
        boost_color: "#22d3ee",
        accent: "#22c55e",
        particle: "#22c55e",
        sfx_profile: "synth",
        sprite_profile: "neon",
        ...(CONFIG.assetPack || {}),
      };
      const MODE_IS_FLIGHT_SIM = CONFIG.mode === "flight_sim_3d";
      const MODE_IS_3D_RUNNER = CONFIG.mode === "lane_dodge_racer" || CONFIG.mode === "webgl_three_runner";
      const MODE_USES_WEBGL_BG = CONFIG.mode === "webgl_three_runner" || MODE_IS_FLIGHT_SIM;
      const MODE_IS_SHOOTER = CONFIG.mode === "arena_shooter" || CONFIG.mode === "topdown_roguelike_shooter";
      const MODE_IS_BRAWLER = CONFIG.mode === "duel_brawler" || CONFIG.mode === "comic_action_brawler_3d";
      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d");
      const webglCanvas = document.createElement("canvas");
      webglCanvas.width = canvas.width;
      webglCanvas.height = canvas.height;
      const gl = MODE_USES_WEBGL_BG ? webglCanvas.getContext("webgl", { antialias: true }) : null;
      const overlay = document.getElementById("overlay");
      const overlayText = document.getElementById("overlay-text");
      const scoreEl = document.getElementById("score");
      const timerEl = document.getElementById("timer");
      const hpEl = document.getElementById("hp");
      const keys = new Set();
      let audioCtx = null;
      let webglRuntime = null;

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
        dashCooldown: 0,
        run: {
          level: 1,
          levelTimer: 0,
          difficultyScale: 1,
          combo: 0,
          comboTimer: 0,
          eliteTimer: 0,
          autoFireTimer: 0,
          shake: 0,
          relics: [],
          upgrades: [],
          xp: 0,
          nextXp: 120,
        },
        racer: {
          speed: 280,
          boostTimer: 0,
          laneFloat: 1,
          roadScroll: 0,
          roadCurve: 0,
          roadCurveTarget: 0,
          curveTimer: 0,
          distance: 0,
        },
        topdown: {
          orbitAngle: 0,
        },
        flight: {
          speed: 320,
          throttle: 0.58,
          pitch: 0,
          roll: 0,
          yaw: 0,
          bankVisual: 0,
          altitude: 0.5,
          stability: 1,
          checkpointCombo: 0,
        },
      };

      document.addEventListener("keydown", (e) => {
        ensureAudio();
        keys.add(e.key);
        if (!state.running && (e.key === "r" || e.key === "R")) restartGame();
        if (MODE_IS_SHOOTER && e.code === "Space") {
          e.preventDefault();
          fireBullet();
        }
        if (MODE_IS_BRAWLER && e.code === "Space") {
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
        state.dashCooldown = 0;
        state.run = {
          level: 1,
          levelTimer: 0,
          difficultyScale: 1,
          combo: 0,
          comboTimer: 0,
          eliteTimer: 0,
          autoFireTimer: 0,
          shake: 0,
          relics: [],
          upgrades: [],
          xp: 0,
          nextXp: 120,
        };
        state.racer = {
          speed: 280,
          boostTimer: 0,
          laneFloat: 1,
          roadScroll: 0,
          roadCurve: 0,
          roadCurveTarget: 0,
          curveTimer: 0,
          distance: 0,
        };
        state.topdown = { orbitAngle: 0 };
        state.flight = {
          speed: 320,
          throttle: 0.58,
          pitch: 0,
          roll: 0,
          yaw: 0,
          bankVisual: 0,
          altitude: 0.5,
          stability: 1,
          checkpointCombo: 0,
        };
        overlay.classList.remove("show");
        updateHud();
      }

      function restartGame() { resetState(); }

      function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
      function rand(min, max) { return Math.random() * (max - min) + min; }
      function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }

      function ensureAudio() {
        if (audioCtx) return audioCtx;
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        audioCtx = new Ctor();
        return audioCtx;
      }

      function playSfx(kind) {
        const ac = ensureAudio();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        const now = ac.currentTime;
        const profile = ASSET.sfx_profile || "synth";
        const base = profile.includes("fantasy") ? 240 : profile.includes("comic") ? 180 : 220;
        const freqMap = {
          shoot: base + 120,
          hit: base + 60,
          damage: base - 70,
          boost: base + 220,
          levelup: base + 320,
          relic: base + 260,
          gameover: base - 120,
        };
        const freq = freqMap[kind] || base;
        osc.type = kind === "damage" ? "sawtooth" : kind === "boost" ? "triangle" : "square";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.62), now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.16);
      }

      function ensureWebglRuntime() {
        if (!gl || webglRuntime) return webglRuntime;
        const vert = `
          attribute vec2 aPos;
          void main() {
            gl_Position = vec4(aPos, 0.0, 1.0);
          }
        `;
        const frag = `
          precision mediump float;
          uniform vec2 uRes;
          uniform float uTime;
          uniform float uSpeed;
          uniform vec3 uAccent;
          void main() {
            vec2 uv = (gl_FragCoord.xy / uRes.xy) * 2.0 - 1.0;
            uv.x *= uRes.x / uRes.y;
            float depth = max(0.01, 1.0 - (uv.y + 1.0) * 0.5);
            float lane = abs(fract((uv.x / depth + 0.5) * 0.5) - 0.5);
            float laneLine = smoothstep(0.06, 0.0, lane);
            float speedFlow = fract((uTime * (0.35 + uSpeed * 0.0008)) + depth * 4.0);
            float grid = smoothstep(0.05, 0.0, abs(fract(speedFlow) - 0.5));
            vec3 bg = mix(vec3(0.03,0.06,0.14), vec3(0.01,0.03,0.08), depth);
            vec3 road = mix(vec3(0.04,0.06,0.11), vec3(0.08,0.11,0.18), (uv.y + 1.0) * 0.5);
            vec3 color = mix(bg, road, smoothstep(-0.1, -0.9, uv.y));
            color += uAccent * laneLine * 0.28;
            color += vec3(0.15,0.2,0.35) * grid * 0.22;
            gl_FragColor = vec4(color, 1.0);
          }
        `;
        const compile = (type, src) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, src);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
          return shader;
        };
        const vs = compile(gl.VERTEX_SHADER, vert);
        const fs = compile(gl.FRAGMENT_SHADER, frag);
        if (!vs || !fs) return null;
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, "aPos");
        const uRes = gl.getUniformLocation(program, "uRes");
        const uTime = gl.getUniformLocation(program, "uTime");
        const uSpeed = gl.getUniformLocation(program, "uSpeed");
        const uAccent = gl.getUniformLocation(program, "uAccent");
        webglRuntime = { program, buffer, aPos, uRes, uTime, uSpeed, uAccent, t: 0 };
        return webglRuntime;
      }

      function renderWebglBackground(dt) {
        const rt = ensureWebglRuntime();
        if (!rt) return false;
        rt.t += dt;
        const hex = (ASSET.boost_color || "#22d3ee").replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16) / 255 || 0.13;
        const g = parseInt(hex.slice(2, 4), 16) / 255 || 0.83;
        const b = parseInt(hex.slice(4, 6), 16) / 255 || 0.93;
        gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
        gl.useProgram(rt.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, rt.buffer);
        gl.enableVertexAttribArray(rt.aPos);
        gl.vertexAttribPointer(rt.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(rt.uRes, webglCanvas.width, webglCanvas.height);
        gl.uniform1f(rt.uTime, rt.t);
        gl.uniform1f(rt.uSpeed, state.racer.speed || 260);
        gl.uniform3f(rt.uAccent, r, g, b);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        ctx.drawImage(webglCanvas, 0, 0, canvas.width, canvas.height);
        return true;
      }

      function grantXp(amount) {
        state.run.xp += amount;
        while (state.run.xp >= state.run.nextXp) {
          state.run.xp -= state.run.nextXp;
          state.run.nextXp = Math.floor(state.run.nextXp * 1.2);
          const picks = ["attack_speed", "mobility", "damage", "sustain", "burst"];
          const pick = picks[Math.floor(Math.random() * picks.length)];
          state.run.upgrades.push(pick);
          if (pick === "attack_speed") CONFIG.player_attack_cooldown = Math.max(0.16, (CONFIG.player_attack_cooldown || 0.5) * 0.88);
          if (pick === "mobility") CONFIG.player_speed = Math.min(460, (CONFIG.player_speed || 240) + 20);
          if (pick === "damage") CONFIG.base_score_value = Math.min(220, (CONFIG.base_score_value || 10) + 5);
          if (pick === "sustain") state.hp = Math.min((CONFIG.player_hp || 3) + 2, state.hp + 1);
          if (pick === "burst") state.run.combo = Math.min(20, state.run.combo + 1.8);
          state.run.relics.push(`Relic-${pick}-${state.run.level}`);
          playSfx("levelup");
          playSfx("relic");
        }
      }

      function stepProgression(dt) {
        state.run.levelTimer += dt;
        state.run.comboTimer = Math.max(0, state.run.comboTimer - dt);
        state.run.shake = Math.max(0, state.run.shake - dt * 1.8);
        state.run.eliteTimer += dt;
        if (state.run.comboTimer <= 0) state.run.combo = Math.max(0, state.run.combo - dt * 2.2);
        if (state.run.levelTimer >= 12) {
          state.run.levelTimer = 0;
          state.run.level += 1;
          state.run.difficultyScale = 1 + (state.run.level - 1) * 0.11;
          burst(canvas.width * 0.5, 80, ASSET.particle, 20);
          grantXp(30 + state.run.level * 6);
          playSfx("levelup");
        }
      }

      function addCombo(points) {
        state.run.combo = clamp(state.run.combo + points, 0, 20);
        state.run.comboTimer = 2.3;
      }

      function consumeDash() {
        if (state.dashCooldown > 0) return false;
        state.dashCooldown = 1.35;
        state.run.shake = 0.2;
        return true;
      }

      function spawnEnemy() {
        const spdMin = CONFIG.enemy_speed_min || 100;
        const spdMax = CONFIG.enemy_speed_max || 220;
        const difficultyScale = Math.max(1, state.run.difficultyScale || 1);
        if (MODE_IS_FLIGHT_SIM) {
          const kindRoll = Math.random();
          const kind = kindRoll < 0.2 ? "ring" : kindRoll < 0.82 ? "hazard" : "turbulence";
          state.enemies.push({
            kind,
            x: rand(canvas.width * 0.2, canvas.width * 0.8),
            y: rand(canvas.height * 0.22, canvas.height * 0.72),
            z: rand(0.04, 0.22),
            speedMul: rand(0.78, 1.22) * (0.9 + difficultyScale * 0.18),
            w: kind === "ring" ? 56 : kind === "turbulence" ? 72 : 42,
            h: kind === "ring" ? 56 : kind === "turbulence" ? 72 : 44,
          });
          return;
        }
        if (MODE_IS_3D_RUNNER) {
          const lane = Math.floor(Math.random() * 3) - 1;
          const boostRate = CONFIG.mode === "webgl_three_runner" ? 0.24 : 0.2;
          const kind = Math.random() < boostRate ? "boost" : "obstacle";
          state.enemies.push({
            lane,
            z: rand(0.04, 0.14),
            speedMul: rand(0.86, 1.24) * (0.9 + difficultyScale * 0.15),
            kind,
            w: kind === "boost" ? 24 : 34,
            h: kind === "boost" ? 24 : 56,
          });
          return;
        }
        if (CONFIG.mode === "topdown_roguelike_shooter") {
          const edge = Math.floor(rand(0, 4));
          const enemyKindRoll = Math.random();
          const enemyKind = enemyKindRoll < 0.14 ? "elite" : enemyKindRoll < 0.36 ? "charger" : "grunt";
          let ex = 0;
          let ey = 0;
          if (edge === 0) { ex = rand(20, canvas.width - 20); ey = -30; }
          if (edge === 1) { ex = canvas.width + 30; ey = rand(30, canvas.height - 30); }
          if (edge === 2) { ex = rand(20, canvas.width - 20); ey = canvas.height + 30; }
          if (edge === 3) { ex = -30; ey = rand(30, canvas.height - 30); }
          state.enemies.push({
            x: ex,
            y: ey,
            w: enemyKind === "elite" ? 42 : 30,
            h: enemyKind === "elite" ? 42 : 30,
            speed: rand(spdMin, spdMax) * (enemyKind === "charger" ? 1.24 : 1.0) * (0.84 + difficultyScale * 0.22),
            hp: enemyKind === "elite" ? Math.max(2, Math.floor((CONFIG.enemy_hp || 1) + state.run.level * 0.35)) : (CONFIG.enemy_hp || 1),
            kind: enemyKind,
          });
          return;
        }
        if (CONFIG.mode === "arena_shooter") {
          state.enemies.push({
            x: rand(40, canvas.width - 80),
            y: -40,
            w: 30,
            h: 30,
            speed: rand(spdMin, spdMax) * (0.84 + difficultyScale * 0.2),
            hp: CONFIG.enemy_hp || 1,
            kind: Math.random() < 0.18 ? "elite" : "grunt",
          });
          return;
        }
        if (MODE_IS_BRAWLER) {
          const maxWave = CONFIG.mode === "comic_action_brawler_3d" ? 3 : 1;
          if (state.enemies.length < maxWave) {
            const spawnX = rand(canvas.width * 0.25, canvas.width * 0.82);
            const spawnY = rand(canvas.height * 0.2, canvas.height * 0.72);
            state.enemies.push({
              x: spawnX,
              y: spawnY,
              w: CONFIG.mode === "comic_action_brawler_3d" ? 42 : 46,
              h: CONFIG.mode === "comic_action_brawler_3d" ? 64 : 72,
              hp: Math.max(1, Math.floor(state.enemyHp * (CONFIG.mode === "comic_action_brawler_3d" ? 0.55 : 1))),
              speed: spdMin * (0.6 + difficultyScale * 0.26),
              kind: Math.random() < 0.22 ? "elite" : "grunt",
            });
          }
          return;
        }
        state.enemies.push({
          x: rand(40, canvas.width - 80),
          y: -40,
          w: 26,
          h: 26,
          speed: rand(spdMin, spdMax) * (0.84 + difficultyScale * 0.2),
          kind: "grunt",
        });
      }

      function fireBullet() {
        if (!state.running) return;
        playSfx("shoot");
        const bulletSpeed = CONFIG.mode === "topdown_roguelike_shooter" ? 620 : 520;
        const bulletW = CONFIG.mode === "topdown_roguelike_shooter" ? 7 : 6;
        const bulletH = CONFIG.mode === "topdown_roguelike_shooter" ? 18 : 16;
        state.bullets.push({
          x: state.player.x + state.player.w * 0.5 - bulletW * 0.5,
          y: state.player.y - 2,
          w: bulletW,
          h: bulletH,
          speed: bulletSpeed,
          kind: CONFIG.mode === "topdown_roguelike_shooter" ? "arcane" : "basic",
        });
      }

      function performAttack() {
        if (!state.running || state.attackCooldown > 0) return;
        state.attackCooldown = CONFIG.player_attack_cooldown || (CONFIG.mode === "comic_action_brawler_3d" ? 0.34 : 0.5);
        let hitCount = 0;
        for (const enemy of state.enemies) {
          const dx = (enemy.x + enemy.w / 2) - (state.player.x + state.player.w / 2);
          const dy = (enemy.y + enemy.h / 2) - (state.player.y + state.player.h / 2);
          const dist = Math.hypot(dx, dy);
          if (dist > 96) continue;
          enemy.hp -= 1;
          hitCount += 1;
          playSfx("hit");
          state.score += CONFIG.mode === "comic_action_brawler_3d" ? 62 : 45;
          burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, ASSET.enemy_elite, 10);
          if (enemy.hp <= 0) {
            state.score += 170;
            addCombo(1.4);
            grantXp(18);
            burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, ASSET.particle, 18);
          }
        }
        if (hitCount <= 0) return;
        state.run.shake = Math.max(state.run.shake, 0.12);
        state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
        if (state.enemies.length === 0) {
          state.enemyHp += CONFIG.mode === "comic_action_brawler_3d" ? 1 : 3;
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
        state.dashCooldown = Math.max(0, state.dashCooldown - dt);
        stepProgression(dt);
        const spawnRate = (CONFIG.enemy_spawn_rate || 1.0) / clamp(state.run.difficultyScale, 1, 2.8);

        if (MODE_IS_FLIGHT_SIM) {
          const pitchInput = (keys.has("w") || keys.has("ArrowUp") ? -1 : 0) + (keys.has("s") || keys.has("ArrowDown") ? 1 : 0);
          const rollInput = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
          const yawInput = (keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0);
          const throttleInput = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0);
          state.flight.throttle = clamp(state.flight.throttle + throttleInput * dt * 0.55, 0.18, 1);
          state.flight.pitch = clamp(state.flight.pitch + pitchInput * dt * 2.4, -1, 1);
          state.flight.roll = clamp(state.flight.roll + rollInput * dt * 2.6, -1, 1);
          state.flight.yaw = clamp(state.flight.yaw + yawInput * dt * 1.8, -1, 1);
          state.flight.pitch *= (1 - Math.min(0.7, dt * 2.8));
          state.flight.roll *= (1 - Math.min(0.7, dt * 3.2));
          state.flight.yaw *= (1 - Math.min(0.7, dt * 3.5));
          if (keys.has("Shift") && consumeDash()) {
            state.flight.throttle = Math.min(1, state.flight.throttle + 0.22);
            state.racer.boostTimer = Math.max(state.racer.boostTimer, 1.35);
            playSfx("boost");
          }

          const targetSpeed = 180 + state.flight.throttle * 420;
          state.flight.speed += (targetSpeed - state.flight.speed) * Math.min(1, dt * 2.1);
          if (state.racer.boostTimer > 0) {
            state.racer.boostTimer = Math.max(0, state.racer.boostTimer - dt);
            state.flight.speed = Math.max(state.flight.speed, 430);
          }
          state.racer.speed = state.flight.speed;
          state.racer.roadScroll += dt * state.flight.speed * 0.07;
          state.racer.distance += dt * state.flight.speed;

          const lateral = (state.flight.roll * 0.92) + (state.flight.yaw * 0.52);
          const vertical = state.flight.pitch * 1.1;
          state.player.x = clamp(state.player.x + lateral * dt * 340, canvas.width * 0.12, canvas.width * 0.88 - state.player.w);
          state.player.y = clamp(state.player.y + vertical * dt * 240, canvas.height * 0.35, canvas.height * 0.86);
          state.flight.altitude = 1 - clamp((state.player.y - canvas.height * 0.35) / (canvas.height * 0.51), 0, 1);
          state.flight.bankVisual += (state.flight.roll - state.flight.bankVisual) * Math.min(1, dt * 7.5);
          state.flight.stability = clamp(1 - Math.abs(state.flight.pitch) * 0.35 - Math.abs(state.flight.roll) * 0.32, 0.2, 1.1);

          const adaptiveSpawnRate = clamp(spawnRate * (260 / state.flight.speed), 0.2, 0.88);
          if (state.spawnTimer > adaptiveSpawnRate) {
            state.spawnTimer = 0;
            spawnEnemy();
          }

          const playerCx = state.player.x + state.player.w * 0.5;
          const playerCy = state.player.y + state.player.h * 0.5;
          for (const e of state.enemies) {
            e.z += dt * (state.flight.speed / 310) * (e.speedMul || 1);
            const depth = clamp(e.z, 0.03, 1.2);
            const depthScale = 0.28 + depth * 1.35;
            const ex = e.x + (state.flight.yaw * -120) * (1 - depth);
            const ey = e.y + (state.flight.pitch * 80) * (1 - depth);
            e.screenW = (e.w || 32) * depthScale;
            e.screenH = (e.h || 32) * depthScale;
            e.screenX = ex - e.screenW * 0.5;
            e.screenY = ey - e.screenH * 0.5;
            if (depth > 0.76 && depth < 1.05) {
              const dist = Math.hypot((e.screenX + e.screenW * 0.5) - playerCx, (e.screenY + e.screenH * 0.5) - playerCy);
              const hitRadius = Math.max(24, (e.screenW + e.screenH) * 0.24);
              if (dist < hitRadius) {
                if (e.kind === "ring") {
                  const scoreGain = (CONFIG.base_score_value || 10) * (3.2 + state.flight.checkpointCombo * 0.14);
                  state.score += scoreGain;
                  state.flight.checkpointCombo += 1;
                  addCombo(1.2);
                  grantXp(14 + Math.min(18, state.flight.checkpointCombo));
                  playSfx("boost");
                  burst(playerCx, playerCy - 10, ASSET.boost_color, 18);
                } else if (e.kind === "turbulence") {
                  state.run.shake = Math.max(state.run.shake, 0.26);
                  state.flight.stability = Math.max(0.28, state.flight.stability - 0.2);
                  state.score = Math.max(0, state.score - 8);
                  playSfx("damage");
                  burst(playerCx, playerCy, ASSET.enemy_primary, 12);
                } else {
                  state.hp -= 1;
                  state.flight.checkpointCombo = 0;
                  state.run.combo = 0;
                  state.score = Math.max(0, state.score - 22);
                  playSfx("damage");
                  burst(playerCx, playerCy, ASSET.enemy_primary, 16);
                }
                e.z = 2;
              }
            }
          }

          state.enemies = state.enemies.filter((e) => {
            const passed = e.z > 1.08;
            if (passed && e.kind === "ring") {
              state.flight.checkpointCombo = Math.max(0, state.flight.checkpointCombo - 1);
            } else if (passed && e.kind === "hazard") {
              state.score += (CONFIG.base_score_value || 10) * (1.1 + state.run.combo * 0.04);
              addCombo(0.28);
              grantXp(5);
            }
            return !passed;
          });

          state.score += dt * (state.flight.speed * 0.048) * (0.7 + state.flight.altitude * 0.6) * (1 + state.run.combo * 0.026);
        } else if (MODE_IS_3D_RUNNER) {
          const left = keys.has("ArrowLeft") || keys.has("a");
          const right = keys.has("ArrowRight") || keys.has("d");
          const accel = keys.has("ArrowUp") || keys.has("w");
          const brake = keys.has("ArrowDown") || keys.has("s");

          const steerDir = (right ? 1 : 0) - (left ? 1 : 0);
          state.racer.laneFloat = clamp(state.racer.laneFloat + steerDir * dt * 2.8, 0, 2);
          state.player.lane = state.racer.laneFloat;

          const accelRate = 240;
          const brakeRate = 280;
          const drag = 120;
          if (accel) state.racer.speed += accelRate * dt;
          if (brake) state.racer.speed -= brakeRate * dt;
          if (!accel && !brake) state.racer.speed -= drag * dt;
          state.racer.speed = clamp(state.racer.speed, 180, 520);

          state.racer.curveTimer -= dt;
          if (state.racer.curveTimer <= 0) {
            state.racer.curveTimer = rand(1.0, 2.4);
            state.racer.roadCurveTarget = rand(-0.38, 0.38);
          }
          state.racer.roadCurve += (state.racer.roadCurveTarget - state.racer.roadCurve) * Math.min(1, dt * 1.4);
          state.racer.roadScroll += dt * state.racer.speed * 0.055;
          state.racer.distance += dt * state.racer.speed;

          if (state.racer.boostTimer > 0) {
            state.racer.boostTimer = Math.max(0, state.racer.boostTimer - dt);
            state.racer.speed = Math.max(state.racer.speed, 390);
          }
          if (CONFIG.mode === "webgl_three_runner" && keys.has("Shift") && consumeDash()) {
            state.racer.boostTimer = Math.max(state.racer.boostTimer, 1.4);
            state.racer.speed = Math.min(560, state.racer.speed + 70);
            playSfx("boost");
          }

          const curvePx = state.racer.roadCurve * canvas.width * 0.16;
          const laneXs = [canvas.width * 0.28 + curvePx * 0.15, canvas.width * 0.5 + curvePx * 0.15, canvas.width * 0.72 + curvePx * 0.15];
          const laneX = laneXs[Math.round(state.player.lane)] ?? laneXs[1];
          state.player.x += (laneX - state.player.w / 2 - state.player.x) * Math.min(1, dt * 12);
          state.player.y = canvas.height * 0.78;

          const adaptiveSpawnRate = clamp(spawnRate * (260 / state.racer.speed), 0.22, 1.1);
          if (state.spawnTimer > adaptiveSpawnRate) {
            state.spawnTimer = 0;
            spawnEnemy();
          }

          const playerLaneNorm = state.player.lane - 1;
          for (const e of state.enemies) {
            e.z += dt * (state.racer.speed / 300) * (e.speedMul || 1);
            if (e.z > 0.77 && e.z < 1.02) {
              const laneDiff = Math.abs((e.lane || 0) - playerLaneNorm);
              if (laneDiff < 0.35) {
                if (e.kind === "boost") {
                  state.racer.boostTimer = Math.max(state.racer.boostTimer, 2.0);
                  state.score += 30;
                  addCombo(0.8);
                  grantXp(10);
                  playSfx("boost");
                  burst(state.player.x + state.player.w / 2, state.player.y + 4, ASSET.boost_color, 14);
                } else {
                  state.hp -= 1;
                  state.run.combo = 0;
                  state.score = Math.max(0, state.score - 15);
                  playSfx("damage");
                  burst(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, ASSET.enemy_primary, 14);
                }
                e.z = 2;
              }
            }
          }

          state.enemies = state.enemies.filter((e) => {
            const passed = e.z > 1.05;
            if (passed && e.kind !== "boost") {
              state.score += (CONFIG.base_score_value || 10) * (1 + state.run.combo * 0.06);
              addCombo(0.3);
              grantXp(4);
            }
            return !passed;
          });

          state.score += dt * (state.racer.speed * 0.045) * (1 + state.run.combo * 0.03);
        } else if (CONFIG.mode === "topdown_roguelike_shooter") {
          const speed = (CONFIG.player_speed || 255) * (keys.has("Shift") && consumeDash() ? 1.95 : 1);
          state.player.vx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          state.topdown.orbitAngle += dt * 1.8;

          if (state.spawnTimer > clamp(spawnRate * 0.82, 0.14, 0.9)) {
            state.spawnTimer = 0;
            spawnEnemy();
          }
          state.run.autoFireTimer += dt;
          if (state.run.autoFireTimer > 0.26) {
            state.run.autoFireTimer = 0;
            fireBullet();
          }

          for (const e of state.enemies) {
            const dx = (state.player.x + state.player.w * 0.5) - (e.x + e.w * 0.5);
            const dy = (state.player.y + state.player.h * 0.5) - (e.y + e.h * 0.5);
            const len = Math.max(1, Math.hypot(dx, dy));
            const approach = e.kind === "charger" ? 1.2 : 0.92;
            e.x += (dx / len) * e.speed * dt * approach;
            e.y += (dy / len) * e.speed * dt;
            if (rectsOverlap(state.player, e)) {
              state.hp -= e.kind === "elite" ? 2 : 1;
              state.run.combo = 0;
              state.run.shake = 0.22;
              playSfx("damage");
              burst(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, ASSET.enemy_primary, 14);
              e.hp = 0;
            }
          }

          for (const b of state.bullets) b.y -= b.speed * dt;
          for (const b of state.bullets) {
            for (const e of state.enemies) {
              if (e.hp > 0 && rectsOverlap(b, e)) {
                e.hp -= 1;
                b.y = -999;
                state.score += (CONFIG.base_score_value || 10) * (e.kind === "elite" ? 2.2 : 1);
                addCombo(e.kind === "elite" ? 1.6 : 0.8);
                playSfx("hit");
                burst(e.x + e.w / 2, e.y + e.h / 2, ASSET.boost_color, e.kind === "elite" ? 12 : 8);
                if (e.hp <= 0) grantXp(e.kind === "elite" ? 24 : 12);
              }
            }
          }

          state.enemies = state.enemies.filter((e) => e.hp > 0);
          state.bullets = state.bullets.filter((b) => b.y > -40);
          state.score += dt * 14 * (1 + state.run.combo * 0.04);
        } else if (CONFIG.mode === "arena_shooter") {
          const speed = CONFIG.player_speed || 260;
          state.player.vx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.spawnTimer > clamp(spawnRate, 0.18, 1.15)) { state.spawnTimer = 0; spawnEnemy(); }
          for (const e of state.enemies) {
            e.y += e.speed * dt;
            if (e.y > canvas.height + 40) {
              e.y = canvas.height + 999;
              state.hp -= 1;
              state.run.combo = 0;
              playSfx("damage");
            }
            if (rectsOverlap(state.player, e)) {
              e.y = canvas.height + 999;
              state.hp -= 1;
              state.run.combo = 0;
              playSfx("damage");
              burst(state.player.x + state.player.w/2, state.player.y + state.player.h/2, ASSET.enemy_primary, 14);
            }
          }
          for (const b of state.bullets) b.y -= b.speed * dt;
          for (const b of state.bullets) {
            for (const e of state.enemies) {
              if (e.y < canvas.height + 500 && rectsOverlap(b, e)) {
                e.y = canvas.height + 999;
                b.y = -999;
                const scoreGain = (CONFIG.base_score_value || 10) * (e.kind === "elite" ? 2.0 : 1);
                state.score += scoreGain * (1 + state.run.combo * 0.04);
                addCombo(e.kind === "elite" ? 1.2 : 0.7);
                playSfx("hit");
                grantXp(e.kind === "elite" ? 18 : 8);
                burst(e.x + e.w/2, e.y + e.h/2, ASSET.boost_color, e.kind === "elite" ? 10 : 8);
              }
            }
          }
          state.enemies = state.enemies.filter((e) => e.y < canvas.height + 120);
          state.bullets = state.bullets.filter((b) => b.y > -40);
          state.score += dt * 8 * (1 + state.run.combo * 0.03);
        } else if (MODE_IS_BRAWLER) {
          const baseSpeed = CONFIG.player_speed || 220;
          const speed = keys.has("Shift") && consumeDash() ? baseSpeed * 1.8 : baseSpeed;
          state.player.vx = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.spawnTimer > clamp(spawnRate * (CONFIG.mode === "comic_action_brawler_3d" ? 0.72 : 1.0), 0.24, 1.1) || state.enemies.length === 0) {
            state.spawnTimer = 0;
            spawnEnemy();
          }
          for (const e of state.enemies) {
            const dx = state.player.x - e.x;
            const dy = state.player.y - e.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            e.x += (dx / len) * e.speed * dt;
            e.y += (dy / len) * e.speed * dt;
            if (rectsOverlap(state.player, e)) {
              state.hp -= e.kind === "elite" ? 2 : 1;
              state.run.combo = 0;
              playSfx("damage");
              state.player.x = clamp(state.player.x - (dx / len) * 35, 20, canvas.width - state.player.w - 20);
              state.player.y = clamp(state.player.y - (dy / len) * 35, 60, canvas.height - state.player.h - 20);
              burst(state.player.x + state.player.w/2, state.player.y + state.player.h/2, ASSET.enemy_primary, 10);
            }
          }
          state.score += dt * (CONFIG.mode === "comic_action_brawler_3d" ? 12 : 8) * (1 + state.run.combo * 0.03);
        } else {
          const speed = 240;
          state.player.vx = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
          state.player.vy = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
          state.player.x = clamp(state.player.x + state.player.vx * speed * dt, 20, canvas.width - state.player.w - 20);
          state.player.y = clamp(state.player.y + state.player.vy * speed * dt, 60, canvas.height - state.player.h - 20);
          if (state.spawnTimer > 0.6) { state.spawnTimer = 0; spawnEnemy(); }
          for (const e of state.enemies) {
            e.y += e.speed * dt;
            if (rectsOverlap(state.player, e)) {
              state.hp -= 1;
              state.run.combo = 0;
              playSfx("damage");
              e.y = canvas.height + 999;
              burst(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, ASSET.enemy_primary, 8);
            }
          }
          state.enemies = state.enemies.filter((e) => e.y < canvas.height + 100);
          state.score += dt * 10 * (1 + state.run.combo * 0.03);
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
        ctx.save();
        if (state.run.shake > 0) {
          const shakePx = 5 * state.run.shake;
          ctx.translate(rand(-shakePx, shakePx), rand(-shakePx, shakePx));
        }
        ctx.fillStyle = ASSET.track;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (MODE_IS_FLIGHT_SIM) {
          const horizonY = canvas.height * 0.52;
          const webglRendered = renderWebglBackground(1 / 60);
          if (!webglRendered) {
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
            sky.addColorStop(0, ASSET.bg_top);
            sky.addColorStop(1, ASSET.bg_bottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.fillStyle = "rgba(34,211,238,0.35)";
          ctx.fillRect(0, horizonY, canvas.width, 2);
          ctx.strokeStyle = "rgba(56,189,248,0.16)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 12; i++) {
            const t = i / 11;
            const y = horizonY + (t * t) * (canvas.height - horizonY);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
          for (let i = -6; i <= 6; i++) {
            const x = canvas.width * 0.5 + i * 90 - state.flight.yaw * 80;
            ctx.beginPath();
            ctx.moveTo(x, horizonY);
            ctx.lineTo(canvas.width * 0.5 + i * 180, canvas.height);
            ctx.stroke();
          }

          const sortedEnemies = [...state.enemies].sort((a, b) => (a.z || 0) - (b.z || 0));
          for (const e of sortedEnemies) {
            const ex = e.screenX ?? e.x;
            const ey = e.screenY ?? e.y;
            const ew = e.screenW ?? e.w ?? 32;
            const eh = e.screenH ?? e.h ?? 32;
            if ((e.z || 0) > 1.08) continue;
            if (e.kind === "ring") {
              ctx.strokeStyle = ASSET.boost_color;
              ctx.lineWidth = Math.max(2, ew * 0.08);
              ctx.shadowBlur = 16;
              ctx.shadowColor = ASSET.boost_color;
              ctx.beginPath();
              ctx.ellipse(ex + ew * 0.5, ey + eh * 0.5, ew * 0.5, eh * 0.45, 0, 0, Math.PI * 2);
              ctx.stroke();
            } else if (e.kind === "turbulence") {
              ctx.strokeStyle = "rgba(148,163,184,0.75)";
              ctx.lineWidth = 2;
              ctx.shadowBlur = 10;
              ctx.shadowColor = "rgba(148,163,184,0.7)";
              for (let i = 0; i < 3; i++) {
                const yy = ey + i * (eh / 2.5);
                ctx.beginPath();
                ctx.moveTo(ex, yy);
                ctx.quadraticCurveTo(ex + ew * 0.45, yy - 8, ex + ew, yy);
                ctx.stroke();
              }
            } else {
              ctx.fillStyle = ASSET.enemy_primary;
              ctx.shadowBlur = 14;
              ctx.shadowColor = ASSET.enemy_primary;
              ctx.beginPath();
              ctx.moveTo(ex + ew * 0.5, ey - eh * 0.08);
              ctx.lineTo(ex + ew * 0.92, ey + eh * 0.45);
              ctx.lineTo(ex + ew * 0.5, ey + eh * 1.02);
              ctx.lineTo(ex + ew * 0.08, ey + eh * 0.45);
              ctx.closePath();
              ctx.fill();
            }
          }
        } else if (MODE_IS_3D_RUNNER) {
          const horizonY = canvas.height * 0.2;
          const roadTop = canvas.width * 0.2;
          const roadBottom = canvas.width * 0.78;
          const curvePx = state.racer.roadCurve * canvas.width * 0.16;

          const webglRendered = CONFIG.mode === "webgl_three_runner" ? renderWebglBackground(1 / 60) : false;
          if (!webglRendered) {
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
            sky.addColorStop(0, ASSET.bg_top);
            sky.addColorStop(1, ASSET.bg_bottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.fillStyle = ASSET.horizon;
          ctx.beginPath();
          ctx.moveTo(0, horizonY + 8);
          ctx.lineTo(canvas.width * 0.2, horizonY - 30);
          ctx.lineTo(canvas.width * 0.44, horizonY + 2);
          ctx.lineTo(canvas.width, horizonY - 40);
          ctx.lineTo(canvas.width, horizonY + 50);
          ctx.lineTo(0, horizonY + 42);
          ctx.closePath();
          ctx.fill();

          const leftTop = canvas.width / 2 - roadTop + curvePx;
          const rightTop = canvas.width / 2 + roadTop + curvePx;
          const leftBottom = canvas.width / 2 - roadBottom;
          const rightBottom = canvas.width / 2 + roadBottom;

          ctx.fillStyle = ASSET.track;
          ctx.beginPath();
          ctx.moveTo(leftTop, horizonY);
          ctx.lineTo(rightTop, horizonY);
          ctx.lineTo(rightBottom, canvas.height);
          ctx.lineTo(leftBottom, canvas.height);
          ctx.closePath();
          ctx.fill();

          for (let i = 0; i < 18; i++) {
            const t = ((i / 18) + (state.racer.roadScroll * 0.02)) % 1;
            const tt = t * t;
            const y = horizonY + tt * (canvas.height - horizonY);
            const roadHalf = roadTop + (roadBottom - roadTop) * tt;
            const cx = canvas.width / 2 + curvePx * (1 - t);
            const dashW = Math.max(4, 16 * (0.2 + t));
            const dashH = Math.max(2, 18 * (0.2 + t));
            ctx.fillStyle = "rgba(241,245,249,0.5)";
            ctx.fillRect(cx - dashW / 2, y, dashW, dashH);
          }

          ctx.strokeStyle = "rgba(148,163,184,0.35)";
          ctx.lineWidth = 2;
          for (const laneFactor of [-0.33, 0.33]) {
            ctx.beginPath();
            for (let i = 0; i <= 20; i++) {
              const t = i / 20;
              const tt = t * t;
              const y = horizonY + tt * (canvas.height - horizonY);
              const roadHalf = roadTop + (roadBottom - roadTop) * tt;
              const cx = canvas.width / 2 + curvePx * (1 - t);
              const x = cx + roadHalf * laneFactor;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          const sortedEnemies = [...state.enemies].sort((a, b) => (a.z || 0) - (b.z || 0));
          for (const e of sortedEnemies) {
            const t = clamp(e.z || 0, 0, 1.2);
            if (t > 1.08) continue;
            const tt = t * t;
            const y = horizonY + tt * (canvas.height - horizonY);
            const roadHalf = roadTop + (roadBottom - roadTop) * tt;
            const cx = canvas.width / 2 + curvePx * (1 - t);
            const laneOffset = (e.lane || 0) * roadHalf * 0.54;
            const scale = 0.28 + t * 1.05;
            const ew = (e.w || 30) * scale;
            const eh = (e.h || 50) * scale;
            const ex = cx + laneOffset - ew / 2;
            const ey = y - eh;

            if (e.kind === "boost") {
              ctx.save();
              ctx.translate(ex + ew / 2, ey + eh / 2);
              ctx.rotate((state.racer.roadScroll * 0.05) % (Math.PI * 2));
              ctx.fillStyle = ASSET.boost_color;
              ctx.shadowBlur = 14;
              ctx.shadowColor = ASSET.boost_color;
              ctx.beginPath();
              ctx.moveTo(0, -eh / 2);
              ctx.lineTo(ew / 2, 0);
              ctx.lineTo(0, eh / 2);
              ctx.lineTo(-ew / 2, 0);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            } else {
              ctx.fillStyle = ASSET.enemy_primary;
              ctx.shadowBlur = 14;
              ctx.shadowColor = ASSET.enemy_primary;
              ctx.fillRect(ex, ey, ew, eh);
              ctx.fillStyle = ASSET.track;
              ctx.fillRect(ex + ew * 0.1, ey + eh * 0.16, ew * 0.8, eh * 0.28);
            }
          }
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
          g.addColorStop(0, ASSET.bg_top);
          g.addColorStop(1, ASSET.bg_bottom);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(148,163,184,${(i % 6) * 0.018})`;
            ctx.fillRect((i * 73 + state.run.level * 5) % canvas.width, (i * 41 + state.run.level * 2) % canvas.height, 2, 2);
          }

          for (const e of state.enemies) {
            const isElite = e.kind === "elite";
            ctx.fillStyle = isElite ? ASSET.enemy_elite : ASSET.enemy_primary;
            ctx.shadowBlur = isElite ? 18 : 14;
            ctx.shadowColor = isElite ? ASSET.enemy_elite : ASSET.enemy_primary;
            if (CONFIG.mode === "topdown_roguelike_shooter") {
              const cx = e.x + e.w / 2;
              const cy = e.y + e.h / 2;
              const radius = e.w / 2;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();
              if (e.kind === "charger") {
                ctx.strokeStyle = ASSET.boost_color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
                ctx.stroke();
              }
            } else if (ASSET.sprite_profile === "comic") {
              const r = Math.max(6, e.w * 0.18);
              ctx.beginPath();
              ctx.roundRect(e.x, e.y, e.w, e.h, r);
              ctx.fill();
              ctx.fillStyle = "rgba(255,255,255,0.16)";
              ctx.fillRect(e.x + e.w * 0.16, e.y + e.h * 0.12, e.w * 0.2, e.h * 0.16);
            } else {
              ctx.fillRect(e.x, e.y, e.w, e.h);
            }
          }
        }
        for (const b of state.bullets) {
          ctx.fillStyle = ASSET.boost_color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = ASSET.boost_color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        for (const p of state.particles) {
          const a = 1 - p.t / p.life;
          ctx.fillStyle = p.color.replace(")", `, ${a})`).replace("rgb", "rgba");
          ctx.globalAlpha = a;
          ctx.fillRect(p.x, p.y, 3, 3);
          ctx.globalAlpha = 1;
        }

        if (MODE_IS_FLIGHT_SIM) {
          const px = state.player.x;
          const py = state.player.y;
          const pw = state.player.w;
          const ph = state.player.h;
          const bank = state.flight.bankVisual;
          ctx.save();
          ctx.translate(px + pw * 0.5, py + ph * 0.5);
          ctx.rotate(bank * 0.45);
          ctx.shadowBlur = 18;
          ctx.shadowColor = state.racer.boostTimer > 0 ? ASSET.boost_color : ASSET.player_primary;
          ctx.fillStyle = ASSET.player_primary;
          ctx.beginPath();
          ctx.moveTo(0, -ph * 0.6);
          ctx.lineTo(pw * 0.44, ph * 0.34);
          ctx.lineTo(0, ph * 0.58);
          ctx.lineTo(-pw * 0.44, ph * 0.34);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = ASSET.player_secondary;
          ctx.fillRect(-pw * 0.08, -ph * 0.2, pw * 0.16, ph * 0.56);
          ctx.fillRect(-pw * 0.5, ph * 0.2, pw, ph * 0.12);
          if (state.racer.boostTimer > 0 || state.flight.throttle > 0.82) {
            ctx.fillStyle = ASSET.boost_color;
            ctx.fillRect(-pw * 0.12, ph * 0.58, pw * 0.24, ph * 0.38);
          }
          ctx.restore();
        } else if (MODE_IS_3D_RUNNER) {
          const px = state.player.x;
          const py = state.player.y;
          const pw = state.player.w;
          const ph = state.player.h;
          ctx.shadowBlur = 18;
          ctx.shadowColor = state.racer.boostTimer > 0 ? ASSET.boost_color : ASSET.player_primary;
          ctx.fillStyle = ASSET.player_primary;
          ctx.beginPath();
          ctx.moveTo(px + pw * 0.5, py - ph * 0.08);
          ctx.lineTo(px + pw * 0.9, py + ph * 0.3);
          ctx.lineTo(px + pw * 0.78, py + ph * 0.95);
          ctx.lineTo(px + pw * 0.22, py + ph * 0.95);
          ctx.lineTo(px + pw * 0.1, py + ph * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = ASSET.player_secondary;
          ctx.fillRect(px + pw * 0.2, py + ph * 0.25, pw * 0.6, ph * 0.26);
          ctx.fillStyle = ASSET.track;
          ctx.fillRect(px + pw * 0.02, py + ph * 0.62, pw * 0.18, ph * 0.2);
          ctx.fillRect(px + pw * 0.8, py + ph * 0.62, pw * 0.18, ph * 0.2);
          if (state.racer.boostTimer > 0) {
            ctx.fillStyle = ASSET.boost_color;
            ctx.fillRect(px + pw * 0.4, py + ph * 0.95, pw * 0.2, ph * 0.35);
          }
        } else {
          ctx.shadowBlur = 18;
          ctx.shadowColor = ASSET.player_primary;
          if (CONFIG.mode === "topdown_roguelike_shooter") {
            const px = state.player.x + state.player.w / 2;
            const py = state.player.y + state.player.h / 2;
            ctx.fillStyle = ASSET.player_primary;
            ctx.beginPath();
            ctx.arc(px, py, state.player.w * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ASSET.player_secondary;
            ctx.fillRect(px - 5, py - 18, 10, 20);
          } else if (ASSET.sprite_profile === "comic") {
            const w = state.player.w;
            const h = state.player.h;
            const x = state.player.x;
            const y = state.player.y;
            ctx.fillStyle = ASSET.player_primary;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, Math.max(7, w * 0.2));
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.fillRect(x + w * 0.18, y + h * 0.12, w * 0.22, h * 0.14);
          } else {
            ctx.fillStyle = ASSET.player_primary;
            ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
          }
          if (MODE_IS_BRAWLER && state.attackCooldown > 0) {
            ctx.strokeStyle = ASSET.enemy_elite;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(state.player.x + state.player.w/2, state.player.y + state.player.h/2, 52, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      function updateHud() {
        scoreEl.textContent = `Score: ${Math.floor(state.score)} · Combo: x${Math.max(1, state.run.combo.toFixed(1))}`;
        if (MODE_IS_FLIGHT_SIM) {
          timerEl.textContent = `Time: ${state.timeLeft.toFixed(1)} · Lv.${state.run.level} · THR ${Math.round(state.flight.throttle * 100)}%`;
          hpEl.textContent = `HP: ${Math.max(0, state.hp)} · Relic: ${state.run.relics.length} · CKP ${state.flight.checkpointCombo}`;
          return;
        }
        timerEl.textContent = `Time: ${state.timeLeft.toFixed(1)} · Lv.${state.run.level} · XP ${Math.floor(state.run.xp)}/${state.run.nextXp}`;
        hpEl.textContent = `HP: ${Math.max(0, state.hp)} · Relic: ${state.run.relics.length}`;
      }

      function endGame() {
        if (!state.running) return;
        state.running = false;
        const buildSummary = state.run.upgrades.slice(-3).join(", ") || "none";
        overlayText.textContent = `최종 점수 ${Math.floor(state.score)} · 콤보 x${Math.max(1, state.run.combo.toFixed(1))} · 빌드(${buildSummary}) · R 재시작`;
        playSfx("gameover");
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