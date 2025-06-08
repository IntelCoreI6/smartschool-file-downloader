# SmartSchool ZIP Downloader - HTML File Detection Enhancement

## Issue Resolved
Fixed the issue where external links within HTML file previews were being incorrectly detected as downloadable files, and added support for downloading HTML files without explicit download buttons.

## Changes Made

### 1. Enhanced CSS Selectors in background.js
**File:** `background.js`
**Lines:** ~280-330

**Problem:** External links in HTML previews (`.smsc_cm_body_row_block_inline`) were being detected as downloadable files.

**Solution:** Added `:not(.smsc_cm_body_row_block_inline a)` to all file extension selectors to exclude links inside preview content blocks.

**Before:**
```javascript
'a[href$=".html"]:not(.smsc_cm_breadcrumb):not([class*="breadcrumb"])',
```

**After:**
```javascript
'a[href$=".html"]:not(.smsc_cm_breadcrumb):not([class*="breadcrumb"]):not(.smsc_cm_body_row_block_inline a)',
```

This change was applied to all 30+ file type selectors (HTML, PDF, DOC, etc.).

### 2. Added HTML File Detection Logic in offscreen.js
**File:** `offscreen.js`
**Lines:** ~20-90

**Problem:** HTML files without explicit download buttons weren't being detected or downloaded.

**Solution:** Added special detection logic for HTML file containers that:

1. **Identifies HTML file containers:** Looks for `div[id^="docID_"]` elements
2. **Detects HTML files:** Checks for HTML file indicators in `.fileinfo` text or preview content
3. **Constructs download URLs:** Builds proper SmartSchool download URLs using the pattern:
   ```
   /Documents/Download/Index/htm/1/courseID/{courseID}/docID/{docID}/ssID/{ssID}
   ```
4. **Extracts filenames:** Gets filename from `.name a.smsc_cm_link` elements
5. **Avoids duplicates:** Only adds files that don't already have download links

### 3. URL Construction Algorithm
**Process:**
1. Extract `docID` from the container's `id` attribute (`docID_411262` → `411262`)
2. Parse the current page URL to extract `courseID` and `ssID` parameters
3. Construct the download URL using the SmartSchool pattern
4. Extract the filename from the name element and ensure it has `.html` extension

**Example:**
- Input URL: `https://spc.smartschool.be/Documents/Index/Index/courseID/510/parentID/411260/ssID/65`
- Container ID: `docID_411262`
- Output URL: `https://spc.smartschool.be/Documents/Download/Index/htm/1/courseID/510/docID/411262/ssID/65`

### 4. Integration with Existing System
**File:** `offscreen.js`
**Lines:** ~230-250

Added the detected HTML files to the main file processing pipeline:
- Combined with regular file links
- Deduplicated by absolute URL
- Processed through the same download mechanism

## Technical Details

### URL Pattern Analysis
The SmartSchool download URL pattern for HTML files:
```
https://{domain}/Documents/Download/Index/htm/{version}/courseID/{courseID}/docID/{docID}/ssID/{ssID}
```

Where:
- `{domain}`: SmartSchool instance domain
- `{version}`: Usually `1` (sometimes `0`)
- `{courseID}`: Course identifier from current URL
- `{docID}`: Document identifier from container ID
- `{ssID}`: Session/school identifier from current URL

### Filtering Logic
The enhanced filtering now excludes:
1. Breadcrumb links (`.smsc_cm_breadcrumb`)
2. Navigation elements (`nav`, `.nav`, `header`, `footer`)
3. Links inside preview content blocks (`.smsc_cm_body_row_block_inline a`)
4. Navigation-like text ("home", "back", "next", etc.)

## Testing
Created `test_html_detection.js` to verify:
- ✅ URL construction algorithm works correctly
- ✅ CSS selectors properly exclude preview content
- ✅ File detection logic follows SmartSchool patterns

## Impact
- **Fixed:** External links in HTML previews no longer cause download errors
- **Enhanced:** HTML files without download buttons are now properly detected and downloaded
- **Improved:** Better file name extraction and URL construction
- **Maintained:** All existing functionality for traditional download buttons

## Files Modified
1. `background.js` - Enhanced CSS selectors with preview content filtering
2. `offscreen.js` - Added HTML file detection and URL construction logic
3. `test_html_detection.js` - Created test file to verify implementation

The extension now properly handles both traditional SmartSchool downloads and HTML files with preview content, avoiding false positives while expanding download capabilities.
