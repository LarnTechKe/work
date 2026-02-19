import { ReactNode } from 'react'

interface Column<T> {
  header: string
  accessor: (row: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T, index: number) => void
}

export default function DataTable<T>({ columns, data, emptyMessage = 'No data found', onRowClick }: Props<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="text-gray-300 dark:text-gray-600 text-lg mb-1">∅</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row, i)}
                  className={`border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  }`}
                >
                  {columns.map((col, j) => (
                    <td key={j} className={`px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                      {col.accessor(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
