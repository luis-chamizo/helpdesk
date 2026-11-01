// frontend/js/crear_ticket.js

document.addEventListener('DOMContentLoaded', async () => {
    const ticketForm = document.getElementById('ticket-form');
    const categoriaSelect = document.getElementById('categoria');
    const prioridadSelect = document.getElementById('prioridad');
    const messageArea = document.getElementById('message-area'); 
    const cancelButton = document.getElementById('cancel-ticket-button');

    if (typeof fetchData !== 'function' || typeof showMessage !== 'function' || 
        typeof clearMessage !== 'function' || typeof loadComponent !== 'function' ||
        typeof getQueryParam !== 'function' || typeof getCurrentUser !== 'function' || // Añadido getQueryParam por si acaso, getCurrentUser es vital
        typeof API_BASE_URL === 'undefined') { // Asegurarse que las funciones de utils.js y API_BASE_URL estén
        console.error("Error crítico: Funciones esenciales o API_BASE_URL de utils.js no disponibles.");
        if (messageArea) showMessage(messageArea.id, "Error crítico al cargar la página. Funcionalidades no disponibles.", "error");
        else if (document.body) { // Fallback si messageArea no existe aún
            let tempMsgDiv = document.createElement('div');
            tempMsgDiv.id = 'temp-critical-error';
            tempMsgDiv.className = 'message-box error'; // Asume que .message-box y .error están definidos globalmente
            tempMsgDiv.textContent = "Error crítico al cargar la página.";
            document.body.prepend(tempMsgDiv);
        }
        return;
    }
    
    if (!ticketForm || !categoriaSelect || !prioridadSelect || !messageArea) {
        console.error('Faltan elementos esenciales del formulario en crear_ticket.html. IDs esperados: ticket-form, categoria, prioridad, message-area.');
        // Intentar mostrar mensaje incluso si messageArea principal falta, creando uno temporal
        const tempMsgId = messageArea ? messageArea.id : 'temp-crear-ticket-msg-load';
        let msgElement = document.getElementById(tempMsgId);
        if (!msgElement && document.querySelector('.form-page-card')) { // Intentar insertar en un lugar visible
            msgElement = document.createElement('div');
            msgElement.id = tempMsgId;
            msgElement.className = 'message-box';
            msgElement.style.display = 'none';
            document.querySelector('.form-page-card').prepend(msgElement);
        }
        if (msgElement) showMessage(tempMsgId, 'Error al cargar el formulario. Faltan componentes HTML.', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    const currentUser = getCurrentUser();

    if (!token || !currentUser) {
        showMessage(messageArea.id, 'Debes iniciar sesión para crear un ticket. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return; 
    }

    if (currentUser.rol !== 'usuario') {
        showMessage(messageArea.id, 'Solo los usuarios registrados pueden crear tickets. Serás redirigido.', 'warning');
        setTimeout(() => { 
            if (currentUser.rol === 'admin' || currentUser.rol === 'tecnico') {
                window.location.href = 'dashboard_tecnico.html';
            } else {
                window.location.href = 'login.html';
            }
        }, 3000);
        return;
    }

    // --- INICIO: LÓGICA PARA PREVENIR "VOLVER" CON FLECHA DEL NAVEGADOR ---
    // Se activa solo si el usuario está autenticado y tiene el rol correcto para esta página.
    history.pushState(null, document.title, location.href); 

    window.addEventListener('popstate', function (event) {
        const currentTokenPop = localStorage.getItem('token');
        const currentUserPop = getCurrentUser(); 
        // Verificar si el usuario sigue logueado y si su rol sigue siendo 'usuario'
        if (currentTokenPop && currentUserPop && currentUserPop.rol === 'usuario') { 
            history.pushState(null, document.title, location.href); 
            
            if (messageArea) { // Usar el messageArea existente en esta página
                showMessage(messageArea.id, "Para salir de la creación de tickets, utiliza el botón 'Cancelar' o navega mediante el menú.", "info");
                setTimeout(() => { 
                    if (messageArea.style.display !== 'none' && messageArea.textContent.includes("Cancelar")) {
                        clearMessage(messageArea.id);
                    }
                }, 4000); 
            }
        }
    });
    // --- FIN: LÓGICA PARA PREVENIR "VOLVER" CON FLECHA DEL NAVEGADOR ---

    async function populateSelectWithOptions(selectElement, endpoint, defaultOptionText, noDataText, errorText, valueField, textField) {
        try {
            const items = await fetchData(endpoint); 
            if (items && items.length > 0) {
                selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item[valueField]; 
                    option.textContent = item[textField];
                    selectElement.appendChild(option);
                });
            } else {
                selectElement.innerHTML = `<option value="">${noDataText}</option>`;
                if (items && messageArea) { // Solo mostrar si messageArea existe
                     showMessage(messageArea.id, `No hay ${selectElement.id} disponibles para seleccionar.`, 'info');
                }
            }
        } catch (error) {
            console.error(`Error al cargar datos para ${selectElement.id}:`, error);
            if (messageArea) showMessage(messageArea.id, `${errorText}: ${error.message || 'Error desconocido'}`, 'error');
            selectElement.innerHTML = `<option value="">${errorText}</option>`;
        }
    }
    
    await Promise.all([
        populateSelectWithOptions(categoriaSelect, '/api/v1/categorias', 'Seleccione una categoría...', 'No hay categorías disponibles', 'Error al cargar categorías', 'ID_CATEGORIA', 'NOMBRE_CATEGORIA'),
        populateSelectWithOptions(prioridadSelect, '/api/v1/prioridades', 'Seleccione una prioridad...', 'No hay prioridades disponibles', 'Error al cargar prioridades', 'ID_PRIORIDAD', 'NOMBRE_PRIORIDAD')
    ]).catch(err => {
        console.error("Error al poblar uno o más selects:", err);
        // El manejo de error individual en populateSelectWithOptions ya informa al usuario.
    });

    ticketForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (messageArea) clearMessage(messageArea.id);

        const tituloInput = document.getElementById('titulo');
        const descripcionInput = document.getElementById('descripcion');
        
        const titulo = tituloInput.value.trim();
        const descripcion = descripcionInput.value.trim();
        const id_categoria = categoriaSelect.value;
        const id_prioridad = prioridadSelect.value;

        if (!titulo || !descripcion || !id_categoria || !id_prioridad) {
            if (messageArea) showMessage(messageArea.id, 'Todos los campos son obligatorios (título, descripción, categoría y prioridad).', 'error');
            return;
        }
        if (titulo.length < 5 || titulo.length > 100) {
            if (messageArea) showMessage(messageArea.id, 'El título debe tener entre 5 y 100 caracteres.', 'error');
            return;
        }
        if (descripcion.length < 10) {
            if (messageArea) showMessage(messageArea.id, 'La descripción debe tener al menos 10 caracteres.', 'error');
            return;
        }

        const submitButton = ticketForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando Ticket...';
        }

        const ticketData = {
            titulo,
            descripcion,
            id_categoria: parseInt(id_categoria),
            id_prioridad: parseInt(id_prioridad)
        };

        try {
            const respuesta = await fetchData('/api/v1/tickets', {
                method: 'POST',
                body: ticketData
            });

            if (messageArea) showMessage(messageArea.id, respuesta.message || 'Ticket creado exitosamente. Serás redirigido a tu dashboard.', 'success');
            ticketForm.reset(); 
            
            categoriaSelect.value = "";
            prioridadSelect.value = "";

            setTimeout(() => {
                window.location.href = 'dashboard_usuario.html';
            }, 2000); 

        } catch (error) {
            console.error('Error al crear el ticket:', error);
            let displayMessage = error.message || 'No se pudo crear el ticket. Intenta de nuevo.';
            if (error.data && Array.isArray(error.data.errors)) { 
                displayMessage = error.data.errors.map(e => e.msg).join(' \n');
            } else if (error.data && error.data.message) { 
                displayMessage = error.data.message;
            }
            if (messageArea) showMessage(messageArea.id, displayMessage, 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });

    if (cancelButton) {
        if (cancelButton.hasAttribute('onclick')) {
            cancelButton.removeAttribute('onclick');
        }
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            let formHasData = false;
            const inputs = ticketForm.querySelectorAll('input[type="text"], textarea, select');
            inputs.forEach(input => {
                if (input.type === 'select-one') {
                    if (input.value !== "") formHasData = true;
                } else if (input.value.trim() !== "") {
                    formHasData = true;
                }
            });

            if (formHasData) {
                if (confirm("¿Estás seguro de que quieres cancelar? Los datos no guardados se perderán.")) {
                    window.location.href = 'dashboard_usuario.html';
                }
            } else {
                window.location.href = 'dashboard_usuario.html';
            }
        });
    }
});