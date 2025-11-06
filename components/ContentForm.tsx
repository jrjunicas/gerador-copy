import React, { useState, useRef, useEffect } from 'react';
import { Client, ContentRequest, ContentFormatDefinition, SOCIAL_NETWORKS, PromptTemplate } from '../types';
import { UserPlusIcon, EditIcon, TrashIcon, PlusCircleIcon, Cog6ToothIcon, PaperClipIcon } from './Icons';
import { extractThemeFromFile } from '../services/geminiService';


import { saveCurrentPreset, listPresets } from '../services/db';
interface ContentFormProps {
  clients: Client[];
  formats: ContentFormatDefinition[];
  prompts: PromptTemplate[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onAddFormat: (format: Omit<ContentFormatDefinition, 'id' | 'isDefault'>) => void;
  onUpdateFormat: (format: ContentFormatDefinition) => void;
  onDeleteFormat: (formatId: string) => void;
  onAddPrompt: (prompt: Omit<PromptTemplate, 'id'>) => void;
  onUpdatePrompt: (prompt: PromptTemplate) => void;
  onDeletePrompt: (promptId: string) => void;
  onSubmitBatch: (requests: ContentRequest[], clientId: string) => void;
  isLoading: boolean;
}

const initialRequestState: Omit<ContentRequest, 'id'> = {
  theme: '',
  format: 'Carrossel',
  networks: ['Instagram'],
  customNetwork: '',
  ctaObjective: '',
  specificDirections: '',
};

const ContentForm: React.FC<ContentFormProps> = ({ 
    clients, formats, onAddClient, onUpdateClient, onDeleteClient,
    onAddFormat, onUpdateFormat, onDeleteFormat,
    prompts, onAddPrompt, onUpdatePrompt, onDeletePrompt,
    onSubmitBatch, isLoading 
}) => {
  const [clientId, setClientId] = useState('');
  const [queue, setQueue] = useState<ContentRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState(initialRequestState);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isManageFormatsModalOpen, setIsManageFormatsModalOpen] = useState(false);
  const [isManagePromptsModalOpen, setIsManagePromptsModalOpen] = useState(false);

