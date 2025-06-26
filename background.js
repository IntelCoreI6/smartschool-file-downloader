// background.js
console.log("[BackgroundScript] Script started."); // DEBUG

// Helper to get the correct runtime API (browser or chrome)
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
const downloadsAPI = typeof browser !== 'undefined' ? browser.downloads : chrome.downloads;
const offscreenAPI = typeof browser !== 'undefined' && browser.offscreen ? browser.offscreen : chrome.offscreen;

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Track multiple downloads
const activeDownloads = new Map();
const htmlParsingResolvers = new Map();

// Function to generate unique download ID
function generateDownloadId() {
    return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Function to ensure the offscreen document is active
async function ensureOffscreenDocument() {
    const existingContexts = await runtimeAPI.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existingContexts.length > 0) {
        console.log("[BackgroundScript] Offscreen document already exists.");
        return;
    }
    console.log("[BackgroundScript] Creating offscreen document.");

    if (!offscreenAPI) {
        console.error("[BackgroundScript] Offscreen API is not available in this browser.");
        throw new Error("Offscreen API is not available. Your browser might be outdated or not support this feature.");
    }
    if (!offscreenAPI.Reason || !offscreenAPI.Reason.DOM_PARSER) {
        console.error("[BackgroundScript] Offscreen API Reason DOM_PARSER is not available.");
        // Fallback or specific handling if Reason enums are structured differently or missing
        // This is less likely if offscreenAPI itself is present.
        // As a simple fallback, we might try a string if the enum isn't found, though spec adherence is better.
        // For now, let's assume if offscreenAPI is there, Reason.DOM_PARSER should be too.
        // If this error occurs, it points to a more fundamental incompatibility or API variation.
        throw new Error("Offscreen API Reason DOM_PARSER is not available.");
    }

    await offscreenAPI.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [offscreenAPI.Reason.DOM_PARSER], // Use offscreenAPI.Reason
        justification: 'Parse HTML content from fetched pages',
    });
}

