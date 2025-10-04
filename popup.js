// Popup script for AI Environmental Impact Tracker

const AI_PLATFORMS = {
  'chatgpt.com': { name: 'ChatGPT', icon: '🤖' },
  'claude.ai': { name: 'Claude', icon: '🧠' },
  'gemini.google.com': { name: 'Gemini', icon: '♊' },
  'chat.deepseek.com': { name: 'DeepSeek', icon: '🔍' },
  'www.copilot.com': { name: 'Copilot', icon: '👨‍💻' },
  'grok.com': { name: 'Grok', icon: '🚀' },
  'poe.com': { name: 'Poe', icon: '💭' },
  'perplexity.ai': { name: 'Perplexity', icon: '🔎' },
  'character.ai': { name: 'Character.AI', icon: '🎭' },
  'huggingface.co': { name: 'Hugging Face', icon: '🤗' },
  'replicate.com': { name: 'Replicate', icon: '🔄' }
};

class PopupUI {
  constructor() {
    this.stats = null;
    this.isTracking = true;
    console.log('PopupUI initializing...');
    this.init();
  }

  async init() {
    try {
      console.log('Loading stats...');
      await this.loadStats();
      console.log('Stats loaded:', this.stats);
      
      // Wait for DOM to be fully ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      this.render();
      this.bindEvents();
      
      // Refresh every 3 seconds
      setInterval(() => {
        this.loadStats().then(() => this.render()).catch(err => {
          console.error('Error updating stats:', err);
        });
      }, 3000);
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError(error.message);
    }
  }

  async loadStats() {
    return new Promise((resolve, reject) => {
      // Try direct storage access first
      chrome.storage.local.get(['dailyStats', 'history'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        console.log('Raw storage data:', result);

        if (result.dailyStats) {
          this.stats = result.dailyStats;
          this.isTracking = this.stats.isTracking !== false;
          console.log('Stats loaded from storage:', this.stats);
        } else {
          // Initialize default stats
          this.stats = this.getDefaultStats();
          console.log('Using default stats');
        }
        
        resolve();
      });
    });
  }

  getDefaultStats() {
    return {
      requests: 0,
      totalTime: 0,
      energyUsed: 0,
      co2Footprint: 0,
      sites: {},
      hourlyData: Array(24).fill(0),
      isTracking: true,
      lastReset: Date.now()
    };
  }

  render() {
    console.log('Rendering with stats:', this.stats);
    
    // Check if elements exist before accessing them
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    
    if (!loading || !content) {
      console.error('Required DOM elements not found');
      return;
    }
    
    loading.style.display = 'none';
    content.style.display = 'block';

    // Update tracking status
    this.updateTrackingStatus();

    // Update request count
    const requestCount = this.stats.requests || 0;
    const requestCountEl = document.getElementById('requestCount');
    if (requestCountEl) requestCountEl.textContent = requestCount;

    // Update average response time
    const avgTime = requestCount > 0 
      ? Math.round(this.stats.totalTime / requestCount)
      : 0;
    const avgTimeEl = document.getElementById('avgResponseTime');
    if (avgTimeEl) avgTimeEl.textContent = avgTime;

    // Update energy consumption (convert from kWh to Wh)
    const energyWh = ((this.stats.energyUsed || 0) * 1000).toFixed(2);
    const energyValueEl = document.getElementById('energyValue');
    if (energyValueEl) energyValueEl.textContent = energyWh;
    
    // Energy progress bar (max at 100 Wh for visualization)
    const energyPercent = Math.min((parseFloat(energyWh) / 100) * 100, 100);
    const energyProgressEl = document.getElementById('energyProgress');
    if (energyProgressEl) energyProgressEl.style.width = `${energyPercent}%`;

    // Update carbon footprint
    const carbonGrams = (this.stats.co2Footprint || 0).toFixed(1);
    const carbonValueEl = document.getElementById('carbonValue');
    if (carbonValueEl) carbonValueEl.textContent = carbonGrams;
    
    const carbonComparisonEl = document.getElementById('carbonComparison');
    if (carbonComparisonEl) {
      carbonComparisonEl.innerHTML = this.getCarbonComparison(parseFloat(carbonGrams));
    }

    // Update website breakdown
    this.renderWebsiteBreakdown();
  }

  updateTrackingStatus() {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleTracking');

    if (!indicator || !statusText || !toggleBtn) {
      console.warn('Tracking status elements not found');
      return;
    }

    if (this.isTracking) {
      indicator.classList.remove('paused');
      statusText.textContent = 'Tracking Active';
      toggleBtn.textContent = 'Pause Tracking';
    } else {
      indicator.classList.add('paused');
      statusText.textContent = 'Tracking Paused';
      toggleBtn.textContent = 'Resume Tracking';
    }
  }

