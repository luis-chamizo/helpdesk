// frontend/js/ver-ticket.js

document.addEventListener('DOMContentLoaded', async () => {
    const ticketIdDisplay = document.getElementById('ticket-id-display');
    const ticketTituloPrincipal = document.getElementById('ticket-titulo-principal');
    const ticketEstadoSpan = document.getElementById('ticket-estado');
    const ticketPrioridadSpan = document.getElementById('ticket-prioridad');
    const ticketCategoriaSpan = document.getElementById('ticket-categoria');
    const ticketUsuarioReportaSpan = document.getElementById('ticket-usuario-reporta');
    const ticketUsuarioAreaSpan = document.getElementById('ticket-usuario-area');
    const ticketUsuarioCorreoSpan = document.getElementById('ticket-usuario-correo');
    const ticketTecnicoAsignadoSpan = document.getElementById('ticket-tecnico-asignado');
    const ticketFechaCreacionSpan = document.getElementById('ticket-fecha-creacion');
    const ticketFechaActualizacionSpan = document.getElementById('ticket-fecha-actualizacion');
    const ticketFechaCierreSpan = document.getElementById('ticket-fecha-cierre');
    const ticketDescripcionCompletaP = document.getElementById('ticket-descripcion-completa');
    const ticketLoader = document.getElementById('ticket-loader');
    const messageAreaTicket = document.getElementById('message-area-ticket');
    const commentsLoader = document.getElementById('comments-loader');
    const commentsListDiv = document.getElementById('comments-list');
    const addCommentForm = document.getElementById('add-comment-form');
    const comentarioTextoTextarea = document.getElementById('comentario_texto');
    const submitCommentBtn = document.getElementById('submit-comment-btn');
    const messageAreaComment = document.getElementById('message-area-comment');
    const ticketActionsArea = document.getElementById('ticket-actions-area');
    const selectNewStatus = document.getElementById('select-new-status');
    const btnUpdateStatus = document.getElementById('btn-update-status');
    const selectAssignTechnician = document.getElementById('select-assign-technician');
    const btnAssignTechnician = document.getElementById('btn-assign-technician');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    
    // Referencia al grupo de acción para asignar técnico (debe existir en el HTML)
    const assignTechnicianGroup = document.getElementById('assign-technician-action-group');


    if (typeof getQueryParam !== 'function' || typeof fetchData !== 'function' || 
        typeof showMessage !== 'function' || typeof clearMessage !== 'function' || 
        typeof formatReadableDate !== 'function' || typeof getCurrentUser !== 'function' ||
        typeof API_BASE_URL === 'undefined') {
        console.error("Error crítico: Funciones o API_BASE_URL de utils.js no disponibles.");
        if (messageAreaTicket) showMessage(messageAreaTicket.id, "Error crítico al cargar la página: faltan utilidades.", "error");
        return;
    }
    
    const ticketId = getQueryParam('id');
    const currentUser = getCurrentUser();

    if (!ticketId) {
        if (messageAreaTicket) showMessage(messageAreaTicket.id, 'ID de ticket no especificado. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = currentUser ? (currentUser.rol === 'usuario' ? 'dashboard_usuario.html' : 'dashboard_tecnico.html') : 'index.html'; }, 3000);
        if (ticketLoader) ticketLoader.style.display = 'none';
        return;
    }

    if (!currentUser || !localStorage.getItem('token')) {
        if (messageAreaTicket) showMessage(messageAreaTicket.id, 'Debes iniciar sesión para ver detalles. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    if (backToDashboardBtn) {
        const dashboardUrl = currentUser.rol === 'usuario' ? 'dashboard_usuario.html' : 'dashboard_tecnico.html';
        if (backToDashboardBtn.tagName === 'A') {
            backToDashboardBtn.href = dashboardUrl;
        } else { 
            backToDashboardBtn.addEventListener('click', () => {
                window.location.href = dashboardUrl;
            });
        }
    }
    
    async function cargarDetallesTicketYComentarios() {
        if (ticketLoader) ticketLoader.style.display = 'block';
        if (commentsLoader) commentsLoader.style.display = 'block';
        if (messageAreaTicket) clearMessage(messageAreaTicket.id);
        if (messageAreaComment) clearMessage(messageAreaComment.id);

        try {
            const ticketData = await fetchData(`/api/v1/tickets/${ticketId}`);
            if (ticketData) {
                poblarDetallesTicket(ticketData);
                await cargarComentarios(); 
                await configurarAccionesTicket(ticketData); 
            } else {
                throw new Error('No se recibieron datos del ticket desde la API.');
            }
        } catch (error) {
            console.error('Error al cargar detalles del ticket:', error);
            if (messageAreaTicket) showMessage(messageAreaTicket.id, error.message || 'No se pudieron cargar los detalles del ticket.', 'error');
            if (ticketActionsArea) ticketActionsArea.style.display = 'none';
            if (addCommentForm) addCommentForm.style.display = 'none';
        } finally {
            if (ticketLoader) ticketLoader.style.display = 'none';
        }
    }

    function poblarDetallesTicket(ticket) {
        if (ticketIdDisplay) ticketIdDisplay.textContent = `(#${ticket.ID_TICKET})`;
        if (ticketTituloPrincipal) ticketTituloPrincipal.textContent = ticket.TITULO || 'Detalle del Ticket';
        if (ticketEstadoSpan) { ticketEstadoSpan.textContent = ticket.NOMBRE_ESTADO || 'N/A'; ticketEstadoSpan.className = 'status-badge'; if (ticket.NOMBRE_ESTADO) { ticketEstadoSpan.classList.add(`status-${ticket.NOMBRE_ESTADO.toLowerCase().replace(/\s+/g, '-')}`);}}
        if (ticketPrioridadSpan) ticketPrioridadSpan.textContent = ticket.NOMBRE_PRIORIDAD || 'N/A';
        if (ticketCategoriaSpan) ticketCategoriaSpan.textContent = ticket.NOMBRE_CATEGORIA || 'N/A';
        if (ticketUsuarioReportaSpan) ticketUsuarioReportaSpan.textContent = ticket.NOMBRE_USUARIO_REPORTA || 'N/A';
        if (ticketUsuarioAreaSpan) ticketUsuarioAreaSpan.textContent = `Área: ${ticket.USUARIO_AREA || 'N/A'}`;
        if (ticketUsuarioCorreoSpan) ticketUsuarioCorreoSpan.innerHTML = `<a href="mailto:${ticket.USUARIO_CORREO || ''}" title="Enviar correo a ${ticket.USUARIO_CORREO || ''}">${ticket.USUARIO_CORREO || 'N/A'}</a>`;
        if (ticketTecnicoAsignadoSpan) ticketTecnicoAsignadoSpan.textContent = ticket.NOMBRE_TECNICO_ASIGNADO || 'Sin asignar';
        if (ticketFechaCreacionSpan) ticketFechaCreacionSpan.textContent = formatReadableDate(ticket.FECHA_CREACION);
        if (ticketFechaActualizacionSpan) ticketFechaActualizacionSpan.textContent = formatReadableDate(ticket.FECHA_ACTUALIZACION);
        if (ticketFechaCierreSpan) ticketFechaCierreSpan.textContent = ticket.FECHA_CIERRE ? formatReadableDate(ticket.FECHA_CIERRE) : 'N/A';
        if (ticketDescripcionCompletaP) ticketDescripcionCompletaP.textContent = ticket.DESCRIPCION || 'No hay descripción disponible.';
    }

    async function cargarComentarios() {
        if (commentsLoader) commentsLoader.style.display = 'block';
        try {
            const comentarios = await fetchData(`/api/v1/comentarios/ticket/${ticketId}`);
            renderizarComentarios(comentarios);
        } catch (error) {
            console.error('Error al cargar comentarios:', error);
            if (commentsListDiv) commentsListDiv.innerHTML = `<p class="text-color-muted" style="text-align:center;">No se pudieron cargar los comentarios.</p>`;
            if (error.status !== 403 && messageAreaComment) {
                showMessage(messageAreaComment.id, error.message || 'Error al cargar comentarios.', 'error');
            }
        } finally {
            if (commentsLoader) commentsLoader.style.display = 'none';
        }
    }

    // FUNCIÓN renderizarComentarios CON EL CAMBIO PARA EL AUTOR
    function renderizarComentarios(comentarios) {
        if (!commentsListDiv) {
            console.warn("Elemento commentsListDiv no encontrado para renderizar comentarios.");
            return;
        }
        commentsListDiv.innerHTML = ''; 

        if (comentarios && comentarios.length > 0) {
            comentarios.forEach(comment => {
                const card = document.createElement('div');
                card.className = `comment-card comment-by-${(comment.TIPO_AUTOR || 'desconocido').toLowerCase()}`; 

                // Nombre del autor en negrilla y dos puntos. SIN EL ROL.
                const autorHtml = `<strong class="comment-author-name">${comment.AUTOR_NOMBRE || 'Anónimo'}:</strong>`;
                
                const textoComentarioHtml = `<span class="comment-actual-text">${comment.COMENTARIO_TEXTO || 'Comentario vacío.'}</span>`;

                card.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-date">${formatReadableDate(comment.FECHA_CREACION)}</span>
                    </div>
                    <div class="comment-body">
                        <p class="comment-text-line"> 
                            ${autorHtml} ${textoComentarioHtml}
                        </p>
                    </div>
                `;
                commentsListDiv.appendChild(card);
            });
        } else {
            commentsListDiv.innerHTML = '<p class="text-color-muted" style="text-align:center; padding: 1rem;">Este ticket aún no tiene comentarios.</p>';
        }
    }
    // FIN FUNCIÓN renderizarComentarios MODIFICADA

    // --- FUNCIÓN configurarAccionesTicket ACTUALIZADA ---
    async function configurarAccionesTicket(ticket) {
        // assignTechnicianGroup se selecciona arriba globalmente en el script
        if (!currentUser || !ticketActionsArea || !selectNewStatus || !btnUpdateStatus || 
            !assignTechnicianGroup || !selectAssignTechnician || !btnAssignTechnician) {
            console.warn("Faltan elementos DOM para configurar acciones del ticket (configurarAccionesTicket). Revisa IDs en HTML.");
            if(ticketActionsArea) ticketActionsArea.style.display = 'none';
            return;
        }

        const esAdmin = currentUser.rol === 'admin';
        const esTecnico = currentUser.rol === 'tecnico';
        const esTecnicoAsignado = esTecnico && ticket.ID_TECNICO_ASIGNADO === currentUser.id;
        const ticketNoAsignado = ticket.ID_TECNICO_ASIGNADO === null;
        const ticketCerradoOResuelto = [3, 5].includes(ticket.ID_ESTADO);

        ticketActionsArea.style.display = 'none'; // Ocultar el área de acciones completa por defecto
        assignTechnicianGroup.style.display = 'none'; // Ocultar el grupo de asignación de técnico por defecto

        // El área general de acciones solo se muestra si es admin o técnico
        if (esAdmin || esTecnico) {
            ticketActionsArea.style.display = 'flex'; // O 'block' o lo que corresponda a tu layout

            // --- Lógica para CAMBIAR ESTADO (visible para Admin y Técnico bajo condiciones) ---
            try { 
                const estadosResponse = await fetchData(`/api/v1/estados`);
                let estadosPosibles = [];
                if(estadosResponse && estadosResponse.length > 0){ 
                    estadosPosibles = estadosResponse; 
                } else { 
                    console.warn("No se pudo cargar la lista de estados desde la API. Usando lista fija de fallback.");
                    estadosPosibles = [
                        { ID_ESTADO: 1, NOMBRE_ESTADO: 'Abiertos' }, { ID_ESTADO: 2, NOMBRE_ESTADO: 'En progreso' },
                        { ID_ESTADO: 3, NOMBRE_ESTADO: 'Cerrados' }, { ID_ESTADO: 4, NOMBRE_ESTADO: 'Pendientes' },
                        { ID_ESTADO: 5, NOMBRE_ESTADO: 'Resueltos' }
                    ];
                }
                selectNewStatus.innerHTML = ''; 
                estadosPosibles.forEach(estado => { 
                    const option = document.createElement('option'); 
                    option.value = estado.ID_ESTADO; 
                    option.textContent = estado.NOMBRE_ESTADO; 
                    if (ticket.ID_ESTADO === estado.ID_ESTADO) option.selected = true; 
                    selectNewStatus.appendChild(option);
                });
            } catch(e) { 
                console.error("Error cargando estados para el select:", e); 
                selectNewStatus.innerHTML = '<option value="">Error al cargar estados</option>'; 
            }
            
            let puedeCambiarEstado = (esAdmin || esTecnicoAsignado || (esTecnico && ticketNoAsignado)) && !ticketCerradoOResuelto;
            selectNewStatus.disabled = !puedeCambiarEstado;
            btnUpdateStatus.disabled = !puedeCambiarEstado;

            // --- Lógica para ASIGNAR TÉCNICO (visible SOLO PARA ADMIN) ---
            if (esAdmin) { // Solo el admin ve esta sección en ver-ticket.html
                assignTechnicianGroup.style.display = 'block'; // O 'flex' si tu .action-group es flex

                try { // Poblar select de técnicos
                    const tecnicos = await fetchData(`/api/v1/tecnicos`); 
                    selectAssignTechnician.innerHTML = '<option value="null">Sin asignar</option>'; 
                    if (tecnicos && tecnicos.length > 0) {
                        tecnicos.filter(t => t.ACTIVO === 'S').forEach(tec => { 
                            const option = document.createElement('option'); 
                            option.value = tec.ID_TECNICO; 
                            option.textContent = `${tec.NOMBRE_COMPLETO} (${tec.ESPECIALIDAD || 'General'})`; 
                            if (ticket.ID_TECNICO_ASIGNADO === tec.ID_TECNICO) option.selected = true; 
                            selectAssignTechnician.appendChild(option);
                        });
                    }
                } catch (e) { 
                    console.error("Error cargando técnicos para asignar:", e); 
                    selectAssignTechnician.innerHTML = '<option value="">Error al cargar técnicos</option>';
                }
                
                selectAssignTechnician.disabled = ticketCerradoOResuelto; 
                btnAssignTechnician.disabled = ticketCerradoOResuelto;

            } 
            // Si NO es Admin (es decir, es Técnico), assignTechnicianGroup permanece con display: 'none'
            // y los controles dentro de él también (ya que el grupo está oculto).
        } else { 
            if (ticketActionsArea) ticketActionsArea.style.display = 'none';
        }
        
        // Lógica para permitir o no añadir comentarios
        if (addCommentForm) {
            let puedeComentar = true;
            if (currentUser.rol === 'usuario') { 
                if (!ticket || ticket.ID_USUARIO !== currentUser.id || ticketCerradoOResuelto) {
                    puedeComentar = false; 
                }
            } else if (esTecnico && !esAdmin) { // Técnico no admin
                // Un técnico puede comentar si el ticket no está cerrado/resuelto Y (está asignado a él O no está asignado)
                if (ticketCerradoOResuelto || (ticket.ID_TECNICO_ASIGNADO !== null && !esTecnicoAsignado) ) {
                    puedeComentar = false;
                }
            } else if (esAdmin) { // Admin
                 if (ticketCerradoOResuelto) { 
                    // Opcional: si quieres impedir que admin comente en cerrados/resueltos
                    // puedeComentar = false; 
                 }
            }
            addCommentForm.style.display = puedeComentar ? 'block' : 'none';
        }
    }
    // --- FIN FUNCIÓN configurarAccionesTicket ACTUALIZADA ---

    if (btnUpdateStatus) {
        btnUpdateStatus.addEventListener('click', async () => {
            const nuevoEstadoId = selectNewStatus.value;
            if (!nuevoEstadoId) { if (messageAreaTicket) showMessage(messageAreaTicket.id, 'Selecciona un nuevo estado.', 'error'); return; }
            if (messageAreaTicket) clearMessage(messageAreaTicket.id);
            const originalText = btnUpdateStatus.textContent; btnUpdateStatus.disabled = true; btnUpdateStatus.textContent = 'Actualizando...';
            try {
                const response = await fetchData(`/api/v1/tickets/${ticketId}/estado`, {
                    method: 'PUT', body: { id_estado: parseInt(nuevoEstadoId) }
                });
                if (messageAreaTicket) showMessage(messageAreaTicket.id, response.message || 'Estado actualizado.', 'success');
                poblarDetallesTicket(response.ticket); 
                await configurarAccionesTicket(response.ticket);
            } catch (error) { if (messageAreaTicket) showMessage(messageAreaTicket.id, error.message || 'Error al actualizar estado.', 'error');} 
            finally { btnUpdateStatus.disabled = false; btnUpdateStatus.textContent = originalText;}
        });
    }

    if (btnAssignTechnician) {
        btnAssignTechnician.addEventListener('click', async () => {
            let idTecnicoSeleccionado = selectAssignTechnician.value;
            idTecnicoSeleccionado = (idTecnicoSeleccionado === "null" || idTecnicoSeleccionado === "") ? null : parseInt(idTecnicoSeleccionado);
            if (messageAreaTicket) clearMessage(messageAreaTicket.id);
            const originalText = btnAssignTechnician.textContent; btnAssignTechnician.disabled = true; btnAssignTechnician.textContent = 'Asignando...';
            try {
                const response = await fetchData(`/api/v1/tickets/${ticketId}/asignar`, {
                    method: 'PUT', body: { id_tecnico_asignado: idTecnicoSeleccionado }
                });
                if (messageAreaTicket) showMessage(messageAreaTicket.id, response.message || 'Asignación actualizada.', 'success');
                poblarDetallesTicket(response.ticket);
                await configurarAccionesTicket(response.ticket); 
            } catch (error) { if (messageAreaTicket) showMessage(messageAreaTicket.id, error.message || 'Error al asignar técnico.', 'error');}
            finally { btnAssignTechnician.disabled = false; btnAssignTechnician.textContent = 'Asignar Técnico';}
        });
    }
    
    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (messageAreaComment) clearMessage(messageAreaComment.id);
            const texto = comentarioTextoTextarea.value.trim();
            if (!texto) { if (messageAreaComment) showMessage(messageAreaComment.id, 'El comentario no puede estar vacío.', 'error'); return; }
            const originalButtonText = submitCommentBtn.textContent; submitCommentBtn.disabled = true; submitCommentBtn.textContent = 'Enviando...';
            try {
                const response = await fetchData(`/api/v1/tickets/${ticketId}/comentarios`, {
                    method: 'POST', body: { comentario_texto: texto }
                });
                if (messageAreaComment) showMessage(messageAreaComment.id, response.message || 'Comentario añadido.', 'success');
                comentarioTextoTextarea.value = ''; 
                await cargarComentarios(); 
                const ticketDataActualizado = await fetchData(`/api/v1/tickets/${ticketId}`);
                if (ticketDataActualizado) {
                    poblarDetallesTicket(ticketDataActualizado);
                    await configurarAccionesTicket(ticketDataActualizado); 
                }
            } catch (error) { 
                let displayMsg = 'Error al enviar el comentario.';
                if (error.data && error.data.message) { displayMsg = error.data.message; } 
                else if (error.message) { displayMsg = error.message; }
                if (messageAreaComment) showMessage(messageAreaComment.id, displayMsg, 'error');
            }
            finally { submitCommentBtn.disabled = false; submitCommentBtn.textContent = originalButtonText;}
        });
    }

    cargarDetallesTicketYComentarios();
});