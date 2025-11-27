'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const HeaderPortal = ({ children }: { children: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false)

    // Wait for client-side hydration
    useEffect(() => setMounted(true), [])

    if (!mounted) return null

    const target = document.getElementById('header-actions')
    return target ? createPortal(children, target) : null
}
