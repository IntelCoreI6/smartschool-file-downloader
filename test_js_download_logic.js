// Test script to verify JavaScript download detection logic
const fs = require('fs');

// Read the example2.html file
const htmlContent = fs.readFileSync('example2.html', 'utf8');

// Simulate DOM-like operations
function querySelector(html, selector) {
  // Simple mock implementation for testing
  if (selector === 'a[onclick*="/Documents/Download/"]') {
    const match = html.match(/<a[^>]*onclick="[^"]*\/Documents\/Download\/[^"]*"[^>]*>([^<]*)<\/a>/);
    if (match) {
      return {
        getAttribute: (attr) => {
          if (attr === 'onclick') {
            const onclickMatch = match[0].match(/onclick="([^"]*)"/);
            return onclickMatch ? onclickMatch[1].replace(/&quot;/g, '"') : null;
          }
          return null;
        }
      };
    }
  }
  return null;
}

// Test the JavaScript download detection logic
function testJavaScriptDownloadDetection() {
  console.log('🧪 Testing JavaScript Download Detection Logic\n');
  
  // Look for onclick download link
  const jsDownloadLink = querySelector(htmlContent, 'a[onclick*="/Documents/Download/"]');
  
  if (jsDownloadLink) {
    console.log('✅ Found JavaScript download link');
    
    const onclickAttr = jsDownloadLink.getAttribute('onclick');
    console.log('📋 onclick attribute:', onclickAttr);
    
    // Extract download URL from onclick JavaScript
    const urlMatch = onclickAttr.match(/window\.open\("([^"]*)"/) || onclickAttr.match(/window\.open\('([^']*)'/);
    
    if (urlMatch && urlMatch[1]) {
      const downloadUrl = urlMatch[1];
      console.log('🔗 Extracted download URL:', downloadUrl);
      
      // Test if this matches expected pattern
      const expectedUrl = '/Documents/Download/Index/htm/1/courseID/510/docID/411262/ssID/65';
      if (downloadUrl === expectedUrl) {
        console.log('✅ Download URL matches expected pattern');
      } else {
        console.log('❌ Download URL does not match expected pattern');
        console.log('   Expected:', expectedUrl);
        console.log('   Actual  :', downloadUrl);
      }
    } else {
      console.log('❌ Failed to extract download URL from onclick attribute');
    }
  } else {
    console.log('❌ No JavaScript download link found');
  }
  
  // Test external link filtering
  console.log('\n🔍 Testing External Link Filtering');
  const previewSection = htmlContent.match(/<div class="smsc_cm_body_row_block_inline">([\s\S]*?)<\/div>/);
  if (previewSection) {
    const previewContent = previewSection[1];
    const externalLink = previewContent.match(/https:\/\/www\.st-andrews\.ac\.uk[^"]+/);
    if (externalLink) {
      console.log('📋 Found external link in preview:', externalLink[0]);
      console.log('✅ External link should be ignored (in .smsc_cm_body_row_block_inline section)');
    }
  }
}

// Run the test
testJavaScriptDownloadDetection();
