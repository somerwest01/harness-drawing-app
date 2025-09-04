
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


import { Stage, Layer, Line, Text, Rect, Circle, RegularPolygon } from 'react-konva';

function App() {
  const [mode, setMode] = useState('design');
  const [lines, setLines] = useState([]);
  const [points, setPoints] = useState([]);
  const [obj1, setObj1] = useState('Ninguno');
  const [obj2, setObj2] = useState('Ninguno');
  const [dimension, setDimension] = useState('');
  const [inputPos, setInputPos] = useState({ x: 0, y: 0 });
  const [showInput, setShowInput] = useState(false);
  const [tempLine, setTempLine] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [hoveredObj, setHoveredObj] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [eraserMode, setEraserMode] = useState(false);
  const [nameInput1, setNameInput1] = useState('');
  const [nameInput2, setNameInput2] = useState('');
  const [distanciaRuta, setDistanciaRuta] = useState(null);
  const [rutaCalculada, setRutaCalculada] = useState([]);
  const [pencilMode, setPencilMode] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [archivoProcesado, setArchivoProcesado] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);
  const [mostrarExtremos, setMostrarExtremos] = useState(false);
  const [mostrarExcel, setMostrarExcel] = useState(false);

  const botonBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  overflow: 'hidden',
  transition: 'width 0.3s ease',
  whiteSpace: 'nowrap',
  padding: '5px',
  border: '1px solid gray',
  borderRadius: '5px',
  backgroundColor: '#f0f0f0',
  cursor: 'pointer'
};

const botonExpandido = {
  width: '150px'
};

  const [hoverBoton, setHoverBoton] = useState(null);

  const proximityThreshold = 25;

  const getClosestEndpoint = (pos) => {
    let closest = null;
    let minDist = Infinity;

    lines.forEach((line) => {
      ['p1', 'p2'].forEach((end) => {
        const point = line[end];
        const dist = Math.hypot(pos.x - point.x, pos.y - point.y);
        if (dist < proximityThreshold && dist < minDist) {
          closest = { point, obj: line[end === 'p1' ? 'obj1' : 'obj2'] };
          minDist = dist;
        }
      });
    });

    return closest;
  };

  const handleStageClick = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (pencilMode) {
      if (eraserMode) return;

      if (points.length === 0) {
        const snap = getClosestEndpoint(pos);
        if (snap) {
          setPoints([snap.point]);
          setObj1(snap.obj);
        } else {
          setPoints([pos]);
        }
      } else {
        const newLine = {
          p1: points[0],
          p2: pos,
          obj1,
          obj2,
          nombre_obj1: '',
          nombre_obj2: '',
          dimension_mm: null,
deduce: '',
          item: null
        };
        setTempLine(newLine);
        setInputPos(pos);
        setShowInput(true);
        setPoints([]);
        setMousePos(null);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (pencilMode && points.length === 1 && !eraserMode) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      setMousePos(pos);
    }
  };

  const confirmDimension = () => {
    if (tempLine) {
      tempLine.dimension_mm = parseFloat(dimension);
      setLines([...lines, tempLine]);
      setTempLine(null);
      setDimension('');
      setShowInput(false);
    }
  };


const updateNombre = () => {
  if (selectedEnd) {
    const updatedLines = [...lines];
    const targetLine = updatedLines[selectedEnd.lineIndex];
    const newName = nameInput;

    if (selectedEnd.end === 'p1') {
      targetLine.nombre_obj1 = newName;
    } else {
      targetLine.nombre_obj2 = newName;
    }

    // Propagate name to matching endpoints in other lines
    updatedLines.forEach((line, idx) => {
      if (idx === selectedEnd.lineIndex) return;
      if (Math.abs(line.p1.x - targetLine[selectedEnd.end].x) < 1 && Math.abs(line.p1.y - targetLine[selectedEnd.end].y) < 1) {
        line.nombre_obj1 = newName;
      }
      if (Math.abs(line.p2.x - targetLine[selectedEnd.end].x) < 1 && Math.abs(line.p2.y - targetLine[selectedEnd.end].y) < 1) {
        line.nombre_obj2 = newName;
      }
    });
   const targetPos = targetLine[selectedEnd.end];

updatedLines.forEach((line) => {
  if (Math.hypot(line.p1.x - targetPos.x, line.p1.y - targetPos.y) < proximityThreshold) {
    line.nombre_obj1 = newName;
  }
  if (Math.hypot(line.p2.x - targetPos.x, line.p2.y - targetPos.y) < proximityThreshold) {
    line.nombre_obj2 = newName;
  }
});

    setLines(updatedLines);
    setSelectedEnd(null);
    setNameInput('');
  }
};


  const handleLineClick = (index) => {
    if (eraserMode) {
      const updatedLines = [...lines];
      updatedLines.splice(index, 1);
      setLines(updatedLines);
    }
  };
