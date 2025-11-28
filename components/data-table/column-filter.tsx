'use client'

import { memo } from 'react'
import { Filter, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils'

export const ColumnFilter = memo(({ title, options, selected, onChange }: {
    title: string
    options: string[]
    selected: Set<string>
    onChange: (s: Set<string>) => void
}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("h-8 text-xs font-bold hover:bg-muted/50", selected.size > 0 ? "text-primary" : "text-muted-foreground")}>
                {title}
                {selected.size > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{selected.size}</Badge>}
                <Filter className="ml-1 h-3 w-3" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
                <CommandInput placeholder={`Buscar ${title}...`} className="h-8 text-xs" />
                <CommandList>
                    <CommandEmpty>No encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {options.map(option => (
                            <CommandItem
                                key={option}
                                onSelect={() => {
                                    const next = new Set(selected)
                                    selected.has(option) ? next.delete(option) : next.add(option)
                                    onChange(next)
                                }}
                                className="text-xs"
                            >
                                <div className={cn("mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary", selected.has(option) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                    <Check className="h-3 w-3" />
                                </div>
                                {option}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    {selected.size > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem onSelect={() => onChange(new Set())} className="justify-center text-center text-xs font-medium">
                                    Limpiar filtros
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
))
ColumnFilter.displayName = 'ColumnFilter'
