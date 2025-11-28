"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Plus, Trash2, Save, FileSpreadsheet, AlertTriangle, Check, X, ArrowRight } from "lucide-react";
import { useMetadata } from "@/lib/context/metadata-context";
import * as XLSX from "xlsx";

interface ProduccionRow {
    id: string;
    fecha: string;
    finca_id: number | null;
    bloque_id: number | null;
    variedad_id: number | null;
    cantidad: number | null;
    // Original values from file for display
    _original?: {
        finca?: string;
        bloque?: string;
        variedad?: string;
    };
}

// Mapping types
interface ValueMapping {
    fileValue: string;
    dbValue: number | null;
    suggestions: { id: number; name: string; score: number }[];
}

// Column mapping for file import
interface ColumnMapping {
    finca: number | null;
    bloque: number | null;
    variedad: number | null;
    cantidad: number | null;
    fecha: number | null;
}

type MappingStep = "upload" | "columns" | "values" | "review" | "manual";

export default function NuevaProduccionPage() {
    const router = useRouter();
    const { fincas, bloques, variedades } = useMetadata();

    // Convert bloques Map<number, BloqueInfo> to Map<number, string> for easier use
    const bloqueNames = new Map<number, string>();
    bloques.forEach((info, id) => bloqueNames.set(id, info.nombre));

    const [step, setStep] = useState<MappingStep>("upload");
    const [rows, setRows] = useState<ProduccionRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // File data state
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [fileData, setFileData] = useState<(string | number)[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);

    // Column mapping state
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
        finca: null,
        bloque: null,
        variedad: null,
        cantidad: null,
        fecha: null,
    });

    // Value mapping state
    const [fincaMappings, setFincaMappings] = useState<Map<string, ValueMapping>>(new Map());
    const [bloqueMappings, setBloqueMappings] = useState<Map<string, ValueMapping>>(new Map());
    const [variedadMappings, setVariedadMappings] = useState<Map<string, ValueMapping>>(new Map());

    // Helper: Levenshtein distance for fuzzy matching
    const levenshtein = (a: string, b: string): number => {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                matrix[i][j] = b[i - 1] === a[j - 1]
                    ? matrix[i - 1][j - 1]
                    : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[b.length][a.length];
    };

    // Find similar matches from a map
    const findSuggestions = (value: string, map: Map<number, string>, maxResults = 3): { id: number; name: string; score: number }[] => {
        const normalizedValue = value.toLowerCase().trim();
        const results: { id: number; name: string; score: number }[] = [];

        map.forEach((name, id) => {
            const normalizedName = name.toLowerCase().trim();

            // Exact match (case insensitive)
            if (normalizedName === normalizedValue) {
                results.push({ id, name, score: 100 });
                return;
            }

            // Contains match
            if (normalizedName.includes(normalizedValue) || normalizedValue.includes(normalizedName)) {
                results.push({ id, name, score: 80 });
                return;
            }

            // Number matching (for bloques like "01" -> "Bloque 1" or "1")
            const valueNum = parseInt(normalizedValue.replace(/\D/g, ''));
            const nameNum = parseInt(normalizedName.replace(/\D/g, ''));
            if (!isNaN(valueNum) && !isNaN(nameNum) && valueNum === nameNum) {
                results.push({ id, name, score: 70 });
                return;
            }

            // Levenshtein distance for fuzzy match
            const distance = levenshtein(normalizedName, normalizedValue);
            const maxLen = Math.max(normalizedName.length, normalizedValue.length);
            const similarity = ((maxLen - distance) / maxLen) * 100;

            if (similarity > 40) {
                results.push({ id, name, score: Math.round(similarity) });
            }
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    };

    // Process uploaded file - step 1: extract headers for column mapping
    const processFile = async (file: File) => {
        setError(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

            if (jsonData.length === 0) {
                throw new Error("El archivo está vacío");
            }

            // Find the maximum number of columns in the data
            let maxCols = 0;
            jsonData.forEach(row => {
                if (row && row.length > maxCols) maxCols = row.length;
            });

            // Find a row that looks like headers (has multiple non-empty cells)
            let detectedHeaderRow = 0;
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                if (!row) continue;
                const nonEmptyCells = row.filter(c => c !== null && c !== undefined && c !== "").length;
                if (nonEmptyCells >= 3) {
                    detectedHeaderRow = i;
                    break;
                }
            }

            // Build headers array - ensure we have entries for all columns
            const headerRow = jsonData[detectedHeaderRow] || [];
            const headers: string[] = [];
            for (let i = 0; i < maxCols; i++) {
                headers.push(headerRow[i] !== undefined && headerRow[i] !== null ? String(headerRow[i]).trim() : "");
            }

            // Store file data for later processing
            setFileHeaders(headers);
            setFileData(jsonData);
            setHeaderRowIndex(detectedHeaderRow);

            // Try to auto-detect column mappings based on common names
            const autoMapping: ColumnMapping = {
                finca: null,
                bloque: null,
                variedad: null,
                cantidad: null,
                fecha: null,
            };

            headers.forEach((h, i) => {
                const col = h.toUpperCase();
                // Finca mappings
                if (col.includes("FINCA") || col === "PROVEEDOR" || col.includes("FARM")) {
                    autoMapping.finca = i;
                }
                // Bloque mappings
                if (col.includes("BLOQUE") || col.includes("LOTE") || col.includes("BLOCK") || col === "BLQ") {
                    autoMapping.bloque = i;
                }
                // Variedad mappings
                if (col.includes("VARIEDAD") || col.includes("PRODUCTO") || col.includes("VARIETY") || col.includes("VAR")) {
                    autoMapping.variedad = i;
                }
                // Cantidad mappings
                if (col.includes("CANTIDAD") || col.includes("RECEPCIÓN") || col.includes("TALLOS") ||
                    col.includes("STEMS") || col.includes("QTY") || col === "TOTAL") {
                    autoMapping.cantidad = i;
                }
                // Fecha mappings
                if (col.includes("FECHA") || col.includes("DATE") || col.includes("CORTE")) {
                    autoMapping.fecha = i;
                }
            });

            setColumnMapping(autoMapping);
            setStep("columns");
            setSuccess(`Archivo cargado: ${headers.length} columnas detectadas`);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al procesar el archivo");
        }
    };

    // Process data after column mapping is confirmed
    const processDataWithMapping = () => {
        setError(null);

        // Validate required columns
        if (columnMapping.cantidad === null) {
            setError("Debe seleccionar la columna de Cantidad");
            return;
        }

        try {
            // Collect unique values and create rows
            const uniqueFincas = new Set<string>();
            const uniqueBloques = new Set<string>();
            const uniqueVariedades = new Set<string>();
            const parsedRows: ProduccionRow[] = [];

            for (let i = headerRowIndex + 1; i < fileData.length; i++) {
                const row = fileData[i];
                if (!row || row.every(c => c === null || c === undefined || c === "")) continue;

                const fincaVal = columnMapping.finca !== null ? String(row[columnMapping.finca] || "").trim() : "";
                const bloqueVal = columnMapping.bloque !== null ? String(row[columnMapping.bloque] || "").trim() : "";
                const variedadVal = columnMapping.variedad !== null ? String(row[columnMapping.variedad] || "").trim() : "";
                const cantidadVal = columnMapping.cantidad !== null ? Number(row[columnMapping.cantidad]) || 0 : 0;

                let fechaVal = new Date().toISOString().split("T")[0];
                if (columnMapping.fecha !== null && row[columnMapping.fecha]) {
                    const rawDate = row[columnMapping.fecha];
                    if (typeof rawDate === "number") {
                        // Excel serial date
                        const date = new Date((rawDate - 25569) * 86400 * 1000);
                        fechaVal = date.toISOString().split("T")[0];
                    } else {
                        const parsed = new Date(String(rawDate));
                        if (!isNaN(parsed.getTime())) {
                            fechaVal = parsed.toISOString().split("T")[0];
                        }
                    }
                }

                if (fincaVal) uniqueFincas.add(fincaVal);
                if (bloqueVal) uniqueBloques.add(bloqueVal);
                if (variedadVal) uniqueVariedades.add(variedadVal);

                if (cantidadVal > 0) {
                    parsedRows.push({
                        id: crypto.randomUUID(),
                        fecha: fechaVal,
                        finca_id: null,
                        bloque_id: null,
                        variedad_id: null,
                        cantidad: cantidadVal,
                        _original: {
                            finca: fincaVal,
                            bloque: bloqueVal,
                            variedad: variedadVal,
                        },
                    });
                }
            }

            if (parsedRows.length === 0) {
                throw new Error("No se encontraron filas con datos válidos (cantidad > 0)");
            }

            // Create value mappings with suggestions
            const newFincaMappings = new Map<string, ValueMapping>();
            const newBloqueMappings = new Map<string, ValueMapping>();
            const newVariedadMappings = new Map<string, ValueMapping>();

            uniqueFincas.forEach(value => {
                const suggestions = findSuggestions(value, fincas);
                newFincaMappings.set(value, {
                    fileValue: value,
                    dbValue: suggestions.length > 0 && suggestions[0].score >= 70 ? suggestions[0].id : null,
                    suggestions,
                });
            });

            uniqueBloques.forEach(value => {
                const suggestions = findSuggestions(value, bloqueNames);
                newBloqueMappings.set(value, {
                    fileValue: value,
                    dbValue: suggestions.length > 0 && suggestions[0].score >= 70 ? suggestions[0].id : null,
                    suggestions,
                });
            });

            uniqueVariedades.forEach(value => {
                const suggestions = findSuggestions(value, variedades);
                newVariedadMappings.set(value, {
                    fileValue: value,
                    dbValue: suggestions.length > 0 && suggestions[0].score >= 70 ? suggestions[0].id : null,
                    suggestions,
                });
            });

            setFincaMappings(newFincaMappings);
            setBloqueMappings(newBloqueMappings);
            setVariedadMappings(newVariedadMappings);
            setRows(parsedRows);

            // Check if any value mapping is missing
            const hasMissingMappings =
                [...newFincaMappings.values()].some(m => m.dbValue === null) ||
                [...newBloqueMappings.values()].some(m => m.dbValue === null) ||
                [...newVariedadMappings.values()].some(m => m.dbValue === null);

            if (hasMissingMappings) {
                setStep("values");
            } else {
                // All mappings auto-resolved, go to review
                applyMappingsToRows(parsedRows, newFincaMappings, newBloqueMappings, newVariedadMappings);
                setStep("review");
            }

            setSuccess(`Se procesaron ${parsedRows.length} registros`);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al procesar los datos");
        }
    };

    // Apply mappings to rows
    const applyMappingsToRows = (
        rowsToUpdate: ProduccionRow[],
        fincaMap: Map<string, ValueMapping>,
        bloqueMap: Map<string, ValueMapping>,
        variedadMap: Map<string, ValueMapping>
    ) => {
        const updatedRows = rowsToUpdate.map(row => {
            const fincaMapping = row._original?.finca ? fincaMap.get(row._original.finca) : null;
            const bloqueMapping = row._original?.bloque ? bloqueMap.get(row._original.bloque) : null;
            const variedadMapping = row._original?.variedad ? variedadMap.get(row._original.variedad) : null;

            return {
                ...row,
                finca_id: fincaMapping?.dbValue ?? null,
                bloque_id: bloqueMapping?.dbValue ?? null,
                variedad_id: variedadMapping?.dbValue ?? null,
            };
        });

        setRows(updatedRows);
    };

    // Update a mapping
    const updateMapping = (
        type: "finca" | "bloque" | "variedad",
        fileValue: string,
        dbValue: number | null
    ) => {
        if (type === "finca") {
            setFincaMappings(prev => {
                const updated = new Map(prev);
                const existing = updated.get(fileValue);
                if (existing) {
                    updated.set(fileValue, { ...existing, dbValue });
                }
                return updated;
            });
        } else if (type === "bloque") {
            setBloqueMappings(prev => {
                const updated = new Map(prev);
                const existing = updated.get(fileValue);
                if (existing) {
                    updated.set(fileValue, { ...existing, dbValue });
                }
                return updated;
            });
        } else {
            setVariedadMappings(prev => {
                const updated = new Map(prev);
                const existing = updated.get(fileValue);
                if (existing) {
                    updated.set(fileValue, { ...existing, dbValue });
                }
                return updated;
            });
        }
    };

    // Proceed from mapping to review
    const proceedToReview = () => {
        // Check all mappings are filled
        const missingFinca = [...fincaMappings.values()].filter(m => m.dbValue === null);
        const missingBloque = [...bloqueMappings.values()].filter(m => m.dbValue === null);
        const missingVariedad = [...variedadMappings.values()].filter(m => m.dbValue === null);

        if (missingFinca.length > 0 || missingBloque.length > 0 || missingVariedad.length > 0) {
            setError("Por favor, complete todos los mapeos antes de continuar");
            return;
        }

        applyMappingsToRows(rows, fincaMappings, bloqueMappings, variedadMappings);
        setError(null);
        setStep("review");
    };

    // Handle file drop/select
    const handleFile = (file: File) => {
        const name = file.name.toLowerCase();
        if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
            processFile(file);
        } else {
            setError("Por favor, seleccione un archivo Excel (.xls, .xlsx) o CSV (.csv)");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    // Manual entry helpers
    const addManualRow = () => {
        setRows(prev => [...prev, {
            id: crypto.randomUUID(),
            fecha: new Date().toISOString().split("T")[0],
            finca_id: null,
            bloque_id: null,
            variedad_id: null,
            cantidad: null,
        }]);
    };

    const updateRow = (id: string, field: keyof ProduccionRow, value: string | number | null) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const deleteRow = (id: string) => {
        setRows(prev => prev.filter(row => row.id !== id));
    };

    // Save to database
    const saveToDatabase = async () => {
        setSaving(true);
        setError(null);

        try {
            // Validate rows
            const invalidRows = rows.filter(r =>
                !r.finca_id || !r.bloque_id || !r.variedad_id || !r.cantidad || r.cantidad <= 0
            );

            if (invalidRows.length > 0) {
                throw new Error(`${invalidRows.length} fila(s) tienen datos incompletos`);
            }

            const payload = rows.map(r => ({
                fecha: r.fecha,
                finca_id: r.finca_id,
                bloque_id: r.bloque_id,
                variedad_id: r.variedad_id,
                cantidad: r.cantidad,
            }));

            const response = await fetch("/api/produccion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al guardar los datos");
            }

            setSuccess(`Se guardaron ${rows.length} registros exitosamente`);
            setTimeout(() => router.push("/produccion"), 1500);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // Mapping step UI
    const renderMappingSection = (
        title: string,
        mappings: Map<string, ValueMapping>,
        type: "finca" | "bloque" | "variedad",
        optionsMap: Map<number, string>
    ) => {
        const entries = [...mappings.entries()];
        if (entries.length === 0) return null;

        const unmapped = entries.filter(([, m]) => m.dbValue === null);
        const mapped = entries.filter(([, m]) => m.dbValue !== null);

        return (
            <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                    {title}
                    {unmapped.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {unmapped.length} sin mapear
                        </Badge>
                    )}
                    {unmapped.length === 0 && (
                        <Badge variant="default" className="bg-green-600 text-xs">
                            <Check className="h-3 w-3 mr-1" /> Todo mapeado
                        </Badge>
                    )}
                </h3>

                <div className="space-y-2">
                    {entries.map(([fileValue, mapping]) => (
                        <div key={fileValue} className="flex items-center gap-3 bg-muted/50 p-2 rounded-md">
                            <div className="flex-1 min-w-0">
                                <span className="font-mono text-sm truncate block">{fileValue}</span>
                                {mapping.suggestions.length > 0 && !mapping.dbValue && (
                                    <span className="text-xs text-muted-foreground">
                                        Sugerencia: {mapping.suggestions[0].name} ({mapping.suggestions[0].score}%)
                                    </span>
                                )}
                            </div>

                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                            <Select
                                value={mapping.dbValue?.toString() || ""}
                                onValueChange={(v) => updateMapping(type, fileValue, v ? Number(v) : null)}
                            >
                                <SelectTrigger className={`w-48 ${!mapping.dbValue ? 'border-orange-500' : 'border-green-500'}`}>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Show suggestions first */}
                                    {mapping.suggestions.length > 0 && (
                                        <>
                                            {mapping.suggestions.map(s => (
                                                <SelectItem key={`sug-${s.id}`} value={s.id.toString()}>
                                                    <span className="flex items-center gap-2">
                                                        {s.name}
                                                        <Badge variant="secondary" className="text-xs">{s.score}%</Badge>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                            <div className="border-t my-1" />
                                        </>
                                    )}
                                    {/* All options */}
                                    {[...optionsMap.entries()].map(([id, name]) => (
                                        <SelectItem key={id} value={id.toString()}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {mapping.dbValue ? (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 p-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/produccion")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold">Nueva Producción</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === "upload" && "Sube un archivo Excel o ingresa datos manualmente"}
                        {step === "columns" && "Mapea las columnas del archivo a los campos requeridos"}
                        {step === "values" && "Mapea los valores del archivo a la base de datos"}
                        {step === "review" && "Revisa los datos antes de guardar"}
                        {step === "manual" && "Ingresa los datos manualmente"}
                    </p>
                </div>
            </div>

            {/* Error/Success messages */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-600/10 text-green-600 p-3 rounded-md flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {success}
                </div>
            )}

            {/* Step: Upload */}
            {step === "upload" && (
                <div className="grid md:grid-cols-2 gap-4">
                    {/* File upload */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                Cargar Archivo
                            </CardTitle>
                            <CardDescription>
                                Formatos soportados: Excel (.xls, .xlsx) y CSV (.csv)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-2">
                                    Arrastra un archivo aquí o
                                </p>
                                <label className="cursor-pointer">
                                    <span className="text-primary hover:underline">selecciona un archivo</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xls,.xlsx,.csv"
                                        onChange={handleFileInput}
                                    />
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manual entry */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Ingreso Manual
                            </CardTitle>
                            <CardDescription>
                                Ingresa los datos de producción uno por uno
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full h-24"
                                variant="outline"
                                onClick={() => { addManualRow(); setStep("manual"); }}
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                Comenzar Ingreso Manual
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step: Column Mapping */}
            {step === "columns" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Mapeo de Columnas
                        </CardTitle>
                        <CardDescription>
                            Selecciona qué columna del archivo corresponde a cada campo.
                            Los campos con * son obligatorios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Raw file preview - first 5 rows */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Vista previa del archivo (primeras 5 filas de datos):</p>
                            <div className="overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            {fileHeaders.map((h, i) => (
                                                <TableHead key={i} className="font-mono text-xs whitespace-nowrap">
                                                    <span className="text-muted-foreground">[{i}]</span> {h || "(vacío)"}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fileData.length > headerRowIndex + 1 ? (
                                            fileData.slice(headerRowIndex + 1, headerRowIndex + 6).map((row, rowIdx) => (
                                                <TableRow key={rowIdx}>
                                                    {fileHeaders.map((_, colIdx) => (
                                                        <TableCell key={colIdx} className="text-sm whitespace-nowrap max-w-[200px] truncate">
                                                            {row && row[colIdx] !== undefined && row[colIdx] !== null && row[colIdx] !== ""
                                                                ? String(row[colIdx])
                                                                : <span className="text-muted-foreground">-</span>}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={fileHeaders.length} className="text-center text-muted-foreground">
                                                    No hay filas de datos después del encabezado (fila {headerRowIndex})
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Encabezado detectado en fila {headerRowIndex}. Total: {Math.max(0, fileData.length - headerRowIndex - 1)} filas de datos
                            </p>
                        </div>

                        {/* Column mappings */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Finca (opcional)</Label>
                                <Select
                                    value={columnMapping.finca?.toString() ?? "none"}
                                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, finca: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger className={columnMapping.finca !== null ? 'border-green-500' : ''}>
                                        <SelectValue placeholder="No mapear" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No mapear</SelectItem>
                                        {fileHeaders.map((h, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {h || `Columna ${i}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Bloque (opcional)</Label>
                                <Select
                                    value={columnMapping.bloque?.toString() ?? "none"}
                                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, bloque: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger className={columnMapping.bloque !== null ? 'border-green-500' : ''}>
                                        <SelectValue placeholder="No mapear" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No mapear</SelectItem>
                                        {fileHeaders.map((h, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {h || `Columna ${i}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Variedad (opcional)</Label>
                                <Select
                                    value={columnMapping.variedad?.toString() ?? "none"}
                                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, variedad: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger className={columnMapping.variedad !== null ? 'border-green-500' : ''}>
                                        <SelectValue placeholder="No mapear" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No mapear</SelectItem>
                                        {fileHeaders.map((h, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {h || `Columna ${i}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cantidad *</Label>
                                <Select
                                    value={columnMapping.cantidad?.toString() ?? "none"}
                                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, cantidad: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger className={columnMapping.cantidad !== null ? 'border-green-500' : 'border-orange-500'}>
                                        <SelectValue placeholder="Seleccionar columna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No mapear</SelectItem>
                                        {fileHeaders.map((h, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {h || `Columna ${i}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Fecha (opcional, usa hoy si no se mapea)</Label>
                                <Select
                                    value={columnMapping.fecha?.toString() ?? "none"}
                                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, fecha: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger className={columnMapping.fecha !== null ? 'border-green-500' : ''}>
                                        <SelectValue placeholder="No mapear (usar fecha actual)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No mapear (usar fecha actual)</SelectItem>
                                        {fileHeaders.map((h, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {h || `Columna ${i}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Mapped columns preview - shows what will be imported */}
                        {columnMapping.cantidad !== null && fileData.length > headerRowIndex + 1 && (
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
                                <p className="text-sm font-medium mb-2 text-green-800 dark:text-green-200">
                                    ✓ Vista previa de columnas mapeadas:
                                </p>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {columnMapping.finca !== null && <TableHead>Finca</TableHead>}
                                                {columnMapping.bloque !== null && <TableHead>Bloque</TableHead>}
                                                {columnMapping.variedad !== null && <TableHead>Variedad</TableHead>}
                                                <TableHead>Cantidad *</TableHead>
                                                {columnMapping.fecha !== null && <TableHead>Fecha</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fileData.slice(headerRowIndex + 1, headerRowIndex + 4).map((row, i) => (
                                                <TableRow key={i}>
                                                    {columnMapping.finca !== null && <TableCell>{String(row[columnMapping.finca] || "-")}</TableCell>}
                                                    {columnMapping.bloque !== null && <TableCell>{String(row[columnMapping.bloque] || "-")}</TableCell>}
                                                    {columnMapping.variedad !== null && <TableCell>{String(row[columnMapping.variedad] || "-")}</TableCell>}
                                                    <TableCell className="font-medium">{String(row[columnMapping.cantidad!] || "-")}</TableCell>
                                                    {columnMapping.fecha !== null && <TableCell>{String(row[columnMapping.fecha] || "-")}</TableCell>}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep("upload")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <Button onClick={processDataWithMapping} disabled={columnMapping.cantidad === null}>
                                Continuar
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step: Value Mapping */}
            {step === "values" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Mapeo de Valores
                        </CardTitle>
                        <CardDescription>
                            Algunos valores del archivo no coinciden exactamente con la base de datos.
                            Por favor, selecciona el valor correcto para cada uno.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {renderMappingSection("Fincas", fincaMappings, "finca", fincas)}
                        {renderMappingSection("Bloques", bloqueMappings, "bloque", bloqueNames)}
                        {renderMappingSection("Variedades", variedadMappings, "variedad", variedades)}

                        <div className="flex gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep("columns")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <Button onClick={proceedToReview}>
                                Continuar
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step: Review / Manual */}
            {(step === "review" || step === "manual") && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {step === "review" ? `Revisar Datos (${rows.length} registros)` : "Ingreso Manual"}
                        </CardTitle>
                        {step === "review" && (
                            <CardDescription>
                                Verifica que los datos sean correctos antes de guardar
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Finca</TableHead>
                                        <TableHead>Bloque</TableHead>
                                        <TableHead>Variedad</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    value={row.fecha}
                                                    onChange={(e) => updateRow(row.id, "fecha", e.target.value)}
                                                    className="w-36"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={row.finca_id?.toString() || ""}
                                                    onValueChange={(v) => updateRow(row.id, "finca_id", v ? Number(v) : null)}
                                                >
                                                    <SelectTrigger className={`w-40 ${!row.finca_id ? 'border-orange-500' : ''}`}>
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[...fincas.entries()].map(([id, name]) => (
                                                            <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={row.bloque_id?.toString() || ""}
                                                    onValueChange={(v) => updateRow(row.id, "bloque_id", v ? Number(v) : null)}
                                                >
                                                    <SelectTrigger className={`w-40 ${!row.bloque_id ? 'border-orange-500' : ''}`}>
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[...bloqueNames.entries()].map(([id, name]) => (
                                                            <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={row.variedad_id?.toString() || ""}
                                                    onValueChange={(v) => updateRow(row.id, "variedad_id", v ? Number(v) : null)}
                                                >
                                                    <SelectTrigger className={`w-40 ${!row.variedad_id ? 'border-orange-500' : ''}`}>
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[...variedades.entries()].map(([id, name]) => (
                                                            <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={row.cantidad || ""}
                                                    onChange={(e) => updateRow(row.id, "cantidad", e.target.value ? Number(e.target.value) : null)}
                                                    className={`w-24 ${!row.cantidad ? 'border-orange-500' : ''}`}
                                                    min={0}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteRow(row.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" onClick={addManualRow}>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Fila
                            </Button>

                            <div className="flex-1" />

                            <Button
                                variant="outline"
                                onClick={() => setStep(step === "review" ? "values" : "upload")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>

                            <Button onClick={saveToDatabase} disabled={saving || rows.length === 0}>
                                {saving ? (
                                    <>Guardando...</>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar {rows.length} Registro{rows.length !== 1 ? "s" : ""}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
