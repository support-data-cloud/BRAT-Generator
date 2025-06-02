// pages/index.js
import { useState } from 'react';

export default function HomePage() {
  const [text, setText] = useState('BRAT');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#000000');
  const [useBlur, setUseBlur] = useState(false);
  const [fontUrl, setFontUrl] = useState('https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setImageUrl('');
    setError('');

    const params = new URLSearchParams({
      text,
      bgColor,
      textColor,
      blur: useBlur ? 'yes' : 'no',
      fontUrl,
    });

    try {
      const response = await fetch(`/api/generate-cover?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal membuat gambar.');
      }
      const data = await response.json();
      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', border: '1px solid #eee', borderRadius: '8px' }}>
      <h1>Simple Cover Generator</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="text" style={{ display: 'block', marginBottom: '5px' }}>Teks:</label>
          <input type="text" id="text" value={text} onChange={(e) => setText(e.target.value.toUpperCase())} required style={{ width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ccc' }} />
        </div>
        <div>
          <label htmlFor="fontUrl" style={{ display: 'block', marginBottom: '5px' }}>URL Font (.ttf):</label>
          <input type="url" id="fontUrl" value={fontUrl} onChange={(e) => setFontUrl(e.target.value)} required style={{ width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <label htmlFor="bgColor" style={{ display: 'block', marginBottom: '5px' }}>Background:</label>
            <input type="color" id="bgColor" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{width: '60px', height: '40px'}} />
          </div>
          <div>
            <label htmlFor="textColor" style={{ display: 'block', marginBottom: '5px' }}>Warna Teks:</label>
            <input type="color" id="textColor" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{width: '60px', height: '40px'}} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <input type="checkbox" id="useBlur" checked={useBlur} onChange={(e) => setUseBlur(e.target.checked)} />
          <label htmlFor="useBlur">Efek "Burik" Halus?</label>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '12px 20px', fontSize: '16px', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Generate'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>Error: {error}</p>}
      {imageUrl && !loading && (
        <div style={{ marginTop: '30px' }}>
          <h3>Hasil:</h3>
          <img src={imageUrl} alt="Generated Cover" style={{ maxWidth: '100%', border: '1px solid #ddd' }} />
           <br />
          <a
            href={imageUrl}
            download={`cover_${text.toLowerCase().replace(/\s+/g, '_')}.png`}
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Unduh
          </a>
        </div>
      )}
    </div>
  );
}
