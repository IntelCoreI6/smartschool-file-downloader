// offscreen.js
// This script will run in the offscreen document
console.log("[Offscreen] Script started."); // DEBUG

// Pre-compiled regular expressions for maximum performance
const FILE_EXTENSION_REGEX = /\.[a-zA-Z0-9]{1,5}$/;
const FILENAME_STAR_REGEX = /filename\*=(?:UTF-8'')?([^;]+)/i;
const FILENAME_REGEX = /filename=["']?([^;"']+)["']?/i;
const EXTENSION_VALIDATION_REGEX = /^[a-zA-Z0-9]+$/;
const QUICK_HTML_CHECK_REGEX = /<!DOCTYPE|<html|<body|<head/i; // Optimized HTML detection

// Helper function caches and performance optimizations
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

  // If the filename already has a valid extension, we're done.
  if (hasFileExtension(cleanName)) {
    return cleanName;
  }
  
  // Priority 3: If no extension yet, try to get one from the MIME type.
  if (mimeType) {
    const extension = getExtensionFromMimeType(mimeType);
    if (extension) {
      return cleanName + '.' + extension;
    }
    // If MIME type is present but not in our map, return the name as-is.
    // Better to have no extension than a wrong one like '.file'.
    return cleanName;
  }
  
  // Priority 4: If still no extension and NO MIME type, add a generic one as a last resort.
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

const FILE_TYPE_MAP = new Map([
  // Documents
  ['pdf-bestand', 'pdf'],
  ['word-document', 'docx'],
  ['word-document (97-2003)', 'doc'],
  ['powerpoint-presentatie', 'pptx'],
  ['powerpoint-presentatie (97-2003)', 'ppt'],
  ['excel-werkmap', 'xlsx'],
  ['excel-werkmap (97-2003)', 'xls'],
  ['excel-bestand', 'xls'],
  ['tekstbestand', 'txt'],
  ['opendocument-tekst', 'odt'],
  ['opendocument-spreadsheet', 'ods'],
  ['opendocument-presentatie', 'odp'],

  // Archives
  ['archief', 'zip'], // Keep as a fallback
  ['zip-archief', 'zip'],
  ['rar-archief', 'rar'],

  // Images
  ['afbeelding', 'jpg'], // Keep as a fallback
  ['png-afbeelding', 'png'],
  ['jpeg-afbeelding', 'jpg'],
  ['gif-afbeelding', 'gif'],
  ['svg-afbeelding', 'svg'],
  ['bitmap-afbeelding', 'bmp'],

  // Media
  ['video', 'mp4'],
  ['geluid', 'mp3']
]);

function getExtensionFromMimeText(mimeText) {
    if (!mimeText) return null;
    const lowerMimeText = mimeText.toLowerCase();
    for (const [key, value] of FILE_TYPE_MAP.entries()) {
        if (lowerMimeText.includes(key)) {
            return value;
        }
    }
    return null;
}

function getExtensionFromStyle(style) {
    if (!style) return null;

    // Matches patterns like: mime_img_png, mime_zip_zip, mime_video_m4v
    const match = style.match(/mime_[a-z0-9]+_([a-z0-9]+)/);
    
    if (match && match[1]) {
        const subtype = match[1].toLowerCase(); // e.g., 'png', 'zip', 'm4v'

        // Map known subtypes to common extensions
        const subtypeMap = new Map([
            ['m4v', 'mp4'],
            ['jpeg', 'jpg']
        ]);

        return subtypeMap.get(subtype) || subtype;
    }
    
    return null;
}

