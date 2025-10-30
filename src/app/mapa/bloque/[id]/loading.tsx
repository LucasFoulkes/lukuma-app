import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BloqueLoading() {
    return (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
            {/* Map Card Skeleton */}
            <Card className="flex-1 overflow-hidden flex flex-col min-h-0 relative p-2">
                <Skeleton className="w-full h-full" />
            </Card>

            {/* Grupos List Skeleton */}
            <div className="w-80 overflow-hidden flex flex-col">
                <Skeleton className="h-6 w-40 mb-3" />
                <div className="flex-1 overflow-y-auto space-y-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
