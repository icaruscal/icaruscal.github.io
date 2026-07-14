/** Pastel accents tuned for dark / black backgrounds */
export const TREE_LEVEL_COLORS = [
    '#8ecae6', // cyan
    '#95d5b2', // mint
    '#ffe066', // yellow
    '#ffb4a2', // peach
    '#cbb2fe', // lavender
    '#f2a7c3', // rose
    '#9ad0f5', // sky
    '#b5e48c', // lime
    '#ffd6a5', // apricot
    '#a0c4ff', // periwinkle
    '#fdffb6', // pale lemon
    '#caffbf', // seafoam
    '#ffc6ff', // orchid
    '#90e0ef', // aqua
    '#e9c46a', // gold
    '#bde0fe', // powder blue
    '#ffadad', // coral
    '#d4a373', // sand
    '#80ed99', // spring green
    '#e0aaff', // soft violet
    '#89c2d9', // steel cyan
    '#b7e4c7', // soft green
    '#ffda77', // butter
    '#f8ad9d', // soft peach
    '#d0bfff', // soft lilac
    '#f7cad0', // blush
    '#74c0fc', // bright sky
    '#d8f3dc', // pale mint
    '#ffbf69', // tangerine
    '#adb5bd', // cool gray
    '#f1faee', // ivory mint
    '#a7c957', // olive lime
    '#f4a261', // clay orange
    '#e9d8a6', // wheat
    '#94d2bd', // teal mint
    '#ee9b00', // amber
    '#ca7df9', // bright orchid
    '#72efdd', // turquoise
    '#ff85a1', // watermelon
    '#b8c0ff', // soft indigo
    '#c1fba4', // chartreuse pastel
    '#ffd60a', // vivid gold
    '#48cae4', // ocean
    '#fec89a', // cream peach
    '#9bf6ff', // ice blue
    '#ffc8dd', // candy pink
    '#bdb2ff', // periwinkle violet
    '#ff9f1c', // soft orange
    '#a3c4f3', // dusty blue
    '#d9ed92', // yellow green
];

/** Default text color when level colors are disabled (matches site text) */
export const TREE_MUTED_COLOR = '#ffffff';

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

export function colorForName(name) {
    if (!name) {
        return TREE_MUTED_COLOR;
    }
    return TREE_LEVEL_COLORS[hashString(String(name)) % TREE_LEVEL_COLORS.length];
}
