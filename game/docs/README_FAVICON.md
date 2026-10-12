# Favicon Setup Guide

This guide explains how to generate and implement the favicon for the EFTO game.

## Files Created

- `favicon.svg` - Vector-based favicon source file
- `README_FAVICON.md` - This documentation file

## Converting SVG to ICO

### Method 1: Online Conversion (Recommended)
1. Go to any of these online converters:
   - https://favicon.io/favicon-converter/
   - https://convertio.co/svg-ico/
   - https://cloudconvert.com/svg-to-ico

2. Upload the `favicon.svg` file
3. Select multiple sizes: 16x16, 32x32, 48x48 (most common)
4. Download the generated `favicon.ico` file
5. Place it in your web root directory

### Method 2: Using ImageMagick (Command Line)
If you have ImageMagick installed:
```bash
# Convert SVG to ICO with multiple sizes
magick favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
```

### Method 3: Using GIMP (Free Software)
1. Open `favicon.svg` in GIMP
2. Scale to 32x32 pixels (Image → Scale Image)
3. Export as ICO (File → Export As → favicon.ico)
4. In the ICO export dialog, select multiple sizes if available

## Implementation in HTML Files

The favicon has been automatically added to your HTML files. If you need to add it manually, include these lines in the `<head>` section:

```html
<!-- Standard favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- Modern browsers -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<!-- Apple devices -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Android devices -->
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">

<!-- Small icon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
```

## Complete Favicon Package (Optional)

For a complete favicon package, you can generate additional formats:

### Required Files:
- `favicon.ico` - Main favicon (16x16, 32x32, 48x48)
- `favicon.svg` - Vector version for modern browsers
- `favicon-16x16.png` - 16x16 PNG
- `favicon-32x32.png` - 32x32 PNG
- `apple-touch-icon.png` - 180x180 for Apple devices
- `android-chrome-192x192.png` - 192x192 for Android
- `android-chrome-512x512.png` - 512x512 for Android

### Generate from SVG:
```bash
# Generate different sizes (if you have ImageMagick)
magick favicon.svg -resize 16x16 favicon-16x16.png
magick favicon.svg -resize 32x32 favicon-32x32.png
magick favicon.svg -resize 180x180 apple-touch-icon.png
magick favicon.svg -resize 192x192 android-chrome-192x192.png
magick favicon.svg -resize 512x512 android-chrome-512x512.png
```

## Favicon Design Details

The created favicon features:
- **Circular design** with a cyan-to-teal gradient background
- **"EFTO" text** in gold gradient
- **Purple gem/crystal** element representing game items
- **Golden stars** for gaming aesthetic
- **32x32 base size** for optimal clarity at small sizes

## Testing

After implementation, test your favicon by:
1. Opening your website in a browser
2. Checking the browser tab for the favicon
3. Bookmarking the page to see if the favicon appears
4. Testing on mobile devices

## Deployment Notes

When deploying with the API configuration system:
- Place `favicon.ico` in the same directory as your `index.html`
- If using a `basePath`, ensure favicon links account for the path
- Most browsers will automatically look for `/favicon.ico` in the root

For deployments in subdirectories, you may need to update the favicon links:
```html
<link rel="icon" type="image/x-icon" href="/your-subfolder/favicon.ico">
``` 