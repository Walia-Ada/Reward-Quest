
document.addEventListener('DOMContentLoaded', () => {
  const buttons = Array.from(document.querySelectorAll('.activity-btn'));
  const activityEl = document.getElementById('activity');
  const container = document.querySelector('.container');           
  const timeInput = document.getElementById('time-input');          
  const startPauseBtn = document.getElementById('start-pause-btn');
  const countdownEl = document.getElementById('countdown');         

 
  function setLoading(isLoading, activeBtn) {
    buttons.forEach((b) => {
      b.disabled = isLoading;
      if (!isLoading) {
       
        const t = b.dataset.type;
        b.textContent = t ? (t.charAt(0).toUpperCase() + t.slice(1)) : b.textContent;
      }
    });
    if (isLoading && activeBtn) activeBtn.textContent = 'Loading...';
  }

  function escapeHTML(str){
    if (!str) return '';
    return str.replace(/[&"'<>]/g, (c) => ({'&':'&amp;','"':'&quot;','\'':'&#39;','<':'&lt;','>':'&gt;'})[c]);
  }

  async function fetchActivityByType(type, activeBtn){
    setLoading(true, activeBtn);
    activityEl.innerHTML = '';

    const base = 'https://bored-api.appbrewery.com';
    const endpoint = type === 'random' ? '/random' : `/filter?type=${encodeURIComponent(type)}`;
    const url = `https://corsproxy.io/?${base}${endpoint}`; 
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      let item = null;
      if (Array.isArray(data)) {
        if (data.length === 0) {
          activityEl.textContent = 'No activities found for this category.';
          return;
        }
        item = data[Math.floor(Math.random() * data.length)];
      } else if (data && typeof data === 'object') {
        item = data;
      }

      if (!item) {
        activityEl.textContent = 'No activity returned.';
        return;
      }

      const activityText = escapeHTML(item.activity || 'No activity text');
      activityEl.innerHTML = `<p class="reward">${activityText}</p>`;
    } catch (err) {
      console.error('Failed to fetch activity', err);
      activityEl.textContent = 'Failed to fetch an activity. Please try again.';
    } finally {
      setLoading(false);
    }
  }

  
  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const type = b.dataset.type || 'random';
      fetchActivityByType(type, b);
    });
  });

  
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const rewardHTML = activityEl ? activityEl.innerHTML : '';

      const header = document.querySelector('h1');
      const desc = document.getElementById('description');
      const buttonsDiv = document.querySelector('.buttons');
      const timerArea = document.getElementById('timer-area');

      if (header) header.textContent = 'Reward Quest';
      if (desc) desc.textContent = 'Set your focus time below.';

      if (buttonsDiv) buttonsDiv.style.display = 'none';
      nextBtn.style.display = 'none';

      
      if (timerArea) timerArea.style.display = '';          

      
  if (container) container.classList.add('focus-ui');   
 

      if (activityEl) {
        activityEl.innerHTML = rewardHTML || '<p class="reward">No reward available.</p>';
      }

      try { setLoading(false); } catch (e) {}
      try { window.scrollTo({ top: activityEl ? activityEl.offsetTop : 0, behavior: 'smooth' }); } catch (e) {}
    });
  }

  
  let timerInterval = null;
  let remainingSeconds = 0;
  let isRunning = false;
  let audioCtx = null;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function parseTimeInput(str) {
    if (!str) return 0;
    str = str.trim();
    const mmss = /^\s*(\d{1,3}):(\d{1,2})\s*$/;
    const mOnly = /^\s*(\d{1,3})\s*$/;
    let match = str.match(mmss);
    if (match) {
      const mm = parseInt(match[1], 10);
      const ss = parseInt(match[2], 10);
      return mm * 60 + Math.min(ss, 59);
    }
    match = str.match(mOnly);
    if (match) return parseInt(match[1], 10) * 60;
    return NaN;
  }

  function updateCountdownDisplay() {
    
    if (timeInput) timeInput.value = formatTime(remainingSeconds);
  }

  function tick() {
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      if (startPauseBtn) startPauseBtn.textContent = 'Start';
      remainingSeconds = 0;
      updateCountdownDisplay();

      try {
        const header = document.querySelector('h1');
        const desc = document.getElementById('description');
        const timerArea = document.getElementById('timer-area');
        const buttonsDiv = document.querySelector('.buttons');
        const controls = document.querySelector('.controls');

        if (header) header.style.display = '';
        if (desc) desc.textContent = "Great job staying on task! Time to treat yourself!";

        if (timerArea) timerArea.style.display = 'none';
        if (buttonsDiv) buttonsDiv.style.display = 'none';
        if (controls) controls.style.display = 'none';

        if (activityEl && !activityEl.innerHTML.trim()) {
          activityEl.innerHTML = '<p class="reward">No reward available.</p>';
        }
      } catch (e) {}

      try { playAlarm(); } catch (e) {}
      if (timeInput) timeInput.disabled = false;
      return;
    }
    remainingSeconds -= 1;
    updateCountdownDisplay();
  }

  function startTimer(seconds) {
    if (isRunning) return;
    remainingSeconds = seconds;
    if (remainingSeconds <= 0) return;
    updateCountdownDisplay();
    timerInterval = setInterval(tick, 1000);
    isRunning = true;
    if (startPauseBtn) startPauseBtn.textContent = 'Pause';
    if (timeInput) timeInput.disabled = true;
  }

  function ensureAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }

  function playAlarm() {
    try {
      ensureAudioContext();
      const ctx = audioCtx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      o.start(now);
      o.stop(now + 1.05);
    } catch (e) {
      console.warn('Alarm playback failed', e);
    }
  }

  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    if (startPauseBtn) startPauseBtn.textContent = 'Start';
    if (timeInput) timeInput.disabled = false;
  }

  if (startPauseBtn) {
    startPauseBtn.addEventListener('click', () => {
      if (!isRunning) {
        const inputVal = timeInput ? timeInput.value : '';
        const parsed = parseTimeInput(inputVal);
        if (Number.isNaN(parsed)) {
          if (timeInput) timeInput.value = '00:00';
          return;
        }
        if (remainingSeconds > 0 && parsed === 0) {
          startTimer(remainingSeconds);  
        } else {
          if (parsed <= 0) return;
          startTimer(parsed);            
        }
      } else {
        pauseTimer();
      }
    });
  }

  
  if (countdownEl) {
    countdownEl.addEventListener('click', () => {
      if (!container.classList.contains('focus-ui')) return;
      if (!timeInput) return;
      timeInput.classList.toggle('hidden');
      if (!timeInput.classList.contains('hidden')) {
        timeInput.focus();
        timeInput.select();
      }
    });
  }

  
  try {
    const initial = parseTimeInput(timeInput ? timeInput.value : '00:00');
    if (!Number.isNaN(initial)) {
      remainingSeconds = initial;
      updateCountdownDisplay();
    }
  } catch (e) { /* ignore */ }
});
