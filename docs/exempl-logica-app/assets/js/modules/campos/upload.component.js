/**
 * Componente para campo de upload de arquivos
 */
const UploadComponent = (function() {
    // Armazena URLs de arquivos por ID de campo
    const filesUploaded = {};

    /**
     * Renderiza campo de upload de arquivos
     * @param {Object} campo - Configuração do campo
     * @returns {string} HTML do campo
     */
    function renderizar(campo) {
        const { id, config } = campo;
        const { label, required, maxFiles = 1, fileType = 'all' } = config;

        // Definir accept corretamente para o input file
        let accept;
        let isImageField = false;
        switch (fileType) {
            case 'image':
                accept = 'image/*';
                isImageField = true;
                break;
            case 'pdf':
                accept = 'application/pdf,.pdf';
                break;
            case 'document':
                accept = '.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
                break;
            default:
                accept = '.pdf,image/*';
        }

        // Inicializar armazenamento para este campo se não existir
        if (!filesUploaded[id]) {
            filesUploaded[id] = [];
        }

        // Detectar se é mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Gerar modal apenas se for imagem e mobile
        const modalHtml = (isImageField && isMobile) ? `
            <!-- Modal para seleção de imagem -->
            <div id="modal-${id}" class="fixed inset-0 z-50 hidden bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-sm w-full">
                        <div class="p-6">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">Selecionar Imagem</h3>
                                <button type="button" class="text-gray-400 hover:text-gray-600" onclick="UploadComponent.closeModal('${id}')">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="space-y-3">
                                <button type="button" class="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" onclick="UploadComponent.openCamera('${id}')">
                                    <svg class="w-6 h-6 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    <div class="text-left">
                                        <div class="font-medium text-gray-900">Câmera</div>
                                        <div class="text-sm text-gray-500">Tirar uma nova foto</div>
                                    </div>
                                </button>
                                <button type="button" class="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" onclick="UploadComponent.openGallery('${id}')">
                                    <svg class="w-6 h-6 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <div class="text-left">
                                        <div class="font-medium text-gray-900">Galeria</div>
                                        <div class="text-sm text-gray-500">Escolher da galeria</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        return `
            <div class="campo-formulario form-group" data-field-id="${id}" data-field-type="upload" data-is-image="${isImageField}" data-is-mobile="${isMobile}">
                <label class="form-label" for="${id}">
                    ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50 cursor-pointer" onclick="UploadComponent.handleClick('${id}')">
                    <div class="flex items-center justify-center">
                        <div class="text-center">
                            <div class="mb-2 text-gray-500">
                                <svg class="mx-auto h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div class="text-primary text-sm font-medium">
                                ${isImageField ? 'Adicionar imagem' : (maxFiles > 1 ? 'Selecionar arquivos' : 'Selecionar arquivo')}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${isImageField && isMobile ? 'Toque para escolher' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Inputs de arquivo -->
                <input type="file" id="input-${id}" accept="${accept}" ${maxFiles > 1 ? 'multiple' : ''} style="display:none" onchange="UploadComponent.handleFileSelect('${id}', this, event)">
                <input type="file" id="camera-${id}" accept="image/*" capture="environment" style="display:none" onchange="UploadComponent.handleFileSelect('${id}', this, event)">
                <input type="file" id="gallery-${id}" accept="image/*" ${maxFiles > 1 ? 'multiple' : ''} style="display:none" onchange="UploadComponent.handleFileSelect('${id}', this, event)">

                <!-- Progress bar -->
                <div id="progress-${id}" class="mt-2 hidden">
                    <div class="bg-gray-200 rounded-full h-2.5">
                        <div class="bg-primary h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    <div class="text-xs text-right mt-1 text-gray-500">0%</div>
                </div>

                <!-- Lista de arquivos -->
                <div id="files-${id}" class="mt-3"></div>

                <!-- Input oculto -->
                <input type="hidden" id="urls-${id}" name="${config.name || id}_urls">
                <div class="error-message text-red-500 text-xs mt-1 hidden"></div>

                ${modalHtml}
            </div>
        `;
    }

    /**
     * Métodos públicos para interação com os uploads
     */
    function handleClick(fieldId) {
        const container = document.querySelector(`[data-field-id="${fieldId}"]`);
        const isImage = container.dataset.isImage === 'true';
        const isMobile = container.dataset.isMobile === 'true';
        
        if (isImage && isMobile) {
            document.getElementById(`modal-${fieldId}`).classList.remove('hidden');
        } else {
            document.getElementById(`input-${fieldId}`).click();
        }
    }

    function closeModal(fieldId) {
        document.getElementById(`modal-${fieldId}`).classList.add('hidden');
    }

    function openCamera(fieldId) {
        closeModal(fieldId);
        document.getElementById(`camera-${fieldId}`).click();
    }

    function openGallery(fieldId) {
        closeModal(fieldId);
        document.getElementById(`gallery-${fieldId}`).click();
    }

    function handleFileSelect(fieldId, input, event) {
        // Prevenir propagação do evento que pode causar reload em mobile
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
        
        try {
            const files = input.files;
            if (!files || files.length === 0) {
                return;
            }
            
            // Marcar upload como em andamento
            window.DeepFormsUploadInProgress = true;
            
            for (let i = 0; i < files.length; i++) {
                processUpload(fieldId, files[i]);
            }
            
            // Limpar input para permitir seleção do mesmo arquivo
            setTimeout(() => {
                input.value = '';
            }, 100);
            
        } catch (error) {
            console.error('Erro ao processar seleção de arquivo:', error);
            window.DeepFormsUploadInProgress = false;
            showUploadError(fieldId, 'Erro ao processar arquivo. Tente novamente.');
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function truncateFileName(fileName, maxLength = 30) {
        if (fileName.length <= maxLength) return fileName;
        
        // Separar nome e extensão
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            // Sem extensão
            return fileName.substring(0, maxLength - 3) + '...';
        }
        
        const name = fileName.substring(0, lastDotIndex);
        const ext = fileName.substring(lastDotIndex);
        
        // Garantir espaço para extensão e "..."
        const availableLength = maxLength - ext.length - 3;
        if (availableLength < 5) {
            // Nome muito curto, mostrar só início
            return fileName.substring(0, maxLength - 3) + '...';
        }
        
        // Truncar nome mantendo extensão
        return name.substring(0, availableLength) + '...' + ext;
    }

    function updateFileList(fieldId) {
        const container = document.querySelector(`[data-field-id="${fieldId}"]`);
        const filesList = document.getElementById(`files-${fieldId}`);
        const urlsInput = document.getElementById(`urls-${fieldId}`);
        const uploadedFiles = filesUploaded[fieldId] || [];

        urlsInput.value = JSON.stringify(uploadedFiles.map(f => f.url));

        if (uploadedFiles.length === 0) {
            filesList.innerHTML = '';
            return;
        }

        let html = '<div class="text-sm font-medium mb-2">Arquivos enviados:</div><ul class="space-y-2">';
        
        uploadedFiles.forEach((file, index) => {
            const isImage = file.url.match(/\.(jpeg|jpg|gif|png)$/i);
            const displayName = truncateFileName(file.name, 30);
            
            html += `<li class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                <div class="flex items-center flex-1 min-w-0">`;
            
            if (isImage) {
                html += `<img src="${file.url}" class="w-10 h-10 object-cover mr-2 rounded flex-shrink-0">`;
            } else {
                html += `<div class="w-10 h-10 bg-gray-200 flex items-center justify-center rounded mr-2 flex-shrink-0">
                    <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>`;
            }
            
            html += `<div class="text-sm min-w-0 flex-1">
                <p class="text-gray-700 font-medium truncate" title="${file.name}">${displayName}</p>
                <p class="text-gray-500 text-xs">${file.size}</p>
            </div>
        </div>
        <button type="button" class="text-red-500 hover:text-red-700 ml-2 flex-shrink-0" onclick="UploadComponent.removeFile('${fieldId}', ${index})">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    </li>`;
        });
        
        html += '</ul>';
        filesList.innerHTML = html;
    }

    function removeFile(fieldId, index) {
        if (filesUploaded[fieldId]) {
            const removedFile = filesUploaded[fieldId][index];
            filesUploaded[fieldId].splice(index, 1);
            updateFileList(fieldId);

            // Limpar arquivo no servidor se disponível
            if (window.MinioProcessorService && window.MinioProcessorService.cleanupUploads) {
                window.MinioProcessorService.cleanupUploads([removedFile.url]).catch(console.error);
            }
        }
    }

    function showProgress(fieldId, percent, message = '') {
        const progressContainer = document.getElementById(`progress-${fieldId}`);
        const progressBar = progressContainer.querySelector('div > div');
        const progressText = progressContainer.querySelector('.text-xs');
        
        progressContainer.classList.remove('hidden');
        progressBar.style.width = percent + '%';
        
        if (message) {
            progressText.innerHTML = `${percent}% - ${message}`;
        } else {
            progressText.textContent = percent + '%';
        }
        
        // Adicionar classe de animação para feedback visual
        progressBar.classList.add('transition-all', 'duration-300');
    }

    function hideProgress(fieldId) {
        document.getElementById(`progress-${fieldId}`).classList.add('hidden');
    }
    
    function showUploadSuccess(fieldId, message) {
        const container = document.querySelector(`[data-field-id="${fieldId}"]`);
        const existingMessage = container.querySelector('.upload-success-message');
        
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const successDiv = document.createElement('div');
        successDiv.className = 'upload-success-message mt-2 p-2 bg-green-100 text-green-800 text-sm rounded border border-green-200';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                ${message}
            </div>
        `;
        
        container.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.transition = 'opacity 0.5s';
            successDiv.style.opacity = '0';
            setTimeout(() => successDiv.remove(), 500);
        }, 3000);
    }
    
    function showUploadError(fieldId, message) {
        const container = document.querySelector(`[data-field-id="${fieldId}"]`);
        const existingMessage = container.querySelector('.upload-error-message');
        
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'upload-error-message mt-2 p-2 bg-red-100 text-red-800 text-sm rounded border border-red-200';
        errorDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    ${message}
                </div>
                <button type="button" class="text-red-600 hover:text-red-800" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        container.appendChild(errorDiv);
    }

    function processUpload(fieldId, file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            showUploadError(fieldId, `Arquivo muito grande: ${formatFileSize(file.size)}. Máximo permitido: ${formatFileSize(maxSize)}`);
            return;
        }

        if (!filesUploaded[fieldId]) {
            filesUploaded[fieldId] = [];
        }

        // Mostrar feedback inicial
        showProgress(fieldId, 0, 'Iniciando upload...');

        if (window.MinioProcessorService && window.MinioProcessorService.uploadLocal) {
            // Callback de progresso real
            const onProgress = (percent, stage) => {
                if (stage === 'compress') {
                    showProgress(fieldId, 0, 'Otimizando imagem...');
                } else if (percent < 100) {
                    showProgress(fieldId, percent, 'Enviando arquivo...');
                } else {
                    showProgress(fieldId, 100, 'Processando no servidor...');
                }
            };
            
            window.MinioProcessorService.uploadLocal(file, 0, onProgress)
                .then(response => {
                    if (response.success) {
                        const fileInfo = {
                            name: response.url.split('/').pop() || file.name,
                            size: formatFileSize(file.size),
                            url: response.url
                        };

                        filesUploaded[fieldId].push(fileInfo);
                        showProgress(fieldId, 100, 'Upload concluído!');
                        
                        setTimeout(() => {
                            updateFileList(fieldId);
                            hideProgress(fieldId);
                            showUploadSuccess(fieldId, 'Arquivo enviado com sucesso!');
                            
                            // Marcar upload como finalizado
                            window.DeepFormsUploadInProgress = false;
                        }, 500);
                    } else {
                        throw new Error(response.error || 'Erro no upload');
                    }
                })
                .catch(error => {
                    // Sempre desmarcar flag de upload em caso de erro
                    window.DeepFormsUploadInProgress = false;
                    
                    hideProgress(fieldId);
                    const errorMsg = error?.error || error?.message || String(error);
                    console.error('❌ Erro no upload:', errorMsg, error);
                    showUploadError(fieldId, errorMsg);
                });
        } else {
            hideProgress(fieldId);
            showUploadError(fieldId, 'Serviço de upload não disponível');
        }
    }

    /**
     * Inicializa comportamento do upload
     * @param {string} id - ID do campo
     */
    function inicializar(id) {
        // Inicialização já é feita via HTML inline
        updateFileList(id);
    }

    // API pública do módulo
    return {
        renderizar,
        inicializar,
        handleClick,
        closeModal,
        openCamera,
        openGallery,
        handleFileSelect,
        removeFile
    };
})();

// Exportação do módulo
window.UploadComponent = UploadComponent;