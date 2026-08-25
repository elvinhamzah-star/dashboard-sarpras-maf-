import { useEffect, useRef, useState } from 'react'
import { fetchPrograms, fetchSnapshots, fetchTransactions, Program, ProgramSnapshot, Transaction } from '../lib/supabase'
import { STATUS_COLORS, formatRupiah, formatRupiahShort, monthLabelFromYM } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import RiwayatLaporan from './RiwayatLaporan'

type Mode = 'bulanan' | 'mingguan'
type CatatanKey = 'pencapaian' | 'kendala' | 'rencana' | 'pertanyaan'
interface CatatanData { pencapaian: string[]; kendala: string[]; rencana: string[]; pertanyaan: string[] }

const EXCLUDED_PROGRAM_ID = 'P-024'
const DEFAULT_CATATAN: CatatanData = { pencapaian: [], kendala: [], rencana: [], pertanyaan: [] }
const CATATAN_SECTIONS: { key: CatatanKey; label: string; color: string; placeholder: string }[] = [
  { key: 'pencapaian', label: 'Pencapaian', color: '#059669', placeholder: 'Apa yang berhasil dicapai...' },
  { key: 'kendala',    label: 'Kendala',    color: '#D97706', placeholder: 'Hambatan yang perlu dibahas...' },
  { key: 'rencana',    label: 'Rencana ke Depan',          color: '#1A6FE8', placeholder: 'Target berikutnya...' },
  { key: 'pertanyaan', label: 'Pertanyaan untuk Atasan',   color: '#7C3AED', placeholder: 'Hal yang perlu dikonfirmasi...' },
]

function pad2(n: number) { return String(n).padStart(2, '0') }
function currentMonthKey() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}` }
function shiftMonth(ym: string, delta: number) { const [y,m]=ym.split('-').map(Number); const d=new Date(y,m-1+delta,1); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}` }
function monthRange(ym: string): [string,string] { const [y,m]=ym.split('-').map(Number); return [`${ym}-01`,`${ym}-${pad2(new Date(y,m,0).getDate())}`] }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }
function currentWeekStart() { const d=new Date(); const day=d.getDay(); const diff=d.getDate()-day+(day===0?-6:1); return toDateStr(new Date(d.getFullYear(),d.getMonth(),diff)) }
function shiftWeek(ws: string, delta: number) { const d=new Date(ws+'T00:00:00'); d.setDate(d.getDate()+delta*7); return toDateStr(d) }
function weekRange(ws: string): [string,string] { const d=new Date(ws+'T00:00:00'); d.setDate(d.getDate()+6); return [ws,toDateStr(d)] }
const MONTHS_ID=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
function weekLabel(s: string, e: string) {
  const sd=new Date(s+'T00:00:00'), ed=new Date(e+'T00:00:00')
  if (sd.getMonth()===ed.getMonth()) return `${sd.getDate()} – ${ed.getDate()} ${MONTHS_ID[ed.getMonth()]} ${ed.getFullYear()}`
  return `${sd.getDate()} ${MONTHS_ID[sd.getMonth()]} – ${ed.getDate()} ${MONTHS_ID[ed.getMonth()]} ${ed.getFullYear()}`
}

interface Activity {
  program: Program; statusAtEnd: string; becameSelesai: boolean
  progressStart: number|null; progressEnd: number|null; progressDelta: number; realisasiAtEnd: number|null
}

function computeActivity(program: Program, snaps: ProgramSnapshot[], start: string, end: string): Activity|null {
  const own = snaps.filter(s=>s.program_id===program.id).sort((a,b)=>a.snapshot_date.localeCompare(b.snapshot_date))
  const inPeriod = own.filter(s=>s.snapshot_date>=start&&s.snapshot_date<=end)
  if (inPeriod.length===0) return null
  const before = own.filter(s=>s.snapshot_date<start)
  const last = inPeriod[inPeriod.length-1]
  const baseline = before.length>0?before[before.length-1]:inPeriod[0]
  const wasSelesaiBefore = before.length>0&&before[before.length-1].status==='Selesai'
  return {
    program, statusAtEnd: last.status||program.status,
    becameSelesai: (last.status||program.status)==='Selesai'&&!wasSelesaiBefore,
    progressStart: baseline.progress_percent, progressEnd: last.progress_percent,
    progressDelta: (last.progress_percent??0)-(baseline.progress_percent??0),
    realisasiAtEnd: last.realisasi_terkini,
  }
}

