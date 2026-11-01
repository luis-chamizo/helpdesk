// frontend/js/dashboard_tecnico.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Selección de Elementos DOM ---
    const welcomeMessageElement = document.getElementById('welcome-message');
    const ticketsListDiv = document.getElementById('tickets-list');
    const loadingMessageDiv = document.getElementById('loading-message');
    const errorTicketsMessageDiv = document.getElementById('error-tickets-message');
    const noTicketsMessageDiv = document.getElementById('no-tickets-message');
    const logoutLink = document.getElementById('logout-link');

    // Filtros
    const statusFilterSelect = document.getElementById('status-filter');
    const priorityFilterSelect = document.getElementById('priority-filter');
    const categoryFilterSelect = document.getElementById('category-filter');
    const applyFiltersButton = document.getElementById('apply-filters-button');
    const refreshTicketsButton = document.getElementById('refresh-tickets-button');

    // NUEVO: Selección para elementos de admin
    const adminActionsSection = document.getElementById('admin-specific-actions');
    const technicianFilterGroup = document.getElementById('technician-filter-group');
    const technicianFilterSelect = document.getElementById('technician-filter');


    let globalMessageDiv = document.getElementById('message-area-global-dashboard-tec');
    if (!globalMessageDiv) {
        const mainContentDiv = document.querySelector('.dashboard-main-content');
        if (mainContentDiv && mainContentDiv.firstChild) { 
            globalMessageDiv = document.createElement('div');
            globalMessageDiv.id = 'message-area-global-dashboard-tec';
            globalMessageDiv.className = 'message-box'; 
            globalMessageDiv.style.display = 'none'; 
            mainContentDiv.insertBefore(globalMessageDiv, mainContentDiv.firstChild); 
        } else if (mainContentDiv) { 
            globalMessageDiv = document.createElement('div');
            globalMessageDiv.id = 'message-area-global-dashboard-tec';
            globalMessageDiv.className = 'message-box';
            globalMessageDiv.style.display = 'none';
            mainContentDiv.prepend(globalMessageDiv);
        } else {
            console.warn("No se pudo crear el área de mensajes globales para el dashboard del técnico.");
        }
    }

    if (typeof fetchData !== 'function' || typeof showMessage !== 'function' || 
        typeof clearMessage !== 'function' || typeof formatReadableDate !== 'function' ||
        typeof getCurrentUser !== 'function' || typeof loadComponent !== 'function' ||
        typeof API_BASE_URL === 'undefined' || typeof window.logoutUser !== 'function') { 
        console.error("Error crítico: Funciones esenciales o API_BASE_URL de utils.js no están disponibles.");
        if (globalMessageDiv) showMessage(globalMessageDiv.id, "Error crítico al cargar la página. Funcionalidades no disponibles.", "error");
        return;
    }
    
    const token = localStorage.getItem('token');
    const currentUser = getCurrentUser(); 

    if (!token || !currentUser) {
        if (globalMessageDiv) showMessage(globalMessageDiv.id, 'Debes iniciar sesión. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    if (currentUser.rol !== 'tecnico' && currentUser.rol !== 'admin') {
        if (globalMessageDiv) showMessage(globalMessageDiv.id, 'Acceso denegado. Esta área es para técnicos y administradores. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 3000);
        return;
    }
    
    // --- INICIO: LÓGICA PARA PREVENIR "VOLVER" CON FLECHA DEL NAVEGADOR ---
    history.pushState(null, document.title, location.href); 
    window.addEventListener('popstate', function (event) {
        const currentTokenPop = localStorage.getItem('token');
        const currentUserPop = getCurrentUser(); 
        if (currentTokenPop && currentUserPop && (currentUserPop.rol === 'tecnico' || currentUserPop.rol === 'admin')) {
            history.pushState(null, document.title, location.href); 
            
            let msgElement = globalMessageDiv; 
            if (!msgElement && document.querySelector('.dashboard-main-content')) { 
                msgElement = document.createElement('div');
                msgElement.id = 'temp-prevent-back-msg-tec-pop'; 
                msgElement.className = 'message-box'; 
                msgElement.style.display = 'none';
                document.querySelector('.dashboard-main-content').prepend(msgElement);
            }

            if (msgElement) { 
                showMessage(msgElement.id, "Para salir, por favor utiliza el botón 'Cerrar Sesión'.", "info");
                setTimeout(() => {
                    if (msgElement.style.display !== 'none' && msgElement.textContent.includes("Cerrar Sesión")) {
                        clearMessage(msgElement.id);
                        if (msgElement.id === 'temp-prevent-back-msg-tec-pop') { 
                           msgElement.remove();
                        }
                    }
                }, 4000);
            }
        }
    });
    // --- FIN: LÓGICA PARA PREVENIR "VOLVER" CON FLECHA DEL NAVEGADOR ---

    if (welcomeMessageElement && currentUser.nombre_completo) {
        welcomeMessageElement.textContent = `Panel de ${currentUser.rol === 'admin' ? 'Administrador' : 'Técnico'}: ${currentUser.nombre_completo}`;
    }

    // Lógica para mostrar y configurar acciones de administrador
    if (currentUser.rol === 'admin' && adminActionsSection) {
        adminActionsSection.style.display = 'flex'; 
        adminActionsSection.innerHTML = `
            <button id="manage-technicians-btn" class="btn btn-primary btn-sm">Gestionar Técnicos</button>
            <button id="manage-categories-btn" class="btn btn-primary btn-sm">Gestionar Categorías</button>
            <button id="manage-priorities-btn" class="btn btn-primary btn-sm">Gestionar Prioridades</button>
        `;

       const manageTechniciansBtn = document.getElementById('manage-technicians-btn');
       if (manageTechniciansBtn) {
           manageTechniciansBtn.addEventListener('click', () => {
               window.location.href = 'admin_manage_technicians.html'; // Redirige a la página de gestión de técnicos
           });
       }
        
        const manageCategoriesBtn = document.getElementById('manage-categories-btn');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => {
                window.location.href = 'admin_manage_categories.html'; // Redirige a la página de gestión de categorías
            });
        }

        // ***** INICIO DE LA MEJORA ESPECÍFICA SOLICITADA *****
        const managePrioritiesBtn = document.getElementById('manage-priorities-btn');
        if (managePrioritiesBtn) {
            managePrioritiesBtn.addEventListener('click', () => {
                window.location.href = 'admin_manage_priorities.html'; // Redirige a la nueva página
            });
        }
        // ***** FIN DE LA MEJORA ESPECÍFICA SOLICITADA *****
    }

    async function populateCategoryFilter() { /* ... (código como lo tenías) ... */ }
    async function populateTechnicianFilter() { /* ... (código como lo tenías) ... */ }
    async function cargarTicketsTecnico(filtros = {}) { /* ... (código como lo tenías) ... */ }
    function renderizarTickets(tickets) { /* ... (código como lo tenías) ... */ }
    function attachCardButtonListeners() { /* ... (código como lo tenías) ... */ }
    function handleViewTicket(e){ /* ... (código como lo tenías) ... */ }
    async function handleAssignSelf(e){ /* ... (código como lo tenías) ... */ }
    async function handleUnassignSelf(e){ /* ... (código como lo tenías) ... */ }
    async function handleAdminUnassignTicket(e){ /* ... (código como lo tenías) ... */ }
    async function asignarTicket(ticketId, tecnicoId, buttonElement) { /* ... (código como lo tenías) ... */ }
    function obtenerFiltrosSeleccionados() { /* ... (código como lo tenías) ... */ }

    if (applyFiltersButton) { applyFiltersButton.addEventListener('click', () => cargarTicketsTecnico(obtenerFiltrosSeleccionados())); }
    if (refreshTicketsButton) { 
        refreshTicketsButton.addEventListener('click', () => { 
            if(statusFilterSelect)statusFilterSelect.value="";
            if(priorityFilterSelect)priorityFilterSelect.value="";
            if(categoryFilterSelect)categoryFilterSelect.value="";
            if(technicianFilterSelect&&currentUser.rol==='admin')technicianFilterSelect.value="";
            cargarTicketsTecnico();
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (confirm("¿Estás seguro de que quieres cerrar sesión?")) { 
                window.logoutUser(); 
            }
        });
    }
    async function inicializarDashboardTecnico() { /* ... (código como lo tenías) ... */ }
    inicializarDashboardTecnico();

    // --- PEGAR AQUÍ EL RESTO DE FUNCIONES COMPLETAS QUE HABÍA ABREVIADO ANTES ---
    // (populateCategoryFilter, populateTechnicianFilter, cargarTicketsTecnico, renderizarTickets, 
    // attachCardButtonListeners y sus manejadores, asignarTicket, obtenerFiltrosSeleccionados, inicializarDashboardTecnico)
    // Asegúrate de que todo el cuerpo de estas funciones esté presente como en la versión funcional anterior.
    // Por ejemplo, la función completa de populateCategoryFilter:
    async function populateCategoryFilter() {
        if (!categoryFilterSelect) { console.warn("Filtro de categorías no encontrado."); return; }
        try {
            const categorias = await fetchData('/api/v1/categorias');
            categoryFilterSelect.innerHTML = '<option value="">Todas las Categorías</option>'; 
            if (categorias && categorias.length > 0) {
                categorias.forEach(cat => {
                    const option = document.createElement('option'); option.value = cat.ID_CATEGORIA; option.textContent = cat.NOMBRE_CATEGORIA;
                    categoryFilterSelect.appendChild(option);
                });
            } else { categoryFilterSelect.innerHTML = '<option value="">No hay categorías</option>'; }
        } catch (error) { console.error('Error al cargar categorías:', error); categoryFilterSelect.innerHTML = '<option value="">Error al cargar</option>'; if (globalMessageDiv) showMessage(globalMessageDiv.id, 'No se pudieron cargar las categorías.', 'warning'); }
    }
    async function populateTechnicianFilter() {
        if (currentUser.rol !== 'admin' || !technicianFilterGroup || !technicianFilterSelect) { if(technicianFilterGroup) technicianFilterGroup.style.display = 'none'; return; }
        technicianFilterGroup.style.display = 'block';
        try {
            const tecnicos = await fetchData('/api/v1/tecnicos'); 
            if (tecnicos && tecnicos.length > 0) {
                tecnicos.filter(t => t.ACTIVO === 'S').forEach(tec => {
                    const option = document.createElement('option'); option.value = tec.ID_TECNICO; option.textContent = tec.NOMBRE_COMPLETO;
                    technicianFilterSelect.appendChild(option);
                });
            }
        } catch (error) { console.error('Error al cargar técnicos:', error); technicianFilterSelect.innerHTML = '<option value="">Error al cargar técnicos</option>'; if (globalMessageDiv) showMessage(globalMessageDiv.id, 'No se pudieron cargar los técnicos.', 'warning'); }
    }
    async function cargarTicketsTecnico(filtros = {}) {
        if (loadingMessageDiv) loadingMessageDiv.style.display = 'block';
        if (errorTicketsMessageDiv) errorTicketsMessageDiv.style.display = 'none';
        if (noTicketsMessageDiv) noTicketsMessageDiv.style.display = 'none';
        if (ticketsListDiv) ticketsListDiv.innerHTML = ''; 
        if (globalMessageDiv) clearMessage(globalMessageDiv.id);
        let endpoint = '/api/v1/tickets'; 
        const queryParams = new URLSearchParams();
        if (filtros.id_estado && filtros.id_estado !== "") queryParams.append('id_estado', filtros.id_estado);
        if (filtros.id_prioridad && filtros.id_prioridad !== "") queryParams.append('id_prioridad', filtros.id_prioridad);
        if (filtros.id_categoria && filtros.id_categoria !== "") queryParams.append('id_categoria', filtros.id_categoria);
        if (filtros.id_tecnico_asignado && filtros.id_tecnico_asignado !== "") queryParams.append('id_tecnico_asignado', filtros.id_tecnico_asignado);
        const queryString = queryParams.toString();
        if (queryString) endpoint += `?${queryString}`;
        try {
            const tickets = await fetchData(endpoint); 
            if (tickets && tickets.length > 0) renderizarTickets(tickets);
            else if (noTicketsMessageDiv) noTicketsMessageDiv.style.display = 'block';
        } catch (error) { console.error('Error al cargar tickets:', error); if (errorTicketsMessageDiv) { errorTicketsMessageDiv.textContent = error.message || 'No se pudieron cargar los tickets.'; errorTicketsMessageDiv.style.display = 'block';}}
        finally { if (loadingMessageDiv) loadingMessageDiv.style.display = 'none';}
    }
    function renderizarTickets(tickets) {
        if (!ticketsListDiv) return;
        ticketsListDiv.innerHTML = '';
        tickets.forEach(ticket => {
            const card = document.createElement('div'); card.className = 'ticket-card';
            const descripcionCorta = ticket.DESCRIPCION ? (ticket.DESCRIPCION.substring(0, 100) + (ticket.DESCRIPCION.length > 100 ? '...' : '')) : 'Sin descripción.';
            let actionButtonsHTML = `<button class="btn btn-secondary btn-sm view-ticket-btn" data-ticket-id="${ticket.ID_TICKET}">Gestionar Ticket</button>`;
            if (currentUser.rol === 'tecnico') {
                if (ticket.ID_TECNICO_ASIGNADO === null) actionButtonsHTML += ` <button class="btn btn-primary btn-sm assign-self-btn" data-ticket-id="${ticket.ID_TICKET}">Asignarme</button>`;
                else if (ticket.ID_TECNICO_ASIGNADO === currentUser.id) actionButtonsHTML += ` <button class="btn btn-accent btn-sm unassign-self-btn" data-ticket-id="${ticket.ID_TICKET}">Desasignarme</button>`;
            } else if (currentUser.rol === 'admin') {
                if (ticket.ID_TECNICO_ASIGNADO !== null) actionButtonsHTML += ` <button class="btn btn-warning btn-sm admin-unassign-btn" data-ticket-id="${ticket.ID_TICKET}" title="Quitar asignación actual">Quitar Asignación</button>`;
            }
            card.innerHTML = `<div class="ticket-header"><h4>${ticket.TITULO || 'Sin título'} <span class="ticket-id">#${ticket.ID_TICKET}</span></h4><span class="status-badge status-${(ticket.NOMBRE_ESTADO || 'desconocido').toLowerCase().replace(/\s+/g, '-') }">${ticket.NOMBRE_ESTADO || 'Desconocido'}</span></div><p class="ticket-description">${descripcionCorta}</p><p><strong>Reportado por:</strong> ${ticket.NOMBRE_USUARIO_REPORTA || 'N/A'} (${ticket.USUARIO_AREA || 'N/A'})</p><p><strong>Email Usuario:</strong> <a href="mailto:${ticket.USUARIO_CORREO || ''}" title="Enviar correo a ${ticket.USUARIO_CORREO || ''}">${ticket.USUARIO_CORREO || 'N/A'}</a></p><p><strong>Categoría:</strong> ${ticket.NOMBRE_CATEGORIA || 'N/A'}</p><p><strong>Prioridad:</strong> ${ticket.NOMBRE_PRIORIDAD || 'N/A'}</p><p><strong>Técnico Asignado:</strong> ${ticket.NOMBRE_TECNICO_ASIGNADO || 'Sin asignar'}</p><p><strong>Creado:</strong> ${formatReadableDate(ticket.FECHA_CREACION,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p><p><strong>Actualizado:</strong> ${formatReadableDate(ticket.FECHA_ACTUALIZACION,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>${ticket.FECHA_CIERRE ? `<p><strong>Cerrado:</strong> ${formatReadableDate(ticket.FECHA_CIERRE,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>` : ''}<div class="ticket-actions">${actionButtonsHTML}</div>`;
            ticketsListDiv.appendChild(card);
        });
        attachCardButtonListeners();
    }
    function attachCardButtonListeners() {
        document.querySelectorAll('.view-ticket-btn').forEach(b => {const n=b.cloneNode(true);b.parentNode.replaceChild(n,b);n.addEventListener('click',handleViewTicket);});
        document.querySelectorAll('.assign-self-btn').forEach(b => {const n=b.cloneNode(true);b.parentNode.replaceChild(n,b);n.addEventListener('click',handleAssignSelf);});
        document.querySelectorAll('.unassign-self-btn').forEach(b => {const n=b.cloneNode(true);b.parentNode.replaceChild(n,b);n.addEventListener('click',handleUnassignSelf);});
        document.querySelectorAll('.admin-unassign-btn').forEach(b => {const n=b.cloneNode(true);b.parentNode.replaceChild(n,b);n.addEventListener('click',handleAdminUnassignTicket);});
    }
    function handleViewTicket(e){window.location.href=`ver-ticket.html?id=${e.target.closest('.view-ticket-btn').dataset.ticketId}`; }
    async function handleAssignSelf(e){await asignarTicket(e.target.closest('.assign-self-btn').dataset.ticketId, currentUser.id, e.target);}
    async function handleUnassignSelf(e){if(confirm('¿Estás seguro de que quieres desasignarte de este ticket?'))await asignarTicket(e.target.closest('.unassign-self-btn').dataset.ticketId,null,e.target);}
    async function handleAdminUnassignTicket(e){if(confirm('¿Estás seguro de que quieres quitar la asignación de este ticket?'))await asignarTicket(e.target.closest('.admin-unassign-btn').dataset.ticketId,null,e.target);}
    async function asignarTicket(ticketId, tecnicoId, buttonElement) { const originalText = buttonElement ? buttonElement.textContent : null; if (buttonElement) { buttonElement.disabled = true; buttonElement.textContent = 'Procesando...';} if (globalMessageDiv) clearMessage(globalMessageDiv.id); try { const response = await fetchData(`/api/v1/tickets/${ticketId}/asignar`, {method:'PUT',body:{id_tecnico_asignado:tecnicoId}}); if (globalMessageDiv) showMessage(globalMessageDiv.id, response.message || (tecnicoId ? `Ticket #${ticketId} asignado.` : `Ticket #${ticketId} desasignado.`),'success'); cargarTicketsTecnico(obtenerFiltrosSeleccionados()); } catch (error) { console.error(`Error al ${tecnicoId ? 'asignar':'desasignar'} ticket #${ticketId}:`, error); if (globalMessageDiv) showMessage(globalMessageDiv.id, `Error: ${error.message || 'No se pudo completar.'}`,'error'); if (buttonElement){buttonElement.disabled=false;buttonElement.textContent=originalText;}}}
    function obtenerFiltrosSeleccionados() { const f={}; if(statusFilterSelect&&statusFilterSelect.value)f.id_estado=statusFilterSelect.value; if(priorityFilterSelect&&priorityFilterSelect.value)f.id_prioridad=priorityFilterSelect.value; if(categoryFilterSelect&&categoryFilterSelect.value)f.id_categoria=categoryFilterSelect.value; if(currentUser.rol==='admin'&&technicianFilterSelect&&technicianFilterSelect.value)f.id_tecnico_asignado=technicianFilterSelect.value; return f; }

    if (refreshTicketsButton) { 
        refreshTicketsButton.addEventListener('click', () => { 
            if(statusFilterSelect)statusFilterSelect.value="";
            if(priorityFilterSelect)priorityFilterSelect.value="";
            if(categoryFilterSelect)categoryFilterSelect.value="";
            if(technicianFilterSelect&&currentUser.rol==='admin')technicianFilterSelect.value="";
            cargarTicketsTecnico();
        });
    }

    async function inicializarDashboardTecnico() { if(globalMessageDiv) clearMessage(globalMessageDiv.id); await populateCategoryFilter(); await populateTechnicianFilter(); cargarTicketsTecnico(); }
    inicializarDashboardTecnico();
});