  const [attachment, setAttachment] = useState<File | null>(null);
  const [isExtractingTheme, setIsExtractingTheme] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompts.length > 0 && !currentRequest.specificDirections) {
      const defaultPrompt = prompts.find(p => p.name.toLowerCase().includes('padrão'));
      if (defaultPrompt) {
        setCurrentRequest(prev => ({...prev, specificDirections: defaultPrompt.command}));
      }
    }
  }, [prompts]);
  
  const handleClientChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (queue.length > 0 && !window.confirm("Alterar o cliente irá limpar a fila de conteúdos. Deseja continuar?")) {
        return;
    }
    setClientId(e.target.value);
    setQueue([]);
    // Autopreenche estilo/prompt a partir do último preset salvo
    try {
      const selected = clients.find(c => c.id === e.target.value)?.name || '';
      const res = await listPresets({ client_name: selected });
      if (res?.presets?.length) {
        const p = res.presets[0];
        setCurrentRequest(prev => ({ ...prev,
          format: p.content_style || prev.format,
          specificDirections: typeof p.prompt === 'string' ? p.prompt : prev.specificDirections
        }));
      }
    } catch (err) { console.warn('listPresets falhou:', err); }

  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentRequest(prev => ({ ...prev, [name]: value }));
  };

  const handleNetworkChange = (network: typeof SOCIAL_NETWORKS[number]) => {
    setCurrentRequest(prev => {
      const newNetworks = prev.networks.includes(network)
        ? prev.networks.filter(n => n !== network)
        : [...prev.networks, network];
      return { ...prev, networks: newNetworks };
    });
  };
  
  const handleAddOrUpdateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    // salva Cliente + Estilo + Prompt no MySQL
    try {
      const clientName = (clients.find(c => c.id === clientId)?.name) || '';
      await saveCurrentPreset(clientName, currentRequest.format, currentRequest.specificDirections || '');
    } catch (err) {
      // não bloqueia fluxo em caso de falha de rede
      console.warn('saveCurrentPreset falhou:', err);
    }

    if (editingId) {
      setQueue(q => q.map(req => req.id === editingId ? { ...currentRequest, id: editingId } : req));
      setEditingId(null);
    } else {
      setQueue(q => [...q, { ...currentRequest, id: Date.now().toString() }]);
    }
    setCurrentRequest(initialRequestState);
  };
  
  const handleEditRequest = (id: string) => {
    const requestToEdit = queue.find(req => req.id === id);
    if(requestToEdit) {
      const { id: _, ...dataToEdit } = requestToEdit;
      setEditingId(id);
      setCurrentRequest(dataToEdit);
    }
  }

  const handleDeleteRequest = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      setCurrentRequest(initialRequestState);
    }
    setQueue(q => q.filter(req => req.id !== id));
  }

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
        alert('Por favor, selecione um cliente.');
        return;
    }
    if (queue.length === 0) {
      alert('A fila está vazia. Adicione pelo menos um conteúdo antes de gerar.');
      return;
    }
    onSubmitBatch(queue, clientId);
  };
  
  const handleSaveClient = (clientData: Omit<Client, 'id'>, id?: string) => {
    if (id) {
      onUpdateClient({ ...clientData, id });
    } else {
      const newClient = { ...clientData, id: Date.now().toString() };
      onAddClient(newClient);
      setClientId(newClient.id);
    }
    setIsAddEditModalOpen(false);
  };

  const openAddModal = () => {
    setClientToEdit(null);
    setIsAddEditModalOpen(true);
  };
  
  const openEditModal = (client: Client) => {
    setClientToEdit(client);
    setIsManageModalOpen(false);
    setIsAddEditModalOpen(true);
  }
  
  const handleDeleteClientWrapper = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      onDeleteClient(id);
      if (clientId === id) {
        setClientId('');
        setQueue([]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
      setExtractionError(null);
    } else {
      setAttachment(null);
    }
  };

  const handleExtractTheme = async () => {
    if (!attachment) return;

    setIsExtractingTheme(true);
    setExtractionError(null);
    try {
      const theme = await extractThemeFromFile(attachment);
      setCurrentRequest(prev => ({ ...prev, theme }));
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Erro desconhecido ao extrair tema.");
    } finally {
      setIsExtractingTheme(false);
      setAttachment(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const promptId = e.target.value;
    const selectedPrompt = prompts.find(p => p.id === promptId);
    if(selectedPrompt) {
        setCurrentRequest(prev => ({...prev, specificDirections: selectedPrompt.command}));
    }
  };

  return (
    <div className="bg-brand-gray p-6 rounded-lg shadow-lg space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">1. Selecione o Cliente</h2>
        <div className="flex gap-2">
          <select id="clientId" name="clientId" className="flex-grow bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text focus:ring-brand-purple focus:border-brand-purple" value={clientId} onChange={handleClientChange} required>
            <option value="" disabled>Selecione um cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={openAddModal} className="p-2 bg-brand-purple hover:bg-brand-light-purple rounded-md text-white transition-colors" title="Adicionar Novo Cliente"><UserPlusIcon className="w-5 h-5" /></button>
          <button type="button" onClick={() => setIsManageModalOpen(true)} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition-colors" title="Gerenciar Clientes"><EditIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <form onSubmit={handleAddOrUpdateQueue} className="space-y-6 p-4 border border-brand-light-gray rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editando Conteúdo' : '2. Adicionar Conteúdo à Fila'}</h3>
        
        <textarea id="theme" name="theme" rows={3} className="w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text focus:ring-brand-purple focus:border-brand-purple" placeholder="Tema Principal do Conteúdo (ou extraia de um arquivo abaixo)" value={currentRequest.theme} onChange={handleChange} required />
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, .txt" className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="w-full sm:w-auto flex-grow cursor-pointer flex items-center justify-center gap-2 bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text-light hover:bg-gray-600 transition-colors">
                <PaperClipIcon className="w-5 h-5" />
                <span className="truncate text-sm">{attachment?.name || 'Anexar .txt ou imagem'}</span>
            </label>
            <button type="button" onClick={handleExtractTheme} disabled={!attachment || isExtractingTheme} className="w-full sm:w-auto bg-brand-purple hover:bg-brand-light-purple text-white font-bold py-2 px-3 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center text-sm">
                {isExtractingTheme ? <><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Extraindo...</> : 'Extrair Tema'}
            </button>
        </div>
        {extractionError && <p className="text-sm text-red-400 -mt-3">{extractionError}</p>}
        
        <div className="flex items-center gap-2">
            <select id="format" name="format" className="flex-grow w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text focus:ring-brand-purple focus:border-brand-purple" value={currentRequest.format} onChange={handleChange}>
                {formats.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
            <button type="button" onClick={() => setIsManageFormatsModalOpen(true)} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition-colors" title="Gerenciar Formatos">
                <Cog6ToothIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SOCIAL_NETWORKS.map(network => (<label key={network} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${currentRequest.networks.includes(network) ? 'bg-brand-purple text-white' : 'bg-brand-light-gray hover:bg-gray-600'}`}><input type="checkbox" className="hidden" checked={currentRequest.networks.includes(network)} onChange={() => handleNetworkChange(network)} /><div className={`w-4 h-4 rounded border ${currentRequest.networks.includes(network) ? 'bg-white border-white' : 'border-gray-500'} flex items-center justify-center`}>{currentRequest.networks.includes(network) && <div className="w-2 h-2 rounded-sm bg-brand-purple"></div>}</div><span className="text-sm">{network}</span></label>))}</div>
        {currentRequest.networks.includes('Outro') && <input type="text" name="customNetwork" className="w-full mt-2 bg-brand-light-gray" placeholder="Nome da rede social" value={currentRequest.customNetwork} onChange={handleChange} />}
        <input type="text" id="ctaObjective" name="ctaObjective" className="w-full bg-brand-light-gray" placeholder="Objetivo do CTA" value={currentRequest.ctaObjective} onChange={handleChange} required />
        
        <div>
            <div className="flex items-center gap-2 mb-2">
                <select id="prompt-template" onChange={handlePromptChange} className="flex-grow w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text focus:ring-brand-purple focus:border-brand-purple">
                    {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" onClick={() => setIsManagePromptsModalOpen(true)} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition-colors" title="Gerenciar Prompts">
                    <Cog6ToothIcon className="w-5 h-5" />
                </button>
            </div>
            <textarea id="specificDirections" name="specificDirections" rows={3} className="w-full bg-brand-light-gray" placeholder="Observações / Direcionamentos" value={currentRequest.specificDirections} onChange={handleChange} />
        </div>

        <button type="submit" disabled={!clientId} className="w-full flex justify-center items-center gap-2 bg-brand-purple hover:bg-brand-light-purple text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
          <PlusCircleIcon className="w-5 h-5" />
          {editingId ? 'Atualizar na Fila' : 'Adicionar à Fila'}
        </button>
      </form>
      
      <div>
        <h3 className="text-xl font-bold text-white mb-4">3. Fila de Geração</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {queue.length > 0 ? queue.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-brand-light-gray p-3 rounded-md animate-fade-in">
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{req.theme}</p>
                        <p className="text-brand-text-light text-sm">{req.format} para {req.networks.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <button onClick={() => handleEditRequest(req.id)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Editar"><EditIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Excluir"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            )) : <p className="text-brand-text-light text-center py-4">Sua fila de conteúdos está vazia.</p>}
        </div>
      </div>

      <button onClick={handleFinalSubmit} type="button" disabled={isLoading || queue.length === 0} className="w-full flex justify-center items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
          {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Gerando Mágica...</> : `Gerar ${queue.length} Conteúdo(s)`}
      </button>

      {isAddEditModalOpen && <AddEditClientModal onClose={() => setIsAddEditModalOpen(false)} onSaveClient={handleSaveClient} clientToEdit={clientToEdit} />}
      {isManageModalOpen && <ManageClientsModal clients={clients} onClose={() => setIsManageModalOpen(false)} onEdit={openEditModal} onDelete={handleDeleteClientWrapper}/>}
      {isManageFormatsModalOpen && <ManageFormatsModal formats={formats} onClose={() => setIsManageFormatsModalOpen(false)} onAdd={onAddFormat} onUpdate={onUpdateFormat} onDelete={onDeleteFormat} />}
      {isManagePromptsModalOpen && <ManagePromptsModal prompts={prompts} onClose={() => setIsManagePromptsModalOpen(false)} onAdd={onAddPrompt} onUpdate={onUpdatePrompt} onDelete={onDeletePrompt} />}
    </div>
  );
};

interface AddEditClientModalProps {
  onClose: () => void;
  onSaveClient: (clientData: Omit<Client, 'id'>, id?: string) => void;
  clientToEdit: Client | null;
}

const AddEditClientModal: React.FC<AddEditClientModalProps> = ({ onClose, onSaveClient, clientToEdit }) => {
    const [clientData, setClientData] = useState({
        name: clientToEdit?.name || '',
        toneOfVoice: clientToEdit?.toneOfVoice || '',
        targetAudience: clientToEdit?.targetAudience || '',
        market: clientToEdit?.market || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setClientData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientData.name || !clientData.toneOfVoice || !clientData.targetAudience || !clientData.market) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        onSaveClient(clientData, clientToEdit?.id);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-brand-text-light hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
                 <h3 className="text-xl font-bold text-white mb-4">{clientToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h3>
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <input name="name" value={clientData.name} onChange={handleChange} placeholder="Nome do Cliente" required className="w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text"/>
                     <textarea name="toneOfVoice" value={clientData.toneOfVoice} onChange={handleChange} placeholder="Tom de Voz" required rows={2} className="w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text"/>
                     <textarea name="targetAudience" value={clientData.targetAudience} onChange={handleChange} placeholder="Público-Alvo" required rows={2} className="w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text"/>
                     <textarea name="market" value={clientData.market} onChange={handleChange} placeholder="Mercado / Nicho" required rows={2} className="w-full bg-brand-light-gray border border-gray-600 rounded-md p-2 text-brand-text"/>
                     <button type="submit" className="w-full bg-brand-purple hover:bg-brand-light-purple text-white font-bold py-2 px-4 rounded-md">{clientToEdit ? 'Salvar Alterações' : 'Salvar Cliente'}</button>
                 </form>
            </div>
        </div>
    );
};

interface ManageClientsModalProps {
  clients: Client[];
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
}

const ManageClientsModal: React.FC<ManageClientsModalProps> = ({ clients, onClose, onEdit, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-brand-text-light hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
                 <h3 className="text-xl font-bold text-white mb-4">Gerenciar Clientes</h3>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {clients.length > 0 ? clients.map(client => (
                      <div key={client.id} className="flex items-center justify-between bg-brand-light-gray p-3 rounded-md">
                        <span className="text-brand-text font-medium">{client.name}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => onEdit(client)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Editar Cliente">
                            <EditIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => onDelete(client.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Excluir Cliente">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <p className="text-brand-text-light text-center py-4">Nenhum cliente cadastrado.</p>
                    )}
                 </div>
            </div>
        </div>
    );
};

interface ManageFormatsModalProps {
    formats: ContentFormatDefinition[];
    onClose: () => void;
    onAdd: (format: Omit<ContentFormatDefinition, 'id' | 'isDefault'>) => void;
    onUpdate: (format: ContentFormatDefinition) => void;
    onDelete: (formatId: string) => void;
}
  
const ManageFormatsModal: React.FC<ManageFormatsModalProps> = ({ formats, onClose, onAdd, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentFormat, setCurrentFormat] = useState<Partial<ContentFormatDefinition>>({});

    const openEditor = (format?: ContentFormatDefinition) => {
        setCurrentFormat(format || { name: '', description: '' });
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!currentFormat.name || !currentFormat.description) {
            alert("Nome e descrição são obrigatórios.");
            return;
        }
        if (currentFormat.id) {
            onUpdate(currentFormat as ContentFormatDefinition);
        } else {
            onAdd({ name: currentFormat.name, description: currentFormat.description });
        }
        setIsEditing(false);
        setCurrentFormat({});
    };
    
    const handleDelete = (formatId: string) => {
        if(window.confirm("Tem certeza que deseja excluir este formato?")) {
            onDelete(formatId);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-brand-text-light hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <h3 className="text-xl font-bold text-white mb-4">Gerenciar Formatos de Conteúdo</h3>
                    
                    {isEditing ? (
                    <div className="space-y-4 p-4 bg-brand-light-gray rounded-md animate-fade-in">
                        <h4 className="text-lg font-semibold text-white">{currentFormat.id ? 'Editando Formato' : 'Novo Formato'}</h4>
                        <input 
                            type="text" 
                            placeholder="Nome do Formato (Ex: Story Interativo)" 
                            value={currentFormat.name || ''}
                            onChange={e => setCurrentFormat(f => ({...f, name: e.target.value}))}
                            disabled={!!currentFormat.isDefault}
                            className="w-full bg-brand-gray border border-gray-600 rounded-md p-2 text-brand-text disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        <textarea 
                            placeholder="O que você espera da IA para este formato? (Seja detalhado)" 
                            rows={4}
                            value={currentFormat.description || ''}
                            onChange={e => setCurrentFormat(f => ({...f, description: e.target.value}))}
                            className="w-full bg-brand-gray border border-gray-600 rounded-md p-2 text-brand-text"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditing(false)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-md">Cancelar</button>
                            <button onClick={handleSave} className="py-2 px-4 bg-brand-purple hover:bg-brand-light-purple text-white rounded-md">Salvar</button>
                        </div>
                    </div>
                    ) : (
                    <>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-4">
                            {formats.map(format => (
                                <div key={format.id} className="flex items-start justify-between bg-brand-light-gray p-3 rounded-md">
                                <div className="flex-1">
                                    <p className="text-white font-medium">{format.name} {format.isDefault && <span className="text-xs text-brand-text-light">(Padrão)</span>}</p>
                                    <p className="text-sm text-brand-text-light mt-1 whitespace-pre-wrap">{format.description}</p>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <button onClick={() => openEditor(format)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Editar Formato">
                                      <EditIcon className="w-5 h-5" />
                                    </button>
                                    {!format.isDefault && (
                                        <button onClick={() => handleDelete(format.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Excluir Formato">
                                          <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => openEditor()} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Criar Novo Formato</button>
                    </>
                    )}
            </div>
        </div>
    );
};

interface ManagePromptsModalProps {
    prompts: PromptTemplate[];
    onClose: () => void;
    onAdd: (prompt: Omit<PromptTemplate, 'id'>) => void;
    onUpdate: (prompt: PromptTemplate) => void;
    onDelete: (promptId: string) => void;
}
  
const ManagePromptsModal: React.FC<ManagePromptsModalProps> = ({ prompts, onClose, onAdd, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState<Partial<PromptTemplate>>({});

    const openEditor = (prompt?: PromptTemplate) => {
        setCurrentPrompt(prompt || { name: '', command: '' });
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!currentPrompt.name || !currentPrompt.command) {
            alert("Nome e comando são obrigatórios.");
            return;
        }
        if (currentPrompt.id) {
            onUpdate(currentPrompt as PromptTemplate);
        } else {
            onAdd({ name: currentPrompt.name, command: currentPrompt.command });
        }
        setIsEditing(false);
        setCurrentPrompt({});
    };
    
    const handleDelete = (promptId: string) => {
        if(window.confirm("Tem certeza que deseja excluir este prompt?")) {
            onDelete(promptId);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-brand-text-light hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <h3 className="text-xl font-bold text-white mb-4">Gerenciar Prompts</h3>
                    
                    {isEditing ? (
                    <div className="space-y-4 p-4 bg-brand-light-gray rounded-md animate-fade-in">
                        <h4 className="text-lg font-semibold text-white">{currentPrompt.id ? 'Editando Prompt' : 'Novo Prompt'}</h4>
                        <input 
                            type="text" 
                            placeholder="Nome do Prompt (Ex: Corte de Podcast)" 
                            value={currentPrompt.name || ''}
                            onChange={e => setCurrentPrompt(p => ({...p, name: e.target.value}))}
                            className="w-full bg-brand-gray border border-gray-600 rounded-md p-2 text-brand-text"
                        />
                        <textarea 
                            placeholder="Comando/Instrução para a IA..." 
                            rows={6}
                            value={currentPrompt.command || ''}
                            onChange={e => setCurrentPrompt(p => ({...p, command: e.target.value}))}
                            className="w-full bg-brand-gray border border-gray-600 rounded-md p-2 text-brand-text"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditing(false)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-md">Cancelar</button>
                            <button onClick={handleSave} className="py-2 px-4 bg-brand-purple hover:bg-brand-light-purple text-white rounded-md">Salvar</button>
                        </div>
                    </div>
                    ) : (
                    <>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-4">
                            {prompts.map(prompt => (
                                <div key={prompt.id} className="flex items-start justify-between bg-brand-light-gray p-3 rounded-md">
                                <div className="flex-1">
                                    <p className="text-white font-medium">{prompt.name}</p>
                                    <p className="text-sm text-brand-text-light mt-1 whitespace-pre-wrap font-mono">{prompt.command || ' '}</p>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <button onClick={() => openEditor(prompt)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Editar Prompt">
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(prompt.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Excluir Prompt">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => openEditor()} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Criar Novo Prompt</button>
                    </>
                    )}
            </div>
        </div>
    );
};


export default ContentForm;
