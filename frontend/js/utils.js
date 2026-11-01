// frontend/js/utils.js

// Hacer la constante API_BASE_URL accesible globalmente
window.API_BASE_URL = 'http://localhost:3000'; // OJO: Cambia el puerto si tu backend corre en otro (ej. 3001)

/**
 * Carga dinámicamente contenido HTML desde una URL en un elemento contenedor del DOM.
 * El contenedor debe tener un ID con el formato 'elementIdBase-container'.
 * @param {string} elementIdBase - La base del ID del elemento (ej. 'header', 'footer').
 * @param {string} url - La URL del archivo HTML del componente a cargar.
 */
window.loadComponent = async function(elementIdBase, url) {
    try {
        const response = await fetch(url); 
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} cargando componente: ${url}. ${response.statusText}`);
        }
        const html = await response.text();
        const container = document.getElementById(elementIdBase + "-container");
        if (container) {
            container.innerHTML = html;
        } else {
            // No mostrar console.warn si es para header/footer en páginas donde no existen esos contenedores.
            // Puedes hacer esto más selectivo o simplemente aceptar el warning si no es crítico.
            // console.warn(`Contenedor con ID '${elementIdBase}-container' no encontrado para el componente desde ${url}.`);
        }
    } catch (error) {
        console.error(`No se pudo cargar el componente '${elementIdBase}' desde ${url}:`, error);
    }
};

/**
 * Muestra un mensaje en un elemento específico del DOM.
 * @param {string} elementId - El ID del elemento HTML donde se mostrará el mensaje.
 * @param {string} message - El texto del mensaje.
 * @param {'success' | 'error' | 'info' | 'warning'} type - Tipo de mensaje.
 */
window.showMessage = function(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.innerHTML = message; 
        messageElement.className = 'message-box'; 
        messageElement.classList.add(type);     
        messageElement.style.display = 'block'; 
    } else {
        console.warn(`Elemento de mensaje con ID '${elementId}' no encontrado en el DOM.`);
    }
};

/**
 * Limpia (oculta y borra) un mensaje de un elemento específico del DOM.
 * @param {string} elementId - El ID del elemento de mensaje.
 */
window.clearMessage = function(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.innerHTML = ''; 
        messageElement.style.display = 'none'; 
        messageElement.classList.remove('success', 'error', 'info', 'warning');
    }
};

/**
 * Realiza una solicitud fetch a la API, manejando token y errores.
 * @param {string} relativeUrl - La URL relativa del endpoint (ej. '/api/v1/tickets').
 * @param {object} options - Opciones para fetch.
 * @returns {Promise<any>} - La respuesta JSON parseada o null.
 * @throws {Error} - Error estructurado.
 */
window.fetchData = async function(relativeUrl, options = {}) {
    const token = localStorage.getItem('token');
    // API_BASE_URL ahora se accede como window.API_BASE_URL o simplemente API_BASE_URL
    // porque este script se ejecuta y define API_BASE_URL en window.
    const url = `${window.API_BASE_URL || 'http://localhost:3000'}${relativeUrl}`; 

    const defaultHeaders = {
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    } else if (options.body && typeof options.body === 'string') {
        // Si el body ya es un string JSON y no se ha especificado Content-Type, intentar añadirlo.
        if (!options.headers || !options.headers['Content-Type']) {
             try {
                JSON.parse(options.body); 
                defaultHeaders['Content-Type'] = 'application/json';
            } catch (e) { /* No es un JSON string válido, no añadir Content-Type */ }
        }
    }

    options.headers = { ...defaultHeaders, ...options.headers };

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); } 
            catch (e) { errorData = { message: response.statusText || `Error HTTP ${response.status}` }; }
            
            const error = new Error(errorData.message || `Error en la solicitud a ${url}`);
            error.status = response.status; 
            error.data = errorData; 
            console.error(`Error ${error.status} en fetchData (${options.method || 'GET'} ${url}):`, errorData.errors || errorData.message || errorData);
            throw error;
        }

        if (response.status === 204) return null; 
        const responseText = await response.text();
        if (!responseText) return null;

        try { return JSON.parse(responseText); } 
        catch (e) { 
            console.warn(`Respuesta de ${url} no fue JSON válido. Devolviendo texto plano:`, responseText.substring(0,100)); // Mostrar solo una parte si es muy largo
            return responseText; 
        }
    } catch (error) {
        if (!error.status) { 
             console.error(`Error de red o conexión al intentar ${options.method || 'GET'} ${url}:`, error.message);
             const networkError = new Error('Error de conexión. Verifica tu red e intenta de nuevo más tarde.');
             networkError.isNetworkError = true; 
             throw networkError;
        }
        throw error; 
    }
};

/**
 * Formatea una fecha a un formato legible en español.
 * @param {string | Date} dateString - La fecha.
 * @param {object} [options] - Opciones para Intl.DateTimeFormat.
 * @returns {string} - La fecha formateada o "N/A".
 */
window.formatReadableDate = function(dateString, options) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn("formatReadableDate recibió una fecha inválida:", dateString);
            return 'Fecha inválida'; 
        }
        const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return new Intl.DateTimeFormat('es-ES', { ...defaultOptions, ...options }).format(date);
    } catch (e) {
        console.error("Error formateando fecha:", dateString, e);
        return String(dateString); 
    }
};

/**
 * Obtiene el valor de un parámetro de la query string de la URL actual.
 * @param {string} paramName - El nombre del parámetro.
 * @returns {string|null} El valor o null.
 */
window.getQueryParam = function(paramName) {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
};

/**
 * Verifica si hay un token en localStorage.
 * @returns {boolean}
 */
window.isLoggedIn = function() {
    return !!localStorage.getItem('token');
};

/**
 * Obtiene el objeto del usuario actual de localStorage.
 * @returns {object|null}
 */
window.getCurrentUser = function() {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
        try { return JSON.parse(userString); } 
        catch (e) {
            console.error("Error al parsear currentUser de localStorage:", e);
            localStorage.removeItem('currentUser'); 
            localStorage.removeItem('token');      
            return null;
        }
    }
    return null;
};

/**
 * Realiza el logout del usuario.
 */
window.logoutUser = async function() { 
    // Opcional: llamar a un endpoint de logout en el backend
    // try {
    //     await fetchData(`${window.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/logout`, { method: 'POST' });
    // } catch (error) {
    //     console.warn("Error al intentar hacer logout en el backend (puede ignorarse si no hay endpoint):", error.message);
    // }
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html'; 
};

console.log("utils.js cargado y funciones/constantes asignadas a window.");