const card: React.CSSProperties = { backgroundColor:'var(--card)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border-subtle)', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }
const secHead: React.CSSProperties = { fontSize:10.5, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 2px 8px' }

export default function LaporanProgress() {
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

  const [programs, setPrograms] = useState<Program[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('bulanan')
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [weekKey, setWeekKey] = useState(currentWeekStart())
  const [activeTab, setActiveTab] = useState<string|null>(null)
  const [showArchive, setShowArchive] = useState(false)

  // Catatan structured — per periode, localStorage only, not exported
  const catatanKey = mode==='bulanan' ? `lp_catatan2_${monthKey}` : `lp_catatan2_${weekKey}`
  const [catatan, setCatatan] = useState<CatatanData>(DEFAULT_CATATAN)
  const [inputs, setInputs] = useState<Record<CatatanKey,string>>({ pencapaian:'', kendala:'', rencana:'', pertanyaan:'' })

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchSnapshots(), fetchTransactions()]).then(([pRes,sRes,tRes]) => {
      setPrograms((pRes.data??[]).filter(p=>p.id!==EXCLUDED_PROGRAM_ID) as Program[])
      setSnapshots((sRes.data??[]) as ProgramSnapshot[])
      setTransactions(tRes.data??[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    try { setCatatan(JSON.parse(localStorage.getItem(catatanKey)||'null') ?? DEFAULT_CATATAN) }
    catch { setCatatan(DEFAULT_CATATAN) }
    setInputs({ pencapaian:'', kendala:'', rencana:'', pertanyaan:'' })
  }, [catatanKey])

  function saveCatatan(next: CatatanData) {
    setCatatan(next)
    localStorage.setItem(catatanKey, JSON.stringify(next))
  }
  function addItem(key: CatatanKey) {
    const val = inputs[key].trim()
    if (!val) return
    saveCatatan({ ...catatan, [key]: [...catatan[key], val] })
    setInputs(p => ({ ...p, [key]: '' }))
  }
  function removeItem(key: CatatanKey, idx: number) {
    saveCatatan({ ...catatan, [key]: catatan[key].filter((_,i)=>i!==idx) })
  }

  if (showArchive) return (
    <div>
      <div style={{ padding: isMobile?'14px 14px 0':'20px 28px 0' }}>
        <button onClick={()=>setShowArchive(false)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', backgroundColor:'var(--card)', color:'var(--text-secondary)', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke Laporan Progress
        </button>
      </div>
      <RiwayatLaporan />
    </div>
  )

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>Memuat...</div>

  // ── Period ──────────────────────────────────────────────────────────────────
  const [rangeStart, rangeEnd] = mode==='bulanan' ? monthRange(monthKey) : weekRange(weekKey)
  const periodLabel = mode==='bulanan' ? monthLabelFromYM(monthKey) : weekLabel(rangeStart, rangeEnd)
  const shiftPeriod = (delta: number) => {
    if (mode==='bulanan') setMonthKey(k=>shiftMonth(k,delta))
    else setWeekKey(k=>shiftWeek(k,delta))
    setActiveTab(null)
  }

  // ── Snapshot Global ─────────────────────────────────────────────────────────
  const totalAnggaran    = programs.reduce((s,p)=>s+(p.total_anggaran||0),0)
  const totalRealisasi   = programs.reduce((s,p)=>s+(p.realisasi_terkini||0),0)
  const penyerapanPct    = totalAnggaran>0 ? Math.round(totalRealisasi/totalAnggaran*100) : 0
  const nilaiTersisa     = totalAnggaran - totalRealisasi
  const selesaiCount     = programs.filter(p=>p.status==='Selesai').length
  const activeCount      = programs.filter(p=>p.status!=='Perencanaan').length

  // ── Perlu Perhatian ─────────────────────────────────────────────────────────
  const perluPerhatian = programs.filter(p =>
    p.status==='On Hold' ||
    (p.status==='On Going' && (p.realisasi_terkini||0)===0)
  )

  // ── Period activity ─────────────────────────────────────────────────────────
  const txsInPeriod = transactions.filter(t=>t.tanggal>=rangeStart&&t.tanggal<=rangeEnd)
  const danaMasuk   = txsInPeriod.filter(t=>t.jenis_transaksi==='Masuk').reduce((s,t)=>s+(t.nominal||0),0)
  const danaKeluar  = txsInPeriod.filter(t=>t.jenis_transaksi!=='Masuk').reduce((s,t)=>s+(t.nominal||0),0)
  const net         = danaMasuk - danaKeluar

  const activities  = programs.map(p=>computeActivity(p,snapshots,rangeStart,rangeEnd)).filter((a):a is Activity=>a!==null)
  const selesaiList = activities.filter(a=>a.becameSelesai)
  const bergerakList= activities.filter(a=>!a.becameSelesai)

  const tabCounts: Record<string,number> = {}
  bergerakList.forEach(a=>{ tabCounts[a.statusAtEnd]=(tabCounts[a.statusAtEnd]||0)+1 })
  const STATUS_TABS = ['On Going','On Hold','Perencanaan']
  const visibleTabs = [...(selesaiList.length>0?['Selesai']:[]), ...STATUS_TABS.filter(t=>(tabCounts[t]||0)>0)]
  const currentTab  = activeTab&&visibleTabs.includes(activeTab)?activeTab:(visibleTabs[0]??null)
  const currentList = currentTab==='Selesai' ? selesaiList : bergerakList.filter(a=>a.statusAtEnd===currentTab)

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #lp-print, #lp-print * { visibility: visible; }
          #lp-print { position: absolute; left: 0; top: 0; width: 100%; }
          #lp-print .no-print { display: none !important; }
          #lp-print .lp-sec { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 16mm; size: A4 portrait; }
        }
      `}</style>

      <div id="lp-print" style={{ padding: isMobile?'16px 14px 48px':'24px 28px 48px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:isMobile?18:22, fontWeight:800, color:'var(--text-primary)', margin:0, letterSpacing:'-0.03em' }}>Laporan Progress</h1>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'4px 0 0' }}>Sarpras MAF — {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div className="no-print" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ display:'flex', backgroundColor:'var(--surface-2)', borderRadius:9, padding:3 }}>
              {(['bulanan','mingguan'] as Mode[]).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setActiveTab(null)}} style={{ padding:'6px 13px', borderRadius:7, border:'none', fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer', backgroundColor:mode===m?'var(--card)':'transparent', color:mode===m?'var(--text-primary)':'var(--text-muted)', boxShadow:mode===m?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>
                  {m==='bulanan'?'Bulanan':'Mingguan'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, backgroundColor:'var(--card)', border:'1px solid var(--border)', borderRadius:9, padding:'4px 6px' }}>
              <button onClick={()=>shiftPeriod(-1)} style={{ width:24, height:24, border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:12.5, fontWeight:700, color:'var(--text-primary)', padding:'0 4px', whiteSpace:'nowrap' }}>{periodLabel}</span>
              <button onClick={()=>shiftPeriod(1)} style={{ width:24, height:24, border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button onClick={()=>window.print()} style={{ padding:'8px 14px', borderRadius:9, border:'none', backgroundColor:'var(--blue)', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Export PDF
            </button>
          </div>
        </div>

        {/* ── 1. Snapshot Global ──────────────────────────────────────────── */}
        <div className="lp-sec" style={{ marginBottom:18 }}>
          <div style={secHead}>Gambaran Keseluruhan</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>

            {/* Penyerapan */}
            <div style={{ ...card, position:'relative', overflow:'hidden' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Total Penyerapan</div>
              <div style={{ fontSize:isMobile?20:24, fontWeight:800, color:'var(--blue)', marginTop:4, letterSpacing:'-0.03em' }}>{penyerapanPct}%</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{formatRupiahShort(totalRealisasi)} dari {formatRupiahShort(totalAnggaran)}</div>
              {/* progress bar */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, backgroundColor:'var(--border-subtle)' }}>
                <div style={{ height:'100%', width:`${Math.min(penyerapanPct,100)}%`, backgroundColor:'var(--blue)', transition:'width 0.5s ease' }}/>
              </div>
            </div>

            {/* Nilai Tersisa */}
            <div style={card}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Nilai Tersisa</div>
              <div style={{ fontSize:isMobile?20:24, fontWeight:800, color: nilaiTersisa>0?'#D97706':'#059669', marginTop:4, letterSpacing:'-0.03em' }}>{formatRupiahShort(nilaiTersisa)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{100-penyerapanPct}% anggaran belum terserap</div>
            </div>

            {/* Selesai / Total */}
            <div style={card}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Proyek Selesai</div>
              <div style={{ fontSize:isMobile?20:24, fontWeight:800, color:'#059669', marginTop:4, letterSpacing:'-0.03em' }}>
                {selesaiCount}<span style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>/{activeCount}</span>
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>dari total proyek aktif</div>
            </div>

          </div>
        </div>

        {/* ── 2. Perlu Perhatian ───────────────────────────────────────────── */}
        <div className="lp-sec" style={{ marginBottom:18 }}>
          <div style={secHead}>Perlu Perhatian</div>
          {perluPerhatian.length===0 ? (
            <div style={{ ...card, display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
              <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize:13, color:'#059669', fontWeight:600 }}>Semua pekerjaan berjalan lancar</span>
            </div>
          ) : (
            <div style={{ ...card, padding:0, overflow:'hidden' }}>
              {perluPerhatian.map((p,i) => {
                const isOnHold = p.status==='On Hold'
                const accentColor = isOnHold ? '#D97706' : '#1A6FE8'
                const reason = isOnHold ? 'Ditunda' : 'Belum ada realisasi'
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:isMobile?'10px 12px':'11px 16px', borderBottom: i<perluPerhatian.length-1?'1px solid var(--border-subtle)':'none', borderLeft:`3px solid ${accentColor}` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:isMobile?12.5:13, fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nama_pekerjaan}</div>
                      <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{formatRupiah(p.realisasi_terkini||0)} terserap</div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:accentColor, backgroundColor:`${accentColor}15`, padding:'3px 9px', borderRadius:6, whiteSpace:'nowrap', flexShrink:0 }}>{reason}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 3. Gerak Periode ─────────────────────────────────────────────── */}
        <div className="lp-sec" style={{ marginBottom:18 }}>
          <div style={secHead}>Gerak {periodLabel}</div>

          {/* Keuangan ringkas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
            <div style={card}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Dana Masuk</div>
              <div style={{ fontSize:isMobile?15:17, fontWeight:700, color:'#059669', marginTop:4 }}>{formatRupiahShort(danaMasuk)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{txsInPeriod.filter(t=>t.jenis_transaksi==='Masuk').length} transaksi</div>
            </div>
            <div style={card}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Dana Keluar</div>
              <div style={{ fontSize:isMobile?15:17, fontWeight:700, color:'var(--text-primary)', marginTop:4 }}>{formatRupiahShort(danaKeluar)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{txsInPeriod.filter(t=>t.jenis_transaksi!=='Masuk').length} transaksi</div>
            </div>
            <div style={card}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Net</div>
              <div style={{ fontSize:isMobile?15:17, fontWeight:700, color:net>=0?'var(--blue)':'var(--color-danger)', marginTop:4 }}>{net>=0?'+':''}{formatRupiahShort(net)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{net>=0?'masuk > keluar':'keluar > masuk'}</div>
            </div>
          </div>

          {/* Activity list */}
          {visibleTabs.length===0 ? (
            <div style={{ ...card, textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:'28px 16px' }}>Belum ada aktivitas tercatat di periode ini.</div>
          ) : (
            <>
              <div className="no-print" style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
                {visibleTabs.map(tab=>{
                  const isActive = currentTab===tab
                  const count = tab==='Selesai'?selesaiList.length:(tabCounts[tab]||0)
                  const color = STATUS_COLORS[tab]||'var(--text-muted)'
                  return (
                    <button key={tab} onClick={()=>setActiveTab(tab)} style={{ padding:'6px 14px', borderRadius:8, fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer', backgroundColor:isActive?color:'var(--card)', color:isActive?'#fff':'var(--text-secondary)', border:isActive?'none':'1px solid var(--border)' }}>
                      {tab} ({count})
                    </button>
                  )
                })}
              </div>
              <div style={{ ...card, padding:0, overflow:'hidden' }}>
                {currentList.map((a,i)=>{
                  const color = STATUS_COLORS[a.statusAtEnd]||'var(--text-muted)'
                  return (
                    <div key={a.program.id+i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:isMobile?'10px 12px':'12px 16px', borderBottom:'1px solid var(--border-subtle)' }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:isMobile?12.5:13, fontWeight:600, color:'var(--text-primary)', lineHeight:1.35 }}>{a.program.nama_pekerjaan}</div>
                        <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2 }}>
                          {a.becameSelesai ? (mode==='bulanan'?'Selesai bulan ini':'Selesai minggu ini') : (
                            a.progressStart!==null&&a.progressStart!==a.progressEnd
                              ? `${a.progressStart}% → ${a.progressEnd}%`
                              : `${a.progressEnd??0}%`
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:10 }}>
                        <div style={{ fontSize:13, fontWeight:700, color }}>{a.progressEnd??0}%</div>
                        {a.realisasiAtEnd!=null&&<div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{formatRupiahShort(a.realisasiAtEnd)}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── 4. Catatan Meeting ──────────────────────────────── no-print ── */}
        <div className="no-print" style={{ marginBottom:18 }}>
          <div style={secHead}>Catatan Meeting — pribadi, tidak ikut export</div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(2,1fr)', gap:12 }}>
            {CATATAN_SECTIONS.map(sec=>(
              <CatatanSection
                key={sec.key}
                label={sec.label}
                color={sec.color}
                placeholder={sec.placeholder}
                items={catatan[sec.key]}
                inputValue={inputs[sec.key]}
                onInputChange={val=>setInputs(p=>({...p,[sec.key]:val}))}
                onAdd={()=>addItem(sec.key)}
                onRemove={idx=>removeItem(sec.key,idx)}
              />
            ))}
          </div>
        </div>

        {/* ── Arsip ──────────────────────────────────────────────────────── */}
        <div className="no-print" style={{ paddingTop:16, borderTop:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>Laporan pekanan manual lama masih tersimpan</span>
          <button onClick={()=>setShowArchive(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11.5, fontWeight:700, color:'var(--blue)', fontFamily:'inherit', padding:0 }}>
            Lihat Arsip →
          </button>
        </div>

      </div>
    </>
  )
}

// ── CatatanSection sub-component ────────────────────────────────────────────
interface CatatanSectionProps {
  label: string; color: string; placeholder: string
  items: string[]; inputValue: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}
function CatatanSection({ label, color, placeholder, items, inputValue, onInputChange, onAdd, onRemove }: CatatanSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ backgroundColor:'var(--card)', borderRadius:12, border:'1px solid var(--border-subtle)', overflow:'hidden' }}>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', backgroundColor:`${color}08` }}>
        <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor:color, flexShrink:0 }}/>
        <span style={{ fontSize:11.5, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.05em', flex:1 }}>{label}</span>
        {items.length>0&&<span style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)' }}>{items.length}</span>}
      </div>

      {/* Items */}
      <div style={{ padding:'8px 14px', minHeight:items.length===0?40:undefined }}>
        {items.length===0&&inputValue===''&&(
          <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 0', fontStyle:'italic' }}>Belum ada poin</div>
        )}
        {items.map((item,idx)=>(
          <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'5px 0', borderBottom:idx<items.length-1?'1px solid var(--border-subtle)':undefined }}>
            <div style={{ width:5, height:5, borderRadius:'50%', backgroundColor:color, flexShrink:0, marginTop:5 }}/>
            <span style={{ fontSize:12.5, color:'var(--text-primary)', flex:1, lineHeight:1.4 }}>{item}</span>
            <button onClick={()=>onRemove(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'0 2px', fontSize:14, lineHeight:1, flexShrink:0, fontFamily:'inherit' }} title="Hapus">×</button>
          </div>
        ))}
      </div>

      {/* Add input */}
      <div style={{ display:'flex', gap:6, padding:'8px 14px', borderTop:'1px solid var(--border-subtle)', backgroundColor:'var(--surface-2)' }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e=>onInputChange(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();onAdd()} }}
          placeholder={placeholder}
          style={{ flex:1, padding:'6px 10px', borderRadius:7, border:'1px solid var(--border-subtle)', backgroundColor:'var(--card)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', outline:'none' }}
        />
        <button
          onClick={onAdd}
          disabled={!inputValue.trim()}
          style={{ padding:'6px 12px', borderRadius:7, border:'none', backgroundColor:inputValue.trim()?color:'var(--border)', color:'#fff', fontSize:12, fontWeight:700, cursor:inputValue.trim()?'pointer':'default', fontFamily:'inherit', flexShrink:0, transition:'background 0.15s' }}
        >
          +
        </button>
      </div>
    </div>
  )
}
