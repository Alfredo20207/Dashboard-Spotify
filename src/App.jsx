import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Tooltip personalizado para evitar "textos raros" y darle estilo de Spotify
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121212] border border-[#333] p-4 rounded-lg shadow-xl">
        <p className="text-white font-bold mb-1">{label}</p>
        <p className="text-[#1DB954]">
          <span className="text-gray-400 text-sm">Popularidad:</span> {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function SpotifyChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Asegúrate de que el nombre coincida con tu archivo en la carpeta public
    fetch('/spotify_data_clean.csv') 
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true, // Convierte la popularidad a números automáticamente
          complete: (result) => {
            // 1. Filtramos datos nulos por si hay filas vacías
            const validData = result.data.filter(row => row.track_name && row.track_popularity);
            
            // 2. Ordenamos por track_popularity de mayor a menor
            const sortedData = validData.sort((a, b) => b.track_popularity - a.track_popularity);
            
            // 3. Tomamos solo el Top 10 para no saturar la gráfica
            const topTracks = sortedData.slice(0, 10);
            
            setData(topTracks);
          }
        });
      });
  }, []);

  // Función para recortar nombres muy largos y que no se amontonen
  const truncateText = (text, maxLength = 22) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="w-full h-[600px] p-6 bg-gray-900 text-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-[#1DB954]">Top 10 Canciones Más Populares</h2>
      
      <ResponsiveContainer width="100%" height="100%">
        {/* Usamos layout="vertical" para que los nombres de las canciones se lean bien */}
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
          
          {/* El Eje X ahora muestra la popularidad (números) */}
          <XAxis type="number" dataKey="track_popularity" stroke="#ccc" />
          
          {/* El Eje Y recortará el texto y tiene más espacio (width) */}
          <YAxis 
            type="category" 
            dataKey="track_name" 
            stroke="#ccc" 
            width={180} 
            tickFormatter={(tick) => truncateText(tick)}
            tick={{ fontSize: 13 }}
          />
          
          {/* Usamos el Tooltip personalizado */}
          <Tooltip 
            cursor={{fill: '#2a2a2a'}} 
            content={<CustomTooltip />}
          />
          
          <Bar dataKey="track_popularity" fill="#1DB954" radius={[0, 4, 4, 0]} barSize={25} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}