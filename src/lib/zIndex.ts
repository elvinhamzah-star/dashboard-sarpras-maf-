// Named z-index scale — replaces the scattered magic numbers (200, 250, 300,
// 320, 500, 1000, 1200, 1300, 9999, 10000) that used to be picked ad hoc per
// modal, with two of them coincidentally colliding on the same value despite
// needing to stack in different places. Each tier documents WHY it needs to
// sit above the tier below it, so a new modal can be placed correctly instead
// of guessing a number.
//
// ModalShell's own default (100) is the implicit base tier — most CRUD modals
// never override zIndex at all, so there's no Z_MODAL_BASE export here; these
// constants are for the cases that must stack above that default.

// Popups/pickers opened directly from a page (not from inside another modal):
// Beranda's Progress/Status/Program-detail popups (mutually exclusive with
// each other), Galeri's program picker, Pekerjaan's blocked-access dialog.
export const Z_MODAL_POPUP = 200

// CRUD edit modals that must render above a Z_MODAL_POPUP — e.g. EditProgramModal
// or HasilFormModal opened from a PekerjaanDetail embedded inside a Beranda popup.
export const Z_MODAL_STACKED = 300

// Content viewers/pickers opened from within a Z_MODAL_STACKED (or lower) modal —
// PdfViewerModal, and the inline link/date pickers in AddDocumentationModal /
// AddTransactionModal.
export const Z_MODAL_NESTED = 500

// Modals reached from Beranda's alert/metric summary cards (BerandaAlerts'
// over-budget detail, MetricDetailModal) — set defensively above the tiers
// below since they can be triggered from several different page contexts.
export const Z_MODAL_DEEP = 1000

// Bespoke management sheets/viewers nested inside a Z_MODAL_DEEP context —
// Keuangan's bukti-transaksi viewer, PekerjaanDetail's "Kelola Dokumen" sheet.
export const Z_MODAL_DEEPER = 1200

// Dropdown/DatePicker popovers (src/components/ui/Dropdown.tsx, DatePicker.tsx).
// Always the top modal-content tier since these must escape whichever modal
// they're rendered inside, regardless of that modal's own tier.
export const Z_DROPDOWN_IN_MODAL = 1300

// Top-priority alerts that must be reachable no matter what else is open —
// "Akses Dibatasi" dialogs, PresentationMode's backdrop.
export const Z_ALERT_OVERLAY = 9999

// Controls layered on top of PresentationMode itself.
export const Z_PRESENTATION_CONTROLS = 10000
