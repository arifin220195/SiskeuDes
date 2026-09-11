export type Role = 'kades' | 'sekdes' | 'bendahara' | 'superadmin' | 'kader' | 'nakes'
export type JenisKelamin = 'L' | 'P'
export type KelompokSasaran = 'bayi' | 'balita' | 'remaja' | 'produktif' | 'lansia'
export type StatusSasaran = 'aktif' | 'pindah' | 'meninggal'
export type StatusValidasi = 'pending' | 'approved' | 'ditolak'
export type StatusKehamilan = 'hamil' | 'nifas' | 'menyusui'
export type StatusImunisasi = 'diberikan' | 'menolak' | 'sakit' | 'tunda'

export interface Profile {
  id: string
  nama: string
  jabatan: string
  role: Role
  desa: string
  kecamatan: string
  posyandu_id: string | null
  created_at: string
}

export interface Posyandu {
  id: string
  nama: string
  ketua_kader: string
  lokasi: string
  dusun: string | null
  rw: string | null
  rt: string | null
  tipe: string
  jadwal: string
  jadwal_buka: string | null
  active: boolean
  created_at: string
}

export interface Wilayah {
  id: string
  nama: string
  jenis: 'dusun' | 'rw' | 'rt' | 'kadus'
  induk_id: string | null
  created_at: string
}

export interface Sasaran {
  id: string
  posyandu_id: string
  wilaya_id: string | null
  nik: string | null
  nik_sementara: boolean
  nama: string
  jenis_kelamin: JenisKelamin
  tanggal_lahir: string
  golongan_darah: string | null
  nama_ortu: string | null
  telepon: string | null
  alamat: string | null
  kelompok: KelompokSasaran
  status: StatusSasaran
  tanggal_meninggal: string | null
  catatan: string | null
  dibuat_oleh: string | null
  created_at: string
}

export interface Kehamilan {
  id: string
  sasaran_id: string
  ke_hamil: number
  status: StatusKehamilan
  tgl_hpl: string | null
  tgl_mulai: string
  tgl_akhir: string | null
  catatan: string | null
  created_at: string
}

export interface Kegiatan {
  id: string
  posyandu_id: string
  tanggal: string
  nama: string
  agenda: string | null
  terbuka: boolean
  dibuat_oleh: string | null
  created_at: string
}

export interface Kehadiran {
  id: string
  kegiatan_id: string
  sasaran_id: string
  hadir: boolean
  catatan: string | null
  created_at: string
}

export interface Antropometri {
  id: string
  sasaran_id: string
  kegiatan_id: string | null
  tanggal: string
  berat_kg: number | null
  tinggi_cm: number | null
  lika_cm: number | null
  lila_cm: number | null
  z_bbu: number | null
  z_tbu: number | null
  z_bbtb: number | null
  z_imtu: number | null
  z_lika: number | null
  status_gizi: string | null
  status_tinggi: string | null
  red_flag: boolean
  catatan: string | null
  diukur_oleh: string | null
  status_validasi: StatusValidasi
  validasi_oleh: string | null
  validasi_waktu: string | null
  created_at: string
}

export interface Imunisasi {
  id: string
  sasaran_id: string
  kegiatan_id: string | null
  antigen: string
  dosis: string
  tanggal: string
  status: StatusImunisasi
  petugas: string | null
  catatan: string | null
  status_validasi: StatusValidasi
  validasi_oleh: string | null
  validasi_waktu: string | null
  created_at: string
}

export interface Skrining {
  id: string
  sasaran_id: string
  kegiatan_id: string | null
  kelompok: KelompokSasaran
  tanggal: string
  data: Record<string, unknown>
  label_risiko: string
  red_flag: boolean
  catatan: string | null
  dibuat_oleh: string | null
  status_validasi: StatusValidasi
  validasi_oleh: string | null
  validasi_waktu: string | null
  created_at: string
}

export interface PelayananKb {
  id: string
  sasaran_id: string
  kegiatan_id: string | null
  tanggal: string
  alat_kontrasepsi: string
  keterangan: string | null
  status_validasi: StatusValidasi
  validasi_oleh: string | null
  validasi_waktu: string | null
  created_at: string
}

export interface LogistikItem {
  id: string
  posyandu_id: string
  nama: string
  satuan: string
  kategori: string
  ambang_min: number
}

export interface LogistikStok {
  id: string
  posyandu_id: string
  item_id: string
  qty: number
  batch: string | null
  tgl_exp: string | null
}

export interface LogistikMutasi {
  id: string
  posyandu_id: string
  item_id: string
  jenis: 'masuk' | 'keluar'
  qty: number
  sasaran_id: string | null
  tanggal: string
  keterangan: string | null
  dibuat_oleh: string | null
  created_at: string
}

export interface Kunjungan {
  id: string
  sasaran_id: string
  tanggal: string
  alasan: string
  petugas: string | null
  hasil: string | null
  tindak_lanjut: string | null
  status: 'selesai' | 'berlanjut'
  dibuat_oleh: string | null
  created_at: string
}

export interface Rujukan {
  id: string
  sasaran_id: string
  tanggal: string
  tujuan: string
  alasan: string
  data_ringkas: string | null
  status: 'terkirim' | 'diproses' | 'selesai'
  dibuat_oleh: string | null
  created_at: string
}

export interface Kematian {
  id: string
  sasaran_id: string
  tanggal: string
  jenis: 'ibu' | 'bayi' | 'balita' | 'umum'
  sebab: string | null
  catatan: string | null
  created_at: string
}

export interface Kompetensi {
  id: string
  nomor: number
  judul: string
  deskripsi: string | null
}

export interface KompetensiKader {
  id: string
  kader_id: string
  kompetensi_id: string
  tgl_selesai: string
}

export interface Materi {
  id: string
  topik: string
  kelompok: KelompokSasaran
  deskripsi: string | null
  url: string | null
  created_at: string
}

export interface StandarImunisasi {
  id: string
  antigen: string
  dosis: string
  urutan: number
  umur_min_bln: number | null
  umur_maks_bln: number | null
  aktif: boolean
}

export interface GiziTerkini {
  sasaran_id: string
  nama_sasaran: string
  jenis_kelamin: JenisKelamin
  tanggal_lahir: string
  nik: string | null
  kelompok: KelompokSasaran
  posyandu_id: string
  posyandu: string
  tanggal: string
  berat_kg: number | null
  tinggi_cm: number | null
  z_bbu: number | null
  z_tbu: number | null
  z_bbtb: number | null
  status_gizi: string | null
  status_tinggi: string | null
  red_flag: boolean
}

export interface Penyuluhan {
  id: string
  topik: string
  tanggal: string
  lokasi: string
  sasaran: string
  jumlah_peserta: number
  petugas: string
  catatan: string | null
  created_at: string
}