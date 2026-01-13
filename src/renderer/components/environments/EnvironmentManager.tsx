import { useState, useEffect } from 'react';
import { Environment, Variable } from '../../../shared/types';
import { environmentService } from '../../services/environment.service';
import { variableService } from '../../services/variable.service';
import { Dialog } from '../common/Dialog';
import { VariableEditor, DraftVariable } from './VariableEditor';

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function EnvironmentManager({ isOpen, onClose, workspaceId }: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [variables, setVariables] = useState<DraftVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  // Load environments when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadEnvironments();
    }
  }, [isOpen, workspaceId]);

  // Load variables when an environment is selected
  useEffect(() => {
    if (selectedEnvId) {
      loadVariables(selectedEnvId);
    } else {
      setVariables([]);
    }
  }, [selectedEnvId]);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const envs = await environmentService.getByWorkspace(workspaceId);
      setEnvironments(envs);
      if (envs.length > 0 && !selectedEnvId) {
        setSelectedEnvId(envs[0]._id);
      }
    } catch (err) {
      console.error('Failed to load environments', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVariables = async (envId: string) => {
    try {
      const vars = await variableService.getByEnvironment(envId);
      setVariables(vars.map(v => ({ ...v, environmentId: envId })));
    } catch (err) {
      console.error('Failed to load variables', err);
    }
  };

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return;
    try {
      const newEnv = await environmentService.create({ name: newEnvName, workspaceId });
      setEnvironments([...environments, newEnv]);
      setSelectedEnvId(newEnv._id);
      setNewEnvName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEnvironment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this environment?')) return;
    try {
      await environmentService.delete(id);
      const newEnvs = environments.filter(e => e._id !== id);
      setEnvironments(newEnvs);
      if (selectedEnvId === id) {
        setSelectedEnvId(newEnvs.length > 0 ? newEnvs[0]._id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Variable editing handlers
  const handleVariableChange = (index: number, field: keyof DraftVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const handleAddVariable = () => {
    if (!selectedEnvId) return;
    setVariables([...variables, { key: '', value: '', isSecret: false, environmentId: selectedEnvId }]);
  };

  const handleRemoveVariable = async (index: number) => {
    const variable = variables[index];
    if (variable._id) {
       // It's saved, delete from DB? Or wait for Save button?
       // Let's implement "Auto Save" or "Manual Save".
       // For "Manage Environments", usually explicit save is safer, or auto-save per row.
       // Let's do explicit save for simplicity of bulk edits, OR auto-save actions.
       // Given the UI complexity, maybe auto-save per action is easier:
       try {
           await variableService.delete(variable._id);
       } catch (e) {
           console.error('Failed to delete variable', e);
           return;
       }
    }
    const updated = variables.filter((_, i) => i !== index);
    setVariables(updated);
  };

  const handleSaveVariables = async () => {
      // Loop through variables and create/update
      // This is a bulk save simulation
      // For a better UX, maybe we should just save individual rows on blur or enter?
      // For MVP, "Save" button for the visible list is good.
      if (!selectedEnvId) return;
      
      try {
          for (const v of variables) {
              if (v._id) {
                  await variableService.update(v._id, { key: v.key, value: v.value, isSecret: v.isSecret });
              } else {
                  if (v.key) { // Only Create if key exists
                      const newVar = await variableService.create({ 
                          environmentId: selectedEnvId, 
                          key: v.key, 
                          value: v.value, 
                          isSecret: v.isSecret 
                      });
                      // Update local ID so we don't recreate it
                      v._id = newVar._id;
                  }
              }
          }
          alert('Variables saved');
      } catch (err) {
          console.error(err);
          alert('Failed to save variables');
      }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manage Environments">
      <div className="flex h-[500px] border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        {/* Sidebar: List of Environments */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
             <input 
               className="flex-1 px-2 py-1 text-sm border rounded"
               placeholder="New Environment"
               value={newEnvName}
               onChange={(e) => setNewEnvName(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleCreateEnvironment()}
             />
             <button onClick={handleCreateEnvironment} className="text-primary-600 px-2">+</button>
          </div>
          <div className="flex-1 overflow-auto">
             {environments.map(env => (
               <div 
                 key={env._id}
                 onClick={() => setSelectedEnvId(env._id)}
                 className={`p-2 flex justify-between items-center cursor-pointer text-sm ${selectedEnvId === env._id ? 'bg-white dark:bg-gray-700 font-medium shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
               >
                 <span>{env.name}</span>
                 <button 
                   onClick={(e) => handleDeleteEnvironment(env._id, e)}
                   className="text-gray-400 hover:text-red-500 hidden group-hover:block"
                 >
                   ×
                 </button>
               </div>
             ))}
          </div>
        </div>

        {/* Main: Variable Editor */}
        <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col">
           {selectedEnvId ? (
             <>
                <div className="p-4 flex-1 overflow-auto">
                   <h3 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">Variables</h3>
                   <VariableEditor 
                     variables={variables}
                     onChange={handleVariableChange}
                     onRemove={handleRemoveVariable}
                     onAdd={handleAddVariable}
                   />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                   <button 
                     onClick={handleSaveVariables}
                     className="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                   >
                     Save Variables
                   </button>
                </div>
             </>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
               Select an environment
             </div>
           )}
        </div>
      </div>
    </Dialog>
  );
}
