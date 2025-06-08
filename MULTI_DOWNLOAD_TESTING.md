# 🧪 Multi-Download Testing Guide

## **🚀 QUICK TEST CHECKLIST**

### **✅ Pre-Testing Setup**
1. **Reload Extension**: Go to `chrome://extensions/` and reload the SmartSchool Downloader
2. **Verify Popup**: Click extension icon - popup should open showing "No active downloads"
3. **Check Console**: Open DevTools for any immediate errors

### **✅ Single Download Test**
1. Navigate to a SmartSchool course page with files
2. Click "Download All as ZIP" button
3. **Expected**: Button changes to progress display with phases:
   - 🔍 Indexing: Blue infinite loading
   - ⬇️ Downloading: Green progress bar with file counts
   - 📦 Zipping: Purple progress bar
   - ✅ Completed: Gold completion state
4. **Verify**: Click extension icon during download to see popup progress
5. **Result**: ZIP file downloads successfully

### **✅ Multi-Download Test**
1. **Open 3 tabs** with different SmartSchool course pages
2. **Start downloads** in this order (with 5-second gaps):
   - Tab 1: Click "Download All as ZIP"
   - Tab 2: Click "Download All as ZIP" 
   - Tab 3: Click "Download All as ZIP"
3. **Monitor popup**: Click extension icon to see all 3 downloads
4. **Expected Popup Behavior**:
   - Shows 3 separate download items
   - Each with unique ID and progress
   - Different phases possible simultaneously
   - Real-time updates every second

### **✅ Popup Interface Test**
```
📊 Download Status: 2 active, 1 completed

┌─ Download 1 ─────────────────────────┐
│ 🔍 Mathematics Course               │
│ ▓▓▓▓▓▓░░░░ 60% (12/20 files)       │
│ Downloading: homework.pdf (12/20)   │
└─────────────────────────────────────┘

┌─ Download 2 ─────────────────────────┐
│ 📦 Science Course                   │
│ ▓▓▓▓▓▓▓▓▓▓ 100%                     │
│ Creating ZIP archive...              │
└─────────────────────────────────────┘

┌─ Download 3 ─────────────────────────┐
│ ✅ History Course                    │ ← Completed
│ ▓▓▓▓▓▓▓▓▓▓ Complete!                │
│ Download completed!                  │
└─────────────────────────────────────┘

        [Clear Completed Downloads]
```

### **✅ Advanced Tests**

#### **Persistence Test**
1. Start 2 downloads
2. Close browser completely
3. Reopen browser and click extension icon
4. **Expected**: Downloads should still be visible (may show as completed)

#### **Error Handling Test**
1. Start download on page with restricted access
2. **Expected**: Error phase shows in popup with clear message
3. Other downloads should continue unaffected

#### **Concurrent Completion Test**
1. Start 3 small downloads simultaneously
2. **Expected**: All complete around same time
3. **Expected**: Popup shows all as completed
4. Click "Clear Completed Downloads"
5. **Expected**: Popup shows "No active downloads"

## **🔍 DEBUGGING HELP**

### **Console Logs to Monitor**
Open DevTools on each tab and background page:

#### **Content Script Logs** (F12 on course page)
```
[ContentScript] Download request successful with ID: download_123456789_abc123
[ContentScript] Progress update received for download_123456789_abc123: 5/20 - Downloading: file.pdf (5/20)
```

#### **Background Script Logs** (chrome://extensions/ → SmartSchool Downloader → Service Worker → Console)
```
[BackgroundScript] Received downloadZip request for URL: ... with ID: download_123456789_abc123
[BackgroundScript] Sending progress update for download_123456789_abc123: 5/20 - Downloading: file.pdf
```

#### **Popup Logs** (F12 on popup)
```
[Popup] Loaded 3 downloads from storage
[Popup] Received download update for download_123456789_abc123
[Popup] Updated download display for Mathematics Course
```

### **Common Issues & Solutions**

#### **Problem**: Popup shows "No active downloads" during active download
**Solution**: Check browser console for storage errors or message passing issues

#### **Problem**: Downloads start but progress never updates
**Solution**: 
1. Check if offscreen document is created properly
2. Verify network connectivity
3. Check for CORS issues in console

#### **Problem**: Multiple downloads interfere with each other
**Solution**: 
1. Verify each download has unique ID
2. Check that progress updates include downloadId
3. Ensure content script filters by currentDownloadId

#### **Problem**: Popup doesn't update in real-time
**Solution**:
1. Check if message passing is working
2. Verify storage updates are happening
3. Confirm popup update interval is running

### **🎯 Success Criteria**

#### **✅ Full Success**
- Multiple downloads run simultaneously without interference
- Popup shows real-time progress for all downloads
- Each download progresses through all phases correctly
- ZIP files download successfully for all courses
- Completed downloads can be cleared from popup
- No console errors in any context

#### **⚠️ Partial Success** 
- Downloads work but popup doesn't update properly
- Some downloads complete while others fail
- UI shows progress but downloads are slow/inconsistent

#### **❌ Failure Indicators**
- Downloads fail to start
- Console shows JavaScript errors
- Popup never shows download progress
- Extension icon doesn't open popup
- Multiple downloads interfere with each other

## **📊 PERFORMANCE METRICS**

### **Expected Performance**
- **Download Initiation**: < 2 seconds from button click
- **Popup Response**: < 1 second to show downloads
- **Progress Updates**: Every 1-2 seconds
- **Memory Usage**: < 50MB per active download
- **Concurrent Downloads**: 3-5 downloads smoothly

### **Performance Warning Signs**
- Browser becomes sluggish during downloads
- Popup takes > 3 seconds to open
- Progress updates freeze for > 10 seconds
- Browser memory usage > 500MB for extension

## **🔧 TROUBLESHOOTING STEPS**

### **If Downloads Don't Start**
1. Check network connectivity
2. Verify you're on correct SmartSchool URL pattern
3. Reload extension and try again
4. Check browser console for permission errors

### **If Popup Doesn't Work**
1. Try clicking extension icon again
2. Check if popup.html/css/js files exist
3. Verify manifest.json has correct popup configuration
4. Test in incognito mode

### **If Downloads Interfere**
1. Check each download has unique ID in console
2. Verify background script handles multiple downloads
3. Test with smaller files first
4. Try starting downloads with longer gaps between them

## **📈 EXPECTED UPGRADE BENEFITS**

### **Before Multi-Download**
- 😞 Download one course at a time
- 😞 Wait for each download to complete
- 😞 No visibility into progress
- 😞 Have to remember which courses were downloaded

### **After Multi-Download**
- 😊 Download multiple courses simultaneously
- 😊 Real-time progress visibility
- 😊 Beautiful, informative interface
- 😊 Clear overview of all downloads
- 😊 Automatic cleanup of completed downloads

**Total Time Savings**: 60-80% reduction in download time for multiple courses!
