export interface ToolbarLayout {
  addIconSize: number;
  markerIconSize: number;
  buttonPaddingHorizontal: number;
  gap: number;
  containerPaddingHorizontal: number;
  clearButtonSize: number;
}

export interface ToolbarLayoutInput {
  windowWidth: number;
  buttonCount: number;
  hasClearButton: boolean;
}

const BUTTON_BORDER_WIDTH = 1.5;

const ROOMY: ToolbarLayout = {
  addIconSize: 16,
  markerIconSize: 20,
  buttonPaddingHorizontal: 8,
  gap: 8,
  containerPaddingHorizontal: 16,
  clearButtonSize: 34,
};

const TIGHT: ToolbarLayout = {
  addIconSize: 10,
  markerIconSize: 14,
  buttonPaddingHorizontal: 2,
  gap: 2,
  containerPaddingHorizontal: 6,
  clearButtonSize: 26,
};

export function measureToolbarWidth(
  layout: ToolbarLayout,
  buttonCount: number,
  hasClearButton: boolean,
): number {
  const buttonWidth =
    layout.addIconSize +
    layout.markerIconSize +
    layout.buttonPaddingHorizontal * 2 +
    BUTTON_BORDER_WIDTH * 2;
  const buttonsWidth = buttonCount * buttonWidth + Math.max(buttonCount - 1, 0) * layout.gap;
  const clearWidth = hasClearButton ? layout.clearButtonSize + layout.gap : 0;
  return layout.containerPaddingHorizontal * 2 + buttonsWidth + clearWidth;
}

function interpolate(ratio: number, from: number, to: number): number {
  return Math.floor(from + (to - from) * ratio);
}

export function getToolbarLayout({
  windowWidth,
  buttonCount,
  hasClearButton,
}: ToolbarLayoutInput): ToolbarLayout {
  const roomyWidth = measureToolbarWidth(ROOMY, buttonCount, hasClearButton);
  if (roomyWidth <= windowWidth) return ROOMY;

  const tightWidth = measureToolbarWidth(TIGHT, buttonCount, hasClearButton);
  const span = roomyWidth - tightWidth;
  const ratio = span <= 0 ? 0 : Math.min(Math.max((windowWidth - tightWidth) / span, 0), 1);

  return {
    addIconSize: interpolate(ratio, TIGHT.addIconSize, ROOMY.addIconSize),
    markerIconSize: interpolate(ratio, TIGHT.markerIconSize, ROOMY.markerIconSize),
    buttonPaddingHorizontal: interpolate(
      ratio,
      TIGHT.buttonPaddingHorizontal,
      ROOMY.buttonPaddingHorizontal,
    ),
    gap: interpolate(ratio, TIGHT.gap, ROOMY.gap),
    containerPaddingHorizontal: interpolate(
      ratio,
      TIGHT.containerPaddingHorizontal,
      ROOMY.containerPaddingHorizontal,
    ),
    clearButtonSize: interpolate(ratio, TIGHT.clearButtonSize, ROOMY.clearButtonSize),
  };
}
