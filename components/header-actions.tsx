'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function HeaderActions({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    const el = document.getElementById('header-actions')
    if (!el) return null

    return createPortal(children, el)
}
