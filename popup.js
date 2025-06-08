// popup.js

// Helper to get the correct runtime API
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

let downloads = new Map();
let updateInterval = null;
let lastUIUpdate = 0;
const UI_UPDATE_THROTTLE = 200; // Minimum 200ms between UI updates

// DOM elements
let downloadsContainer = null;
let noDownloadsElement = null;
let statusSummary = null;
let clearButton = null;
let clearCacheButton = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {    // Get DOM elements
    downloadsContainer = document.getElementById('downloads-container');
    noDownloadsElement = document.getElementById('no-downloads');
    statusSummary = document.getElementById('status-summary');
    clearButton = document.getElementById('clear-completed');
    clearCacheButton = document.getElementById('clear-cache');
    
    // Set up event listeners
    clearButton.addEventListener('click', clearCompletedDownloads);
    clearCacheButton.addEventListener('click', handleClearAllCaches);
    
    // Load existing downloads
    await loadDownloads();
      // Start update interval with adaptive timing
    updateInterval = setInterval(updateDownloads, getOptimalUpdateInterval());
    
    // Listen for messages from background script
    runtimeAPI.onMessage.addListener(handleMessage);
    
    console.log('[Popup] Initialized');
});

// Clean up when popup closes
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Get optimal update interval based on activity
function getOptimalUpdateInterval() {
    const activeDownloads = Array.from(downloads.values()).filter(d => !d.completed);
    
    if (activeDownloads.length === 0) {
        return 2000; // 2 seconds when no active downloads
    } else if (activeDownloads.length <= 2) {
        return 500; // 500ms for 1-2 active downloads
    } else {
        return 1000; // 1 second for many downloads
    }
}

// Load downloads from storage
async function loadDownloads() {
    try {
        const result = await chrome.storage.local.get(['activeDownloads']);
        const activeDownloads = result.activeDownloads || {};
        
        downloads.clear();
        
        // Convert storage format to Map
        for (const [id, downloadData] of Object.entries(activeDownloads)) {
            downloads.set(id, downloadData);
        }
        
        updateUI();
        console.log('[Popup] Loaded downloads:', downloads.size);
    } catch (error) {
        console.error('[Popup] Error loading downloads:', error);
    }
}

// Update downloads from storage
async function updateDownloads() {
    await loadDownloads();
}

// Handle messages from background script
function handleMessage(message, sender, sendResponse) {
    console.log('[Popup] Received message:', message);
    
    if (message.action === 'downloadUpdate') {
        const { downloadId, status, current, total, phase } = message;
        
        if (downloads.has(downloadId)) {
            const download = downloads.get(downloadId);
            download.status = status;
            download.current = current || 0;
            download.total = total || 0;
            download.phase = phase || 'indexing';
            download.lastUpdate = Date.now();
            
            updateDownloadItem(downloadId);
        }
    } else if (message.action === 'downloadCompleted') {
        const { downloadId } = message;
        
        if (downloads.has(downloadId)) {
            const download = downloads.get(downloadId);
            download.status = 'Download completed!';
            download.phase = 'completed';
            download.completed = true;
            download.lastUpdate = Date.now();
            
            updateDownloadItem(downloadId);
            
            // Auto-remove completed downloads after 30 seconds
            setTimeout(() => {
                if (downloads.has(downloadId)) {
                    downloads.delete(downloadId);
                    updateUI();
                }
            }, 30000);
        }
    }
}

// Update the entire UI with throttling and optimizations
function updateUI() {
    const now = Date.now();
    
    // Throttle UI updates for better performance
    if (now - lastUIUpdate < UI_UPDATE_THROTTLE) {
        return;
    }
    lastUIUpdate = now;
    
    const activeCount = Array.from(downloads.values()).filter(d => !d.completed).length;
    const completedCount = Array.from(downloads.values()).filter(d => d.completed).length;
    
    // Update status summary
    if (activeCount === 0 && completedCount === 0) {
        statusSummary.textContent = 'No active downloads';
    } else if (activeCount > 0) {
        statusSummary.textContent = `${activeCount} active download${activeCount === 1 ? '' : 's'}`;
    } else {
        statusSummary.textContent = `${completedCount} completed download${completedCount === 1 ? '' : 's'}`;
    }
    
    // Show/hide no downloads message
    if (downloads.size === 0) {
        noDownloadsElement.style.display = 'block';
        clearButton.style.display = 'none';
    } else {
        noDownloadsElement.style.display = 'none';
        clearButton.style.display = completedCount > 0 ? 'block' : 'none';
    }
    
    // Use document fragment for efficient DOM updates
    const fragment = document.createDocumentFragment();
    const existingItems = downloadsContainer.querySelectorAll('.download-item');
    const existingIds = new Set(Array.from(existingItems).map(item => item.dataset.downloadId));
    
    // Remove items that no longer exist
    existingItems.forEach(item => {
        if (!downloads.has(item.dataset.downloadId)) {
            item.remove();
        }
    });
    
    // Batch DOM operations
    downloads.forEach((download, id) => {
        let itemElement = downloadsContainer.querySelector(`[data-download-id="${id}"]`);
        
        if (!itemElement) {
            itemElement = createDownloadItem(id, download);
            fragment.appendChild(itemElement);
        } else {
            updateDownloadItemContent(itemElement, download);
        }
    });
    
    // Append all new items at once
    if (fragment.children.length > 0) {
        downloadsContainer.appendChild(fragment);
    }
    
    // Adjust update interval based on current activity
    if (updateInterval) {
        const newInterval = getOptimalUpdateInterval();
        const currentInterval = updateInterval._originalDelay || 1000;
        
        if (newInterval !== currentInterval) {
            clearInterval(updateInterval);
            updateInterval = setInterval(updateDownloads, newInterval);
            updateInterval._originalDelay = newInterval;
        }
    }
}

