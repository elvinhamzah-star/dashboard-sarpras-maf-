import { useEffect, useState } from 'react'
import { supabase, SubProgram, Program } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, formatTanggal } from '../lib/data'
import UpdateProgressModal from './UpdateProgressModal'
import UpdateSubPekerjaanModal from './UpdateSubPekerjaanModal'
import EditCatatanPekerjaanModal from './EditCatatanPekerjaanModal'
import EditDokumenModal from './EditDokumenModal'

interface PekerjaanDetailProps {
  programId: string
  isAdmin: boolean
  onBack: () => void
}

type Tab = 'Ringkasan' | 'Dokumen' | 'Sub Pekerjaan'

export default function PekerjaanDetail({ programId, isAdmin, onBack }: PekerjaanDetailProps) {
  const [program, setProgram] = useState<Program | null>(null)
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Ringkasan')
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showEditCatatan, setShowEditCatatan] = useState(false)
  const [showEditDokumen, setShowEditDokumen] = useState(false)
  const [editingSubProgram, setEditingSubProgram] = useState<SubProgram | null>(null)

  const load = async () => {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase.from('sub_programs').select('*').eq('program_id', programId).order('id', { ascending: true }),
    ])
    if (pRes.data) setProgram(pRes.data)
    if (sRes.data) setSubPrograms(sRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [programId])

  const tabs: Tab[] = ['Ringkasan', 'Dokumen', ...(subPrograms.length > 0 ? ['Sub Pekerjaan' as Tab] : [])]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <span style={{ color: '#6B7A99' }}>Memuat...</span>
      </div>
    )
  }

  if (!program) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={onBack} style={{ color: '#1A6FE8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          &larr; Kembali
        </button>
        <p style={{ color: '#6B7A99', marginTop: 20 }}>Pekerjaan tidak ditemukan.</p>
      </div>
    )
  }

  const pct = Math.min(program.progress_percent || 0, 100)
  const statusColor = STATUS_COLORS[program.status] || '#1A6FE8'

  return (
    <div style={{ padding: '28px 28px 48px', width: '100%', boxSizing: 'border-box' }}>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#5C6B82', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          marginBottom: 20, padding: 0,
          letterSpacing: '-0.01em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#1A6FE8' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5C6B82' }}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Kembali ke Daftar
      </button>

      {/* Header Card */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: '20px 24px',
          border: '1px solid rgba(15,23,42,0.07)',
          marginBottom: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9CAABB', letterSpacing: '0.02em' }}>{program.id}</span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 9px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: STATUS_BG[program.status] || 'rgba(15,23,42,0.06)',
                  color: statusColor,
                  letterSpacing: '0.01em',
                }}
              >
                {program.status}
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 750, color: '#0F1C2E', margin: '0 0 10px', lineHeight: 1.3, letterSpacing: '-0.03em' }}>
              {program.nama_pekerjaan}
            </h1>
            <div
              onClick={() => isAdmin && setShowEditCatatan(true)}
              style={{
                backgroundColor: program.isu_utama ? 'rgba(217,119,6,0.07)' : 'rgba(15,23,42,0.03)',
                borderLeft: program.isu_utama ? '2.5px solid #D97706' : '2.5px solid #C8D2E0',
                borderRadius: 7,
                padding: '8px 12px',
                fontSize: 12.5,
                color: program.isu_utama ? '#92400e' : '#9CAABB',
                fontWeight: 500,
                cursor: isAdmin ? 'pointer' : 'default',
                transition: 'all 0.15s',
                minHeight: 32,
                display: 'flex',
                alignItems: program.isu_utama ? 'flex-start' : 'center',
                gap: 8,
              }}
              onMouseEnter={e => {
                if (isAdmin && program.isu_utama) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(217,119,6,0.12)'
                }
              }}
              onMouseLeave={e => {
                if (isAdmin && program.isu_utama) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(217,119,6,0.07)'
                }
              }}
            >
              {program.isu_utama ? (
                <>
                  <svg width="13" height="13" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24" style={{ marginTop: 2, flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {program.isu_utama.split('\n').filter(l => l.trim()).map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#92400e', flexShrink: 0, marginTop: 5 }} />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (isAdmin ? '+ Tambah catatan...' : 'Tidak ada catatan')}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpdateModal(true)}
              style={{
                flexShrink: 0,
                backgroundColor: '#1A6FE8',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(26,111,232,0.3)',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Update Progress
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 16,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          {[
            { label: 'Program', value: program.program || '-' },
            { label: 'Jenis Pekerjaan', value: program.jenis_pekerjaan || '-' },
            { label: 'Vendor', value: program.vendor || '-' },
            { label: 'Tanggal Dibuat', value: formatTanggal(program.created_at) },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10.5, color: '#9CAABB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1C2E' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total Anggaran', value: formatRupiah(program.total_anggaran || 0), color: '#1A6FE8' },
          { label: 'Realisasi Terkini', value: formatRupiah(program.realisasi_terkini || 0), color: '#059669' },
          { label: 'Sisa Anggaran', value: formatRupiah(program.sisa_anggaran || 0), color: '#D97706' },
          { label: 'Progress', value: `${pct}%`, color: statusColor },
        ].map(c => (
          <div
            key={c.label}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: '16px 18px',
              border: '1px solid rgba(15,23,42,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: 10.5, color: '#9CAABB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 750, color: c.color, letterSpacing: '-0.03em' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid rgba(15,23,42,0.07)',
          marginBottom: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1C2E', letterSpacing: '-0.01em' }}>Progress Pekerjaan</span>
          <span style={{ fontSize: 16, fontWeight: 750, color: statusColor, letterSpacing: '-0.02em' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, backgroundColor: 'rgba(15,23,42,0.06)', borderRadius: 10, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: statusColor,
              borderRadius: 10,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: activeTab === tab ? 'none' : '1px solid rgba(15,23,42,0.1)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: activeTab === tab ? '#1A6FE8' : '#fff',
              color: activeTab === tab ? '#fff' : '#5C6B82',
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              if (activeTab !== tab) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#0F1C2E'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#5C6B82'
              }
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.07)',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {activeTab === 'Ringkasan' && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', marginBottom: 16, marginTop: 0, letterSpacing: '-0.02em' }}>Ringkasan Pekerjaan</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['ID', program.id],
                    ['Program', program.program || '-'],
                    ['Nama Pekerjaan', program.nama_pekerjaan],
                    ['Jenis Pekerjaan', program.jenis_pekerjaan || '-'],
                    ['Status', program.status],
                    ['Progress', `${program.progress_percent || 0}%`],
                    ['Total Anggaran', formatRupiah(program.total_anggaran || 0)],
                    ['Realisasi Terkini', formatRupiah(program.realisasi_terkini || 0)],
                    ['Sisa Anggaran', formatRupiah(program.sisa_anggaran || 0)],
                    ['Vendor', program.vendor || '-'],
                    ['Catatan Pekerjaan', program.isu_utama
                      ? program.isu_utama.split('\n').filter((l: string) => l.trim()).map((line: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: idx > 0 ? 3 : 0 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#5C6B82', flexShrink: 0, marginTop: 5 }} />
                            <span>{line}</span>
                          </div>
                        ))
                      : '-'],
                    ['Dibuat', formatTanggal(program.created_at)],
                  ].map(([label, value], i, arr) => (
                    <tr key={String(label)} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                      <td style={{ padding: '10px 0', color: '#9CAABB', fontWeight: 600, width: '40%', minWidth: 140, verticalAlign: 'top', fontSize: 12 }}>{label}</td>
                      <td style={{ padding: '10px 0', color: '#0F1C2E', fontSize: 13 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Dokumen' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.02em' }}>Dokumen & Lampiran</h3>
              {isAdmin && (
                <button
                  onClick={() => setShowEditDokumen(true)}
                  style={{
                    backgroundColor: '#1A6FE8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
                >
                  Edit
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'RAB Detail', url: program.link_rab_detail },
                { label: 'Dokumentasi', url: program.link_dokumentasi },
                { label: 'Bukti Transaksi', url: program.link_bukti_transaksi },
              ].map(doc => (
                <div
                  key={doc.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '13px 16px',
                    borderRadius: 10,
                    backgroundColor: '#F8FAFC',
                    border: '1px solid rgba(15,23,42,0.07)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1C2E', letterSpacing: '-0.01em' }}>{doc.label}</div>
                    <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 2, wordBreak: 'break-all' }}>
                      {doc.url ? doc.url.substring(0, 60) + (doc.url.length > 60 ? '...' : '') : 'Dokumen tidak tersedia'}
                    </div>
                  </div>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: 'rgba(26,111,232,0.08)',
                        color: '#1A6FE8',
                        padding: '6px 13px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        flexShrink: 0,
                        border: '1px solid rgba(26,111,232,0.15)',
                        transition: 'all 0.12s',
                      }}
                    >
                      Buka ↗
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: '#C8D2E0' }}>—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Sub Pekerjaan' && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', marginBottom: 16, marginTop: 0, letterSpacing: '-0.02em' }}>
              Sub Pekerjaan <span style={{ color: '#9CAABB', fontWeight: 500 }}>({subPrograms.length})</span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr>
                    {['No', 'Nama Gedung', 'Progress', 'Anggaran', 'Realisasi', 'Sisa', 'Status', ''].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#9CAABB',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          borderBottom: '1px solid rgba(15,23,42,0.06)',
                          backgroundColor: '#FAFBFC',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subPrograms.map((sp, i) => (
                    <tr
                      key={sp.id}
                      style={{ borderBottom: i < subPrograms.length - 1 ? '1px solid rgba(15,23,42,0.04)' : 'none', backgroundColor: '#fff', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#F8FAFC' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#fff' }}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#9CAABB' }}>{i + 1}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#0F1C2E', fontWeight: 500, whiteSpace: 'nowrap' }}>{sp.nama_gedung}</td>
                      <td style={{ padding: '11px 14px', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, backgroundColor: 'rgba(15,23,42,0.07)', borderRadius: 10, overflow: 'hidden', minWidth: 40 }}>
                            <div
                              style={{
                                width: `${Math.min(sp.progress_percent || 0, 100)}%`,
                                height: '100%',
                                backgroundColor: STATUS_COLORS[sp.status] || '#1A6FE8',
                                borderRadius: 10,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COLORS[sp.status] || '#1A6FE8', minWidth: 32 }}>{sp.progress_percent || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#0F1C2E', whiteSpace: 'nowrap' }}>
                        {formatRupiah(sp.total_anggaran || 0)}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatRupiah(sp.realisasi_terkini || 0)}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#D97706', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatRupiah(sp.sisa_anggaran || 0)}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 9px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: STATUS_BG[sp.status] || 'rgba(15,23,42,0.06)',
                            color: STATUS_COLORS[sp.status] || '#5C6B82',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sp.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setEditingSubProgram(sp)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(15,23,42,0.1)',
                              borderRadius: 7,
                              padding: '5px 10px',
                              cursor: 'pointer',
                              color: '#5C6B82',
                              fontSize: 12,
                              fontWeight: 600,
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A6FE8'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#1A6FE8'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.1)'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#5C6B82'
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showUpdateModal && program && (
        <UpdateProgressModal
          program={program}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={() => {
            setShowUpdateModal(false)
            load()
          }}
        />
      )}

      {editingSubProgram && (
        <UpdateSubPekerjaanModal
          subProgram={editingSubProgram}
          onClose={() => setEditingSubProgram(null)}
          onSuccess={() => {
            setEditingSubProgram(null)
            load()
          }}
        />
      )}

      {showEditCatatan && program && (
        <EditCatatanPekerjaanModal
          programId={program.id}
          currentNotes={program.isu_utama || ''}
          onClose={() => setShowEditCatatan(false)}
          onSuccess={() => {
            setShowEditCatatan(false)
            load()
          }}
        />
      )}

      {showEditDokumen && program && (
        <EditDokumenModal
          programId={program.id}
          links={{
            rabDetail: program.link_rab_detail ?? null,
            dokumentasi: program.link_dokumentasi ?? null,
            buktiTransaksi: program.link_bukti_transaksi ?? null,
          }}
          onClose={() => setShowEditDokumen(false)}
          onSuccess={() => {
            setShowEditDokumen(false)
            load()
          }}
        />
      )}
    </div>
  )
}
