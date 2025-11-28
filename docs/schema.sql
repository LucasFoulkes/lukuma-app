-- Lukuma Database Schema
-- Generated: 2025-11-27

-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

-- Finca (Farm)
CREATE TABLE finca (
    id_finca        SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- Bloque (Block within a farm)
CREATE TABLE bloque (
    id_bloque       SERIAL PRIMARY KEY,
    id_finca        INTEGER NOT NULL REFERENCES finca(id_finca),
    nombre          VARCHAR(20) NOT NULL,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- Breeder
CREATE TABLE breeder (
    id_breeder      SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- Variedad (Variety)
CREATE TABLE variedad (
    id_variedad     SERIAL PRIMARY KEY,
    id_breeder      INTEGER REFERENCES breeder(id_breeder),
    nombre          VARCHAR(100) NOT NULL,
    color           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- =============================================================================
-- BED MANAGEMENT
-- =============================================================================

-- Grupo Cama (Bed Group - links beds to block+variety)
CREATE TABLE grupo_cama (
    id_grupo        SERIAL PRIMARY KEY,
    id_bloque       INTEGER NOT NULL REFERENCES bloque(id_bloque),
    id_variedad     INTEGER NOT NULL REFERENCES variedad(id_variedad),
    fecha_siembra   DATE,
    estado          VARCHAR,        -- 'Productivo', 'Vegetativo', 'Renovación'
    patron          VARCHAR,        -- Rootstock variety
    tipo_planta     VARCHAR,        -- 'Injerto en finca', 'MiniPlanta'
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- Cama (Bed)
CREATE TABLE cama (
    id_cama         BIGSERIAL PRIMARY KEY,
    id_grupo        INTEGER REFERENCES grupo_cama(id_grupo),
    nombre          VARCHAR(20) NOT NULL,
    largo_metros    NUMERIC(5),
    ancho_metros    INTEGER,
    plantas_totales INTEGER,
    columna         INTEGER,        -- Column number: odd=1, even=2
    creado_en       TIMESTAMPTZ DEFAULT now(),
    eliminado_en    TIMESTAMPTZ
);

-- =============================================================================
-- USERS & AUTH
-- =============================================================================

-- Rol (lookup table)
CREATE TABLE rol (
    codigo          VARCHAR(50) PRIMARY KEY
);

-- Usuario
CREATE TABLE usuario (
    id_usuario      BIGINT PRIMARY KEY,
    nombres         TEXT NOT NULL,
    apellidos       TEXT,
    rol             TEXT NOT NULL,
    pin             VARCHAR,        -- 4-6 digit field auth PIN
    cedula          TEXT,
    nombre_usuario  VARCHAR(50),    -- Login username
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- GPS TRACKING
-- =============================================================================

-- Punto GPS
CREATE TABLE punto_gps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitud         DOUBLE PRECISION NOT NULL,
    longitud        DOUBLE PRECISION NOT NULL,
    precision       REAL NOT NULL,
    altitud         DOUBLE PRECISION,
    usuario_id      BIGINT REFERENCES usuario(id_usuario),
    creado_en       TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- OBSERVATIONS
-- =============================================================================

-- Observacion Tipo (lookup table)
CREATE TABLE observacion_tipo (
    codigo          VARCHAR PRIMARY KEY
);

-- Observacion
CREATE TABLE observacion (
    id_observacion  BIGSERIAL PRIMARY KEY,
    id_cama         BIGINT NOT NULL REFERENCES cama(id_cama),
    tipo_observacion VARCHAR NOT NULL REFERENCES observacion_tipo(codigo),
    cantidad        INTEGER NOT NULL,   -- Plants observed at this phenological stage
    id_usuario      BIGINT REFERENCES usuario(id_usuario),
    id_punto_gps    UUID REFERENCES punto_gps(id),
    creado_en       TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- PHENOLOGICAL STATE
-- =============================================================================

-- Estado Fenologico Orden (lookup table)
CREATE TABLE estado_fenologico_orden (
    codigo_observacion VARCHAR PRIMARY KEY,
    orden              INTEGER NOT NULL
);

-- Estado Fenologico (expected days for each stage per block+variety)
CREATE TABLE estado_fenologico (
    id_estado_fenologico SERIAL PRIMARY KEY,
    id_bloque            INTEGER REFERENCES bloque(id_bloque),
    id_variedad          INTEGER REFERENCES variedad(id_variedad),
    dias_brotacion       INTEGER,
    dias_cincuenta_mm    INTEGER,
    dias_quince_cm       INTEGER,
    dias_veinte_cm       INTEGER,
    dias_primera_hoja    INTEGER,
    dias_espiga          INTEGER,
    dias_arroz           INTEGER,
    dias_arveja          INTEGER,
    dias_garbanzo        INTEGER,
    dias_uva             INTEGER,
    dias_rayando_color   INTEGER,
    dias_sepalos_abiertos INTEGER,
    dias_cosecha         INTEGER,
    creado_en            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    eliminado_en         TIMESTAMPTZ
);

-- =============================================================================
-- PRODUCTION & OPERATIONS
-- =============================================================================

-- Pinche Tipo (lookup table)
CREATE TABLE pinche_tipo (
    codigo          TEXT PRIMARY KEY
);

-- Pinche
CREATE TABLE pinche (
    id              BIGINT PRIMARY KEY,
    bloque          INTEGER REFERENCES bloque(id_bloque),
    cama            BIGINT REFERENCES cama(id_cama),
    variedad        INTEGER REFERENCES variedad(id_variedad),
    cantidad        BIGINT NOT NULL,
    tipo            TEXT,           -- 'pinche programado', 'pinche apertura', 'pinche sanitario'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produccion (aggregated at finca/bloque/variedad level)
CREATE TABLE produccion (
    finca           INTEGER NOT NULL REFERENCES finca(id_finca),
    bloque          INTEGER NOT NULL REFERENCES bloque(id_bloque),
    variedad        INTEGER NOT NULL REFERENCES variedad(id_variedad),
    cantidad        INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (finca, bloque, variedad, created_at)
);

-- =============================================================================
-- LOOKUP TABLES
-- =============================================================================

CREATE TABLE grupo_cama_estado (
    codigo          VARCHAR(20) PRIMARY KEY
);

CREATE TABLE grupo_cama_tipo_planta (
    codigo          VARCHAR(30) PRIMARY KEY
);

CREATE TABLE patron (
    codigo          VARCHAR(50) PRIMARY KEY,
    proveedor       TEXT
);
