// offscreen.js
// This script will run in the offscreen document
console.log("[Offscreen] Script started."); // DEBUG

// Pre-compiled regular expressions for maximum performance
const FILE_EXTENSION_REGEX = /\.[a-zA-Z0-9]{1,5}$/;
const FILENAME_STAR_REGEX = /filename\*=(?:UTF-8'')?([^;]+)/i;
const FILENAME_REGEX = /filename=["']?([^;"']+)["']?/i;
const EXTENSION_VALIDATION_REGEX = /^[a-zA-Z0-9]+$/;
const QUICK_HTML_CHECK_REGEX = /<!DOCTYPE|<html|<body|<head/i; // Optimized HTML detection

// Helper function caches and performance optimizations with improved efficiency
const extensionCache = new Map();
const urlCache = new Map();
const domQueryCache = new Map();

// Optimized cache management
const CACHE_MAX_SIZE = 400; // Reduced from 500 for better memory efficiency
const CACHE_CLEANUP_INTERVAL = 45000; // Increased from 30 seconds to 45 seconds

// More efficient cache cleanup - only when needed
setInterval(() => {
  // Only clear if caches are actually getting large
  if (extensionCache.size > CACHE_MAX_SIZE * 0.8) {
    const entries = Array.from(extensionCache.entries());
    extensionCache.clear();
    // Keep the most recent 60% of entries
    entries.slice(-Math.floor(CACHE_MAX_SIZE * 0.6)).forEach(([key, value]) => {
      extensionCache.set(key, value);
    });
    console.log('[Offscreen] Optimized extension cache');
  }
  
  if (urlCache.size > CACHE_MAX_SIZE * 0.8) {
    const entries = Array.from(urlCache.entries());
    urlCache.clear();
    entries.slice(-Math.floor(CACHE_MAX_SIZE * 0.6)).forEach(([key, value]) => {
      urlCache.set(key, value);
    });
    console.log('[Offscreen] Optimized URL cache');
  }
  
  if (domQueryCache.size > CACHE_MAX_SIZE * 0.8) {
    domQueryCache.clear();
    console.log('[Offscreen] Cleared DOM query cache');
  }
}, CACHE_CLEANUP_INTERVAL);

// Clear all caches when offscreen document is about to be destroyed
window.addEventListener('beforeunload', () => {
  extensionCache.clear();
  urlCache.clear();
  domQueryCache.clear();
  console.log('[Offscreen] Cleared all caches on unload');
});

// String processing optimization caches for repeated operations
const lowerCaseCache = new Map(); // Cache for toLowerCase() operations  
const fileSystemCleanCache = new Map(); // Cache for filename sanitization
const pathJoinCache = new Map(); // Cache for path joining operations

// Enhanced filename cleaning function to handle all extension and suffix issues
function cleanAndFixFilename(filename, mimeType = null, isHtmlFile = false) {
  if (!filename || typeof filename !== 'string') {
    return 'unknown_file';
  }
  
  let cleanName = filename.trim();
  
  // Remove .download suffix if it exists
  if (cleanName.endsWith('.download')) {
    cleanName = cleanName.replace(/\.download$/, '');
  }
  
  // Priority 1: If this is marked as an HTML file, ensure it has .html extension
  if (isHtmlFile) {
    if (!cleanName.toLowerCase().endsWith('.html') && !cleanName.toLowerCase().endsWith('.htm')) {
      // Remove any existing extension and add .html
      cleanName = cleanName.replace(/\.[^.]*$/, '') + '.html';
    }
    return cleanName;
  }
  
  // Priority 2: If we have a MIME type that indicates HTML, treat as HTML
  if (mimeType && (mimeType.includes('text/html') || mimeType.includes('application/xhtml'))) {
    if (!cleanName.toLowerCase().endsWith('.html') && !cleanName.toLowerCase().endsWith('.htm')) {
      cleanName = cleanName.replace(/\.[^.]*$/, '') + '.html';
    }
    return cleanName;
  }
  
  // Priority 3: If still no extension and we have a MIME type, add it
  if (!hasFileExtension(cleanName) && mimeType) {
    const extension = getExtensionFromMimeType(mimeType);
    if (extension) {
      cleanName = cleanName + '.' + extension;
    } else {
      cleanName = cleanName + '.file';
    }
  }
  
  // Priority 4: If still no extension, add a generic one
  if (!hasFileExtension(cleanName)) {
    cleanName = cleanName + '.file';
  }
  
  return cleanName;
}

