// backend/utils/dbUtils.js

/**
 * Lee el contenido de un objeto CLOB de Oracle y lo convierte a string.
 * @param {object | string | null} clob - El objeto CLOB devuelto por el driver de Oracle, o un string, o null.
 * @returns {Promise<string|null>} El contenido del CLOB como string, null si el CLOB es null,
 * o un mensaje de error si la lectura falla.
 */
async function readClob(clob) {
    if (!clob) {
        // console.log("[readClob] CLOB es null o undefined, devolviendo null.");
        return null;
    }
    if (typeof clob === 'string') {
        // console.log("[readClob] El dato ya es un string, devolviéndolo directamente.");
        return clob; // Si ya es un string (ej. VARCHAR2 o CLOB ya convertido por alguna razón)
    }
    
    // Verificar si es un objeto Lob de oracledb con la función getData
    if (clob && typeof clob.getData === 'function') {
        try {
            // console.log("[readClob] Intentando leer datos del objeto Lob...");
            const data = await clob.getData();
            // clob.destroy(); // Opcional: liberar recursos del LOB si ya no se necesita y el driver lo recomienda.
                              // Sin embargo, oracledb suele manejar esto bien con el cierre de la conexión.
                              // En versiones muy antiguas o escenarios específicos podría ser útil. Por ahora, lo omitimos.
            const clobString = data ? data.toString() : "";
            // console.log("[readClob] CLOB leído exitosamente, longitud:", clobString.length);
            return clobString;
        } catch (err) {
            console.error("[readClob] Error crítico al intentar leer datos del CLOB:", err.message);
            console.error("[readClob] Stack del error:", err.stack); // Log completo del error
            // Devolver un mensaje de error más específico o un valor por defecto podría ser mejor
            // que simplemente "[Error al leer datos del CLOB]" para depuración en el frontend.
            return `[Error de servidor al procesar datos grandes: ${err.message}]`;
        }
    }
    
    console.warn("[readClob] Tipo de dato inesperado para clob. No es null, string, ni un objeto Lob con getData. Tipo:", typeof clob, "Valor:", clob);
    return "[Tipo de datos de CLOB no compatible o CLOB inválido]";
}

module.exports = { readClob };