// Create a new download item element
function createDownloadItem(downloadId, download) {
    const item = document.createElement('div');
    item.className = 'download-item';
    item.dataset.downloadId = downloadId;
    
    updateDownloadItemContent(item, download);
    
    return item;
}

// Update download item content
function updateDownloadItemContent(element, download) {
    const phase = download.phase || 'indexing';
    const isCompleted = download.completed || false;
    const percentage = download.total > 0 ? Math.round((download.current / download.total) * 100) : 0;
    
    // Get phase-specific data
    const phaseData = getPhaseData(phase, isCompleted);
    
    // Update element classes
    element.className = `download-item phase-${phase}${isCompleted ? ' completed' : ''}`;
    
    // Get source name from URL
    const sourceName = getSourceName(download.sourceUrl);
    
    // Format time
    const timeAgo = getTimeAgo(download.startTime);
    
    element.innerHTML = `
        <div class="download-header">
            <div class="download-icon ${phaseData.spinning ? 'spinning' : ''}">${phaseData.icon}</div>
            <div class="download-title">${sourceName}</div>
            <div class="download-status">${phaseData.statusText}</div>
        </div>
        
        <div class="download-progress">
            <div class="progress-bar-container">
                <div class="progress-bar-bg ${phase === 'indexing' ? 'infinite' : ''}">
                    <div class="progress-bar-fill" style="width: ${phase === 'indexing' ? '100' : percentage}%"></div>
                </div>
            </div>
            
            <div class="progress-info">
                <div class="progress-text">${getProgressText(download)}</div>
                <div class="progress-percentage">${phase === 'indexing' ? '' : percentage + '%'}</div>
            </div>
        </div>
        
        <div class="download-meta">
            <div class="download-source" title="${download.sourceUrl}">${new URL(download.sourceUrl).hostname}</div>
            <div class="download-time">🕒 ${timeAgo}</div>
        </div>
    `;
}

// Update specific download item
function updateDownloadItem(downloadId) {
    const download = downloads.get(downloadId);
    if (!download) return;
    
    const element = downloadsContainer.querySelector(`[data-download-id="${downloadId}"]`);
    if (element) {
        updateDownloadItemContent(element, download);
    } else {
        updateUI(); // Recreate if not found
    }
}

// Get phase-specific data
function getPhaseData(phase, isCompleted) {
    if (isCompleted) {
        return {
            icon: '✅',
            statusText: 'Completed',
            spinning: false
        };
    }
    
    switch (phase) {
        case 'indexing':
            return {
                icon: '🔍',
                statusText: 'Indexing',
                spinning: true
            };
        case 'downloading':
            return {
                icon: '⬇️',
                statusText: 'Downloading',
                spinning: false
            };
        case 'zipping':
            return {
                icon: '📦',
                statusText: 'Zipping',
                spinning: false
            };
        default:
            return {
                icon: '🔍',
                statusText: 'Processing',
                spinning: true
            };
    }
}

// Get progress text based on download state
function getProgressText(download) {
    const phase = download.phase || 'indexing';
    
    switch (phase) {
        case 'indexing':
            return 'Scanning folders...';
        case 'downloading':
            return `${download.current || 0}/${download.total || 0} files`;
        case 'zipping':
            return 'Creating ZIP archive...';
        default:
            if (download.completed) {
                return 'Download completed!';
            }
            return download.status || 'Processing...';
    }
}

// Get readable source name from URL
function getSourceName(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(part => part);
        
        // Try to get course/folder name from SmartSchool URL
        if (pathParts.includes('Documents')) {
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'Index') {
                return decodeURIComponent(lastPart);
            }
        }
        
        // Fallback to hostname
        return urlObj.hostname;
    } catch (error) {
        return 'SmartSchool Download';
    }
}

// Get time ago string
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) {
        return `${seconds}s ago`;
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else {
        return `${hours}h ago`;
    }
}

// Clear completed downloads
async function clearCompletedDownloads() {
    try {
        // Remove completed downloads from memory
        const activeDownloads = {};
        downloads.forEach((download, id) => {
            if (!download.completed) {
                activeDownloads[id] = download;
            }
        });
        
        // Update storage
        await chrome.storage.local.set({ activeDownloads });
        
        // Reload downloads
        await loadDownloads();
        
        console.log('[Popup] Cleared completed downloads');
    } catch (error) {
        console.error('[Popup] Error clearing completed downloads:', error);
    }
}

