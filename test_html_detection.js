// Test script to verify HTML file detection logic
// This simulates the HTML parsing logic from offscreen.js

function testHtmlFileDetection() {
    console.log("Testing HTML file detection logic...");
    
    // Test URL parsing logic (Node.js compatible)
    const baseUrl = "https://spc.smartschool.be/Documents/Index/Index/courseID/510/parentID/411260/ssID/65";
    const docId = "411262";
    
    try {
        const url = new URL(baseUrl);
        const pathParts = url.pathname.split('/');
        
        console.log("URL pathname:", url.pathname);
        console.log("Path parts:", pathParts);
        
        const courseIdIndex = pathParts.indexOf('courseID');
        const ssIdIndex = pathParts.indexOf('ssID');
        
        console.log("courseID index:", courseIdIndex);
        console.log("ssID index:", ssIdIndex);
        
        if (courseIdIndex !== -1 && ssIdIndex !== -1) {
            const courseId = pathParts[courseIdIndex + 1];
            const ssId = pathParts[ssIdIndex + 1];
            
            console.log("Extracted courseID:", courseId);
            console.log("Extracted ssID:", ssId);
            
            const downloadUrl = `${url.origin}/Documents/Download/Index/htm/1/courseID/${courseId}/docID/${docId}/ssID/${ssId}`;
            console.log("Constructed download URL:", downloadUrl);
            
            const expectedUrl = "https://spc.smartschool.be/Documents/Download/Index/htm/1/courseID/510/docID/411262/ssID/65";
            console.log("Expected URL:", expectedUrl);
            console.log("URLs match:", downloadUrl === expectedUrl);
            
            // Test selector logic (simplified)
            console.log("\nTesting CSS selector logic:");
            console.log("Selector for filtering external links:");
            console.log('a[href$=".html"]:not(.smsc_cm_breadcrumb):not([class*="breadcrumb"]):not(.smsc_cm_body_row_block_inline a)');
            
            console.log("\nThis selector should:");
            console.log("✓ Match HTML files with download URLs");
            console.log("✗ Exclude breadcrumb links");
            console.log("✗ Exclude links inside .smsc_cm_body_row_block_inline (preview content)");
            
        } else {
            console.log("ERROR: Could not find courseID or ssID in URL");
        }
    } catch (error) {
        console.error("Error parsing URL:", error);
    }
    
    console.log("\nHTML file detection test completed.");
    console.log("\nKey improvements made:");
    console.log("1. ✅ Added filtering for preview content links (.smsc_cm_body_row_block_inline a)");
    console.log("2. ✅ Added special detection for HTML files without download buttons");
    console.log("3. ✅ Added proper download URL construction for HTML files");
    console.log("4. ✅ Enhanced file name extraction from SmartSchool structure");
}

// Run the test
testHtmlFileDetection();
