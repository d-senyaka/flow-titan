import { useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 💥 UPGRADE: We are embedding the backend 'type' and 'parameters' directly into the UI's data object!
const initialNodes = [
  { 
    id: 'node-1', 
    position: { x: 250, y: 100 }, 
    data: { 
      label: '🚀 Start',
      titanType: 'Start',
      titanParams: { message: "Booting up Flow-titan from the UI!" }
    } 
  },
  { 
    id: 'node-2', 
    position: { x: 250, y: 250 }, 
    data: { 
      label: '🛠️ Code Sandbox',
      titanType: 'Code',
      titanParams: { code: "const rawDate = new Date(context['node-1'].timestamp); output.formatted = 'UI says the date is ' + rawDate.toDateString();" }
    } 
  },
  { 
    id: 'node-3', 
    position: { x: 250, y: 400 }, 
    data: { 
      label: '📝 Log',
      titanType: 'Log',
      titanParams: { message: "{{node-2.formatted}}" }
    } 
  }
];

const initialEdges = [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
  { id: 'edge-2-3', source: 'node-2', target: 'node-3' },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // 💥 NEW: The Compiler Function
  const compileWorkflow = async () => {
    const titanNodes = nodes.map(node => ({
      id: node.id,
      type: node.data.titanType,
      parameters: node.data.titanParams
    }));

    const exportedWorkflow = {
      name: "UI Generated Canvas Flow",
      nodes: titanNodes
    };

    console.log("Sending to Backend...");
    
    // 💥 NEW: Send to our backend API!
    try {
      const response = await fetch('http://localhost:3000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportedWorkflow)
      });
      
      const result = await response.json();
      console.log("🔥 BACKEND RESPONSE 🔥", result);
      alert("Workflow executed successfully! Check the console for the backend logs.");
    } catch (error) {
      console.error("Failed to connect to backend", error);
      alert("Error: Is your backend running on port 3000?");
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f8f9fa' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap />
        
        {/* 💥 NEW: Floating Control Panel */}
        <Panel position="top-right">
          <button 
            onClick={compileWorkflow}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            ▶ Run Workflow
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}