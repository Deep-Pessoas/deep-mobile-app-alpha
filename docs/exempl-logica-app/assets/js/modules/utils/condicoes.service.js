const CondicoesService = (function() {
    // Estado interno
    const estado = {
        campos: [],
        condicoes: new Map(),
        valores: {},
    };

    // Converte o formato antigo para json-logic
    function converterParaJsonLogic(condicao) {
        if (!condicao || !condicao.regras || !Array.isArray(condicao.regras) || condicao.regras.length === 0) {
            return null;
        }

        const regras = condicao.regras.map(regra => {
            const campoValue = { "var": regra.campo };

            // Ajuste: para checkbox, usar contains (indexOf) para equals/contains
            if (regra.operador === 'equals' || regra.operador === 'contains') {
                return {
                    "in": [regra.valor, campoValue]
                };
            }
            if (regra.operador === 'notEquals' || regra.operador === 'notContains') {
                return {
                    "!": {
                        "in": [regra.valor, campoValue]
                    }
                };
            }
            if (regra.operador === 'isEmpty') {
                return { "!": { "!!": campoValue } };
            }
            if (regra.operador === 'isNotEmpty') {
                return { "!!": campoValue };
            }
            // fallback
            return { "==": [campoValue, regra.valor] };
        });

        // Combinar regras de acordo com o tipo (AND/OR)
        if (condicao.tipo === 'OR') {
            return { "or": regras };
        }
        // Default AND
        return { "and": regras };
    }

    // Mapeia todas as condições do formulário
    function mapearCondicoes(campos) {
        estado.condicoes.clear();
        function percorrer(campos) {
            campos.forEach(campo => {
                // Campos invisíveis não participam de lógicas
                if (campo?.visibility === false || campo?.config?.visibility === false) return;

                if (campo?.config?.conditions) {
                    const cond = campo.config.conditions;
                    estado.condicoes.set(campo.id, {
                        action: cond.action || 'show',
                        logic: converterParaJsonLogic(cond)
                    });
                }
                if (campo.type === 'group' && campo.config?.children) {
                    percorrer(campo.config.children);
                }
            });
        }
        percorrer(campos);
    }

    // Coleta valores atuais dos campos do DOM
    function coletarValores(campos) {
        const valores = {};
        function percorrer(campos) {
            campos.forEach(campo => {
                // Campos invisíveis não contribuem para valores de condições
                if (campo?.visibility === false || campo?.config?.visibility === false) return;

                const $el = $(`.campo-formulario[data-field-id="${campo.id}"]`);
                if ($el.length && !['group', 'divider', 'title'].includes(campo.type)) {
                    let valor;
                    switch (campo.type) {
                        case 'checkbox':
                            valor = [];
                            $el.find('input[type="checkbox"]:checked').each(function() {
                                valor.push($(this).val());
                            });
                            break;
                        case 'radio':
                            valor = $el.find('input[type="radio"]:checked').val();
                            break;
                        case 'upload':
                            try {
                                valor = JSON.parse($el.find('input[type="hidden"]').val() || '[]');
                            } catch {
                                valor = [];
                            }
                            break;
                        default:
                            valor = $el.find('input, select, textarea').val();
                    }
                    valores[campo.id] = valor;
                }
                if (campo.type === 'group' && campo.config?.children) {
                    percorrer(campo.config.children);
                }
            });
        }
        percorrer(campos);
        return valores;
    }

    // Busca config do campo pelo id
    function buscarConfigCampo(campos, id) {
        for (const campo of campos) {
            if (campo.id === id) return campo.config;
            if (campo.type === 'group' && campo.config?.children) {
                const achado = buscarConfigCampo(campo.config.children, id);
                if (achado) return achado;
            }
        }
        return null;
    }

    // Avalia todas as condições e mostra/oculta campos
    function avaliarTodasCondicoes() {
        // PRIMEIRO: Coletar valores atuais
        estado.valores = coletarValores(estado.campos);
        
        // Log para debug
        
        // DEPOIS: Avaliar grupos primeiro
        estado.condicoes.forEach((cond, campoId) => {
            const $campo = $(`.campo-formulario[data-field-id="${campoId}"]`);
            if ($campo.data('field-type') === 'group') {
                avaliarCondicao(cond, campoId);
            }
        });

        // Por último: Avaliar campos dentro dos grupos
        estado.condicoes.forEach((cond, campoId) => {
            const $campo = $(`.campo-formulario[data-field-id="${campoId}"]`);
            if ($campo.data('field-type') !== 'group') {
                avaliarCondicao(cond, campoId);
            }
        });
    }

    function avaliarCondicao(cond, campoId) {
        let resultado = true;
        if (cond.logic) {
            resultado = window.jsonLogic.apply(cond.logic, estado.valores);
        }
        
        const $campo = $(`.campo-formulario[data-field-id="${campoId}"]`);
        
        // Verificar estado atual do campo
        const isCurrentlyHidden = $campo.hasClass('hidden') || $campo.is(':hidden') || $campo.css('display') === 'none';

        // Ajuste para action 'show'
        if (cond.action === 'show') {
            if (!resultado) {
                // Campo deve ficar oculto
                if (!isCurrentlyHidden) {
                    $campo.addClass('hidden');
                }
            } else {
                // Campo deve ficar visível
                if (isCurrentlyHidden) {
                    $campo.removeClass('hidden');
                }
            }
        } else if (cond.action === 'hide') {
            if (resultado) {
                // Campo deve ficar oculto
                if (!isCurrentlyHidden) {
                    $campo.addClass('hidden');
                }
            } else {
                // Campo deve ficar visível
                if (isCurrentlyHidden) {
                    $campo.removeClass('hidden');
                }
            }
        }
    }

    // NOVO: Retorna informações para debug visual
    function _debugInfo() {
        const condicionadores = [];
        const condicionados = [];
        const campoPorId = {};
        function percorrer(campos) {
            campos.forEach(campo => {
                campoPorId[campo.id] = campo;
                if (campo.type === 'group' && campo.config?.children) {
                    percorrer(campo.config.children);
                }
            });
        }
        percorrer(estado.campos);

        estado.condicoes.forEach((cond, campoId) => {
            const campo = campoPorId[campoId] || {};
            let usados = [];
            let valores = [];
            if (cond.logic) {
                // Extrai todos os "var" do json-logic e valores se possível
                const buscarVars = obj => {
                    let vars = [];
                    if (typeof obj === 'object' && obj !== null) {
                        for (const k in obj) {
                            if (k === 'var') vars.push(obj[k]);
                            else vars = vars.concat(buscarVars(obj[k]));
                        }
                    }
                    return vars;
                };
                usados = buscarVars(cond.logic);
                // Para valores, tenta extrair do json-logic (apenas para exibição)
                const buscarValores = obj => {
                    let vals = [];
                    if (typeof obj === 'object' && obj !== null) {
                        for (const k in obj) {
                            if (k === 'in' && Array.isArray(obj[k]) && obj[k].length > 0) {
                                vals.push(obj[k][0]);
                            } else {
                                vals = vals.concat(buscarValores(obj[k]));
                            }
                        }
                    }
                    return vals;
                };
                valores = buscarValores(cond.logic);
            }
            condicionados.push({
                id: campoId,
                label: campo.config?.label || campo.config?.titleText || campoId,
                condicionadores: usados,
                valores: valores
            });
            usados.forEach(cid => {
                let condIndex = condicionadores.findIndex(c => c.id === cid);
                if (condIndex === -1) {
                    condicionadores.push({
                        id: cid,
                        label: campoPorId[cid]?.config?.label || campoPorId[cid]?.config?.titleText || cid,
                        condicionados: [campoId]
                    });
                } else {
                    condicionadores[condIndex].condicionados.push(campoId);
                }
            });
        });
        return { condicionadores, condicionados };
    }

    // NOVO: expõe campos para debug visual
    function _debugCampos() {
        return estado.campos;
    }

    // Inicializa o serviço com os campos do formulário
    function inicializar(campos) {
        estado.campos = campos || [];
        mapearCondicoes(estado.campos);
        avaliarTodasCondicoes();

        // Registrar eventos para reavaliar condições ao alterar qualquer campo
        $(document).off('condicoes:atualizar').on('condicoes:atualizar', function() {
            // Usar debounce para evitar múltiplas chamadas
            clearTimeout(window.condicoesTimeout);
            window.condicoesTimeout = setTimeout(function() {
                avaliarTodasCondicoes();
            }, 100);
        });
        
        // Também reavaliar ao mudar qualquer input relevante, mas com debounce
        $(document).off('change.condicoes').on('change.condicoes', '.campo-formulario input, .campo-formulario select, .campo-formulario textarea', function() {
            // Usar debounce para evitar múltiplas chamadas
            clearTimeout(window.condicoesTimeout);
            window.condicoesTimeout = setTimeout(function() {
                avaliarTodasCondicoes();
            }, 100);
        });
    }

    return {
        inicializar,
        avaliarTodasCondicoes,
        _debugInfo, // <-- exporta para debug visual
        _debugCampos // <-- exporta campos para debug visual
    };
})();

window.CondicoesService = CondicoesService;
