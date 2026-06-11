/**
 * Componente para grupo de campos
 */
const GroupComponent = (function() {
    /**
     * Renderiza grupo de campos
     * @param {Object} campo - Configuração do campo
     * @param {Function} renderizarCampoFn - Função para renderizar campos filhos
     * @returns {string} HTML do campo
     */
    function renderizar(campo, renderizarCampoFn) {
        const { id, config } = campo;
        const { label, children = [] } = config;

        const childrenHtml = children.map(child => {
            return renderizarCampoFn(child);
        }).join('');

        // Adiciona espaçamento inferior no conteúdo do grupo
        return `
            <div class="campo-formulario form-group rounded-md mb-2 p-0" data-field-id="${id}" data-field-type="group">
                <div class="p-3 bg-gray-50 border-b border-gray-200 rounded-t-md">
                    <h3 class="text-base font-bold text-gray-700 m-0">${label}</h3>
                </div>
                <div class="grupo-conteudo pb-4">
                    ${childrenHtml}
                </div>
            </div>
        `;
    }

    /**
     * Inicializa comportamento do grupo
     */
    function inicializar() {
        // Não é mais necessário handler de collapse/expand
    }

    // API pública do módulo
    return {
        renderizar,
        inicializar
    };
})();

// Exportação do módulo
window.GroupComponent = GroupComponent;

// Não altere design, apenas mantenha o controle de required/disabled/hidden centralizado
