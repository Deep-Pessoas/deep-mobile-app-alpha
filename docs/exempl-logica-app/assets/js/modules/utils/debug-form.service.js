(function() {
    const DebugFormService = (function() {

        function addDebugElements() {
            // Evitar duplicidade
            if ($('.debug-warning').length) return;

            // Adicionar aviso
            $('body').prepend(`
                <div class="debug-warning fixed top-0 left-0 right-0 bg-red-100 text-red-800 p-4 text-center z-[9999]">
                    ⚠️ Este link é apenas para análise do formulário e não deve ser compartilhado.
                </div>
            `);
        }

        // Utilitário para buscar label de campo por id
        function getCampoLabel(id, campos) {
            if (!campos) return id;
            for (const campo of campos) {
                if (campo.id === id) return campo.config?.label || campo.config?.titleText || id;
                if (campo.type === 'group' && campo.config?.children) {
                    const found = getCampoLabel(id, campo.config.children);
                    if (found && found !== id) return found;
                }
            }
            return null;
        }

        // Busca label da opção, percorrendo toda a árvore e comparando como string
        function getOptionLabel(campoId, valor, campos) {
            if (!campos) return valor;
            for (const campo of campos) {
                if (campo.id === campoId && Array.isArray(campo.config?.options)) {
                    // Corrigir: valor pode ser array (checkbox), pegar label de cada
                    if (Array.isArray(valor)) {
                        return valor.map(v => {
                            const opt = campo.config.options.find(o => String(o.value) === String(v));
                            return opt ? opt.label : v;
                        }).join(', ');
                    } else {
                        const opt = campo.config.options.find(o => String(o.value) === String(valor));
                        if (opt) return opt.label;
                    }
                }
                // Corrigir: sempre percorre todos os filhos, mesmo dentro de grupos aninhados
                if (campo.config?.children && Array.isArray(campo.config.children)) {
                    const found = getOptionLabel(campoId, valor, campo.config.children);
                    if (found && found !== valor) return found;
                }
            }
            return valor;
        }

        // Busca número sequencial do campo pelo id
        function getNumeroSequencial(id) {
            const $campo = $(`[data-field-id="${id}"]`);
            const $num = $campo.find('.debug-numero').first();
            return $num.length ? $num.text().trim() : '';
        }

        // Busca operador da condição para um campo condicionado em relação a um controlador
        function getOperadorCondicionado(condicionadoId, controladorId, campos) {
            if (!campos) return '';
            const campo = findCampoById(condicionadoId, campos);
            if (campo && campo.config && campo.config.conditions && campo.config.conditions.regras) {
                const regra = campo.config.conditions.regras.find(r => r.campo === controladorId);
                if (regra && regra.operador) return regra.operador;
            }
            return '';
        }

        function findCampoById(id, campos) {
            for (const campo of campos) {
                if (campo.id === id) return campo;
                if (campo.type === 'group' && campo.config?.children) {
                    const found = findCampoById(id, campo.config.children);
                    if (found) return found;
                }
            }
            return null;
        }

        // Remove duplicatas mantendo ordem
        function unique(arr) {
            return [...new Set(arr)];
        }

        // Adiciona textos de condição abaixo do label (condicionados e controladores)
        function marcarCondicoesClaras() {
            if (!window.CondicoesService || !window.CondicoesService._debugInfo) return;
            const debugInfo = window.CondicoesService._debugInfo();
            const condicionados = debugInfo.condicionados || [];
            const condicionadores = debugInfo.condicionadores || [];
            const campos = window.CondicoesService && window.CondicoesService._debugCampos ? window.CondicoesService._debugCampos() : null;

            $('.debug-cond-text').remove();

            // Tag roxa "Controlador" para campos controladores
            condicionadores.forEach(c => {
                const $campo = $(`[data-field-id="${c.id}"]`);
                const $label = $campo.find('> .form-label').first();
                // Garante apenas um chip por campo
                if ($label.next('.debug-cond-text').length === 0) {
                    $label.after(
                        `<div class="debug-cond-text flex items-center gap-2 my-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 shadow-sm" title="Este campo controla a exibição de outros campos">
                                <svg class="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                                </svg>
                                Controlador
                            </span>
                        </div>`
                    );
                }
            });

            // Condicionados: mostra textos, cada um em uma linha separada
            condicionados.forEach(c => {
                const $campo = $(`[data-field-id="${c.id}"]`);
                const $label = $campo.find('> .form-label').first();
                let textos = [];
                if (c.condicionadores.length) {
                    if (c.valores && c.valores.length && c.condicionadores.length === c.valores.length) {
                        textos = c.condicionadores.map((cid, idx) => {
                            let campoLabel = getCampoLabel(cid, campos) || '';
                            let num = getNumeroSequencial(cid);
                            let operador = getOperadorCondicionado(c.id, cid, campos);
                            operador = operador ? `<span class="ml-1 text-gray-500">(${operador})</span>` : '';
                            const valorLabel = getOptionLabel(cid, c.valores[idx], campos);
                            return `<div class="debug-cond-text mt-2 mb-2 text-xs text-orange-800 font-semibold bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                Sendo exibido por: <span class="font-bold">${num ? num + ' - ' : ''}${campoLabel}</span> ${operador} opção <span class="font-bold">"${valorLabel}"</span>
                            </div>`;
                        }).filter(Boolean);
                    } else {
                        const cid = c.condicionadores[0];
                        let campoLabel = getCampoLabel(cid, campos) || '';
                        let num = getNumeroSequencial(cid);
                        let operador = getOperadorCondicionado(c.id, cid, campos);
                        operador = operador ? `<span class="ml-1 text-gray-500">(${operador})</span>` : '';
                        textos = [`<div class="debug-cond-text mt-2 mb-2 text-xs text-orange-800 font-semibold bg-orange-50 border border-orange-200 rounded px-2 py-1">
                            Sendo exibido por: <span class="font-bold">${num ? num + ' - ' : ''}${campoLabel}</span> ${operador}
                        </div>`];
                    }
                }
                if (textos.length) {
                    // Garante que cada texto fique em uma linha separada
                    $label.after(textos.join(''));
                }
            });
        }

        // Painel flutuante de debug em tempo real
        function painelStatusCampos() {
            if ($('#debug-status-panel').length) return;
            const panel = $(`
                <div id="debug-status-panel" class="fixed top-20 right-4 w-[370px] max-h-[80vh] overflow-y-auto bg-white border border-gray-300 shadow-2xl rounded-lg z-[99999] p-4 text-xs">
                    <div class="font-bold text-base mb-2 text-primary flex items-center gap-2">
                        <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"/>
                        </svg>
                        Debug Condições (tempo real)
                    </div>
                    <div id="debug-status-list"></div>
                </div>
            `);
            $('body').append(panel);
        }

        // Limita e sanitiza labels para painel flutuante (máx 32 chars)
        function formatShort(label) {
            if (!label) return '';
            let clean = label.replace(/^\d+\.\s*/, '');
            return clean.length > 32 ? clean.slice(0, 32) + '...' : clean;
        }

        // Gera um mapa de id -> numeração sequencial igual ao formulário
        function gerarMapaNumeracao() {
            const mapa = {};
            function numerar(campos, prefixo = '') {
                let idx = 1;
                campos.forEach(campo => {
                    if (['divider', 'title'].includes(campo.type)) return;
                    const num = prefixo ? `${prefixo}.${idx}` : `${idx}`;
                    mapa[campo.id] = num;
                    if (campo.type === 'group' && campo.config?.children) {
                        numerar(campo.config.children, num);
                    }
                    idx++;
                });
            }
            if (window.CondicoesService && window.CondicoesService._debugCampos) {
                numerar(window.CondicoesService._debugCampos());
            }
            return mapa;
        }

        // Atualiza painel flutuante com status dos campos
        function atualizarPainelStatusCampos() {
            if (!window.CondicoesService || !window.CondicoesService._debugCampos) return;
            const campos = window.CondicoesService._debugCampos();
            const debugInfo = window.CondicoesService._debugInfo();
            const statusList = [];
            const mapaNumeracao = gerarMapaNumeracao();

            function percorrer(campos) {
                campos.forEach(campo => {
                    if (['divider', 'title'].includes(campo.type)) return;
                    const $el = $(`[data-field-id="${campo.id}"]`);
                    const visivel = !$el.hasClass('hidden');
                    const label = formatShort(campo.config?.label || campo.config?.titleText || campo.id);
                    const num = mapaNumeracao[campo.id] || '';
                    let motivo = '';
                    const cond = debugInfo.condicionados.find(x => x.id === campo.id);
                    if (cond && cond.condicionadores.length) {
                        if (cond.valores && cond.valores.length && cond.condicionadores.length === cond.valores.length) {
                            motivo = cond.condicionadores.map((cid, idx) => {
                                const campoLabel = formatShort(getCampoLabel(cid, campos) || '');
                                const valorLabel = getOptionLabel(cid, cond.valores[idx], campos); // Já busca o label
                                const numCtrl = mapaNumeracao[cid] || '';
                                let operador = getOperadorCondicionado(cond.id, cid, campos);
                                operador = operador ? `(${operador})` : '';
                                return `<div class="break-words">
                                    <span class="text-gray-700">${numCtrl ? numCtrl + ' - ' : ''}${campoLabel}</span> 
                                    <span class="text-gray-500">${operador}</span> 
                                    <span class="text-gray-500">opção</span> 
                                    <span class="font-semibold text-gray-900">"${valorLabel}"</span>
                                </div>`;
                            }).join('');
                        } else {
                            const cid = cond.condicionadores[0];
                            const campoLabel = formatShort(getCampoLabel(cid, campos) || '');
                            const numCtrl = mapaNumeracao[cid] || '';
                            let operador = getOperadorCondicionado(cond.id, cid, campos);
                            operador = operador ? `(${operador})` : '';
                            motivo = `<div class="break-words"><span class="text-gray-700">${numCtrl ? numCtrl + ' - ' : ''}${campoLabel}</span> <span class="text-gray-500">${operador}</span></div>`;
                        }
                    }
                    statusList.push(`
                        <div class="flex items-center gap-2 mb-2">
                            <span class="font-mono text-xs text-gray-400">${num}</span>
                            <span class="font-semibold text-gray-800 flex-1 truncate">${label}</span>
                            <span class="rounded px-2 py-0.5 ${visivel ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} font-bold">${visivel ? 'VISÍVEL' : 'OCULTO'}</span>
                        </div>
                        ${!visivel && motivo ? `<div class="ml-10 mb-2 text-gray-500">${motivo}</div>` : ''}
                    `);
                    if (campo.type === 'group' && campo.config?.children) {
                        percorrer(campo.config.children);
                    }
                });
            }
            percorrer(campos);
            $('#debug-status-list').html(statusList.join(''));
        }

        function debug() {
            if (!window.location.search.includes('debug=1')) return;

            function numerarCampo(el, prefixo = '') {
                const campos = $(el).find('> .campo-formulario');
                campos.each(function(index) {
                    const $campo = $(this);
                    const numero = prefixo ? `${prefixo}.${index + 1}` : index + 1;
                    const $label = $campo.find('> .form-label').first();

                    if ($label.length && !$label.find('.debug-numero').length) {
                        $label.prepend(`<span class="debug-numero bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2 py-0.5 rounded">${numero}</span>`);
                    }

                    if ($campo.data('field-type') === 'group') {
                        numerarCampo($campo.find('.grupo-conteudo'), numero);
                    }
                });
            }

            function iniciarNumeracao() {
                $('.debug-numero').remove();
                $('.debug-cond-text').remove();
                $('.debug-cond-indicator').remove();
                const $form = $('#deepFormulario');
                if ($form.length) numerarCampo($form);
                marcarCondicoesClaras();
                painelStatusCampos();
                setTimeout(atualizarPainelStatusCampos, 100);
            }

            // Observer otimizado
            const observer = new MutationObserver(() => {
                if ($('#deepFormulario').find('.campo-formulario').length) {
                    iniciarNumeracao();
                }
            });

            // Inicialização otimizada
            let tentativas = 0;
            const maxTentativas = 20;
            const interval = setInterval(() => {
                if ($('#deepFormulario').length) {
                    clearInterval(interval);
                    iniciarNumeracao();
                    
                    observer.observe(document.querySelector('#resultadoAPI'), {
                        childList: true,
                        subtree: true,
                        attributes: false
                    });
                } else if (++tentativas >= maxTentativas) {
                    clearInterval(interval);
                    console.warn('Debug: Formulário não encontrado após ' + maxTentativas + ' tentativas');
                }
            }, 500);

            // Adicionar apenas o aviso após o carregamento do formulário
            // Espera até que #resultadoAPI tenha conteúdo
            function waitForForm() {
                if ($('#resultadoAPI').children().length > 0) {
                    addDebugElements();
                } else {
                    setTimeout(waitForForm, 300);
                }
            }
            waitForForm();

            // Atualizar marcador quando condições forem reavaliadas
            $(document).on('condicoes:atualizar', function() {
                marcarCondicoesClaras();
                atualizarPainelStatusCampos();
            });

            // Atualizar painel em tempo real ao mudar qualquer input/select/checkbox
            $(document).on('change input', '.campo-formulario input, .campo-formulario select, .campo-formulario textarea', function() {
                setTimeout(atualizarPainelStatusCampos, 10);
            });
        }

        // Iniciar quando o DOM estiver pronto
        $(document).ready(debug);

        return { debug };
    })();

    // Export global
    window.DebugFormService = DebugFormService;
})();
