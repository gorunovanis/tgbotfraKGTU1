(function () {
  let sessionOk = false;
  const AUTH_REQUIRED_MSG = "Войдите или зарегистрируйтесь.";

  const path = window.location.pathname || "";
  const basePathFromLocation = path.replace(/\/static\/app(?:\/.*)?$/, "");
  const BASE =
    typeof window.__FOODAPP_API_BASE__ === "string" && window.__FOODAPP_API_BASE__.trim() !== ""
      ? window.__FOODAPP_API_BASE__.replace(/\/$/, "")
      : window.location.origin + basePathFromLocation;
  let userProfile = null;

  /** Встроенный помощник: без отдельного файла и import() — работает даже если local-ai.js не залит на сервер. */
  const BUILTIN_FOOD_DB = [
    { k: ["борщ", "суп"], calories: 120, protein: 6, fat: 4, carbs: 14 },
    { k: ["каша", "овсян"], calories: 140, protein: 5, fat: 3, carbs: 22 },
    { k: ["гречк"], calories: 130, protein: 4, fat: 2, carbs: 23 },
    { k: ["макарон", "паста", "спагетти"], calories: 180, protein: 7, fat: 3, carbs: 30 },
    { k: ["куриц", "индейк"], calories: 200, protein: 35, fat: 8, carbs: 0 },
    { k: ["рыба", "лосось", "треска", "сельд"], calories: 180, protein: 28, fat: 8, carbs: 0 },
    { k: ["творог"], calories: 160, protein: 24, fat: 5, carbs: 4 },
    { k: ["яйц"], calories: 200, protein: 14, fat: 14, carbs: 2 },
    { k: ["салат"], calories: 120, protein: 4, fat: 8, carbs: 10 },
    { k: ["пицц"], calories: 280, protein: 12, fat: 12, carbs: 30 },
    { k: ["бургер"], calories: 450, protein: 20, fat: 22, carbs: 35 },
    { k: ["шоколад"], calories: 250, protein: 3, fat: 14, carbs: 28 },
    { k: ["хлеб", "батон"], calories: 240, protein: 8, fat: 3, carbs: 45 },
    { k: ["рис"], calories: 200, protein: 4, fat: 1, carbs: 44 },
    { k: ["котлет"], calories: 320, protein: 22, fat: 20, carbs: 12 },
    { k: ["оливье"], calories: 180, protein: 8, fat: 12, carbs: 12 },
    { k: ["суши", "ролл"], calories: 220, protein: 12, fat: 6, carbs: 28 },
  ];

  const WORKOUT_PRESETS = {
    lose: "📋 **Неделя (похудение)**\nПн: ноги — присед 4×12, выпады 3×10/нога, ягодичный мост 3×15\nСр: верх — жим/отжимания 4×10, тяга в наклоне 3×12\nПт: кардио 25–30 мин в зоне разговора\nВт/Чт/Сб: шаги 8–12 тыс.",
    gain: "📋 **Неделя (набор массы)**\nПн: ноги — присед 4×8–12, жим ногами 3×10\nСр: грудь+спина — жим 4×8, тяга 4×8\nПт: плечи+руки — по 3×10–12\nВт/Чт: лёгкая ходьба 20 мин или велотрек 15 мин",
    home: "📋 **Дома, без зала (3× в неделю)**\nКруг: приседы с весом тела, отжимания, выпады, планка 40–60 с — 3–4 круга, отдых 90 с между кругами.\nУсложнение: рюкзак с грузом, отжимания на стульях.",
    split: "📋 **Сплит верх / низ**\nДень А: жим, тяга горизонтальная, тяга вертикаль — 3–4×8–12\nДень В: присед, румынская тяга, икры — 3–4×8–15\nЧередовать А–В–отдых, 4–5 тренировок в неделю.",
  };

  const VAGUE_REPLIES = [
    "Слова несутся, смысл не цепляется. Здесь я полезен про еду, калории и движение — там отвечу конкретнее.",
    "Вне рациона и тренировок я могу лишь пожелать ровного дня; остальное пусть остаётся за кадром.",
    "Вопрос широкий; в этом приложении я лучше умею про КБЖУ, шаги и подходы с весом.",
    "Это уже не про тарелку и не про штангу — моя экспертиза там, где калории и нагрузка.",
    "Мысль плывёт по кругу. Если нужно что-то про питание или тренировку — напишите, развернёмся.",
  ];

  function builtinVagueReply() {
    return VAGUE_REPLIES[Math.floor(Math.random() * VAGUE_REPLIES.length)];
  }

  function builtinHeuristicNutritionFromName(name) {
    const n = (name || "").toLowerCase();
    for (const row of BUILTIN_FOOD_DB) {
      if (row.k.some((kw) => n.includes(kw))) {
        return {
          name: (name || "").trim() || "Блюдо",
          calories: row.calories,
          protein: row.protein,
          fat: row.fat,
          carbs: row.carbs,
          source: "builtin",
        };
      }
    }
    const words = n.split(/\s+/).filter(Boolean).length || 1;
    const cal = 280 + Math.min(words * 15, 120);
    const p = Math.max(5, Math.round(cal * 0.22 / 4));
    const f = Math.max(3, Math.round(cal * 0.28 / 9));
    const c = Math.max(10, Math.round((cal - 4 * p - 9 * f) / 4));
    return {
      name: (name || "").trim() || "Блюдо",
      calories: cal,
      protein: p,
      fat: f,
      carbs: c,
      source: "builtin",
    };
  }

  function builtinNutritionFromName(name) {
    const n = (name || "").trim();
    if (!n) return { ...builtinHeuristicNutritionFromName("Блюдо"), source: "builtin" };
    const h = builtinHeuristicNutritionFromName(n);
    return { ...h, source: "builtin" };
  }

  function builtinMealFromPhoto() {
    return {
      ...builtinHeuristicNutritionFromName("типичный обед одной порцией"),
      name: "Блюдо (оценка по типовой порции)",
      source: "builtin",
    };
  }

  function builtinFoodFitnessTopic(q) {
    return /калори|ккал|кбжу|бжу|белок|жир|углевод|макрос|еда|питание|рацион|завтрак|обед|ужин|перекус|порци|вода|шаг|ходьб|кардио|бег|эллипс|тренир|упражнен|подход|повтор|жим|присед|тяга|станов|планк|отжим|растяж|размин|сон|спать|устал|дефицит|похуд|набор|масс|bulk|билд|зал|спорт|мышц|креатин|протеин|диет|клетчат|интервальн|суперфуд/i.test(q);
  }

  function builtinChatReply(userText) {
    const t = (userText || "").trim();
    if (!t) return "Введите сообщение.";
    const q = t.toLowerCase();

    const wantsWorkoutPlan =
      /программ|расписан|что\s+качать|пример.*недел|план.*недел|недел\w*\s+трениров|тренировк.*недел|план\s+трениров|трениров.*\s+план|дай(те)?\s+план|нужен\s+план/i.test(q) ||
      (/сплит|верх.*низ|ноги.*грудь/i.test(q) && /тренир|зал|мышц/i.test(q));

    if (wantsWorkoutPlan) {
      if (/дом|домашн|без зала|без тренаж/i.test(q)) return WORKOUT_PRESETS.home;
      if (/сплит|делить|верх|низ/i.test(q)) return WORKOUT_PRESETS.split;
      if (/набор|масс|bulk|билд|сил/i.test(q)) return WORKOUT_PRESETS.gain;
      if (/похуд|сброс|дефицит|жир|худел/i.test(q)) return WORKOUT_PRESETS.lose;
      return WORKOUT_PRESETS.lose + "\n\n" + WORKOUT_PRESETS.split;
    }

    if (/привет|здравств|добрый/i.test(t)) {
      return "Привет! Я встроенный помощник FoodApp: питание, КБЖУ и тренировки. Спросите про калории, белок, шаги, программу на неделю или упражнения.";
    }
    if (/спасибо|благодар/i.test(t) && t.length < 40) {
      return "Пожалуйста! Если нужно — уточните вопрос про рацион или тренировку.";
    }

    if (/дефицит|похуд|сброс|минус.*кг/i.test(q) && /калори|ккал|еда|рацион/i.test(q)) {
      return "Для похудения обычно держат небольшой дефицит калорий к норме (ориентир на главной) и белок ~1,6–2 г/кг массы, чтобы сохранить мышцы. Резкие ограничения без врача не советую.";
    }
    if (/набор|масс|билд|bulk/i.test(q) && !/трениров|программ|план/i.test(q)) {
      return "Для набора массы: небольшой профицит калорий к ориентиру на главной, белок ~1,8–2,2 г/кг, базовые упражнения (присед, тяга, жим) с прогрессией веса 6–12 повторов.";
    }
    if (/поддерж|вес.*держ|норма.*калори/i.test(q)) {
      return "Поддержание: калории около вашего расхода (смотрите ориентир на главной), белок ~1,4–1,8 г/кг, стабильность важнее идеального дня.";
    }

    if (/калори|ккал|кбжу|бжу|белок|жиры|углевод|макрос/i.test(q)) {
      return "Калории и БЖУ за сегодня — на главной после входа. Белок: ориентир ~1,4–2 г/кг в зависимости от цели; жиры и углеводы распределяйте удобно, без крайностей.";
    }
    if (/завтрак|обед|ужин|перекус|порци/i.test(q)) {
      return "Старайтесь накрывать белком каждый приём; половина тарелки овощи — хорошая привычка. Воду — 30–35 мл/кг массы в среднем.";
    }
    if (/вода|пить|литр.*вод/i.test(q)) {
      return "Ориентир воды — около 30–35 мл на кг массы в день; при тренировке добавьте стакан до и после.";
    }
    if (/сон|спать|устал/i.test(q)) {
      return "Сон 7–8 ч помогает и аппетиту, и восстановлению после тренировок.";
    }
    if (/шаг|ходьб|кардио|бег|эллипс/i.test(q)) {
      return "Шаги и лёгкое кардио дополняют силовые: ориентир 8–12 тыс. шагов в день — разумная цель, если врач не ограничивает нагрузку.";
    }
    if (/тренир|подход|повтор|жим|присед|тяга|станов|планк|отжим/i.test(q)) {
      return "База: присед, тяга, жим — 3–5 подходов по 6–12 повторов, раз в неделю небольшая прибавка веса или повторов при чистой технике. Между днями на одну группу — отдых.";
    }
    if (/растяж|размин|разогрев/i.test(q)) {
      return "Перед силовой — 5–10 минут общей разминки и лёгкие подходы с малым весом по первому упражнению.";
    }
    if (/болит|боль в|травм|врач|диагноз/i.test(q)) {
      return "При острой боли, головокружении или травме — к врачу. Я не ставлю диагнозы и не назначаю лечение.";
    }
    if (/аллерг|непереносим|без глютен|веган/i.test(q)) {
      return "Ограничения по продуктам подбирают индивидуально с врачом или диетологом; в приложении просто вносите свои блюда вручную.";
    }

    if (builtinFoodFitnessTopic(q)) {
      return "Коротко: ориентиры КБЖУ — на главной, цель — в профиле. Уточните: «сколько белка», «питание при похудении», «программа на неделю» — отвечу по делу.";
    }
    return builtinVagueReply();
  }

  const GOAL_HINTS_ONBOARDING = {
    lose: [
      "Калории: ориентир на главной — это примерно поддержка; для жира минус ~300–500 ккал к нему (не ниже ~1200–1400 ккал без врача).",
      "Белок ~1,6–2 г/кг веса: на завтрак — яйца или творог; на обед/ужин — 120–180 г курицы/рыбы или аналог + большая порция овощей.",
      "Тренировки: 3–4 раза в неделю по 45–60 мин (силовые + ноги/пресс); в остальные дни — 8–12 тыс. шагов или 20–30 мин быстрой ходьбы.",
    ],
    maintain: [
      "Калории: держитесь около ориентира на главной; отклонения ±100–150 ккал в день — нормальны, смотрите недельное среднее.",
      "Белок ~1,4–1,8 г/кг: включите белок в завтрак (иначе вечером тянет на сладкое); вода 30–35 мл/кг веса в день.",
      "Силовые 2–3 раза в неделю: всё тело или верх/низ по очереди, 3×8–12; кардио по желанию 1–2 раза, без перетренированности.",
    ],
    gain: [
      "Калории: к ориентиру на главной добавьте ~250–400 ккал (овсянка, рис, бананы, орехи порциями); взвешивайтесь 1 раз в неделю в одно время.",
      "Белок ~1,8–2,2 г/кг, разбейте на 4–5 приёмов: творог, мясо, рыба, при необходимости протеин после тренировки.",
      "Зал 3–4 раза: присед, тяга, жим — 6–12 повторов; углеводы за 1–2 ч до тренировки и в течение 2 ч после (не тренируетесь голодным).",
    ],
  };

  function buildMacroHints(s, targets, goal) {
    const g = goal || "maintain";
    const hints = [];
    if (targets && targets.calories) {
      const cr = targets.calories ? s.calories / targets.calories : 0;
      const pr = targets.protein_g ? s.protein / targets.protein_g : 0;
      const pLeft = targets.protein_g ? Math.max(0, Math.round(targets.protein_g - s.protein)) : 0;
      if (g === "lose") {
        if (s.calories > 0 && cr < 0.28) hints.push("К вечеру калорий мало к цели — заложите 3 приёма: завтрак (яйца/творог + крупа), обед (курица/рыба + салат), перекус (йогурт или фрукт), чтобы не сорваться на фастфуд.");
        if (cr >= 0.45 && cr < 0.92 && pr < 0.45 && pLeft > 15) hints.push(`Белка не хватает ~${pLeft} г до ориентира — порция 200 г творога (~25 г белка) или 150–180 г отварной курицы/рыбы.`);
        if (cr >= 0.82 && cr <= 1.05) hints.push("Почти в зоне по калориям — ужин: половина тарелки овощи (свежие/тушёные), четверть белок, четверть гарнир небольшой.");
        if (cr > 1.12) hints.push("Выше ориентира по калориям — завтра минус 10–15% к порциям ИЛИ +3–5 тыс. шагов; один день перебора не ломает прогресс.");
      }
      if (g === "maintain") {
        if (s.calories > 200 && cr < 0.35) hints.push("До середины дня съедено мало — добавьте полноценный обед (не только перекус), чтобы вечером не наедаться.");
        if (s.calories > 400 && pr < 0.48 && pLeft > 10) hints.push(`До ориентира по белку ~${pLeft} г — добавьте горсть орехов + кефир или бутерброд с индейкой/сыром.`);
        if (cr >= 0.85 && cr <= 1.1 && pr >= 0.75) hints.push("Калории и белок близки к плану — такой ритм подходит для поддержания веса.");
      }
      if (g === "gain") {
        if (s.calories > 0 && cr < 0.42) hints.push("Для набора до ориентира не хватает калорий — перекус: бутерброд с арахисовой пастой и банан, или греча/рис 150 г + 2 яйца.");
        if (s.calories > 400 && pr < 0.55 && pLeft > 20) hints.push(`Белка не хватает ~${pLeft} г — порция протеина или 250 г творога + стакан молока; разнесите по 4–5 приёмам.`);
        if (cr >= 0.45 && cr <= 0.95 && pr >= 0.62) hints.push("Калории и белок в зоне для набора — сохраняйте сон 7–8 ч и прогрессию веса в зале каждую неделю.");
      }
    }
    if (s.calories > 0 && hints.length === 0 && targets && targets.calories) {
      hints.push("Вода: ориентир 30–35 мл на кг веса; шаги из блока ниже — хороший минимум для метаболизма.");
    }
    return hints.slice(0, 3);
  }

  function renderOnboardingGoalHints() {
    const sel = el("onboarding-goal");
    const box = el("onboarding-goal-hints");
    if (!sel || !box) return;
    const key = sel.value || "maintain";
    const lines = GOAL_HINTS_ONBOARDING[key] || GOAL_HINTS_ONBOARDING.maintain;
    box.innerHTML = `<p class="goal-hints-title">Подсказки под выбранную цель</p><ul class="goal-hints-list">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
  }

  function el(id) { return document.getElementById(id); }
  function on(id, event, fn) { const e = el(id); if (e) e.addEventListener(event, fn); }
  function setVal(id, val) { const e = el(id); if (e) e.value = val != null ? val : ""; }
  function showMessage(text) {
    alert(text);
  }
  function apiAllowsAnonymous(p) {
    return p === "/auth/me" || p === "/auth/login" || p === "/auth/register";
  }
  async function api(path, opts = {}) {
    if (!sessionOk && !apiAllowsAnonymous(path)) {
      throw new Error(AUTH_REQUIRED_MSG);
    }
    const url = BASE + path;
    const res = await fetch(url, {
      ...opts,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 && (!apiAllowsAnonymous(path) || path === "/auth/me")) sessionOk = false;
      let msg = text || "Ошибка сети";
      try {
        const j = JSON.parse(text);
        if (j && typeof j.error === "string") msg = j.error;
      } catch (_) {}
      throw new Error(msg);
    }
    if (path === "/auth/login" || path === "/auth/register" || path === "/auth/me") sessionOk = true;
    try {
      return text ? JSON.parse(text) : {};
    } catch (_) {
      return {};
    }
  }
  async function logout() {
    try {
      await fetch(BASE + "/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    sessionOk = false;
    userProfile = null;
    showAuthScreen();
  }
  function showAuthScreen() {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const a = el("screen-auth");
    if (a) a.classList.add("active");
    const r = el("root");
    if (r) r.classList.add("onboarding-visible");
    const loginPanel = el("auth-panel-login");
    const regPanel = el("auth-panel-register");
    if (loginPanel) loginPanel.classList.remove("hidden");
    if (regPanel) regPanel.classList.add("hidden");
  }
  function hideAuthAndApp() {
    const a = el("screen-auth");
    if (a) a.classList.remove("active");
    const r = el("root");
    if (r) r.classList.remove("onboarding-visible");
  }
  function setAuthError(msg) {
    const err = el("auth-error");
    if (!err) return;
    err.textContent = msg || "";
    err.style.display = msg ? "block" : "none";
  }
  async function handleAuthLogin() {
    setAuthError("");
    const email = el("auth-email") && el("auth-email").value.trim();
    const password = el("auth-password") && el("auth-password").value;
    if (!email || !password) {
      setAuthError("Введите email и пароль");
      return;
    }
    const btn = el("auth-login-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Вход…"; }
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await afterLoginSuccess();
    } catch (e) {
      setAuthError(e.message || "Ошибка входа");
    }
    if (btn) { btn.disabled = false; btn.textContent = "Войти"; }
  }
  async function handleAuthRegister() {
    setAuthError("");
    const email = el("reg-email") && el("reg-email").value.trim();
    const password = el("reg-password") && el("reg-password").value;
    const first_name = el("reg-name") && el("reg-name").value.trim();
    if (!email || !password) {
      setAuthError("Введите email и пароль");
      return;
    }
    if (password.length < 8) {
      setAuthError("Пароль не менее 8 символов");
      return;
    }
    const btn = el("auth-register-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Регистрация…"; }
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password, first_name: first_name || undefined }) });
      await afterLoginSuccess();
    } catch (e) {
      setAuthError(e.message || "Ошибка регистрации");
    }
    if (btn) { btn.disabled = false; btn.textContent = "Зарегистрироваться"; }
  }
  async function afterLoginSuccess() {
    hideAuthAndApp();
    try {
      const p = await api("/profile");
      userProfile = p;
      const emailDisp = el("profile-email-display");
      if (emailDisp && p.email) emailDisp.textContent = p.email;
      if (p && (p.weight_kg == null || p.weight_kg === 0) && (p.height_cm == null || p.height_cm === 0)) {
        showOnboarding();
        return;
      }
      document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
      const main = el("screen-main");
      if (main) main.classList.add("active");
      const titleEl = el("screen-title");
      if (titleEl) titleEl.textContent = "Сегодня";
      loadSummary();
      loadWaterBlock();
    } catch (e) {
      showMessage(e.message || "Ошибка загрузки профиля");
      showAuthScreen();
    }
  }

  // Navigation
  const titles = {
    main: "Сегодня",
    meals: "Блюда",
    steps: "Шаги",
    stats: "Статистика",
    workouts: "Тренировки",
    ai: "AI-ассистент",
    profile: "Профиль",
  };
  function showScreen(id) {
    if (!id) return;
    if (id === "weight-history") { showScreen("stats"); loadStats(31); showMessage("График веса — в блоке «Вес» ниже"); return; }
    if (id === "measurements") { showMessage("Замеры тела можно добавить в следующей версии. Пока используйте «История веса» в Статистике."); return; }
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const screenEl = el("screen-" + id);
    if (screenEl) screenEl.classList.add("active");
    const titleEl = el("screen-title");
    if (titleEl) titleEl.textContent = titles[id] || id;
    if (id === "main") loadSummary();
    else if (id === "meals") loadMeals();
    else if (id === "steps") loadSteps();
    else if (id === "stats") loadStats(7);
    else if (id === "workouts") loadWorkouts();
    else if (id === "profile") loadProfile();
  }
  // Единое делегирование кликов на #root: все кнопки работают по closest("#id") / [data-nav] / .period-btn
  const root = el("root");
  if (root) {
    root.addEventListener("change", function rootChange(e) {
      const t = e.target;
      if (t && t.id === "onboarding-goal") renderOnboardingGoalHints();
    });
    root.addEventListener("click", function rootClick(e) {
      const t = e.target;
      if (!t || !t.closest) return;
      const navBtn = t.closest("[data-nav]");
      if (navBtn && navBtn.dataset.nav) {
        e.preventDefault();
        showScreen(navBtn.dataset.nav);
        return;
      }
      const periodBtn = t.closest(".period-btn");
      if (periodBtn && periodBtn.dataset.days) {
        e.preventDefault();
        loadStats(parseInt(periodBtn.dataset.days, 10));
        return;
      }
      if (t.closest("#onboarding-submit")) {
        e.preventDefault();
        handleOnboardingSubmit();
        return;
      }
      if (t.closest("#auth-login-btn")) {
        e.preventDefault();
        handleAuthLogin();
        return;
      }
      if (t.closest("#auth-register-btn")) {
        e.preventDefault();
        handleAuthRegister();
        return;
      }
      if (t.closest("#auth-show-register")) {
        e.preventDefault();
        const lp = el("auth-panel-login"), rp = el("auth-panel-register");
        if (lp) lp.classList.add("hidden");
        if (rp) rp.classList.remove("hidden");
        setAuthError("");
        return;
      }
      if (t.closest("#auth-show-login")) {
        e.preventDefault();
        const lp = el("auth-panel-login"), rp = el("auth-panel-register");
        if (lp) lp.classList.remove("hidden");
        if (rp) rp.classList.add("hidden");
        setAuthError("");
        return;
      }
      if (t.closest("#btn-logout") || t.closest("#profile-logout")) {
        e.preventDefault();
        logout();
        return;
      }
      if (t.closest("#btn-meal-photo")) {
        e.preventDefault();
        const i = el("input-photo"); if (i) i.click();
        return;
      }
      if (t.closest("#btn-meal-scan")) {
        e.preventDefault();
        handleMealScan();
        return;
      }
      if (t.closest("#btn-meal-manual")) {
        e.preventDefault();
        handleMealManual();
        return;
      }
      if (t.closest("#modal-meal-cancel")) {
        e.preventDefault();
        closeMealModal();
        return;
      }
      if (t.closest("#modal-meal-save")) {
        e.preventDefault();
        handleMealSave();
        return;
      }
      if (t.closest("#barcode-cancel")) {
        e.preventDefault();
        closeBarcodeModal();
        return;
      }
      if (t.closest("#barcode-manual")) {
        e.preventDefault();
        closeBarcodeModal();
        const code = prompt("Введите штрих-код (EAN-13 или другой):");
        if (!code || !code.trim()) return;
        api("/meals/barcode/" + encodeURIComponent(code.trim()))
          .then((product) => openMealModal({ name: product.name, calories: product.calories || 0, protein: product.protein || 0, fat: product.fat || 0, carbs: product.carbs || 0, source: "barcode", barcode: code.trim() }))
          .catch(() => showMessage("Продукт не найден в базе. Добавьте блюдо вручную."));
        return;
      }
      if (t.closest("#steps-save")) {
        e.preventDefault();
        handleStepsSave();
        return;
      }
      if (t.closest("#btn-add-workout")) {
        e.preventDefault();
        handleAddWorkout();
        return;
      }
      if (t.closest("#workout-add-set")) {
        e.preventDefault();
        workoutSetsData.push({ weight: 0, reps: 0, completed: false });
        renderWorkoutSets();
        return;
      }
      if (t.closest("#modal-workout-cancel")) {
        e.preventDefault();
        if (modalWorkout) modalWorkout.classList.add("hidden");
        return;
      }
      if (t.closest("#modal-workout-save")) {
        e.preventDefault();
        handleWorkoutSave();
        return;
      }
      if (t.closest("#ai-send")) {
        e.preventDefault();
        sendAiMessage();
        return;
      }
      if (t.closest("#profile-save")) {
        e.preventDefault();
        handleProfileSave();
        return;
      }
      // Кнопки воды (+100 мл и т.д.) создаются динамически с data-ml
      const waterBtn = t.closest("button[data-ml]");
      if (waterBtn && waterBtn.dataset.ml) {
        e.preventDefault();
        const ml = parseInt(waterBtn.dataset.ml, 10);
        if (!isNaN(ml) && sessionOk) {
          api("/water", { method: "POST", body: JSON.stringify({ ml }) })
            .then(() => { loadWaterBlock(); if (el("screen-main") && el("screen-main").classList.contains("active")) loadSummary(); })
            .catch((err) => showMessage(err.message || "Не удалось добавить воду"));
        }
        return;
      }
    });
  }

  function handleOnboardingSubmit() {
    const btn = el("onboarding-submit");
    const nameEl = el("onboarding-name"), weightEl = el("onboarding-weight"), heightEl = el("onboarding-height"), goalEl = el("onboarding-goal");
    const name = nameEl ? nameEl.value.trim() : "";
    const weight = weightEl ? parseFloat(weightEl.value) : NaN;
    const height = heightEl ? parseFloat(heightEl.value) : NaN;
    const goal = goalEl ? goalEl.value : "";
    if (!weight || weight < 20 || weight > 300) {
      showMessage("Укажите вес от 20 до 300 кг");
      return;
    }
    if (!height || height < 100 || height > 250) {
      showMessage("Укажите рост от 100 до 250 см");
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Сохранение…"; }
    api("/profile", {
      method: "POST",
      body: JSON.stringify({ first_name: name || null, weight_kg: weight, height_cm: height, goal: goal || null }),
    }).then(() => api("/profile")).then((p) => {
      userProfile = p;
      if (btn) { btn.disabled = false; btn.textContent = "Продолжить"; }
      hideOnboarding();
      showScreen("main");
      loadSummary();
      loadWaterBlock();
      showMessage("Данные сохранены. Добро пожаловать!");
    }).catch((e) => {
      if (btn) { btn.disabled = false; btn.textContent = "Продолжить"; }
      showMessage(e.message || "Не удалось сохранить данные");
    });
  }
  function handleMealSave() {
    const mealName = el("meal-name"), mealCal = el("meal-cal"), mealProtein = el("meal-protein"), mealFat = el("meal-fat"), mealCarbs = el("meal-carbs"), mealSource = el("meal-source"), mealBarcode = el("meal-barcode");
    const payload = {
      name: (mealName && mealName.value.trim()) || "Блюдо",
      calories: mealCal ? parseFloat(mealCal.value) || 0 : 0,
      protein: mealProtein ? parseFloat(mealProtein.value) || 0 : 0,
      fat: mealFat ? parseFloat(mealFat.value) || 0 : 0,
      carbs: mealCarbs ? parseFloat(mealCarbs.value) || 0 : 0,
      source: (mealSource && mealSource.value) || "manual",
      barcode: (mealBarcode && mealBarcode.value) || null,
    };
    api("/meals", { method: "POST", body: JSON.stringify(payload) })
      .then(() => { closeMealModal(); loadMeals(); loadSummary(); showMessage("Блюдо добавлено"); })
      .catch((e) => showMessage(e.message || "Не удалось сохранить блюдо"));
  }
  function handleMealScan() {
    if (!sessionOk) { showMessage(AUTH_REQUIRED_MSG); return; }
    if (typeof Html5Qrcode === "undefined") {
      const code = prompt("Введите штрих-код (библиотека сканера не загрузилась):");
      if (!code) return;
      api("/meals/barcode/" + encodeURIComponent(code))
        .then((product) => openMealModal({ name: product.name, calories: product.calories || 0, protein: product.protein || 0, fat: product.fat || 0, carbs: product.carbs || 0, source: "barcode", barcode: code }))
        .catch(() => alert("Продукт не найден"));
      return;
    }
    if (modalBarcode) modalBarcode.classList.remove("hidden");
    const container = el("barcode-scanner-container");
    if (container) container.innerHTML = "";
    barcodeScanner = new Html5Qrcode("barcode-scanner-container");
    barcodeScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 140 } },
      (decodedText) => {
        if (!barcodeScanner) return;
        barcodeScanner.stop().then(() => {
          closeBarcodeModal();
          api("/meals/barcode/" + encodeURIComponent(decodedText))
            .then((product) => openMealModal({ name: product.name, calories: product.calories || 0, protein: product.protein || 0, fat: product.fat || 0, carbs: product.carbs || 0, source: "barcode", barcode: decodedText }))
            .catch(() => alert("Продукт не найден в базе. Добавьте вручную."));
        }).catch(() => closeBarcodeModal());
      },
      () => {}
    ).catch((err) => { closeBarcodeModal(); alert("Нет доступа к камере. Разрешите доступ в настройках браузера."); });
  }
  function handleMealManual() {
    if (!sessionOk) { showMessage(AUTH_REQUIRED_MSG); return; }
    const name = prompt("Название блюда (оценка КБЖУ локально в браузере):");
    if (name === null) return;
    if (!name.trim()) { openMealModal({ source: "manual" }); return; }
    try {
      const data = builtinNutritionFromName(name.trim());
      const src = data.source === "builtin" ? "ai" : "manual";
      openMealModal({
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        source: src,
      });
    } catch (e) {
      openMealModal({ name: name.trim(), source: "manual" });
      showMessage((e && e.message) ? e.message : "Не удалось оценить — введите КБЖУ вручную.");
    }
  }
  function handleStepsSave() {
    const stepsInput = el("steps-input");
    const steps = stepsInput ? parseInt(stepsInput.value, 10) || 0 : 0;
    api("/steps", { method: "POST", body: JSON.stringify({ steps }) })
      .then(() => { loadSteps(); loadSummary(); showMessage("Шаги сохранены"); })
      .catch((e) => showMessage(e.message || "Не удалось сохранить шаги"));
  }
  async function handleAddWorkout() {
    if (!userProfile) { try { userProfile = await api("/profile"); } catch (_) {} }
    const goal = (userProfile && userProfile.goal) ? userProfile.goal : "maintain";
    const activity = (userProfile && userProfile.activity_level) ? userProfile.activity_level : "";
    try {
      const res = await api("/workouts/exercises?goal=" + encodeURIComponent(goal) + "&activity=" + encodeURIComponent(activity));
      const exs = res.exercises || res;
      if (!exs || !exs.length) { showMessage("Не найдено упражнений под вашу цель. Укажите цель в Профиле или попробуйте позже."); return; }
      if (workoutExercise) workoutExercise.innerHTML = exs.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join("");
    } catch (e) { showMessage(e.message || "Не удалось загрузить список упражнений"); return; }
    workoutSetsData = [];
    renderWorkoutSets();
    if (modalWorkout) modalWorkout.classList.remove("hidden");
  }
  function handleWorkoutSave() {
    const exercise_id = workoutExercise ? parseInt(workoutExercise.value, 10) : 0;
    const sets = workoutSetsData.filter((s) => s.reps > 0 || s.weight > 0).map((s) => ({ weight: s.weight, reps: s.reps, completed: !!s.completed }));
    if (!sets.length) return;
    api("/workouts", { method: "POST", body: JSON.stringify({ exercise_id, sets }) })
      .then(() => { if (modalWorkout) modalWorkout.classList.add("hidden"); loadWorkouts(); loadSummary(); showMessage("Тренировка сохранена"); })
      .catch((e) => showMessage(e.message || "Не удалось сохранить тренировку"));
  }
  function handleProfileSave() {
    const btn = el("profile-save");
    const w = el("profile-weight"), h = el("profile-height"), g = el("profile-goal"), a = el("profile-activity"), se = el("profile-steps-enabled"), sg = el("profile-steps-goal");
    if (btn) { btn.disabled = true; btn.textContent = "Сохранение…"; }
    api("/profile", {
      method: "POST",
      body: JSON.stringify({
        weight_kg: w ? parseFloat(w.value) || null : null,
        height_cm: h ? parseFloat(h.value) || null : null,
        goal: g ? g.value || null : null,
        activity_level: a ? a.value || null : null,
        steps_enabled: se ? se.checked : false,
        steps_goal: sg ? parseInt(sg.value, 10) || 10000 : 10000,
      }),
    }).then(() => api("/profile")).then((p) => {
      userProfile = p;
      if (btn) { btn.disabled = false; btn.textContent = "Сохранить"; }
      loadWaterBlock();
      showMessage("Профиль сохранён. Список упражнений в разделе «Тренировки» обновится под вашу цель.");
    }).catch((e) => {
      if (btn) { btn.disabled = false; btn.textContent = "Сохранить"; }
      showMessage(e.message || "Не удалось сохранить профиль");
    });
  }

  // Блок с информацией о проекте (когда нет данных или ошибка)
  function setProjectInfo(el) {
    if (!el) return;
    el.innerHTML = `
      <div class="project-info">
        <div><strong>🍽️ FitFood / FoodApp</strong></div>
        <div class="stat">Учёт питания, воды, шагов и тренировок</div>
        <div class="stat">КБЖУ по фото, штрих-коду и вручную • AI-ассистент • режим тренера</div>
        <div class="row"><span class="stat stat-spaced">Войдите в аккаунт — данные сохраняются на сервере.</span></div>
      </div>
    `;
  }

  // Summary
  async function loadSummary() {
    if (!sessionOk) return;
    const card = el("summary-card");
    if (!card) return;
    try {
      const s = await api("/stats/summary");
      let profile = userProfile;
      if (!profile) {
        try { profile = await api("/profile"); userProfile = profile; } catch (_) {}
      }
      const goal = (s.goal != null && s.goal !== "") ? s.goal : ((profile && profile.goal) || "maintain");
      const targets = s.targets || null;
      const targetsRow = targets && targets.calories
        ? `<div class="summary-targets"><span class="summary-targets-label">Ориентир на сегодня</span> К ${targets.calories} · Б ${targets.protein_g} · Ж ${targets.fat_g} · У ${targets.carbs_g}</div>`
        : "";
      const hintLines = buildMacroHints(s, targets, goal);
      const hintEl = el("kbzhu-hints");
      if (hintEl) {
        if (hintLines.length) {
          hintEl.hidden = false;
          hintEl.innerHTML = `<p class="kbzhu-hints-title">Подсказки по КБЖУ</p>${hintLines.map((h) => `<div class="kbzhu-hint-chip">${escapeHtml(h)}</div>`).join("")}`;
        } else {
          hintEl.hidden = true;
          hintEl.innerHTML = "";
        }
      }
      card.innerHTML = `
        <div><strong>КБЖУ сегодня</strong></div>
        ${targetsRow}
        <div class="row">
          <span class="stat">К: <span class="value">${Math.round(s.calories)}</span></span>
          <span class="stat">Б: <span class="value">${s.protein.toFixed(0)}</span></span>
          <span class="stat">Ж: <span class="value">${s.fat.toFixed(0)}</span></span>
          <span class="stat">У: <span class="value">${s.carbs.toFixed(0)}</span></span>
        </div>
        <div class="row"><span class="stat">👟 Шаги: <span class="value">${s.steps}</span> / ${s.steps_goal}</span></div>
      `;
    } catch (e) {
      const hintEl = el("kbzhu-hints");
      if (hintEl) { hintEl.hidden = true; hintEl.innerHTML = ""; }
      const errText = (e && e.message) ? e.message : "Неизвестная ошибка";
      card.innerHTML = `<div class="project-info"><div><strong>Не удалось загрузить данные</strong></div><div class="stat">${escapeHtml(errText)}</div><div class="stat stat-spaced">Проверьте вход в аккаунт и настройки БД на сервере.</div></div>`;
    }
    loadWaterBlock();
  }

  async function loadWaterBlock() {
    if (!sessionOk) return;
    const progressEl = el("water-progress");
    const btnsEl = el("water-buttons");
    try {
      const w = await api("/water");
      let goalVal = 2000;
      try { goalVal = (await api("/profile")).water_goal_ml || 2000; } catch (_) {}
      if (progressEl) progressEl.textContent = `💧 ${w.ml} / ${goalVal} мл`;
      if (btnsEl) {
        btnsEl.innerHTML = [100, 200, 300, 500].map(
          (ml) => `<button type="button" data-ml="${ml}">+${ml} мл</button>`
        ).join("");
        // Клики по кнопкам воды обрабатываются делегированием на #root
      }
    } catch (_) {
      if (progressEl) progressEl.textContent = "💧 — Войдите в аккаунт";
    }
  }

  // Meals
  async function loadMeals() {
    const list = el("meals-list");
    if (!list) return;
    if (!sessionOk) {
      list.innerHTML = "<p class=\"hint\">" + AUTH_REQUIRED_MSG + "</p>";
      return;
    }
    try {
      const data = await api("/meals");
      list.innerHTML = data.length
        ? data.map((m) => `<div class="meal-item"><span class="name">${escapeHtml(m.name)}</span><span class="kbps">К ${Math.round(m.calories)} Б${m.protein.toFixed(0)} Ж${m.fat.toFixed(0)} У${m.carbs.toFixed(0)}</span></div>`).join("")
        : "<p class=\"hint\">Нет записей за сегодня. Добавьте блюдо.</p>";
    } catch (e) {
      list.innerHTML = "<p class=\"hint\">Не удалось загрузить: " + escapeHtml(e.message || "ошибка сети") + "</p>";
    }
  }

  const modalMeal = document.getElementById("modal-meal");
  const mealName = document.getElementById("meal-name");
  const mealCal = document.getElementById("meal-cal");
  const mealProtein = document.getElementById("meal-protein");
  const mealFat = document.getElementById("meal-fat");
  const mealCarbs = document.getElementById("meal-carbs");
  const mealSource = document.getElementById("meal-source");
  const mealBarcode = document.getElementById("meal-barcode");

  function openMealModal(prefill = {}) {
    if (mealName) mealName.value = prefill.name || "";
    if (mealCal) mealCal.value = prefill.calories ?? "";
    if (mealProtein) mealProtein.value = prefill.protein ?? "";
    if (mealFat) mealFat.value = prefill.fat ?? "";
    if (mealCarbs) mealCarbs.value = prefill.carbs ?? "";
    if (mealSource) mealSource.value = prefill.source || "manual";
    if (mealBarcode) mealBarcode.value = prefill.barcode || "";
    if (modalMeal) modalMeal.classList.remove("hidden");
  }
  function closeMealModal() {
    if (modalMeal) modalMeal.classList.add("hidden");
  }
  // modal-meal-cancel, modal-meal-save, btn-meal-photo — обрабатываются делегированием в root

  on("input-photo", "change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!sessionOk) {
      showMessage(AUTH_REQUIRED_MSG);
      e.target.value = "";
      return;
    }
    try {
      const data = builtinMealFromPhoto(file);
      openMealModal({
        name: data.name || "Блюдо по фото",
        calories: data.calories,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        source: "photo",
      });
    } catch (err) {
      showMessage((err && err.message) ? err.message : "Не удалось оценить. Укажите вручную.");
      openMealModal({ source: "photo" });
    }
    e.target.value = "";
  });

  // Сканер штрих-кода камерой
  const modalBarcode = document.getElementById("modal-barcode");
  let barcodeScanner = null;

  function closeBarcodeModal() {
    if (barcodeScanner) {
      barcodeScanner.stop().catch(() => {});
      barcodeScanner = null;
    }
    if (modalBarcode) modalBarcode.classList.add("hidden");
    const scanContainer = el("barcode-scanner-container");
    if (scanContainer) scanContainer.innerHTML = "";
  }

  // btn-meal-scan, barcode-cancel, btn-meal-manual — делегирование в root

  // Steps
  async function loadSteps() {
    const stepsInput = el("steps-input");
    if (!stepsInput) return;
    if (!sessionOk) {
      stepsInput.value = "";
      const hint = document.querySelector("#screen-steps .hint");
      if (hint) hint.textContent = AUTH_REQUIRED_MSG;
      return;
    }
    try {
      const s = await api("/steps");
      stepsInput.value = s.steps != null ? s.steps : "";
    } catch (e) {
      stepsInput.value = "";
      const hint = document.querySelector("#screen-steps .hint");
      if (hint) hint.textContent = (e && e.message) ? e.message : AUTH_REQUIRED_MSG;
    }
  }
  // steps-save — делегирование в root

  // Stats
  const RU_WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  function parseIsoDateLocal(iso) {
    const parts = (iso || "").split("-");
    if (parts.length !== 3) return new Date(NaN);
    const y = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(y, mo, day);
  }

  function formatStatDayLabel(iso) {
    const d = parseIsoDateLocal(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return RU_WEEKDAY_SHORT[d.getDay()] + " " + d.getDate();
  }

  function formatIntSpaced(n) {
    return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  }

  /**
   * @param {string} title
   * @param {Array<{date:string}>} data
   * @param {(row: object) => number} getValue
   * @param {{ unitShort: string, goal: number|null, formatBar?: (n:number)=>string }} opts
   */
  function buildStatChartBlock(title, data, getValue, opts) {
    const unitShort = opts.unitShort || "";
    const goal = opts.goal != null && opts.goal > 0 ? opts.goal : null;
    const formatBar = opts.formatBar || function (n) { return formatIntSpaced(n); };
    const values = data.map((row) => Math.max(0, Number(getValue(row)) || 0));
    const sum = values.reduce(function (a, b) { return a + b; }, 0);
    const n = values.length;
    const avg = n ? sum / n : 0;
    const maxV = Math.max.apply(null, values.concat([1]));
    const scaleMax = goal != null ? Math.max(maxV, goal) : maxV;
    const goalBottomPct = goal != null ? (goal / scaleMax) * 100 : null;

    const valuesCells = data.map(function (row, i) {
      const v = values[i];
      const t = row.date + ": " + formatBar(v) + unitShort;
      return "<div class=\"chart-stat-cell chart-stat-value-cell\"><span class=\"chart-value\" title=\"" + escapeHtml(t) + "\">" + escapeHtml(formatBar(v)) + "</span></div>";
    }).join("");

    const barsCells = data.map(function (row, i) {
      const v = values[i];
      const h = scaleMax > 0 ? (v / scaleMax) * 100 : 0;
      const t = row.date + ": " + formatBar(v) + unitShort;
      return "<div class=\"chart-stat-cell chart-stat-bar-cell\"><div class=\"chart-bar-wrap\" title=\"" + escapeHtml(t) + "\"><div class=\"chart-bar\" style=\"height:" + h + "%\"></div></div></div>";
    }).join("");

    const xCells = data.map(function (row) {
      return "<div class=\"chart-stat-cell chart-stat-x-cell\"><span class=\"chart-x\">" + escapeHtml(formatStatDayLabel(row.date)) + "</span></div>";
    }).join("");

    const summary =
      "Среднее: " + formatBar(avg) + unitShort + " · За период: " + formatBar(sum) + unitShort + " (" + n + " дн.)";
    const goalLegend = goalBottomPct != null
      ? "<p class=\"chart-goal-note\">Пунктир — цель " + formatIntSpaced(goal) + unitShort + " в день</p>"
      : "";

    const goalLine = goalBottomPct != null
      ? "<div class=\"chart-goal-line\" style=\"bottom:" + goalBottomPct + "%\" aria-hidden=\"true\"></div>"
      : "";

    return (
      "<div class=\"chart-block\">" +
      "<div class=\"chart-block-head\">" +
      "<h4>" + escapeHtml(title) + "</h4>" +
      "<p class=\"chart-summary\">" + escapeHtml(summary) + "</p>" +
      goalLegend +
      "</div>" +
      "<div class=\"chart-stat\">" +
      "<div class=\"chart-stat-row chart-stat-values\">" + valuesCells + "</div>" +
      "<div class=\"chart-stat-bars-shell\">" +
      goalLine +
      "<div class=\"chart-stat-row chart-stat-bars\">" + barsCells + "</div>" +
      "</div>" +
      "<div class=\"chart-stat-row chart-stat-x\">" + xCells + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  let currentStatsDays = 7;
  async function loadStats(days) {
    currentStatsDays = days;
    document.querySelectorAll(".period-btn").forEach((b) => b.classList.toggle("active", parseInt(b.dataset.days, 10) === days));
    const container = document.getElementById("stats-charts");
    if (!container) return;
    if (!sessionOk) {
      container.innerHTML = "<p class=\"hint\">" + AUTH_REQUIRED_MSG + "</p>";
      return;
    }
    try {
      const results = await Promise.allSettled([
        api("/stats/meals?days=" + days),
        api("/water/stats?days=" + days),
        api("/steps/stats?days=" + days),
        api("/profile/weight?days=" + days),
        api("/stats/summary"),
      ]);
      const meals = results[0].status === "fulfilled" ? results[0].value : null;
      const water = results[1].status === "fulfilled" ? results[1].value : null;
      const steps = results[2].status === "fulfilled" ? results[2].value : null;
      const weight = results[3].status === "fulfilled" ? results[3].value : null;
      const summaryRes = results[4].status === "fulfilled" ? results[4].value : null;
      const calGoal = summaryRes && summaryRes.targets && summaryRes.targets.calories ? summaryRes.targets.calories : null;
      const errors = results.map((r, i) => r.status === "rejected" ? r.reason : null).filter(Boolean);
      let html = "";
      if (meals && meals.data && meals.data.length) {
        html += buildStatChartBlock("Калории", meals.data, function (d) { return d.calories; }, {
          unitShort: " ккал",
          goal: calGoal,
          formatBar: function (x) { return formatIntSpaced(Math.round(x)); },
        });
      }
      if (water && water.data && water.data.length) {
        const g = water.goal_ml != null ? water.goal_ml : null;
        html += buildStatChartBlock("Вода (мл)", water.data, function (d) { return d.ml; }, {
          unitShort: " мл",
          goal: g,
          formatBar: function (x) { return formatIntSpaced(x); },
        });
      }
      if (steps && steps.data && steps.data.length) {
        const sg = steps.goal != null ? steps.goal : null;
        html += buildStatChartBlock("Шаги", steps.data, function (d) { return d.steps; }, {
          unitShort: " шаг",
          goal: sg,
          formatBar: function (x) { return formatIntSpaced(x); },
        });
      }
      if (weight && weight.data && weight.data.length) {
        html += buildStatChartBlock("Вес (кг)", weight.data, function (d) { return d.weight_kg; }, {
          unitShort: " кг",
          goal: null,
          formatBar: function (x) {
            var t = Math.round(x * 10) / 10;
            return (t % 1 === 0 ? String(Math.round(t)) : String(t)).replace(".", ",");
          },
        });
      }
      if (container) {
        if (html) container.innerHTML = html;
        else if (errors.length) container.innerHTML = "<p class=\"hint\">Не удалось загрузить графики: " + escapeHtml(errors[0].message || "ошибка") + "</p>";
        else container.innerHTML = "<p class=\"hint\">Нет данных за период. Добавляйте блюда, воду и шаги — здесь появятся графики.</p>";
      }
    } catch (e) {
      if (container) container.innerHTML = "<p class=\"hint\">Ошибка: " + escapeHtml(e.message || "не удалось загрузить") + "</p>";
    }
  }
  // Обработка .period-btn — через делегирование в root (см. выше)

  // Workouts — при открытии экрана обновляем профиль, чтобы цель и активность были актуальны
  async function loadWorkouts() {
    const wList = el("workouts-list");
    const rList = el("records-list");
    const hintBanner = el("workouts-hint-banner");
    if (!sessionOk) {
      if (wList) wList.innerHTML = "<p class=\"hint\">" + AUTH_REQUIRED_MSG + "</p>";
      if (rList) rList.innerHTML = "";
      if (hintBanner) { hintBanner.classList.add("hidden"); hintBanner.innerHTML = ""; }
      return;
    }
    try {
      userProfile = await api("/profile");
    } catch (_) {}
    try {
      const goal = (userProfile && userProfile.goal) ? userProfile.goal : "maintain";
      const activity = (userProfile && userProfile.activity_level) ? userProfile.activity_level : "";
      const exRes = await api("/workouts/exercises?goal=" + encodeURIComponent(goal) + "&activity=" + encodeURIComponent(activity));
      if (hintBanner) {
        const h = exRes && exRes.hint;
        if (h) {
          hintBanner.classList.remove("hidden");
          hintBanner.innerHTML = `<p>${escapeHtml(h)}</p>`;
        } else {
          hintBanner.classList.add("hidden");
          hintBanner.innerHTML = "";
        }
      }
    } catch (_) {
      if (hintBanner) { hintBanner.classList.add("hidden"); hintBanner.innerHTML = ""; }
    }
    try {
      const [list, records] = await Promise.all([api("/workouts"), api("/workouts/records")]);
      const wList = el("workouts-list");
      const rList = el("records-list");
      if (wList) wList.innerHTML = list.length
        ? list.map((w) => `<div class="workout-item"><span class="ex-name">${escapeHtml(w.exercise_name)}</span><div class="sets">${(w.sets || []).map((s) => `${s.weight}×${s.reps}`).join(", ")}</div></div>`).join("")
        : "<p class=\"hint\">Нет записей за сегодня</p>";
      if (rList) rList.innerHTML = (records.records || []).length
        ? records.records.map((r) => `${r.exercise}: ${r.weight} кг × ${r.reps}`).join("<br>")
        : "<p class=\"hint\">Пока нет рекордов</p>";
    } catch (_) {
      const wList = el("workouts-list");
      if (wList) wList.innerHTML = "<p class=\"hint\">Войдите в аккаунт.</p>";
    }
  }

  const modalWorkout = document.getElementById("modal-workout");
  const workoutExercise = document.getElementById("workout-exercise");
  const workoutSets = document.getElementById("workout-sets");
  let workoutSetsData = [];

  // btn-add-workout — делегирование в root (handleAddWorkout)
  function renderWorkoutSets() {
    if (!workoutSets) return;
    workoutSets.innerHTML = workoutSetsData.map((s, i) => `
      <div class="set-row" data-i="${i}">
        <input type="number" step="0.5" placeholder="кг" value="${s.weight}" data-weight />
        <span>×</span>
        <input type="number" min="1" placeholder="раз" value="${s.reps}" data-reps />
        <label class="set-done"><input type="checkbox" data-done ${s.completed ? "checked" : ""} /> выполнено</label>
      </div>
    `).join("");
    workoutSets.querySelectorAll(".set-row").forEach((row, i) => {
      const w = row.querySelector("[data-weight]");
      const r = row.querySelector("[data-reps]");
      const d = row.querySelector("[data-done]");
      if (w) w.addEventListener("input", () => { workoutSetsData[i].weight = parseFloat(w.value) || 0; });
      if (r) r.addEventListener("input", () => { workoutSetsData[i].reps = parseInt(r.value, 10) || 0; });
      if (d) d.addEventListener("change", () => { workoutSetsData[i].completed = d.checked; });
    });
  }
  // workout-add-set, modal-workout-cancel, modal-workout-save — делегирование в root

  // AI
  const aiChat = document.getElementById("ai-chat");
  const aiInput = document.getElementById("ai-input");
  async function sendAiMessage() {
    const text = aiInput && aiInput.value ? aiInput.value.trim() : "";
    if (!text) return;
    if (!sessionOk) {
      showMessage(AUTH_REQUIRED_MSG);
      return;
    }
    if (aiChat) aiChat.insertAdjacentHTML("beforeend", `<div class="ai-msg user">${escapeHtml(text)}</div>`);
    if (aiInput) aiInput.value = "";
    let reply;
    try {
      reply = builtinChatReply(text);
    } catch (_) {
      reply = "Ответ не сформировался. Обновите страницу с очисткой кеша: Ctrl+Shift+R (или Ctrl+F5) — должна подтянуться новая версия приложения без отдельного файла помощника.";
    }
    if (aiChat) aiChat.insertAdjacentHTML("beforeend", `<div class="ai-msg">${escapeHtml(reply)}</div>`);
    if (aiChat) aiChat.scrollTop = aiChat.scrollHeight;
  }
  // ai-send — делегирование в root
  on("ai-input", "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendAiMessage(); } });

  // Profile
  async function loadProfile() {
    if (!sessionOk) return;
    try {
      const p = await api("/profile");
      userProfile = p;
      const emailDisp = el("profile-email-display");
      if (emailDisp) emailDisp.textContent = p.email || "—";
      setVal("profile-weight", p.weight_kg);
      setVal("profile-height", p.height_cm);
      setVal("profile-goal", p.goal || "maintain");
      setVal("profile-activity", p.activity_level || "moderate");
      const stepsEnabled = el("profile-steps-enabled");
      if (stepsEnabled) stepsEnabled.checked = p.steps_enabled || false;
      setVal("profile-steps-goal", p.steps_goal ?? 10000);
    } catch (_) {}
  }
  // profile-save — делегирование в root (handleProfileSave)

  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // Регистрация при первом заходе: показываем, если в профиле нет веса/роста
  function showOnboarding(errorMessage) {
    const s = el("screen-onboarding"), r = el("root");
    const errEl = el("onboarding-error");
    if (errEl) {
      errEl.textContent = errorMessage ? String(errorMessage) : "";
      errEl.style.display = errorMessage ? "block" : "none";
    }
    if (s) s.classList.add("active");
    if (r) r.classList.add("onboarding-visible");
    renderOnboardingGoalHints();
  }
  function hideOnboarding() {
    const s = el("screen-onboarding"), r = el("root");
    if (s) s.classList.remove("active");
    if (r) r.classList.remove("onboarding-visible");
  }
  // onboarding-submit — делегирование в root (handleOnboardingSubmit)

  (async function init() {
    let p = null;
    try {
      p = await api("/auth/me");
    } catch (_) {
      showAuthScreen();
      return;
    }
    userProfile = p;
    const emailDisp = el("profile-email-display");
    if (emailDisp && p.email) emailDisp.textContent = p.email;
    if (p && (p.weight_kg == null || p.weight_kg === 0) && (p.height_cm == null || p.height_cm === 0)) {
      hideAuthAndApp();
      showOnboarding();
      return;
    }
    hideAuthAndApp();
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const main = el("screen-main");
    if (main) main.classList.add("active");
    const titleEl = el("screen-title");
    if (titleEl) titleEl.textContent = "Сегодня";
    loadSummary();
    loadWaterBlock();
  })();
})();
