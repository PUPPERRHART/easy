(() => {
  "use strict";
  const KEY = "galaxy-bux-cart-v1";
  const cards = [...document.querySelectorAll(".product-card")];
  const products = cards.map((card, index) => ({
    id: String(index + 1),
    name: card.dataset.name,
    image: card.dataset.image,
    price: Number(card.dataset.price.replace(/\./g, "").replace(",", ".")),
    card
  }));
  const byId = new Map(products.map(p => [p.id, p]));
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      for (const [id, qty] of Object.entries(saved)) {
        if (byId.has(id) && Number.isSafeInteger(qty) && qty > 0) cart[id] = Math.min(qty, 99);
      }
    }
  } catch (_) { cart = {}; }
  const $ = id => document.getElementById(id);
  const money = value => value.toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
  const overlay = $("cart-overlay"), panel = $("cart-panel"), openButton = $("open-cart");
  let lastFocus = null, toastTimer;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {} }
  function toast(message) {
    const el = $("site-toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function render() {
    const container = $("cart-items");
    container.replaceChildren();
    let total = 0, count = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const product = byId.get(id);
      if (!product || !qty) continue;
      count += qty; total += product.price * qty;
      const row = document.createElement("article"); row.className = "cart-item"; row.dataset.id = id;
      const img = document.createElement("img"); img.src = product.image; img.alt = "";
      const details = document.createElement("div");
      const title = document.createElement("h3"); title.textContent = product.name;
      const price = document.createElement("strong"); price.textContent = money(product.price * qty);
      const controls = document.createElement("div"); controls.className = "cart-qty";
      const minus = document.createElement("button"); minus.type="button"; minus.dataset.action="minus"; minus.setAttribute("aria-label","Diminuir quantidade de "+product.name); minus.textContent="−";
      const amount = document.createElement("output"); amount.textContent=String(qty); amount.setAttribute("aria-label","Quantidade");
      const plus = document.createElement("button"); plus.type="button"; plus.dataset.action="plus"; plus.setAttribute("aria-label","Aumentar quantidade de "+product.name); plus.textContent="+";
      controls.append(minus,amount,plus); details.append(title,price,controls);
      const remove = document.createElement("button"); remove.type="button"; remove.className="cart-remove"; remove.dataset.action="remove"; remove.setAttribute("aria-label","Remover "+product.name); remove.textContent="Remover";
      row.append(img,details,remove); container.append(row);
    }
    if (!count) { const empty = document.createElement("p"); empty.className="cart-empty"; empty.textContent="🛒 Seu carrinho está vazio. Adicione um produto para começar!"; container.append(empty); }
    $("cart-count").textContent = String(count);
    $("cart-total").textContent = money(total);
    $("clear-cart").disabled = count === 0;
    save();
  }
  function change(id, delta) {
    if (!byId.has(id)) return;
    const next = Math.min(99,Math.max(0,(cart[id] || 0)+delta));
    if (next === 0) delete cart[id]; else cart[id] = next;
    render();
    const cartButton = $("open-cart");
    cartButton.classList.remove("cart-pulse");
    void cartButton.offsetWidth;
    cartButton.classList.add("cart-pulse");
  }
  function openCart() {
    lastFocus = document.activeElement; overlay.hidden=false;
    panel.classList.add("is-open"); panel.setAttribute("aria-hidden","false");
    openButton.setAttribute("aria-expanded","true"); document.body.classList.add("cart-open");
    $("close-cart").focus();
  }
  function closeCart() {
    panel.classList.remove("is-open"); panel.setAttribute("aria-hidden","true");
    overlay.hidden=true; openButton.setAttribute("aria-expanded","false");
    document.body.classList.remove("cart-open");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }
  cards.forEach((card,index) => {
    card.querySelector(".add-to-cart").addEventListener("click",() => {
      const id=String(index+1);
      if ((cart[id] || 0) >= 99) { toast("Limite de 99 unidades por produto."); return; }
      change(id,1); toast(products[index].name+" adicionado ao carrinho!");
      openCart();
    });
  });
  openButton.addEventListener("click",openCart);
  $("close-cart").addEventListener("click",closeCart);
  overlay.addEventListener("click",closeCart);
  panel.addEventListener("keydown",e => {
    if (e.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll('button:not(:disabled)')];
    if (!focusable.length) return;
    if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0].focus(); }
  });
  document.addEventListener("keydown",e => { if(e.key==="Escape" && panel.classList.contains("is-open")) closeCart(); });
  $("cart-items").addEventListener("click",e => {
    const btn=e.target.closest("button[data-action]"); if (!btn) return;
    const id=btn.closest(".cart-item").dataset.id;
    if(btn.dataset.action==="remove") { delete cart[id]; render(); }
    if(btn.dataset.action==="plus") change(id,1);
    if(btn.dataset.action==="minus") change(id,-1);
  });
  $("clear-cart").addEventListener("click",() => { cart={}; render(); toast("Carrinho esvaziado."); });
  const search=$("product-search");
  function filterProducts(term) {
    const normalized=term.trim().toLocaleLowerCase("pt-BR");
    let visible=0;
    for (const product of products) {
      const matches=product.name.toLocaleLowerCase("pt-BR").includes(normalized);
      product.card.hidden=!matches;
      if(matches) visible++;
    }
    $("search-empty").hidden=visible>0;
  }
  search.addEventListener("input",() => filterProducts(search.value));
  search.addEventListener("keydown",e => { if(e.key==="Enter") $("catalogo").scrollIntoView({behavior:"smooth"}); });
  // Navegação entre página inicial, catálogo de jogos e página individual de cada jogo.
  const gameLinks = [...document.querySelectorAll("#jogos .game-card")];
  const allGrid = $("all-games-grid");
  gameLinks.filter(link => link.dataset.game !== "Outros Jogos").forEach(link => {
    const clone = link.cloneNode(true);
    allGrid.append(clone);
  });
  const gameNames = new Map([
    ["Blox Fruits", "Blox Fruits"], ["Anime Champions", "Anime Champions"],
    ["King Legacy", "King Legacy"], ["Anime Expeditions", "Anime Expeditions"],
    ["Anime Astral", "Anime Astral"]
  ]);
  function showView(view, game) {
    const all = view === "all";
    const single = view === "game";
    document.body.classList.toggle("game-page-active", all || single);
    $("todos-jogos").hidden = !all;
    $("pagina-jogo").hidden = !single;
    if (single) {
      const name = gameNames.get(game) || "Jogo";
      $("game-view-title").textContent = name.toLocaleUpperCase("pt-BR");
      const grid = $("game-products");
      grid.replaceChildren();
      const matching = products.filter(product => {
        const n = product.name.toLocaleLowerCase("pt-BR");
        if (name === "Blox Fruits") return n.includes("blox fruits") || n.includes("conta nível máx.");
        return n.includes(name.toLocaleLowerCase("pt-BR"));
      });
      matching.forEach(product => grid.append(product.card.cloneNode(true)));
      $("game-empty").hidden = matching.length > 0;
      $("game-view-subtitle").textContent = matching.length ? matching.length + " produto(s) disponível(is)" : "Novidades em breve";
      // Reutiliza a mesma lógica do carrinho nos cartões da página de jogo.
      grid.querySelectorAll(".product-card").forEach(card => {
        const product = products.find(p => p.name === card.dataset.name);
        card.querySelector(".add-to-cart").addEventListener("click", () => {
          if ((cart[product.id] || 0) >= 99) { toast("Limite de 99 unidades por produto."); return; }
          change(product.id, 1); toast(product.name + " adicionado ao carrinho!"); openCart();
        });
      });
    }
    if (all || single) window.scrollTo({top:0,behavior:"instant"});
    requestAnimationFrame(() => { prepareReveals(); updateScrollUI(); });
  }
  const reducePageMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let displayedRoute = null;
  let transitionRunning = false;
  let pendingRoute = null;
  function routeFromHash() {
    const hash = decodeURIComponent(location.hash);
    if (hash === "#todos-jogos") return {key:"all",view:"all"};
    if (hash.startsWith("#pagina-jogo/")) {
      const game = hash.slice("#pagina-jogo/".length);
      if (gameNames.has(game)) return {key:"game:"+game,view:"game",game};
    }
    return {key:"home",view:"home",scrollGames:hash==="#jogos"};
  }
  function applyRoute(next) {
    showView(next.view,next.game);
    if (next.scrollGames) requestAnimationFrame(() => $("jogos").scrollIntoView({behavior:"instant"}));
    displayedRoute=next.key;
  }
  async function route() {
    const next=routeFromHash();
    if (next.key===displayedRoute) {
      if (next.scrollGames) $("jogos").scrollIntoView({behavior:reducePageMotion?"instant":"smooth"});
      return;
    }
    if (transitionRunning) { pendingRoute=next; return; }
    if (displayedRoute===null || reducePageMotion) { applyRoute(next); return; }
    transitionRunning=true;
    const body=document.body;
    body.classList.add("page-transitioning","page-leaving");
    try {
      await new Promise(resolve => setTimeout(resolve,240));
      body.classList.remove("page-leaving");
      applyRoute(pendingRoute || next);
      pendingRoute=null;
      body.classList.add("page-entering");
      await new Promise(resolve => setTimeout(resolve,460));
    } finally {
      body.classList.remove("page-transitioning","page-leaving","page-entering");
      transitionRunning=false;
    }
    if (pendingRoute || routeFromHash().key!==displayedRoute) {
      const queued=pendingRoute;
      pendingRoute=null;
      if (queued && queued.key!==routeFromHash().key) location.hash=queued.key==="home"?"#jogos":queued.key==="all"?"#todos-jogos":"#pagina-jogo/"+encodeURIComponent(queued.game);
      route();
    }
  }
  document.querySelectorAll(".game-card").forEach(link => link.addEventListener("click", e => {
    e.preventDefault();
    const name=link.dataset.game;
    const hash=name==="Outros Jogos"?"#todos-jogos":"#pagina-jogo/"+encodeURIComponent(name);
    if(location.hash===hash) route(); else location.hash=hash;
  }));
  $("all-games-link").addEventListener("click",e => {
    e.preventDefault();
    if(location.hash==="#todos-jogos") route(); else location.hash="#todos-jogos";
  });
  document.querySelectorAll(".back-to-home").forEach(link => link.addEventListener("click",e => {
    e.preventDefault();
    if(location.hash==="#jogos") route(); else location.hash="#jogos";
  }));
  window.addEventListener("hashchange",route);
  route();
  $("account-button").addEventListener("click",()=>toast("Área de conta em desenvolvimento."));
  // Revelação suave apenas quando os elementos entram na tela.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealSelector = ".section-heading, .game-card, .product-card, .promo, .benefits article, .reviews";
  let revealObserver;
  if (!reduceMotion && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      });
    }, {threshold:.08, rootMargin:"0px 0px 40px 0px"});
  }
  function prepareReveals(root=document) {
    if (!revealObserver) return;
    root.querySelectorAll(revealSelector).forEach(el => {
      if (el.dataset.revealInitialized) return;
      el.dataset.revealInitialized="1";
      el.classList.add("reveal-ready");
      revealObserver.observe(el);
    });
  }
  prepareReveals();
  const topButton = $("back-to-top"), progress = $("reading-progress");
  let scrollQueued = false;
  function updateScrollUI() {
    const y = window.scrollY;
    const max = Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    progress.style.transform = "scaleX(" + Math.min(1,y/max) + ")";
    document.querySelector(".topbar").classList.toggle("is-scrolled",y>18);
    topButton.classList.toggle("visible",y>400);
    scrollQueued=false;
  }
  window.addEventListener("scroll",() => {
    if (!scrollQueued) { scrollQueued=true; requestAnimationFrame(updateScrollUI); }
  },{passive:true});
  window.addEventListener("resize",updateScrollUI);
  topButton.addEventListener("click",() => window.scrollTo({top:0,behavior:reduceMotion?"instant":"smooth"}));
  window.addEventListener("hashchange",() => {
    requestAnimationFrame(() => { prepareReveals(); updateScrollUI(); });
  });
  updateScrollUI();
  render();
})();
