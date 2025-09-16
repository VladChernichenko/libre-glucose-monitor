#!/bin/bash

# Simple Glucose Widget Launcher for macOS
# Opens the HTML widget in a borderless Chrome/Safari window

WIDGET_PATH="$(dirname "$0")/glucose-widget.html"
WIDGET_FULL_PATH="file://$(cd "$(dirname "$0")" && pwd)/glucose-widget.html"

echo "🩸 Starting Glucose Monitor Widget..."
echo "📍 Widget path: $WIDGET_FULL_PATH"

# Function to launch with Chrome (if available)
launch_with_chrome() {
    if command -v google-chrome &> /dev/null || command -v "Google Chrome" &> /dev/null; then
        echo "🌐 Launching with Chrome..."
        open -a "Google Chrome" --args \
            --app="$WIDGET_FULL_PATH" \
            --window-size=200,80 \
            --window-position=1720,20 \
            --disable-web-security \
            --disable-features=VizDisplayCompositor \
            --no-first-run \
            --no-default-browser-check \
            --disable-default-apps
        return 0
    fi
    return 1
}

# Function to launch with Safari (fallback)
launch_with_safari() {
    echo "🧭 Launching with Safari..."
    osascript <<EOF
tell application "Safari"
    activate
    make new document with properties {URL:"$WIDGET_FULL_PATH"}
    
    -- Try to make it look like a widget
    tell window 1
        set bounds to {1720, 20, 1920, 100}
    end tell
end tell
EOF
}

# Function to launch with default browser
launch_with_default() {
    echo "🌐 Launching with default browser..."
    open "$WIDGET_FULL_PATH"
}

# Try different launch methods
if ! launch_with_chrome; then
    echo "⚠️  Chrome not found, trying Safari..."
    if ! launch_with_safari; then
        echo "⚠️  Safari failed, using default browser..."
        launch_with_default
    fi
fi

echo "✅ Glucose Widget launched!"
echo "💡 Tip: Bookmark the widget page for easy access"
echo "🔄 The widget will auto-refresh every minute"
echo "🖱️  Click the widget to refresh manually"

# Optional: Keep script running to monitor the widget
read -p "Press Enter to close this launcher..."
