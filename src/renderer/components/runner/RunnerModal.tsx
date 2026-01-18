import React, { useState, useEffect } from 'react';
import { CollectionRunResult, RunProgress } from '../../../shared/types';
import { Dialog } from '../common/Dialog';
import { Button } from '../common/Button';
import { FaPlay, FaStop, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './RunnerModal.css';

interface RunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  targetType: 'folder' | 'workspace';
}

export const RunnerModal: React.FC<RunnerModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetType,
}) => {
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [result, setResult] = useState<CollectionRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setProgress(null);
      setResult(null);
      setIsRunning(false);
      return;
    }

    const handleProgress = (p: RunProgress) => setProgress(p);
    const unsubscribe = window.api.runner.onProgress(handleProgress);
    return () => unsubscribe();
  }, [isOpen]);

  const handleStartRun = async () => {
    setIsRunning(true);
    setProgress(null);
    setResult(null);
    try {
      const runResult = await window.api.runner.start(targetId, targetType);
      setResult(runResult);
    } catch (error) {
      console.error('Failed to run collection:', error);
      // Handle error state in UI
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopRun = () => {
    window.api.runner.stop();
    setIsRunning(false);
  };

  const renderProgress = () => {
    if (!progress) return null;
    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    return (
      <div className="progress-section">
        <h4>Running...</h4>
        <div className="progress-bar">
          <div className="progress-bar-inner" style={{ width: `${percentage}%` }} />
        </div>
        <p>{progress.currentRequestName}</p>
        <p>
          {progress.completed} / {progress.total} requests completed
        </p>
        <div className="stats">
          <span><FaCheckCircle className="pass-icon" /> {progress.passed}</span>
          <span><FaTimesCircle className="fail-icon" /> {progress.failed}</span>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    return (
      <div className="result-section">
        <h4>Run Completed</h4>
        <div className="stats">
          <span><FaCheckCircle className="pass-icon" /> {result.passedRequests} Passed</span>
          <span><FaTimesCircle className="fail-icon" /> {result.failedRequests} Failed</span>
        </div>
        <ul className="result-list">
          {result.results.map(res => (
            <li key={res.requestId} className={`result-item ${res.status}`}>
              {res.status === 'pass' ? <FaCheckCircle /> : <FaTimesCircle />}
              <span>{res.requestName}</span>
              <span className="duration">{res.duration}ms</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Run ${targetName}`}>
      <div className="runner-modal-content">
        {isRunning ? renderProgress() : renderResult()}
        {!isRunning && !result && (
          <div className="idle-state">
            <p>Ready to run all requests in {targetName}.</p>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>Close</Button>
        {isRunning ? (
          <Button onClick={handleStopRun} variant="danger">
            <FaStop /> Stop Run
          </Button>
        ) : (
          <Button onClick={handleStartRun} variant="primary">
            <FaPlay /> Start Run
          </Button>
        )}
      </div>
    </Dialog>
  );
};