  getCarbonComparison(carbonGrams) {
    const PHONE_CHARGE_CO2 = 8.8; // grams of CO2 per phone charge
    const KM_DRIVING_CO2 = 120; // grams of CO2 per km of car driving

    if (carbonGrams < 1) {
      return `Minimal impact - keep it up! 🌱`;
    }

    if (carbonGrams < PHONE_CHARGE_CO2) {
      return `Less than <strong>1 phone charge</strong>`;
    }

    const phoneCharges = Math.round(carbonGrams / PHONE_CHARGE_CO2);
    
    if (phoneCharges < 10) {
      return `Equivalent to charging a phone <strong>${phoneCharges} time${phoneCharges > 1 ? 's' : ''}</strong>`;
    } else if (phoneCharges < 100) {
      return `Equivalent to <strong>${phoneCharges} phone charges</strong>`;
    } else {
      const kmDriving = (carbonGrams / KM_DRIVING_CO2).toFixed(1);
      return `Equivalent to <strong>${kmDriving} km</strong> of car driving`;
    }
  }

  renderWebsiteBreakdown() {
    const container = document.getElementById('websiteBreakdown');
    if (!container) {
      console.warn('Website breakdown container not found');
      return;
    }
    
    const sites = this.stats.sites || {};
    
    console.log('Rendering sites:', sites);
    
    if (Object.keys(sites).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>No AI platforms used yet</p>
          <p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">Visit an AI website to start tracking</p>
        </div>
      `;
      return;
    }

    // Sort sites by request count
    const sortedSites = Object.entries(sites)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5); // Top 5

    container.innerHTML = '';

    sortedSites.forEach(([domain, siteStats]) => {
      const platform = AI_PLATFORMS[domain] || { name: domain, icon: '🔗' };
      const energyWh = ((siteStats.energy || 0) * 1000).toFixed(2);
      const avgTime = siteStats.count > 0 ? Math.round(siteStats.totalTime / siteStats.count) : 0;

      const item = document.createElement('div');
      item.className = 'website-item';
      item.innerHTML = `
        <div class="website-name">
          <span>${platform.icon}</span>
          <span>${platform.name}</span>
        </div>
        <div class="website-stats">
          <div><strong>${siteStats.count}</strong> requests</div>
          <div style="font-size: 10px; opacity: 0.8;">${energyWh} Wh · ${avgTime}ms avg</div>
        </div>
      `;

      container.appendChild(item);
    });
  }

  bindEvents() {
    console.log('Binding events...');
    
    // Toggle tracking button
    const toggleBtn = document.getElementById('toggleTracking');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        console.log('Toggle button clicked');
        
        chrome.storage.local.get('dailyStats', (result) => {
          const stats = result.dailyStats || this.getDefaultStats();
          stats.isTracking = !stats.isTracking;
          
          chrome.storage.local.set({ dailyStats: stats }, () => {
            console.log('Tracking toggled:', stats.isTracking);
            this.isTracking = stats.isTracking;
            this.updateTrackingStatus();
            
            // Show feedback
            toggleBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
              toggleBtn.style.transform = 'scale(1)';
            }, 100);
          });
        });
      });
    } else {
      console.warn('Toggle button not found');
    }

    // Reset stats button
    const resetBtn = document.getElementById('resetStats');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        console.log('Reset button clicked');
        
        if (confirm('Are you sure you want to reset all statistics?\n\nThis will clear:\n• All request data\n• Energy usage\n• Carbon footprint\n• Platform breakdown\n• History\n\nThis action cannot be undone.')) {
          const newStats = this.getDefaultStats();
          
          chrome.storage.local.set({ 
            dailyStats: newStats,
            history: []
          }, () => {
            console.log('Stats reset');
            this.stats = newStats;
            this.render();
            
            // Show feedback
            const originalText = resetBtn.textContent;
            resetBtn.textContent = '✓ Statistics Reset!';
            resetBtn.style.background = 'rgba(76, 175, 80, 0.3)';
            resetBtn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
            
            setTimeout(() => {
              resetBtn.textContent = originalText;
              resetBtn.style.background = '';
              resetBtn.style.borderColor = '';
            }, 2000);
          });
        }
      });
    } else {
      console.warn('Reset button not found');
    }

    console.log('Events bound successfully');
  }

  showError(message) {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Failed to load statistics</p>
          <p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">${message || 'Please try again'}</p>
        </div>
      `;
    }
  }
}

// Initialize popup - WAIT FOR DOM TO BE FULLY READY
console.log('Popup script loaded');

function initializePopup() {
  console.log('DOM ready, initializing PopupUI');
  try {
    new PopupUI();
  } catch (error) {
    console.error('Failed to create PopupUI:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM already loaded
  initializePopup();
}
