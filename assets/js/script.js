/* 53 east yoga: меню, появление, формы, выбор заезда, cookie и Метрика, окно авиабилетов, просмотр фото, видео. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* приватный режим */ } },
  };

  /* Яндекс Метрика: впишите номер счётчика. Загружается только после согласия на cookie. */
  const METRIKA_ID = 0;

  /* ---------- меню ---------- */
  const nav = $('[data-nav]');
  if (nav) {
    const burger = $('.burger', nav);
    const setMenu = open => {
      nav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    $$('.dd-t', nav).forEach(b => b.addEventListener('click', () => {
      const dd = b.parentElement;
      const open = !dd.classList.contains('open');
      dd.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open);
    }));
    document.addEventListener('click', e => {
      if (!e.target.closest('.dd')) $$('.dd.open', nav).forEach(d => { d.classList.remove('open'); $('.dd-t', d).setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (nav.classList.contains('open')) { setMenu(false); burger.focus(); }
      $$('.dd.open', nav).forEach(d => { d.classList.remove('open'); $('.dd-t', d).setAttribute('aria-expanded', 'false'); });
    });
    // переход по якорю из мобильного меню закрывает его
    $$('.menu a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  }

  /* ---------- появление по очереди ---------- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-reveal]').forEach(sec => $$('.rise', sec).forEach((el, i) => el.style.setProperty('--d', (i * 90) + 'ms')));
  const hero = $('[data-hero]');
  if (hero) $$('.rise', hero).forEach((el, i) => el.style.setProperty('--d', (300 + i * 110) + 'ms'));
  if (reduce || !('IntersectionObserver' in window)) {
    $$('[data-reveal],[data-hero]').forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    if (hero) {
      const go = () => requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
      setTimeout(() => hero.classList.add('is-in'), 1500);
    }
  }

  /* ---------- внутреннее меню: подсветка раздела ---------- */
  const sub = $('.subnav');
  if (sub && 'IntersectionObserver' in window) {
    const links = $$('a', sub);
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const seen = new Set();
    const io2 = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id));
      const first = links.find(a => seen.has(a.getAttribute('href').slice(1)));
      links.forEach(a => a.classList.toggle('on', a === first));
      const cur = $('.subnav__cur', sub); if (cur && first) cur.textContent = first.textContent;
      if (first) {
        const box = $('.subnav__in', sub);
        const l = first.offsetLeft - 24;
        if (l < box.scrollLeft || first.offsetLeft + first.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: l, behavior: reduce ? 'auto' : 'smooth' });
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io2.observe(s); });
  }

  /* ---------- внутреннее меню на телефоне: кнопка «Раздел» открывает список ---------- */
  const subBtn = sub && $('.subnav__btn', sub);
  if (subBtn) {
    const setOpen = on => { sub.classList.toggle('is-open', on); subBtn.setAttribute('aria-expanded', String(on)); };
    subBtn.addEventListener('click', () => setOpen(!sub.classList.contains('is-open')));
    $$('a', sub).forEach(a => a.addEventListener('click', () => {
      const cur = $('.subnav__cur', sub); if (cur) cur.textContent = a.textContent;
      setOpen(false);
    }));
    document.addEventListener('click', e => { if (!sub.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sub.classList.contains('is-open')) { setOpen(false); subBtn.focus(); } });
    addEventListener('scroll', () => { if (sub.classList.contains('is-open')) setOpen(false); }, { passive: true });
  }

  /* ---------- выбор заезда: запоминаем и подставляем в форму ---------- */
  const fillTour = id => {
    if (!id) return;
    $$('[data-tour-select]').forEach(sel => {
      const opt = $$('option', sel).find(o => o.dataset.id === id);
      if (opt) sel.value = opt.value;
    });
    $$('.drow, .tcard[data-id]').forEach(r => r.classList.toggle('is-picked', r.dataset.id === id));
  };
  const qsTour = new URLSearchParams(location.search).get('tour');
  if (qsTour && /^[a-z0-9-]{2,20}$/.test(qsTour)) store.set('tour', qsTour);
  fillTour(store.get('tour'));
  $$('[data-tour]').forEach(b => b.addEventListener('click', () => { store.set('tour', b.dataset.tour); fillTour(b.dataset.tour); }));
  $$('[data-tour-select]').forEach(sel => sel.addEventListener('change', () => {
    const o = sel.selectedOptions[0];
    if (o && o.dataset.id) { store.set('tour', o.dataset.id); fillTour(o.dataset.id); }
  }));

  /* ---------- кнопка с темой: выбирает тему в форме ---------- */
  $$("[data-topic]").forEach(b => b.addEventListener("click", () => {
    $("input[name=topic]").forEach(r => { if (r.value === b.dataset.topic) r.checked = true; });
  }));

  /* ---------- программа: развернуть всё ---------- */
  $$('[data-expand]').forEach(b => {
    const list = document.getElementById(b.dataset.expand);
    if (!list) return;
    const label = $('span', b);
    b.addEventListener('click', () => {
      const days = $$('details', list);
      const open = !days.every(d => d.open);
      days.forEach(d => { d.open = open; });
      label.textContent = open ? 'Свернуть программу' : 'Развернуть всю программу';
      b.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- ссылка на день программы открывает его ---------- */
  const openDay = hash => {
    if (!/^#den-\d+$/.test(hash)) return;
    const d = document.querySelector(hash);
    if (d && d.tagName === "DETAILS") d.open = true;
  };
  $$('a[href^="#den-"]').forEach(a => a.addEventListener("click", () => openDay(a.getAttribute("href"))));
  openDay(location.hash);

  /* ---------- одна левая линия: логотип и меню страницы по краю текста первого экрана ---------- */
  /* левая линия общая для всех страниц (задана в CSS), подстраивается только своя сетка Курильского озера */
  const heroRef = window.innerWidth >= 1600 && !document.querySelector(".hero--kur") ? ($(".hero__box") || $(".hero__in > *")) : null;
  /* 2K и шире: текст первого экрана ровно посередине между левым краем окна и фото (кроме главной, Курил и страниц без фото) */
  const heroIn = $(".hero:not(.hero--kur):not(.hero--home) .hero__in");
  const heroPh = $(".hero:not(.hero--kur):not(.hero--home) .hero__ph, .hero:not(.hero--kur):not(.hero--home) > .ph");
  const centerHero = () => {
    if (!heroIn || !heroPh) return;
    heroIn.style.removeProperty("padding-left");
    if (window.innerWidth < 1600) return;
    const leaves = Array.from(heroIn.querySelectorAll("*")).filter(e => !e.children.length && e.textContent.trim() || e.matches(".btn"));
    const rr = e => { const r = document.createRange(); r.selectNodeContents(e); const a = Array.from(r.getClientRects()); return e.matches(".btn") ? [e.getBoundingClientRect()] : a; };
    const rects = leaves.flatMap(rr);
    if (!rects.length) return;
    const L = Math.min(...rects.map(x => x.left));
    const R = Math.max(...rects.map(x => x.right));
    const target = Math.round((heroPh.getBoundingClientRect().left - (R - L)) / 2);
    const pl = parseFloat(getComputedStyle(heroIn).paddingLeft) || 0;
    heroIn.style.setProperty("padding-left", Math.max(0, pl + target - L) + "px", "important");
  };
  const alignX = () => {
    centerHero();
    if (!heroRef) return;
    const x = Math.round(heroRef.getBoundingClientRect().left);
    if (x > 0) document.documentElement.style.setProperty("--hero-x", x + "px"); else document.documentElement.style.removeProperty("--hero-x");
  };
  alignX();
  window.addEventListener("load", alignX);
  setTimeout(alignX, 1300);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignX);
  let rz = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(alignX); });

  /* ---------- формы ---------- */
  const showErr = (input, on) => {
    const id = input.getAttribute('aria-describedby');
    const err = id && document.getElementById(id);
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    if (err) err.hidden = !on;
  };
  const check = input => {
    let bad = false;
    if (input.type === 'checkbox') bad = input.required && !input.checked;
    else if (input.type === 'email') bad = (input.required || input.value.trim() !== '') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    else if (input.hasAttribute('data-phone')) bad = input.value.replace(/\D/g, '').length !== 11;
    else if (input.required) bad = input.value.trim().length < 2;
    showErr(input, bad);
    return !bad;
  };
  /* маска телефона: +7 (900) 123-45-67, не больше 10 цифр после +7 */
  const fmtPhone = v => {
    let d = v.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d && d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    if (!d) return '';
    const r = d.slice(1);
    let out = '+7';
    if (r.length) out += ' (' + r.slice(0, 3);
    if (r.length >= 3) out += ')';
    if (r.length > 3) out += ' ' + r.slice(3, 6);
    if (r.length > 6) out += '-' + r.slice(6, 8);
    if (r.length > 8) out += '-' + r.slice(8, 10);
    return out;
  };
  $$('[data-phone]').forEach(i => {
    i.addEventListener('focus', () => { if (!i.value) i.value = '+7 ('; });
    i.addEventListener('blur', () => { if (i.value.replace(/\D/g, '').length <= 1) i.value = ''; });
    i.addEventListener('input', e => {
      const back = e.inputType && e.inputType.startsWith('delete');
      const v = fmtPhone(i.value);
      i.value = back && v.endsWith(')') && !i.value.endsWith(')') ? v.slice(0, -1) : v;
    });
  });

  $$('[data-form]').forEach(f => {
    const fields = $$('input[required],input[type=email],input[data-phone]', f);
    fields.forEach(i => {
      i.addEventListener(i.type === 'checkbox' ? 'change' : 'blur', () => { if (i.getAttribute('aria-invalid') || i.value) check(i); });
      i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const status = $('.f-status', f);
      const bad = fields.filter(i => !check(i));
      if (bad.length) { bad[0].focus(); status.className = 'f-status err'; status.textContent = bad.length === 1 ? 'Заполните отмеченное поле, и можно отправлять' : 'Заполните отмеченные поля (' + bad.length + '), и можно отправлять'; return; }
      const btn = $('button[type=submit]', f);
      btn.disabled = true;
      status.className = 'f-status'; status.textContent = 'Отправляем…';
      const data = new FormData(f);
      data.append('page', document.title);
      try {
        const r = await fetch(f.action, { method: 'POST', body: data, headers: { 'X-Requested-With': 'fetch' } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'send');
        f.reset();
        fillTour(store.get('tour'));
        status.className = 'f-status ok';
        status.textContent = 'Спасибо! Заявка отправлена. Ответим в течение рабочего дня.';
        if (window.ym && METRIKA_ID) window.ym(METRIKA_ID, 'reachGoal', 'form_sent');
      } catch (err) {
        status.className = 'f-status err';
        status.innerHTML = 'Не получилось отправить. Напишите Елене в <a href="https://t.me/elena_53east_yoga" target="_blank" rel="noopener">Telegram</a> или позвоните: <a href="tel:+79098323088">+7 909 832-30-88</a>.';
      } finally { btn.disabled = false; }
    });
  });

  /* ---------- cookie и Метрика ---------- */
  const cookie = $('#cookie');
  const loadMetrika = () => {
    if (!METRIKA_ID || window.ym) return;
    /* стандартный код счётчика Яндекс Метрики */
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const s = document.createElement('script');
    s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
    window.ym(METRIKA_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  };
  const consent = store.get('cookie');
  if (consent === 'all') loadMetrika();
  const closeCookie = () => { cookie.hidden = true; document.dispatchEvent(new Event('cookie:done')); };
  if (cookie) {
    if (!consent) cookie.hidden = false;
    $$('[data-cookie]', cookie).forEach(b => b.addEventListener('click', () => {
      store.set('cookie', b.dataset.cookie);
      if (b.dataset.cookie === 'all') loadMetrika();
      closeCookie();
    }));
    $$('[data-cookie-open]').forEach(b => b.addEventListener('click', () => { cookie.hidden = false; $('button', cookie).focus(); }));
  }

  /* ---------- окно про авиабилеты (страницы туров) ---------- */
  const fly = $('#fly');
  if (fly && document.body.hasAttribute('data-fly') && !store.sget('fly')) {
    const show = () => setTimeout(() => {
      fly.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => fly.classList.add('on')));
    }, 1200);
    if (cookie && !cookie.hidden) document.addEventListener('cookie:done', show, { once: true }); else show();
    const hide = () => { fly.classList.remove('on'); store.sset('fly', '1'); setTimeout(() => { fly.hidden = true; }, 500); };
    $('[data-fly-close]', fly).addEventListener('click', hide);
    $$('a', fly).forEach(a => a.addEventListener('click', () => store.sset('fly', '1')));
  }

  /* ---------- «Смотреть все фото»: сетка разворачивается вниз ---------- */
  $$("[data-expand-gal]").forEach(b => {
    const box = document.getElementById(b.dataset.expandGal);
    if (!box) return;
    const label = [$("span", b)];
    b.addEventListener("click", () => {
      const open = box.hidden;
      box.hidden = !open;
      b.setAttribute("aria-expanded", open);
      b.classList.toggle("is-open", open);
      label.forEach(l => { l.textContent = open ? "Свернуть фото" : "Смотреть все фото"; });
      // кнопка переезжает под фото, при сворачивании возвращается на место
      const cap = b.closest(".hotel-cap") || b;
      if (open) { box.after(cap); requestAnimationFrame(() => box.classList.add("on")); b.focus({ preventScroll: true }); }
      else { box.classList.remove("on"); box.before(cap); b.focus({ preventScroll: true }); cap.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); }
    });
  });

  /* ---------- кнопка «наверх»: появляется после первого экрана ---------- */
  const toTop = $("[data-totop]");
  if (toTop) {
    const flyBox = $("#fly");
    let tick = 0;
    const upd = () => {
      tick = 0;
      const flyOpen = flyBox && !flyBox.hidden && flyBox.classList.contains("on");
      const cookieOpen = cookie && !cookie.hidden;
      toTop.classList.toggle("on", window.scrollY > window.innerHeight * 0.8 && !flyOpen && !cookieOpen);
    };
    window.addEventListener("scroll", () => { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
    upd();
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      const logo = $(".logo"); if (logo) logo.focus({ preventScroll: true });
    });
  }

  /* ---------- просмотр фото ---------- */
  const lb = $('#lb');
  if (lb && typeof lb.showModal === 'function') {
    const cap = $('figcaption', lb);
    const img = document.createElement('img');
    img.alt = '';
    cap.before(img);
    const prev = $('[data-lb-prev]', lb), next = $('[data-lb-next]', lb);
    let opener = null, list = [], idx = 0, name = '';
    const setNav = on => { prev.hidden = !on; next.hidden = !on; };
    const show = i => {
      idx = (i + list.length) % list.length;
      img.src = list[idx];
      img.alt = name + ', фото ' + (idx + 1) + ' из ' + list.length;
      cap.textContent = (idx + 1) + ' / ' + list.length;
      // подгружаем соседнее фото заранее, чтобы листалось без задержки
      const pre = new Image(); pre.src = list[(idx + 1) % list.length];
    };
    // одно фото
    $$('[data-lb]').forEach(b => b.addEventListener('click', () => {
      opener = b; list = []; setNav(false);
      img.src = b.dataset.lb;
      img.alt = $('img', b) ? $('img', b).alt : '';
      cap.textContent = b.dataset.cap || '';
      lb.showModal();
    }));
    // фото из развёрнутой сетки: крупно, с листанием по всем фото этой сетки
    $$('[data-gallery-set]').forEach(set => {
      const all = set.dataset.gallerySet.split('|').filter(s => /^assets\/img\/[a-z0-9/_-]+\.webp$/.test(s));
      $$('[data-gi]', set).forEach(b => b.addEventListener('click', () => {
        opener = b; list = all; name = set.dataset.galleryName || 'Фото';
        if (!list.length) return;
        setNav(true); show(+b.dataset.gi || 0); lb.showModal(); next.focus();
      }));
    });
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('keydown', e => {
      if (!list.length) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
    });
    let x0 = null;
    lb.addEventListener('pointerdown', e => { x0 = e.clientX; });
    lb.addEventListener('pointerup', e => {
      if (x0 === null || !list.length) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
    const close = () => { lb.close(); };
    $('[data-lb-close]', lb).addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    lb.addEventListener('close', () => { list = []; if (opener) opener.focus(); });
  } else {
    $$('[data-lb]').forEach(b => b.addEventListener('click', () => window.open(b.dataset.lb, '_blank', 'noopener')));
  }

  /* ---------- видео: плеер грузится по нажатию ---------- */
  $$('[data-video]').forEach(b => b.addEventListener('click', () => {
    const url = b.dataset.video;
    if (!/^https:\/\/kinescope\.io\//.test(url)) return;
    const f = document.createElement('iframe');
    f.src = url;
    f.title = b.dataset.title || 'Видео';
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    b.replaceWith(f);
    f.focus();
  }));

  /* отзывы на телефоне: лента вбок, длинный текст свёрнут, «Читать полностью» раскрывает плавно, «Свернуть» возвращает к началу отзыва */
  const revs = $$('.revs');
  if (revs.length) {
    const mq = matchMedia('(max-width: 760px)');
    revs.forEach(box => {
      const hint = document.createElement('p'); hint.className = 'revs-hint'; hint.textContent = 'Листайте отзывы вбок';
      hint.hidden = true; box.after(hint);
      $$('.rev', box).forEach(r => {
        const q = $('.rev__q', r); if (!q) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'rev__more'; b.textContent = 'Читать полностью'; b.hidden = true; b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', () => {
          const open = !r.classList.contains('is-open');
          if (open) {
            q.style.maxHeight = q.scrollHeight + 'px';
            r.classList.add('is-open');
          } else {
            q.style.maxHeight = '';
            r.classList.remove('is-open');
            const sec = box.closest('section') || box, top = sec.getBoundingClientRect().top;
            if (top < 0) scrollTo({ top: Math.max(0, scrollY + top - 56), behavior: reduce ? 'auto' : 'smooth' });
          }
          b.textContent = open ? 'Свернуть' : 'Читать полностью';
          b.setAttribute('aria-expanded', String(open));
        });
        q.after(b);
      });
    });
    const sync = () => revs.forEach(box => {
      box.nextElementSibling.hidden = !mq.matches;
      $$('.rev', box).forEach(r => {
        const q = $('.rev__q', r), b = $('.rev__more', r); if (!b) return;
        if (r.classList.contains('is-open')) return;
        q.style.maxHeight = '';
        const extra = q.scrollHeight - q.clientHeight;
        const long = mq.matches && extra > 40; // хвост меньше двух строк показываем сразу, без кнопки
        if (mq.matches && !long && extra > 0) q.style.maxHeight = 'none';
        r.classList.toggle('is-long', long);
        b.hidden = !long;
      });
    });
    sync(); mq.addEventListener('change', sync); addEventListener('load', sync);
    if (document.fonts) document.fonts.ready.then(sync);
  }

  /* у футера полоса под адресной строкой (Safari на телефоне) окрашивается в цвет футера, выше по странице в цвет фона */
  const foot = $('.foot'), tc = $('meta[name="theme-color"]');
  if (foot && tc && 'IntersectionObserver' in window) {
    const base = tc.content, deep = getComputedStyle(foot).backgroundColor;
    new IntersectionObserver(es => es.forEach(e => {
      tc.content = e.isIntersecting ? deep : base;
      document.documentElement.style.backgroundColor = e.isIntersecting ? deep : '';
    }), { rootMargin: '0px 0px -40% 0px' }).observe(foot);
  }

  /* ---------- раскрывающиеся блоки (вопросы, дни программы): плавно по высоте ---------- */
  if (!reduce && 'animate' in Element.prototype) $$('details').forEach(d => {
    const sum = $('summary', d); if (!sum) return;
    let anim = null;
    const run = (from, to, done) => {
      if (anim) anim.cancel();
      d.style.overflow = 'hidden';
      anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = () => { anim = null; d.style.overflow = ''; done && done(); };
      anim.oncancel = () => { anim = null; d.style.overflow = ''; };
    };
    sum.addEventListener('click', e => {
      e.preventDefault();
      const start = d.offsetHeight;
      if (!d.open || d.classList.contains('is-closing')) {
        d.classList.remove('is-closing');
        d.open = true;
        run(start, d.scrollHeight);
      } else {
        d.classList.add('is-closing');
        run(start, sum.offsetHeight + (parseFloat(getComputedStyle(d).borderBottomWidth) || 0), () => { d.open = false; d.classList.remove('is-closing'); });
      }
    });
  });
})();
