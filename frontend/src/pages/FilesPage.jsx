import { useState, useEffect } from 'react';
import { getFiles, uploadFile, getFileUrl } from '../services/api';
import { Upload, Download, Trash2, FileImage, File } from 'lucide-react';

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    getFiles()
      .then(res => setFiles(res.data))
      .catch(err => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(file, { uploadedFrom: 'frontend' });
      setMsg(`Archivo "${file.name}" subido exitosamente`);
      load();
    } catch (err) { setMsg(`Error: ${err.message}`); }
    finally { setUploading(false); }
    e.target.value = '';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Archivos</h2>
          <p className="text-sm text-gray-500 mt-1">Gestión de archivos del sistema</p>
        </div>
        <label className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
          <Upload size={16} />
          {uploading ? 'Subiendo...' : 'Subir Archivo'}
          <input type="file" className="hidden" onChange={handleUpload} accept="image/*,application/pdf" disabled={uploading} />
        </label>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {loading ? <p className="text-gray-500">Cargando...</p> : files.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileImage size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay archivos aún. Sube imágenes o PDFs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(f => (
            <div key={f._id} className="bg-white rounded-xl border border-gray-200 p-4">
              {f.contentType?.startsWith('image/') ? (
                <div className="h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  <img src={getFileUrl(f._id)} alt={f.filename} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-40 bg-gray-50 rounded-lg mb-3 flex items-center justify-center">
                  <File size={40} className="text-gray-300" />
                </div>
              )}
              <p className="text-sm font-medium text-gray-900 truncate">{f.filename}</p>
              <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                <span>{formatSize(f.length)}</span>
                <span>{new Date(f.uploadDate).toLocaleDateString('es-GT')}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <a href={getFileUrl(f._id)} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 py-1.5 rounded-lg">
                  <Download size={12} /> Descargar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
