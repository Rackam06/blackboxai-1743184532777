// Marine sprite as a data URL (top-down view of a space marine)
const MARINE_SPRITE = `data:image/svg+xml;base64,${btoa(`
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fill="#00ff9d">
        <!-- Body -->
        <circle cx="12" cy="12" r="8"/>
        <!-- Armor plates -->
        <path d="M8 8 L16 8 L16 16 L8 16 Z"/>
        <!-- Weapon -->
        <rect x="12" y="8" width="12" height="3" rx="1"/>
    </g>
</svg>
`)}`;

// Create and load the sprite
const marineImage = new Image();
marineImage.src = MARINE_SPRITE;