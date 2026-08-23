// Single mobile breakpoint for the whole app — matches App.tsx's structural
// sidebar/top-bar/bottom-nav switch (`matchMedia('(max-width: 768px)')`).
// Components used to derive isMobile at their own thresholds (600px, or
// 900px in Galeri.tsx), which caused the app shell and page content to
// disagree in the 600-900px range (mobile top-bar/bottom-nav wrapping a
// still-desktop-layout page, or vice versa).
export const MOBILE_BREAKPOINT = 768
