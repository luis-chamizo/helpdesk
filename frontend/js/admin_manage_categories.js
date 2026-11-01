// frontend/js/admin_manage_categories.js

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar utilidades y autenticación
    if (typeof fetchData !== 'function' || typeof showMessage !== 'function' || 
        typeof clearMessage !== 'function' || typeof getCurrentUser !== 'function' ||
        typeof API_BASE_URL === 'undefined' || typeof window.loadComponent !== 'function') { // Añadido loadComponent
        console.error("Error crítico: Funciones o API_BASE_URL de utils.js no disponibles.");
        try {
            document.body.innerHTML = "<p style='color:red;text-align:center;margin-top:2rem;'>Error crítico al cargar. Contacte soporte.</p>" + (document.getElementById('header-container') ? document.getElementById('header-container').innerHTML : '') + (document.getElementById('footer-container') ? document.getElementById('footer-container').innerHTML : '');
        } catch (e) {
            document.body.innerHTML = "<p style='color:red;text-align:center;margin-top:2rem;'>Error crítico al cargar. Contacte soporte.</p>";
        }
        return;
    }

    const currentUser = getCurrentUser();
    const token = localStorage.getItem('token');
    const messageArea = document.getElementById('message-area-categories'); // Mensajes para la tabla/página principal
    const messageAreaModal = document.getElementById('message-area-modal'); // Mensajes para el interior del modal

    if (!token || !currentUser) {
        if (messageArea) showMessage(messageArea.id, 'Debes iniciar sesión para acceder a esta página. Redirigiendo...', 'error');
        else alert('Debes iniciar sesión para acceder a esta página. Redirigiendo...');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500); // Asumiendo que login.html está en el mismo nivel que admin_manage_categories.html
        return;
    }
    if (currentUser.rol !== 'admin') {
        if (messageArea) showMessage(messageArea.id, 'Acceso denegado. Solo administradores pueden gestionar categorías. Redirigiendo...', 'error');
        else alert('Acceso denegado. Solo administradores pueden gestionar categorías. Redirigiendo...');
        const dashboardUrl = currentUser.rol === 'usuario' ? 'dashboard_usuario.html' : 'dashboard_tecnico.html';
        setTimeout(() => { window.location.href = dashboardUrl; }, 3000);
        return;
    }

    const categoriesTableBody = document.getElementById('categories-table-body');
    const categoriesTable = document.getElementById('categories-table');
    const loadingMessage = document.getElementById('loading-categories');
    const errorMessageDisplay = document.getElementById('error-categories'); // Renombrado para evitar confusión
    const noCategoriesMessage = document.getElementById('no-categories');

    const categoryModal = document.getElementById('category-modal');
    const categoryForm = document.getElementById('category-form');
    const modalTitle = document.getElementById('modal-title');
    const categoryIdInput = document.getElementById('id_categoria'); 
    const nombreCategoriaInput = document.getElementById('nombre_categoria');
    const descripcionCategoriaInput = document.getElementById('descripcion_categoria');
    const saveCategoryBtn = document.getElementById('save-category-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const addCategoryBtn = document.getElementById('add-category-btn');

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (match) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }

    async function loadAndRenderCategories() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessageDisplay) errorMessageDisplay.style.display = 'none';
        if (noCategoriesMessage) noCategoriesMessage.style.display = 'none';
        if (categoriesTable) categoriesTable.style.display = 'none';
        if (categoriesTableBody) categoriesTableBody.innerHTML = '';
        if (messageArea) clearMessage(messageArea.id);

        try {
            const categories = await fetchData('/api/v1/categorias'); 

            if (categories && categories.length > 0) {
                if (categoriesTable) categoriesTable.style.display = 'table';
                categories.forEach(cat => {
                    const row = categoriesTableBody.insertRow();
                    row.innerHTML = `
                        <td>${cat.ID_CATEGORIA}</td>
                        <td>${escapeHTML(cat.NOMBRE_CATEGORIA || '')}</td>
                        <td>${escapeHTML(cat.DESCRIPCION || '')}</td>
                        <td class="actions">
                            <a href="#" class="edit-category-btn" data-id="${cat.ID_CATEGORIA}" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/></svg></a>
                            <a href="#" class="delete-category-btn" data-id="${cat.ID_CATEGORIA}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.024l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m3.5-.05L7.5 13.5a.5.5 0 1 0 .998.058l.5-8.5a.5.5 0 1 0-.998-.058m2.458.056l-.5 8.5a.5.5 0 1 0 .998.06l.5-8.5a.5.5 0 1 0-.998-.06"/></svg></a>
                        </td>
                    `;
                });
                attachTableButtonListeners();
            } else {
                if (noCategoriesMessage) noCategoriesMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            if (errorMessageDisplay) {
                errorMessageDisplay.textContent = `Error al cargar: ${error.message || 'Error desconocido'}`;
                errorMessageDisplay.style.display = 'block';
            }
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    function openModal(mode = 'add', category = null) {
        if (!categoryModal || !categoryForm || !messageAreaModal || !categoryIdInput || !nombreCategoriaInput || !descripcionCategoriaInput || !saveCategoryBtn || !modalTitle) return;
        
        clearMessage(messageAreaModal.id);
        categoryForm.reset();
        categoryIdInput.value = ''; 

        if (mode === 'edit' && category) {
            modalTitle.textContent = 'Editar Categoría';
            categoryIdInput.value = category.ID_CATEGORIA;
            nombreCategoriaInput.value = category.NOMBRE_CATEGORIA;
            descripcionCategoriaInput.value = category.DESCRIPCION || '';
            saveCategoryBtn.textContent = 'Actualizar';
        } else {
            modalTitle.textContent = 'Añadir Nueva Categoría';
            saveCategoryBtn.textContent = 'Guardar';
        }
        categoryModal.style.display = 'flex';
    }

    function closeModal() {
        if (categoryModal) categoryModal.style.display = 'none';
    }

    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openModal('add'));
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === categoryModal) {
            closeModal();
        }
    });

    // --- IMPLEMENTACIÓN DE GUARDAR/ACTUALIZAR Y ELIMINAR ---
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (messageAreaModal) clearMessage(messageAreaModal.id);

            const id = categoryIdInput.value;
            const nombre = nombreCategoriaInput.value.trim();
            const descripcion = descripcionCategoriaInput.value.trim();

            if (!nombre) {
                if (messageAreaModal) showMessage(messageAreaModal.id, 'El nombre de la categoría es obligatorio.', 'error');
                return;
            }
            if (nombre.length < 2 || nombre.length > 50) {
                 if (messageAreaModal) showMessage(messageAreaModal.id, 'El nombre debe tener entre 2 y 50 caracteres.', 'error');
                return;
            }
             if (descripcion && descripcion.length > 200) {
                if (messageAreaModal) showMessage(messageAreaModal.id, 'La descripción no puede exceder los 200 caracteres.', 'error');
                return;
            }


            const categoryData = {
                nombre_categoria: nombre,
                descripcion: descripcion || null // Enviar null si está vacío para que la BD lo tome como tal
            };

            const originalButtonText = saveCategoryBtn.textContent;
            saveCategoryBtn.disabled = true;
            saveCategoryBtn.textContent = id ? 'Actualizando...' : 'Guardando...';

            try {
                let response;
                if (id) { // Modo Edición (Actualizar)
                    response = await fetchData(`/api/v1/categorias/${id}`, {
                        method: 'PUT',
                        body: categoryData
                    });
                } else { // Modo Añadir (Crear)
                    response = await fetchData('/api/v1/categorias', {
                        method: 'POST',
                        body: categoryData
                    });
                }
                if (messageArea) showMessage(messageArea.id, response.message || (id ? 'Categoría actualizada.' : 'Categoría creada.'), 'success');
                closeModal();
                await loadAndRenderCategories(); // Recargar la lista
            } catch (error) {
                console.error('Error al guardar/actualizar categoría:', error);
                let displayMsg = error.message || 'Ocurrió un error.';
                if (error.data && Array.isArray(error.data.errors)) {
                    displayMsg = error.data.errors.map(e => e.msg).join(' ');
                } else if (error.data && error.data.message) {
                    displayMsg = error.data.message;
                }
                if (messageAreaModal) showMessage(messageAreaModal.id, displayMsg, 'error');
            } finally {
                saveCategoryBtn.disabled = false;
                saveCategoryBtn.textContent = originalButtonText;
            }
        });
    }
    
    function attachTableButtonListeners() {
        document.querySelectorAll('.edit-category-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageArea) clearMessage(messageArea.id);
                try {
                    const categoryData = await fetchData(`/api/v1/categorias/${id}`);
                    if (categoryData) {
                        openModal('edit', categoryData);
                    } else {
                       if (messageArea) showMessage(messageArea.id, `No se encontró la categoría con ID ${id}. Puede que haya sido eliminada.`, 'error');
                       await loadAndRenderCategories(); // Recargar por si acaso
                    }
                } catch (error) {
                    if (messageArea) showMessage(messageArea.id, `Error al obtener datos de la categoría: ${error.message}`, 'error');
                }
            });
        });

        document.querySelectorAll('.delete-category-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = e.target.closest('a').dataset.id;
                if (messageArea) clearMessage(messageArea.id);

                if (confirm(`¿Estás seguro de que quieres eliminar la categoría ID ${id}? Esta acción no se puede deshacer.`)) {
                    try {
                        const response = await fetchData(`/api/v1/categorias/${id}`, {
                            method: 'DELETE'
                        });
                        if (messageArea) showMessage(messageArea.id, response.message || `Categoría ID ${id} eliminada.`, 'success');
                        await loadAndRenderCategories(); // Recargar la lista
                    } catch (error) {
                        console.error(`Error al eliminar categoría ID ${id}:`, error);
                        let displayMsg = error.message || 'No se pudo eliminar la categoría.';
                         if (error.data && error.data.message) {
                            displayMsg = error.data.message;
                        }
                        if (messageArea) showMessage(messageArea.id, displayMsg, 'error');
                    }
                }
            });
        });
    }

    await loadAndRenderCategories();
});