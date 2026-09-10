export default function NotFoundPage() {
  return (
    <div className="max-w-[80rem] mx-auto px-space-lg py-space-xl w-full">
      <section className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col items-center text-center gap-space-sm">
        <span className="material-symbols-outlined text-6xl text-primary">
          error_outline
        </span>
        <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          404 — Halaman Tidak Ditemukan
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Halaman yang Anda cari tidak tersedia.
        </p>
      </section>
    </div>
  )
}