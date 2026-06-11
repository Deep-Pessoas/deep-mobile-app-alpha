/**
 * Componente para separador
 */
const DividerComponent = (function() {
    /**
     * Renderiza separador
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id } = campo;
        
        return `
            <div class="campo-formulario my-8" data-field-id="${id}" data-field-type="divider">
                <hr class="border-t border-gray-200">
            </div>
        `;
    }
    
    // API pública do módulo
    return {
        renderizar
    };
})();

// Exportação do módulo
window.DividerComponent = DividerComponent;

// Não altere design, apenas mantenha o controle de required/disabled/hidden centralizado
