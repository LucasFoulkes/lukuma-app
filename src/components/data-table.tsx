import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface DataTableProps {
    data: Record<string, any>[]
}

export function DataTable({ data }: DataTableProps) {
    // If no data, show empty state
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No data available
            </div>
        )
    }

    // Get columns from data
    const columns = Object.keys(data[0])


    // Format column headers (convert snake_case to Title Case)
    const formatHeader = (key: string) => {
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    // Format cell values
    const formatValue = (value: any) => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400">—</span>
        }

        // Format dates
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            try {
                return format(parseISO(value), 'dd MMM yyyy, HH:mm', { locale: es })
            } catch {
                return value
            }
        }

        // Format objects/arrays
        if (typeof value === 'object') {
            return JSON.stringify(value)
        }

        return String(value)
    }

    return (
        <div className="h-full flex flex-col">
            <ScrollArea className="flex-1 h-0">
                <div className="min-w-max">
                    <Table wrapperClassName="overflow-visible">
                        <TableHeader className="border-b">
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column}>{formatHeader(column)}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {columns.map((column) => (
                                        <TableCell key={`${rowIndex}-${column}`}>
                                            {formatValue(row[column])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    )
}
