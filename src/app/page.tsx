import { getAllObservations, getCamaCountByBloque } from "@/services/db"
import { DashboardContent } from "./dashboard-content"

export default async function Dashboard() {
    let observations: any[] = []
    let totalObservations: number = 0
    let camaCountsByBloque: Record<string, any> = {}
    let error: string | null = null
    let initialDate = new Date() // Default to today for the date picker

    try {
        // Get initial batch of observations (1000)
        const result = await getAllObservations(1000, 0)
        observations = result.data
        totalObservations = result.total
        
        // Get cama counts by bloque
        camaCountsByBloque = await getCamaCountByBloque()
    } catch (e) {
        console.error("Error loading observations:", e)
        error = e instanceof Error ? e.message : "Unknown error"
    }

    return <DashboardContent 
        initialObservations={observations}
        totalObservations={totalObservations}
        initialDate={initialDate}
        camaCountsByBloque={camaCountsByBloque} 
        error={error} 
    />
}
