(function() {
  'use strict';
  
  const AI_INDICATORS = [
    'ai', 'chat', 'gpt', 'assistant', 'bot', 'llm',
    'conversation', 'prompt', 'model', 'neural', 'claude',
    'gemini', 'copilot', 'deepseek', 'grok', 'perplexity'
  ];
  
  function detectAIInterface() {
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    const title = document.title.toLowerCase();
    const url = window.location.hostname.toLowerCase();
    
    let score = 0;
    
    AI_INDICATORS.forEach(indicator => {
      if (body.includes(indicator)) score++;
      if (title.includes(indicator)) score += 2;
      if (url.includes(indicator)) score += 3;
    });
    
    return score >= 3;
  }
  
  function injectIndicator() {
    if (document.getElementById('enviro-track-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'enviro-track-indicator';
    indicator.innerHTML = `
      <style>
        #enviro-track-indicator {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
          backdrop-filter: blur(10px);
          color: white;
          padding: 12px 20px;
          border-radius: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          font-weight: 500;
          z-index: 999999;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        #enviro-track-indicator:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        }
        
        .enviro-pulse {
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
          position: relative;
          animation: enviro-pulse-animation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .enviro-pulse::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: #00ff88;
          border-radius: 50%;
          animation: enviro-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes enviro-pulse-animation {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        
        @keyframes enviro-pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        .enviro-text {
          letter-spacing: 0.3px;
        }
      </style>
      <div class="enviro-pulse"></div>
      <span class="enviro-text">Enviro Track Active</span>
    `;
    
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });
    
    if (document.body) {
      document.body.appendChild(indicator);
    }
  }
  
  function initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (detectAIInterface()) {
          setTimeout(injectIndicator, 1000);
        }
      });
    } else {
      if (detectAIInterface()) {
        setTimeout(injectIndicator, 1000);
      }
    }
  }
  
  initialize();
  
  const observer = new MutationObserver((mutations) => {
    if (detectAIInterface() && !document.getElementById('enviro-track-indicator')) {
      injectIndicator();
    }
  });
  
  if (document.body) {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: false,
          characterData: false
        });
        bodyObserver.disconnect();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }
})();