// Listener for messages from the offscreen document and content scripts
runtimeAPI.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[BackgroundScript] onMessage listener triggered. Request received:", request); // DEBUG

    if (request.action === 'parsedHtmlResponse') {
        // This is a response from offscreen.js
        const { downloadId } = request;
        const resolver = htmlParsingResolvers.get(downloadId);
        
        if (resolver) {
            if (request.error) {
                resolver.reject(new Error(request.error));
            } else {
                resolver.resolve({
                    fileLinks: request.fileLinks,
                    folderLinks: request.folderLinks,
                    zipFileName: request.zipFileName,
                    originalUrl: request.originalUrl,
                    pathPrefix: request.pathPrefix
                });
            }
            htmlParsingResolvers.delete(downloadId);
        } else {
            console.warn("[BackgroundScript] Received parsedHtmlResponse but no resolver was waiting for downloadId:", downloadId);
        }
        return true;
    }

    if (request.action === 'progressUpdate') {
        // Progress update from offscreen document - forward to content script and update storage
        const { downloadId, current, total, status } = request;
        console.log("[BackgroundScript] Received progress update from offscreen:", request);
        
        sendProgressUpdate(downloadId, current, total, status);
        return false;
    }

    if (request.action === 'downloadZipFromUrl') {
        console.log(`[BackgroundScript] Received request to download ZIP from URL for downloadId: ${request.downloadId}`);
        
        downloadsAPI.download({
            url: request.url,
            filename: request.filename,
            saveAs: true // Prompt user for save location
        }, (downloadItem) => {
            // The downloadId from the callback is the browser's download ID, not our internal one.
            if (downloadsAPI.lastError) {
                console.error(`[BackgroundScript] Download failed: ${downloadsAPI.lastError.message}`);
                const finalTotal = activeDownloads.get(request.downloadId)?.total || 1;
                sendProgressUpdate(request.downloadId, finalTotal, finalTotal, `Download failed: ${downloadsAPI.lastError.message}`);
            } else {
                console.log(`[BackgroundScript] Download started successfully. Filename: ${request.filename}`);
                 const finalTotal = activeDownloads.get(request.downloadId)?.total || 1;
                sendProgressUpdate(request.downloadId, finalTotal, finalTotal, 'ZIP ready. Download starting...');
            }
            
            // It's crucial to revoke the Object URL to free up memory.
            setTimeout(() => {
                console.log(`[BackgroundScript] Revoking object URL: ${request.url}`);
                URL.revokeObjectURL(request.url);
            }, 1000);
        });
        
        return false; // No async response needed
    }

    if (request.action === "downloadZip") {
        const downloadId = generateDownloadId();
        console.log("Received downloadZip request for URL:", request.startUrl, "with ID:", downloadId);
        
        // Initialize download tracking
        const downloadData = {
            id: downloadId,
            sourceUrl: request.startUrl,
            status: 'Starting...',
            current: 0,
            total: 0,
            phase: 'indexing',
            completed: false
        };
        
        activeDownloads.set(downloadId, downloadData);
        updateDownloadStorage();
        
        processDownloads(request.startUrl, downloadId)
            .then(() => {
                // Mark as completed
                if (activeDownloads.has(downloadId)) {
                    const download = activeDownloads.get(downloadId);
                    download.completed = true;
                    download.status = 'Download completed!';
                    download.phase = 'completed';
                    updateDownloadStorage();
                    
                    // Notify popup
                    notifyDownloadCompleted(downloadId);
                }
                sendResponse({ status: "success", downloadId: downloadId });
            })
            .catch(err => {
                console.error("Error processing downloads:", err);
                
                // Mark as failed
                if (activeDownloads.has(downloadId)) {
                    const download = activeDownloads.get(downloadId);
                    download.completed = true;
                    download.status = 'Error: ' + (err.message || 'Unknown error');
                    download.phase = 'error';
                    updateDownloadStorage();
                }
                  sendResponse({ status: "error", message: err.message || "Unknown error", downloadId: downloadId });
            });
        return true; // Indicates that the response will be sent asynchronously
    }

    if (request.action === 'clearCaches') {
        // Clear background script caches
        console.log('[Background] Clearing background script caches...');
        
        try {
            // Clear download tracking maps
            activeDownloads.clear();
            htmlParsingResolvers.clear();
            
            // Clear pending storage updates
            if (storageUpdateTimer) {
                clearTimeout(storageUpdateTimer);
                storageUpdateTimer = null;
            }
            pendingStorageUpdates.clear();
            
            console.log('[Background] Background script caches cleared successfully');
            sendResponse({ success: true });
        } catch (error) {
            console.error('[Background] Error clearing background caches:', error);
            sendResponse({ success: false, error: error.message });
        }
        
        return true; // Async response
    }

    if (request.action === 'clearOffscreenCaches') {
        // Forward cache clear request to offscreen document
        console.log('[Background] Forwarding cache clear request to offscreen document...');
        
        ensureOffscreenDocument()
            .then(() => {
                return runtimeAPI.sendMessage({ action: 'clearCaches' });
            })
            .then(() => {
                console.log('[Background] Offscreen caches cleared successfully');
                sendResponse({ success: true });
            })
            .catch(error => {
                console.warn('[Background] Error clearing offscreen caches:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true; // Async response
    }
});

// Function to update download storage with optimized throttling and batching
let storageUpdateTimer = null;
let pendingStorageUpdates = new Set();

async function updateDownloadStorage() {
    // More aggressive throttling to prevent excessive writes
    if (storageUpdateTimer) {
        clearTimeout(storageUpdateTimer);
    }
    
    storageUpdateTimer = setTimeout(async () => {
        try {
            const activeDownloadsObj = {};
            activeDownloads.forEach((download, id) => {
                activeDownloadsObj[id] = download;
            });
            await chrome.storage.local.set({ activeDownloads: activeDownloadsObj });
            pendingStorageUpdates.clear();
        } catch (error) {
            console.error("[BackgroundScript] Error updating download storage:", error);
        }
        storageUpdateTimer = null;
    }, 200); // Reduced from 250ms to 200ms for better responsiveness
}

// Function to notify popup of completed download
function notifyDownloadCompleted(downloadId) {
    runtimeAPI.sendMessage({
        action: 'downloadCompleted',
        downloadId: downloadId
    }).catch(err => {
        // Popup might not be open, ignore error
        console.log("[BackgroundScript] Could not notify popup (likely closed):", err.message);
    });
}

// Function to send progress updates to content script and popup with optimized throttling
let lastProgressUpdate = 0;
const PROGRESS_UPDATE_THROTTLE = 100; // Reduced from 150ms to 100ms for better responsiveness

function sendProgressUpdate(downloadId, current, total, status) {
    console.log(`[BackgroundScript] Sending progress update for ${downloadId}: ${current}/${total} - ${status}`);
    
    // More aggressive throttling except for critical updates
    const now = Date.now();
    const isCriticalUpdate = current === 0 || current === total || 
                           status.includes('completed') || status.includes('error') || status.includes('failed');
    const shouldUpdate = isCriticalUpdate || (now - lastProgressUpdate >= PROGRESS_UPDATE_THROTTLE);
    
    // Update active download data
    if (activeDownloads.has(downloadId)) {
        const download = activeDownloads.get(downloadId);
        download.current = current;
        download.total = total;
        download.status = status;
        
        // Optimized phase detection
        if (status.includes('Downloading:')) {
            download.phase = 'downloading';
        } else if (status.includes('Creating ZIP') || status.includes('ZIP')) {
            download.phase = 'zipping';
        } else if (status.includes('completed') || status.includes('ready')) {
            download.phase = 'completed';
            download.completed = true;
        } else if (status.includes('indexing') || status.includes('found')) {
            download.phase = 'indexing';
        }
        
        updateDownloadStorage();
    }
    
    // Only send notifications if not throttled
    if (shouldUpdate) {
        lastProgressUpdate = now;
        
        // Send to content script (for the specific tab that initiated this download)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateProgress',
                    downloadId: downloadId,
                    current: current,
                    total: total,
                    status: status
                }).catch(err => {
                    // Tab might not have content script, ignore
                });
            });
        });
        
        // Send to popup
        runtimeAPI.sendMessage({
            action: 'downloadUpdate',
            downloadId: downloadId,
            current: current,
            total: total,            status: status,
            phase: activeDownloads.get(downloadId)?.phase || 'indexing'
        }).catch(err => {
            // Popup might not be open, ignore error
            console.log("[BackgroundScript] Could not notify popup (likely closed):", err.message);
        });
    }
}

