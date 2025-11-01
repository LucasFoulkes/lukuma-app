"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

interface DashboardClientProps {
    onDateChange: (from: Date | undefined, to: Date | undefined) => void
}

export function DashboardClient({ onDateChange }: DashboardClientProps) {
    const [date, setDate] = React.useState<DateRange | undefined>(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return {
            from: today,
            to: today
        }
    })

    React.useEffect(() => {
        onDateChange(date?.from, date?.to)
    }, [date, onDateChange])

    const formatDateRange = (dateRange: DateRange | undefined) => {
        if (!dateRange?.from) return "Seleccionar fechas"
        
        const formatDate = (date: Date) => {
            return date.toLocaleDateString("es-ES", {
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

    return (
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="justify-start text-left font-normal w-[280px]"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateRange(date)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        className="rounded-md border"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
