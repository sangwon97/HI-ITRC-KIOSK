function normalizeHexColor(color) {
  if (typeof color !== 'string' || color.length === 0) {
    return '#79a8ca';
  }

  return color;
}

export function isWhiteCategoryColor(color) {
  return normalizeHexColor(color).toLowerCase() === '#ffffff';
}

export function getCategoryPresentation(color) {
  const normalizedColor = normalizeHexColor(color);
  const whiteCategory = isWhiteCategoryColor(normalizedColor);
  const accentColor = whiteCategory ? '#0c1a2e' : normalizedColor;

  return {
    color: normalizedColor,
    accentColor,
    textColor: accentColor,
    borderColor: whiteCategory
      ? 'rgba(12, 26, 46, 0.28)'
      : `color-mix(in srgb, ${normalizedColor} 35%, transparent)`,
    subtleBackground: whiteCategory
      ? '#ffffff'
      : `color-mix(in srgb, ${normalizedColor} 14%, transparent)`,
    solidBackground: whiteCategory
      ? '#ffffff'
      : `${normalizedColor}20`,
  };
}