async function processDownloads(startUrl, downloadId) {
    await ensureOffscreenDocument(); // Make sure offscreen document is ready
    const filesToFetch = []; // Stores {url: string, pathInZip: string}
    const foldersToScan = [{ url: startUrl, pathPrefix: "" }]; // Queue of folders
    const visitedFolderUrls = new Set();
    let zipFileName = null; // Store the ZIP filename from the first parsed folder

    // Helper to fetch HTML text (no parsing here)
    async function fetchHtmlText(url) {
        try {
            console.log(`[BackgroundScript] Fetching HTML text from ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const text = await response.text();
            console.log(`[BackgroundScript] Successfully fetched HTML text from ${url}`);
            return text;
        } catch (error) {
            console.error(`[BackgroundScript] Failed to fetch HTML text from ${url}:`, error);
            throw error;
        }
    }    // Helper to parse HTML using the offscreen document
    async function parseHtmlWithOffscreen(htmlString, baseUrl, pathPrefix, containerQuery) {
        await ensureOffscreenDocument(); // Ensure it's still there
        return new Promise((resolve, reject) => {
            htmlParsingResolvers.set(downloadId, { resolve, reject }); // Store resolver with downloadId
            console.log("[BackgroundScript] Sending HTML to offscreen document for parsing. Base URL:", baseUrl);
            runtimeAPI.sendMessage({
                action: 'parseHtml',
                downloadId: downloadId,
                htmlString: htmlString,
                baseUrl: baseUrl, // Pass baseUrl for resolving relative links in offscreen
                pathPrefix: pathPrefix, // Pass pathPrefix for context
                containerQueryDetail: containerQuery // Pass container-based query details
            }).catch(err => {
                console.error("[BackgroundScript] Error sending message to offscreen document:", err);
                htmlParsingResolvers.delete(downloadId); // Clear resolver on error
                reject(err);
            });
        });
    }

    while (foldersToScan.length > 0) {
        const currentFolder = foldersToScan.shift();
        if (visitedFolderUrls.has(currentFolder.url)) {
            continue;
        }
        visitedFolderUrls.add(currentFolder.url);

        // New: Send progress update for the indexing phase
        const totalFolders = visitedFolderUrls.size + foldersToScan.length;
        sendProgressUpdate(
            downloadId, 
            visitedFolderUrls.size, 
            totalFolders, 
            `Indexing... (${visitedFolderUrls.size}/${totalFolders} folders)`
        );

        console.log(`Scanning folder: ${currentFolder.url} (Zip path prefix: ${currentFolder.pathPrefix})`);

        let htmlText;
        try {
            htmlText = await fetchHtmlText(currentFolder.url);
        } catch (error) {
            console.warn(`[BackgroundScript] Skipping folder ${currentFolder.url} due to fetch text error:`, error.message);
            continue; // Skip this folder if it can't be fetched
        }        // NEW CONTAINER-BASED APPROACH: Use the specific container and examine each child
        // Instead of CSS selectors, we'll target the main content container and analyze children
        const containerQueryDetail = {
            containerSelector: '#smscMain > table > tbody > tr:nth-child(3) > td:nth-child(2) > div.smsc_cm_body',
            // The offscreen script will examine each child of this container
        };        try {
            console.log(`[BackgroundScript] Requesting parsing for ${currentFolder.url}`);
            const parsedData = await parseHtmlWithOffscreen(htmlText, currentFolder.url, currentFolder.pathPrefix, containerQueryDetail);console.log(`[BackgroundScript] Received parsed data for ${parsedData.originalUrl}:`, parsedData);

            // Capture ZIP filename from the first folder processed
            if (!zipFileName && parsedData.zipFileName) {
                zipFileName = parsedData.zipFileName;
                console.log(`[BackgroundScript] Captured ZIP filename: ${zipFileName}`);
            }

            // Ensure we are processing data for the correct folder, though current design is sequential
            if (parsedData.originalUrl !== currentFolder.url) {
                console.warn("[BackgroundScript] Mismatched URL in parsed data. Expected:", currentFolder.url, "Got:", parsedData.originalUrl);
                // Potentially skip or handle error if URLs don't match as expected
            }            parsedData.fileLinks.forEach(link => {
                const fileUrl = link.absoluteUrl; // Use absolute URL from offscreen
                let fileName = link.textContent || fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                // Only replace invalid filesystem characters, but preserve dots for file extensions
                // Note: Further filename improvement happens in offscreen.js during ZIP creation
                fileName = fileName.replace(/[<>:"/\\|?*]+/g, '_');
                const pathInZip = parsedData.pathPrefix + fileName; // Use pathPrefix from parsedData
                console.log(`Found file: ${fileName} at ${fileUrl}, Zip path: ${pathInZip}`);
                filesToFetch.push({ url: fileUrl, pathInZip: pathInZip, name: fileName });
            });

            parsedData.folderLinks.forEach(link => {
                const folderUrl = link.absoluteUrl;
                let folderName = link.textContent.replace(/\/$/, "");
                folderName = folderName.replace(/[<>:"/\\|?*]+/g, '_');
                if (folderName && !visitedFolderUrls.has(folderUrl)) {
                    console.log(`Found folder: ${folderName} at ${folderUrl}`);
                    foldersToScan.push({ url: folderUrl, pathPrefix: parsedData.pathPrefix + folderName + "/" });
                }
            });
        } catch (error) {
            console.error(`[BackgroundScript] Error parsing HTML for ${currentFolder.url} via offscreen:`, error);
            console.warn(`[BackgroundScript] Skipping folder ${currentFolder.url} due to parsing error.`);
            continue;
        }
    }    console.log(`[BackgroundScript] Total files to fetch: ${filesToFetch.length}`);
    if (filesToFetch.length === 0) {
        console.warn("No files found to download.");
        sendProgressUpdate(downloadId, 0, 0, "No files found to download");
        return;
    }
    
    // Send indexing complete message
    sendProgressUpdate(downloadId, 0, filesToFetch.length, `Indexing complete - Found ${filesToFetch.length} files`);// Send file URLs to offscreen for ZIP creation and download
    console.log("[BackgroundScript] Sending file URLs to offscreen for ZIP creation and download...");
    await ensureOffscreenDocument();
    
    // Create a proper ZIP filename
    let finalZipFilename = 'smartschool_files.zip'; // Default fallback
    if (zipFileName) {
        // Clean the filename and ensure it has .zip extension
        const cleanName = zipFileName.replace(/[<>:"/\\|?*]+/g, '_');
        finalZipFilename = cleanName.endsWith('.zip') ? cleanName : `${cleanName}.zip`;
        console.log(`[BackgroundScript] Using ZIP filename: ${finalZipFilename}`);
    }
      runtimeAPI.sendMessage({
        action: 'createAndDownloadZip',
        downloadId: downloadId,
        files: filesToFetch,
        filename: finalZipFilename
    }).catch(error => {
        console.error("[BackgroundScript] Error sending files to offscreen:", error);
        sendProgressUpdate(downloadId, 0, 0, "Download failed");
    });
}
