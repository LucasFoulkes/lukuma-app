"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getTable } from "@/services/db"
import { DataTable } from "@/components/data-table"
import { getColumnsForTable } from "@/lib/tables"
import { TableSelector } from "@/components/table-selector"

function TablesContent() {
  const searchParams = useSearchParams()
  const tableName = searchParams.get('table') || 'finca'
  
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTable() {
      setLoading(true)
      setError(null)
      
      try {
        const table = await getTable(tableName)
        
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
        
        setData(filteredData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadTable()
  }, [tableName])

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
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Cargando datos...</div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <DataTable
            data={data}
          />
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    }>
      <TablesContent />
    </Suspense>
  )
}