const calcularRuta = (start, end) => {
  const graph = {};
  lines.forEach((line) => {
    const { nombre_obj1, nombre_obj2, dimension_mm } = line;
    if (!nombre_obj1 || !nombre_obj2 || !dimension_mm) return;
    if (!graph[nombre_obj1]) graph[nombre_obj1] = {};
    if (!graph[nombre_obj2]) graph[nombre_obj2] = {};
    graph[nombre_obj1][nombre_obj2] = dimension_mm;
    graph[nombre_obj2][nombre_obj1] = dimension_mm;
  });

  const distances = {};
  const prev = {};
  const visited = new Set();
  const queue = [];

  for (const node in graph) {
    distances[node] = Infinity;
  }
  distances[start] = 0;
  queue.push({ node: start, dist: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { node } = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    for (const neighbor in graph[node]) {
      const newDist = distances[node] + graph[node][neighbor];
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        prev[neighbor] = node;
        queue.push({ node: neighbor, dist: newDist });
      }
    }
  }

  return distances[end] !== Infinity ? { distance: distances[end] } : null;
};
  
  
  
  const calcularRutaReal = () => {
    const graph = {};

    lines.forEach((line) => {
      const { nombre_obj1, nombre_obj2, dimension_mm } = line;
      if (!nombre_obj1 || !nombre_obj2 || !dimension_mm) return;

      if (!graph[nombre_obj1]) graph[nombre_obj1] = {};
      if (!graph[nombre_obj2]) graph[nombre_obj2] = {};

      graph[nombre_obj1][nombre_obj2] = dimension_mm;
      graph[nombre_obj2][nombre_obj1] = dimension_mm;
    });

    const dijkstra = (start, end) => {
      const distances = {};
      const prev = {};
      const visited = new Set();
      const queue = [];

      for (const node in graph) {
        distances[node] = Infinity;
      }
      distances[start] = 0;
      queue.push({ node: start, dist: 0 });

      while (queue.length > 0) {
        queue.sort((a, b) => a.dist - b.dist);
        const { node } = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);

        for (const neighbor in graph[node]) {
          const newDist = distances[node] + graph[node][neighbor];
          if (newDist < distances[neighbor]) {
            distances[neighbor] = newDist;
            prev[neighbor] = node;
            queue.push({ node: neighbor, dist: newDist });
          }
        }
      }

      const path = [];
      let current = end;
      while (current) {
        path.unshift(current);
        current = prev[current];
      }

      return distances[end] !== Infinity ? { distance: distances[end], path } : null;
    };

    const result = dijkstra(nameInput1, nameInput2);
    if (result) {
      setDistanciaRuta(result.distance);
      setRutaCalculada(result.path);
    } else {
      alert("No hay ruta entre los objetos ingresados.");
      setDistanciaRuta(null);
      setRutaCalculada([]);
    }
  };
  
  const handleResetApp = () => {
  setLines([]);
  setPoints([]);
  setObj1('Ninguno');
  setObj2('Ninguno');
  setDimension('');
  setInputPos({ x: 0, y: 0 });
  setShowInput(false);
  setTempLine(null);
  setMousePos(null);
  setHoveredObj(null);
  setSelectedEnd(null);
  setNameInput('');
  setEraserMode(false);
  setNameInput1('');
  setNameInput2('');
  setDistanciaRuta(null);
  setRutaCalculada([]);
  setPencilMode(true);
  setStatusMessage('');
  setArchivoProcesado(false);
};

   const handleGuardar = () => {
       const data = JSON.stringify(lines);
       const blob = new Blob([data], { type: 'application/json' });
       saveAs(blob, 'dibujo_guardado.json');
   };

   const handleAbrir = (event) => {
       const file = event.target.files[0];
       if (!file) return;
       const reader = new FileReader();
       reader.onload = (e) => {
           try {
               const contenido = JSON.parse(e.target.result);
               setLines(contenido);
               setStatusMessage('✅ Archivo cargado correctamente.');
           } catch (error) {
               setStatusMessage('❌ Error al cargar el archivo.');
           }
       };
       reader.readAsText(file);
   };

  const handleImportExcel = (e) => {
  setStatusMessage('Importando archivo...');
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const updatedSheet = [...jsonData];
    if (updatedSheet[1]) {
      updatedSheet[1][22] = 'Dimension calculada';
      updatedSheet[1][23] = 'Ruta encontrada';
    }

    const buildGraph = () => {
      const graph = {};
      lines.forEach((line) => {
        const { nombre_obj1, nombre_obj2, dimension_mm } = line;
        if (!nombre_obj1 || !nombre_obj2 || !dimension_mm) return;
        if (!graph[nombre_obj1]) graph[nombre_obj1] = {};
        if (!graph[nombre_obj2]) graph[nombre_obj2] = {};
        graph[nombre_obj1][nombre_obj2] = dimension_mm;
        graph[nombre_obj2][nombre_obj1] = dimension_mm;
      });
      return graph;
    };

    const dijkstra = (graph, start, end) => {
      const distances = {};
      const visited = new Set();
      const queue = [];
      for (const node in graph) distances[node] = Infinity;
      distances[start] = 0;
      queue.push({ node: start, dist: 0 });
      while (queue.length > 0) {
        queue.sort((a, b) => a.dist - b.dist);
        const { node } = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);
        for (const neighbor in graph[node]) {
          const newDist = distances[node] + graph[node][neighbor];
          if (newDist < distances[neighbor]) {
            distances[neighbor] = newDist;
            queue.push({ node: neighbor, dist: newDist });
          }
        }
      }
      return distances[end] !== Infinity ? distances[end] : null;
    };

    const graph = buildGraph();