// Optimized MIME type mapping with most common types first
const MIME_TO_EXTENSION = new Map([
  ['text/html', 'html'],
  ['application/xhtml+xml', 'html'],
  ['text/html; charset=utf-8', 'html'],
  ['application/pdf', 'pdf'],
  ['text/plain', 'txt'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['application/json', 'json'],
  ['text/css', 'css'],
  ['text/javascript', 'js'],
  ['application/javascript', 'js'],
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['application/vnd.ms-powerpoint', 'ppt'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'],
  ['image/gif', 'gif'],
  ['image/svg+xml', 'svg'],
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['video/mp4', 'mp4'],
  ['video/avi', 'avi'],
  ['application/zip', 'zip'],
  ['application/x-rar-compressed', 'rar'],
  ['application/x-7z-compressed', '7z']
]);

// Optimized string processing functions with caching
function cachedToLowerCase(str) {
  if (!str) return '';
  if (lowerCaseCache.has(str)) {
    return lowerCaseCache.get(str);
  }
  
  const result = str.toLowerCase();
  if (lowerCaseCache.size < CACHE_MAX_SIZE) {
    lowerCaseCache.set(str, result);
  }
  return result;
}

function cleanFilesystemPath(path) {
  if (!path) return '';
  if (fileSystemCleanCache.has(path)) {
    return fileSystemCleanCache.get(path);
  }
  
  const result = path.replace(/[<>:"/\\|?*]+/g, '_');
  if (fileSystemCleanCache.size < CACHE_MAX_SIZE) {
    fileSystemCleanCache.set(path, result);
  }
  return result;
}

function cachedPathJoin(parts) {
  const key = parts.join('|');
  if (pathJoinCache.has(key)) {
    return pathJoinCache.get(key);
  }
  
  const result = parts.filter(p => p).join('/');
  if (pathJoinCache.size < CACHE_MAX_SIZE) {
    pathJoinCache.set(key, result);
  }
  return result;
}

// Optimized helper function to check if a filename has a proper file extension
function hasFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return false;
  
  // Check cache first
  if (extensionCache.has(filename)) {
    return extensionCache.get(filename);
  }
  
  // Use pre-compiled regex for better performance
  const result = FILE_EXTENSION_REGEX.test(filename);
  
  // Cache result (with size limit enforcement)
  if (extensionCache.size < CACHE_MAX_SIZE) {
    extensionCache.set(filename, result);
  } else if (extensionCache.size >= CACHE_MAX_SIZE) {
    // Clear half the cache when full
    const entries = Array.from(extensionCache.entries());
    extensionCache.clear();
    // Keep the most recent half
    entries.slice(-Math.floor(CACHE_MAX_SIZE / 2)).forEach(([key, value]) => {
      extensionCache.set(key, value);
    });
    extensionCache.set(filename, result);
  }
  
  return result;
}

// Helper function to extract filename from URL
function getFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Check cache first
  if (urlCache.has(url)) {
    return urlCache.get(url);
  }
  
  try {
    const urlObj = new URL(url);
    
    // First, try URL parameters
    const filenameParam = urlObj.searchParams.get('filename') || 
                         urlObj.searchParams.get('file') || 
                         urlObj.searchParams.get('name');
    
    if (filenameParam) {
      const result = decodeURIComponent(filenameParam);
      // Cache with size management
      if (urlCache.size < CACHE_MAX_SIZE) {
        urlCache.set(url, result);
      }
      return result;
    }
    
    // Then try the pathname
    const pathname = urlObj.pathname;
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    
    // If the last segment looks like a filename (has extension), use it
    if (lastSegment && hasFileExtension(lastSegment)) {
      const result = decodeURIComponent(lastSegment);
      // Cache with size management
      if (urlCache.size < CACHE_MAX_SIZE) {
        urlCache.set(url, result);
      }
      return result;
    }
    
    // Cache negative result
    if (urlCache.size < CACHE_MAX_SIZE) {
      urlCache.set(url, null);
    }
    return null;
  } catch (e) {
    console.warn('[Offscreen] Error parsing URL for filename:', e);
    // Cache negative result
    if (urlCache.size < CACHE_MAX_SIZE) {
      urlCache.set(url, null);
    }
    return null;
  }
}

// Helper function to extract filename from Content-Disposition header
function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return null;
  
  // Look for filename*= (RFC 6266) first, then filename=
  const filenameStarMatch = contentDisposition.match(FILENAME_STAR_REGEX);
  if (filenameStarMatch) {
    try {
      return decodeURIComponent(filenameStarMatch[1]);
    } catch (e) {
      console.warn('[Offscreen] Error decoding filename* parameter:', e);
    }
  }
  
  // Fallback to regular filename parameter
  const filenameMatch = contentDisposition.match(FILENAME_REGEX);
  if (filenameMatch) {
    return filenameMatch[1];
  }
  
  return null;
}

// Helper function to get file extension from MIME type using optimized Map lookup
function getExtensionFromMimeType(mimeType) {
  if (!mimeType) return null;
  
  // Use optimized Map lookup for better performance
  const cleanMimeType = mimeType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXTENSION.get(cleanMimeType) || null;
}

// Helper function to extract file extension from URL path
function getFileExtensionFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    
    // Extract extension if present
    if (lastSegment && lastSegment.includes('.')) {
      const parts = lastSegment.split('.');
      const extension = parts[parts.length - 1].toLowerCase();
      
      // Validate it's a reasonable file extension (1-5 characters)
      if (extension.length >= 1 && extension.length <= 5 && EXTENSION_VALIDATION_REGEX.test(extension)) {
        return extension;
      }
    }
    
    return null;
  } catch (e) {
    console.warn('[Offscreen] Error extracting extension from URL:', e);
    return null;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Offscreen] Message received:", request); // DEBUG

  if (request.action === 'parseHtml') {
    console.log("[Offscreen] Action 'parseHtml' received. HTML string length:", request.htmlString ? request.htmlString.length : 'undefined'); // DEBUG
    console.log("[Offscreen] Base URL received:", request.baseUrl); // DEBUG
    console.log("[Offscreen] File query detail:", request.fileQueryDetail, "Folder query detail:", request.folderQueryDetail); // DEBUG
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(request.htmlString, 'text/html');
      const rawFileElements = doc.querySelectorAll(request.fileQueryDetail.selector);
      const rawFolderElements = doc.querySelectorAll(request.folderQueryDetail.selector);
      
      console.log(`[Offscreen] Found ${rawFileElements.length} raw file elements using selector: '${request.fileQueryDetail.selector}'.`); // DEBUG
      console.log(`[Offscreen] Found ${rawFolderElements.length} raw folder elements using selector: '${request.folderQueryDetail.selector}'.`); // DEBUG
      
      // Special handling for HTML files without explicit download buttons
      // Look for file containers that have HTML file info but no download links
      const htmlFileContainers = doc.querySelectorAll('div[id^="docID_"]');
      const additionalHtmlFiles = [];
      
      // Pre-cache DOM queries for better performance
      const baseUrl = new URL(request.baseUrl);
      const pathParts = baseUrl.pathname.split('/');
      const courseIdIndex = pathParts.indexOf('courseID');
      const ssIdIndex = pathParts.indexOf('ssID');
      
      // Only process HTML files if we can construct URLs
      if (courseIdIndex !== -1 && ssIdIndex !== -1) {
        const courseId = pathParts[courseIdIndex + 1];
        const ssId = pathParts[ssIdIndex + 1];
        
        htmlFileContainers.forEach(container => {
          const docId = container.id.replace('docID_', '');
          
          // Optimized HTML file detection with cached queries
          let isHtmlFile = false;
          
          // Check fileinfo first (fastest)
          const fileInfo = container.querySelector('.fileinfo, .file-info');
          if (fileInfo) {
            const fileInfoText = cachedToLowerCase(fileInfo.textContent);
            isHtmlFile = fileInfoText.includes('html') || fileInfoText.includes('htm');
          }
          
          // Only check preview block if fileInfo check failed (performance optimization)
          if (!isHtmlFile) {
            const previewBlock = container.querySelector('.smsc_cm_body_row_block_inline');
            if (previewBlock) {
              const previewContent = previewBlock.innerHTML;
              // Use faster regex check instead of multiple includes()
              isHtmlFile = QUICK_HTML_CHECK_REGEX.test(previewContent);
            }
          }
            if (isHtmlFile) {
            // Check for existing download link (both href and onclick patterns)
            const existingDownloadLink = container.querySelector('a[href*="/Documents/Download/"]');
            const jsDownloadLink = container.querySelector('a[onclick*="/Documents/Download/"]');
            
            let downloadUrl = null;
            let fileName = 'file.html';
            
            // Extract filename from the container
            const nameElement = container.querySelector('.name a.smsc_cm_link');
            if (nameElement) {
              let extractedName = nameElement.textContent.trim();
              if (extractedName && !cachedToLowerCase(extractedName).endsWith('.html')) {
                extractedName += '.html';
              }
              if (extractedName) {
                fileName = extractedName;
              }
            }
            
            if (existingDownloadLink) {
              // Use existing href download link
              downloadUrl = existingDownloadLink.getAttribute('href');
              if (!downloadUrl.startsWith('http')) {
                downloadUrl = baseUrl.origin + downloadUrl;
              }
              console.log(`[Offscreen] Found HTML file with direct download link: ${fileName} -> ${downloadUrl}`);
            } else if (jsDownloadLink) {
              // Extract download URL from onclick JavaScript
              const onclickAttr = jsDownloadLink.getAttribute('onclick');
              const urlMatch = onclickAttr.match(/window\.open\("([^"]*)"/) || onclickAttr.match(/window\.open\('([^']*)'/);
              if (urlMatch && urlMatch[1]) {
                downloadUrl = urlMatch[1];
                if (!downloadUrl.startsWith('http')) {
                  downloadUrl = baseUrl.origin + downloadUrl;
                }
                console.log(`[Offscreen] Found HTML file with JavaScript download: ${fileName} -> ${downloadUrl}`);
              }
            }
            
            if (!downloadUrl) {
              // Construct the download URL for HTML files without any download mechanism
              try {
                // Try multiple URL patterns for SmartSchool HTML files
                const urlPatterns = [
                  `${baseUrl.origin}/Documents/Download/Index/htm/1/courseID/${courseId}/docID/${docId}/ssID/${ssId}`,
                  `${baseUrl.origin}/Documents/Download/courseID/${courseId}/docID/${docId}/ssID/${ssId}`,
                  `${baseUrl.origin}/Documents/Download/Index/html/1/courseID/${courseId}/docID/${docId}/ssID/${ssId}`,
                  `${baseUrl.origin}/Documents/Download/${docId}/courseID/${courseId}/ssID/${ssId}`
                ];
                
                // Try the first URL pattern (most common)
                downloadUrl = urlPatterns[0];
                console.log(`[Offscreen] Constructed HTML download URL for file without download mechanism: ${fileName} -> ${downloadUrl}`);
                
                additionalHtmlFiles.push({
                  href: downloadUrl,
                  textContent: fileName,
                  absoluteUrl: downloadUrl,
                  isHtmlFile: true, // Mark as HTML file for special processing
                  alternativeUrls: urlPatterns.slice(1) // Store alternative URLs to try if first fails
                });
              } catch (error) {
                console.warn(`[Offscreen] Error constructing HTML download URL for docID ${docId}:`, error);
              }
            } else {
              // Add HTML file with existing download mechanism
              additionalHtmlFiles.push({
                href: downloadUrl,
                textContent: fileName,
                absoluteUrl: downloadUrl,
                isHtmlFile: true // Mark as HTML file for special processing
              });
            }
          }
        });
      }
      
      console.log(`[Offscreen] Found ${additionalHtmlFiles.length} additional HTML files without download buttons`); // DEBUG
      
      const fileLinks = Array.from(rawFileElements).map(link => {
        const href = link.getAttribute('href');
        let name = link.title || 'downloaded_file';
        
        // Enhanced file name extraction logic
        // Try to get the file name from various sources in order of preference
        
        // 1. Try to get name from the traditional SmartSchool structure
        const parentDivName = link.closest('div.name');
        if (parentDivName) {
            const nameLink = parentDivName.querySelector('a.smsc_cm_link.smsc-download__link');
            if (nameLink) {
                // Clone the link to manipulate it without affecting the DOM
                const clonedLink = nameLink.cloneNode(true);
                // Remove any nested download buttons to get just the filename text
                const nestedDownloadLinks = clonedLink.querySelectorAll('a.js-download-link, .download-link');
                nestedDownloadLinks.forEach(nestedLink => nestedLink.remove());
                // Get the clean text content
                const cleanName = clonedLink.textContent?.trim();
                if (cleanName) {
                    name = cleanName;
                }
            }
        }
        
        // 2. If we still don't have a good name, try the link's text content
        if (!name || name === 'downloaded_file') {
            const linkText = link.textContent?.trim();
            if (linkText && linkText.length > 0 && linkText.length < 200) { // Reasonable filename length
                name = linkText;
            }
        }
        
        // 3. If we still don't have a good name, try to extract from the URL
        if (!name || name === 'downloaded_file') {
            const urlParts = href.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            if (lastPart && hasFileExtension(lastPart)) {
                name = decodeURIComponent(lastPart);
            } else {
                // Try to get filename from URL parameters
                try {
                    const url = new URL(href, request.baseUrl);
                    const filename = url.searchParams.get('filename') || url.searchParams.get('file');
                    if (filename) {
                        name = decodeURIComponent(filename);
                    }
                } catch (e) {
                    console.warn("[Offscreen] Error parsing URL for filename:", e);
                }
            }
        }
        
        // 4. If we still don't have a name, generate one from the URL
        if (!name || name === 'downloaded_file') {
            const urlParts = href.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            
            // If URL ends with an extension, use it
            if (lastPart && hasFileExtension(lastPart)) {
                name = decodeURIComponent(lastPart);
            } else {
                // Generate a name from the URL path
                name = 'file_' + Math.random().toString(36).substr(2, 8);
                console.warn(`[Offscreen] Generated filename for ${href}: ${name}`);
            }
        }
        
        console.log(`[Offscreen] Processed file: ${name} (href: ${href})`);
        
        // Filter out non-file links (breadcrumbs, navigation, etc.)
        const isLikelyFile = href.includes('/Documents/Download/') ||
                           href.includes('download') ||
                           href.includes('attachment') ||
                           href.includes('file');
                           
        if (!isLikelyFile) {
            console.log(`[Offscreen] Skipping non-file link: ${name} (${href})`);
            return null;
        }
        
        console.log(`[Offscreen] Found potential file: ${name} (${href})`);
        
        return {
            href: href,
            textContent: name,
            absoluteUrl: new URL(href, request.baseUrl).href
        };
      }).filter(fileLink => fileLink !== null); // Remove null entries (breadcrumbs, navigation, etc.)

      // Deduplicate files by absoluteUrl to avoid downloading the same file twice
      const uniqueFileLinks = [];
      const seenUrls = new Set();
      
      // Add regular file links
      for (const fileLink of fileLinks) {
        if (!seenUrls.has(fileLink.absoluteUrl)) {
          seenUrls.add(fileLink.absoluteUrl);
          uniqueFileLinks.push(fileLink);
        } else {
          console.log(`[Offscreen] Duplicate file URL detected and skipped: ${fileLink.absoluteUrl}`);
        }
      }
      
      // Add additional HTML files
      for (const htmlFile of additionalHtmlFiles) {
        if (!seenUrls.has(htmlFile.absoluteUrl)) {
          seenUrls.add(htmlFile.absoluteUrl);
          uniqueFileLinks.push(htmlFile);
        } else {
          console.log(`[Offscreen] Duplicate HTML file URL detected and skipped: ${htmlFile.absoluteUrl}`);
        }
      }

      const folderLinks = Array.from(rawFolderElements).map(link => ({
        href: link.getAttribute('href'),
        textContent: link.textContent.trim(),
        absoluteUrl: new URL(link.getAttribute('href'), request.baseUrl).href
      }));

      // Extract title for ZIP filename from topnav
      let zipFileName = null;
      const titleElement = doc.querySelector('#smscTopContainer > nav > h1');
      if (titleElement) {
        zipFileName = titleElement.textContent.trim();
        console.log(`[Offscreen] Found title for ZIP filename: ${zipFileName}`);
      } else {
        // Fallback to breadcrumb if title not found
        const breadcrumbElement = doc.querySelector('.smsc_cm_breadcrumb') || 
                                 doc.querySelector('#smscMain > table > tbody > tr:nth-child(2) > td:nth-child(2) > div.smsc_cm_breadcrumb');
        if (breadcrumbElement) {
          const breadcrumbLinks = breadcrumbElement.querySelectorAll('a');
          if (breadcrumbLinks.length > 0) {
            const lastBreadcrumb = breadcrumbLinks[breadcrumbLinks.length - 1];
            zipFileName = lastBreadcrumb.textContent.trim();
            console.log(`[Offscreen] Fallback: Found breadcrumb name for ZIP: ${zipFileName}`);
          }
        }
      }

      console.log("[Offscreen] Original fileLinks count:", fileLinks.length);
      console.log("[Offscreen] Deduplicated fileLinks count:", uniqueFileLinks.length);
      console.log("[Offscreen] Parsed folderLinks:", folderLinks); // DEBUG

      // This sends a NEW message to background.js, not a reply to 'parseHtml'
      chrome.runtime.sendMessage({
        action: 'parsedHtmlResponse',
        downloadId: request.downloadId,
        fileLinks: uniqueFileLinks, // Use deduplicated list
        folderLinks: folderLinks,
        zipFileName: zipFileName, // Use title from h1 element or fallback to breadcrumb
        originalUrl: request.baseUrl,
        pathPrefix: request.pathPrefix
      });
    } catch (e) {
      console.error('[Offscreen] Error parsing HTML:', e); // DEBUG
      
      // This also sends a NEW message
      chrome.runtime.sendMessage({
        action: 'parsedHtmlResponse',
        downloadId: request.downloadId,
        error: e.toString(),
        zipFileName: null, // No title found due to error
        originalUrl: request.baseUrl, 
        pathPrefix: request.pathPrefix
      });
    }
    // 'parseHtml' does not use sendResponse, so it should not return true.
    // Returning false or undefined is appropriate.
    return false;  } else if (request.action === 'createAndDownloadZip') {
    console.log("[Offscreen] Received request to create and download ZIP with", request.files.length, "files");
    
    // Handle ZIP creation and download in offscreen (no response needed since it's async)
    createAndDownloadZip(request.files, request.filename, request.downloadId);
    
    // Return false since we're not using sendResponse
    return false;
  } else if (request.action === 'clearCaches') {
    // Clear offscreen document caches
    console.log('[Offscreen] Clearing offscreen document caches...');
    
    try {
      // Clear all offscreen caches
      extensionCache.clear();
      urlCache.clear();
      domQueryCache.clear();
      lowerCaseCache.clear();
      fileSystemCleanCache.clear();
      pathJoinCache.clear();
      requestCache.clear();
      pendingRequests.clear();
      
      console.log('[Offscreen] Offscreen document caches cleared successfully');
      console.log('[Offscreen] Cleared caches:', {
        extensionCache: 'cleared',
        urlCache: 'cleared', 
        domQueryCache: 'cleared',
        lowerCaseCache: 'cleared',
        fileSystemCleanCache: 'cleared',
        pathJoinCache: 'cleared',
        requestCache: 'cleared',
        pendingRequests: 'cleared'
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Offscreen] Error clearing offscreen caches:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Async response
  }
  // Default for unhandled actions or synchronous actions not using sendResponse.
  return false; 
});

