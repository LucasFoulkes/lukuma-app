'use client'

import * as React from 'react'
import { Filter, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface FilterOption<T extends string | number> {
  value: T
  label: string
}

interface SelectFilterProps<T extends string | number> {
  title?: string
  value?: T
  onChange?: (value: T | undefined) => void
  options: FilterOption<T>[]
  className?: string
}

export function SelectFilter<T extends string | number>({
  title,
  value,
  onChange,
  options,
  className,
}: SelectFilterProps<T>) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = value 
    ? options.find(o => o.value === value)?.label 
    : title
  
  const isActive = value !== undefined

  return (
    <div className={cn('flex items-center w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
            <span className="truncate max-w-[100px]">{selectedLabel}</span>
            {isActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-900" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[200px] p-0 border-zinc-200 shadow-xl"
          align="start"
          sideOffset={8}
        >
            <div className="p-1 max-h-[300px] overflow-y-auto">
                {options.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-center text-zinc-500">
                        No hay opciones
                    </div>
                ) : (
                    options.map((option) => (
                        <div
                            key={String(option.value)}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-zinc-100",
                                value === option.value ? "font-medium text-zinc-900" : "text-zinc-600"
                            )}
                            onClick={() => {
                                onChange?.(option.value)
                                setOpen(false)
                            }}
                        >
                            <div className={cn("h-4 w-4 flex items-center justify-center", value === option.value ? "opacity-100" : "opacity-0")}>
                                <Check className="h-3 w-3" />
                            </div>
                            {option.label}
                        </div>
                    ))
                )}
            </div>
            {isActive && (
                <div className="flex items-center justify-center px-4 py-2 border-t border-zinc-100 bg-zinc-50/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onChange?.(undefined)
                        setOpen(false)
                    }}
                    className="h-7 px-4 text-[11px] uppercase tracking-wider font-bold text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                  >
                    Limpiar
                  </Button>
                </div>
            )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
