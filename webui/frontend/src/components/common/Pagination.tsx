interface Props {
  page: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalItems, pageSize = 20, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-5">
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Showing page {page} of {totalPages} ({totalItems} item{totalItems !== 1 ? 's' : ''})
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page + i - 2
          if (p < 1 || p > totalPages) return null
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