// Handle clear all caches button click
async function handleClearAllCaches() {
    const button = clearCacheButton;
    
    // Disable button and show loading state
    button.disabled = true;
    button.textContent = '🧹 Clearing...';
    button.classList.add('clearing');
    
    try {
        console.log('[Popup] Starting comprehensive cache clearing...');
        await clearAllCaches();
        
        // Show success state
        button.textContent = '✅ Caches Cleared!';
        button.classList.remove('clearing');
        
        // Reset button after 3 seconds
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '🧹 Clear All Caches';
        }, 3000);
        
        console.log('[Popup] All caches cleared successfully');
    } catch (error) {
        console.error('[Popup] Error clearing caches:', error);
        
        // Show error state
        button.textContent = '❌ Error occurred';
        button.classList.remove('clearing');
        
        // Reset button after 3 seconds
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '🧹 Clear All Caches';
        }, 3000);
    }
}

// Comprehensive cache clearing function
async function clearAllCaches() {
    const cacheOperations = [];
    
    // 1. Clear Chrome extension storage
    console.log('[Popup] Clearing Chrome extension storage...');
    cacheOperations.push(
        chrome.storage.local.clear().catch(err => console.warn('[Popup] Storage clear error:', err))
    );
    
    // 2. Clear content script caches via message to all tabs
    console.log('[Popup] Clearing content script caches...');
    cacheOperations.push(clearContentScriptCaches());
    
    // 3. Clear background script caches
    console.log('[Popup] Clearing background script caches...');
    cacheOperations.push(clearBackgroundCaches());
    
    // 4. Clear offscreen document caches
    console.log('[Popup] Clearing offscreen document caches...');
    cacheOperations.push(clearOffscreenCaches());
    
    // 5. Clear browser caches (HTTP cache, DNS cache)
    console.log('[Popup] Clearing browser caches...');
    cacheOperations.push(clearBrowserCaches());
    
    // 6. Clear local popup state
    console.log('[Popup] Clearing popup state...');
    downloads.clear();
    
    // Wait for all cache clearing operations to complete
    await Promise.allSettled(cacheOperations);
    
    // Force reload downloads after clearing
    await loadDownloads();
}

// Clear content script caches across all tabs
async function clearContentScriptCaches() {
    try {
        // Get all tabs with SmartSchool URLs
        const tabs = await chrome.tabs.query({
            url: [
                "*://*.smartschool.be/*",
                "*://smartschool.*/*"
            ]
        });
        
        // Send cache clear message to each tab
        const promises = tabs.map(tab => 
            chrome.tabs.sendMessage(tab.id, { 
                action: 'clearCaches' 
            }).catch(err => {
                // Ignore errors for tabs that don't have content script
                console.warn(`[Popup] Content script not found in tab ${tab.id}:`, err.message);
            })
        );
        
        await Promise.allSettled(promises);
        console.log(`[Popup] Sent cache clear message to ${tabs.length} SmartSchool tabs`);
    } catch (error) {
        console.warn('[Popup] Error clearing content script caches:', error);
    }
}

// Clear background script caches
async function clearBackgroundCaches() {
    try {
        await runtimeAPI.sendMessage({ 
            action: 'clearCaches' 
        });
        console.log('[Popup] Background script caches cleared');
    } catch (error) {
        console.warn('[Popup] Error clearing background caches:', error);
    }
}

// Clear offscreen document caches
async function clearOffscreenCaches() {
    try {
        await runtimeAPI.sendMessage({ 
            action: 'clearOffscreenCaches' 
        });
        console.log('[Popup] Offscreen document caches cleared');
    } catch (error) {
        console.warn('[Popup] Error clearing offscreen caches:', error);
    }
}

// Clear browser-level caches
async function clearBrowserCaches() {
    try {
        // Clear browsing data (requires "browsingData" permission)
        if (chrome.browsingData) {
            const clearOptions = {
                since: Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
            };
            
            await Promise.allSettled([
                // Clear HTTP cache
                chrome.browsingData.removeCache(clearOptions),
                // Clear local storage for SmartSchool domains
                chrome.browsingData.removeLocalStorage({
                    origins: [
                        "https://smartschool.be",
                        "https://leerkrachten.smartschool.be",
                        "https://leerlingen.smartschool.be",
                        "https://ouders.smartschool.be"
                    ]
                }),
                // Clear cookies for SmartSchool domains
                chrome.browsingData.removeCookies({
                    origins: [
                        "https://smartschool.be",
                        "https://leerkrachten.smartschool.be", 
                        "https://leerlingen.smartschool.be",
                        "https://ouders.smartschool.be"
                    ]
                })
            ]);
            
            console.log('[Popup] Browser caches cleared');
        } else {
            console.warn('[Popup] browsingData API not available');
        }
    } catch (error) {
        console.warn('[Popup] Error clearing browser caches:', error);
    }
}
