"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

interface PageHeaderProps {
    title?: string
    breadcrumbs?: Array<{ label: string; href?: string }>
}

export function PageHeader({ title, breadcrumbs }: PageHeaderProps) {
    return (
        <header className="flex items-center gap-2 border-b px-4 py-2">
            <SidebarTrigger />
            {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {i > 0 && <span>/</span>}
                            {crumb.href ? (
                                <a href={crumb.href} className="hover:text-foreground">
                                    {crumb.label}
                                </a>
                            ) : (
                                <span className="text-foreground font-medium">{crumb.label}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {title && !breadcrumbs && (
                <h1 className="text-lg font-semibold">{title}</h1>
            )}
        </header>
    )
}
