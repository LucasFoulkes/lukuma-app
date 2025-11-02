export default function FincaPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Finca Map</h1>
            <p>View finca details and map here</p>
        </div>
    )
}
