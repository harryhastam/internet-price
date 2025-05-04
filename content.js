(() => {
    try {
      console.log('[IPGB] Initializing highlight…');
  
      // --- Main Configuration and Utilities ---
      const CONFIG = {
        container: '#service-list',
        cardSelector: '.uk-card-default',
        labelClass: 'ipgb-label',
        retryDelay: 500,
        maxRetries: 20
      };
      const p2e = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
      const toLatin = s => s.replace(/[۰-۹]/g, d => p2e[d]);
      let retries = 0, throttle = false;
  
      // --- Speed Label Configuration ---
      const SPEED = {
        regex: /(?:1000|۱۰۰۰)\s*Mb/gi,
        labelClass: 'ipgb-speed-label',
        cardClass: 'high-speed-card'
      };
      const speedMatches = new Set();
  
      // --- Inject Combined CSS ---
      function injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
          /* Main labels */
          .ipgb-root .uk-card-default { margin: 10px 0; transition: background-color 0.3s, border 0.3s; }
          .ipgb-root .${CONFIG.labelClass} {
            margin-top: 0; background: #f9f9f9; border-radius: 0; padding: 10px 12px;
            font-size: 14px; font-weight: 600; color: #222; line-height: 1.7;
            border: 1px solid #ccc; direction: rtl; text-align: center;
          }
          .ipgb-root .best { background-color: #85ffa3 !important; border: 2px solid #27ae60 !important; }
          .ipgb-root .good { background-color: #d4f8e8 !important; border: 2px solid #2ecc71 !important; }
          .ipgb-root .bad  { background-color: #fdecea !important; border: 2px solid #e74c3c !important; }
          .ipgb-root .fast { background-color: #e0e7ff !important; border: 2px dashed #6366f1 !important; }
  
          /* Speed labels override */
          .ipgb-root .${SPEED.labelClass} {
            font-family: Vazirmatn, sans-serif !important; transition: all 0.3s ease !important;
            background: #e0e7ff !important; color: #1e40af !important;
            font-size: 0.8rem !important; font-weight: bold !important;
            padding: 4px 8px !important; border-radius: 6px !important;
            margin-top: 6px !important; display: inline-block !important;
          }
          .ipgb-root .${SPEED.cardClass} {
            border: 2px dashed #1e40af !important; background-color: #f0f4ff !important;
          }
        `;
        document.head.appendChild(style);
        console.log('[IPGB] CSS injected');
      }
  
      // --- Cleanup before processing ---
      function cleanupAll() {
        document.querySelectorAll(`.${CONFIG.labelClass}, .${SPEED.labelClass}`).forEach(el => el.remove());
        document.querySelectorAll(
          `${CONFIG.cardSelector}.best, .good, .bad, .fast, .${SPEED.cardClass}`
        ).forEach(el => {
          el.classList.remove('best','good','bad','fast', SPEED.cardClass);
        });
      }
  
      // --- Process Price per GB ---
      function processItems() {
        const container = document.querySelector(CONFIG.container);
        if (!container) return;
        container.classList.add('ipgb-root');
  
        const nodes = Array.from(container.querySelectorAll(CONFIG.cardSelector));
        if (!nodes.length) {
          if (retries++ < CONFIG.maxRetries) {
            return setTimeout(processItems, CONFIG.retryDelay);
          }
          return;
        }
  
        cleanupAll();
  
        const data = nodes.map(el => {
          const title = el.querySelector('.uk-card-title');
          const price = el.querySelector('.price h3');
          if (!title || !price) return null;
          const t = toLatin(title.textContent);
          const p = toLatin(price.textContent);
          const gb = t.match(/([\d,]+)\s*گیگابایت/) ? parseInt(t.match(/([\d,]+)\s*گیگابایت/)[1].replace(/,/g,''),10) : NaN;
          const tom = p.match(/([\d,]+)\s*ریال/) ? parseInt(p.match(/([\d,]+)\s*ریال/)[1].replace(/,/g,''),10)/10 : NaN;
          const perGb = gb && tom ? tom/gb : Infinity;
          return {
            el, perGb, perGbTax: perGb*1.1, totalTax: tom*1.1,
            isFast: SPEED.regex.test(t)
          };
        }).filter(d=>d && isFinite(d.perGb));
  
        if (!data.length) return;
        const vals = data.map(d=>d.perGb);
        const minV = Math.min(...vals);
        const avgV = vals.reduce((a,b)=>a+b,0)/vals.length;
        const threshold = avgV * 0.6;
  
        data.forEach(({el, perGb, perGbTax, totalTax, isFast}) => {
          const label = document.createElement('div');
          label.className = CONFIG.labelClass;
          label.innerHTML = `
            <div>هزینه هر گیگ: <b>${Math.round(perGb).toLocaleString()}</b> تومان</div>
            <div>با مالیات ۱۰٪: <b>${Math.round(perGbTax).toLocaleString()}</b> تومان</div>
            <div>کل + مالیات: <b>${Math.round(totalTax).toLocaleString()}</b></div>
          `;
          el.appendChild(label);
          if (isFast) el.classList.add('fast');
          else if (perGb===minV) el.classList.add('best');
          else if (perGb<=threshold) el.classList.add('good');
          else el.classList.add('bad');
        });
  
        console.log(`[IPGB] Highlighted ${data.length} cards`);
      }
  
      // --- Observe Mutations ---
      function onMutations() {
        if (throttle) return;
        throttle = true;
        setTimeout(()=>{ processItems(); findSpeedCards(); applySpeedLabels(); throttle=false; }, 200);
      }
  
      // --- Find Cards Matching Speed ---
      function findSpeedCards() {
        speedMatches.clear();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const txt = walker.currentNode.textContent;
          if (SPEED.regex.test(txt)) {
            const card = walker.currentNode.parentElement.closest(CONFIG.cardSelector);
            if (card) speedMatches.add(card);
          }
        }
      }
  
      // --- Apply Speed Labels ---
      function applySpeedLabels() {
        document.querySelectorAll(CONFIG.cardSelector).forEach(card => {
          const existing = card.querySelector(`.${SPEED.labelClass}`);
          if (existing) existing.remove();
          const lbl = document.createElement('div');
          lbl.className = SPEED.labelClass;
          if (speedMatches.has(card)) {
            lbl.textContent = '✅ سرعت بالا';
            card.classList.add(SPEED.cardClass);
          } else {
            lbl.textContent = 'سرعت متوسط';
          }
          card.querySelector('.uk-card-body')?.appendChild(lbl);
        });
        console.log(`[IPGB] Found ${speedMatches.size} high-speed cards`);
      }
  
      // --- Initialization ---
      injectCSS();
      const root = document.querySelector(CONFIG.container);
      if (root) {
        new MutationObserver(onMutations).observe(root, { childList:true, subtree:true, attributes:true });
        console.log('[IPGB] MutationObserver active');
      } else {
        console.log('[IPGB] Container not found. Will retry...');
      }
      processItems();
      findSpeedCards();
      applySpeedLabels();
      window.ipgbHighlight = () => { processItems(); findSpeedCards(); applySpeedLabels(); };
  
    } catch (err) {
      console.error('[IPGB] Fatal error:', err);
    }
  })();
  