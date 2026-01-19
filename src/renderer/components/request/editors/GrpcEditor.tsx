import React, { useState, useEffect } from 'react';
import { RequestGrpc } from '@shared/types';
import { CodeEditor } from '../../common/CodeEditor';

interface GrpcEditorProps {
  grpcData: RequestGrpc;
  bodyText: string;
  onChange: (grpcData: RequestGrpc, bodyText: string) => void;
}

interface ParsedService {
  name: string;
  methods: string[];
}

export const GrpcEditor: React.FC<GrpcEditorProps> = ({ grpcData, bodyText, onChange }) => {
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (grpcData.protoFilePath) {
      handleParseProto(grpcData.protoFilePath);
    }
  }, [grpcData.protoFilePath]);

  const handleSelectFile = async () => {
    const result = await window.api.grpc.selectProtoFile();
    if (result.success && result.data) {
      onChange(
        { ...grpcData, protoFilePath: result.data, service: undefined, method: undefined },
        bodyText
      );
    } else if (!result.success) {
      setError(result.error || 'Failed to select file');
    }
  };

  const handleParseProto = async (filePath: string) => {
    const result = await window.api.grpc.parseProto(filePath);
    if (result.success) {
      setParsedServices(result.data.services);
      setError(null);
    } else {
      setError(result.error || 'Failed to parse proto file');
      setParsedServices([]);
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...grpcData, service: e.target.value, method: undefined }, bodyText);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...grpcData, method: e.target.value }, bodyText);
  };

  const selectedService = parsedServices.find((s) => s.name === grpcData.service);

  return (
    <div className="p-4 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <button
          onClick={handleSelectFile}
          className="px-3 py-1 text-sm border rounded bg-white dark:bg-gray-700 hover:bg-gray-50"
        >
          Select Proto File
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {grpcData.protoFilePath || 'No file selected'}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {parsedServices.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold mb-1 block">Service</label>
            <select
              value={grpcData.service || ''}
              onChange={handleServiceChange}
              className="w-full p-2 border rounded bg-white dark:bg-gray-700"
            >
              <option value="">Select a service</option>
              {parsedServices.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Method</label>
            <select
              value={grpcData.method || ''}
              onChange={handleMethodChange}
              disabled={!selectedService}
              className="w-full p-2 border rounded bg-white dark:bg-gray-700"
            >
              <option value="">Select a method</option>
              {selectedService?.methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <label className="text-xs font-semibold mb-1 block">Request Body (JSON)</label>
        <div className="flex-1 border rounded relative">
          <CodeEditor
            value={bodyText}
            onChange={(text) => onChange(grpcData, text)}
            language="json"
          />
        </div>
      </div>
    </div>
  );
};
