"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getTableNames } from "@/lib/tables"

export function TableSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [open, setOpen] = React.useState(false)

    const currentTable = searchParams.get('table') || 'finca'
    const tables = getTableNames()

    const handleSelect = (tableName: string) => {
        router.push(`?table=${tableName}`)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[250px] justify-between font-mono"
                >
                    {currentTable}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Search tables..." className="font-mono" />
                    <CommandList>
                        <CommandEmpty>No table found.</CommandEmpty>
                        <CommandGroup>
                            {tables.map((table) => (
                                <CommandItem
                                    key={table}
                                    value={table}
                                    onSelect={() => handleSelect(table)}
                                    className="font-mono"
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentTable === table ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {table}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
