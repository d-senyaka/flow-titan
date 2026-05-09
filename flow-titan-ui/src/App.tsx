import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 1. Define our initial nodes (Let's recreate the Titan Genesis flow visually!)
const initialNodes = [
  { 
    id: 'node-1', 
    position: { x: 250, y: 100 }, 
    data: { label: '🚀 Start' } 
  },
  { 
    id: 'node-2', 
    position: { x: 250, y: 250 }, 
    data: { label: '🛠️ Code Sandbox' } 
  },
  { 
    id: 'node-3', 
    position: { x: 250, y: 400 }, 
    data: { label: '📝 Log' } 
  }
];

// 2. Define how they connect to each other
const initialEdges = [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
  { id: 'edge-2-3', source: 'node-2', target: 'node-3' },
];

export default function App() {
  return (
    // The canvas needs a defined width and height to render properly
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f8f9fa' }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}