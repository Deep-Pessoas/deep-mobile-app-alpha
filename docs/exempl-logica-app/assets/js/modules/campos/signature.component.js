/**
 * Componente para campo de assinatura
 */
const SignatureComponent = (function() {
    /**
     * Renderiza campo de assinatura
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, required } = config;
        
        const initScript = `
            <script>
                $(function() {
                    $("#${id}").on('change', function() {
                        $(document).trigger('condicoes:atualizar');
                    });
                    $(document).on('signature:changed', function() {
                        $(document).trigger('condicoes:atualizar');
                    });
                });
            </script>
        `;
        
        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="signature">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <div class="border border-gray-300 rounded bg-white">
                    <canvas id="${id}_canvas" class="signature-pad w-full h-40 cursor-crosshair"></canvas>
                </div>
                <div class="mt-2">
                    <button type="button" class="clear-signature text-xs bg-gray-100 text-gray-700 py-1 px-2 rounded">
                        Limpar
                    </button>
                </div>
                <div class="text-xs text-gray-500 mt-1">Assine usando o mouse ou toque.</div>
                <input type="hidden" id="${id}" name="${config.name || id}" ${required ? 'required' : ''}>
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>
                ${initScript}
            </div>
        `;
    }
    
    /**
     * Inicializa comportamento da assinatura
     * @param {string} id - ID do campo
     */
    function inicializar(id) {
        // Aguardar o DOM estar pronto
        $(document).ready(function() {
            const canvas = document.getElementById(`${id}_canvas`);
            if (!canvas) {
                console.error('Canvas não encontrado:', id);
                return;
            }
            
            // Verificar se o contexto é suportado antes de tentar inicializar
            try {
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Context 2d não suportado');
                }
                
                const inputId = id;
                
                // Configuração do canvas
                function redimensionarCanvas() {
                    // Salvar conteúdo atual antes de redimensionar
                    const imageData = canvas.toDataURL();
                    const hasContent = $(`#${inputId}`).val() && $(`#${inputId}`).val().length > 0;
                    
                    const ratio = Math.max(window.devicePixelRatio || 1, 1);
                    canvas.width = canvas.offsetWidth * ratio;
                    canvas.height = canvas.offsetHeight * ratio;
                    ctx.scale(ratio, ratio);
                    
                    // Limpar canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Restaurar conteúdo se existia
                    if (hasContent && imageData && imageData !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
                        const img = new Image();
                        img.onload = function() {
                            ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
                        };
                        img.src = imageData;
                    }
                }
                
                // Variáveis de desenho
                let desenhando = false;
                let ultimoX = 0;
                let ultimoY = 0;
                
                // Eventos de mouse/touch
                canvas.addEventListener('mousedown', iniciarDesenho);
                canvas.addEventListener('touchstart', iniciarDesenho);
                canvas.addEventListener('mousemove', desenhar);
                canvas.addEventListener('touchmove', desenhar);
                canvas.addEventListener('mouseup', pararDesenho);
                canvas.addEventListener('touchend', pararDesenho);
                canvas.addEventListener('mouseout', pararDesenho);
                
                // Botão limpar
                $(canvas).closest('.campo-formulario').find('.clear-signature').on('click', function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    $(`#${inputId}`).val('');
                });
                
                // Funções de desenho
                function iniciarDesenho(e) {
                    desenhando = true;
                    const pos = obterPosicao(e);
                    ultimoX = pos.x;
                    ultimoY = pos.y;
                }
                
                function desenhar(e) {
                    if (!desenhando) return;
                    e.preventDefault();
                    
                    const pos = obterPosicao(e);
                    ctx.beginPath();
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#000';
                    ctx.moveTo(ultimoX, ultimoY);
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                    
                    ultimoX = pos.x;
                    ultimoY = pos.y;
                    
                    // Salvar assinatura como base64
                    $(`#${inputId}`).val(canvas.toDataURL());
                }
                
                function pararDesenho() {
                    desenhando = false;
                }
                
                function obterPosicao(e) {
                    let x, y;
                    
                    if (e.type.includes('touch')) {
                        const touch = e.touches[0] || e.changedTouches[0];
                        const rect = canvas.getBoundingClientRect();
                        x = touch.clientX - rect.left;
                        y = touch.clientY - rect.top;
                    } else {
                        const rect = canvas.getBoundingClientRect();
                        x = e.clientX - rect.left;
                        y = e.clientY - rect.top;
                    }
                    
                    return { x, y };
                }
                
                // Inicializar canvas
                redimensionarCanvas();
                window.addEventListener('resize', redimensionarCanvas);
                
                // Disparar evento quando assinatura mudar
                canvas.addEventListener('mouseup', function() {
                    $(document).trigger('signature:changed');
                });
                canvas.addEventListener('touchend', function() {
                    $(document).trigger('signature:changed');
                });
            } catch (error) {
                console.error('Erro ao inicializar canvas:', error);
                // Fallback simples - mostrar campo de texto
                $(canvas).replaceWith(`<input type="text" 
                    id="${id}" 
                    name="${id}" 
                    class="form-input" 
                    placeholder="Sua assinatura">`);
            }
        });
    }
    
    // API pública do módulo
    return {
        renderizar,
        inicializar
    };
})();

// Exportação do módulo
window.SignatureComponent = SignatureComponent;
