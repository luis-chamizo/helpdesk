// frontend/js/admin_manage_technicians.js

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar utilidades y autenticación
    if (typeof fetchData !== 'function' || typeof showMessage !== 'function' || 
        typeof clearMessage !== 'function' || typeof getCurrentUser !== 'function' ||
        typeof API_BASE_URL === 'undefined' || typeof window.loadComponent !== 'function') {
        console.error("Error crítico: Funciones o API_BASE_URL de utils.js no disponibles.");
        document.body.innerHTML = "<p style='color:red;text-align:center;margin-top:2rem;'>Error crítico al cargar. Contacte soporte.</p>";
        return;
    }

    const currentUser = getCurrentUser();
    const token = localStorage.getItem('token');
    const messageAreaPage = document.getElementById('message-area-technicians'); // Mensajes para la página principal

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

    // Elementos DOM
    const techniciansTableBody = document.getElementById('technicians-table-body');
    const techniciansTable = document.getElementById('technicians-table');
    const loadingMessage = document.getElementById('loading-technicians');
    const errorMessageDisplay = document.getElementById('error-technicians');
    const noTechniciansMessage = document.getElementById('no-technicians');
    
    const technicianModal = document.getElementById('technician-modal');
    const technicianForm = document.getElementById('technician-form');
    const modalTitleTechnician = document.getElementById('modal-title-technician');
    const technicianIdInput = document.getElementById('id_tecnico');
    const nombreCompletoInput = document.getElementById('nombre_completo_tec');
    const correoInput = document.getElementById('correo_tec');
    const especialidadInput = document.getElementById('especialidad_tec');
    const usuarioLoginInput = document.getElementById('usuario_login_tec');
    const contrasenaInput = document.getElementById('contrasena_tec');
    const activoSelect = document.getElementById('activo_tec');
    const saveTechnicianBtn = document.getElementById('save-technician-btn');
    const closeModalTechnicianBtn = document.getElementById('close-technician-modal-btn');
    const cancelModalTechnicianBtn = document.getElementById('cancel-technician-modal-btn');
    const addTechnicianBtn = document.getElementById('add-technician-btn');
    const messageAreaModalTechnician = document.getElementById('message-area-modal-technician');

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
    }

    async function loadAndRenderTechnicians() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessageDisplay) errorMessageDisplay.style.display = 'none';
        if (noTechniciansMessage) noTechniciansMessage.style.display = 'none';
        if (techniciansTable) techniciansTable.style.display = 'none';
        if (techniciansTableBody) techniciansTableBody.innerHTML = '';
        if (messageAreaPage) clearMessage(messageAreaPage.id);

        try {
            const technicians = await fetchData('/api/v1/tecnicos'); 

            if (technicians && technicians.length > 0) {
                if (techniciansTable) techniciansTable.style.display = 'table';
                technicians.forEach(tec => {
                    const row = techniciansTableBody.insertRow();
                    row.innerHTML = `
                        <td>${tec.ID_TECNICO}</td>
                        <td>${escapeHTML(tec.NOMBRE_COMPLETO || '')}</td>
                        <td>${escapeHTML(tec.CORREO || '')}</td>
                        <td>${escapeHTML(tec.ESPECIALIDAD || '')}</td>
                        <td>${escapeHTML(tec.USUARIO_LOGIN || '')}</td>
                        <td>${tec.ACTIVO === 'S' ? 'Sí' : 'No'}</td>
                        <td class="actions">
                            <a href="#" class="edit-technician-btn" data-id="${tec.ID_TECNICO}" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg></a>
                            <a href="#" class="delete-technician-btn" data-id="${tec.ID_TECNICO}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.024l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m3.5-.05L7.5 13.5a.5.5 0 1 0 .998.058l.5-8.5a.5.5 0 1 0-.998-.058m2.458.056l-.5 8.5a.5.5 0 1 0 .998.06l.5-8.5a.5.5 0 1 0-.998-.06"/></svg></a>
                        </td>
                    `;
                });
                attachTechnicianTableButtonListeners();
            } else {
                if (noTechniciansMessage) noTechniciansMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al cargar técnicos:', error);
            if (errorMessageDisplay) {
                errorMessageDisplay.textContent = `Error al cargar: ${error.message || 'Error desconocido'}`;
                errorMessageDisplay.style.display = 'block';
            }
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    function openTechnicianModal(mode = 'add', technician = null) {
        if (!technicianModal || !technicianForm || !messageAreaModalTechnician) return;
        
        clearMessage(messageAreaModalTechnician.id);
        technicianForm.reset();
        technicianIdInput.value = '';
        contrasenaInput.placeholder = "Ingresa la contraseña"; // Reset placeholder
        contrasenaInput.required = true; // Contraseña requerida para nuevos técnicos

        if (mode === 'edit' && technician) {
            if (modalTitleTechnician) modalTitleTechnician.textContent = 'Editar Técnico';
            technicianIdInput.value = technician.ID_TECNICO;
            if (nombreCompletoInput) nombreCompletoInput.value = technician.NOMBRE_COMPLETO;
            if (correoInput) correoInput.value = technician.CORREO;
            if (especialidadInput) especialidadInput.value = technician.ESPECIALIDAD;
            if (usuarioLoginInput) usuarioLoginInput.value = technician.USUARIO_LOGIN;
            // No rellenar la contraseña. Dejar en blanco para no cambiarla.
            if (contrasenaInput) {
                contrasenaInput.placeholder = "Dejar en blanco para no cambiar";
                contrasenaInput.required = false; // No requerida al editar
            }
            if (activoSelect) activoSelect.value = technician.ACTIVO || 'S';
            if (saveTechnicianBtn) saveTechnicianBtn.textContent = 'Actualizar Técnico';
        } else {
            if (modalTitleTechnician) modalTitleTechnician.textContent = 'Añadir Nuevo Técnico';
            if (saveTechnicianBtn) saveTechnicianBtn.textContent = 'Guardar Técnico';
        }
        technicianModal.style.display = 'flex';
    }

    function closeTechnicianModal() {
        if (technicianModal) technicianModal.style.display = 'none';
    }

    if (addTechnicianBtn) {
        addTechnicianBtn.addEventListener('click', () => openTechnicianModal('add'));
    }
    if (closeModalTechnicianBtn) {
        closeModalTechnicianBtn.addEventListener('click', closeTechnicianModal);
    }
    if (cancelModalTechnicianBtn) {
        cancelModalTechnicianBtn.addEventListener('click', closeTechnicianModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === technicianModal) {
            closeTechnicianModal();
        }
    });

    if (technicianForm) {
        technicianForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if(messageAreaModalTechnician) clearMessage(messageAreaModalTechnician.id);

            const id = technicianIdInput.value;
            const tecnicoData = {
                nombre_completo: nombreCompletoInput.value.trim(),
                correo: correoInput.value.trim(),
                especialidad: especialidadInput.value.trim(),
                usuario_login: usuarioLoginInput.value.trim(),
                activo: activoSelect.value
            };
            // Solo incluir contraseña si se proporcionó (para creación o para cambio en edición)
            if (contrasenaInput.value) {
                tecnicoData.contrasena = contrasenaInput.value;
            }

            // Validaciones del lado del cliente (similares a las del backend)
            if (!tecnicoData.nombre_completo || !tecnicoData.correo || !tecnicoData.especialidad || !tecnicoData.usuario_login) {
                if (messageAreaModalTechnician) showMessage(messageAreaModalTechnician.id, 'Nombre, correo, especialidad y login son obligatorios.', 'error');
                return;
            }
            if (!id && !tecnicoData.contrasena) { // Contraseña obligatoria solo al crear
                 if (messageAreaModalTechnician) showMessage(messageAreaModalTechnician.id, 'La contraseña es obligatoria para nuevos técnicos.', 'error');
                return;
            }
            // Aquí podrías añadir más validaciones (longitud, formato de correo, etc.)

            const originalButtonText = saveTechnicianBtn.textContent;
            saveTechnicianBtn.disabled = true;
            saveTechnicianBtn.textContent = id ? 'Actualizando...' : 'Guardando...';

            try {
                let response;
                if (id) { // Modo Editar
                    response = await fetchData(`/api/v1/tecnicos/${id}`, {
                        method: 'PUT',
                        body: tecnicoData
                    });
                } else { // Modo Añadir
                    response = await fetchData('/api/v1/tecnicos', {
                        method: 'POST',
                        body: tecnicoData
                    });
                }
                if (messageAreaPage) showMessage(messageAreaPage.id, response.message || (id ? 'Técnico actualizado.' : 'Técnico creado.'), 'success');
                closeTechnicianModal();
                await loadAndRenderTechnicians();
            } catch (error) {
                console.error('Error al guardar/actualizar técnico:', error);
                let displayMsg = error.message || 'Ocurrió un error.';
                if (error.data && Array.isArray(error.data.errors)) {
                    displayMsg = error.data.errors.map(e => e.msg).join('; ');
                } else if (error.data && error.data.message) {
                    displayMsg = error.data.message;
                }
                if (messageAreaModalTechnician) showMessage(messageAreaModalTechnician.id, displayMsg, 'error');
            } finally {
                saveTechnicianBtn.disabled = false;
                saveTechnicianBtn.textContent = originalButtonText;
            }
        });
    }
    
    function attachTechnicianTableButtonListeners() {
        document.querySelectorAll('.edit-technician-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageAreaPage) clearMessage(messageAreaPage.id);
                try {
                    const technicianData = await fetchData(`/api/v1/tecnicos/${id}`);
                    if (technicianData) {
                        openTechnicianModal('edit', technicianData);
                    } else {
                       if (messageAreaPage) showMessage(messageAreaPage.id, `Técnico ID ${id} no encontrado.`, 'error');
                       await loadAndRenderTechnicians();
                    }
                } catch (error) {
                    if (messageAreaPage) showMessage(messageAreaPage.id, `Error al obtener técnico: ${error.message}`, 'error');
                }
            });
        });

        document.querySelectorAll('.delete-technician-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageAreaPage) clearMessage(messageAreaPage.id);
                if (confirm(`¿Estás seguro de que quieres eliminar al técnico ID ${id}? Sus tickets asignados pasarán a "Sin asignar" y sus comentarios serán eliminados.`)) {
                    try {
                        const response = await fetchData(`/api/v1/tecnicos/${id}`, { method: 'DELETE' });
                        if (messageAreaPage) showMessage(messageAreaPage.id, response.message || `Técnico ID ${id} eliminado.`, 'success');
                        await loadAndRenderTechnicians();
                    } catch (error) {
                        console.error(`Error al eliminar técnico ID ${id}:`, error);
                        let displayMsg = error.message || 'No se pudo eliminar el técnico.';
                         if (error.data && error.data.message) { displayMsg = error.data.message; }
                        if (messageAreaPage) showMessage(messageAreaPage.id, displayMsg, 'error');
                    }
                }
            });
        });
    }

    await loadAndRenderTechnicians();
});