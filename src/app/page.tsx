import { getTable } from "@/services/db"
import { DataTable } from "@/components/data-table"
import { getColumnsForTable } from "@/lib/tables"
import { TableSelector } from "@/components/table-selector"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>
}) {
  const params = await searchParams
  let error = null
  let table = []
  const tableName = params.table || 'finca'

  try {
    table = await getTable(tableName)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  // Filter and order columns based on table config
  let filteredData = table
  if (table.length > 0) {
    const columns = getColumnsForTable(tableName, Object.keys(table[0]))
    filteredData = table.map(row => {
      const filtered: Record<string, any> = {}
      columns.forEach(col => {
        filtered[col] = row[col]
      })
      return filtered
    })
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold capitalize">
          {tableName.replace(/_/g, ' ')}
        </h1>
        <TableSelector />
      </div>

      {error ? (
        <div className="text-red-500 p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="font-semibold">Error loading table:</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <DataTable
            data={filteredData}
          />
        </div>
      )}
    </div>
  )
}
