# DataTable Component Guide

This guide documents the generic `DataTable` component used in the application, covering its infinite scrolling and custom filtering capabilities.

## 1. The Core Component (`DataTable`)

**Path:** `components/data-table/data-table.tsx`

This component handles rendering rows, managing the sticky header, and triggering the infinite scroll callback.

```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Definition for a table column.
 * @template T The type of the data row.
 */
export type Column<T = unknown> = {
    key: string 
    label: string
    className?: string
    /** Custom renderer for the cell content. */
    render?: (row: T) => ReactNode
    /** Custom renderer for the header. Used to inject Filter components. */
    header?: () => ReactNode
}

type Props<T> = {
    columns: Column<T>[]
    data: T[]
    onRowClick?: (row: T) => void
    getRowKey?: (row: T, index: number) => string | number
    getRowClassName?: (row: T) => string
    /** 
     * Triggered when scrolling hits the bottom.
     * Returns `true` if more pages exist, `false` otherwise.
     */
    onLoadMore?: () => Promise<boolean>
    isLoadingMore?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    onRowClick,
    getRowKey,
    getRowClassName,
    onLoadMore,
    isLoadingMore
}: Props<T>) {
    const [hasMore, setHasMore] = useState(true)
    const loaderRef = useRef<HTMLTableRowElement>(null)

    // Infinite Scroll Engine
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore) return
        
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) onLoadMore().then(setHasMore) },
            { threshold: 0.1 }
        )
        
        if (loaderRef.current) observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [onLoadMore, hasMore, isLoadingMore])

    return (
        <Table>
            <TableHeader className="sticky top-0 bg-background capitalize z-10 ring-1 ring-zinc-100">
                <TableRow>
                    {columns.map(col => (
                        <TableHead key={col.key} className={col.className}>
                            {col.header ? col.header() : col.label}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No hay datos</TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.map((row, i) => (
                            <TableRow
                                key={getRowKey ? getRowKey(row, i) : i}
                                className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50', getRowClassName?.(row))}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map(col => (
                                    <TableCell key={col.key} className={col.className}>
                                        {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        
                        {/* Scroll Trigger Row */}
                        {onLoadMore && hasMore && (
                            <TableRow ref={loaderRef}>
                                <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground">
                                    {isLoadingMore && <><Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />Cargando más...</>}
                                </TableCell>
                            </TableRow>
                        )}
                        
                        {/* Bottom Spacer */}
                        <TableRow className="hover:bg-transparent border-0"><TableCell colSpan={columns.length} className="h-20" /></TableRow>
                    </>
                )}
            </TableBody>
        </Table>
    )
}
```

## 2. Mechanisms

### Sticky Header
Relies on specific CSS in `components/ui/table.tsx`. The `TableHeader` must use `sticky top-0 bg-background` to ensure it floats above data rows but stays opaque.

### Infinite Scroll Logic
1.  **Ref**: `loaderRef` is attached to a dummy row at the bottom of the table.
2.  **Observer**: `IntersectionObserver` watches this row.
3.  **Trigger**: When visible, it calls `onLoadMore()`.
4.  **State Management**: 
    *   It waits for the promise to resolve.
    *   If the result is `true` (more pages exist), it stays active.
    *   If `false`, it stops observing, preventing unnecessary network calls.

### Filtering (Custom Headers)
Filters are injected via the `Column` definition using the `header` prop.

#### Filter Components

We use two custom components to handle filtering without causing excessive re-renders or layout shifts:

1.  **SelectFilter (`components/select-filter.tsx`)**
    *   **Type**: Single-select dropdown.
    *   **UI**: Renders as a button styled like a table header. When active (value exists), it becomes bold and highlighted.
    *   **Logic**: 
        *   Accepts an `options` array (`{ value, label }`).
        *   Selection is **immediate**: Clicking an option calls `onChange(value)` and closes the popover.
        *   **Clear Action**: When a value is selected, a "Limpiar" button appears at the bottom of the dropdown to reset the value to `undefined`.
    *   **Display**: Shows the selected option's label; otherwise shows the `title` prop.

    ```tsx
    // Usage in Page
    header: () => <SelectFilter title="Finca" value={fincaId} onChange={setFincaId} options={fincaOptions} />
    ```

2.  **DatePicker (`components/date-picker.tsx`)**
    *   **Type**: Date range picker (Start - End).
    *   **UI**: Renders a button with the "Fecha" placeholder.
    *   **Logic**: 
        *   Uses `react-day-picker` in `mode="range"`.
        *   **Buffered State**: Maintains a local `range` state that updates as the user clicks dates. It **does not** call `onDateChange` immediately.
        *   **Apply Action**: The parent state is only updated when the user clicks **"Aplicar"**.
        *   **Cancel/Reset**: If the popover is closed without applying, the internal state resets to the prop value.
        *   **Clear Action**: "Limpiar" button resets the parent value to `undefined`.

    ```tsx
    // Usage in Page
    header: () => <DatePicker date={date} onDateChange={setDate} placeholder="Fecha" />
    ```

## 3. Implementation Pattern

To make the scroll work correctly, the parent container must constrain the height.

### Layout Structure
The `overflow` must happen on the container **wrapping** the Table, not the window body.

```tsx
// app/page.tsx
export default function Page() {
    return (
        // 1. Flex container takes full height
        // 2. min-h-0 is CRITICAL for nested flex scrolling
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            
            {/* Header Actions (Button Portals) */}
            <HeaderActions>...</HeaderActions>

            {/* Scrollable Area */}
            <ScrollArea className="flex-1 min-h-0">
                <DataTable data={data} onLoadMore={loadMore} ... />
            </ScrollArea>
        </div>
    )
}
```

### Data Hook (`loadMore`)
The hook manages pagination state.

```ts
const loadMore = useCallback(async () => {
    if (loadingMore) return true // Prevent duplicate calls
    setLoadingMore(true)

    // Fetch next page starting at current length
    const newRows = await fetchPage(rows.length)
    
    setRows(prev => [...prev, ...newRows])
    setLoadingMore(false)

    // Return true only if we received a full page
    return newRows.length === PAGE_SIZE
}, [rows.length, loadingMore])
```
