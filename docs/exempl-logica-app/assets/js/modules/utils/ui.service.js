/**
 * Serviço para elementos de UI e mensagens
 */
const UiService = (function() {
    // Criar uma referência global imediatamente
    window.UiService = this;
    
    /**
     * Exibe uma mensagem para o usuário
     * @param {string} mensagem - Texto da mensagem
     * @param {string} tipo - Tipo da mensagem (success, error, warning, info)
     * @param {string} containerId - ID do container onde a mensagem será exibida
     */
    function exibirMensagem(mensagem, tipo = 'info', containerId = 'resultadoAPI') {
        // Definir classes baseadas no tipo de mensagem
        let className;
        
        switch (tipo) {
            case 'success':
                className = 'bg-green-100 text-green-800 border-l-4 border-green-500';
                break;
            case 'error':
                className = 'bg-red-100 text-red-800 border-l-4 border-red-500';
                break;
            case 'warning':
                className = 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
                break;
            default:
                className = 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
                break;
        }
        
        const html = `
            <div class="mensagem ${className} p-3 mb-4" role="alert">
                <div class="flex">
                    <p>${mensagem}</p>
                    <button type="button" class="fechar-mensagem ml-auto">×</button>
                </div>
            </div>
        `;
        
        const $mensagem = $(html);
        $(`#${containerId} form`).prepend($mensagem);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            $mensagem.fadeOut('slow', function() {
                $(this).remove();
            });
        }, 5000);
        
        // Fechar manualmente
        $mensagem.find('.fechar-mensagem').on('click', function() {
            $mensagem.fadeOut('fast', function() {
                $(this).remove();
            });
        });
    }
    
    /**
     * Exibe uma mensagem de erro
     * @param {string} mensagem - Texto do erro
     * @param {string} containerId - ID do container onde a mensagem será exibida
     * @param {Object} detalhes - Detalhes adicionais do erro
     */
    function exibirErro(mensagem, containerId = 'resultadoAPI', detalhes = null) {
        let errorHtml = `
            <div class="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r">
                <div class="flex items-center mb-2">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="font-semibold">Erro</h3>
                </div>
                <p class="mb-2">${mensagem}</p>
        `;
        
        if (detalhes) {
            errorHtml += `
                <details class="mt-2">
                    <summary class="cursor-pointer text-sm font-medium hover:text-red-900">Ver detalhes</summary>
                    <div class="mt-2 p-2 bg-red-50 rounded text-xs">
                        <pre class="whitespace-pre-wrap">${JSON.stringify(detalhes, null, 2)}</pre>
                    </div>
                </details>
            `;
        }
        
        errorHtml += `
                <button type="button" class="mt-3 px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300" onclick="location.reload()">
                    Tentar novamente
                </button>
            </div>
        `;
        
        $(`#${containerId}`).html(errorHtml);
    }
    
    /**
     * Exibe uma mensagem de carregamento
     * @param {string} mensagem - Texto de carregamento
     * @param {string} containerId - ID do container onde a mensagem será exibida
     */
    function exibirCarregando(mensagem = 'Carregando...', containerId = 'resultadoAPI') {
        $(`#${containerId}`).html(`
            <div class="p-4 text-center">
                <div class="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <p class="mt-2 text-gray-600">${mensagem}</p>
            </div>
        `);
    }
    
    /**
     * Exibe um modal de sucesso em tela cheia com animação
     * @param {string} mensagem - Mensagem principal
     * @param {string} submensagem - Mensagem secundária opcional
     */
    function exibirModalSucesso(mensagem = 'Enviado com sucesso!', submensagem = 'Seus dados foram enviados com sucesso') {
        // Remover modal existente se houver
        $('.modal-sucesso').remove();

        const html = `
            <div class="modal-sucesso fixed inset-0 z-50 flex items-center justify-center bg-green-500 bg-opacity-95 transition-opacity duration-300 opacity-0">
                <div class="text-center text-white transform scale-95 transition-transform duration-300 relative">
                    <button class="fechar-modal-sucesso absolute top-0 right-0 -mt-12 -mr-12 text-white hover:text-green-200 transition-colors duration-200" data-modal-close="1">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    <div class="success-checkmark mb-6">
                        <svg class="w-24 h-24 mx-auto" viewBox="0 0 52 52">
                            <circle class="animate-circle" cx="26" cy="26" r="25" fill="none" stroke="white" stroke-width="2"/>
                            <path class="animate-check" fill="none" stroke="white" stroke-width="2" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                    <h2 class="text-4xl font-bold mb-4">${mensagem}</h2>
                    <p class="text-xl opacity-90">${submensagem}</p>
                    <button class="fechar-modal-sucesso mt-8 px-6 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-100 transition-colors duration-200" data-modal-close="1">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        // Adicionar CSS para animações
        const style = `
            <style>
                @keyframes circle-draw {
                    from { stroke-dasharray: 0 157; }
                    to { stroke-dasharray: 157 157; }
                }
                @keyframes check-draw {
                    from { stroke-dasharray: 0 48; }
                    to { stroke-dasharray: 48 48; }
                }
                .animate-circle {
                    animation: circle-draw 1s ease-in-out forwards;
                    stroke-dasharray: 0 157;
                }
                .animate-check {
                    animation: check-draw 0.8s ease-out 0.8s forwards;
                    stroke-dasharray: 0 48;
                }
                .modal-sucesso {
                    backdrop-filter: blur(5px);
                }
                .modal-sucesso.fade-out {
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                }
            </style>
        `;

        // Adicionar elementos ao DOM
        $('head').append(style);
        $('body').append(html);

        // Animar entrada
        setTimeout(() => {
            $('.modal-sucesso').css('opacity', '1')
                .find('.transform').css('transform', 'scale(1)');
        }, 10);

        // Handler para fechar o modal (botão X e botão Fechar)
        $('.fechar-modal-sucesso').on('click', function() {
            const $modal = $('.modal-sucesso');
            $modal.addClass('fade-out');
            setTimeout(() => {
                $modal.remove();
                // Redirecionamento se configurado
                if (window.DeepFormsApiConfig && window.DeepFormsApiConfig.redirectAfterSuccess) {
                    window.location.href = window.DeepFormsApiConfig.redirectAfterSuccess;
                } else {
                    window.location.reload();
                }
            }, 300);
        });

        // Fechar com tecla ESC
        $(document).on('keydown.modalSucesso', function(e) {
            if (e.key === 'Escape') {
                $('.fechar-modal-sucesso').first().click();
                $(document).off('keydown.modalSucesso');
            }
        });
    }
    
    /**
     * Limpa completamente um formulário
     * @param {string} formId - ID do formulário
     */
    function limparFormulario(formId) {
        const $form = $(`#${formId}`);
        if (!$form.length) return;

        // Limpar campos de texto, número, textarea, select
        $form.find('input[type="text"], input[type="number"], textarea, select').val('');

        // Limpar checkboxes e radios
        $form.find('input[type="checkbox"], input[type="radio"]').prop('checked', false);

        // Limpar campos de upload
        $form.find('input[type="file"]').val('');
        $form.find('.preview-container').empty();
        $form.find('.upload-preview').addClass('hidden');

        // Limpar assinaturas
        $form.find('.signature-pad').each(function() {
            const canvas = this;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            $(canvas).siblings('input[type="hidden"]').val('');
        });

        // Remover classes de erro
        $form.find('.error-message').addClass('hidden').text('');
        $form.find('.border-red-500').removeClass('border-red-500');

        // Trigger change event para reavaliar condições
        $form.find('input, select, textarea').trigger('change');
        
        // Reavaliar condições após limpeza
        if (typeof CondicoesService !== 'undefined') {
            CondicoesService.avaliarTodasCondicoes();
        }
    }

    // Expor métodos públicos
    return {
        exibirMensagem,
        exibirErro,
        exibirCarregando,
        exibirModalSucesso
    };
})();

// Garantir que o módulo seja exportado globalmente
window.UiService = UiService;

// Sobrescrever exibirModalSucesso para suportar redirecionamento
(function() {
    if (!window.UiService) return;

    const originalModalSucesso = UiService.exibirModalSucesso;
    UiService.exibirModalSucesso = function(titulo, mensagem) {
        originalModalSucesso.call(this, titulo, mensagem);

        // Redirecionar ao fechar o modal, se configurado
        if (window.DeepFormsApiConfig && window.DeepFormsApiConfig.redirectAfterSuccess) {
            // Espera o usuário clicar em "Fechar" ou fecha automático após 1.5s
            const redirect = () => {
                window.location.href = window.DeepFormsApiConfig.redirectAfterSuccess;
            };
            // Tenta capturar o botão fechar do modal
            $(document).off('click', '.modal-sucesso-fechar').on('click', '.modal-sucesso-fechar', redirect);
            setTimeout(redirect, 3000); // fallback: redireciona após 3s se não clicar
        }
    };
})();
