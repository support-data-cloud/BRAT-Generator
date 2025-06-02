import { useState } from 'react';

export default function HomePage() {
  const [text, setText] = useState('BRAT');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#000000');
  const [useBurikEffect, setUseBurikEffect] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const bratGreen = '#39FF14'; 
  

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setCoverImageUrl('');
    setError('');

    try {
      const params = new URLSearchParams({
        text: text,
        bgColor: bgColor,
        textColor: textColor,
        blur: useBurikEffect ? 'yes' : 'no',
        // Ganti URL font ini jika kamu punya font .ttf lain secara online
        fontUrl: 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf',
      });
      const response = await fetch(`/api/generate-cover?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCoverImageUrl(data.imageUrl);
    } catch (err) {
      console.error("Could not fetch cover:", err);
      setError(err.message || 'Gagal membuat sampul. Coba lagi.');
      setCoverImageUrl('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <h1>BRAT Style Cover Generator</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <label htmlFor="text" style={{ display: 'block', marginBottom: '5px', textAlign: 'left' }}>Teks Sampul:</label>
          <input
            type="text"
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', fontSize: '16px' }}
          />
        </div>

        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div>
            <label htmlFor="bgColor" style={{ display: 'block', marginBottom: '5px' }}>Latar:</label>
            <input type="color" id="bgColor" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '80px', height: '40px' }}/>
          </div>
          <div>
            <label htmlFor="textColor" style={{ display: 'block', marginBottom: '5px' }}>Teks:</label>
            <input type="color" id="textColor" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: '80px', height: '40px' }}/>
          </div>
        </div>
         <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => {setBgColor('#FFFFFF'); setTextColor('#000000');}} style={{ padding: '8px 12px'}}>Putih</button>
            <button type="button" onClick={() => {setBgColor(bratGreen); setTextColor('#000000');}} style={{ padding: '8px 12px'}}>Hijau "BRAT"</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <input
            type="checkbox"
            id="useBurikEffect"
            checked={useBurikEffect}
            onChange={(e) => setUseBurikEffect(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <label htmlFor="useBurikEffect">Efek Blur?</label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', backgroundColor: isLoading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', marginTop: '10px' }}
        >
          {isLoading ? 'Generating...' : 'Generate Cover'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>Error: {error}</p>}

      {isLoading && <p style={{marginTop: '15px'}}>Membuat gambar, mohon tunggu...</p>}

      {coverImageUrl && !isLoading && (
        <div style={{ marginTop: '30px' }}>
          <h2>Hasil:</h2>
          <img src={coverImageUrl} alt="Generated BRAT style cover" style={{ maxWidth: '100%', border: '1px solid #eee', borderRadius: '4px' }} />
          <br />
          <a
            href={coverImageUrl}
            download={`cover_${text.toLowerCase().replace(/\s+/g, '_')}.png`}
            style={{
              display: 'inline-block',
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          >
            Unduh Gambar
          </a>
        </div>
      )}
    </div>
  );
}
