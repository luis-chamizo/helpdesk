// frontend/js/admin_manage_priorities.js

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof fetchData !== 'function' || typeof showMessage !== 'function' || 
        typeof clearMessage !== 'function' || typeof getCurrentUser !== 'function' ||
        typeof API_BASE_URL === 'undefined' || typeof window.loadComponent !== 'function') {
        console.error("Error crítico: Funciones o API_BASE_URL de utils.js no disponibles.");
        document.body.innerHTML = "<p style='color:red;text-align:center;margin-top:2rem;'>Error crítico al cargar. Contacte soporte.</p>";
        return;
    }

    const currentUser = getCurrentUser();
    const token = localStorage.getItem('token');
    const messageAreaPage = document.getElementById('message-area-priorities');

    if (!token || !currentUser) {
        if (messageAreaPage) showMessage(messageAreaPage.id, 'Debes iniciar sesión. Redirigiendo...', 'error');
        else alert('Debes iniciar sesión. Redirigiendo...');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }
    if (currentUser.rol !== 'admin') {
        if (messageAreaPage) showMessage(messageAreaPage.id, 'Acceso denegado. Solo administradores. Redirigiendo...', 'error');
        else alert('Acceso denegado. Solo administradores. Redirigiendo...');
        const dashboardUrl = currentUser.rol === 'usuario' ? 'dashboard_usuario.html' : 'dashboard_tecnico.html';
        setTimeout(() => { window.location.href = dashboardUrl; }, 3000);
        return;
    }

    const prioritiesTableBody = document.getElementById('priorities-table-body');
    const prioritiesTable = document.getElementById('priorities-table');
    const loadingMessage = document.getElementById('loading-priorities');
    const errorMessageDisplay = document.getElementById('error-priorities');
    const noPrioritiesMessage = document.getElementById('no-priorities');
    
    const priorityModal = document.getElementById('priority-modal');
    const priorityForm = document.getElementById('priority-form');
    const modalTitlePriority = document.getElementById('modal-title-priority');
    const priorityIdInput = document.getElementById('id_prioridad');
    const nombrePrioridadInput = document.getElementById('nombre_prioridad_modal');
    const savePriorityBtn = document.getElementById('save-priority-btn');
    const closeModalPriorityBtn = document.getElementById('close-priority-modal-btn');
    const cancelModalPriorityBtn = document.getElementById('cancel-priority-modal-btn');
    const addPriorityBtn = document.getElementById('add-priority-btn');
    const messageAreaModalPriority = document.getElementById('message-area-modal-priority');

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
    }

    async function loadAndRenderPriorities() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessageDisplay) errorMessageDisplay.style.display = 'none';
        if (noPrioritiesMessage) noPrioritiesMessage.style.display = 'none';
        if (prioritiesTable) prioritiesTable.style.display = 'none';
        if (prioritiesTableBody) prioritiesTableBody.innerHTML = '';
        if (messageAreaPage) clearMessage(messageAreaPage.id);

        try {
            const priorities = await fetchData('/api/v1/prioridades'); 

            if (priorities && priorities.length > 0) {
                if (prioritiesTable) prioritiesTable.style.display = 'table';
                priorities.forEach(prio => {
                    const row = prioritiesTableBody.insertRow();
                    row.innerHTML = `
                        <td>${prio.ID_PRIORIDAD}</td>
                        <td>${escapeHTML(prio.NOMBRE_PRIORIDAD || '')}</td>
                        <td class="actions">
                            <a href="#" class="edit-priority-btn" data-id="${prio.ID_PRIORIDAD}" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg></a>
                            <a href="#" class="delete-priority-btn" data-id="${prio.ID_PRIORIDAD}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.024l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m3.5-.05L7.5 13.5a.5.5 0 1 0 .998.058l.5-8.5a.5.5 0 1 0-.998-.058m2.458.056l-.5 8.5a.5.5 0 1 0 .998.06l.5-8.5a.5.5 0 1 0-.998-.06"/></svg></a>
                        </td>
                    `;
                });
                attachPriorityTableButtonListeners();
            } else {
                if (noPrioritiesMessage) noPrioritiesMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al cargar prioridades:', error);
            if (errorMessageDisplay) {
                errorMessageDisplay.textContent = `Error al cargar: ${error.message || 'Error desconocido'}`;
                errorMessageDisplay.style.display = 'block';
            }
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    function openPriorityModal(mode = 'add', priority = null) {
        if (!priorityModal || !priorityForm || !messageAreaModalPriority) return;
        
        clearMessage(messageAreaModalPriority.id);
        priorityForm.reset();
        priorityIdInput.value = '';

        if (mode === 'edit' && priority) {
            if (modalTitlePriority) modalTitlePriority.textContent = 'Editar Prioridad';
            priorityIdInput.value = priority.ID_PRIORIDAD;
            if (nombrePrioridadInput) nombrePrioridadInput.value = priority.NOMBRE_PRIORIDAD;
            if (savePriorityBtn) savePriorityBtn.textContent = 'Actualizar Prioridad';
        } else {
            if (modalTitlePriority) modalTitlePriority.textContent = 'Añadir Nueva Prioridad';
            if (savePriorityBtn) savePriorityBtn.textContent = 'Guardar Prioridad';
        }
        priorityModal.style.display = 'flex';
    }

    function closePriorityModal() {
        if (priorityModal) priorityModal.style.display = 'none';
    }

    if (addPriorityBtn) {
        addPriorityBtn.addEventListener('click', () => openPriorityModal('add'));
    }
    if (closeModalPriorityBtn) {
        closeModalPriorityBtn.addEventListener('click', closePriorityModal);
    }
    if (cancelModalPriorityBtn) {
        cancelModalPriorityBtn.addEventListener('click', closePriorityModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === priorityModal) {
            closePriorityModal();
        }
    });

    if (priorityForm) {
        priorityForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if(messageAreaModalPriority) clearMessage(messageAreaModalPriority.id);

            const id = priorityIdInput.value;
            const nombre = nombrePrioridadInput.value.trim();

            if (!nombre) {
                if (messageAreaModalPriority) showMessage(messageAreaModalPriority.id, 'El nombre de la prioridad es obligatorio.', 'error');
                return;
            }
             if (nombre.length < 3 || nombre.length > 10) { // Validación de longitud
                if (messageAreaModalPriority) showMessage(messageAreaModalPriority.id, 'El nombre debe tener entre 3 y 10 caracteres.', 'error');
                return;
            }

            const priorityData = { nombre_prioridad: nombre };
            const originalButtonText = savePriorityBtn.textContent;
            savePriorityBtn.disabled = true;
            savePriorityBtn.textContent = id ? 'Actualizando...' : 'Guardando...';

            try {
                let response;
                if (id) { // Modo Editar
                    response = await fetchData(`/api/v1/prioridades/${id}`, {
                        method: 'PUT',
                        body: priorityData
                    });
                } else { // Modo Añadir
                    response = await fetchData('/api/v1/prioridades', {
                        method: 'POST',
                        body: priorityData
                    });
                }
                if (messageAreaPage) showMessage(messageAreaPage.id, response.message || (id ? 'Prioridad actualizada.' : 'Prioridad creada.'), 'success');
                closePriorityModal();
                await loadAndRenderPriorities();
            } catch (error) {
                console.error('Error al guardar/actualizar prioridad:', error);
                let displayMsg = error.message || 'Ocurrió un error.';
                if (error.data && Array.isArray(error.data.errors)) {
                    displayMsg = error.data.errors.map(e => e.msg).join('; ');
                } else if (error.data && error.data.message) {
                    displayMsg = error.data.message;
                }
                if (messageAreaModalPriority) showMessage(messageAreaModalPriority.id, displayMsg, 'error');
            } finally {
                savePriorityBtn.disabled = false;
                savePriorityBtn.textContent = originalButtonText;
            }
        });
    }
    
    function attachPriorityTableButtonListeners() {
        document.querySelectorAll('.edit-priority-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageAreaPage) clearMessage(messageAreaPage.id);
                try {
                    // El backend para prioridades devuelve un array incluso para getById, tomamos el primer elemento.
                    // O mejor, ajusta el backend prioridadController.getPriorityById para que devuelva un objeto o null.
                    // Por ahora, asumimos que fetchData puede devolver el objeto directamente si el backend está bien.
                    const priorityData = await fetchData(`/api/v1/prioridades/${id}`);
                    if (priorityData) { // priorityData no será un array si el backend getById devuelve un solo objeto
                        openPriorityModal('edit', priorityData);
                    } else {
                       if (messageAreaPage) showMessage(messageAreaPage.id, `Prioridad ID ${id} no encontrada.`, 'error');
                       await loadAndRenderPriorities();
                    }
                } catch (error) {
                    if (messageAreaPage) showMessage(messageAreaPage.id, `Error al obtener prioridad: ${error.message}`, 'error');
                }
            });
        });

        document.querySelectorAll('.delete-priority-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageAreaPage) clearMessage(messageAreaPage.id);
                if (confirm(`¿Estás seguro de que quieres eliminar la prioridad ID ${id}? Esta acción no se puede deshacer.`)) {
                    try {
                        const response = await fetchData(`/api/v1/prioridades/${id}`, { method: 'DELETE' });
                        if (messageAreaPage) showMessage(messageAreaPage.id, response.message || `Prioridad ID ${id} eliminada.`, 'success');
                        await loadAndRenderPriorities();
                    } catch (error) {
                        console.error(`Error al eliminar prioridad ID ${id}:`, error);
                        let displayMsg = error.message || 'No se pudo eliminar la prioridad.';
                         if (error.data && error.data.message) { displayMsg = error.data.message; }
                        if (messageAreaPage) showMessage(messageAreaPage.id, displayMsg, 'error');
                    }
                }
            });
        });
    }

    await loadAndRenderPriorities();
});