'use client'

import { Calendar as CalendarIcon, X } from 'lucide-react'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DateFilterProps {
    dateRange: DateRange | undefined
    setDateRange: (range: DateRange | undefined) => void
    tempDateRange: DateRange | undefined
    setTempDateRange: (range: DateRange | undefined) => void
    isCalendarOpen: boolean
    setIsCalendarOpen: (open: boolean) => void
}

export function DateFilter({
    dateRange, setDateRange,
    tempDateRange, setTempDateRange,
    isCalendarOpen, setIsCalendarOpen
}: DateFilterProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            Fecha
            <Popover open={isCalendarOpen} onOpenChange={(open) => {
                if (!open && dateRange?.from && !tempDateRange?.from) setDateRange(undefined)
                setIsCalendarOpen(open)
                if (open) setTempDateRange(dateRange)
            }}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-6 w-6", dateRange?.from ? "text-primary" : "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b flex items-center justify-between">
                        <span className="text-sm font-medium">Filtrar por fecha</span>
                        {tempDateRange?.from && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:text-destructive" onClick={() => setTempDateRange(undefined)}>
                                <X className="h-3 w-3 mr-1" /> Limpiar
                            </Button>
                        )}
                    </div>
                    <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from || dateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={1} locale={es} />
                    <div className="p-3 border-t flex justify-end gap-2 bg-muted/10">
                        <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>Cancelar</Button>
                        <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsCalendarOpen(false) }}>Aplicar</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
