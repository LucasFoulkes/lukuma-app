"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { type DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

interface ObservationTableProps {
    data: Record<string, any>[]
    initialDateRange?: DateRange
    onDateRangeChange?: (range: DateRange | undefined) => void
    onLoadMore?: () => Promise<void>
    hasMoreData?: boolean
    isLoadingMore?: boolean
    totalObservations?: number
    loadedObservations?: number
    onFiltersChange?: (filters: Record<string, string>) => void
}

const ITEMS_PER_PAGE = 100 // Show 100 rows at a time

// Generate consistent color for each user based on their name
const getUserColor = (userName: string): string => {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-teal-500',
        'bg-indigo-500',
        'bg-red-500',
        'bg-yellow-500',
        'bg-cyan-500',
    ]
    
    // Simple hash function to get consistent color for same name
    let hash = 0
    for (let i = 0; i < userName.length; i++) {
        hash = userName.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
}

export function ObservationTable({ 
    data, 
    initialDateRange, 
    onDateRangeChange,
    onLoadMore,
    hasMoreData = false,
    isLoadingMore = false,
    totalObservations = 0,
    loadedObservations = 0,
    onFiltersChange
}: ObservationTableProps) {
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialDateRange)
    const [visibleRows, setVisibleRows] = React.useState(ITEMS_PER_PAGE)
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)
    const loadingRef = React.useRef(false)
    const dbLoadingRef = React.useRef(false)
    
    // Filter state for combobox columns
    const [filters, setFilters] = React.useState<Record<string, string>>({})
    
    // Notify parent when filters change
    React.useEffect(() => {
        if (onFiltersChange) {
            onFiltersChange(filters)
        }
    }, [filters, onFiltersChange])
    
    // Sort state
    const [sortColumn, setSortColumn] = React.useState<string | null>(null)
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
    
    // Get columns from data (or show default if no data)
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []
    
    // Determine which columns should have combobox filters
    const comboboxColumns = ['Finca', 'Bloque', 'Variedad', 'Usuario']
    
    // Get unique values for combobox columns
    const getUniqueValues = (column: string) => {
        const values = new Set(data.map(row => row[column]).filter(v => v != null))
        return Array.from(values).sort()
    }
    
    // Apply filters and sorting
    const filteredAndSortedData = React.useMemo(() => {
        let result = [...data]
        
        // Apply filters
        Object.entries(filters).forEach(([column, value]) => {
            if (value) {
                result = result.filter(row => row[column] === value)
            }
        })
        
        // Apply sorting
        if (sortColumn) {
            result.sort((a, b) => {
                const aVal = a[sortColumn]
                const bVal = b[sortColumn]
                
                // Handle null/undefined
                if (aVal == null && bVal == null) return 0
                if (aVal == null) return 1
                if (bVal == null) return -1
                
                // Try numeric comparison first
                const aNum = parseFloat(aVal)
                const bNum = parseFloat(bVal)
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
                }
                
                // String comparison
                const aStr = String(aVal)
                const bStr = String(bVal)
                return sortDirection === 'asc' 
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr)
            })
        }
        
        return result
    }, [data, filters, sortColumn, sortDirection])
    
    // Update dateRange when initialDateRange changes
    React.useEffect(() => {
        if (initialDateRange) {
            setDateRange(initialDateRange)
        }
    }, [initialDateRange])
    
    // Reset visible rows when data changes
    React.useEffect(() => {
        setVisibleRows(ITEMS_PER_PAGE)
    }, [data])
    
    // Setup scroll listener for infinite loading
    React.useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return
        
        // Find the viewport element inside ScrollArea
        const viewport = container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
        if (!viewport) return
        
        const handleScroll = () => {
            if (loadingRef.current) return
            
            const scrollPercentage = (viewport.scrollTop + viewport.clientHeight) / viewport.scrollHeight
            
            // Load more rows from current data when user scrolls to 80%
            if (scrollPercentage > 0.8 && visibleRows < filteredAndSortedData.length) {
                loadingRef.current = true
                setTimeout(() => {
                    setVisibleRows(prev => Math.min(prev + ITEMS_PER_PAGE, filteredAndSortedData.length))
                    loadingRef.current = false
                }, 100)
            }
            
            // When we're near the end of visible rows AND we have more data to load from DB
            if (scrollPercentage > 0.7 && visibleRows >= filteredAndSortedData.length && hasMoreData && !dbLoadingRef.current && onLoadMore) {
                dbLoadingRef.current = true
                onLoadMore().finally(() => {
                    dbLoadingRef.current = false
                })
            }
        }
        
        viewport.addEventListener('scroll', handleScroll)
        return () => viewport.removeEventListener('scroll', handleScroll)
    }, [visibleRows, filteredAndSortedData.length, hasMoreData, onLoadMore])
    
    // Handle sort click
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            // Toggle direction or clear sort
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else {
                setSortColumn(null)
                setSortDirection('asc')
            }
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }
    
    // Handle date range change
    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range)
        if (onDateRangeChange) {
            onDateRangeChange(range)
        }
    }
    
    // Format date range for display
    const formatDateRange = (dateRange: DateRange | undefined) => {
        if (!dateRange?.from) {
            return "Seleccionar fechas"
        }
        
        const formatDate = (date: Date) => {
            return date.toLocaleDateString('es-ES', {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
        }

        if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
            return formatDate(dateRange.from)
        }
        
        return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    }

    // Format column headers (convert snake_case to Title Case)
    const formatHeader = (key: string) => {
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    // Format cell values
    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400">—</span>
        }

        // Special formatting for usuario column - use badge
        if (key === 'Usuario' && value && typeof value === 'string') {
            return (
                <Badge className={`${getUserColor(value)} text-white`}>
                    {value}
                </Badge>
            )
        }

        // Format dates
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            try {
                return format(parseISO(value), 'dd MMM yyyy, HH:mm', { locale: es })
            } catch {
                return value
            }
        }

        // Format numbers
        if (typeof value === 'number') {
            // Check if it's an integer or should be treated as integer (Observaciones)
            if (Number.isInteger(value) || key === 'Observaciones') {
                return value.toFixed(0)
            }
            // All observation type columns (arroz, maleza, etc.) should be integers too
            if (!key.includes('/') && !key.includes('Tiempo') && !key.includes('Área') && !key.includes('%') && key !== 'Finca' && key !== 'Bloque' && key !== 'Cama' && key !== 'Usuario') {
                return value.toFixed(0)
            }
            // Everything else gets 2 decimals (including Área and % del Bloque)
            return value.toFixed(2)
        }

        // Format objects/arrays
        if (typeof value === 'object') {
            return JSON.stringify(value)
        }

        return String(value)
    }

    return (
        <div className="h-full flex flex-col" ref={scrollContainerRef}>
            <ScrollArea className="flex-1 h-0">
                <div className="min-w-max">
                    <Table wrapperClassName="overflow-visible">
                        <TableHeader className="border-b">
                            <TableRow>
                                {columns.length === 0 ? (
                                    // Show default headers even when no data
                                    <>
                                        <TableHead>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-medium hover:bg-transparent"
                                                    >
                                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                                        Fecha
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="range"
                                                        selected={dateRange}
                                                        onSelect={handleDateRangeChange}
                                                        numberOfMonths={2}
                                                        disabled={(date) => date > new Date()}
                                                    />
                                                    {dateRange && (
                                                        <div className="p-3 border-t">
                                                            <div className="text-sm text-muted-foreground mb-2">
                                                                {formatDateRange(dateRange)}
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDateRangeChange(undefined)}
                                                                className="w-full"
                                                            >
                                                                Limpiar filtro
                                                            </Button>
                                                        </div>
                                                    )}
                                                </PopoverContent>
                                            </Popover>
                                        </TableHead>
                                        <TableHead>Finca</TableHead>
                                        <TableHead>Bloque</TableHead>
                                        <TableHead>Variedad</TableHead>
                                    </>
                                ) : (
                                    columns.map((column) => (
                                        <TableHead key={column}>
                                            {column === 'Fecha' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-auto p-0 font-medium hover:bg-transparent"
                                                        >
                                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                                            {formatHeader(column)}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="range"
                                                            selected={dateRange}
                                                            onSelect={handleDateRangeChange}
                                                            numberOfMonths={2}
                                                            disabled={(date) => date > new Date()}
                                                        />
                                                        {dateRange && (
                                                            <div className="p-3 border-t">
                                                                <div className="text-sm text-muted-foreground mb-2">
                                                                    {formatDateRange(dateRange)}
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDateRangeChange(undefined)}
                                                                    className="w-full"
                                                                >
                                                                    Limpiar filtro
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </PopoverContent>
                                                </Popover>
                                            ) : comboboxColumns.includes(column) ? (
                                                // Combobox filter for Finca, Bloque, Variedad, Usuario
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-auto p-0 font-medium hover:bg-transparent"
                                                        >
                                                            {formatHeader(column)}
                                                            <ChevronsUpDown className="ml-2 h-3 w-3" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[200px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder={`Buscar ${column.toLowerCase()}...`} />
                                                            <CommandList>
                                                                <CommandEmpty>No hay resultados</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        onSelect={() => {
                                                                            setFilters(prev => {
                                                                                const newFilters = { ...prev }
                                                                                delete newFilters[column]
                                                                                return newFilters
                                                                            })
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                !filters[column] ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        Todos
                                                                    </CommandItem>
                                                                    {getUniqueValues(column).map((value) => (
                                                                        <CommandItem
                                                                            key={value}
                                                                            onSelect={() => {
                                                                                setFilters(prev => ({
                                                                                    ...prev,
                                                                                    [column]: value
                                                                                }))
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    filters[column] === value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {value}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                // Sortable columns for numeric/other columns
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-medium hover:bg-transparent"
                                                    onClick={() => handleSort(column)}
                                                >
                                                    {formatHeader(column)}
                                                    {sortColumn === column ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="ml-2 h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="ml-2 h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                                                    )}
                                                </Button>
                                            )}
                                        </TableHead>
                                    ))
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedData && filteredAndSortedData.length > 0 ? (
                                <>
                                    {filteredAndSortedData.slice(0, visibleRows).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {columns.map((column) => (
                                                <TableCell key={`${rowIndex}-${column}`}>
                                                    {formatValue(column, row[column])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                    {isLoadingMore && (
                                        <>
                                            {[...Array(5)].map((_, i) => (
                                                <TableRow key={`skeleton-${i}`}>
                                                    {columns.map((column, colIndex) => (
                                                        <TableCell key={`skeleton-${i}-${colIndex}`}>
                                                            <Skeleton className="h-4 w-full" />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="text-center py-4 text-muted-foreground">
                                                    Cargando más observaciones... ({loadedObservations} de {totalObservations})
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                    {!isLoadingMore && visibleRows < filteredAndSortedData.length && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="text-center py-4 text-muted-foreground">
                                                Mostrando más datos... ({visibleRows} de {filteredAndSortedData.length})
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={Math.max(columns.length, 1)} className="text-center py-8 text-gray-500">
                                        No hay datos disponibles
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    )
}
