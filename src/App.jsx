import { useState, useEffect } from 'react'
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Tooltip personalizado para limpiar textos como 'False', 'track_popularity' y dar estilo
const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const metricLabel = metric === 'track_duration_min' ? 'Duración (Minutos)' : 'Popularidad';
    return (
      <div className="bg-[#121212] border border-[#333] p-4 rounded-lg shadow-xl">
        <p className="text-white font-bold mb-1">{label}</p>
        <p className="text-[#1DB954]">
          <span className="text-gray-400 text-sm">{metricLabel}:</span> {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function SpotifyChart() {
  const [rawData, setRawData] = useState([]);
  const [metric, setMetric] = useState('track_popularity');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true); // Nuevo estado para saber si está cargando
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si estamos en un dispositivo móvil
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // chequeo inicial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    
    fetch('./spotify_data_clean.csv') 
      .then(response => response.text())
      .then(csvText => {
        // Función interna para procesar los datos una vez descifrado el delimitador
        const procesarDatos = (encontrados) => {
          console.log("1. Datos leídos por PapaParse:", encontrados);
          
          // Filtramos filas que realmente tengan el nombre de la canción
          const validData = encontrados.filter(row => row.track_name !== undefined && row.track_name !== null);
          
          console.log("2. Datos después de filtrar vacíos:", validData);
          setRawData(validData);
          setLoading(false);
        };

        // Primer intento de lectura estándar
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""), // Limpia espacios y caracteres ocultos de Excel
          complete: (result) => {
            // Verificamos si la primera clave de los datos contiene un punto y coma
            if (result.data.length > 0) {
              const primerasColumnas = Object.keys(result.data[0])[0];
              
              if (primerasColumnas && primerasColumnas.includes(';')) {
                console.warn("⚠️ Separador por punto y coma (;) detectado. Re-parseando archivo...");
                
                // Segundo intento forzando el punto y coma de Excel
                Papa.parse(csvText, {
                  header: true,
                  dynamicTyping: true,
                  skipEmptyLines: true,
                  delimiter: ";", 
                  transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
                  complete: (reintento) => procesarDatos(reintento.data)
                });
                return; // Detiene la ejecución del primer intento
              }
            }
            
            // Si no requirió reparación, procesa normalmente
            procesarDatos(result.data);
          }
        });
      })
      .catch(err => {
        console.error("Error en el fetch:", err);
        setLoading(false);
      });
  }, []);

  const displayedData = [...rawData]
    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
    .slice(0, limit);

  // Función para recortar nombres muy largos y que no se amontonen
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="w-full p-4 md:p-6 bg-gray-900 text-white rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 text-center md:text-left">
        <h2 className="text-xl md:text-2xl font-bold text-[#1DB954]">Canciones mas escuchadas de spotify</h2>
        
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-900 font-medium">
          <select 
            className="p-2 rounded bg-white outline-none cursor-pointer hover:bg-gray-100 transition"
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="track_popularity">Mayor Popularidad</option>
            <option value="track_duration_min">Mayor Duración (Minutos)</option>
          </select>

          <select 
            className="p-2 rounded bg-white outline-none cursor-pointer hover:bg-gray-100 transition"
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
      </div>
      
      {/* Mensaje de carga mientras se lee el CSV */}
      {loading ? (
        <div className="h-[500px] flex items-center justify-center text-gray-400">
          Cargando datos del CSV...
        </div>
      ) : displayedData.length === 0 ? (
        <div className="h-[500px] flex items-center justify-center text-red-400">
          No se encontraron datos. Abre la consola para ver los errores.
        </div>
      ) : (
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={displayedData} 
              layout="vertical" 
              margin={{ top: 5, right: isMobile ? 10 : 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
              <XAxis type="number" dataKey={metric} stroke="#ccc" tick={{ fontSize: isMobile ? 11 : 13 }} />
              <YAxis 
                type="category" 
                dataKey="track_name" 
                stroke="#ccc" 
                width={isMobile ? 100 : 200} 
                tickFormatter={(tick) => truncateText(tick, isMobile ? 14 : 25)}
                tick={{ fontSize: isMobile ? 11 : 13 }}
              />
              
              <Tooltip 
                cursor={{fill: '#2a2a2a'}} 
                content={<CustomTooltip metric={metric} />}
              />
              
              <Bar dataKey={metric} fill="#1DB954" radius={[0, 4, 4, 0]} barSize={isMobile ? 15 : 25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}