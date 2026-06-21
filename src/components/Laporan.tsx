import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchPrograms, fetchDocumentation, Program, Documentation } from '../lib/supabase'
import { getDriveThumbnailUrl, monthLabelFromYM, monthsFromDates } from '../lib/data'
import MonthSelector from './MonthSelector'

interface LaporanProps {
  selectedMonth: string | null
  onMonthChange: (ym: string | null) => void
}

type Slide =
  | { kind: 'cover' }
  | { kind: 'scope' }
  | { kind: 'section'; num: string; title: string }
  | { kind: 'program'; program: Program; before: Documentation[]; after: Documentation[]; other: Documentation[] }
  | { kind: 'closing' }

const FASE_AWAL = 'Kondisi Awal'
const FASE_AKHIR = 'Kondisi Akhir'

// Accent palette for the deck
const GOLD = '#D4B068'
const INK = '#0A1628'

const driveImg = (doc: Documentation) => getDriveThumbnailUrl(doc.link_foto, 'w800') || ''

export default function Laporan({ selectedMonth, onMonthChange }: LaporanProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [docs, setDocs] = useState<Documentation[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [isFs, setIsFs] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchDocumentation()]).then(([p, d]) => {
      if (p.data) setPrograms(p.data)
      if (d.data) setDocs(d.data)
      setLoading(false)
    })
  }, [])

  const availableMonths = monthsFromDates(docs.map(d => d.tanggal))

  const slides = useMemo<Slide[]>(() => {
    const scoped = selectedMonth ? docs.filter(d => d.tanggal?.slice(0, 7) === selectedMonth) : docs
    // programs that have at least one in-scope photo, grouped by category
    const byProgram = new Map<string, Documentation[]>()
    scoped.forEach(d => {
      const arr = byProgram.get(d.program_id) || []
      arr.push(d)
      byProgram.set(d.program_id, arr)
    })

    const progsWithDocs = programs
      .filter(p => byProgram.has(p.id))
      .sort((a, b) => (a.jenis_pekerjaan || '').localeCompare(b.jenis_pekerjaan || '') || a.nama_pekerjaan.localeCompare(b.nama_pekerjaan))

    const out: Slide[] = [{ kind: 'cover' }, { kind: 'scope' }]

    let lastCat = ''
    let catNum = 0
    progsWithDocs.forEach(p => {
      const cat = p.jenis_pekerjaan || 'Lainnya'
      if (cat !== lastCat) {
        catNum++
        out.push({ kind: 'section', num: String(catNum).padStart(2, '0'), title: cat })
        lastCat = cat
      }
      const pdocs = byProgram.get(p.id) || []
      out.push({
        kind: 'program',
        program: p,
        before: pdocs.filter(d => d.fase === FASE_AWAL),
        after: pdocs.filter(d => d.fase === FASE_AKHIR),
        other: pdocs.filter(d => d.fase !== FASE_AWAL && d.fase !== FASE_AKHIR),
      })
    })

    out.push({ kind: 'closing' })
    return out
  }, [programs, docs, selectedMonth])

  // clamp index when slide set changes
  useEffect(() => { setIdx(i => Math.min(i, slides.length - 1)) }, [slides.length])

  const go = (delta: number) => setIdx(i => Math.max(0, Math.min(slides.length - 1, i + delta)))

  const toggleFs = () => {
    if (!document.fullscreenElement) stageRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      else if (e.key.toLowerCase() === 'f') toggleFs()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const totalDocs = useMemo(() => (selectedMonth ? docs.filter(d => d.tanggal?.slice(0, 7) === selectedMonth) : docs).length, [docs, selectedMonth])
  const periodLabel = selectedMonth ? monthLabelFromYM(selectedMonth) : 'Semua Periode'

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>Menyiapkan laporan…</div>
  }

  const current = slides[idx]
  const hasContent = slides.some(s => s.kind === 'program')

  return (
    <div style={{ padding: '28px 28px 40px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em' }}>Laporan Presentasi</h1>
          <p style={{ color: '#5C6B82', fontSize: 13, marginTop: 5 }}>
            Dokumentasi sebelum &amp; sesudah — siap dipresentasikan layar penuh
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {availableMonths.length > 0 && (
            <MonthSelector value={selectedMonth} months={availableMonths} onChange={onMonthChange} allLabel="Semua Periode" />
          )}
          <button
            onClick={toggleFs}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9,
              border: 'none', backgroundColor: '#1A6FE8', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(26,111,232,0.3)',
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
            </svg>
            Layar Penuh
          </button>
        </div>
      </div>

      {!hasContent ? (
        <div style={{
          border: '1px dashed rgba(15,23,42,0.15)', borderRadius: 16, padding: '56px 24px',
          textAlign: 'center', color: '#9CAABB', backgroundColor: '#fff',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#5C6B82', marginBottom: 6 }}>
            Belum ada dokumentasi untuk {periodLabel.toLowerCase()}
          </div>
          <div style={{ fontSize: 12.5 }}>Tambahkan foto di halaman Galeri, atau pilih periode lain.</div>
        </div>
      ) : (
        <>
          {/* Stage */}
          <div
            ref={stageRef}
            style={isFs
              ? { position: 'fixed', inset: 0, backgroundColor: '#05080F', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }
              : { display: 'flex', justifyContent: 'center' }}
          >
            <div style={{
              position: 'relative',
              width: isFs ? 'min(100vw, 177.78vh)' : '100%',
              aspectRatio: '16 / 9',
              containerType: 'size',
              borderRadius: isFs ? 0 : 16,
              overflow: 'hidden',
              boxShadow: isFs ? 'none' : '0 12px 40px rgba(13,24,41,0.22)',
              background: `radial-gradient(120% 120% at 80% 10%, #13243C 0%, ${INK} 55%, #070E1A 100%)`,
            }}>
              <SlideView slide={current} periodLabel={periodLabel} totalPrograms={slides.filter(s => s.kind === 'program').length} totalDocs={totalDocs} />

              {/* In-stage controls (overlay) */}
              <DeckControls idx={idx} total={slides.length} onPrev={() => go(-1)} onNext={() => go(1)} isFs={isFs} onToggleFs={toggleFs} />
            </div>
          </div>

          {/* Filmstrip below stage (hidden in fullscreen) */}
          {!isFs && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  title={slideLabel(s)}
                  style={{
                    height: 8, minWidth: i === idx ? 28 : 8, width: i === idx ? 28 : 8,
                    borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
                    backgroundColor: i === idx ? '#1A6FE8' : 'rgba(15,23,42,0.15)',
                    transition: 'all 0.18s',
                  }}
                />
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#9CAABB' }}>
            Gunakan tombol ← → untuk navigasi · tekan <b style={{ color: '#5C6B82' }}>F</b> untuk layar penuh · {idx + 1} / {slides.length}
          </div>
        </>
      )}
    </div>
  )
}

function slideLabel(s: Slide): string {
  switch (s.kind) {
    case 'cover': return 'Sampul'
    case 'scope': return 'Lingkup Pekerjaan'
    case 'section': return `${s.num} · ${s.title}`
    case 'program': return s.program.nama_pekerjaan
    case 'closing': return 'Penutup'
  }
}

/* ------------------------------- Slide views ------------------------------ */

function SlideView({ slide, periodLabel, totalPrograms, totalDocs }: {
  slide: Slide; periodLabel: string; totalPrograms: number; totalDocs: number
}) {
  if (slide.kind === 'cover') return <CoverSlide periodLabel={periodLabel} totalPrograms={totalPrograms} totalDocs={totalDocs} />
  if (slide.kind === 'scope') return <ScopeSlide periodLabel={periodLabel} />
  if (slide.kind === 'section') return <SectionSlide num={slide.num} title={slide.title} />
  if (slide.kind === 'closing') return <ClosingSlide />
  return <ProgramSlide slide={slide} />
}

const eyebrow: React.CSSProperties = {
  fontSize: '1.5cqw', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: GOLD,
}

function CoverSlide({ periodLabel, totalPrograms, totalDocs }: { periodLabel: string; totalPrograms: number; totalDocs: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '8cqw 9cqw', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
      <div style={{ width: '7cqw', height: '7cqw', borderRadius: '1.4cqw', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4cqw', boxShadow: '0 1cqw 3cqw rgba(0,0,0,0.3)' }}>
        <img src="/LogoPBB.svg" alt="PBB" style={{ width: '5cqw', height: '5cqw', objectFit: 'contain' }} />
      </div>
      <div style={eyebrow}>Dokumentasi Lapangan</div>
      <h1 style={{ fontSize: '6.4cqw', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '2cqw 0 0' }}>
        Laporan Perkembangan<br />Sarana &amp; Prasarana
      </h1>
      <div style={{ fontSize: '2.3cqw', color: 'rgba(255,255,255,0.65)', marginTop: '2.5cqw', fontWeight: 500 }}>
        Peradaban Baik Bahagia — Sarpras MAF
      </div>
      <div style={{ display: 'flex', gap: '1.5cqw', marginTop: '4cqw', alignItems: 'center' }}>
        <span style={{ fontSize: '1.8cqw', fontWeight: 700, color: INK, backgroundColor: GOLD, padding: '0.9cqw 2cqw', borderRadius: '99px' }}>
          {periodLabel}
        </span>
        <span style={{ fontSize: '1.7cqw', color: 'rgba(255,255,255,0.55)' }}>
          {totalPrograms} pekerjaan · {totalDocs} dokumentasi
        </span>
      </div>
    </div>
  )
}

function ScopeSlide({ periodLabel }: { periodLabel: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '7cqw 9cqw', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
      <div style={eyebrow}>{periodLabel}</div>
      <h2 style={{ fontSize: '5cqw', fontWeight: 800, letterSpacing: '-0.02em', margin: '1.5cqw 0 3cqw' }}>Lingkup Laporan</h2>
      <p style={{ fontSize: '2.4cqw', lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', maxWidth: '70%', margin: 0 }}>
        Laporan ini menyajikan dokumentasi kondisi <b style={{ color: '#F87171' }}>sebelum</b> dan
        {' '}<b style={{ color: '#4ADE80' }}>sesudah</b> pengerjaan tiap pekerjaan sarana &amp; prasarana,
        beserta progres terkini di lapangan.
      </p>
      <div style={{ marginTop: '4cqw', height: '0.4cqw', width: '14cqw', backgroundColor: GOLD, borderRadius: 99 }} />
    </div>
  )
}

function SectionSlide({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '7cqw 9cqw', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
      <div style={{ fontSize: '16cqw', fontWeight: 800, lineHeight: 0.9, color: 'rgba(212,176,104,0.22)', letterSpacing: '-0.04em' }}>{num}</div>
      <div style={{ height: '0.4cqw', width: '10cqw', backgroundColor: GOLD, borderRadius: 99, margin: '1cqw 0 2.5cqw' }} />
      <h2 style={{ fontSize: '5.2cqw', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
    </div>
  )
}

function Panel({ tag, tagColor, docs }: { tag: string; tagColor: string; docs: Documentation[] }) {
  const doc = docs[0]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw', marginBottom: '1.2cqw' }}>
        <span style={{ fontSize: '1.5cqw', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', backgroundColor: tagColor, padding: '0.6cqw 1.4cqw', borderRadius: '99px' }}>
          {tag}
        </span>
      </div>
      <div style={{ position: 'relative', flex: 1, borderRadius: '1.4cqw', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {doc && driveImg(doc) ? (
          <img
            src={driveImg(doc)}
            alt={doc.caption || tag}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '1.6cqw' }}>
            Belum ada foto
          </div>
        )}
        {doc?.caption && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '2.5cqw 1.6cqw 1.2cqw', background: 'linear-gradient(to top, rgba(5,8,15,0.85), transparent)', color: '#fff', fontSize: '1.5cqw', lineHeight: 1.35 }}>
            {doc.caption}
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramSlide({ slide }: { slide: Extract<Slide, { kind: 'program' }> }) {
  const { program, before, after, other } = slide
  // Choose two panels: prefer before/after; fall back to whatever exists.
  const leftDocs = before.length ? before : other
  const rightDocs = after.length ? after : (before.length ? other : [])
  const showCompare = before.length > 0 || after.length > 0
  const pct = Math.round(program.progress_percent || 0)

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '4cqw 5cqw', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '2cqw', marginBottom: '2.4cqw' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...eyebrow, fontSize: '1.4cqw' }}>{program.jenis_pekerjaan || 'Pekerjaan'}</div>
          <h2 style={{ fontSize: '3.6cqw', fontWeight: 800, letterSpacing: '-0.02em', margin: '0.8cqw 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {program.nama_pekerjaan}
          </h2>
          {program.vendor && <div style={{ fontSize: '1.6cqw', color: 'rgba(255,255,255,0.5)', marginTop: '0.6cqw' }}>{program.vendor}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '4cqw', fontWeight: 800, color: GOLD, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: '1.2cqw', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.4cqw' }}>Progres</div>
        </div>
      </div>

      {/* Panels */}
      <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0 }}>
        {showCompare ? (
          <>
            <Panel tag="Sebelum" tagColor="#B91C1C" docs={leftDocs} />
            <Panel tag="Sesudah" tagColor="#059669" docs={rightDocs.length ? rightDocs : after} />
          </>
        ) : (
          <Panel tag="Dokumentasi" tagColor="#1A6FE8" docs={other} />
        )}
      </div>
    </div>
  )
}

function ClosingSlide() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '8cqw' }}>
      <div style={eyebrow}>Sarpras MAF</div>
      <h1 style={{ fontSize: '7cqw', fontWeight: 800, letterSpacing: '-0.02em', margin: '2cqw 0 0' }}>Terima Kasih</h1>
      <div style={{ height: '0.4cqw', width: '12cqw', backgroundColor: GOLD, borderRadius: 99, margin: '3cqw 0' }} />
      <p style={{ fontSize: '2cqw', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Peradaban Baik Bahagia</p>
    </div>
  )
}

/* ------------------------------- Controls --------------------------------- */

function DeckControls({ idx, total, onPrev, onNext, isFs, onToggleFs }: {
  idx: number; total: number; onPrev: () => void; onNext: () => void; isFs: boolean; onToggleFs: () => void
}) {
  const btn: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(10,22,40,0.55)', backdropFilter: 'blur(6px)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }
  return (
    <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', alignItems: 'center', gap: 8, zIndex: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(10,22,40,0.55)', backdropFilter: 'blur(6px)', padding: '7px 12px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>
        {idx + 1} / {total}
      </span>
      <button onClick={onPrev} disabled={idx === 0} style={{ ...btn, opacity: idx === 0 ? 0.4 : 1 }} aria-label="Sebelumnya">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button onClick={onNext} disabled={idx === total - 1} style={{ ...btn, opacity: idx === total - 1 ? 0.4 : 1 }} aria-label="Berikutnya">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <button onClick={onToggleFs} style={btn} aria-label="Layar penuh">
        {isFs ? (
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" /></svg>
        ) : (
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" /></svg>
        )}
      </button>
    </div>
  )
}
