#!/bin/bash

# Asset Generation Script for PairCam
# Generates placeholder favicon and OG images for SEO optimization
# Replace these with professional designs for production

echo "🎨 Generating PairCam Assets for SEO..."

# Colors
PRIMARY_COLOR="#ec4899"
SECONDARY_COLOR="#a855f7"
BG_COLOR="white"

# Create public directory if it doesn't exist
mkdir -p public

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing instructions:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

echo "✅ ImageMagick found, generating images..."

# Function to create gradient background
create_gradient_bg() {
    local size=$1
    local output=$2
    convert -size "${size}" gradient:"${PRIMARY_COLOR}"-"${SECONDARY_COLOR}" "$output"
}

# Function to create icon with text
create_icon() {
    local size=$1
    local output=$2
    
    # Create gradient background
    convert -size "${size}" gradient:"${PRIMARY_COLOR}"-"${SECONDARY_COLOR}" \
        -fill white \
        -gravity center \
        -pointsize $((${size%x*} / 3)) \
        -font Arial-Bold \
        -annotate +0+0 "PC" \
        "$output"
    
    echo "  ✓ Created $output"
}

# Generate favicons
echo ""
echo "📱 Generating favicons..."
create_icon "16x16" "public/favicon-16x16.png"
create_icon "32x32" "public/favicon-32x32.png"
create_icon "192x192" "public/favicon-192x192.png"
create_icon "512x512" "public/favicon-512x512.png"

# Generate Apple Touch Icon
echo ""
echo "🍎 Generating Apple Touch Icon..."
create_icon "180x180" "public/apple-touch-icon.png"

# Generate OG Image (1200x630)
echo ""
echo "📸 Generating Open Graph Image..."
convert -size 1200x630 gradient:"${PRIMARY_COLOR}"-"${SECONDARY_COLOR}" \
    -fill white \
    -gravity center \
    -pointsize 72 \
    -font Arial-Bold \
    -annotate +0-100 "PairCam" \
    -pointsize 36 \
    -font Arial \
    -annotate +0+0 "Free Random Video Chat" \
    -pointsize 24 \
    -annotate +0+60 "Meet New People Online Instantly" \
    public/og-image.jpg

echo "  ✓ Created public/og-image.jpg"

# Generate Twitter Image (1200x628)
echo ""
echo "🐦 Generating Twitter Card Image..."
convert -size 1200x628 gradient:"${PRIMARY_COLOR}"-"${SECONDARY_COLOR}" \
    -fill white \
    -gravity center \
    -pointsize 72 \
    -font Arial-Bold \
    -annotate +0-100 "PairCam" \
    -pointsize 36 \
    -font Arial \
    -annotate +0+0 "Free Random Video Chat" \
    -pointsize 24 \
    -annotate +0+60 "Safe • Anonymous • Instant" \
    public/twitter-image.jpg

echo "  ✓ Created public/twitter-image.jpg"

# Generate Logo (512x512)
echo ""
echo "🎯 Generating logo..."
create_icon "512x512" "public/logo.png"

# Generate root favicon.ico
echo ""
echo "🌐 Generating favicon.ico..."
convert public/favicon-32x32.png public/favicon-16x16.png public/favicon.ico
echo "  ✓ Created public/favicon.ico"

echo ""
echo "✅ All assets generated successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Replace placeholder images with professional designs"
echo "  2. Run 'npm run build' to bundle with new assets"
echo "  3. Test Open Graph tags: https://developers.facebook.com/tools/debug/"
echo "  4. Test Twitter cards: https://cards-dev.twitter.com/validator"
echo "  5. Test structured data: https://search.google.com/test/rich-results"
echo ""
echo "🎨 For professional assets, consider:"
echo "  - Canva (canva.com)"
echo "  - Figma (figma.com)"
echo "  - Hire a designer on Fiverr/Upwork"
echo ""

