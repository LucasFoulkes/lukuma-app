'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Filter } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Fecha',
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>(date)

  // Sync with prop
  React.useEffect(() => {
    setRange(date)
  }, [date])

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange)
  }

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange?.(range)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange?.(undefined)
    setRange(undefined)
    setOpen(false)
  }

  const isActive = !!date?.from

  return (
    <div className={cn('flex items-center w-full', className)}>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          setRange(date)
        }
      }}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'group flex items-center justify-center w-full gap-2 text-sm transition-all rounded-md px-3 py-1.5 outline-none',
              isActive
                ? 'text-zinc-900 font-bold bg-zinc-100'
                : 'text-zinc-500 font-medium hover:bg-zinc-100 hover:text-zinc-900'
            )}
          >
            <Filter className={cn("size-3.5 transition-colors", isActive ? "text-zinc-900 fill-zinc-900" : "text-zinc-400 group-hover:text-zinc-900")} />
            <span>{placeholder}</span>
            {isActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-900" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-zinc-200 shadow-xl"
          align="start"
          sideOffset={8}
        >
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={es}
              className="p-4"
            />

            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-zinc-100 bg-zinc-50/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-3 text-[11px] uppercase tracking-wider font-bold text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              >
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="h-7 px-3 text-[11px] uppercase tracking-wider font-bold bg-zinc-900 text-zinc-50 hover:bg-zinc-800"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}