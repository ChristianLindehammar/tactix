import { getToolbarLayout, measureToolbarWidth } from '@/utils/toolbarLayout';

describe('getToolbarLayout', () => {
  it('fits six marker buttons and the clear button on a narrow phone', () => {
    const layout = getToolbarLayout({ windowWidth: 320, buttonCount: 6, hasClearButton: true });

    expect(measureToolbarWidth(layout, 6, true)).toBeLessThanOrEqual(320);
  });

  it('keeps the roomy sizing when there is enough width', () => {
    const layout = getToolbarLayout({ windowWidth: 1024, buttonCount: 6, hasClearButton: true });

    expect(layout.markerIconSize).toBe(20);
    expect(layout.gap).toBe(8);
  });

  it('never shrinks below the legible minimum on an extremely narrow screen', () => {
    const layout = getToolbarLayout({ windowWidth: 200, buttonCount: 6, hasClearButton: true });

    expect(layout.markerIconSize).toBe(14);
    expect(layout.addIconSize).toBe(10);
  });

  it.each([320, 360, 375, 390, 412, 428])(
    'fits the toolbar on a %ipx wide screen',
    (windowWidth) => {
      const layout = getToolbarLayout({ windowWidth, buttonCount: 6, hasClearButton: true });

      expect(measureToolbarWidth(layout, 6, true)).toBeLessThanOrEqual(windowWidth);
    },
  );
});
