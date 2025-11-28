'use client'

import { MetadataProvider } from '@/lib/context/metadata-context'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MetadataProvider>
            {children}
        </MetadataProvider>
    )
}