// Function to process each child element in the container
function processRow(row, baseUrl) {
  try {
    const baseUrlObj = new URL(baseUrl);

    // Check for folder icon
    const folderIcon = row.querySelector('.smsc_cm_body_row_block[style*="mime_folder"]');
    const folderLink = row.querySelector('a.smsc_cm_link');

    if (folderIcon && folderLink) {
      const href = folderLink.getAttribute('href');
      const absoluteUrl = new URL(href, baseUrlObj.origin).href;
      const textContent = folderLink.textContent.trim();
      
      if (textContent && absoluteUrl) {
        console.log(`[Offscreen] Found folder: ${textContent} -> ${absoluteUrl}`);
        return {
          type: 'folder',
          href: href,
          textContent: textContent,
          absoluteUrl: absoluteUrl
        };
      }
    }

    // Check for file download link
    const downloadLink = row.querySelector('a.js-download-link');
    const fileLinkForDownload = row.querySelector('a.smsc_cm_link');
    const mimeInfoEl = row.querySelector('.smsc_cm_body_row_block_mime');

    if (downloadLink && fileLinkForDownload) {
      const href = downloadLink.getAttribute('href');
      const absoluteUrl = new URL(href, baseUrlObj.origin).href;
      let fileName = fileLinkForDownload.textContent.trim();

      if (!fileName) {
        fileName = 'downloaded_file';
      }

      // Try to get extension from mime text
      if (mimeInfoEl && !hasFileExtension(fileName)) {
          const mimeText = mimeInfoEl.textContent;
          const extension = getExtensionFromMimeText(mimeText);
          if (extension) {
              fileName += '.' + extension;
          }
      }

      console.log(`[Offscreen] Found file: ${fileName} -> ${absoluteUrl}`);
      return {
        type: 'file',
        href: href,
        textContent: fileName,
        absoluteUrl: absoluteUrl
      };
    }

    // Check for generic file links (images, zip files, videos, etc.) that are not handled above
    const genericFileLink = row.querySelector('a.smsc-download__link, a[rel="attachLightbox"]');
    const styleInfoDiv = row.querySelector('.smsc_cm_body_row_block[style*="mime_"]');

    // Ensure it's not a folder and hasn't been handled by the js-download-link logic
    if (genericFileLink && styleInfoDiv && !styleInfoDiv.getAttribute('style').includes('mime_folder')) {
        const href = genericFileLink.getAttribute('href');
        if (href && href !== '#') {
            const absoluteUrl = new URL(href, new URL(baseUrl).origin).href;
            let fileName = genericFileLink.getAttribute('title') || genericFileLink.textContent.trim();

            if (!fileName) {
                fileName = 'downloaded_file';
            }

            // Try to get extension if the filename doesn't already have one
            if (!hasFileExtension(fileName)) {
                let extension = null;
                
                // Try to get extension from style first (more specific)
                const styleAttr = styleInfoDiv.getAttribute('style');
                extension = getExtensionFromStyle(styleAttr);

                // If not found in style, fallback to mime text
                if (!extension && mimeInfoEl) {
                    const mimeText = mimeInfoEl.textContent;
                    extension = getExtensionFromMimeText(mimeText);
                }
                
                // If we found an extension, append it
                if (extension) {
                    fileName += '.' + extension;
                }
            }

            console.log(`[Offscreen] Found generic file: ${fileName} -> ${absoluteUrl}`);
            return {
                type: 'file',
                href: href,
                textContent: fileName,
                absoluteUrl: absoluteUrl
            };
        }
    }

    // Fallback for HTML files opened via onclick
    const onclickLink = row.querySelector('a.smsc_cm_link[onclick*="window.open"]');
    if (onclickLink) {
        const onclickAttr = onclickLink.getAttribute('onclick');
        const urlMatch = onclickAttr.match(/window\.open\(['"]([^'"\)]+)/);

        if (urlMatch && urlMatch[1]) {
            const relativeUrl = urlMatch[1];
            const absoluteUrl = new URL(relativeUrl, baseUrlObj.origin).href;
            let fileName = onclickLink.textContent.trim();

            if (!fileName) {
                fileName = 'document';
            }

            // Ensure it has an .html extension
            if (!fileName.toLowerCase().endsWith('.html')) {
                fileName += '.html';
            }

            console.log(`[Offscreen] Found HTML file via onclick: ${fileName} -> ${absoluteUrl}`);
            return {
                type: 'file',
                href: relativeUrl,
                textContent: fileName,
                absoluteUrl: absoluteUrl,
                isHtmlFile: true
            };
        }
    }
    
    // Fallback for other potential files
    if(folderLink && !folderIcon) {
        const href = folderLink.getAttribute('href');
        if (href && href !== '#') { // Ensure it's not just a placeholder
            const absoluteUrl = new URL(href, baseUrlObj.origin).href;
            let fileName = folderLink.textContent.trim();

            console.log(`[Offscreen] Found potential file (fallback): ${fileName} -> ${absoluteUrl}`);
            return {
                type: 'file',
                href: href,
                textContent: fileName,
                absoluteUrl: absoluteUrl,
                isHtmlFile: true // Assume HTML if type is unknown
            };
        }
    }


    return null;
  } catch (error) {
    console.warn('[Offscreen] Error processing row:', error, row);
    return null;
  }
}


// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Offscreen] Message received:", request); // DEBUG

  if (request.action === 'parseHtml') {
    console.log("[Offscreen] Action 'parseHtml' received. HTML string length:", request.htmlString ? request.htmlString.length : 'undefined');
    console.log("[Offscreen] Base URL received:", request.baseUrl);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(request.htmlString, 'text/html');

      const container = doc.querySelector('.smsc_cm_body');
      if (!container) {
        throw new Error('Container .smsc_cm_body not found in the HTML.');
      }

      const rows = container.querySelectorAll('.smsc_cm_body_row');
      console.log(`[Offscreen] Found ${rows.length} rows in the container.`);

      const fileLinks = [];
      const folderLinks = [];

      rows.forEach(row => {
        const result = processRow(row, request.baseUrl);
        if (result) {
          if (result.type === 'file') {
            fileLinks.push(result);
          } else if (result.type === 'folder') {
            folderLinks.push(result);
          }
        }
      });

      // Deduplicate files and folders to prevent redundant processing
      const uniqueFileLinks = [...new Map(fileLinks.map(item => [item.absoluteUrl, item])).values()];
      const uniqueFolderLinks = [...new Map(folderLinks.map(item => [item.absoluteUrl, item])).values()];

      // Extract title for ZIP filename
      let zipFileName = doc.querySelector('#smscTopContainer > nav > h1')?.textContent.trim();
      if (!zipFileName) {
        const breadcrumbLinks = doc.querySelectorAll('.smsc_cm_breadcrumb a');
        if (breadcrumbLinks.length > 0) {
          zipFileName = breadcrumbLinks[breadcrumbLinks.length - 1].textContent.trim();
        }
      }

      console.log(`[Offscreen] Final counts - Files: ${uniqueFileLinks.length}, Folders: ${uniqueFolderLinks.length}`);

      chrome.runtime.sendMessage({
        action: 'parsedHtmlResponse',
        downloadId: request.downloadId,
        fileLinks: uniqueFileLinks,
        folderLinks: uniqueFolderLinks,
        zipFileName: zipFileName,
        originalUrl: request.baseUrl,
        pathPrefix: request.pathPrefix
      });
    } catch (error) {
      console.error("[Offscreen] Error in parseHtml:", error);
      chrome.runtime.sendMessage({
        action: 'parsedHtmlResponse',
        downloadId: request.downloadId,
        error: error.message,
        originalUrl: request.baseUrl,
        pathPrefix: request.pathPrefix
      });
    }
    return false; // Indicate that sendResponse will not be used asynchronously

  } else if (request.action === 'createAndDownloadZip') {
    console.log("[Offscreen] Received request to create and download ZIP with", request.files.length, "files");
    createAndDownloadZip(request.files, request.filename, request.downloadId);
    return false; // Not using sendResponse

  } else if (request.action === 'clearCaches') {
    console.log('[Offscreen] Clearing offscreen document caches...');
    try {
      extensionCache.clear();
      urlCache.clear();
      domQueryCache.clear();
      lowerCaseCache.clear();
      fileSystemCleanCache.clear();
      pathJoinCache.clear();
      // These caches might not be defined in all contexts, so check before clearing
      if (typeof requestCache !== 'undefined') requestCache.clear();
      if (typeof pendingRequests !== 'undefined') pendingRequests.clear();
      console.log('[Offscreen] Offscreen document caches cleared successfully');
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Offscreen] Error clearing offscreen caches:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicate asynchronous response
  }

  return false; // Default for unhandled actions
});