// ULTRA-OPTIMIZED ZIP creation function with Web Workers and streaming
async function createAndDownloadZip(files, filename, downloadId) {
  let streamingZip = null;
    try {
    console.log("[Offscreen] Starting ultra-fast ZIP creation with", files.length, "files");
    
    // Initialize session tracking
    const sessionStats = {
      startTime: performance.now(),
      totalFiles: files.length,
      successCount: 0,
      errorCount: 0,
      totalDownloadTime: 0,
      totalDownloadSize: 0,
      largestFile: { name: '', size: 0 },
      smallestFile: { name: '', size: Infinity },
      timeouts: 0,
      retries: 0
    };
    
    // Ultra-aggressive progress throttling for maximum performance
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE = 100; // Reduced to 100ms for better responsiveness
    
    function sendProgressUpdate(current, total, status) {
      const now = Date.now();
      if (now - lastProgressUpdate >= PROGRESS_THROTTLE || current === 0 || current === total) {
        lastProgressUpdate = now;
        chrome.runtime.sendMessage({
          action: 'progressUpdate',
          downloadId: downloadId,
          current: current,
          total: total,
          status: status
        });
      }
    }
    
    // Try Web Worker approach first for maximum performance
    streamingZip = new StreamingZipCreator(downloadId, filename);
    if (streamingZip.worker) {
      console.log("[Offscreen] Using Web Worker for ultra-fast ZIP creation");
      
      // Pre-process files and start downloading immediately
      sendProgressUpdate(0, files.length, 'Initializing ultra-fast processing...');
        let completedFiles = 0;
      const downloadPromises = files.map(async (file, index) => {
        const startTime = performance.now();        try {
          // Use enhanced download function with comprehensive logging
          const downloadResult = await downloadFileWithTimeout(file);
            if (downloadResult.success && downloadResult.blob && downloadResult.blob.size > 0) {
            // Update session statistics
            sessionStats.successCount++;
            sessionStats.totalDownloadTime += downloadResult.downloadTime;
            sessionStats.totalDownloadSize += downloadResult.actualSize;
            
            if (downloadResult.actualSize > sessionStats.largestFile.size) {
              sessionStats.largestFile = { name: file.name, size: downloadResult.actualSize };
            }
            if (downloadResult.actualSize < sessionStats.smallestFile.size) {
              sessionStats.smallestFile = { name: file.name, size: downloadResult.actualSize };
            }            // Optimize filename - ensure proper extension is preserved
            let finalFilename = cleanAndFixFilename(file.name, downloadResult.mimeType, file.isHtmlFile);
            if (file.isHtmlFile && !finalFilename.toLowerCase().endsWith('.html')) {
              finalFilename = finalFilename.replace(/\.[^.]*$/, '') + '.html';
            }
            
            // Add to streaming ZIP only if blob is valid
            await streamingZip.addFile(file.pathInZip || finalFilename, downloadResult.blob);
            
            completedFiles++;
            sendProgressUpdate(completedFiles, files.length, 
              `Downloaded: ${finalFilename} (${completedFiles}/${files.length})`);
          } else {
            throw new Error(downloadResult.error || 'Download failed or returned empty file');
          }
        } catch (error) {
          console.error(`[Offscreen] ❌ Error downloading ${file.name}:`, error);
          console.error(`[Offscreen] 📋 Error context:`, {
            url: file.url.substring(0, 100) + '...',
            estimatedSize: `${(file.estimatedSize / 1024 / 1024).toFixed(2)}MB`,
            isHtml: file.isHtmlFile,
            duration: `${((performance.now() - startTime) / 1000).toFixed(1)}s`
          });
            // Try alternative approaches for failed downloads
          let retrySuccessful = false;
          sessionStats.errorCount++;
          
          // If this is an HTML file with alternative URLs, try them
          if (file.isHtmlFile && file.alternativeUrls && file.alternativeUrls.length > 0) {
            for (const altUrl of file.alternativeUrls) {
              try {
                console.log(`[Offscreen] 🔄 Retrying with alternative URL: ${altUrl}`);
                
                // Create a copy of the file object with the alternative URL
                const altFile = { ...file, url: altUrl };
                const retryTimeout = Math.min(performanceTracker.getOptimalTimeout(true, file.estimatedSize) * 0.5, 600000); // 50% of optimal or max 10min
                
                const retryResult = await downloadFileWithTimeout(altFile, { timeout: retryTimeout });                if (retryResult.success && retryResult.blob && retryResult.blob.size > 0) {
                  let finalFilename = cleanAndFixFilename(file.name, retryResult.mimeType, file.isHtmlFile);
                  if (!finalFilename.toLowerCase().endsWith('.html')) {
                    finalFilename = finalFilename.replace(/\.[^.]*$/, '') + '.html';
                  }
                  
                  await streamingZip.addFile(file.pathInZip || finalFilename, retryResult.blob);
                  retrySuccessful = true;
                  sessionStats.successCount++;
                  sessionStats.retries++;
                  console.log(`[Offscreen] ✅ Successfully downloaded ${file.name} using alternative URL`);
                  break;
                }
              } catch (retryError) {
                console.warn(`[Offscreen] Alternative URL also failed for ${file.name}:`, retryError);
                continue;
              }
            }
          }
            // If no retry worked, create an error file
          if (!retrySuccessful) {
            try {
              const errorMessage = `Failed to download ${file.name}
Error: ${error.message || 'Unknown error'}
File Type: ${file.isHtmlFile ? 'HTML' : 'Regular'}
URL: ${file.url}
Estimated Size: ${(file.estimatedSize / 1024 / 1024).toFixed(2)}MB
Timestamp: ${new Date().toISOString()}`;
              
              await streamingZip.addFile(
                (file.pathInZip || file.name) + ".error.txt", 
                new Blob([errorMessage], { type: 'text/plain' })
              );
            } catch (errorFileError) {
              console.error(`[Offscreen] Could not even create error file for ${file.name}:`, errorFileError);
            }
          }
          
          completedFiles++;
          sendProgressUpdate(completedFiles, files.length, 
            retrySuccessful 
              ? `Downloaded: ${file.name} (retry) (${completedFiles}/${files.length})`
              : `Error: ${file.name} (${completedFiles}/${files.length})`);
        }
      });
      
      // Wait for all downloads to complete
      await Promise.all(downloadPromises);
      
      // Generate and download ZIP using Web Worker
      streamingZip.totalFiles = files.length;
      await streamingZip.generateZip();
      
      return; // Exit early if Web Worker approach succeeds
    }
    
    // Fallback to optimized main thread approach
    console.log("[Offscreen] Using main thread with advanced optimizations");
    
    // Send initial progress update for indexing phase
    sendProgressUpdate(0, files.length, 'Starting indexing...');
    
    const zip = new JSZip();
    
    // Pre-process file information with optimized operations and memory estimation
    const processedFiles = files.map(file => {
      const pathParts = file.pathInZip.split('/');
      const originalFilename = pathParts.pop();
      const folderPath = pathParts.length > 0 ? cachedPathJoin(pathParts) + '/' : '';      // Enhanced file size estimation based on URL patterns and file types
      let estimatedSize = 1000000; // Default 1MB estimate (increased from 500KB)
      let sizeCategory = 'default';
      const lowerUrl = file.url.toLowerCase();
      const lowerName = originalFilename.toLowerCase();
      
      // Image files
      if (lowerUrl.includes('image') || lowerName.includes('.jpg') || lowerName.includes('.jpeg') || 
          lowerName.includes('.png') || lowerName.includes('.gif') || lowerName.includes('.svg')) {
        estimatedSize = 3000000; // 3MB for images
        sizeCategory = 'image';
      } 
      // Video files - much larger
      else if (lowerUrl.includes('video') || lowerName.includes('.mp4') || lowerName.includes('.avi') || 
               lowerName.includes('.mov') || lowerName.includes('.wmv') || lowerName.includes('.flv')) {
        estimatedSize = 50000000; // 50MB for videos
        sizeCategory = 'video';
      }
      // PowerPoint files - can be very large (up to 287MB observed)
      else if (lowerName.includes('.ppt') || lowerName.includes('.pptx')) {
        estimatedSize = 300000000; // 300MB estimate for PowerPoint files (conservative for 287MB max observed)
        sizeCategory = 'powerpoint';
      } 
      // PDF documents
      else if (lowerName.includes('.pdf')) {
        estimatedSize = 5000000; // 5MB for PDFs
        sizeCategory = 'pdf';
      } 
      // Word documents
      else if (lowerName.includes('.doc') || lowerName.includes('.docx')) {
        estimatedSize = 2000000; // 2MB for Word docs
        sizeCategory = 'word';
      } 
      // Excel files
      else if (lowerName.includes('.xls') || lowerName.includes('.xlsx')) {
        estimatedSize = 3000000; // 3MB for Excel files
        sizeCategory = 'excel';
      } 
      // Archive files
      else if (lowerName.includes('.zip') || lowerName.includes('.rar') || lowerName.includes('.7z')) {
        estimatedSize = 20000000; // 20MB for archives
        sizeCategory = 'archive';
      }
      // HTML files (can be large with embedded content)
      else if (lowerName.includes('.html') || lowerName.includes('.htm') || file.isHtmlFile) {
        estimatedSize = 5000000; // 5MB for HTML files
        sizeCategory = 'html';
      }
        // Enhanced logging for file size estimation
      console.log(`[Offscreen] 📏 File size estimated: ${originalFilename}`, {
        category: sizeCategory,
        estimatedSize: `${(estimatedSize / 1024 / 1024).toFixed(2)}MB`,
        url: file.url.substring(0, 80) + (file.url.length > 80 ? '...' : ''),
        isHtml: file.isHtmlFile || false
      });
      
      return {
        ...file,
        originalFilename,
        folderPath,
        hasExtension: hasFileExtension(originalFilename),
        isHtmlFile: file.isHtmlFile || false,
        alternativeUrls: file.alternativeUrls || [],
        estimatedSize: Math.max(100000, estimatedSize), // Ensure minimum 100KB estimate
        sizeCategory
      };
    });
      // Send indexing complete message
    sendProgressUpdate(0, files.length, `Found ${files.length} files to download`);
      // Enhanced logging for total file analysis
    const totalEstimatedSize = files.reduce((sum, file) => {
      const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
      return sum + fileSize;
    }, 0);
    const categoryCounts = files.reduce((counts, file) => {
      counts[file.sizeCategory] = (counts[file.sizeCategory] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`[Offscreen] 📊 Download summary prepared:`, {
      totalFiles: files.length,
      totalEstimatedSize: `${(totalEstimatedSize / 1024 / 1024).toFixed(2)}MB`,
      categoryCounts,
      connectionQuality: performanceTracker.connectionQuality.toFixed(2),
      networkType: performanceTracker.networkType
    });
    
    // Minimal delay for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 200ms
    
    // Optimized batch processing with intelligent sizing and performance prediction
    let currentBatchSize = 3; // Start with conservative size
    const performanceMetrics = {
      avgDownloadTime: 1000, // Track average download time per file
      connectionQuality: 1.0  // Track connection quality (1.0 = excellent, 0.5 = poor)
    };
      for (let i = 0; i < processedFiles.length; i += currentBatchSize) {
      const batchStartTime = performance.now();
      const batch = processedFiles.slice(i, Math.min(i + currentBatchSize, processedFiles.length));
      
      // Enhanced batch logging
      enhancedLogger.logBatchInfo(batch, Math.floor(i / currentBatchSize), Math.ceil(processedFiles.length / currentBatchSize));
        // Estimate batch complexity and adjust size for next iteration
      const totalBatchSize = batch.reduce((sum, file) => {
        const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
        return sum + fileSize;
      }, 0);
      
      console.log(`[Offscreen] 📦 Batch analysis:`, {
        batchNumber: Math.floor(i / currentBatchSize) + 1,
        currentBatchSize,
        totalBatchSize: `${(totalBatchSize / 1024 / 1024).toFixed(2)}MB`,
        connectionQuality: performanceTracker.connectionQuality.toFixed(2)
      });
      
      // Adaptive batch sizing: smaller batches for larger files
      if (totalBatchSize > 10000000) { // > 10MB total
        currentBatchSize = Math.max(1, currentBatchSize - 1);
        console.log(`[Offscreen] 📉 Reducing batch size to ${currentBatchSize} due to large total size`);
      } else if (totalBatchSize < 2000000) { // < 2MB total
        currentBatchSize = Math.min(4, currentBatchSize + 1); // Allow up to 4 files for small batches
        console.log(`[Offscreen] 📈 Increasing batch size to ${currentBatchSize} due to small total size`);
      }
      
      // Process batch with Promise.allSettled for better error handling
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;        try {
          const fileStartTime = performance.now();
          console.log(`[Offscreen] 📥 Downloading file ${globalIndex + 1}/${processedFiles.length}: ${file.name}`);
          
          // Send progress update (throttled)
          sendProgressUpdate(globalIndex + 1, processedFiles.length, 
            `Downloading: ${file.name} (${globalIndex + 1}/${processedFiles.length})`);
          
          // Use enhanced download function with comprehensive logging
          const downloadResult = await downloadFileWithTimeout(file);
            if (downloadResult.success && downloadResult.blob && downloadResult.blob.size > 0) {
            const blob = downloadResult.blob;
            const fileDownloadTime = downloadResult.downloadTime;
              // Use enhanced filename cleaning function
            let bestFilename = file.originalFilename;
            
            if (file.isHtmlFile) {
              // Ensure HTML files have .html extension
              if (!cachedToLowerCase(bestFilename).endsWith('.html')) {
                bestFilename = bestFilename.replace(/\.[^.]*$/, '') + '.html';
              }
              
              // Quick HTML validation for small files only (optimized)
              if (blob.size < 524288) { // Only validate files under 512KB for speed
                try {
                  const text = await blob.text();
                  const isValidHtml = QUICK_HTML_CHECK_REGEX.test(text); // Use optimized regex
                  if (!isValidHtml) {
                    console.warn(`[Offscreen] HTML file may not contain valid HTML content: ${bestFilename}`);
                  }
                } catch (textError) {
                  console.warn(`[Offscreen] Could not validate HTML content for: ${bestFilename}`);
                }
              }
            } else if (!file.hasExtension) {
              // For downloads that don't have extensions, we'd need the response headers
              // Since downloadFileWithTimeout doesn't return them, we'll use the original filename
              bestFilename = file.originalFilename || file.name;
            }
              // Apply comprehensive filename cleaning to handle .download suffix and missing extensions
            bestFilename = cleanAndFixFilename(bestFilename, downloadResult.mimeType, file.isHtmlFile);
            
            const finalFileName = file.folderPath + cleanFilesystemPath(bestFilename);
            zip.file(finalFileName, blob);
            
            console.log(`[Offscreen] Added ${file.name} to ZIP as "${finalFileName}"`);
            
            // Update session statistics
            sessionStats.successCount++;
            sessionStats.totalDownloadTime += fileDownloadTime;
            sessionStats.totalDownloadSize += blob.size;
            
            if (blob.size > sessionStats.largestFile.size) {
              sessionStats.largestFile = { name: file.name, size: blob.size };
            }
            if (blob.size < sessionStats.smallestFile.size) {
              sessionStats.smallestFile = { name: file.name, size: blob.size };
            }} else {
            // Handle download failure
            sessionStats.errorCount++;
            console.error(`[Offscreen] Error downloading ${file.name}:`, downloadResult.error);
            zip.file(file.pathInZip + ".error.txt", 
              `Failed to download ${file.name}: ${downloadResult.error}`);
          }
        } catch (error) {          // Handle any unexpected errors
          sessionStats.errorCount++;
          console.error(`[Offscreen] Unexpected error downloading ${file.name}:`, error);
          
          // Create comprehensive error file with more details
          const errorMessage = `Failed to download ${file.name}
Error: ${error.message || 'Unknown error'}
File Type: ${file.isHtmlFile ? 'HTML' : 'Regular'}
URL: ${file.url}
Estimated Size: ${(file.estimatedSize / 1024 / 1024).toFixed(2)}MB
Timestamp: ${new Date().toISOString()}`;
          
          zip.file(file.folderPath + cleanFilesystemPath(file.originalFilename) + ".error.txt", errorMessage);
        }
      });
      
      // Wait for current batch with better error handling
      const results = await Promise.allSettled(batchPromises);
      
      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[Offscreen] Batch item ${index} failed:`, result.reason);
        }
      });
      
      // Update performance metrics for adaptive batching
      const batchEndTime = performance.now();
      const batchTime = batchEndTime - batchStartTime;
      performanceMetrics.avgDownloadTime = (performanceMetrics.avgDownloadTime + batchTime) / 2;
      
      // Adjust connection quality based on performance
      if (batchTime > 5000) { // > 5 seconds for batch
        performanceMetrics.connectionQuality = Math.max(0.5, performanceMetrics.connectionQuality - 0.1);
      } else if (batchTime < 2000) { // < 2 seconds for batch
        performanceMetrics.connectionQuality = Math.min(1.0, performanceMetrics.connectionQuality + 0.1);
      }
    }
    
    // Optimized ZIP generation with fastest settings
    console.log("[Offscreen] Generating ZIP file...");
    sendProgressUpdate(processedFiles.length, processedFiles.length, 'Creating ZIP archive...');
    
    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "STORE" // No compression for maximum speed (was DEFLATE level 1)
    });
    
    // Immediate download initiation
    console.log("[Offscreen] Initiating ZIP download...");
    sendProgressUpdate(processedFiles.length, processedFiles.length, 'Preparing ZIP download...');
    
    const downloadUrl = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = cleanFilesystemPath(filename) || 'smartschool_files.zip';
      // Log comprehensive session summary before initiating download
    const sessionEndTime = performance.now();
    const totalSessionDuration = sessionEndTime - sessionStats.startTime;
    
    enhancedLogger.logDownloadSummary(
      sessionStats.totalFiles,
      sessionStats.successCount,
      sessionStats.errorCount,
      totalSessionDuration,
      sessionStats.totalDownloadSize
    );
    
    // Force immediate download
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Quick status update for user feedback
    setTimeout(() => {
      sendProgressUpdate(processedFiles.length, processedFiles.length, 'ZIP download initiated - check your browser downloads');
      console.log("[Offscreen] ZIP download triggered");
    }, 200); // Reduced delay for faster feedback
    
    // Faster cleanup for better performance
    setTimeout(() => {
      try {
        URL.revokeObjectURL(downloadUrl);
        sendProgressUpdate(processedFiles.length, processedFiles.length, 'Download ready');
        console.log("[Offscreen] ZIP download completed, resources cleaned up");
      } catch (error) {
        console.warn("[Offscreen] Error revoking blob URL:", error);
      }
    }, 6000); // Reduced from 8 seconds to 6 seconds
    
  } catch (error) {
    console.error("[Offscreen] Error during ZIP creation/download:", error);
    
    // Clean up any pending resources
    try {
      if (typeof downloadUrl !== 'undefined') {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (cleanupError) {
      console.warn("[Offscreen] Error during cleanup:", cleanupError);
    }
    
    // Send error message
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      downloadId: downloadId,
      current: 0,
      total: 0,
      status: 'Download failed: ' + error.message
    });
  }
}

// Advanced performance optimizations and Web Worker implementation
// Connection pre-warming for faster network requests
const preWarmConnections = (() => {
  const preWarmCache = new Set();
  return function(url) {
    if (!url || preWarmCache.has(url)) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = new URL(url).origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      preWarmCache.add(url);
      
      // Also pre-warm with dns-prefetch for older browsers
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = new URL(url).origin;
      document.head.appendChild(dnsLink);
    } catch (e) {
      console.warn('[Offscreen] Pre-warm failed for:', url);
    }
  };
})();

// Advanced request deduplication system
const requestCache = new Map();
const pendingRequests = new Map();

// Enhanced fetch with intelligent caching and deduplication
async function enhancedFetch(url, options = {}) {
  // Pre-warm connection on first request
  preWarmConnections(url);
  
  // Check if request is already pending
  if (pendingRequests.has(url)) {
    return await pendingRequests.get(url);
  }
  
  // Check cache first (with TTL)
  if (requestCache.has(url)) {
    const cached = requestCache.get(url);
    if (Date.now() - cached.timestamp < 300000) { // 5 minute TTL
      return cached.response.clone();
    } else {
      requestCache.delete(url);
    }
  }
  
  // Create fetch with enhanced options
  const enhancedOptions = {
    ...options,
    headers: {
      'Accept': '*/*',
      'Cache-Control': 'max-age=300',
      ...options.headers
    },
    keepalive: true,
    priority: 'high'
  };
  
  // Create and cache the promise
  const requestPromise = fetch(url, enhancedOptions)
    .then(response => {
      // Cache successful responses
      if (response.ok && response.status === 200) {
        requestCache.set(url, {
          response: response.clone(),
          timestamp: Date.now()
        });
      }
      pendingRequests.delete(url);
      return response;
    })
    .catch(error => {
      pendingRequests.delete(url);
      throw error;
    });
  
  pendingRequests.set(url, requestPromise);
  return await requestPromise;
}

// Web Worker implementation for CPU-intensive ZIP operations
function createZipWorker() {
  // Disable Web Worker due to CSP constraints in Chrome extensions
  // The CSP policy prevents loading external scripts via importScripts()
  console.warn('[Offscreen] Web Worker disabled due to CSP constraints - falling back to main thread');
  return null;
}

// Streaming ZIP creation class for maximum performance
class StreamingZipCreator {
  constructor(downloadId, filename) {
    this.downloadId = downloadId;
    this.filename = filename;
    this.worker = createZipWorker();
    this.fileQueue = [];
    this.totalFiles = 0;
    this.isReady = false;
    this.setupWorker();
  }
  
  setupWorker() {
    if (!this.worker) {
      console.warn('[Offscreen] Worker not available, falling back to main thread');
      return;
    }
    
    this.worker.onmessage = (e) => {
      const { action, current, total, blob, message } = e.data;
      
      switch(action) {
        case 'ready':
          this.isReady = true;
          this.processQueue();
          break;
        case 'progress':
          this.sendProgressUpdate(current, total, `Processing files (${current}/${total})...`);
          break;
        case 'complete':
          this.onZipComplete(blob);
          break;
        case 'error':
          console.error('[Offscreen] Worker error:', message);
          this.fallbackToMainThread();
          break;
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('[Offscreen] Worker error:', error);
      this.fallbackToMainThread();
    };
  }
  
  async addFile(filename, blob) {
    this.fileQueue.push({ filename, blob });
    
    if (this.worker && this.isReady) {
      this.processQueue();
    }
  }
  
  processQueue() {
    if (!this.worker || this.fileQueue.length === 0) return;
    
    // Process all queued files
    while (this.fileQueue.length > 0) {
      const file = this.fileQueue.shift();
      this.worker.postMessage({ 
        action: 'addFile', 
        data: file 
      });
    }
  }
  
  async generate() {
    if (this.worker) {
      this.worker.postMessage({ 
        action: 'init', 
        data: { totalFiles: this.totalFiles } 
      });
    } else {
      this.fallbackToMainThread();
    }
  }
  
  async generateZip() {
    if (this.worker) {
      this.worker.postMessage({ action: 'generate' });
    }
  }
  
  onZipComplete(blob) {
    this.downloadZip(blob);
    this.cleanup();
  }
  
  downloadZip(blob) {
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = cleanFilesystemPath(this.filename) || 'smartschool_files.zip';
    
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    this.sendProgressUpdate(1, 1, 'ZIP download initiated - check your browser downloads');
    
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
      this.sendProgressUpdate(1, 1, 'Download ready');
    }, 3000);
  }
  
  async fallbackToMainThread() {
    console.log('[Offscreen] Falling back to main thread ZIP creation');
    // Fallback to original ZIP creation method
    this.cleanup();
    // Will be handled by the original createAndDownloadZip function
  }
  
  sendProgressUpdate(current, total, status) {
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      downloadId: this.downloadId,
      current: current,
      total: total,
      status: status
    });
  }
  
  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Enhanced logging utilities for file size and timeout tracking
const enhancedLogger = {  logFileDownloadStart(file, timeout) {
    const estimatedMB = (file.estimatedSize / 1024 / 1024).toFixed(2);
    const timeoutMin = (timeout / 1000 / 60).toFixed(1);
    const timeoutSec = (timeout / 1000).toFixed(1);
    
    console.log(`[Offscreen] 📥 Starting download: ${file.name}`);
    console.log(`[Offscreen] 📊 File details:`, {
      fileName: file.name,
      url: file.url.substring(0, 100) + (file.url.length > 100 ? '...' : ''),
      estimatedSize: `${estimatedMB}MB (${file.estimatedSize} bytes)`,
      sizeCategory: file.sizeCategory || 'unknown',
      isHtml: file.isHtmlFile,
      hasAlternativeUrls: file.alternativeUrls?.length > 0,
      alternativeUrlCount: file.alternativeUrls?.length || 0,
      timeout: `${timeoutMin}min (${timeoutSec}s / ${timeout}ms)`,
      connectionQuality: performanceTracker.connectionQuality.toFixed(2),
      networkType: performanceTracker.networkType,
      avgDownloadTime: `${(performanceTracker.downloadTimes.reduce((a, b) => a + b, 0) / Math.max(1, performanceTracker.downloadTimes.length) / 1000).toFixed(1)}s`,
      pathInZip: file.pathInZip || 'root'
    });

    // Log size-based timeout reasoning
    if (file.estimatedSize > 200000000) {
      console.log(`[Offscreen] 🔍 Timeout reasoning: Ultra-large file (${estimatedMB}MB) - using maximum timeout of ${timeoutMin}min`);
    } else if (file.estimatedSize > 50000000) {
      console.log(`[Offscreen] 🔍 Timeout reasoning: Large file (${estimatedMB}MB) - extended timeout of ${timeoutMin}min`);
    } else if (file.estimatedSize > 10000000) {
      console.log(`[Offscreen] 🔍 Timeout reasoning: Medium-large file (${estimatedMB}MB) - moderate timeout of ${timeoutMin}min`);
    } else {
      console.log(`[Offscreen] 🔍 Timeout reasoning: Small-medium file (${estimatedMB}MB) - standard timeout of ${timeoutMin}min`);
    }
  },
  logFileDownloadComplete(file, blob, duration, timeout) {
    const estimatedMB = (file.estimatedSize / 1024 / 1024).toFixed(2);
    const actualMB = (blob.size / 1024 / 1024).toFixed(2);
    const durationSec = (duration / 1000).toFixed(1);
    const timeoutMin = (timeout / 1000 / 60).toFixed(1);
    const timeoutSec = (timeout / 1000).toFixed(1);
    const sizeAccuracy = ((blob.size / file.estimatedSize) * 100).toFixed(1);
    const speed = ((blob.size / 1024 / 1024) / (duration / 1000)).toFixed(2);
    const sizeDifference = (blob.size - file.estimatedSize) / 1024 / 1024;
    const timeoutUtilization = ((duration / timeout) * 100).toFixed(1);
    
    console.log(`[Offscreen] ✅ Download completed: ${file.name}`);
    console.log(`[Offscreen] 📈 Performance metrics:`, {
      fileName: file.name,
      estimatedSize: `${estimatedMB}MB (${file.estimatedSize} bytes)`,
      actualSize: `${actualMB}MB (${blob.size} bytes)`,
      sizeDifference: `${sizeDifference > 0 ? '+' : ''}${sizeDifference.toFixed(2)}MB`,
      sizeAccuracy: `${sizeAccuracy}%`,
      duration: `${durationSec}s (${duration}ms)`,
      timeoutUsed: `${timeoutMin}min (${timeoutSec}s / ${timeout}ms)`,
      timeoutUtilization: `${timeoutUtilization}%`,
      downloadSpeed: `${speed}MB/s`,
      efficiency: duration < timeout * 0.5 ? 'Excellent' : duration < timeout * 0.8 ? 'Good' : 'Near timeout'
    });

    // Enhanced performance warnings with more granular feedback
    if (blob.size > file.estimatedSize * 3) {
      console.warn(`[Offscreen] ⚠️ File was ${(blob.size / file.estimatedSize).toFixed(1)}x larger than estimated! Consider updating size estimation algorithm.`);
    } else if (blob.size > file.estimatedSize * 2) {
      console.warn(`[Offscreen] ⚠️ File was ${(blob.size / file.estimatedSize).toFixed(1)}x larger than estimated! Size estimation may be conservative.`);
    } else if (blob.size < file.estimatedSize * 0.3) {
      console.warn(`[Offscreen] ⚠️ File was ${(file.estimatedSize / blob.size).toFixed(1)}x smaller than estimated! Size estimation may be too generous.`);
    } else if (blob.size < file.estimatedSize * 0.5) {
      console.warn(`[Offscreen] ⚠️ File was ${(file.estimatedSize / blob.size).toFixed(1)}x smaller than estimated! Size estimation could be improved.`);
    }

    // Timeout utilization warnings with suggestions
    if (duration > timeout * 0.9) {
      console.warn(`[Offscreen] 🚨 Download used ${timeoutUtilization}% of timeout - critically close to timeout! Consider increasing timeout for similar files.`);
    } else if (duration > timeout * 0.8) {
      console.warn(`[Offscreen] ⚠️ Download used ${timeoutUtilization}% of timeout - consider increasing timeout for better safety margin.`);
    } else if (duration < timeout * 0.2) {
      console.log(`[Offscreen] 💡 Download only used ${timeoutUtilization}% of timeout - timeout could potentially be reduced for similar files.`);
    }

    // Speed analysis
    if (speed < 0.5) {
      console.warn(`[Offscreen] 🐌 Slow download speed (${speed}MB/s) - network may be congested or file server is slow.`);
    } else if (speed > 5) {
      console.log(`[Offscreen] 🚀 Excellent download speed (${speed}MB/s) - great connection!`);
    }
  },
  logTimeoutCalculation(isHtml, fileSize, timeout) {
    const sizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(2) : 'unknown';
    const sizeBytes = fileSize || 'unknown';
    const timeoutMin = (timeout / 1000 / 60).toFixed(1);
    const timeoutSec = (timeout / 1000).toFixed(1);
    
    console.log(`[Offscreen] ⏱️ Timeout calculation details:`, {
      fileType: isHtml ? 'HTML' : 'Binary',
      fileSize: `${sizeMB}MB (${sizeBytes} bytes)`,
      connectionQuality: performanceTracker.connectionQuality.toFixed(2),
      networkType: performanceTracker.networkType,
      avgDownloadSpeed: performanceTracker.downloadTimes.length > 0 ? 
        `${(performanceTracker.downloadTimes.reduce((a, b) => a + b, 0) / performanceTracker.downloadTimes.length / 1000).toFixed(1)}s avg` : 'no data',
      calculatedTimeout: `${timeoutMin}min (${timeoutSec}s / ${timeout}ms)`
    });

    // Provide reasoning for timeout calculation
    if (fileSize) {
      if (fileSize > 200000000) {
        console.log(`[Offscreen] 📋 Timeout reasoning: Ultra-massive file (${sizeMB}MB) requires maximum timeout for reliable downloads`);
      } else if (fileSize > 50000000) {
        console.log(`[Offscreen] 📋 Timeout reasoning: Large file (${sizeMB}MB) needs extended timeout for stability`);
      } else if (fileSize > 10000000) {
        console.log(`[Offscreen] 📋 Timeout reasoning: Medium file (${sizeMB}MB) using generous timeout for safety`);
      } else {
        console.log(`[Offscreen] 📋 Timeout reasoning: Small file (${sizeMB}MB) using standard timeout`);
      }
    } else {
      console.log(`[Offscreen] 📋 Timeout reasoning: Unknown file size, using conservative default for ${isHtml ? 'HTML' : 'binary'} files`);
    }

    // Connection quality impact
    if (performanceTracker.connectionQuality < 0.5) {
      console.log(`[Offscreen] 🌐 Poor connection quality (${performanceTracker.connectionQuality.toFixed(2)}) - timeout increased for reliability`);
    } else if (performanceTracker.connectionQuality > 0.8) {
      console.log(`[Offscreen] 🌐 Good connection quality (${performanceTracker.connectionQuality.toFixed(2)}) - standard timeout used`);
    }
  },  logBatchInfo(batch, batchIndex, totalBatches) {
    const totalSize = batch.reduce((sum, file) => {
      const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
      return sum + fileSize;
    }, 0);
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
    const avgFileSize = totalSize / batch.length;
    const avgFileMB = (avgFileSize / 1024 / 1024).toFixed(2);
    const largestFile = batch.reduce((largest, file) => {
      const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
      const largestSize = Number.isFinite(largest.estimatedSize) ? largest.estimatedSize : 500000;
      return fileSize > largestSize ? file : largest;
    });
    const smallestFile = batch.reduce((smallest, file) => {
      const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
      const smallestSize = Number.isFinite(smallest.estimatedSize) ? smallest.estimatedSize : 500000;
      return fileSize < smallestSize ? file : smallest;
    });
    
    console.log(`[Offscreen] 📦 Processing batch ${batchIndex + 1}/${totalBatches}:`, {
      fileCount: batch.length,
      estimatedTotalSize: `${totalMB}MB (${totalSize} bytes)`,
      avgFileSize: `${avgFileMB}MB (${avgFileSize.toFixed(0)} bytes)`,      largestFile: {
        name: largestFile.name,
        size: `${((Number.isFinite(largestFile.estimatedSize) ? largestFile.estimatedSize : 500000) / 1024 / 1024).toFixed(2)}MB`
      },
      smallestFile: {
        name: smallestFile.name,
        size: `${((Number.isFinite(smallestFile.estimatedSize) ? smallestFile.estimatedSize : 500000) / 1024 / 1024).toFixed(2)}MB`
      },
      htmlFiles: batch.filter(f => f.isHtmlFile).length,
      binaryFiles: batch.filter(f => !f.isHtmlFile).length,
      filesWithAlternatives: batch.filter(f => f.alternativeUrls?.length > 0).length
    });
      // Log individual files in the batch for detailed tracking
    console.log(`[Offscreen] 📋 Batch ${batchIndex + 1} files:`, 
      batch.map(f => ({
        name: f.name,
        size: `${((Number.isFinite(f.estimatedSize) ? f.estimatedSize : 500000) / 1024 / 1024).toFixed(2)}MB`,
        type: f.isHtmlFile ? 'HTML' : 'Binary',
        alternatives: f.alternativeUrls?.length || 0
      }))
    );    // Batch complexity analysis
    const complexityScore = batch.reduce((score, file) => {
      let fileScore = 1;
      const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
      
      if (fileSize > 50000000) fileScore += 3; // Large files add complexity
      else if (fileSize > 10000000) fileScore += 2;
      else if (fileSize > 1000000) fileScore += 1;
      
      if (file.isHtmlFile) fileScore += 1; // HTML files might need processing
      if (file.alternativeUrls?.length > 0) fileScore += 1; // Alternative URLs add complexity
      
      return score + fileScore;
    }, 0);

    console.log(`[Offscreen] 🧮 Batch complexity analysis:`, {
      complexityScore,
      averageComplexityPerFile: (complexityScore / batch.length).toFixed(1),
      estimatedProcessingTime: `${(complexityScore * 2).toFixed(0)}s`,
      riskLevel: complexityScore > batch.length * 4 ? 'High' : 
                 complexityScore > batch.length * 2 ? 'Medium' : 'Low'
    });
  },

  logDownloadSummary(totalFiles, successCount, errorCount, totalDuration, totalSize) {
    const successRate = ((successCount / totalFiles) * 100).toFixed(1);
    const errorRate = ((errorCount / totalFiles) * 100).toFixed(1);
    const avgDuration = totalDuration / successCount;
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
    const overallSpeed = totalSize / totalDuration * 1000; // bytes per second
    const overallSpeedMBps = (overallSpeed / 1024 / 1024).toFixed(2);

    console.log(`[Offscreen] 📊 Download Session Summary:`, {
      totalFiles,
      successfulDownloads: successCount,
      failedDownloads: errorCount,
      successRate: `${successRate}%`,
      errorRate: `${errorRate}%`,
      totalSize: `${totalMB}MB (${totalSize} bytes)`,
      totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
      avgDurationPerFile: `${(avgDuration / 1000).toFixed(1)}s`,
      overallSpeed: `${overallSpeedMBps}MB/s`,
      performance: successRate > 95 ? 'Excellent' : 
                   successRate > 85 ? 'Good' : 
                   successRate > 70 ? 'Fair' : 'Poor'
    });

    // Performance recommendations
    if (errorRate > 15) {
      console.warn(`[Offscreen] 💡 High error rate (${errorRate}%) - consider increasing timeouts or checking network stability`);
    }
    if (parseFloat(overallSpeedMBps) < 1) {
      console.warn(`[Offscreen] 💡 Slow overall speed (${overallSpeedMBps}MB/s) - network may be congested`);
    }
    if (avgDuration > 10000) {
      console.warn(`[Offscreen] 💡 Long average download time (${(avgDuration/1000).toFixed(1)}s) - consider smaller batch sizes`);
    }
  }
};

// Enhanced download function with comprehensive timeout and size tracking
async function downloadFileWithTimeout(file, options = {}) {
  const startTime = performance.now();
  let timeoutId;
  let controller;
  
  try {
    // Calculate optimal timeout based on file size and connection quality
    const optimalTimeout = performanceTracker.getOptimalTimeout(file.isHtmlFile, file.estimatedSize);
    const actualTimeout = options.timeout || optimalTimeout;
    
    // Enhanced logging for download start
    enhancedLogger.logFileDownloadStart(file, actualTimeout);
    
    // Set up abort controller and timeout
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      const durationSoFar = performance.now() - startTime;
      console.warn(`[Offscreen] ⏰ downloadFileWithTimeout: Timeout reached for ${file.name} after ${(durationSoFar/1000).toFixed(1)}s (limit: ${(actualTimeout/1000/60).toFixed(1)}min)`);
      controller.abort();
    }, actualTimeout);
    
    // Try primary URL first
    let response;
    let finalUrl = file.url;
    
    try {
      // Perform the download with enhanced fetch
      response = await enhancedFetch(file.url, {
        signal: controller.signal,
        keepalive: true,
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        ...options.fetchOptions
      });
      
      if (!response.ok && file.isHtmlFile && file.alternativeUrls && file.alternativeUrls.length > 0) {
        // Try alternative URLs for HTML files
        console.log(`[Offscreen] 🔄 Primary URL failed (${response.status}), trying alternative URLs for ${file.name}`);
        
        for (let i = 0; i < file.alternativeUrls.length; i++) {
          const altUrl = file.alternativeUrls[i];
          try {
            console.log(`[Offscreen] 🔄 Trying alternative URL ${i + 1}/${file.alternativeUrls.length}: ${altUrl.substring(0, 100)}...`);
            
            response = await enhancedFetch(altUrl, {
              signal: controller.signal,
              keepalive: true,
              headers: {
                'Accept': '*/*',
                'Cache-Control': 'no-cache'
              },
              ...options.fetchOptions
            });
            
            if (response.ok) {
              finalUrl = altUrl;
              console.log(`[Offscreen] ✅ Alternative URL ${i + 1} succeeded for ${file.name}`);
              break;
            }
          } catch (altError) {
            console.warn(`[Offscreen] ⚠️ Alternative URL ${i + 1} failed for ${file.name}:`, altError.message);
            continue;
          }
        }
      }
    } catch (fetchError) {
      // If primary fetch failed, try alternatives for HTML files
      if (file.isHtmlFile && file.alternativeUrls && file.alternativeUrls.length > 0) {
        console.log(`[Offscreen] 🔄 Primary fetch failed, trying alternative URLs for ${file.name}`);
        
        for (let i = 0; i < file.alternativeUrls.length; i++) {
          const altUrl = file.alternativeUrls[i];
          try {
            console.log(`[Offscreen] 🔄 Trying alternative URL ${i + 1}/${file.alternativeUrls.length}: ${altUrl.substring(0, 100)}...`);
            
            response = await enhancedFetch(altUrl, {
              signal: controller.signal,
              keepalive: true,
              headers: {
                'Accept': '*/*',
                'Cache-Control': 'no-cache'
              },
              ...options.fetchOptions
            });
            
            if (response.ok) {
              finalUrl = altUrl;
              console.log(`[Offscreen] ✅ Alternative URL ${i + 1} succeeded for ${file.name}`);
              break;
            }
          } catch (altError) {
            console.warn(`[Offscreen] ⚠️ Alternative URL ${i + 1} failed for ${file.name}:`, altError.message);
            continue;
          }
        }
      }
      
      if (!response) {
        throw fetchError;
      }
    }
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (Final URL: ${finalUrl.substring(0, 100)}...)`);
    }    // Get the blob and measure final performance
    const blob = await response.blob();
    const downloadTime = performance.now() - startTime;
    
    // Extract MIME type from response headers
    const mimeType = response.headers.get('content-type')?.split(';')[0] || blob.type || null;
    
    // Validate blob size - don't return empty files as successful
    if (!blob || blob.size === 0) {
      throw new Error(`Downloaded file is empty (0 bytes) for ${file.name}`);
    }
    
    // Enhanced logging for download completion
    enhancedLogger.logFileDownloadComplete(file, blob, downloadTime, actualTimeout);
    
    // Record performance metrics
    performanceTracker.recordDownload(downloadTime, blob.size);
    
    return {
      blob,
      downloadTime,
      actualSize: blob.size,
      estimatedSize: file.estimatedSize,
      sizeAccuracy: (blob.size / file.estimatedSize) * 100,
      timeoutUsed: actualTimeout,
      timeoutUtilization: (downloadTime / actualTimeout) * 100,
      success: true,
      finalUrl: finalUrl,
      mimeType: mimeType
    };
    
  } catch (error) {
    // Clear timeout if still active
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    const downloadTime = performance.now() - startTime;
    
    // Log the error with context
    console.error(`[Offscreen] ❌ downloadFileWithTimeout failed for ${file.name}:`, error);
    console.error(`[Offscreen] 📋 Error context:`, {
      fileName: file.name,
      url: file.url.substring(0, 100) + '...',
      estimatedSize: `${(file.estimatedSize / 1024 / 1024).toFixed(2)}MB`,
      isHtml: file.isHtmlFile,
      duration: `${(downloadTime / 1000).toFixed(1)}s`,
      timeout: `${((options.timeout || performanceTracker.getOptimalTimeout(file.isHtmlFile, file.estimatedSize)) / 1000 / 60).toFixed(1)}min`,
      errorType: error.name,
      errorMessage: error.message
    });
      return {
      blob: null,
      downloadTime,
      actualSize: 0,
      estimatedSize: file.estimatedSize,
      sizeAccuracy: 0,
      timeoutUsed: options.timeout || performanceTracker.getOptimalTimeout(file.isHtmlFile, file.estimatedSize),
      timeoutUtilization: 0,
      success: false,
      error: error.message,
      mimeType: null
    };
  }
}

