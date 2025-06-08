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

// Optimized MIME type mapping with most common types first
const MIME_TO_EXTENSION = new Map([
  ['text/html', 'html'],
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
    return false;
  } else if (request.action === 'createAndDownloadZip') {
    console.log("[Offscreen] Received request to create and download ZIP with", request.files.length, "files");
    
    // Handle ZIP creation and download in offscreen (no response needed since it's async)
    createAndDownloadZip(request.files, request.filename, request.downloadId);
    
    // Return false since we're not using sendResponse
    return false;
  }
  // Default for unhandled actions or synchronous actions not using sendResponse.
  return false; 
});

// Function to create ZIP and download directly in offscreen
async function createAndDownloadZip(files, filename, downloadId) {
  try {
    console.log("[Offscreen] Starting ZIP creation with", files.length, "files");
    
    // Optimized progress updates to prevent message flooding
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE = 150; // Reduced frequency from 100ms to 150ms
    
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
    
    // Send initial progress update for indexing phase
    sendProgressUpdate(0, files.length, 'Starting indexing...');
    
    const zip = new JSZip();
    
    // Pre-process file information with optimized operations and memory estimation
    const processedFiles = files.map(file => {
      const pathParts = file.pathInZip.split('/');
      const originalFilename = pathParts.pop();
      const folderPath = pathParts.length > 0 ? cachedPathJoin(pathParts) + '/' : '';
        // Estimate file size based on URL patterns (for adaptive batching)
      let estimatedSize = 500000; // Default 500KB estimate
      if (file.url.includes('image') || file.url.includes('.jpg') || file.url.includes('.png')) {
        estimatedSize = 2000000; // 2MB for images
      } else if (file.url.includes('video') || file.url.includes('.mp4') || file.url.includes('.avi')) {
        estimatedSize = 20000000; // 20MB for videos
      } else if (file.url.includes('.pdf') || file.url.includes('document')) {
        estimatedSize = 1000000; // 1MB for documents
      }
      
      return {
        ...file,
        originalFilename,
        folderPath,
        hasExtension: hasFileExtension(originalFilename),
        isHtmlFile: file.isHtmlFile || false,
        alternativeUrls: file.alternativeUrls || [],
        estimatedSize: Math.max(100000, estimatedSize) // Ensure minimum 100KB estimate
      };
    });
    
    // Send indexing complete message
    sendProgressUpdate(0, files.length, `Found ${files.length} files to download`);
    
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
      
      // Estimate batch complexity and adjust size for next iteration
      const totalBatchSize = batch.reduce((sum, file) => {
        const fileSize = Number.isFinite(file.estimatedSize) ? file.estimatedSize : 500000;
        return sum + fileSize;
      }, 0);
      
      // Adaptive batch sizing: smaller batches for larger files
      if (totalBatchSize > 10000000) { // > 10MB total
        currentBatchSize = Math.max(1, currentBatchSize - 1);
      } else if (totalBatchSize < 2000000) { // < 2MB total
        currentBatchSize = Math.min(4, currentBatchSize + 1); // Allow up to 4 files for small batches
      }
      
      // Process batch with Promise.allSettled for better error handling
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          console.log(`[Offscreen] Downloading file ${globalIndex + 1}/${processedFiles.length}: ${file.name}`);
          
          // Send progress update (throttled)
          sendProgressUpdate(globalIndex + 1, processedFiles.length, 
            `Downloading: ${file.name} (${globalIndex + 1}/${processedFiles.length})`);
          
          // Optimized HTML file handling with early URL selection and connection reuse
          let response;
          let finalUrl = file.url;
          
          // Configure fetch options for better performance
          const fetchOptions = {
            keepalive: true, // Enable connection reuse
            headers: {
              'Accept': '*/*',
              'Cache-Control': 'no-cache'
            }
          };
          
          if (file.isHtmlFile && file.alternativeUrls?.length > 0) {
            // Try primary URL first with aggressive timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced from 3s to 2s
            
            try {
              response = await fetch(file.url, { 
                ...fetchOptions,
                signal: controller.signal 
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                // Quick alternative URL attempts with exponential backoff
                for (let i = 0; i < file.alternativeUrls.length; i++) {
                  const altUrl = file.alternativeUrls[i];
                  try {
                    const altController = new AbortController();
                    const baseTimeout = 1500; // Base timeout
                    const timeoutMultiplier = Math.min(1 + (i * 0.2), 2); // Slight increase per attempt
                    const altTimeoutId = setTimeout(() => altController.abort(), baseTimeout * timeoutMultiplier);
                    
                    response = await fetch(altUrl, { 
                      ...fetchOptions,
                      signal: altController.signal 
                    });
                    clearTimeout(altTimeoutId);
                    
                    if (response.ok) {
                      finalUrl = altUrl;
                      break;
                    }
                  } catch (altError) {
                    continue; // Try next URL
                  }
                }
              }
            } catch (fetchError) {
              clearTimeout(timeoutId);
              // Try first alternative as fallback
              if (file.alternativeUrls.length > 0) {
                response = await fetch(file.alternativeUrls[0], fetchOptions);
                finalUrl = file.alternativeUrls[0];
              } else {
                throw fetchError;
              }
            }
          } else {
            // Standard fetch with aggressive timeout for non-HTML files
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // Reduced from 5s to 4s
            
            try {
              response = await fetch(file.url, { 
                ...fetchOptions,
                signal: controller.signal 
              });
              clearTimeout(timeoutId);
            } catch (fetchError) {
              clearTimeout(timeoutId);
              throw fetchError;
            }
          }
          
          if (!response.ok) {
            console.warn(`[Offscreen] Failed to fetch ${file.name} (status: ${response.status})`);
            zip.file(file.pathInZip + ".error.txt", 
              `Failed to download ${file.name}. Status: ${response.status}. URL: ${finalUrl}`);
            return;
          }
          
          const blob = await response.blob();
          
          // Optimized filename resolution
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
            // Quick filename resolution without multiple operations
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
              const headerFilename = getFilenameFromContentDisposition(contentDisposition);
              if (headerFilename && hasFileExtension(headerFilename)) {
                bestFilename = headerFilename;
              }
            }
            
            // Add extension from MIME type if still needed
            if (!hasFileExtension(bestFilename)) {
              const contentType = response.headers.get('content-type');
              if (contentType) {
                const extension = getExtensionFromMimeType(contentType);
                if (extension) {
                  bestFilename = bestFilename + '.' + extension;
                } else {
                  bestFilename = bestFilename + '.file';
                }
              } else {
                bestFilename = bestFilename + '.file';
              }
            }
          }
          
          const finalFileName = file.folderPath + cleanFilesystemPath(bestFilename);
          zip.file(finalFileName, blob);
          
          console.log(`[Offscreen] Added ${file.name} to ZIP as "${finalFileName}"`);
          
        } catch (error) {
          console.error(`[Offscreen] Error downloading ${file.name}:`, error);
          zip.file(file.pathInZip + ".error.txt", 
            `Failed to download ${file.name}: ${error.message}`);
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