for (let i = 2; i < updatedSheet.length; i++) {
  const row = updatedSheet[i];
  const to_item = row[8];
  const from_item = row[15];

  if (!from_item || !to_item) {
    updatedSheet[i][22] = 'Extremos faltantes';
    updatedSheet[i][23] = 'No';
    continue;
  }

  const distancia = dijkstra(graph, from_item, to_item);
  if (distancia === null) {
    updatedSheet[i][22] = 'Ruta no encontrada';
    updatedSheet[i][23] = 'No';
    continue;
  }

  // ✅ Sumar todos los deduce relacionados con los extremos
  let deduceTotal = 0;
  lines.forEach(line => {
    if (
      line.nombre_obj1 === from_item ||
      line.nombre_obj2 === from_item ||
      line.nombre_obj1 === to_item ||
      line.nombre_obj2 === to_item
    ) {
      const valor = parseFloat(line.deduce);
      if (!isNaN(valor)) {
        deduceTotal += valor;
      }
    }
  });

  updatedSheet[i][22] = (distancia + deduceTotal).toFixed(2);
  updatedSheet[i][23] = 'Sí';
}

// ✅ Generar y descargar el archivo
const newWorksheet = XLSX.utils.aoa_to_sheet(updatedSheet);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
saveAs(blob, 'archivo_con_dimensiones_y_validacion.xlsx');
setStatusMessage('Archivo procesado y listo para descargar.');
setArchivoProcesado(true);

  };
  reader.readAsArrayBuffer(file);
};

  

  const handleExportExcel = () => {
    setStatusMessage('📤 Procesando archivo para exportar...');
    const exportData = lines.map((line, index) => ({
      item: index + 1,
      nombre_obj1: line.nombre_obj1,
      nombre_obj2: line.nombre_obj2,
      dimension_mm: (parseFloat(line.dimension_mm || 0) + parseFloat(line.deduce || 0)).toFixed(2),
      deduce: line.deduce,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Líneas');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'resultado_procesado.xlsx');

    setStatusMessage('✅ Archivo listo para descargar.');
    setArchivoProcesado(true);
  };

  const renderObjeto = (tipo, x, y, key, index, end) => {
    const isHovered = hoveredObj === key;
    const commonProps = {
      key,
      x,
      y,
      fill: isHovered ? 'yellow' : tipo === 'Conector' ? 'orange' : tipo === 'BRK' ? 'red' : 'green',
      onMouseEnter: () => setHoveredObj(key),
      onMouseLeave: () => setHoveredObj(null),
      onClick: () => {
        if (!eraserMode) {
          setSelectedEnd({ lineIndex: index, end });
          setNameInput(end === 'p1' ? lines[index].nombre_obj1 : lines[index].nombre_obj2);
        }
      },
    };

    switch (tipo) {
      case 'Conector':
        return <Rect {...commonProps} x={x - 5} y={y - 5} width={10} height={10} />;
      case 'BRK':
        return <Circle {...commonProps} radius={6} />;
      case 'SPL':
        return <RegularPolygon {...commonProps} sides={3} radius={7} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex'}}>
      <div style={{ width: '300px', padding: '10px', borderRight: '2px solid gray' }}>
        <h3>Caculadora de dimensiones</h3>

      
<div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
    
    <button
  onMouseEnter={() => setHoverBoton('excel')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={() => setMostrarExcel(!mostrarExcel)}
  style={{
    ...botonBase,
    ...(hoverBoton === 'excel' ? botonExpandido : {})
  }}
>
  📁 {hoverBoton === 'excel' && 'Excel'}
</button>
  
<button
  onMouseEnter={() => setHoverBoton('diseño')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={() => setMostrarExtremos(!mostrarExtremos)}
  style={{
    ...botonBase,
    ...(hoverBoton === 'diseño' ? botonExpandido : {})
  }}
>
  ✏️ {hoverBoton === 'diseño' && 'Diseño'}
</button>
  
  <button
  onMouseEnter={() => setHoverBoton('calculadora')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={() => setMostrarCalculadora(!mostrarCalculadora)}
  style={{
    ...botonBase,
    ...(hoverBoton === 'calculadora' ? botonExpandido : {})
  }}
>
  🧮 {hoverBoton === 'calculadora' && 'Calculadora'}
</button>
        
<button
  onMouseEnter={() => setHoverBoton('limpiar')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={handleResetApp}
  style={{
    ...botonBase,
    ...(hoverBoton === 'limpiar' ? botonExpandido : {})
  }}
>
  🧹 {hoverBoton === 'limpiar' && 'Limpiar'}
</button>
</div>
<div style={{ marginTop: '10px' }}>
  <button
  onMouseEnter={() => setHoverBoton('Guardar')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={handleGuardar}
  style={{
    ...botonBase,
    ...(hoverBoton === 'Guardar' ? botonExpandido : {})
  }}
>
  💾 {hoverBoton === 'guardar' && 'Guardar'}
</button>

        
        <input
        type="file"
        id="abrirArchivo"
        accept="application/json"
        onChange={handleAbrir}
        style={{ display: 'none' }}
  />

        
<button
  onMouseEnter={() => setHoverBoton('abrir')}
  onMouseLeave={() => setHoverBoton(null)}
  onClick={() => document.getElementById('abrirArchivo').click()}
  style={{
    ...botonBase,
    ...(hoverBoton === 'abrir' ? botonExpandido : {})
  }}
>
  📂 {hoverBoton === 'abrir' && 'Abrir'}
</button>
  </div>

        
        {true && (
          <>
            <button onClick={() => setPencilMode(!pencilMode)} style={{ backgroundColor: pencilMode ? 'lightgreen' : 'white' }}>✏️ {pencilMode ? 'Desactivar lápiz' : 'Activar lápiz'}</button><br /><br />
{mostrarExtremos && (
  <>
    <h4>Seleccione los extremos</h4>
    <label>Tipo de extremo 1:</label>
    <select value={obj1} onChange={(e) => setObj1(e.target.value)}>
      <option>Ninguno</option>
      <option>Conector</option>
      <option>BRK</option>
      <option>SPL</option>
    </select>
    <br /><br />
    <label>Tipo de extremo 2:</label>
    <select value={obj2} onChange={(e) => setObj2(e.target.value)}>
      <option>Ninguno</option>
      <option>Conector</option>
      <option>BRK</option>
      <option>SPL</option>
    </select>
    <br /><br />
    <button
      onClick={() => setEraserMode(!eraserMode)}
      style={{ backgroundColor: eraserMode ? 'lightcoral' : 'white' }}
    >
      🧽 {eraserMode ? 'Desactivar borrador' : 'Activar borrador'}
    </button>
    <br /><br />
  </>
)}
              
            {mostrarCalculadora && (
  <>
    <h4>Calcular distancia por circuito</h4>
    <label>Nombre extremo 1:</label>
    <input type="text" value={nameInput1} onChange={(e) => setNameInput1(e.target.value)} />
    <br />
    <label>Nombre extremo 2:</label>
    <input type="text" value={nameInput2} onChange={(e) => setNameInput2(e.target.value)} />
    <br />
    <button onClick={calcularRutaReal}>Calcular ruta</button>
    {distanciaRuta !== null && (
      <p>📏 Distancia total: {distanciaRuta.toFixed(2)} mm<br />🧭 Ruta: {rutaCalculada.join(' → ')}</p>
    )}
  </>
)}

          

              {selectedEnd && (
          <>
            <h4>Editar nombre del objeto</h4>
            <label>Nombre:</label>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <button onClick={updateNombre}>Asignar</button>
          </>
        )}

          <h4>Tabla de líneas dibujadas</h4>
<table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      <th style={{ border: '1px solid black' }}>#</th>
      <th style={{ border: '1px solid black' }}>Extremo 1</th>
      <th style={{ border: '1px solid black' }}>Extremo 2</th>
      <th style={{ border: '1px solid black' }}>Dimensión (mm)</th><th style={{ border: '1px solid black' }}>Deduce</th>
    </tr>
  </thead>
  <tbody>
    {lines.map((line, index) => (
      <tr key={index}>
        <td style={{ border: '1px solid gray' }}>{index + 1}</td>
        <td style={{ border: '1px solid gray' }}>{line.nombre_obj1 || '❌'}</td>
        <td style={{ border: '1px solid gray' }}>{line.nombre_obj2 || '❌'}</td>
        <td style={{ border: '1px solid gray' }}>{line.dimension_mm || '❌'}</td><td style={{ border: '1px solid gray' }}><input type="number" value={line.deduce} onChange={(e) => { const updated = [...lines]; updated[index].deduce = e.target.value; setLines(updated); }} style={{ width: '60px' }} /></td>
      </tr>
    ))}
  </tbody>
</table>
          </>
        )}

        {mostrarExcel && (
  <>
    <h4>📁 Importar / Exportar Excel</h4>
    <input type="file" accept=".xlsx" onChange={handleImportExcel} />
    <br /><br />
    <button onClick={handleExportExcel} disabled={lines.length === 0}>
      📤 Exportar archivo procesado
    </button>
    <br /><br />
    <p style={{ fontStyle: 'italic', color: 'blue' }}>{statusMessage}</p>
  </>
)}
      </div>

      <div style={{ position: 'relative' }}>
          
       
<div
  id="canvas-container"
  style={{
    resize: 'both',
    overflow: 'hidden',
    border: '1px solid black',
    width: canvasSize.width,
    height: canvasSize.height,
    minWidth: '400px',
    minHeight: '300px',
    maxWidth: '1800px',
    maxHeight: '1500px'
  }}
  onMouseUp={(e) => {
  const container = document.getElementById('canvas-container');
  if (container) {
    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight;

    // Detecta si el mouse se soltó en el borde inferior derecho (zona de resize)
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const rect = container.getBoundingClientRect();

    const isNearResizeCorner =
      mouseX >= rect.right - 20 && mouseY >= rect.bottom - 20;

    if (isNearResizeCorner) {
      setCanvasSize({
        width: newWidth,
        height: newHeight
      });
    }
  }
}}
>
  <Stage
    width={canvasSize.width}
    height={canvasSize.height}
    onClick={handleStageClick}
    onMouseMove={handleMouseMove}
  >
          <Layer>
            {lines.map((line, i) => (
              <React.Fragment key={i}>
                <Line
                  points={[line.p1.x, line.p1.y, line.p2.x, line.p2.y]}
                  stroke="black"
                  strokeWidth={2}
                  onClick={() => handleLineClick(i)}
                />
                <Text
                  x={(line.p1.x + line.p2.x) / 2}
                  y={(line.p1.y + line.p2.y) / 2 - 10}
                  text={`${line.dimension_mm || ''} mm`}
                  fontSize={10}
                  fill="blue"
                />
                {line.nombre_obj1 && (
                  <Text x={line.p1.x + 5} y={line.p1.y - 15} text={line.nombre_obj1} fontSize={10} fill="black" />
                )}
                {line.nombre_obj2 && (
                  <Text x={line.p2.x + 5} y={line.p2.y - 15} text={line.nombre_obj2} fontSize={10} fill="black" />
                )}
                {renderObjeto(line.obj1, line.p1.x, line.p1.y, `obj1-${i}`, i, 'p1')}
                {renderObjeto(line.obj2, line.p2.x, line.p2.y, `obj2-${i}`, i, 'p2')}
              </React.Fragment>
            ))}

            {points.length === 1 && mousePos && !eraserMode && (
              <Line
                points={[points[0].x, points[0].y, mousePos.x, mousePos.y]}
                stroke="gray"
                dash={[4, 4]}
                strokeWidth={1}
              />
            )}
          </Layer>
        </Stage>
                  </div>

        {showInput && (
          <div style={{
            position: 'absolute',
            left: inputPos.x,
            top: inputPos.y,
            background: 'white',
            border: '1px solid gray',
            padding: '5px'
          }}>
            <label>Dimensión (mm): </label>
            <input
              type="number"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              style={{ width: '80px' }}
            />
            <button onClick={confirmDimension}>OK</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