// Performance tracking and adaptive optimization
const performanceTracker = {
  downloadTimes: [],
  connectionQuality: 1.0,
  avgFileSize: 500000,
  networkType: 'unknown',
    recordDownload(duration, size) {
    this.downloadTimes.push(duration);
    if (this.downloadTimes.length > 10) {
      this.downloadTimes.shift(); // Keep only last 10 measurements
    }
    
    const avgTime = this.downloadTimes.reduce((a, b) => a + b, 0) / this.downloadTimes.length;
    const sizePerMs = size / duration;
    const speedMBps = (size / 1024 / 1024) / (duration / 1000);
    const previousQuality = this.connectionQuality;
    
    // Enhanced logging for performance tracking
    console.log(`[Offscreen] 📊 Performance recorded:`, {
      duration: `${(duration / 1000).toFixed(1)}s (${duration}ms)`,
      size: `${(size / 1024 / 1024).toFixed(2)}MB (${size} bytes)`,
      speed: `${speedMBps.toFixed(2)}MB/s`,
      bytesPerMs: `${sizePerMs.toFixed(2)} bytes/ms`,
      avgTime: `${(avgTime / 1000).toFixed(1)}s`,
      totalRecords: this.downloadTimes.length,
      connectionQuality: this.connectionQuality.toFixed(2),
      networkType: this.networkType
    });
    
    // Update connection quality based on performance
    if (avgTime > 2500 || sizePerMs < 100) {
      this.connectionQuality = Math.max(0.3, this.connectionQuality - 0.1);
      console.log(`[Offscreen] 📉 Connection quality decreased from ${previousQuality.toFixed(2)} to ${this.connectionQuality.toFixed(2)} (slow performance detected)`);
    } else if (avgTime < 1000 && sizePerMs > 500) {
      this.connectionQuality = Math.min(1.0, this.connectionQuality + 0.1);
      console.log(`[Offscreen] 📈 Connection quality improved from ${previousQuality.toFixed(2)} to ${this.connectionQuality.toFixed(2)} (fast performance detected)`);
    }
    
    // Detect network type for better optimization
    if ('connection' in navigator && navigator.connection) {
      const oldNetworkType = this.networkType;
      this.networkType = navigator.connection.effectiveType || 'unknown';
      if (oldNetworkType !== this.networkType) {
        console.log(`[Offscreen] 🌐 Network type changed from ${oldNetworkType} to ${this.networkType}`);
      }
    }

    // Performance trend analysis
    if (this.downloadTimes.length >= 3) {
      const recentTimes = this.downloadTimes.slice(-3);
      const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
      const overallAvg = avgTime;
      
      if (recentAvg > overallAvg * 1.5) {
        console.warn(`[Offscreen] 📊 Performance trend: Downloads getting slower (recent: ${(recentAvg/1000).toFixed(1)}s vs avg: ${(overallAvg/1000).toFixed(1)}s)`);
      } else if (recentAvg < overallAvg * 0.7) {
        console.log(`[Offscreen] 📊 Performance trend: Downloads getting faster (recent: ${(recentAvg/1000).toFixed(1)}s vs avg: ${(overallAvg/1000).toFixed(1)}s)`);
      }
    }

    // Speed categorization
    if (speedMBps > 10) {
      console.log(`[Offscreen] 🚀 Excellent speed: ${speedMBps.toFixed(2)}MB/s - very fast connection`);
    } else if (speedMBps > 5) {
      console.log(`[Offscreen] ⚡ Good speed: ${speedMBps.toFixed(2)}MB/s - fast connection`);
    } else if (speedMBps > 1) {
      console.log(`[Offscreen] ✅ Moderate speed: ${speedMBps.toFixed(2)}MB/s - acceptable connection`);
    } else if (speedMBps > 0.5) {
      console.log(`[Offscreen] ⚠️ Slow speed: ${speedMBps.toFixed(2)}MB/s - slow connection`);
    } else {
      console.warn(`[Offscreen] 🐌 Very slow speed: ${speedMBps.toFixed(2)}MB/s - very slow connection`);
    }
  },
  
  getOptimalBatchSize() {
    let baseSize = 3;
    
    // Adjust based on connection quality
    if (this.connectionQuality > 0.8) {
      baseSize = 6; // High quality connection
    } else if (this.connectionQuality < 0.5) {
      baseSize = 2; // Poor connection
    }
    
    // Further adjust based on network type
    if (this.networkType === '4g' || this.networkType === '5g') {
      baseSize = Math.min(8, baseSize + 2);
    } else if (this.networkType === '3g' || this.networkType === 'slow-2g') {
      baseSize = Math.max(1, baseSize - 1);
    }
    
    return baseSize;
  },  getOptimalTimeout(isHtml = false, fileSize = null) {
    // Ultra-generous timeouts for very large files (up to 287MB PowerPoint files)
    let baseTimeout;
    let timeoutReason = '';
    
    // Determine base timeout based on file size if available
    if (fileSize && fileSize > 0) {
      // For ultra-massive files (>200MB), use maximum timeouts
      if (fileSize > 200000000) { // > 200MB (like 287MB PowerPoint files)
        baseTimeout = 2700000; // 45 minutes for ultra-massive files
        timeoutReason = 'ultra-massive file (>200MB)';
      }
      // For very large files (>50MB), use much longer timeouts
      else if (fileSize > 50000000) { // > 50MB
        baseTimeout = 1800000; // 30 minutes for huge files
        timeoutReason = 'huge file (>50MB)';
      } else if (fileSize > 10000000) { // > 10MB
        baseTimeout = 900000;  // 15 minutes for large files
        timeoutReason = 'large file (>10MB)';
      } else if (fileSize > 1000000) { // > 1MB
        baseTimeout = 300000;  // 5 minutes for medium files
        timeoutReason = 'medium file (>1MB)';
      } else {
        baseTimeout = isHtml ? 120000 : 180000; // 2-3 minutes for small files
        timeoutReason = `small file (<1MB, ${isHtml ? 'HTML' : 'binary'})`;
      }
    } else {
      // Fallback when file size is unknown - assume large files
      baseTimeout = isHtml ? 600000 : 1200000; // 10-20 minutes default
      timeoutReason = `unknown size (${isHtml ? 'HTML' : 'binary'} default)`;
    }
    
    // Scale based on connection quality but with much higher minimums
    const qualityMultiplier = 1 + (1 - this.connectionQuality) * 2;
    const finalTimeout = baseTimeout * qualityMultiplier;
    
    // Absolute maximum: 60 minutes for ultra-large files
    const result = Math.min(finalTimeout, 3600000);
    
    // Enhanced logging for timeout calculation
    enhancedLogger.logTimeoutCalculation(isHtml, fileSize, result);
    console.log(`[Offscreen] ⏱️ Timeout details:`, {
      reason: timeoutReason,
      baseTimeout: `${(baseTimeout / 1000 / 60).toFixed(1)}min`,
      qualityMultiplier: qualityMultiplier.toFixed(2),
      finalTimeout: `${(result / 1000 / 60).toFixed(1)}min`,
      connectionQuality: this.connectionQuality.toFixed(2)
    });
    
    return result;
  }
};