// Simplified ZIP creation function
async function createAndDownloadZip(files, filename, downloadId) {
  try {
    console.log("[Offscreen] Starting ZIP creation with", files.length, "files");

    const zip = new JSZip();
    let completedFiles = 0;

    // Throttled progress update function
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE = 100; // ms

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

    sendProgressUpdate(0, files.length, `Starting download of ${files.length} files...`);

    for (const file of files) {
      const fullPath = file.pathInZip || file.name;
      try {
        // Fetch the file content
        const response = await fetch(file.url); 

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        
        // Add the file to the zip. The filename and path are prepared by the background script.
        zip.file(fullPath, blob);

        completedFiles++;
        sendProgressUpdate(completedFiles, files.length, `Downloaded: ${file.name}`);

      } catch (error) {
        console.error(`[Offscreen] Error downloading ${file.name} from ${file.url}:`, error);
        
        // If a download fails, add a text file with the error details to the ZIP
        const errorMessage = `Failed to download file: ${file.name}\nURL: ${file.url}\nError: ${error.message}`;
        const errorFileName = fullPath + ".error.txt";
        zip.file(errorFileName, errorMessage);

        completedFiles++; // Also count error files as "completed" for the progress bar
        sendProgressUpdate(completedFiles, files.length, `Error: ${file.name}`);
      }
    }

    sendProgressUpdate(0, 100, 'Creating ZIP file...');

    // Generate the ZIP file blob
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6 // A good balance between speed and file size
      }
    }, (metadata) => {
      // Update progress on the zipping process itself
      if (metadata.percent) {
        const percent = Math.round(metadata.percent);
        // Here, we use the percentage as the 'current' value and 100 as 'total'
        sendProgressUpdate(percent, 100, `Compressing... ${percent}%`);
      }
    });

    // Create a temporary URL for the generated ZIP blob
    const url = URL.createObjectURL(zipBlob);

    // Send the URL to the background script to handle the final download
    chrome.runtime.sendMessage({
      action: 'downloadZipFromUrl',
      downloadId: downloadId,
      url: url,
      filename: filename
    });

    console.log("[Offscreen] ZIP file created and sent to background script for download.");

  } catch (error) {
    console.error("[Offscreen] A critical error occurred during ZIP creation:", error);
    // Notify the UI of the failure
    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      downloadId: downloadId,
      current: files.length,
      total: files.length,
      error: `ZIP creation failed: ${error.message}`
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

