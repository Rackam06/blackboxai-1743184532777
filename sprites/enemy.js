// Enemy sprite as a data URL (alien-like creature)
const ENEMY_SPRITE = `data:image/svg+xml;base64,${btoa(`
<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <g fill="#ff0000">
        <!-- Body -->
        <path d="M4 10 L10 4 L16 10 L10 16 Z"/>
        <!-- Eyes -->
        <circle cx="8" cy="8" r="1"/>
        <circle cx="12" cy="8" r="1"/>
        <!-- Mandibles -->
        <path d="M7 12 L10 10 L13 12"/>
    </g>
</svg>
`)}`;

// Create and load the sprite
const enemyImage = new Image();
enemyImage.src = ENEMY_SPRITE;