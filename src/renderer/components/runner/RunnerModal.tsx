import React, { useEffect, useState } from 'react';
import { CollectionRunResult, RunProgress } from '../../../shared/types';
import { FaPlay, FaStop, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import './RunnerModal.css';

interface RunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  type: 'folder' | 'workspace';
}

export const RunnerModal: React.FC<RunnerModalProps> = ({ isOpen, onClose, targetId, targetName, type }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'stopped' | 'error'>('idle');
  const [progress, setProgress] = useState<RunProgress>({
    total: 0,
    completed: 0,
    currentRequestName: '',
    passed: 0,
    failed: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setProgress({ total: 0, completed: 0, currentRequestName: '', passed: 0, failed: 0 });
      setError(null);
      return;
    }

    const cleanup = (window as any).api.runner.onProgress((newProgress: RunProgress) => {
      setProgress(newProgress);
    });

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const startRun = async () => {
    try {
      setStatus('running');
      setError(null);
      const result = await (window as any).api.runner.start(targetId, type);
      if (result.success) {
        setStatus(result.data.status);
      } else {
        setStatus('error');
        setError(result.error || 'Unknown error');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  };

  const stopRun = async () => {
    await (window as any).api.runner.stop();
    setStatus('stopped');
  };


  if (!isOpen) return null;

  return (
    <div className="runner-modal-overlay">
      <div className="runner-modal">
        <div className="runner-header">
          <h2>Run Collection: {targetName}</h2>
          <button className="close-btn" onClick={onClose} disabled={status === 'running'}>
            &times;
          </button>
        </div>

        <div className="runner-body">
          {status === 'idle' && (
            <div className="runner-start-screen">
              <p>Ready to run all requests in <strong>{targetName}</strong>.</p>
              <button className="start-btn" onClick={startRun}>
                <FaPlay /> Run Now
              </button>
            </div>
          )}

          {(status === 'running' || status === 'completed' || status === 'stopped') && (
            <div className="runner-progress-screen">
               <div className="progress-summary">
                 <div className="stat-box total">
                   <label>Total</label>
                   <span>{progress.total}</span>
                 </div>
                 <div className="stat-box passed">
                   <label>Passed</label>
                   <span>{progress.passed}</span>
                 </div>
                 <div className="stat-box failed">
                   <label>Failed</label>
                   <span>{progress.failed}</span>
                 </div>
               </div>

               <div className="progress-bar-container">
                 <div 
                   className="progress-bar" 
                   style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }}
                 />
               </div>
               
               <div className="current-action">
                 {status === 'running' ? (
                   <>
                     <FaSpinner className="spin" /> Running: {progress.currentRequestName}
                   </>
                 ) : (
                   <span>Run {status}</span>
                 )}
               </div>

               {status === 'running' && (
                 <button className="stop-btn" onClick={stopRun}>
                   <FaStop /> Stop Run
                 </button>
               )}
            </div>
          )}

          {error && (
            <div className="runner-error">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
