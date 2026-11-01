// frontend/js/dashboard_usuario.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Selección de Elementos DOM ---
    const welcomeMessageElement = document.getElementById('welcome-message');
    const createTicketButton = document.getElementById('create-ticket-button');
    const refreshTicketsButton = document.getElementById('refresh-tickets-button');
    const ticketsListDiv = document.getElementById('tickets-list');
    const loadingMessageDiv = document.getElementById('loading-message');
    const errorTicketsMessageDiv = document.getElementById('error-tickets-message');
    const noTicketsMessageDiv = document.getElementById('no-tickets-message');
    const logoutLink = document.getElementById('logout-link');

    let globalMessageDivUser = document.getElementById('message-area-global-dashboard-user');
    if (!globalMessageDivUser) {
        const mainContentDiv = document.querySelector('.dashboard-main-content');
        if (mainContentDiv && mainContentDiv.firstChild) {
            globalMessageDivUser = document.createElement('div');
            globalMessageDivUser.id = 'message-area-global-dashboard-user';
            globalMessageDivUser.className = 'message-box';
            globalMessageDivUser.style.display = 'none';
            mainContentDiv.insertBefore(globalMessageDivUser, mainContentDiv.firstChild);
        } else if (mainContentDiv) {
            globalMessageDivUser = document.createElement('div');
            globalMessageDivUser.id = 'message-area-global-dashboard-user';
            globalMessageDivUser.className = 'message-box';
            globalMessageDivUser.style.display = 'none';
            mainContentDiv.prepend(globalMessageDivUser);
        } else {
             console.warn("No se encontró .dashboard-main-content para añadir área de mensajes globales en dashboard_usuario.");
        }
    }

    if (typeof window.fetchData !== 'function' || typeof window.showMessage !== 'function' || 
        typeof window.clearMessage !== 'function' || typeof window.formatReadableDate !== 'function' ||
        typeof window.getCurrentUser !== 'function' || typeof window.logoutUser !== 'function' ||
        typeof window.API_BASE_URL === 'undefined') {
        console.error("Error crítico: Funciones o API_BASE_URL de utils.js no disponibles. Asegúrate que utils.js se carga antes.");
        if (globalMessageDivUser) window.showMessage(globalMessageDivUser.id, "Error crítico al cargar la página. Funcionalidades no disponibles.", "error");
        return;
    }

    const token = localStorage.getItem('token');
    const currentUser = window.getCurrentUser(); 

    if (!token || !currentUser) {
        if (globalMessageDivUser) window.showMessage(globalMessageDivUser.id, 'Debes iniciar sesión para ver tu dashboard. Serás redirigido.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    if (currentUser.rol !== 'usuario') {
        if (globalMessageDivUser) window.showMessage(globalMessageDivUser.id, 'Acceso denegado para este tipo de dashboard. Serás redirigido.', 'error');
        setTimeout(() => { 
            if (currentUser.rol === 'admin' || currentUser.rol === 'tecnico') {
                window.location.href = 'dashboard_tecnico.html';
            } else {
                window.location.href = 'login.html';
            }
        }, 3000);
        return;
    }

    history.pushState(null, document.title, location.href);
    window.addEventListener('popstate', function (event) {
        const currentTokenPop = localStorage.getItem('token');
        const currentUserPop = getCurrentUser();
        if (currentTokenPop && currentUserPop && currentUserPop.rol === 'usuario') {
            history.pushState(null, document.title, location.href);
            let msgElement = globalMessageDivUser;
            if (!msgElement && document.querySelector('.dashboard-main-content')) {
                 msgElement = document.createElement('div');
                 msgElement.id = 'temp-prevent-back-msg-user-pop';
                 msgElement.className = 'message-box';
                 msgElement.style.display = 'none';
                 document.querySelector('.dashboard-main-content').prepend(msgElement);
            }
            if (msgElement) {
                window.showMessage(msgElement.id, "Para salir, por favor utiliza el botón 'Cerrar Sesión'.", "info");
                setTimeout(() => {
                    if (msgElement.style.display !== 'none' && msgElement.textContent.includes("Cerrar Sesión")) {
                        window.clearMessage(msgElement.id);
                        if (msgElement.id === 'temp-prevent-back-msg-user-pop') { msgElement.remove(); }
                    }
                }, 4000);
            }
        }
    });

    if (welcomeMessageElement && currentUser.nombre_completo) {
        welcomeMessageElement.textContent = `¡Bienvenido, ${currentUser.nombre_completo}!`;
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (match) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }

    async function cargarTicketsUsuario() {
        if(loadingMessageDiv)loadingMessageDiv.style.display='block';if(errorTicketsMessageDiv)errorTicketsMessageDiv.style.display='none';if(noTicketsMessageDiv)noTicketsMessageDiv.style.display='none';if(ticketsListDiv)ticketsListDiv.innerHTML='';if(globalMessageDivUser)window.clearMessage(globalMessageDivUser.id);
        try {
            const tickets=await window.fetchData(`/api/v1/tickets/usuario/dashboard`);
            if(tickets&&tickets.length>0)renderizarTickets(tickets);
            else if(noTicketsMessageDiv)noTicketsMessageDiv.style.display='block';
        }catch(error){console.error('Error al cargar tickets del usuario:',error);if(errorTicketsMessageDiv){errorTicketsMessageDiv.textContent=error.message||'No se pudieron cargar tus tickets.';errorTicketsMessageDiv.style.display='block';}}
        finally{if(loadingMessageDiv)loadingMessageDiv.style.display='none';}
    }

    function renderizarTickets(tickets){
        if(!ticketsListDiv)return; ticketsListDiv.innerHTML='';
        tickets.forEach(ticket=>{
            const card=document.createElement('div');card.className='ticket-card';
            const descripcionCorta=ticket.DESCRIPCION?(String(ticket.DESCRIPCION).substring(0,100)+(String(ticket.DESCRIPCION).length>100?'...':'')):'Sin descripción.';
            
            const nombreEstadoActual = (ticket.NOMBRE_ESTADO && String(ticket.NOMBRE_ESTADO).trim() !== '') ? String(ticket.NOMBRE_ESTADO).trim() : 'N/A';
            const claseEstado = (nombreEstadoActual === 'N/A' ? 'desconocido' : nombreEstadoActual).toLowerCase().replace(/\s+/g,'-');
            const textoEstadoVisible = nombreEstadoActual === 'N/A' ? 'Desconocido' : nombreEstadoActual;

            // --- MODIFICACIÓN AQUÍ: Solo el botón "Ver Detalles" ---
            let actionButtonsHTML = `<button class="btn btn-secondary btn-sm view-ticket-btn" data-ticket-id="${ticket.ID_TICKET}">Ver Detalles</button>`;
            // --- FIN DE LA MODIFICACIÓN ---

            card.innerHTML=`
                <div class="ticket-header">
                    <h4>${escapeHTML(ticket.TITULO||'Sin título')} <span class="ticket-id">#${ticket.ID_TICKET}</span></h4>
                    <span class="status-badge status-${claseEstado}">${escapeHTML(textoEstadoVisible)}</span>
                </div>
                <p class="ticket-description">${escapeHTML(descripcionCorta)}</p>
                <p><strong>Categoría:</strong> ${escapeHTML(ticket.NOMBRE_CATEGORIA||'N/A')}</p>
                <p><strong>Prioridad:</strong> ${escapeHTML(ticket.NOMBRE_PRIORIDAD||'N/A')}</p>
                <p><strong>Técnico Asignado:</strong> ${escapeHTML(ticket.NOMBRE_TECNICO_ASIGNADO||'Sin asignar')}</p>
                <p><strong>Creado:</strong> ${window.formatReadableDate(ticket.FECHA_CREACION,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                <p><strong>Actualizado:</strong> ${window.formatReadableDate(ticket.FECHA_ACTUALIZACION,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                ${ticket.FECHA_CIERRE?`<p><strong>Cerrado:</strong> ${window.formatReadableDate(ticket.FECHA_CIERRE,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>`:''}
                <div class="ticket-actions">${actionButtonsHTML}</div>`;
            ticketsListDiv.appendChild(card);});
        attachCardButtonListeners();
    }

    function attachCardButtonListeners(){
        document.querySelectorAll('.view-ticket-btn').forEach(b=>{const n=b.cloneNode(true);b.parentNode.replaceChild(n,b);n.addEventListener('click',handleViewTicket);});
        // Ya no se buscan botones '.close-ticket-btn'
    }

    function handleViewTicket(e){window.location.href=`ver-ticket.html?id=${e.target.closest('.view-ticket-btn').dataset.ticketId}`; }
    
    // La función handleCloseTicket ya no es necesaria en este archivo si se elimina el botón
    /*
    async function handleCloseTicket(e){
        // ... (código anterior para cerrar ticket) ...
    }
    */

    if(createTicketButton)createTicketButton.addEventListener('click',()=>{window.location.href='crear_ticket.html';});
    if(refreshTicketsButton)refreshTicketsButton.addEventListener('click',()=>{cargarTicketsUsuario();});

    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
                window.logoutUser(); 
            }
        });
    }
    
    cargarTicketsUsuario();
});