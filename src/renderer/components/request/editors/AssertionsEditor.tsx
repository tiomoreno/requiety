import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Assertion, AssertionSource, AssertionOperator } from '../../../../shared/types';
import './AssertionsEditor.css';
import { FaTrash, FaPlus, FaPlay } from 'react-icons/fa';

interface AssertionsEditorProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
}

const SOURCES: { [key in AssertionSource]: string } = {
  status: 'Status Code',
  header: 'Header',
  jsonBody: 'JSON Body',
  responseTime: 'Response Time (ms)'
};

const OPERATORS: { [key in AssertionOperator]: string } = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  notContains: 'Not Contains',
  greaterThan: 'Greater Than',
  lessThan: 'Less Than',
  exists: 'Exists',
  notExists: 'Not Exists',
  isNull: 'Is Null',
  isNotNull: 'Is Not Null',
};

export const AssertionsEditor: React.FC<AssertionsEditorProps> = ({ assertions = [], onChange }) => {
  const addAssertion = () => {
    const newAssertion: Assertion = {
      id: uuidv4(),
      source: 'status',
      operator: 'equals',
      value: '200',
      enabled: true,
    };
    onChange([...assertions, newAssertion]);
  };

  const removeAssertion = (id: string) => {
    onChange(assertions.filter((a) => a.id !== id));
  };

  const updateAssertion = (id: string, updates: Partial<Assertion>) => {
    onChange(
      assertions.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  return (
    <div className="assertions-editor">
      <div className="assertions-header">
        <h3>Assertions</h3>
        <button className="add-assertion-btn" onClick={addAssertion}>
          <FaPlus /> Add Assertion
        </button>
      </div>

      <div className="assertions-list">
        {assertions.length === 0 ? (
          <div className="empty-state">
            <FaPlay className="empty-icon" />
            <p>Add assertions to automatically test your request</p>
          </div>
        ) : (
          assertions.map((assertion) => (
            <div key={assertion.id} className="assertion-item">
              <input
                type="checkbox"
                checked={assertion.enabled}
                onChange={(e) => updateAssertion(assertion.id, { enabled: e.target.checked })}
              />
              
              <div className="assertion-source">
                <select
                  value={assertion.source}
                  onChange={(e) => updateAssertion(assertion.id, { source: e.target.value as AssertionSource, property: '' })}
                >
                  {Object.entries(SOURCES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {(assertion.source === 'header' || assertion.source === 'jsonBody') && (
                <div className="assertion-property">
                  <input
                    type="text"
                    placeholder={assertion.source === 'header' ? 'Header Name' : 'JSON Path (e.g. $.data.id)'}
                    value={assertion.property || ''}
                    onChange={(e) => updateAssertion(assertion.id, { property: e.target.value })}
                  />
                </div>
              )}

              <div className="assertion-operator">
                <select
                  value={assertion.operator}
                  onChange={(e) => updateAssertion(assertion.id, { operator: e.target.value as AssertionOperator })}
                >
                  {Object.entries(OPERATORS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {assertion.operator !== 'exists' && 
               assertion.operator !== 'notExists' &&
               assertion.operator !== 'isNull' && 
               assertion.operator !== 'isNotNull' && (
                <div className="assertion-value">
                  <input
                    type="text"
                    placeholder="Expected Value"
                    value={assertion.value || ''}
                    onChange={(e) => updateAssertion(assertion.id, { value: e.target.value })}
                  />
                </div>
              )}

              <button 
                className="delete-btn"
                onClick={() => removeAssertion(assertion.id)}
                title="Remove Assertion"
              >
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
