# SmartSchool File Downloader Chrome Extension

A Chrome extension that enhances file downloads from SmartSchool by providing batch download functionality, automatic file organization, and intelligent cache management to prevent empty file downloads.

## Features

### 🚀 Core Functionality
- **Batch File Downloads**: Download multiple files simultaneously with a single click
- **Intelligent File Detection**: Automatically detects downloadable files on SmartSchool pages
- **ZIP Archive Creation**: Combines multiple files into organized ZIP archives
- **Smart File Naming**: Preserves original filenames and directory structures

### 🛠️ Cache Management
- **Advanced Cache Busting**: Comprehensive cache clearing to prevent empty file downloads
- **Extension-Specific Clearing**: Targets only extension and SmartSchool-related caches
- **Multi-Layer Cache Control**: Clears caches across background, content, and offscreen scripts
- **Safe Operation**: Preserves user's browser data, bookmarks, and other website information

### ⚡ Performance Features
- **Optimized Downloads**: Efficient handling of large file batches
- **Memory Management**: Smart cleanup of temporary data and caches
- **Error Handling**: Robust error recovery and user feedback
- **Progress Tracking**: Real-time download progress indicators

## Installation

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/smartschool-downloader.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

5. The extension should now appear in your Chrome toolbar

### From Chrome Web Store
*Coming soon - pending publication*

## Usage

### Basic Download
1. Navigate to any SmartSchool page with downloadable files
2. Click the extension icon in your Chrome toolbar
3. Files will be automatically detected and listed
4. Click "Download Selected" to start the download process

### Cache Management
If you experience empty file downloads:
1. Click the extension icon
2. Click the "Clear Cache" button
3. Retry your downloads

The cache clearing process will:
- Clear extension-specific caches
- Remove SmartSchool domain data from the last 24 hours
- Preserve all other browser data and settings

## Technical Details

### Architecture
- **Manifest V3**: Built using the latest Chrome extension standards
- **Service Worker**: Background processing for download management
- **Content Scripts**: Page interaction and file detection
- **Offscreen Documents**: Heavy processing and cache management

### Cache Management System
The extension implements a comprehensive cache clearing system across multiple layers:

#### Background Script (`background.js`)
- Clears active download queues
- Resets HTML parsing resolvers
- Cleans storage update timers

#### Content Script (`content.js`)
- Clears DOM element caches
- Resets CSS selector caches
- Maintains page interaction state

#### Offscreen Document (`offscreen.js`)
- Clears extension-specific caches
- Resets URL and query caches
- Cleans file system and path caches
- Manages pending request queues

### Files Structure
```
├── manifest.json          # Extension configuration
├── background.js           # Service worker and download logic
├── content.js             # Page interaction and file detection
├── offscreen.js           # Heavy processing and cache management
├── offscreen.html         # Offscreen document container
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and user interactions
├── popup.css              # Popup styling
├── style.css              # Content script styling
└── jszip.min.js           # ZIP file creation library
```

## Development

### Prerequisites
- Chrome Browser (version 88+)
- Git
- Text editor or IDE

### Setup Development Environment
1. Fork and clone the repository
2. Make your changes
3. Test the extension by loading it unpacked in Chrome
4. Ensure all functionality works as expected

### Testing
The extension includes several test files for development:
- `test_fixes.html` - General functionality testing
- `test_deduplication.html` - Duplicate download prevention
- `test_javascript_downloads.html` - JavaScript file handling
- `performance_test.html` - Performance benchmarking

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Empty File Downloads
**Problem**: Downloaded files appear empty or have missing extensions  
**Solution**: Use the "Clear Cache" button in the extension popup

### Slow Download Performance
**Problem**: Downloads are taking longer than expected  
**Solution**: Try downloading smaller batches of files or clear the cache

### Extension Not Detecting Files
**Problem**: No files are shown for download  
**Solution**: Refresh the SmartSchool page and ensure you're logged in

## Privacy & Security

- **No Data Collection**: The extension does not collect or transmit personal data
- **Local Processing**: All file processing happens locally in your browser
- **Secure Downloads**: Uses Chrome's built-in download security features
- **Minimal Permissions**: Requests only necessary permissions for functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### Version 1.0.0
- Initial release
- Basic file download functionality
- ZIP archive creation
- Cache management system

### Recent Updates
- Enhanced cache busting functionality
- Improved error handling
- Performance optimizations
- Better user feedback

## Support

If you encounter any issues or have feature requests:
1. Check the [Issues](https://github.com/your-username/smartschool-downloader/issues) page
2. Create a new issue with detailed information
3. Include Chrome version, extension version, and steps to reproduce

## Acknowledgments

- Built for SmartSchool users
- Uses [JSZip](https://stuk.github.io/jszip/) for ZIP file creation
- Thanks to the Chrome Extensions community for documentation and examples
