/**
 * Serviço simplificado para validação de campos obrigatórios
 */
const RequiredHandlerService = (function() {
    /**
     * Valida todos os campos obrigatórios visíveis
     * @returns {boolean} Resultado da validação
     */
    function validarTodosCampos() {
        const $form = $('#deepFormulario');
        let primeiroErro = null;
        
        // Limpar erros anteriores
        $form.find('.campo-formulario').removeClass('border-red-500');
        $form.find('.error-message').addClass('hidden').text('');

        // Função recursiva para validar campos
        function validarCampo($campo) {
            const tipo = $campo.data('field-type');
            
            // Ignorar campos ocultos
            if ($campo.hasClass('hidden') || $campo.is(':hidden') || $campo.css('display') === 'none') {
                return true;
            }

            // Ignorar títulos e separadores
            if (['title', 'divider'].includes(tipo)) {
                return true;
            }

            // Para grupos, validar filhos recursivamente
            if (tipo === 'group') {
                let grupoValido = true;
                $campo.find('.campo-formulario').each(function() {
                    if (!validarCampo($(this))) {
                        grupoValido = false;
                    }
                });
                return grupoValido;
            }

            // Verificar se o campo é obrigatório (tem * no label)
            const $label = $campo.find('label').first();
            const isRequired = $label.text().includes('*');
                
            if (!isRequired) {
                return true;
            }

            // Validar baseado no tipo - CADA CAMPO INDEPENDENTEMENTE
            let invalido = false;

            switch (tipo) {
                case 'checkbox':
                    // Verificar se pelo menos um checkbox está marcado neste campo específico
                    const $checkboxes = $campo.find('input[type="checkbox"]');
                    invalido = $checkboxes.filter(':checked').length === 0;
                    break;
                    
                case 'radio':
                    // Verificar se pelo menos um radio está marcado neste campo específico
                    const $radios = $campo.find('input[type="radio"]');
                    invalido = $radios.filter(':checked').length === 0;
                    break;
                    
                case 'select':
                    invalido = !$campo.find('select').val();
                    break;
                    
                case 'upload':
                    const $hidden = $campo.find('input[type="hidden"]');
                    let files = [];
                    try { files = JSON.parse($hidden.val() || '[]'); } catch {}
                    invalido = files.length === 0;
                    break;
                    
                case 'signature':
                    const $signatureHidden = $campo.find('input[type="hidden"]');
                    const signatureValue = $signatureHidden.val();
                    invalido = !signatureValue || signatureValue.trim() === '';
                    break;

                case 'mult_capturas':
                    const $capturaItems = $campo.find('.captura-item');
                    if ($capturaItems.length === 0) {
                        invalido = false;
                        break;
                    }
                    let capturasFeitas = 0;
                    $capturaItems.each(function() {
                        const capturaId = $(this).data('captura-id');
                        const latVal = document.getElementById(capturaId + '_latitude')?.textContent;
                        const lonVal = document.getElementById(capturaId + '_longitude')?.textContent;
                        if (latVal && lonVal &&
                            latVal !== '--' && lonVal !== '--' &&
                            latVal !== 'Erro' && lonVal !== 'Erro') {
                            capturasFeitas++;
                        }
                    });
                    invalido = capturasFeitas < $capturaItems.length;
                    break;

                default:
                    const $inputs = $campo.find('input:not([type="hidden"]), select, textarea');
                    invalido = !$inputs.val() || $inputs.val().trim() === '';
            }

            if (invalido) {
                // Aplicar borda vermelha APENAS neste campo específico
                $campo.addClass('border-red-500');
                $campo.find('.error-message').removeClass('hidden').text('Campo obrigatório');
                if (!primeiroErro) primeiroErro = $campo;
                return false;
            }

            return true;
        }

        const formValido = $form.find('> .campo-formulario').toArray().every(campo => 
            validarCampo($(campo))
        );

        if (primeiroErro) {
            $('html, body').animate({
                scrollTop: primeiroErro.offset().top - 100
            }, 400);
            return false;
        }

        return formValido;
    }

    return {
        validarTodosCampos
    };
})();

window.RequiredHandlerService = RequiredHandlerService;
