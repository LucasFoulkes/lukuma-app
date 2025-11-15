'use client'

import { usePathname } from 'next/navigation'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from '@/components/ui/breadcrumb'

export function AppBreadcrumb() {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    // If we're on the home page, don't show breadcrumb
    if (segments.length === 0) {
        return null
    }

    // Just show the current page
    const currentPage = segments[segments.length - 1]
    const label = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbPage className='text-lg font-medium'>{label}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    )
}
