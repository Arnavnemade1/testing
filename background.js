// background.js (MV3 service worker)

const AI_PLATFORMS = {
  'chatgpt.com': { name: 'ChatGPT', baseEnergy: 0.0006 },
  'claude.ai': { name: 'Claude', baseEnergy: 0.0005 },
  'gemini.google.com': { name: 'Gemini', baseEnergy: 0.0004 },
  'chat.deepseek.com': { name: 'DeepSeek', baseEnergy: 0.0003 },
  'www.copilot.com': { name: 'Copilot', baseEnergy: 0.0005 },
  'grok.com': { name: 'Grok', baseEnergy: 0.0005 },
  'poe.com': { name: 'Poe', baseEnergy: 0.0004 },
  'perplexity.ai': { name: 'Perplexity', baseEnergy: 0.0004 },
  'character.ai': { name: 'Character.AI', baseEnergy: 0.0003 },
  'huggingface.co': { name: 'Hugging Face', baseEnergy: 0.0003 },
  'replicate.com': { name: 'Replicate', baseEnergy: 0.0004 }
};

const requestTimings = new Map();
const INITIAL_STATS = {
  requests: 0,
  totalTime: 0,
  energyUsed: 0,
  co2Footprint: 0,
  sites: {},
  hourlyData: Array(24).fill(0),
  isTracking: true
};

// --- Helpers ---
function isAIPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (AI_PLATFORMS[hostname]) return hostname;
    const aiPatterns = [/chat\./i, /ai\./i, /gpt/i, /llm/i, /assistant/i, /bot\./i, /claude/i, /gemini/i, /copilot/i];
    return aiPatterns.some(p => p.test(hostname)) ? hostname : null;
  } catch { return null; }
}

function calculateEnergy(responseTime, site, statusCode) {
  const platform = AI_PLATFORMS[site];
  const baseEnergy = platform ? platform.baseEnergy : 0.0003;
  const timeMultiplier = Math.log(responseTime / 1000 + 1) / Math.log(10) + 1;
  const statusMultiplier = statusCode >= 200 && statusCode < 300 ? 1.0 : 0.3;
  return baseEnergy * timeMultiplier * statusMultiplier;
}

function getNextMidnight() {
  const now = new Date();
  now.setHours(24, 0, 0, 0);
  return now.getTime();
}

// --- Event Listeners ---
// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dailyStats: INITIAL_STATS, history: [] });
  chrome.alarms.create('dailyReset', { when: getNextMidnight(), periodInMinutes: 1440 });
});

// Track requests
chrome.webRequest.onBeforeRequest.addListener(
  details => {
    chrome.storage.local.get('dailyStats', result => {
      if (result.dailyStats && !result.dailyStats.isTracking) return;
      const site = isAIPlatform(details.url);
      if (site && ['xmlhttprequest', 'fetch'].includes(details.type)) {
        requestTimings.set(details.requestId, { startTime: Date.now(), site, url: details.url });
      }
    });
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  details => {
    const timing = requestTimings.get(details.requestId);
    if (!timing) return;

    const responseTime = Date.now() - timing.startTime;
    const energy = calculateEnergy(responseTime, timing.site, details.statusCode);

    chrome.storage.local.get('dailyStats', result => {
      const stats = result.dailyStats || { ...INITIAL_STATS };
      stats.requests++;
      stats.totalTime += responseTime;
      stats.energyUsed += energy;
      stats.co2Footprint += energy * 0.475 * 1000;

      if (!stats.sites[timing.site]) stats.sites[timing.site] = { count: 0, totalTime: 0, energy: 0, lastUsed: Date.now() };
      const siteStats = stats.sites[timing.site];
      siteStats.count++;
      siteStats.totalTime += responseTime;
      siteStats.energy += energy;
      siteStats.lastUsed = Date.now();

      stats.hourlyData[new Date().getHours()]++;

      chrome.storage.local.set({ dailyStats: stats });
    });

    requestTimings.delete(details.requestId);
  },
  { urls: ["<all_urls>"] }
);

// Daily reset
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== 'dailyReset') return;
    chrome.storage.local.get(['dailyStats', 'history'], result => {
      const history = result.history || [];
      const currentStats = result.dailyStats || { ...INITIAL_STATS };
      history.push({ date: new Date().toISOString(), stats: JSON.parse(JSON.stringify(currentStats)) });
      chrome.storage.local.set({
        history: history.slice(-30),
        dailyStats: { ...INITIAL_STATS, isTracking: currentStats.isTracking }
      });
    });
  });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPlatformInfo') sendResponse({ platform: AI_PLATFORMS[request.site] });
  return true;
});
