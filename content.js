// content.js

// Helper to get the correct runtime API (browser or chrome)
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

// Performance optimization: Cache DOM queries and reuse elements
const domCache = new Map();
const selectorCache = new Map();

// Optimized DOM query function with caching
function cachedQuerySelector(selector) {
    if (selectorCache.has(selector)) {
        return selectorCache.get(selector);
    }
    const element = document.querySelector(selector);
    if (element && selectorCache.size < 50) { // Limit cache size
        selectorCache.set(selector, element);
    }
    return element;
}

// Optimized element creation with performance hints
function createOptimizedElement(tagName, attributes = {}) {
    const element = document.createElement(tagName);
    
    // Batch apply attributes for better performance
    if (attributes.id) element.id = attributes.id;
    if (attributes.className) element.className = attributes.className;
    if (attributes.textContent) element.textContent = attributes.textContent;
    if (attributes.innerHTML) element.innerHTML = attributes.innerHTML;
    if (attributes.cssText) element.style.cssText = attributes.cssText;
    
    return element;
}

function createDownloadButton() {
    // Use document fragment for efficient DOM operations
    const fragment = document.createDocumentFragment();
    
    // Create container row for the button with optimized creation
    const container = createOptimizedElement('tr', {
        id: 'smartschoolZipContainer'
    });

    // Create a single cell that spans the full width
    const cell = createOptimizedElement('td', {
        cssText: `
            padding: 5px 10px;
            text-align: center;
            border: none;
            will-change: transform; /* Optimization hint for animations */
        `
    });
    cell.colSpan = 10; // Set after creation for better performance

    // Create the button with performance optimizations
    const button = createOptimizedElement('button', {
        id: 'smartschoolZipButton',
        textContent: 'Download All as ZIP'
    });    button.style.cssText = `
        padding: 6px 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: normal;
        display: inline-block;
        transition: background-color 0.3s ease;
        min-width: 140px;
        height: 28px;
        will-change: background-color; /* Performance hint for transitions */
        transform: translateZ(0); /* Force hardware acceleration */
    `;

    // Optimized hover effects with passive event listeners
    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#45a049';
    }, { passive: true });
    
    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#4CAF50';
    }, { passive: true });    // Create multi-phase progress display (initially hidden) with optimized structure
    const statusDisplay = createOptimizedElement('div', {
        id: 'smartschoolStatus',
        className: 'progress-container',
        cssText: 'display: none; will-change: opacity, transform;'
    });
    
    // Create phase indicator
    const phaseIndicator = createOptimizedElement('div', {
        className: 'phase-indicator'
    });
    
    // Create phase icon
    const phaseIcon = createOptimizedElement('div', {
        className: 'phase-icon',
        innerHTML: '🔍' // Default indexing icon
    });
    
    // Create phase text
    const phaseText = createOptimizedElement('div', {
        className: 'phase-text',
        textContent: 'Indexing files...'
    });
    
    // Create progress bar container
    const progressBarContainer = createOptimizedElement('div', {
        className: 'progress-bar-container'
    });
    
    // Create progress bar background
    const progressBarBg = createOptimizedElement('div', {
        className: 'progress-bar-bg'
    });
    
    // Create progress bar fill
    const progressBarFill = createOptimizedElement('div', {
        className: 'progress-bar-fill',
        cssText: 'will-change: width; transform: translateZ(0);' // Performance hints
    });
    
    // Create progress text
    const progressText = createOptimizedElement('div', {
        className: 'progress-text',
        textContent: ''
    });
    
    // Assemble the progress display using document fragment
    const progressFragment = document.createDocumentFragment();
    phaseIndicator.appendChild(phaseIcon);
    phaseIndicator.appendChild(phaseText);
    progressBarBg.appendChild(progressBarFill);
    progressBarContainer.appendChild(progressBarBg);
    
    progressFragment.appendChild(phaseIndicator);
    progressFragment.appendChild(progressBarContainer);
    progressFragment.appendChild(progressText);
    statusDisplay.appendChild(progressFragment);    // Add elements to cell using fragment for better performance
    const cellFragment = document.createDocumentFragment();
    cellFragment.appendChild(button);
    cellFragment.appendChild(statusDisplay);
    cell.appendChild(cellFragment);
    container.appendChild(cell);

    // State management for download process
    let downloadInProgress = false;
    let hideStatusTimeout = null;
    let downloadTimeoutId = null;
    let currentDownloadId = null;
    
    // Performance optimization: Throttle progress updates to prevent excessive reflows
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THROTTLE = 16; // ~60fps for smooth animations
    
    // Cached elements for better performance
    const cachedElements = {
        button,
        statusDisplay,
        phaseIcon,
        phaseText,
        progressBarBg,
        progressBarFill,
        progressText
    };    // Function to update progress/status with multi-phase support and performance optimizations
    window.updateDownloadProgress = (downloadId, current, total, status) => {
        // Only update if this is for our current download
        if (currentDownloadId && downloadId !== currentDownloadId) {
            return;
        }
        
        // Throttle updates for better performance (except critical updates)
        const now = performance.now();
        const isCriticalUpdate = status === 'Download completed!' || current === 0 || current === total;
        if (!isCriticalUpdate && (now - lastProgressUpdate) < PROGRESS_UPDATE_THROTTLE) {
            return;
        }
        lastProgressUpdate = now;
        
        console.log(`[ContentScript] Progress update received for ${downloadId}: ${current}/${total} - ${status}`);
        
        // Clear any pending hide timeout since we have an active update
        if (hideStatusTimeout) {
            clearTimeout(hideStatusTimeout);
            hideStatusTimeout = null;
        }
        
        // Clear download timeout since we received an update
        if (downloadTimeoutId) {
            clearTimeout(downloadTimeoutId);
            downloadTimeoutId = null;
        }
        
        // Determine phase based on status message
        let currentPhase = 'indexing';
        let phaseClass = 'phase-indexing';
        let icon = '🔍';
        let displayStatus = status;
        
        if (status.includes('Downloading:') || status.includes('downloading')) {
            currentPhase = 'downloading';
            phaseClass = 'phase-downloading';
            icon = '⬇️';
        } else if (status.includes('Generating ZIP') || status.includes('zip')) {
            currentPhase = 'zipping';
            phaseClass = 'phase-zipping';
            icon = '📦';
        } else if (status === 'Download completed!') {
            currentPhase = 'completed';
            phaseClass = 'phase-completed';
            icon = '✅';
            displayStatus = 'Download completed!';
        } else if (status.includes('Starting') || status.includes('indexing') || status.includes('files found')) {
            currentPhase = 'indexing';
            phaseClass = 'phase-indexing';
            icon = '🔍';
        }
        
        // Batch DOM updates for better performance
        const { statusDisplay, phaseIcon, phaseText, progressBarBg, progressBarFill, progressText } = cachedElements;
        
        // Update phase indicator
        statusDisplay.className = `progress-container ${phaseClass}`;
        phaseIcon.innerHTML = icon;
        phaseText.textContent = displayStatus;
          // Handle different phase logic
        if (status === 'Download completed!') {
            downloadInProgress = false;
            currentDownloadId = null;
            
            // Show completion state
            progressBarBg.className = 'progress-bar-bg completed';
            progressBarFill.style.width = '100%';
            progressText.textContent = 'Complete!';
            
            // Add bounce animation
            statusDisplay.classList.add('bounce-in');
            
            // Schedule hiding after completion
            hideStatusTimeout = setTimeout(() => {
                hideStatus();
                hideStatusTimeout = null;
            }, 4000);
        } else if (currentPhase === 'indexing') {
            // Indexing phase - show infinite loading
            downloadInProgress = true;
            progressBarBg.className = 'progress-bar-bg infinite';
            progressBarFill.style.width = '100%';
            progressText.textContent = 'Scanning folders...';
            
            // Set fallback timeout
            downloadTimeoutId = setTimeout(() => {
                console.warn("[ContentScript] Download timeout - no progress updates received");
                window.updateDownloadProgress(currentDownloadId, total || 1, total || 1, 'Download completed!');
            }, 30000);
        } else if (currentPhase === 'downloading' || currentPhase === 'zipping') {
            // Download/Zip phase - show actual progress
            downloadInProgress = true;
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            
            progressBarBg.className = `progress-bar-bg ${currentPhase}`;
            progressBarFill.style.width = `${percentage}%`;
            progressText.textContent = `${current}/${total} (${percentage}%)`;
            
            // Set fallback timeout
            downloadTimeoutId = setTimeout(() => {
                console.warn("[ContentScript] Download timeout - no progress updates received");
                window.updateDownloadProgress(currentDownloadId, total, total, 'Download completed!');
            }, 30000);
        }
        
        // Ensure status display is visible only if download is in progress or just completed
        if ((downloadInProgress || status === 'Download completed!') && statusDisplay.style.display === 'none') {
            showStatus();
        }
    };

    // Function to show status display
    const showStatus = () => {
        if (!downloadInProgress && hideStatusTimeout) {
            return; // Don't show if we're in the process of hiding after completion
        }
        button.style.display = 'none';
        statusDisplay.style.display = 'inline-block';
    };    // Function to hide status display and show button
    const hideStatus = () => {
        downloadInProgress = false;
        currentDownloadId = null;
        if (hideStatusTimeout) {
            clearTimeout(hideStatusTimeout);
            hideStatusTimeout = null;
        }
        if (downloadTimeoutId) {
            clearTimeout(downloadTimeoutId);
            downloadTimeoutId = null;
        }
        
        // Reset progress display
        statusDisplay.className = 'progress-container';
        statusDisplay.classList.remove('bounce-in');
        progressBarBg.className = 'progress-bar-bg';
        progressBarFill.style.width = '0%';
        progressText.textContent = '';
        phaseIcon.innerHTML = '🔍';
        phaseText.textContent = 'Indexing files...';
        
        button.style.display = 'inline-block';
        statusDisplay.style.display = 'none';
    };button.onclick = async () => {
        // Prevent multiple simultaneous downloads
        if (downloadInProgress) {
            console.log("[ContentScript] Download already in progress, ignoring click");
            return;
        }        downloadInProgress = true;
        showStatus();
        window.updateDownloadProgress(null, 0, 0, 'Starting indexing...');
        
        try {
            const startUrl = window.location.href;
            console.log("[ContentScript] Sending 'downloadZip' message to background script for URL:", startUrl);
            
            runtimeAPI.sendMessage({
                action: "downloadZip",
                startUrl: startUrl
            }, (response) => {
                if (runtimeAPI.lastError) {
                    console.error("[ContentScript] Error sending message:", runtimeAPI.lastError.message);
                    alert("Error initiating download: " + runtimeAPI.lastError.message);
                    hideStatus();
                    return;
                }                console.log("[ContentScript] Received response from background script:", response);
                if (response && response.status === "success") {
                    // Store the download ID for this page's download
                    currentDownloadId = response.downloadId;
                    console.log("[ContentScript] Download request successful with ID:", currentDownloadId, ", waiting for progress updates...");
                } else if (response && response.status === "error") {
                    alert("Error: " + response.message);
                    hideStatus();
                } else {
                    alert("No response or unexpected response from background script.");
                    hideStatus();
                }
            });
        } catch (error) {
            console.error("[ContentScript] Error in onclick handler:", error);
            alert("An error occurred: " + error.message);
            hideStatus();
        }    };
    
    // Listen for progress updates from background script
    runtimeAPI.onMessage.addListener((request, sender, sendResponse) => {
        console.log(`[ContentScript] Received message:`, request);
          if (request.action === 'updateProgress') {
            window.updateDownloadProgress(request.downloadId, request.current, request.total, request.status);
            sendResponse({ received: true }); // Acknowledge the message
            return true; // Keep the message channel open for async response
        } else if (request.action === 'clearCaches') {
            // Clear content script caches
            console.log('[ContentScript] Clearing content script caches...');
            
            try {
                // Clear DOM query caches
                domCache.clear();
                selectorCache.clear();
                
                console.log('[ContentScript] Content script caches cleared successfully');
                sendResponse({ success: true });
            } catch (error) {
                console.error('[ContentScript] Error clearing content script caches:', error);
                sendResponse({ success: false, error: error.message });
            }
            
            return true; // Async response
        }
        
        return false; // No async response needed for other messages
    });
    
    // Optimized target detection and DOM insertion
    const insertionTargets = [
        '#smscMain > table > tbody',
        '#smscMain table tbody',
        '.smsc_cm_content table tbody',
        'table tbody'
    ];
    
    let targetElement = null;
    for (const selector of insertionTargets) {
        targetElement = cachedQuerySelector(selector);
        if (targetElement) break;
    }
    
    if (targetElement) {
        // Use RAF for smoother DOM insertion
        requestAnimationFrame(() => {
            targetElement.insertBefore(container, targetElement.firstChild);
        });
    } else {
        console.warn("[ContentScript] Target element not found, falling back to body append");
        // Fallback with RAF for performance
        requestAnimationFrame(() => {
            document.body.appendChild(container);
        });
    }
}

// Optimized initialization with better performance
function initializeExtension() {
    // Add DNS prefetching for common SmartSchool domains
    const prefetchDomains = [
        'leerkrachten.smartschool.be',
        'leerlingen.smartschool.be', 
        'ouders.smartschool.be'
    ];
    
    prefetchDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `//${domain}`;
        document.head.appendChild(link);
    });
    
    createDownloadButton();
}

// Ensure the DOM is ready before trying to add the button with performance optimization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtension, { once: true, passive: true });
} else {
    // Use RAF for smoother initialization
    requestAnimationFrame(initializeExtension);
}
